import { Session, SessionType } from "@/src/types/session";

/**
 * Formats a date as a stable "YYYY-MM-DD" key used to group sessions by day.
 */
export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Groups sessions by day key, optionally restricted to a [from, to) range.
 * Each day key maps to the ordered list of session types recorded that day
 * (chronological, duplicates preserved) — the shape the calendar UI (Stats
 * screen, home WeekView) expects in order to render one dot per session.
 */
export function groupSessionsByDay(
  sessions: Session[],
  range?: { from: Date; to: Date },
): Map<string, SessionType[]> {
  const byDay = new Map<string, SessionType[]>();

  sessions
    .map((session) => ({ date: new Date(session.createdAt), type: session.type }))
    .filter(({ date }) => !range || (date >= range.from && date < range.to))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .forEach(({ date, type }) => {
      const key = toDayKey(date);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(type);
    });

  return byDay;
}
