import { supabase } from "@/src/lib/supabase";
import { getOnboardingUsername } from "@/src/services/onboarding";

/**
 * Garantit qu'une ligne public.profiles existe pour l'utilisateur connecté
 * (les autres tables — players, exercises, sessions... — ont une FK vers
 * profiles.id, cette ligne doit donc exister avant toute écriture).
 *
 * Idempotent : safe à appeler à chaque connexion (email, Apple, Google),
 * pas seulement à l'inscription. `ignoreDuplicates: true` est volontaire :
 * si la ligne existe déjà (2e appareil, reconnexion...), on ne touche pas
 * au username déjà présent dans le cloud — sinon on écraserait
 * silencieusement le pseudo d'un autre appareil à chaque connexion. La
 * réconciliation du pseudo (garder le local ou le cloud en cas de
 * différence) est gérée explicitement, une seule fois, par la migration
 * (cf. src/services/migration.ts, reconcileProfile/resolveProfileConflict).
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
      { onConflict: "id", ignoreDuplicates: true },
    );

  if (error) {
    // On ne bloque jamais l'auth pour un souci de synchro du profil cloud :
    // l'app reste utilisable en local, on se contente de logger.
    console.warn("[authProfile] Impossible de synchroniser public.profiles", error.message);
  }
}
