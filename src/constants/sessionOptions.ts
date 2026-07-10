import { SessionType } from "@/src/types/session";

export const SESSION_TYPE_OPTIONS: Array<{ label: string; value: SessionType; accent: string }> = [
  { label: "Match", value: "match", accent: "#CEFF00" },
  { label: "Entraînement", value: "entrainement", accent: "#CEFF00" },
  { label: "Jeu libre", value: "jeu_libre", accent: "#CEFF00" },
  { label: "Renforcement", value: "renforcement", accent: "#FF4D6D" },
  { label: "Cardio", value: "cardio", accent: "#00E5FF" },
  { label: "Autre", value: "autre", accent: "#6b6b7a" },
];

export const SESSION_TYPE_LABELS: Record<SessionType, string> = Object.fromEntries(
  SESSION_TYPE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<SessionType, string>;
