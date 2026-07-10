import { SESSION_COLORS } from "@/src/constants/sessionColors";
import { SessionType } from "@/src/types/session";

export const SESSION_TYPE_OPTIONS: Array<{ label: string; value: SessionType; accent: string }> = [
  { label: "Match", value: "match", accent: SESSION_COLORS.match },
  { label: "Entraînement", value: "entrainement", accent: SESSION_COLORS.entrainement },
  { label: "Jeu libre", value: "jeu_libre", accent: SESSION_COLORS.jeu_libre },
  { label: "Renforcement", value: "renforcement", accent: SESSION_COLORS.renforcement },
  { label: "Cardio", value: "cardio", accent: SESSION_COLORS.cardio },
  { label: "Autre", value: "autre", accent: SESSION_COLORS.autre },
];

export const SESSION_TYPE_LABELS: Record<SessionType, string> = Object.fromEntries(
  SESSION_TYPE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<SessionType, string>;
