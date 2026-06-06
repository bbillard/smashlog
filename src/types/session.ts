export interface Match {
  adversaire: string;
  partenaire?: string; // uniquement si mode double ou mixte
  resultat: "victoire" | "defaite";
  mode: "simple" | "double" | "mixte";
  sets: { scoreNous: number; scoreEux: number }[];
  commentaire?: string;
}

export type SessionType =
  | "match"
  | "entrainement"
  | "jeu_libre"
  | "renforcement"
  | "cardio"
  | "autre";

export interface Session {
  id: string;
  createdAt: string;
  title?: string;
  type: SessionType;
  rating: number;
  wentWell: string;
  wentWrong: string;
  nextIntention: string;
  freeNotes?: string;
  matches?: Match[];
  notificationScheduledAt?: string;
  notificationIds?: string[];
}

export interface NotificationSettings {
  fixedTimeEnabled: boolean;
  fixedHour: number;
  fixedMinute: number;
  nextSessionReminderEnabled: boolean;
  nextSessionAt: string | null;
  nextSessionLeadMinutes: number;
}
