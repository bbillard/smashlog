export interface Match {
  // Champs existants conservés (migration douce)
  adversaire: string;
  partenaire?: string;         // uniquement si mode double ou mixte
  // Champs Player (nouveaux)
  adversaireId?: string;       // référence Player.id — adversaire principal (simple) ou 1er (double/mixte)
  adversaireIds?: string[];    // références Player.id — tous les adversaires (double/mixte)
  partenaireId?: string;       // référence Player.id — partenaire (double/mixte)
  partenaireIds?: string[];    // conservé pour rétrocompatibilité
  // Reste des champs existants
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
  exerciseIds?: string[];
}

export interface NotificationSettings {
  fixedTimeEnabled: boolean;
  fixedHour: number;
  fixedMinute: number;
  nextSessionReminderEnabled: boolean;
  nextSessionAt: string | null;
  nextSessionLeadMinutes: number;
}
