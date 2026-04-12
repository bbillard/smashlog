import AsyncStorage from "@react-native-async-storage/async-storage";

import { ScheduledSlot } from "@/src/services/onboarding";
import { NotificationSettings } from "@/src/types/session";

const SETTINGS_KEY = "badlog_notification_settings";

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  fixedTimeEnabled: true,
  fixedHour: 18,
  fixedMinute: 30,
  nextSessionReminderEnabled: false,
  nextSessionAt: null,
  nextSessionLeadMinutes: 30,
};

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  const parsed = JSON.parse(raw) as Partial<NotificationSettings> & { nextSessionLeadHours?: number };

  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...parsed,
    nextSessionLeadMinutes:
      typeof parsed.nextSessionLeadMinutes === "number"
        ? parsed.nextSessionLeadMinutes
        : typeof parsed.nextSessionLeadHours === "number"
          ? parsed.nextSessionLeadHours * 60
          : DEFAULT_NOTIFICATION_SETTINGS.nextSessionLeadMinutes,
  };
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function resetNotificationSettingsToDefault() {
  await saveNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
}

export function getNextScheduledSlotDate(slots: ScheduledSlot[], reference = new Date()) {
  if (slots.length === 0) {
    return null;
  }

  const candidates = slots.map((slot) => {
    const candidate = new Date(reference);
    candidate.setSeconds(0, 0);
    const currentDay = candidate.getDay();
    const normalizedCurrentDay = currentDay === 0 ? 6 : currentDay - 1;
    let dayDelta = slot.dayOfWeek - normalizedCurrentDay;

    if (
      dayDelta < 0 ||
      (dayDelta === 0 &&
        (slot.hour < candidate.getHours() ||
          (slot.hour === candidate.getHours() && slot.minute <= candidate.getMinutes())))
    ) {
      dayDelta += 7;
    }

    candidate.setDate(candidate.getDate() + dayDelta);
    candidate.setHours(slot.hour, slot.minute, 0, 0);

    return {
      slot,
      date: candidate,
    };
  });

  candidates.sort((left, right) => left.date.getTime() - right.date.getTime());
  return candidates[0] ?? null;
}

export async function applyPlanningToNotificationSettings(slots: ScheduledSlot[]) {
  const current = await getNotificationSettings();
  const nextSlot = getNextScheduledSlotDate(slots);

  const nextSettings: NotificationSettings = {
    ...current,
    fixedTimeEnabled: slots.length === 0,
    fixedHour: slots.length === 0 ? DEFAULT_NOTIFICATION_SETTINGS.fixedHour : current.fixedHour,
    fixedMinute: slots.length === 0 ? DEFAULT_NOTIFICATION_SETTINGS.fixedMinute : current.fixedMinute,
    nextSessionReminderEnabled: slots.length > 0,
    nextSessionAt: nextSlot?.date.toISOString() ?? null,
    nextSessionLeadMinutes:
      typeof current.nextSessionLeadMinutes === "number"
        ? current.nextSessionLeadMinutes
        : DEFAULT_NOTIFICATION_SETTINGS.nextSessionLeadMinutes,
  };

  await saveNotificationSettings(nextSettings);
  return nextSettings;
}
