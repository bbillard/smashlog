import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
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
        const redirectTo = AuthSession.makeRedirectUri();

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) throw error;
        if (!data.url) {
          throw new Error("Supabase n'a pas renvoyé d'URL d'autorisation Google.");
        }

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type !== "success" || !result.url) {
          // Annulé par l'utilisateur : pas d'erreur à remonter.
          return;
        }

        const { params, errorCode } = QueryParams.getQueryParams(result.url);
        if (errorCode) {
          throw new Error(errorCode);
        }

        const code = params.code;
        if (!code) {
          throw new Error("Code d'autorisation Google manquant dans la redirection.");
        }

        const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;

        if (sessionData.user) {
          await ensureAuthProfile(sessionData.user.id);
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
    [session, userId, initializing, isAppleAuthAvailable, isBetaUser, isPremium, isAdmin],
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
