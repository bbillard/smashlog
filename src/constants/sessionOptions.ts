import { SessionType } from "@/src/types/session";

export const SESSION_TYPE_OPTIONS: Array<{ label: string; value: SessionType; accent: string }> = [
  { label: "Match", value: "match", accent: "#2F7D32" },
  { label: "Entraînement", value: "entrainement", accent: "#1B5E20" },
  { label: "Jeu libre", value: "jeu_libre", accent: "#1565C0" },
  { label: "Renforcement", value: "renforcement", accent: "#F9A825" },
  { label: "Cardio", value: "cardio", accent: "#EF6C00" },
  { label: "Autre", value: "autre", accent: "#546E7A" },
];

export const SESSION_TYPE_LABELS: Record<SessionType, string> = Object.fromEntries(
  SESSION_TYPE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<SessionType, string>;
