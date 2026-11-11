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

export interface EvolutionPoint {
  /** Début de la tranche (lundi 00:00 pour une semaine, 1er du mois pour un mois). */
  start: Date;
  counts: ResultCounts;
}

/** Nombre de semaines couvrant ~3 mois (semaine en cours incluse). */
export const EVOLUTION_WEEKS = 13;
/** Nombre de mois affichés pour la période « Tout ». */
export const EVOLUTION_MONTHS = 12;

function countsBetween(entries: readonly DatedMatch[], from: Date, to: Date): ResultCounts {
  return computeResultCounts(entries.filter((e) => e.date >= from && e.date < to).map((e) => e.match));
}

/**
 * Win rate semaine par semaine sur les `weeks` dernières semaines, de la plus
 * ancienne à la plus récente (semaine en cours incluse). Une semaine sans
 * match comptabilisé a un winRate null.
 */
export function computeWeeklyEvolution(
  entries: readonly DatedMatch[],
  now: Date = new Date(),
  weeks: number = EVOLUTION_WEEKS,
): EvolutionPoint[] {
  const currentWeek = startOfWeek(now);
  const points: EvolutionPoint[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = new Date(currentWeek);
    start.setDate(currentWeek.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    points.push({ start, counts: countsBetween(entries, start, end) });
  }
  return points;
}

/** Win rate mois par mois sur les `months` derniers mois (mois en cours inclus). */
export function computeMonthlyEvolution(
  entries: readonly DatedMatch[],
  now: Date = new Date(),
  months: number = EVOLUTION_MONTHS,
): EvolutionPoint[] {
  const points: EvolutionPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    points.push({ start, counts: countsBetween(entries, start, end) });
  }
  return points;
}

// ── Période de l'écran Stats ──────────────────────────────────────────────────

export type StatsPeriod = "month" | "3months" | "all";

export const STATS_PERIOD_LABELS: Record<StatsPeriod, string> = {
  month: "Ce mois",
  "3months": "3 mois",
  all: "Tout",
};

/**
 * Borne de début (incluse) d'une période, null pour « Tout ».
 * - Ce mois : 1er du mois en cours
 * - 3 mois : lundi de la semaine en cours − 12 semaines (13 semaines, comme le graphe)
 */
export function periodStart(period: StatsPeriod, now: Date = new Date()): Date | null {
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "3months") {
    const start = startOfWeek(now);
    start.setDate(start.getDate() - (EVOLUTION_WEEKS - 1) * 7);
    return start;
  }
  return null;
}

export function filterSessionsByPeriod<T extends { createdAt: string }>(
  sessions: readonly T[],
  period: StatsPeriod,
  now: Date = new Date(),
): T[] {
  const from = periodStart(period, now);
  return from ? sessions.filter((s) => new Date(s.createdAt) >= from) : [...sessions];
}

export interface Evolution {
  granularity: "week" | "month";
  points: EvolutionPoint[];
}

/**
 * Graphe d'évolution adapté à la période :
 * - Ce mois → par semaine depuis la semaine du 1er du mois
 * - 3 mois → par semaine sur 13 semaines
 * - Tout → par mois sur 12 mois
 */
export function computeEvolution(
  entries: readonly DatedMatch[],
  period: StatsPeriod,
  now: Date = new Date(),
): Evolution {
  if (period === "all") {
    return { granularity: "month", points: computeMonthlyEvolution(entries, now) };
  }
  if (period === "month") {
    const firstWeek = startOfWeek(new Date(now.getFullYear(), now.getMonth(), 1));
    const weeks = Math.round((startOfWeek(now).getTime() - firstWeek.getTime()) / (7 * 24 * 3600 * 1000)) + 1;
    // Le 1er tombe souvent en milieu de semaine : la 1re barre ne compte que les jours du mois
    const points = computeWeeklyEvolution(entries, now, weeks);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(points[0].start);
    end.setDate(end.getDate() + 7);
    points[0] = { start: points[0].start, counts: countsBetween(entries, monthStart, end) };
    return { granularity: "week", points };
  }
  return { granularity: "week", points: computeWeeklyEvolution(entries, now) };
}
