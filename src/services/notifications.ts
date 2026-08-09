import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { pickMotivationMessage } from "@/src/data/notificationMessages";
import { getScheduledSlots } from "@/src/services/onboarding";
import { getUpcomingReminderEntries } from "@/src/services/settings";
import { getSessions } from "@/src/services/storage";
import { NotificationSettings, Session } from "@/src/types/session";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
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

export type NotificationPermissionStatus = {
  granted: boolean;
  canAskAgain: boolean;
};

/**
 * Lit le statut système actuel sans jamais déclencher la popup de demande.
 * Utile pour afficher un état persistant (ex. lien vers les réglages) sans
 * effet de bord.
 */
export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === "web") {
    return { granted: false, canAskAgain: false };
  }

  const current = await Notifications.getPermissionsAsync();
  return { granted: current.granted, canAskAgain: current.canAskAgain };
}

async function cancelAllScheduledNotifications() {
  if (Platform.OS === "web") {
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
}

function buildContent(title: string, body: string) {
  return {
    title,
    body,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getSessionFamily(type: Session["type"]): "badminton" | "renforcement" | "cardio" | "autre" {
  if (type === "renforcement") {
    return "renforcement";
  }

  if (type === "cardio") {
    return "cardio";
  }

  if (type === "autre") {
    return "autre";
  }

  return "badminton";
}

function findLatestSessionIntention(
  sessions: Session[],
  family: "badminton" | "renforcement" | "cardio" | "autre",
) {
  return sessions.find(
    (session) =>
      getSessionFamily(session.type) === family &&
      session.nextIntention.trim().length > 0,
  )?.nextIntention.trim();
}

function buildDailyNotificationContent(sessions: Session[]) {
  const latestBadmintonIntention = findLatestSessionIntention(sessions, "badminton");

  return buildContent(
    "C'est l'heure de jouer 🏸",
    latestBadmintonIntention ?? pickMotivationMessage("daily_no_badminton_session"),
  );
}

function buildPlanningNotificationContent(
  sessions: Session[],
  family: "badminton" | "renforcement" | "cardio" | "autre",
) {
  if (family === "badminton") {
    return buildContent(
      "C'est l'heure du badminton 🏸",
      findLatestSessionIntention(sessions, "badminton") ??
        pickMotivationMessage("planning_badminton_no_intent"),
    );
  }

  if (family === "renforcement") {
    return buildContent(
      "C'est l'heure du renforcement 💪",
      findLatestSessionIntention(sessions, "renforcement") ??
        pickMotivationMessage("planning_renforcement_no_intent"),
    );
  }

  if (family === "autre") {
    return buildContent(
      "C'est l'heure de ta séance ✨",
      findLatestSessionIntention(sessions, "autre") ??
        pickMotivationMessage("planning_autre_no_intent"),
    );
  }

  return buildContent(
    "C'est l'heure du cardio 🔥",
    findLatestSessionIntention(sessions, "cardio") ??
      pickMotivationMessage("planning_cardio_no_intent"),
  );
}

export async function rescheduleNotifications(
  settings: NotificationSettings,
): Promise<{ notificationIds: string[]; notificationScheduledAt?: string }> {
  if (Platform.OS === "web") {
    return { notificationIds: [] };
  }

  await cancelAllScheduledNotifications();

  if (!settings.fixedTimeEnabled && !settings.nextSessionReminderEnabled) {
    // Aucun rappel n'est activé : inutile de solliciter la permission ici.
    return { notificationIds: [] };
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return { notificationIds: [] };
  }

  const notificationIds: string[] = [];
  const scheduledDates: string[] = [];
  const storedSessions = await getSessions();
  const fixedHour = clamp(Number.isFinite(settings.fixedHour) ? settings.fixedHour : 18, 0, 23);
  const fixedMinute = clamp(Number.isFinite(settings.fixedMinute) ? settings.fixedMinute : 30, 0, 59);
  const leadMinutes = clamp(
    Number.isFinite(settings.nextSessionLeadMinutes) ? settings.nextSessionLeadMinutes : 30,
    0,
    24 * 60,
  );

  if (settings.fixedTimeEnabled) {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: buildDailyNotificationContent(storedSessions),
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
    const slots = await getScheduledSlots();
    const reminderEntries = getUpcomingReminderEntries(slots, leadMinutes);

    for (const reminderEntry of reminderEntries) {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: buildPlanningNotificationContent(storedSessions, reminderEntry.slot.family),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderEntry.reminderDate,
        },
      });
      notificationIds.push(notificationId);
      scheduledDates.push(reminderEntry.reminderDate.toISOString());
    }
  }

  return {
    notificationIds,
    notificationScheduledAt: scheduledDates.sort()[0],
  };
}
