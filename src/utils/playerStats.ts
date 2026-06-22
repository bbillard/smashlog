import { Player } from "@/src/types/index";
import { Match, Session } from "@/src/types/session";

// ── Couleurs avatar (déterministes par nom) ───────────────────────────────────

export const AVATAR_COLORS = [
  "#CEFF00",
  "#00E5FF",
  "#FFD166",
  "#C084FC",
  "#00E5C8",
  "#FF8C00",
] as const;

export function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) & 0xfffff;
  }
  return Math.abs(h);
}

export function getAvatarColor(name: string): string {
  return AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
}

/** Retourne la couleur du texte et du fond de l'avatar (fond = 10% opacité). */
export function avatarColors(name: string): { text: string; bg: string } {
  const color = getAvatarColor(name);
  return { text: color, bg: color + "1A" }; // 1A ≈ 10 % hex
}

// ── Normalisation (insensible à la casse et aux accents) ─────────────────────

export function normalizeStr(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// ── Statistiques par joueur ───────────────────────────────────────────────────

export interface MatchRecord {
  sessionId: string;
  sessionDate: string;
  resultat: Match["resultat"];
  sets: Match["sets"];
  mode: Match["mode"];
  isAdversaire: boolean;
  isPartenaire: boolean;
}

export interface PlayerStats {
  total: number;
  wins: number;
  losses: number;
  winRate: number;            // 0–100
  lastMatchDate: string | null;
  firstMatchDate: string | null;
  isAdversaire: boolean;      // a été adversaire au moins une fois
  isPartenaire: boolean;      // a été partenaire au moins une fois
  records: MatchRecord[];     // triés du plus récent au plus ancien
}

/**
 * Détermine si un joueur est l'adversaire d'un match donné.
 * Priorité aux ids, fallback sur le nom normalisé (données legacy).
 */
function isMatchAdversaire(match: Match, player: Player): boolean {
  if (match.adversaireId === player.id) return true;
  if (match.adversaireIds?.includes(player.id)) return true;
  // Fallback legacy : le champ adversaire peut être "Nom1 / Nom2" en double
  if (!match.adversaireId && !match.adversaireIds?.length && match.adversaire) {
    const norm = normalizeStr(player.name);
    return match.adversaire
      .split("/")
      .some((part) => normalizeStr(part) === norm);
  }
  return false;
}

/**
 * Détermine si un joueur est le partenaire d'un match donné.
 */
function isMatchPartenaire(match: Match, player: Player): boolean {
  if (match.partenaireId === player.id) return true;
  if (!match.partenaireId && match.partenaire) {
    return normalizeStr(match.partenaire) === normalizeStr(player.name);
  }
  return false;
}

export function computePlayerStats(player: Player, sessions: Session[]): PlayerStats {
  const records: MatchRecord[] = [];

  for (const session of sessions) {
    for (const match of session.matches ?? []) {
      const isAdv = isMatchAdversaire(match, player);
      const isPart = !isAdv && isMatchPartenaire(match, player);

      if (isAdv || isPart) {
        records.push({
          sessionId: session.id,
          sessionDate: session.createdAt,
          resultat: match.resultat,
          sets: match.sets,
          mode: match.mode,
          isAdversaire: isAdv,
          isPartenaire: isPart,
        });
      }
    }
  }

  // Tri décroissant par date de séance
  records.sort(
    (a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime(),
  );

  const total = records.length;
  const wins = records.filter((r) => r.resultat === "victoire").length;
  const losses = total - wins;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const lastMatchDate = records[0]?.sessionDate ?? null;
  const firstMatchDate = records[records.length - 1]?.sessionDate ?? null;
  const isAdversaire = records.some((r) => r.isAdversaire);
  const isPartenaire = records.some((r) => r.isPartenaire);

  return {
    total,
    wins,
    losses,
    winRate,
    lastMatchDate,
    firstMatchDate,
    isAdversaire,
    isPartenaire,
    records,
  };
}

// ── Date relative ─────────────────────────────────────────────────────────────

export function relativeDate(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} j.`;
  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `Il y a ${weeks} sem.`;
  const months = Math.floor(diffDays / 30);
  if (diffDays < 365) return `Il y a ${months} mois`;
  const years = Math.floor(diffDays / 365);
  return `Il y a ${years} an${years > 1 ? "s" : ""}`;
}

// ── Couleur win rate ──────────────────────────────────────────────────────────

export function winRateColor(rate: number): string {
  if (rate > 50) return "#CEFF00";
  if (rate < 50) return "#FF4D6D";
  return "#6B6B7A";
}

// ── Format score ──────────────────────────────────────────────────────────────

export function formatMatchScore(sets: Match["sets"]): string {
  if (!sets || sets.length === 0) return "";
  return sets.map((s) => `${s.scoreNous}-${s.scoreEux}`).join(", ");
}
