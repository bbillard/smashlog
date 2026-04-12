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
