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
