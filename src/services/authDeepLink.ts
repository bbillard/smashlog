import * as QueryParams from "expo-auth-session/build/QueryParams";

import { supabase } from "@/src/lib/supabase";

/**
 * Traite un deep link entrant lié à l'auth : confirmation d'inscription par
 * email, réinitialisation de mot de passe (cf. sendPasswordReset dans
 * AuthContext.tsx, qui pointe vers smashlog://auth). Ces liens s'ouvrent
 * depuis un client mail EXTERNE (pas depuis une session WebBrowser active
 * comme le flow Google), donc rien d'autre dans l'app ne les intercepte.
 *
 * Le client Supabase est configuré avec detectSessionInUrl: false (cf.
 * src/lib/supabase.ts) — volontaire sur mobile, où il n'y a pas de barre
 * d'URL — donc c'est à nous d'extraire le code et d'établir la session
 * manuellement via exchangeCodeForSession(). Une fois fait, AuthContext est
 * notifié automatiquement : il est déjà abonné à supabase.auth.onAuthStateChange.
 *
 * Ignore silencieusement les URLs qui ne concernent pas l'auth (routes
 * normales de l'app, gérées par expo-router) ou un lien expiré/invalide —
 * l'utilisateur peut toujours retenter depuis l'écran /auth.
 */
export async function handleAuthDeepLink(url: string): Promise<void> {
  if (!url.includes("code=") && !url.includes("access_token=")) {
    return;
  }

  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode || !params.code) {
    return;
  }

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      console.warn("[authDeepLink] Échec de l'échange du code d'auth :", error.message);
    }
  } catch (error) {
    console.warn("[authDeepLink] Échec de l'échange du code d'auth :", error);
  }
}
