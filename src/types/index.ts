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
   * Séquence de coups structurée, saisie via la « Saisie express » du
   * formulaire (ticket v1.4.1 « Formulaire exercice — Saisie express »).
   * Optionnelle : les exercices existants et les exercices par défaut n'en
   * ont pas. Persistée dans la colonne jsonb `exercises.sequence` (cf.
   * supabaseMappers.ts). Le schéma terrain en est dérivé à l'affichage,
   * jamais stocké.
   */
  sequence?: ExerciseSequence;
}

// ─── Séquence de coups (Saisie express) ──────────────────────────────────────

/** Joueurs d'une séquence, dans l'ordre (A, B, C, D selon le nombre de joueurs). */
export type SequencePlayer = 'A' | 'B' | 'C' | 'D';

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

/**
 * Direction d'un coup, relative au frappeur :
 * - frappeur sur un côté : 'droit' (même côté), 'croise' (côté opposé), 'centre' ;
 * - frappeur au centre : 'gauche' | 'centre' | 'droite' (de son point de vue).
 * Le contexte (côté / centre) est déduit du coup précédent
 * (cf. hitterLane dans src/utils/exerciseSequence.ts).
 */
export type ShotDirection = 'droit' | 'croise' | 'centre' | 'gauche' | 'droite';

/** Zone de profondeur d'un demi-terrain, du filet vers la ligne de fond. */
export type CourtZone = 'avant' | 'milieu' | 'fond';

export interface SequenceStep {
  id: string;
  player: SequencePlayer;
  shot: ShotId;
  direction?: ShotDirection;
}

export type SequenceDistribution = 'volant_continu' | 'multivolant';

/** Fin de séquence en volant continu. */
export type SequenceEnding = 'boucle' | 'finir_point';

/**
 * Mode « Séquence de coups ». Le discriminant `kind` prépare l'arrivée du
 * mode « Poste fixe » (ticket dédié), qui aura sa propre forme.
 */
export interface ShotSequence {
  kind: 'sequence';
  distribution: SequenceDistribution;
  /** Volants par passage, uniquement en multivolant (défaut 15, de 1 à 50). */
  shuttlesPerRound?: number;
  /** Uniquement en volant continu (défaut « boucle »). */
  ending?: SequenceEnding;
  steps: SequenceStep[];
  /**
   * Dernier texte généré et ajouté à la description : permet de le remplacer
   * à la modification de la séquence s'il est resté intact.
   */
  generatedText?: string;
}

export type ExerciseSequence = ShotSequence;
