import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { NotificationSettings, Session } from "@/src/types/session";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermissions() {
  if (Platform.OS === "web") {
    return false;
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) {
    return true;
  }

  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function cancelSessionNotifications(sessions: Session[]) {
  if (Platform.OS === "web") {
    return;
  }

  const notificationIds = sessions.flatMap((session) => session.notificationIds ?? []);
  await Promise.all(notificationIds.map((notificationId) => Notifications.cancelScheduledNotificationAsync(notificationId)));
}

function buildContent(intention: string) {
  return {
    title: "C'est l'heure de jouer 🏸",
    body: `Ton objectif : ${intention}`,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function rescheduleNotifications(
  sessions: Session[],
  settings: NotificationSettings,
): Promise<{ notificationIds: string[]; notificationScheduledAt?: string }> {
  if (Platform.OS === "web") {
    return { notificationIds: [] };
  }

  await cancelSessionNotifications(sessions);

  const latestSession = sessions[0];
  if (!latestSession) {
    return { notificationIds: [] };
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return { notificationIds: [] };
  }

  const notificationIds: string[] = [];
  const scheduledDates: string[] = [];
  const content = buildContent(latestSession.nextIntention);
  const fixedHour = clamp(Number.isFinite(settings.fixedHour) ? settings.fixedHour : 18, 0, 23);
  const fixedMinute = clamp(Number.isFinite(settings.fixedMinute) ? settings.fixedMinute : 30, 0, 59);
  const leadMinutes = clamp(
    Number.isFinite(settings.nextSessionLeadMinutes) ? settings.nextSessionLeadMinutes : 30,
    0,
    24 * 60,
  );

  if (settings.fixedTimeEnabled) {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: fixedHour,
        minute: fixedMinute,
      },
    });
    notificationIds.push(notificationId);

    const scheduledDate = new Date();
    scheduledDate.setHours(fixedHour, fixedMinute, 0, 0);
    if (scheduledDate.getTime() < Date.now()) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }
    scheduledDates.push(scheduledDate.toISOString());
  }

  if (settings.nextSessionReminderEnabled && settings.nextSessionAt) {
    const sessionDate = new Date(settings.nextSessionAt);
    const reminderDate = new Date(sessionDate.getTime() - leadMinutes * 60 * 1000);

    if (!Number.isNaN(sessionDate.getTime()) && reminderDate.getTime() > Date.now()) {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        },
      });
      notificationIds.push(notificationId);
      scheduledDates.push(reminderDate.toISOString());
    }
  }

  return {
    notificationIds,
    notificationScheduledAt: scheduledDates.sort()[0],
  };
}
