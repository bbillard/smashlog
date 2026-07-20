import { supabase } from "@/src/lib/supabase";
import { getOnboardingUsername } from "@/src/services/onboarding";

/**
 * Garantit qu'une ligne public.profiles existe pour l'utilisateur connecté,
 * initialisée avec le pseudo déjà choisi localement (AsyncStorage,
 * clé "smashlog_username" — cf. src/services/onboarding.ts).
 *
 * Idempotent : safe à appeler à chaque connexion (email, Apple, Google),
 * pas seulement à l'inscription — un upsert sur `id` ne duplique jamais
 * la ligne et ne réinitialise pas les champs déjà renseignés dans le cloud
 * (`ignoreDuplicates` non utilisé volontairement : on veut que l'update
 * soit un no-op silencieux si le username local est vide).
 */
export async function ensureAuthProfile(userId: string): Promise<void> {
  const localUsername = (await getOnboardingUsername()).trim();

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        ...(localUsername ? { username: localUsername } : {}),
      },
      { onConflict: "id" },
    );

  if (error) {
    // On ne bloque jamais l'auth pour un souci de synchro du profil cloud :
    // l'app reste utilisable en local, on se contente de logger.
    console.warn("[authProfile] Impossible de synchroniser public.profiles", error.message);
  }
}
