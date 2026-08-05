import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "@/src/lib/supabase";

/**
 * Feature flags lus depuis public.profiles (beta_access, premium_access).
 * Consommés par AuthContext.tsx, qui expose isBetaUser/isPremium à toute
 * l'app via useAuth() — voir aussi src/utils/premium.ts pour isPremiumOrBeta().
 */
export interface FeatureFlags {
  betaAccess: boolean;
  premiumAccess: boolean;
  admin: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  betaAccess: false,
  premiumAccess: false,
  admin: false,
};

// Le cache est scopé par userId : si un autre compte se connecte sur le même
// appareil, on ne doit jamais lui prêter par erreur les flags du compte
// précédent avant que le fetch réseau n'ait résolu.
function cacheKey(userId: string): string {
  return `smashlog_feature_flags_${userId}`;
}

export async function getCachedFeatureFlags(userId: string): Promise<FeatureFlags | null> {
  const raw = await AsyncStorage.getItem(cacheKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<FeatureFlags>;
    return {
      betaAccess: parsed.betaAccess === true,
      premiumAccess: parsed.premiumAccess === true,
      admin: parsed.admin === true,
    };
  } catch {
    return null;
  }
}

async function setCachedFeatureFlags(userId: string, flags: FeatureFlags): Promise<void> {
  await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(flags));
}

/**
 * Lit beta_access/premium_access depuis public.profiles et met à jour le
 * cache local en cas de succès. Renvoie `null` en cas d'échec (réseau,
 * erreur serveur...) : l'appelant doit alors conserver les dernières valeurs
 * connues (déjà en mémoire ou en cache) plutôt que de révoquer l'accès à
 * tort — cf. contrainte "offline" du ticket.
 */
export async function fetchFeatureFlags(userId: string): Promise<FeatureFlags | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("beta_access, premium_access, admin")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const flags: FeatureFlags = {
    betaAccess: data.beta_access === true,
    premiumAccess: data.premium_access === true,
    admin: data.admin === true,
  };

  await setCachedFeatureFlags(userId, flags);
  return flags;
}
