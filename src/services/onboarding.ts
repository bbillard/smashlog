import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_PROFILE, getProfile, saveProfile } from "@/src/services/profile";

export const ONBOARDING_COMPLETED_KEY = "smashlog_onboarding_completed";
export const ONBOARDING_USERNAME_KEY = "smashlog_username";
export const SCHEDULED_SLOTS_KEY = "smashlog_scheduled_slots";
export const FORCE_ONBOARDING_KEY = "smashlog_force_onboarding";

export type SlotType = "badminton" | "renforcement" | "cardio" | "autre";

export interface ScheduledSlot {
  id: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  hour: number;
  minute: number;
  type: SlotType;
  /** Expo notification ID for the weekly recurring reminder, if scheduled. */
  notificationId?: string;
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

/** Migrate a raw stored slot object to the current ScheduledSlot shape. */
function migrateSlot(raw: unknown): ScheduledSlot | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== "string" || typeof s.dayOfWeek !== "number") return null;

  // family → type migration (old data used "badminton" | "physique")
  let type: SlotType;
  if (typeof s.type === "string" && ["badminton", "renforcement", "cardio", "autre"].includes(s.type)) {
    type = s.type as SlotType;
  } else if (s.family === "physique") {
    type = "renforcement";
  } else {
    type = "badminton";
  }

  return {
    id: s.id,
    dayOfWeek: s.dayOfWeek as ScheduledSlot["dayOfWeek"],
    hour: typeof s.hour === "number" ? s.hour : 19,
    minute: typeof s.minute === "number" ? s.minute : 0,
    type,
    notificationId: typeof s.notificationId === "string" ? s.notificationId : undefined,
  };
}

export async function getScheduledSlots(): Promise<ScheduledSlot[]> {
  const raw = await AsyncStorage.getItem(SCHEDULED_SLOTS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown[];
    return parsed.map(migrateSlot).filter((s): s is ScheduledSlot => s !== null);
  } catch {
    return [];
  }
}

export async function saveScheduledSlots(slots: ScheduledSlot[]) {
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

export function createScheduledSlotId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `slot-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
