import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { NotificationContext, pickMotivationMessage } from "@/src/data/notificationMessages";
import { ScheduledSlot, SlotType } from "@/src/services/onboarding";
import { NotificationSettings, Session, SessionType } from "@/src/types/session";

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

// ---------------------------------------------------------------------------
// Planning — weekly recurring notifications (one per slot)
// ---------------------------------------------------------------------------

const SLOT_TYPE_LABELS: Record<SlotType, string> = {
  badminton: "Badminton",
  renforcement: "Renforcement",
  cardio: "Cardio",
  autre: "Séance",
};

/**
 * Maps a planning SlotType to the SessionType values that belong to it.
 * badminton groups match + entrainement + jeu_libre together.
 */
const SLOT_TYPE_TO_SESSION_TYPES: Record<SlotType, SessionType[]> = {
  badminton: ["match", "entrainement", "jeu_libre"],
  renforcement: ["renforcement"],
  cardio: ["cardio"],
  autre: ["autre"],
};

/**
 * Maps a SessionType back to the SlotType it belongs to.
 * Used to know which planning slots to reschedule after a new session.
 */
export const SESSION_TYPE_TO_SLOT_TYPE: Record<SessionType, SlotType> = {
  match: "badminton",
  entrainement: "badminton",
  jeu_libre: "badminton",
  renforcement: "renforcement",
  cardio: "cardio",
  autre: "autre",
};

const SLOT_TYPE_NO_INTENT_CONTEXT: Record<SlotType, NotificationContext> = {
  badminton: "planning_badminton_no_intent",
  renforcement: "planning_renforcement_no_intent",
  cardio: "planning_cardio_no_intent",
  autre: "planning_autre_no_intent",
};

/**
 * Scans sessions (already sorted newest-first) and returns the nextIntention
 * of the most recent session whose type matches the given slotType.
 * Returns null if no matching session has a non-empty intention.
 */
export function getLastIntentionForSlotType(sessions: Session[], slotType: SlotType): string | null {
  const matchingTypes = new Set<SessionType>(SLOT_TYPE_TO_SESSION_TYPES[slotType]);
  for (const session of sessions) {
    if (matchingTypes.has(session.type) && session.nextIntention.trim().length > 0) {
      return session.nextIntention.trim();
    }
  }
  return null;
}

/**
 * Converts our dayOfWeek (0=Mon … 6=Sun) to the expo-notifications weekday
 * convention (1=Sun, 2=Mon … 7=Sat).
 */
function toExpoWeekday(dayOfWeek: number): number {
  return dayOfWeek === 6 ? 1 : dayOfWeek + 2;
}

/**
 * Schedules a weekly recurring notification for `slot`, firing `leadMinutes`
 * before the session time.
 *
 * If `sessions` is provided, the notification body will show the last recorded
 * intention for the slot's type (scanning back through history for a non-empty
 * one). Falls back to a generic motivation message when no intention is found.
 *
 * Returns the notification ID, or null if scheduling was not possible
 * (no permission, web, etc.).
 */
export async function schedulePlanningSlotNotification(
  slot: ScheduledSlot,
  leadMinutes: number,
  sessions: Session[] = [],
): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  // Compute notification time = slot time − lead
  let totalNotifMinutes = slot.hour * 60 + slot.minute - leadMinutes;
  let notifDay = slot.dayOfWeek;

  if (totalNotifMinutes < 0) {
    totalNotifMinutes += 24 * 60;
    notifDay = (notifDay + 6) % 7; // wrap back one day
  }

  const hour = Math.floor(totalNotifMinutes / 60) % 24;
  const minute = totalNotifMinutes % 60;
  const label = SLOT_TYPE_LABELS[slot.type];

  // Build notification content: intention if available, generic message otherwise
  const intention = getLastIntentionForSlotType(sessions, slot.type);
  const content = intention
    ? {
        title: `${label} bientôt 🏸`,
        body: `Ton objectif : ${intention}`,
      }
    : {
        title: `${label} bientôt 🏸`,
        body: pickMotivationMessage(SLOT_TYPE_NO_INTENT_CONTEXT[slot.type]),
      };

  const notificationId = await Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: toExpoWeekday(notifDay),
      hour,
      minute,
    },
  });

  return notificationId;
}

/** Cancels the recurring notification tied to a single slot. */
export async function cancelPlanningSlotNotification(notificationId: string): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancels all current planning slot notifications and reschedules fresh ones.
 * Call this when the user changes the lead-time setting.
 * Pass `sessions` to include the latest intention in each notification body.
 * Returns the updated slots (with new notificationId values).
 */
export async function reschedulePlanningNotifications(
  slots: ScheduledSlot[],
  leadMinutes: number,
  sessions: Session[] = [],
): Promise<ScheduledSlot[]> {
  if (Platform.OS === "web") return slots;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return slots;

  const updated: ScheduledSlot[] = await Promise.all(
    slots.map(async (slot) => {
      if (slot.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(slot.notificationId).catch(() => undefined);
      }
      const notificationId = await schedulePlanningSlotNotification(slot, leadMinutes, sessions);
      return { ...slot, notificationId: notificationId ?? undefined };
    }),
  );

  return updated;
}

/**
 * After saving a session, reschedules only the planning slots whose type
 * corresponds to the session type (e.g. saving a "match" reschedules
 * "badminton" slots). Updates the notificationId on each affected slot
 * and returns the full updated slot list.
 */
export async function rescheduleSlotsForSessionType(
  allSlots: ScheduledSlot[],
  sessionType: SessionType,
  leadMinutes: number,
  sessions: Session[],
): Promise<ScheduledSlot[]> {
  if (Platform.OS === "web") return allSlots;

  const targetSlotType = SESSION_TYPE_TO_SLOT_TYPE[sessionType];
  const updatedSlots = await Promise.all(
    allSlots.map(async (slot) => {
      if (slot.type !== targetSlotType) return slot;

      // Cancel the existing notification for this slot
      if (slot.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(slot.notificationId).catch(() => undefined);
      }

      // Reschedule with updated intention
      const notificationId = await schedulePlanningSlotNotification(slot, leadMinutes, sessions);
      return { ...slot, notificationId: notificationId ?? undefined };
    }),
  );

  return updatedSlots;
}

// ---------------------------------------------------------------------------
// Session-based notifications
// ---------------------------------------------------------------------------

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
