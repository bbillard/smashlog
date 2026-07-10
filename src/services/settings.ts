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
  nextSessionFamily: null,
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

export function getUpcomingScheduledSlotDates(slots: ScheduledSlot[], reference = new Date()) {
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

  return candidates.sort((left, right) => left.date.getTime() - right.date.getTime());
}

export function getNextScheduledSlotDate(slots: ScheduledSlot[], reference = new Date()) {
  return getUpcomingScheduledSlotDates(slots, reference)[0] ?? null;
}

export function getUpcomingReminderEntries(
  slots: ScheduledSlot[],
  leadMinutes: number,
  reference = new Date(),
) {
  const now = reference.getTime();
  return getUpcomingScheduledSlotDates(slots, reference)
    .map((entry) => {
      let sessionDate = new Date(entry.date);
      let reminderDate = new Date(sessionDate.getTime() - leadMinutes * 60 * 1000);

      // If the reminder time for this week's occurrence is already past,
      // roll forward to the next weekly occurrence of that slot.
      while (reminderDate.getTime() <= now) {
        sessionDate = new Date(sessionDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        reminderDate = new Date(sessionDate.getTime() - leadMinutes * 60 * 1000);
      }

      return {
        ...entry,
        date: sessionDate,
        reminderDate,
      };
    })
    .filter((entry) => entry.reminderDate.getTime() > now)
    .sort((left, right) => left.reminderDate.getTime() - right.reminderDate.getTime());
}

export function getNextScheduledReminder(
  slots: ScheduledSlot[],
  leadMinutes: number,
  reference = new Date(),
) {
  return getUpcomingReminderEntries(slots, leadMinutes, reference)[0] ?? null;
}

export async function applyPlanningToNotificationSettings(slots: ScheduledSlot[]) {
  const current = await getNotificationSettings();
  const nextSlot = getNextScheduledSlotDate(slots);

  const nextSettings: NotificationSettings = {
    ...current,
    fixedTimeEnabled: current.fixedTimeEnabled,
    fixedHour: current.fixedHour,
    fixedMinute: current.fixedMinute,
    nextSessionReminderEnabled: slots.length === 0 ? false : current.nextSessionReminderEnabled,
    nextSessionAt: nextSlot?.date.toISOString() ?? null,
    nextSessionFamily: nextSlot?.slot.family ?? null,
    nextSessionLeadMinutes:
      typeof current.nextSessionLeadMinutes === "number"
        ? current.nextSessionLeadMinutes
        : DEFAULT_NOTIFICATION_SETTINGS.nextSessionLeadMinutes,
  };

  await saveNotificationSettings(nextSettings);
  return nextSettings;
}
