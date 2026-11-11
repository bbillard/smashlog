export interface Player {
  id: string;         // uuid v4
  createdAt: string;  // ISO 8601, auto à la création
  name: string;       // nom tel que saisi
  notes?: string;     // champ libre optionnel
}

export interface Exercise {
  id: string;
  createdAt: string;
  name: string;
  description: string;
  playersCount: 1 | 2 | 3 | 4;
  labels: string[];
  durationMinutes?: number;
  level?: 'debutant' | 'intermediaire' | 'avance';
  orientation?: 'simple' | 'double' | 'mixte';
  attentionPoints?: string;
  variantEasier?: string;
  variantHarder?: string;
  source?: string;
  photos?: string[];
  /**
   * Séquence de jeu structurée (ticket v1.4.1 « Wizard exercice — étape
   * Séquence de jeu »). Optionnelle : les exercices existants et les exercices
   * par défaut n'en ont pas. Persistée dans la colonne jsonb `exercises.sequence`
   * (cf. supabaseMappers.ts). Le schéma terrain en est dérivé à l'affichage,
   * jamais stocké.
   */
  sequence?: ExerciseSequence;
}

// ─── Séquence de jeu ─────────────────────────────────────────────────────────

/** Joueurs d'une séquence, dans l'ordre (A, B, C, D selon le nombre de joueurs). */
export type SequencePlayer = 'A' | 'B' | 'C' | 'D';

export type SequenceRole = 'travaille' | 'relance';

export type SequenceDistribution = 'echange' | 'multivolant';

/** Identifiants du référentiel des coups (src/data/shots.ts). */
export type ShotId =
  | 'service_court'
  | 'service_long'
  | 'lob'
  | 'contre_amorti'
  | 'drive'
  | 'degagement'
  | 'amorti'
  | 'slice'
  | 'smash'
  | 'rush'
  | 'block'
  | 'au_choix';

export type ShotDirection = 'croise' | 'droit' | 'centre';

/** Zone de profondeur d'un demi-terrain, du filet vers la ligne de fond. */
export type CourtZone = 'avant' | 'milieu' | 'fond';

export interface SequenceStep {
  id: string;
  player: SequencePlayer;
  shot: ShotId;
  direction?: ShotDirection;
}

export type SequenceEnding = 'boucle' | 'repetitions' | 'jeu_libre';

export interface ExerciseSequence {
  roles: Partial<Record<SequencePlayer, SequenceRole>>;
  distribution: SequenceDistribution;
  steps: SequenceStep[];
  ending: SequenceEnding;
  /** Nombre de répétitions, uniquement quand ending === 'repetitions'. */
  repetitions?: number;
}
