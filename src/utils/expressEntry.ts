import {
  ExerciseSequence,
  FixedPostMultishuttle,
  SequenceDistribution,
  ShotSequence,
} from "@/src/types/index";
import {
  createEmptySequence,
  endingLabel,
  generateSequenceText,
  isSequenceValid,
  missingPlayers,
  normalizeSteps,
  parseShotSequence,
  sequenceSummary,
} from "@/src/utils/exerciseSequence";
import {
  FixedPostContinuousDraft,
  continuousWorkers,
  createEmptyFixedPostContinuous,
  createEmptyMultishuttle,
  finalizeFixedPostContinuous,
  fixedPostSummary,
  generateFixedPostContinuousText,
  generateMultishuttleText,
  isFixedPostContinuousValid,
  isMultishuttleValid,
  multishuttleFeeders,
  parseFixedPostSequence,
  shuttlesLabel,
} from "@/src/utils/fixedPost";

/**
 * Point d'entrée commun à tous les modes de la Saisie express (séquence de
 * coups, poste fixe en volant continu, multivolant) : brouillon de la modale,
 * validation, texte généré, badge résumé, relecture depuis le stockage.
 * Aucune dépendance UI. Les règles propres à chaque mode restent dans
 * exerciseSequence.ts (séquence) et fixedPost.ts (poste fixe).
 */

export type ExpressKind = ExerciseSequence["kind"];

/** Brouillon de la modale : même union que la donnée persistée, poste sans position admis. */
export type ExpressDraft = ShotSequence | FixedPostContinuousDraft | FixedPostMultishuttle;

/**
 * Brouillon vide pour une distribution et un type. La séquence de coups
 * n'existe qu'en volant continu ; le multivolant est toujours en poste fixe.
 */
export function createEmptyDraft(
  distribution: SequenceDistribution,
  kind: ExpressKind,
  playersCount: number,
): ExpressDraft {
  if (distribution === "multivolant") return createEmptyMultishuttle(playersCount);
  return kind === "poste_fixe" ? createEmptyFixedPostContinuous(playersCount) : createEmptySequence();
}

/**
 * Brouillon de départ à l'ouverture de la modale. En multivolant, les
 * distributeurs sont recalculés (« les autres joueurs ») : le nombre de
 * joueurs a pu changer dans le formulaire depuis la dernière saisie.
 */
export function draftFromSequence(sequence: ExerciseSequence | undefined, playersCount: number): ExpressDraft {
  if (!sequence) return createEmptySequence();
  if (sequence.kind === "poste_fixe" && sequence.distribution === "multivolant") {
    return { ...sequence, feeders: multishuttleFeeders(sequence.worker, playersCount) };
  }
  return sequence;
}

/** Des données ont-elles été saisies (confirmation avant de les effacer) ? */
export function hasExpressData(draft: ExpressDraft): boolean {
  if (draft.kind === "sequence") return draft.steps.length > 0;
  if (draft.distribution === "multivolant") return draft.strikes.length > 0;
  return draft.fixedPosts.some((p) => !!p.zone || p.targets.length > 0) || draft.fixedPosts.length > 1;
}

export function isExpressDraftValid(draft: ExpressDraft, playersCount: number): boolean {
  if (draft.kind === "sequence") return isSequenceValid(draft, playersCount);
  if (draft.distribution === "multivolant") return isMultishuttleValid(draft, playersCount);
  return isFixedPostContinuousValid(draft, playersCount);
}

/** Brouillon validé → donnée persistée (null si incomplet). */
export function finalizeExpressDraft(draft: ExpressDraft, playersCount: number): ExerciseSequence | null {
  if (!isExpressDraftValid(draft, playersCount)) return null;
  if (draft.kind === "sequence") return { ...draft, steps: normalizeSteps(draft.steps) };
  if (draft.distribution === "multivolant") return draft;
  return finalizeFixedPostContinuous(draft, playersCount);
}

/** Texte ajouté à la description (aperçu de la modale, pré-remplissage). */
export function generateExpressText(sequence: ExpressDraft, playersCount: number): string {
  if (sequence.kind === "sequence") return generateSequenceText(sequence);
  if (sequence.distribution === "multivolant") return generateMultishuttleText(sequence);
  return generateFixedPostContinuousText(sequence, playersCount);
}

/** Badge résumé du bloc du formulaire. */
export function expressSummary(sequence: ExerciseSequence): string {
  return sequence.kind === "sequence" ? sequenceSummary(sequence) : fixedPostSummary(sequence);
}

/** Une donnée de saisie express non vide (bloc « rempli », schéma affichable). */
export function hasDiagram(sequence: ExerciseSequence | undefined): sequence is ExerciseSequence {
  if (!sequence) return false;
  if (sequence.kind === "sequence") return sequence.steps.length > 0;
  if (sequence.distribution === "multivolant") return sequence.strikes.length > 0;
  return sequence.fixedPosts.length > 0;
}

/** Indicateur à côté du titre « Schéma » de la fiche : fin (volant continu) ou volants par passage. */
export function schemaIndicator(sequence: ExerciseSequence): string {
  if (sequence.kind === "poste_fixe" && sequence.distribution === "multivolant") {
    return shuttlesLabel(sequence.shuttlesPerRound);
  }
  return endingLabel(sequence);
}

/**
 * Conflit avec le nombre de joueurs du formulaire, à l'enregistrement :
 * joueur utilisé qui n'existe plus, ou poste fixe sans plus aucun joueur qui
 * travaille. Null si tout va bien.
 */
export function sequenceConflict(
  sequence: ExerciseSequence,
  playersCount: number,
): { title: string; body: string } | null {
  const playersText = `${playersCount} joueur${playersCount > 1 ? "s" : ""}`;
  const missing = missingPlayers(sequence, playersCount);
  if (missing.length > 0) {
    return {
      title: `La séquence utilise le joueur ${missing.join(", ")}`,
      body: `Il n'existe plus avec ${playersText}. Supprimer la séquence pour enregistrer l'exercice ?`,
    };
  }
  if (
    sequence.kind === "poste_fixe" &&
    sequence.distribution === "volant_continu" &&
    continuousWorkers(sequence.fixedPosts, playersCount).length === 0
  ) {
    return {
      title: "Plus aucun joueur ne travaille",
      body: `Avec ${playersText}, tous les joueurs sont en poste fixe. Supprimer la séquence pour enregistrer l'exercice ?`,
    };
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Relit une donnée de saisie express venue de l'extérieur (jsonb Supabase,
 * AsyncStorage, fichier de sauvegarde). Undefined si inutilisable : l'exercice
 * reste valide « sans séquence » plutôt que de planter. Seul
 * `schemaVersion: 1` est accepté.
 */
export function parseExerciseSequence(value: unknown): ExerciseSequence | undefined {
  if (!isRecord(value) || value.schemaVersion !== 1) return undefined;
  if (value.kind === "sequence") return parseShotSequence(value);
  if (value.kind === "poste_fixe") return parseFixedPostSequence(value);
  return undefined;
}
