import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { Platform } from "react-native";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/src/lib/supabase";
import { deleteCloudAccount, resetLocalData } from "@/src/services/accountDeletion";
import { ensureAuthProfile } from "@/src/services/authProfile";
import { restoreFromCloud as restoreFromCloudService, type RestoreCounts } from "@/src/services/cloudRestore";
import { fetchFeatureFlags, getCachedFeatureFlags } from "@/src/services/featureFlags";
import { isPremiumOrBeta } from "@/src/utils/premium";

// Nécessaire pour que le WebBrowser ferme proprement l'onglet d'auth après
// redirection (recommandé par la doc expo-auth-session).
WebBrowser.maybeCompleteAuthSession();

// Google Sign-In natif (flow id_token, cf. signInWithGoogle ci-dessous) :
// trois Client IDs Google Cloud distincts, un par plateforme/type — PAS le
// Client ID/Secret "Web application" configuré côté Supabase Dashboard pour
// le flow signInWithOAuth (celui-ci reste utilisé pour rien d'autre
// maintenant que Google est passé en id_token natif).
//
// ⚠️ Pour que signInWithIdToken accepte les jetons émis par ces clients, ils
// doivent être renseignés côté Supabase Dashboard → Authentication →
// Providers → Google → "Authorized Client IDs" (liste séparée par des
// virgules), en plus du Client ID/Secret déjà configuré.
const GOOGLE_IOS_CLIENT_ID = "548113509796-rjri47741vhqfh5ldtu3q5sout510p9u.apps.googleusercontent.com";
const GOOGLE_ANDROID_CLIENT_ID = "548113509796-4ui0th35h3gvs7hiepnj4g03k8dlp94a.apps.googleusercontent.com";
const GOOGLE_WEB_CLIENT_ID = "548113509796-4tv6o4odfb85cd0umorpm3nd294qu4km.apps.googleusercontent.com";

const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

