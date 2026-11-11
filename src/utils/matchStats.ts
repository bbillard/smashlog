import { Match, Session } from "@/src/types/session";
import { computeResultCounts, ResultCounts } from "@/src/utils/matchResult";

/**
 * Agrégats « matchs » de l'écran Stats. Toutes les règles de taux viennent de
 * computeResultCounts (src/utils/matchResult.ts) : nuls exclus du win rate,
 * comptés dans le volume.
 */

export interface DatedMatch {
  match: Match;
  /** Date de la séance parente. */
  date: Date;
}

export function collectDatedMatches(sessions: readonly Session[]): DatedMatch[] {
  const result: DatedMatch[] = [];
  for (const session of sessions) {
    const date = new Date(session.createdAt);
    for (const match of session.matches ?? []) {
      result.push({ match, date });
    }
  }
  return result;
}

export type ModeBreakdown = Record<Match["mode"], ResultCounts>;

export function computeModeBreakdown(entries: readonly DatedMatch[]): ModeBreakdown {
  const byMode = (mode: Match["mode"]) =>
    computeResultCounts(entries.filter((e) => e.match.mode === mode).map((e) => e.match));
  return { simple: byMode("simple"), double: byMode("double"), mixte: byMode("mixte") };
}

/** Lundi 00:00 (heure locale) de la semaine contenant `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - weekday);
  return d;
}

export interface WeeklyPoint {
  weekStart: Date;
  counts: ResultCounts;
}

/** Nombre de semaines couvrant ~3 mois (semaine en cours incluse). */
export const EVOLUTION_WEEKS = 13;

/**
 * Win rate semaine par semaine sur les `weeks` dernières semaines, de la plus
 * ancienne à la plus récente (semaine en cours incluse). Une semaine sans
 * match décisif a un winRate null.
 */
export function computeWeeklyEvolution(
  entries: readonly DatedMatch[],
  now: Date = new Date(),
  weeks: number = EVOLUTION_WEEKS,
): WeeklyPoint[] {
  const currentWeek = startOfWeek(now);
  const points: WeeklyPoint[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekStart = new Date(currentWeek);
    weekStart.setDate(currentWeek.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const inWeek = entries.filter((e) => e.date >= weekStart && e.date < weekEnd).map((e) => e.match);
    points.push({ weekStart, counts: computeResultCounts(inWeek) });
  }
  return points;
}
