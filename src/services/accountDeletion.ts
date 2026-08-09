import AsyncStorage from "@react-native-async-storage/async-storage";
import { FunctionsHttpError } from "@supabase/supabase-js";

import { supabase } from "@/src/lib/supabase";

/**
 * Suppression de compte (RGPD / obligation Apple). Deux étapes distinctes,
 * jamais mélangées :
 * - deleteCloudAccount() : supprime tout côté Supabase (données + auth.users)
 *   via l'Edge Function delete-account (cf. supabase/functions/delete-account/index.ts).
 *   Ne touche à rien en local.
 * - resetLocalData() : vide AsyncStorage. Appelée par AuthContext.deleteAccount()
 *   uniquement après succès de deleteCloudAccount(), et directement par
 *   l'écran Profil pour l'utilisateur sans compte ("Réinitialiser mes données").
 */

async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: unknown };
      if (typeof body?.error === "string" && body.error.trim()) {
        return body.error;
      }
    } catch {
      // Corps non-JSON ou illisible : on retombe sur le message générique.
    }
  }

  return error instanceof Error ? error.message : "Suppression du compte impossible pour le moment.";
}

/** Supprime les données Supabase et le compte auth de l'utilisateur connecté. */
export async function deleteCloudAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });
  if (!error) return;

  throw new Error(await extractFunctionErrorMessage(error));
}

/** Remet l'app dans l'état d'un premier lancement : vide tout AsyncStorage. */
export async function resetLocalData(): Promise<void> {
  await AsyncStorage.clear();
}
