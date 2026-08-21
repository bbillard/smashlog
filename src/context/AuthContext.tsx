import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { Platform } from "react-native";
import type { Session, User } from "@supabase/supabase-js";
import { GoogleSignin, isCancelledResponse } from "@react-native-google-signin/google-signin";

import { supabase } from "@/src/lib/supabase";
import { deleteCloudAccount, resetLocalData } from "@/src/services/accountDeletion";
import { ensureAuthProfile } from "@/src/services/authProfile";
import { restoreFromCloud as restoreFromCloudService, type RestoreCounts } from "@/src/services/cloudRestore";
import { fetchFeatureFlags, getCachedFeatureFlags } from "@/src/services/featureFlags";
import { isPremiumOrBeta } from "@/src/utils/premium";

// Client "Web application" côté Google Cloud (le même que celui déjà
// enregistré côté Supabase pour la vérification de l'id_token) et client
// "iOS" (nécessaire pour que le SDK natif s'authentifie sur iOS — cf.
// iosUrlScheme dans app.json, dérivé de ce même Client ID). Le Client ID
// Android n'est pas utilisé ici : il est résolu automatiquement via le nom
// de package + l'empreinte SHA-1 enregistrés côté Google Cloud.
const GOOGLE_WEB_CLIENT_ID = "548113509796-4tv6o4odfb85cd0umorpm3nd294qu4km.apps.googleusercontent.com";
const GOOGLE_IOS_CLIENT_ID = "548113509796-rjri47741vhqfh5ldtu3q5sout510p9u.apps.googleusercontent.com";

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
});

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
  /**
   * true dès que Supabase notifie un événement PASSWORD_RECOVERY (lien de
   * réinitialisation cliqué, cf. src/services/authDeepLink.ts qui échange le
   * code contre une session — c'est cet échange qui déclenche l'event côté
   * SDK). Sert à afficher le formulaire "nouveau mot de passe" par-dessus
   * l'app quelle que soit l'écran affiché au moment du clic.
   */
  isPasswordRecovery: boolean;
  /** Définit le nouveau mot de passe et referme l'overlay de recovery. */
  completePasswordReset: (newPassword: string) => Promise<void>;
  /** Referme l'overlay sans changer le mot de passe (l'utilisateur reste connecté). */
  dismissPasswordRecovery: () => void;
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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setInitializing(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
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
      isPasswordRecovery,

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
        // SDK natif (Google Play Services sur Android, GIDSignIn sur iOS) :
        // aucun navigateur ne s'ouvre, donc aucune URL (ni Supabase, ni
        // Google) n'est jamais visible par l'utilisateur — contrairement à
        // l'ancien flow signInWithOAuth (hébergé par Supabase), qui passait
        // par un aller-retour navigateur exposant xxx.supabase.co/auth/v1/callback.
        // showPlayServicesUpdateDialog est ignoré sur iOS (toujours true là-bas).
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const response = await GoogleSignin.signIn();
        if (isCancelledResponse(response)) {
          // Annulé par l'utilisateur : pas d'erreur à remonter.
          return;
        }

        const idToken = response.data.idToken;
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
        // Après avoir cliqué le lien reçu par email, Supabase authentifie
        // une session "recovery" ; authDeepLink.ts capte le retour et
        // déclenche l'event PASSWORD_RECOVERY (cf. isPasswordRecovery
        // ci-dessus), qui affiche PasswordResetOverlay par-dessus l'app
        // pour définir le nouveau mot de passe.
        const redirectTo = AuthSession.makeRedirectUri({ path: "auth" });
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
      },

      async completePasswordReset(newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setIsPasswordRecovery(false);
      },

      dismissPasswordRecovery() {
        // L'utilisateur reste connecté (la session recovery est une session
        // valide comme une autre) : on referme juste l'overlay, sans
        // toucher au mot de passe existant.
        setIsPasswordRecovery(false);
      },

      async signOut() {
        // Ne touche jamais à AsyncStorage : les données locales (séances,
        // profil, planning...) restent intactes après déconnexion.
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        try {
          // Termine aussi la session native Google, sinon un prochain
          // "Continuer avec Google" resélectionne silencieusement le même
          // compte sans passer par le sélecteur natif.
          await GoogleSignin.signOut();
        } catch {
          // Pas de session Google active : sans conséquence.
        }
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

        try {
          await GoogleSignin.signOut();
        } catch {
          // Pas de session Google active : sans conséquence.
        }
      },
    }),
    [session, userId, initializing, isAppleAuthAvailable, isBetaUser, isPremium, isAdmin, isPasswordRecovery],
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
