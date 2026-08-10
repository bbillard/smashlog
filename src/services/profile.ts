import AsyncStorage from "@react-native-async-storage/async-storage";

import { syncProfileUpsert } from "@/src/services/entitySync";
import { Profile } from "@/src/types/profile";

const PROFILE_KEY = "badlog_profile";

export const DEFAULT_PROFILE: Profile = {
  username: "Joueur Badlog",
  photoUri: null,
};

export async function getProfile(): Promise<Profile> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) {
    return DEFAULT_PROFILE;
  }

  return {
    ...DEFAULT_PROFILE,
    ...(JSON.parse(raw) as Partial<Profile>),
  };
}

export async function saveProfile(profile: Profile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  void syncProfileUpsert(profile.username);
}

/**
 * Enregistre le profil localement SANS pousser vers Supabase — utilisé par
 * la restauration cloud (src/services/cloudRestore.ts), qui vient justement
 * de lire ce pseudo depuis Supabase : le repousser serait un aller-retour
 * inutile.
 */
export async function saveProfileLocal(profile: Profile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
