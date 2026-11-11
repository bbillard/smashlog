import { Match } from "@/src/types/session";

/**
 * Source de vérité unique pour le résultat d'un match : libellés, couleurs,
 * déduction depuis le score et calcul du win rate.
 *
 * Règles de calcul (décision produit v1.4.1) :
 * - les taux (win rate) excluent les nuls du numérateur ET du dénominateur :
 *   victoires / (victoires + défaites) ;
 * - s'il n'y a aucun match décisif, le taux vaut null (affiché « — ») ;
 * - les compteurs de volume (matchs joués) incluent les nuls.
 */

export type MatchResult = Match["resultat"];

export const MATCH_RESULTS: readonly MatchResult[] = ["victoire", "defaite", "nul"] as const;

export const MATCH_RESULT_LABELS: Record<MatchResult, string> = {
  victoire: "Victoire",
  defaite: "Défaite",
  nul: "Nul",
};

/** Libellé court pour les compteurs compacts ("3V · 1D · 1N"). */
export const MATCH_RESULT_SHORT: Record<MatchResult, string> = {
  victoire: "V",
  defaite: "D",
  nul: "N",
};

export const MATCH_RESULT_COLORS: Record<MatchResult, string> = {
  victoire: "#CEFF00",
  defaite: "#FF4D6D",
  nul: "#9999AA",
};

export const MATCH_RESULT_BG: Record<MatchResult, string> = {
  victoire: "rgba(206,255,0,0.1)",
  defaite: "rgba(255,77,109,0.1)",
  nul: "rgba(153,153,170,0.12)",
};

export const MATCH_MODE_LABELS: Record<Match["mode"], string> = {
  simple: "Simple",
  double: "Double",
  mixte: "Mixte",
};

// ── Statistiques ──────────────────────────────────────────────────────────────

export interface ResultCounts {
  /** Matchs joués, nuls compris. */
  total: number;
  wins: number;
  losses: number;
  draws: number;
  /** Matchs décisifs (victoires + défaites) : dénominateur du win rate. */
  decisive: number;
  /** Win rate 0–100 arrondi, ou null s'il n'y a aucun match décisif. */
  winRate: number | null;
}

export function computeResultCounts(items: readonly { resultat: MatchResult }[]): ResultCounts {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const item of items) {
    if (item.resultat === "victoire") wins += 1;
    else if (item.resultat === "defaite") losses += 1;
    else draws += 1;
  }
  const decisive = wins + losses;
  return {
    total: items.length,
    wins,
    losses,
    draws,
    decisive,
    winRate: decisive > 0 ? Math.round((wins / decisive) * 100) : null,
  };
}

/** "75%" ou "—" quand le taux n'est pas calculable. */
export function formatWinRate(winRate: number | null): string {
  return winRate === null ? "—" : `${winRate}%`;
}

/** "3V · 1D · 1N" — le nul n'apparaît que s'il y en a au moins un. */
export function formatResultCounts(counts: ResultCounts): string {
  const parts = [`${counts.wins}V`, `${counts.losses}D`];
  if (counts.draws > 0) parts.push(`${counts.draws}N`);
  return parts.join(" · ");
}

// ── Couleur d'un win rate ─────────────────────────────────────────────────────

/**
 * Échelle unique de couleur d'un win rate, utilisée partout (stats, joueurs,
 * détail de séance, cartes de partage). Décision produit v1.4.1 :
 * - > 75 %      → élevé  (cyan)
 * - 40 → 75 %   → moyen  (lime)
 * - < 40 %      → faible (rouge)
 * - null (« — ») → aucun match comptabilisé (gris)
 * Ne pas coder ces seuils ailleurs : passer par winRateTier / winRateColor.
 */
export const WIN_RATE_HIGH_THRESHOLD = 75;
export const WIN_RATE_LOW_THRESHOLD = 40;

export type WinRateTier = "high" | "medium" | "low" | "none";

export function winRateTier(rate: number | null): WinRateTier {
  if (rate === null) return "none";
  if (rate > WIN_RATE_HIGH_THRESHOLD) return "high";
  if (rate < WIN_RATE_LOW_THRESHOLD) return "low";
  return "medium";
}

export interface WinRateAccent {
  /** Couleur pleine (chiffre). */
  main: string;
  /** Version atténuée (unité « % », sous-texte). */
  dim: string;
  /** Fond teinté (badge). */
  bg: string;
}

export const WIN_RATE_ACCENTS: Record<WinRateTier, WinRateAccent> = {
  high: { main: "#00E5FF", dim: "rgba(0,229,255,0.5)", bg: "rgba(0,229,255,0.1)" },
  medium: { main: "#CEFF00", dim: "rgba(206,255,0,0.5)", bg: "rgba(206,255,0,0.1)" },
  low: { main: "#FF4D6D", dim: "rgba(255,77,109,0.5)", bg: "rgba(255,77,109,0.1)" },
  none: { main: "#9999AA", dim: "rgba(153,153,170,0.5)", bg: "rgba(153,153,170,0.12)" },
};

export function winRateColor(rate: number | null): string {
  return WIN_RATE_ACCENTS[winRateTier(rate)].main;
}

// ── Déduction depuis le score ─────────────────────────────────────────────────

/**
 * Déduit le résultat à partir des sets complets saisis.
 * Retourne null si aucun set n'est saisi (pas de déduction possible).
 * Un set à égalité de points n'est compté pour aucun camp.
 */
export function deduceResultFromSets(sets: readonly Match["sets"][number][]): MatchResult | null {
  if (sets.length === 0) return null;
  let won = 0;
  let lost = 0;
  for (const set of sets) {
    if (set.scoreNous > set.scoreEux) won += 1;
    else if (set.scoreEux > set.scoreNous) lost += 1;
  }
  if (won > lost) return "victoire";
  if (lost > won) return "defaite";
  return "nul";
}

/** Valide une valeur venant du stockage / du cloud. */
export function isMatchResult(value: unknown): value is MatchResult {
  return value === "victoire" || value === "defaite" || value === "nul";
}
