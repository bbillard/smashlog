import { SessionType } from "@/src/types/session";

/**
 * Source de vérité unique pour les couleurs associées à chaque type de séance.
 * Tout affichage lié au type de séance (badges, pastilles, cases de calendrier,
 * légendes, cartes de partage...) doit référencer ces constantes plutôt que
 * redéfinir des valeurs hexadécimales locales.
 */
export const SESSION_COLORS: Record<SessionType, string> = {
  match: "#FFD166",
  entrainement: "#CEFF00",
  jeu_libre: "#CEFF00",
  renforcement: "#FF4D6D",
  cardio: "#00E5FF",
  autre: "#6b6b7a",
};

// Couleur de fond teintée associée (pour les cartes, badges, cases calendrier)
export const SESSION_COLORS_BG: Record<SessionType, string> = {
  match: "rgba(255, 209, 102, 0.10)",
  entrainement: "rgba(206, 255, 0, 0.10)",
  jeu_libre: "rgba(206, 255, 0, 0.10)",
  renforcement: "rgba(255, 77, 109, 0.10)",
  cardio: "rgba(0, 229, 255, 0.10)",
  autre: "rgba(107, 107, 122, 0.10)",
};
