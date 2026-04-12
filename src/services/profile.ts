import AsyncStorage from "@react-native-async-storage/async-storage";

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
}
