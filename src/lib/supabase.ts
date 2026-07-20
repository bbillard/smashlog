import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/src/types/supabase";

export type { Database, Tables, TablesInsert, TablesUpdate } from "@/src/types/supabase";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Variables d'environnement Supabase manquantes. Vérifie que EXPO_PUBLIC_SUPABASE_URL et " +
      "EXPO_PUBLIC_SUPABASE_ANON_KEY sont définies dans le fichier .env à la racine du projet.",
  );
}

/**
 * Storage adapter utilisé par supabase-js pour persister la session Auth
 * (access token / refresh token) dans le Keychain (iOS) / Keystore (Android)
 * via expo-secure-store, plutôt que dans AsyncStorage en clair.
 *
 * Note : le Keystore Android limite historiquement chaque valeur à ~2048
 * octets. Une session Supabase classique (JWT + refresh token) reste sous
 * cette limite ; si `sets`/métadonnées custom venaient à grossir le JWT,
 * il faudrait basculer vers un stockage chiffré adossé à AsyncStorage.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

/**
 * Client Supabase partagé de l'app. Ne jamais instancier `createClient`
 * ailleurs : tous les services doivent importer ce singleton.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // PKCE : recommandé pour les apps mobiles (le "code verifier" reste sur
    // l'appareil), utilisé par le flux OAuth Google (cf. src/context/AuthContext.tsx).
    flowType: "pkce",
  },
});

// Le refresh automatique du token ne doit tourner que quand l'app est au
// premier plan, sous peine de tentatives de refresh inutiles en arrière-plan.
// Cf. https://supabase.com/docs/guides/auth/quickstarts/react-native
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
