/**
 * Picks which type should color a calendar day cell when it holds several
 * items (e.g. several sessions or scheduled slots on the same day).
 *
 * Rule: the most frequent type wins. If there's a tie between types, the
 * first item in `items` (chronologically earliest) keeps its type.
 */
export function pickDominantType<T>(items: T[]): T | null {
  if (items.length === 0) return null;

  const counts = new Map<T, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  const maxCount = Math.max(...counts.values());
  const winners = [...counts.entries()].filter(([, count]) => count === maxCount).map(([type]) => type);

  return winners.length === 1 ? winners[0]! : items[0]!;
}