interface SignUpResult {
  /** true si Supabase attend une confirmation par email avant de connecter l'utilisateur. */
  needsEmailConfirmation: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** true tant que la session initiale (supabase.auth.getSession()) n'a pas été résolue. */
  initializing: boolean;
  isAppleAuthAvailable: boolean;
  /** true si un compte est connecté (à ne pas confondre avec la connectivité réseau, cf. useSync()). */
  isConnected: boolean;
  /** beta_access du profil Supabase ; toujours false si non connecté. */
  isBetaUser: boolean;
  /** premium_access du profil Supabase ; toujours false si non connecté. */
  isPremium: boolean;
  /** admin du profil Supabase ; toujours false si non connecté. Verrouillé côté DB (cf. migration admin_flag_and_column_protection). */
  isAdmin: boolean;
  /** Équivalent pratique de isPremiumOrBeta({ isPremium, isBetaUser }), cf. src/utils/premium.ts. */
  isPremiumOrBeta: boolean;
  /** Relit isBetaUser/isPremium depuis Supabase sans attendre le prochain login/relance. No-op si déconnecté. Utile pour tester (cf. écran debug). */
  refreshFeatureFlags: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<SignUpResult>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Supprime définitivement le compte : données Supabase + auth.users, puis
   * réinitialise l'app en local. Si la suppression cloud échoue, l'erreur
   * remonte à l'appelant et rien n'est touché en local (cf. écran Profil).
   */
  deleteAccount: () => Promise<void>;
  /**
   * Écrase les données locales par ce qui est trouvé côté Supabase pour le
   * compte connecté (utile en cas de problème sur l'appareil). Lève si
   * personne n'est connecté.
   */
  restoreFromCloud: () => Promise<RestoreCounts>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);
  const [isBetaUser, setIsBetaUser] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Google Sign-In natif : responseType IdToken forcé explicitement sur
  // toutes les plateformes (le provider `expo-auth-session/providers/google`
  // est déprécié et, de toute façon, ne renvoie l'id_token qu'après un
  // second rendu sur natif via un échange de code différé en interne — on
  // passe par le hook générique pour que promptAsync() résolve directement
  // avec le résultat final, sans ce délai).
  const googleClientId = Platform.select({
    ios: GOOGLE_IOS_CLIENT_ID,
    android: GOOGLE_ANDROID_CLIENT_ID,
    default: GOOGLE_WEB_CLIENT_ID,
  });

  const [googleRequest, , promptGoogleAsync] = AuthSession.useAuthRequest(
    {
      clientId: googleClientId,
      scopes: ["openid", "profile", "email"],
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri: AuthSession.makeRedirectUri(),
      // PKCE ne s'applique qu'au flow "code" ; il doit être désactivé pour
      // le flow implicite id_token (même règle que GoogleAuthRequest en
      // interne, cf. node_modules/expo-auth-session/build/providers/Google.js).
      usePKCE: false,
    },
    GOOGLE_DISCOVERY,
  );

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setInitializing(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
    });

    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then((available) => {
        if (active) setIsAppleAuthAvailable(available);
      });
    }

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Feature flags (beta_access / premium_access) : se déclenche à chaque
  // changement de compte connecté, donc aussi à l'ouverture de l'app quand
  // getSession() restaure une session persistée (ticket "rafraîchir à
  // chaque ouverture de l'app si connecté"). Ne dépend que de l'id
  // utilisateur (pas de l'objet `session` entier), pour ne pas re-fetcher à
  // chaque refresh de token.
  const userId = session?.user.id ?? null;

  useEffect(() => {
    let active = true;

    if (!userId) {
      setIsBetaUser(false);
      setIsPremium(false);
      setIsAdmin(false);
      return;
    }

    (async () => {
      // 1. Affichage immédiat depuis le cache local (fallback offline).
      const cached = await getCachedFeatureFlags(userId);
      if (!active) return;
      if (cached) {
        setIsBetaUser(cached.betaAccess);
        setIsPremium(cached.premiumAccess);
        setIsAdmin(cached.admin);
      }

      // 2. Tentative de rafraîchissement réseau. En cas d'échec (offline,
      // erreur serveur...), on conserve silencieusement les valeurs déjà
      // appliquées ci-dessus plutôt que de révoquer l'accès à tort.
      const fresh = await fetchFeatureFlags(userId);
      if (!active || !fresh) return;
      setIsBetaUser(fresh.betaAccess);
      setIsPremium(fresh.premiumAccess);
      setIsAdmin(fresh.admin);
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      initializing,
      isAppleAuthAvailable,
      isConnected: Boolean(session?.user),
      isBetaUser,
      isPremium,
      isAdmin,
      isPremiumOrBeta: isPremiumOrBeta({ isPremium, isBetaUser }),

      async refreshFeatureFlags() {
        if (!userId) return;
        const fresh = await fetchFeatureFlags(userId);
        if (fresh) {
          setIsBetaUser(fresh.betaAccess);
          setIsPremium(fresh.premiumAccess);
          setIsAdmin(fresh.admin);
        }
      },

      async signUpWithEmail(email, password) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // Sans session active (confirmation email en attente), la requête
        // part avec le rôle anon : RLS la rejettera silencieusement. On ne
        // synchronise le profil que si on a déjà un JWT authentifié — sinon
        // ça se fera au premier signInWithEmail réussi, une fois confirmé.
        if (data.user && data.session) {
          await ensureAuthProfile(data.user.id);
        }

        // Si Supabase renvoie une session directement, la confirmation email
        // est désactivée côté dashboard (auto-confirm). Sinon il faut cliquer
        // le lien reçu par email avant de pouvoir se connecter.
        return { needsEmailConfirmation: !data.session };
      },

      async signInWithEmail(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          await ensureAuthProfile(data.user.id);
        }
      },

      async signInWithApple() {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        if (!credential.identityToken) {
          throw new Error("Apple n'a pas renvoyé de jeton d'identité.");
        }

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: credential.identityToken,
        });
        if (error) throw error;

        if (data.user) {
          await ensureAuthProfile(data.user.id);
        }
      },

      async signInWithGoogle() {
        if (!googleRequest) {
          throw new Error("La connexion Google n'est pas encore prête, réessaie dans un instant.");
        }

        const result = await promptGoogleAsync();
        if (result.type !== "success") {
          // Annulé par l'utilisateur (ou popup fermée) : pas d'erreur à remonter.
          return;
        }

        const idToken = result.params.id_token;
        if (!idToken) {
          throw new Error("Google n'a pas renvoyé de jeton d'identité.");
        }

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
        });
        if (error) throw error;

        if (data.user) {
          await ensureAuthProfile(data.user.id);
        }
      },

      async sendPasswordReset(email) {
        // Renvoie vers l'écran d'auth existant : après avoir cliqué le lien
        // reçu par email, Supabase authentifie une session "recovery" ;
        // il ne reste qu'à définir un nouveau mot de passe via
        // supabase.auth.updateUser({ password }) — non couvert par ce
        // ticket (pas dans les critères d'acceptation), à faire dans un
        // futur écran dédié si besoin.
        const redirectTo = AuthSession.makeRedirectUri({ path: "auth" });
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
      },

      async signOut() {
        // Ne touche jamais à AsyncStorage : les données locales (séances,
        // profil, planning...) restent intactes après déconnexion.
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },

      async restoreFromCloud() {
        if (!userId) {
          throw new Error("Aucun compte connecté.");
        }
        return restoreFromCloudService(userId);
      },

      async deleteAccount() {
        // Si ça échoue (réseau, Edge Function down...), on s'arrête là :
        // deleteCloudAccount() lève, rien n'est réinitialisé en local.
        await deleteCloudAccount();
        await resetLocalData();

        try {
          await supabase.auth.signOut();
        } catch {
          // Le compte n'existe déjà plus côté serveur à ce stade : signOut()
          // peut légitimement échouer (session déjà invalidée par
          // auth.admin.deleteUser). Sans conséquence, l'état local est de
          // toute façon déjà réinitialisé au-dessus.
        }
      },
    }),
    [
      session,
      userId,
      initializing,
      isAppleAuthAvailable,
      isBetaUser,
      isPremium,
      isAdmin,
      googleRequest,
      promptGoogleAsync,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un <AuthProvider>.");
  }
  return context;
}
