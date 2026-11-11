import { ScheduledSlot } from "@/src/services/onboarding";
import { Session, SessionType } from "@/src/types/session";

/**
 * Notification post-séance (v1.4.1) : envoyée 2 h après le début d'un créneau
 * du planning ; au tap, ouvre le wizard de création pré-rempli (type + heure).
 * Ce module ne contient que la logique pure (dates, contenu, payload) — la
 * planification expo-notifications reste dans src/services/notifications.ts.
 */

export const POST_SESSION_DELAY_MINUTES = 120;
/** Une séance enregistrée dans ce délai avant l'envoi annule la notification de l'occurrence. */
export const POST_SESSION_SKIP_WINDOW_MINUTES = 180;
/** Occurrences planifiées d'avance par créneau (relais si l'app n'est pas rouverte). */
export const POST_SESSION_MAX_WEEKS_AHEAD = 4;
/** Budget de notifications post-séance (iOS limite à 64 notifications locales en attente). */
export const POST_SESSION_NOTIFICATION_BUDGET = 40;

export const POST_SESSION_KIND = "post_session";

export interface PostSessionPayload {
  kind: typeof POST_SESSION_KIND;
  family: ScheduledSlot["family"];
  /** Début du créneau (ISO) : pré-remplit l'heure de début du wizard. */
  startAt: string;
}

export function isPostSessionPayload(data: unknown): data is PostSessionPayload {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    d.kind === POST_SESSION_KIND &&
    typeof d.startAt === "string" &&
    (d.family === "badminton" || d.family === "renforcement" || d.family === "cardio" || d.family === "autre")
  );
}

const FAMILY_COPY: Record<ScheduledSlot["family"], { label: string; emoji: string }> = {
  badminton: { label: "ta séance de badminton", emoji: "🏸" },
  renforcement: { label: "ta séance de renforcement", emoji: "💪" },
  cardio: { label: "ta séance de cardio", emoji: "🔥" },
  autre: { label: "ta séance", emoji: "✨" },
};

export function buildPostSessionContent(family: ScheduledSlot["family"]): { title: string; body: string } {
  const copy = FAMILY_COPY[family];
  return {
    title: "Comment s'est passée ta séance ?",
    body: `Prends 2 minutes pour smashloguer ${copy.label} ${copy.emoji}`,
  };
}

/** Prochain début (>= reference) du créneau hebdomadaire, en heure locale. */
function firstOccurrenceFrom(slot: ScheduledSlot, reference: Date): Date {
  const candidate = new Date(reference);
  candidate.setHours(slot.hour, slot.minute, 0, 0);
  const weekday = (candidate.getDay() + 6) % 7; // lundi = 0, comme ScheduledSlot.dayOfWeek
  candidate.setDate(candidate.getDate() + ((slot.dayOfWeek - weekday + 7) % 7));
  return candidate;
}

export interface PostSessionEntry {
  slot: ScheduledSlot;
  /** Début du créneau. */
  startAt: Date;
  /** Envoi de la notification (début + 2 h). */
  fireAt: Date;
}

/**
 * Occurrences à planifier : pour chaque créneau, les prochaines occurrences
 * dont l'envoi est dans le futur. Une occurrence est sautée si une séance a
 * déjà été enregistrée (createdAt) dans les 3 h précédant son envoi.
 */
export function getUpcomingPostSessionEntries(
  slots: readonly ScheduledSlot[],
  sessions: readonly Pick<Session, "createdAt">[],
  now: Date = new Date(),
): PostSessionEntry[] {
  if (slots.length === 0) return [];
  const weeks = Math.max(
    1,
    Math.min(POST_SESSION_MAX_WEEKS_AHEAD, Math.floor(POST_SESSION_NOTIFICATION_BUDGET / slots.length)),
  );
  const sessionTimes = sessions.map((s) => new Date(s.createdAt).getTime());
  // On part d'une semaine en arrière pour couvrir un créneau commencé il y a < 2 h
  const from = new Date(now);
  from.setDate(from.getDate() - 1);
  from.setHours(0, 0, 0, 0);

  const entries: PostSessionEntry[] = [];
  for (const slot of slots) {
    const first = firstOccurrenceFrom(slot, from);
    let planned = 0;
    for (let week = 0; planned < weeks && week < weeks + 2; week += 1) {
      const startAt = new Date(first);
      startAt.setDate(first.getDate() + week * 7);
      const fireAt = new Date(startAt.getTime() + POST_SESSION_DELAY_MINUTES * 60 * 1000);
      if (fireAt.getTime() <= now.getTime()) continue;
      const windowStart = fireAt.getTime() - POST_SESSION_SKIP_WINDOW_MINUTES * 60 * 1000;
      const alreadyLogged = sessionTimes.some((t) => t >= windowStart && t <= fireAt.getTime());
      planned += 1;
      if (alreadyLogged) continue;
      entries.push({ slot, startAt, fireAt });
    }
  }
  return entries.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

const BADMINTON_TYPES: readonly SessionType[] = ["match", "entrainement", "jeu_libre"];

/**
 * Type de séance à pré-sélectionner depuis la famille du créneau. Le planning
 * ne distingue pas match / entraînement / jeu libre : pour « badminton », on
 * reprend le type de la dernière séance de badminton, sinon « entrainement ».
 * `sessions` doit être trié du plus récent au plus ancien (getSessions).
 */
export function resolveSessionTypeForFamily(
  family: ScheduledSlot["family"],
  sessions: readonly Pick<Session, "type">[],
): SessionType {
  if (family !== "badminton") return family;
  return sessions.find((s) => BADMINTON_TYPES.includes(s.type))?.type ?? "entrainement";
}
