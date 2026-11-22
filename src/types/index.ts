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
   * Donnée structurée saisie via la « Saisie express » du formulaire
   * (ticket v1.4.1 « Formulaire exercice — Saisie express »).
   * Optionnelle : les exercices existants et les exercices par défaut n'en
   * ont pas. Persistée dans la colonne jsonb `exercises.sequence` (cf.
   * supabaseMappers.ts). Le schéma terrain en est dérivé à l'affichage,
   * jamais stocké.
   */
  sequence?: ExerciseSequence;
}

// ─── Saisie express : modèle `sequence` (schemaVersion 1) ────────────────────
//
// Modèle définitif, commun à tous les modes de la « Saisie express » (ticket
// v1.4.1 « Formulaire exercice — Saisie express (séquence de coups) », mise à
// jour du 22/11). Union discriminée sur `kind` puis `distribution` :
// - kind "sequence" : implémenté (toujours en volant continu) ;
// - kind "poste_fixe" : défini ici pour éviter une nouvelle migration,
//   implémenté par le ticket « Saisie express — mode Poste fixe ».
// Persisté tel quel dans la colonne jsonb `exercises.sequence`.

/** Joueurs, dans l'ordre (A, B, C, D selon le nombre de joueurs). */
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
 * - frappeur au centre : 'gauche' | 'centre' | 'droite' (de son point de vue,
 *   face au filet).
 * Le contexte (côté / centre) est déduit de l'enchaînement
 * (cf. hitterLanes dans src/utils/exerciseSequence.ts).
 */
export type ShotDirection = 'droit' | 'croise' | 'centre' | 'gauche' | 'droite';

/** Zone de profondeur d'un demi-terrain, du filet vers la ligne de fond. */
export type CourtZone = 'avant' | 'milieu' | 'fond';

/** Côté latéral, du point de vue du joueur concerné, face au filet. */
export type CourtSide = 'gauche' | 'centre' | 'droite';

/** Zone précise d'un demi-terrain (côté vu par le joueur qui l'occupe). */
export interface CourtSpot {
  depth: CourtZone;
  side: CourtSide;
}

export type SequenceDistribution = 'volant_continu' | 'multivolant';

/** Fin de séquence en volant continu. */
export type SequenceEnding = 'boucle' | 'finir_point';

interface SequenceBase {
  schemaVersion: 1;
  /**
   * Dernier texte généré et ajouté à la description : permet de le remplacer
   * à la modification de la séquence s'il est resté intact.
   */
  generatedText: string;
}

// Cas 1 — « Séquence de coups » (implémenté).

export interface SequenceStep {
  id: string;
  player: SequencePlayer;
  shot: ShotId;
  direction?: ShotDirection;
  /**
   * Côté d'où part le frappeur, de son point de vue face au filet.
   * OBLIGATOIRE sur le coup n°1 et sur le coup qui suit un « Au choix » ;
   * absent ailleurs (déduit de l'enchaînement).
   */
  fromSide?: CourtSide;
}

export interface ShotSequence extends SequenceBase {
  kind: 'sequence';
  distribution: 'volant_continu';
  ending: SequenceEnding;
  steps: SequenceStep[];
}

// Cas 2 — « Poste fixe » (défini ici, implémenté par le ticket dédié).

export interface FixedPost {
  player: SequencePlayer;
  zone: CourtSpot;
  targets: CourtSpot[];
}

export interface OrderedSend {
  player: SequencePlayer;
  target: CourtSpot;
}

export interface FixedPostContinuous extends SequenceBase {
  kind: 'poste_fixe';
  distribution: 'volant_continu';
  /** De 1 à playersCount − 1 postes. */
  fixedPosts: FixedPost[];
  order: 'aleatoire' | 'ordre';
  orderedSends?: OrderedSend[];
  ending: SequenceEnding;
}

export interface MultishuttleStrike {
  id: string;
  from: CourtSpot;
  shot: ShotId;
  direction?: ShotDirection;
}

export interface FixedPostMultishuttle extends SequenceBase {
  kind: 'poste_fixe';
  distribution: 'multivolant';
  /** Au moins un relanceur, sans position. */
  feeders: SequencePlayer[];
  worker: SequencePlayer;
  strikes: MultishuttleStrike[];
  /** Défaut 15, de 1 à 50. */
  shuttlesPerRound: number;
}

export type FixedPostSequence = FixedPostContinuous | FixedPostMultishuttle;

export type ExerciseSequence = ShotSequence | FixedPostSequence;
