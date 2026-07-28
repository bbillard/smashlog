import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { Platform } from "react-native";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/src/lib/supabase";
import { ensureAuthProfile } from "@/src/services/authProfile";

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
  signUpWithEmail: (email: string, password: string) => Promise<SignUpResult>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

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

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      initializing,
      isAppleAuthAvailable,

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
    }),
    [session, initializing, isAppleAuthAvailable],
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
