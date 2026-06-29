// ─────────────────────────────────────────────────────────────────────────────
// src/services/sharingTrigger.ts
//
// Étape 2 — Détection des paliers.
// Répond à la question : "Après cette séance, faut-il afficher une carte
// spéciale streak ou milestone ?"
// ─────────────────────────────────────────────────────────────────────────────

import {
  WEEKS_STREAK_THRESHOLDS,
  SESSIONS_PER_WEEK_THRESHOLDS,
  MILESTONE_THRESHOLDS,
  type CardType,
  type MessageLevel,
  type Threshold,
} from '../data/sharingData';

// ── Types retournés ───────────────────────────────────────────────────────────

export interface TriggeredCard {
  cardType: CardType;
  value: number;       // valeur atteinte (ex: 7 semaines, 50 séances)
  level: MessageLevel;
}

// Résultat complet après une séance : 0, 1 ou plusieurs cartes spéciales
export interface TriggerResult {
  cards: TriggeredCard[]; // vide = pas de carte spéciale, afficher cartes génériques
}

// ── Stats nécessaires à passer depuis l'app ───────────────────────────────────

export interface SessionStats {
  totalSessions: number;       // total cumulé APRÈS la séance qui vient d'être enregistrée
  currentWeeksStreak: number;  // semaines consécutives avec ≥1 séance (semaine courante incluse)
  sessionsThisWeek: number;    // nombre de séances sur la semaine calendaire en cours (lundi→dimanche)
  isLowSessionRate: boolean;   // true si l'utilisateur n'a joué qu'une fois cette semaine et la précédente
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Vérifie si `value` correspond exactement à un palier dans la liste.
 * Retourne le Threshold si palier atteint, null sinon.
 */
function matchThreshold(value: number, thresholds: Threshold[]): Threshold | null {
  return thresholds.find((t) => t.value === value) ?? null;
}

// ── Niveau minimum pour afficher un message motivationnel ─────────────────────

/**
 * Seuls les jalons de niveau 3 et supérieurs déclenchent une carte de partage.
 * En dessous, la séance est enregistrée silencieusement.
 */
const MIN_MOTIVATIONAL_LEVEL: MessageLevel = 3;

// ── Fonction principale ───────────────────────────────────────────────────────

/**
 * À appeler immédiatement après l'enregistrement d'une séance.
 * Retourne les cartes spéciales à afficher (peut être vide).
 *
 * Ordre de priorité si plusieurs paliers sont atteints le même jour :
 *   1. Milestone (total séances) — le plus "permanent"
 *   2. Weeks streak — effort sur la durée
 *   3. Sessions per week — effort sur la semaine
 *
 * On retourne TOUTES les cartes déclenchées : l'UI décidera laquelle
 * afficher en premier (ou les proposer en swipe).
 *
 * Seuls les jalons de niveau ≥ MIN_MOTIVATIONAL_LEVEL sont inclus.
 */
export function detectTriggeredCards(stats: SessionStats): TriggerResult {
  const cards: TriggeredCard[] = [];

  // 1. Milestone
  const milestoneHit = matchThreshold(stats.totalSessions, MILESTONE_THRESHOLDS);
  if (milestoneHit && milestoneHit.level >= MIN_MOTIVATIONAL_LEVEL) {
    cards.push({
      cardType: 'milestone',
      value: stats.totalSessions,
      level: milestoneHit.level,
    });
  }

  // 2. Weeks streak
  const weeksHit = matchThreshold(stats.currentWeeksStreak, WEEKS_STREAK_THRESHOLDS);
  if (weeksHit && weeksHit.level >= MIN_MOTIVATIONAL_LEVEL) {
    cards.push({
      cardType: 'weeksStreak',
      value: stats.currentWeeksStreak,
      level: weeksHit.level,
    });
  }

  // 3. Sessions per week
  const sessionsHit = matchThreshold(stats.sessionsThisWeek, SESSIONS_PER_WEEK_THRESHOLDS);
  if (sessionsHit && sessionsHit.level >= MIN_MOTIVATIONAL_LEVEL) {
    cards.push({
      cardType: 'sessionsPerWeek',
      value: stats.sessionsThisWeek,
      level: sessionsHit.level,
    });
  }

  return { cards };
}

// ── Helpers de calcul des stats (à brancher sur storage.ts) ──────────────────

/**
 * Calcule le weeks streak à partir de la liste de toutes les sessions.
 * Une "semaine" = lundi 00:00 → dimanche 23:59 (ISO week).
 * Le streak compte les semaines consécutives jusqu'à aujourd'hui inclus.
 */
export function computeWeeksStreak(sessions: { createdAt: string }[]): number {
  if (sessions.length === 0) return 0;

  // Extraire les numéros de semaine ISO uniques (YYYY-Www)
  const weekSet = new Set(
    sessions.map((s) => {
      const d = new Date(s.createdAt);
      const isoWeek = getISOWeekString(d);
      return isoWeek;
    })
  );

  const weeks = Array.from(weekSet).sort().reverse(); // du plus récent au plus ancien
  const currentWeek = getISOWeekString(new Date());

  // La semaine courante doit être présente
  if (weeks[0] !== currentWeek) return 0;

  let streak = 1;
  for (let i = 1; i < weeks.length; i++) {
    if (isPreviousWeek(weeks[i], weeks[i - 1])) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Calcule le nombre de séances sur la semaine calendaire en cours
 * (lundi 00:00 local → dimanche 23:59:59.999 local).
 */
export function computeSessionsThisWeek(sessions: { createdAt: string }[]): number {
  const weekStart = getStartOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return sessions.filter((session) => {
    const sessionDate = new Date(session.createdAt);
    return sessionDate >= weekStart && sessionDate < weekEnd;
  }).length;
}

// ── Utils ISO week ────────────────────────────────────────────────────────────

function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function isPreviousWeek(weekA: string, weekB: string): boolean {
  // weekA devrait être exactement 1 semaine avant weekB
  const dateA = isoWeekToDate(weekA);
  const dateB = isoWeekToDate(weekB);
  const diff = (dateB.getTime() - dateA.getTime()) / (7 * 24 * 60 * 60 * 1000);
  return Math.round(diff) === 1;
}

function isoWeekToDate(isoWeek: string): Date {
  const [year, week] = isoWeek.split('-W').map(Number);
  const d = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = d.getUTCDay();
  if (dayOfWeek <= 4) {
    d.setUTCDate(d.getUTCDate() - d.getUTCDay() + 1);
  } else {
    d.setUTCDate(d.getUTCDate() + 8 - d.getUTCDay());
  }
  return d;
}

function getStartOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  return start;
}
