import { Session } from "@/src/types/session";
import { addDays, getWeekStart } from "@/src/utils/week";

function hasSessionInWeek(sessions: Session[], weekStart: Date): boolean {
  const weekEndExclusive = addDays(weekStart, 7);
  return sessions.some((session) => {
    const createdAt = new Date(session.createdAt);
    return createdAt >= weekStart && createdAt < weekEndExclusive;
  });
}

export interface WeekStreak {
  /** Number of consecutive calendar weeks (Mon–Sun) containing at least one session. */
  weeks: number;
  /** Whether the current (possibly unfinished) week already has a session. */
  hasCurrentWeekSession: boolean;
}

/**
 * Computes the current weekly streak.
 *
 * Rules:
 * - A week counts if it contains at least one session.
 * - Weeks are calendar weeks, Monday to Sunday.
 * - The current week is included as soon as it has one session, even though
 *   it isn't finished yet.
 * - If the current week has no session yet, it isn't counted, but it also
 *   doesn't immediately break a streak built from fully completed past
 *   weeks — we keep walking backwards from last week instead.
 * - The streak stops at the first fully completed past week with no session.
 */
export function computeWeekStreak(sessions: Session[], now: Date = new Date()): WeekStreak {
  const currentWeekStart = getWeekStart(now);
  const hasCurrentWeekSession = hasSessionInWeek(sessions, currentWeekStart);

  let weeks = hasCurrentWeekSession ? 1 : 0;
  let cursor = addDays(currentWeekStart, -7);

  while (hasSessionInWeek(sessions, cursor)) {
    weeks += 1;
    cursor = addDays(cursor, -7);
  }

  return { weeks, hasCurrentWeekSession };
}
