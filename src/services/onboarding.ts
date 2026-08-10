import AsyncStorage from "@react-native-async-storage/async-storage";

import { syncPlanningReplace } from "@/src/services/entitySync";
import { DEFAULT_PROFILE, getProfile, saveProfile } from "@/src/services/profile";
import { createId } from "@/src/utils/id";

export const ONBOARDING_COMPLETED_KEY = "smashlog_onboarding_completed";
export const ONBOARDING_USERNAME_KEY = "smashlog_username";
export const SCHEDULED_SLOTS_KEY = "smashlog_scheduled_slots";
export const FORCE_ONBOARDING_KEY = "smashlog_force_onboarding";

export interface ScheduledSlot {
  id: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  hour: number;
  minute: number;
  family: "badminton" | "renforcement" | "cardio" | "autre";
}

export async function getOnboardingCompleted() {
  return (await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY)) === "true";
}

export async function setOnboardingCompleted(value: boolean) {
  await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, value ? "true" : "false");
}

export async function getForceOnboarding() {
  return (await AsyncStorage.getItem(FORCE_ONBOARDING_KEY)) === "true";
}

export async function setForceOnboarding(value: boolean) {
  await AsyncStorage.setItem(FORCE_ONBOARDING_KEY, value ? "true" : "false");
}

export async function getOnboardingUsername() {
  return (await AsyncStorage.getItem(ONBOARDING_USERNAME_KEY)) ?? "";
}

export async function setOnboardingUsername(username: string) {
  await AsyncStorage.setItem(ONBOARDING_USERNAME_KEY, username);
}

export async function getScheduledSlots(): Promise<ScheduledSlot[]> {
  const raw = await AsyncStorage.getItem(SCHEDULED_SLOTS_KEY);
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw) as Array<Omit<ScheduledSlot, "family"> & { family: ScheduledSlot["family"] | "physique" }>;

  return parsed.map((slot) => ({
    ...slot,
    family: slot.family === "physique" ? "renforcement" : slot.family,
  }));
}

export async function saveScheduledSlots(slots: ScheduledSlot[]) {
  const previous = await getScheduledSlots();
  await AsyncStorage.setItem(SCHEDULED_SLOTS_KEY, JSON.stringify(slots));
  void syncPlanningReplace(previous, slots);
}

/**
 * Remplace intégralement le planning stocké SANS pousser vers Supabase —
 * utilisé par la restauration cloud (src/services/cloudRestore.ts), qui vient
 * justement de lire ces données depuis Supabase : les repousser serait un
 * aller-retour inutile.
 */
export async function replaceScheduledSlotsLocal(slots: ScheduledSlot[]): Promise<void> {
  await AsyncStorage.setItem(SCHEDULED_SLOTS_KEY, JSON.stringify(slots));
}

export async function completeOnboarding(username: string) {
  const profile = await getProfile();
  await setOnboardingUsername(username);
  await saveProfile({
    ...profile,
    username,
  });
  await setForceOnboarding(false);
  await setOnboardingCompleted(true);
}

export async function syncLegacyProfileIntoOnboarding() {
  const [profile, onboardingUsername] = await Promise.all([getProfile(), getOnboardingUsername()]);
  const hasLegacyUsername =
    profile.username.trim().length > 0 && profile.username.trim() !== DEFAULT_PROFILE.username;

  if (onboardingUsername && profile.username !== onboardingUsername) {
    await saveProfile({
      ...profile,
      username: onboardingUsername,
    });
  } else if (!onboardingUsername && hasLegacyUsername) {
    await setOnboardingUsername(profile.username.trim());
  }
}

/**
 * Toujours un uuid v4 valide (délègue à createId(), déjà utilisé pour
 * players/exercises/sessions). Historiquement cette fonction retombait sur
 * un format `slot-<timestamp>-<random>` quand `crypto.randomUUID` n'était
 * pas disponible dans le runtime JS — cassait l'upsert Supabase de
 * planning_slots (colonne `id` typée uuid) lors de la migration cloud, avec
 * une erreur Postgres 22P02 "invalid input syntax for type uuid". Les slots
 * déjà créés avec l'ancien format sont gérés côté migration (cf.
 * src/services/migration.ts, toPlanningRow) pour ne pas bloquer les
 * utilisateurs qui en ont déjà en local.
 */
export function createScheduledSlotId() {
  return createId();
}
