/**
 * Génère un identifiant en forme d'UUID v4, déterministe à partir d'une
 * chaîne de seed (hash FNV-1a 32 bits, dérivé sur 4 rounds pour obtenir
 * 128 bits de matière première).
 *
 * Utilisé pour les `Match` qui n'ont pas d'id local stable (cf.
 * src/types/session.ts) : deux appels avec la même seed renvoient toujours
 * le même id, ce qui rend les upserts vers Supabase idempotents (retry
 * après échec réseau pendant la migration, remigration sur un 2e appareil
 * sans créer de doublons).
 *
 * Pas cryptographique — juste assez de dispersion pour éviter les
 * collisions sur le volume de données d'un utilisateur (quelques milliers
 * d'entrées), ce qui est largement suffisant ici.
 */
function fnv1aRound(input: string, seed: number): number {
  let hash = (seed ^ 0x811c9dc5) >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function deterministicId(seed: string): string {
  const hex = [0, 1, 2, 3].map((round) => fnv1aRound(seed, round).toString(16).padStart(8, "0")).join("");

  const a = hex.slice(0, 8);
  const b = hex.slice(8, 12);
  const c = `4${hex.slice(13, 16)}`; // version 4
  const variantNibble = ((Number.parseInt(hex[16] ?? "8", 16) & 0x3) | 0x8).toString(16);
  const d = `${variantNibble}${hex.slice(17, 20)}`;
  const e = hex.slice(20, 32);

  return `${a}-${b}-${c}-${d}-${e}`;
}
