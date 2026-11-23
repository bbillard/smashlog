import { SequencePlayer } from "@/src/types/index";

/**
 * Couleurs des joueurs d'une séquence de jeu (pastilles du constructeur, frise
 * de la fiche exercice, schéma terrain). A et B reprennent les accents de la
 * marque ; C et D sont volontairement distinctes des couleurs de types de
 * séance (src/constants/sessionColors.ts) pour ne pas suggérer de lien.
 */
export const SEQUENCE_PLAYER_COLORS: Record<SequencePlayer, string> = {
  A: "#CEFF00",
  B: "#00E5FF",
  C: "#B794FF",
  D: "#FF9F43",
};

/** Teinte de fond associée (cartes, puces sélectionnées). */
export const SEQUENCE_PLAYER_COLORS_BG: Record<SequencePlayer, string> = {
  A: "rgba(206, 255, 0, 0.10)",
  B: "rgba(0, 229, 255, 0.10)",
  C: "rgba(183, 148, 255, 0.12)",
  D: "rgba(255, 159, 67, 0.12)",
};

/** Couleur du texte posé sur une pastille joueur (toutes les teintes sont claires). */
export const SEQUENCE_PLAYER_ON_COLOR = "#0D0D0F";

/** Couleurs fixes du schéma terrain (identiques à l'écran et dans l'export PNG). */
export const COURT_DIAGRAM_COLORS = {
  background: "#0D0D0F",
  surface: "#0A1628",
  lines: "rgba(255,255,255,0.75)",
  net: "#F2F2F5",
} as const;

/**
 * Couleurs fixes de la vue plein écran du schéma et de son export PNG
 * (maquette écran 5 bis) : identiques quel que soit le thème de l'app, pour
 * que l'image partagée soit toujours la même. Gris ≥ 4.5:1 sur leur fond.
 */
export const SCHEMA_SCREEN_COLORS = {
  background: "#0D0D0F",
  card: "#16161A",
  cardBorder: "rgba(255,255,255,0.06)",
  title: "#F2F2F5",
  accent: "#CEFF00",
  accentBg: "rgba(206,255,0,0.08)",
  accentBorder: "rgba(206,255,0,0.4)",
  buttonBg: "#16161A",
  buttonBorder: "rgba(255,255,255,0.1)",
  legend: "#D0D0D8",
  listTitle: "#B4B4C0",
  muted: "#9A9AA8",
  logoFallback: "#9A9AA8",
  pageDot: "rgba(255,255,255,0.25)",
} as const;

/**
 * Teinte translucide d'une couleur joueur (#RRGGBB), pour surligner les
 * zones du poste fixe sur le schéma : zone fixe du relanceur plus marquée,
 * zones d'envoi plus légères.
 */
export function playerTint(player: SequencePlayer, alpha: number): string {
  const hex = SEQUENCE_PLAYER_COLORS[player].replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
