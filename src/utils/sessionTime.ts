import { SessionType } from "@/src/types/session";

/**
 * Heure de fin de séance (v1.4.1) : durée par défaut et formatage.
 * La date/heure de début d'une séance est Session.createdAt ; l'heure de fin
 * (Session.endedAt) est toujours rattachée au même jour.
 */

/** Entraînement et jeu libre : 2 h ; tous les autres types (ou type non choisi) : 1 h. */
export function defaultDurationMinutes(type: SessionType | null): number {
  return type === "entrainement" || type === "jeu_libre" ? 120 : 60;
}

/** Heure de fin pré-remplie = début + durée par défaut du type. */
export function defaultEndFor(start: Date, type: SessionType | null): Date {
  return new Date(start.getTime() + defaultDurationMinutes(type) * 60 * 1000);
}

/** Recale l'heure (h:min) de `end` sur le jour de `start`. */
export function withDayOf(start: Date, end: Date): Date {
  const next = new Date(start);
  next.setHours(end.getHours(), end.getMinutes(), 0, 0);
  return next;
}

/** L'heure de fin, si renseignée, doit être strictement après le début. */
export function isEndAfterStart(start: Date, end: Date | null): boolean {
  return end === null || end.getTime() > start.getTime();
}

/** Durée en minutes entre début et fin (null si incohérente). */
export function durationMinutes(startIso: string, endIso: string): number | null {
  // À la minute près : les secondes du début (heure « maintenant ») ne doivent
  // pas transformer 11:51 → 12:51 en « 59 min »
  const toMinute = (iso: string) => Math.floor(new Date(iso).getTime() / 60000);
  const minutes = toMinute(endIso) - toMinute(startIso);
  return minutes > 0 ? minutes : null;
}

/** 90 → "1h30", 120 → "2h", 45 → "45 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(date);
}
