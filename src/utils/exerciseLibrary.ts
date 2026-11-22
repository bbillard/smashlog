import { Exercise } from "@/src/types/index";

/**
 * Règles pures du sélecteur « Ma bibliothèque » (ExercisesAccordion), partagées
 * par la création et l'édition de séance.
 *
 * - Aucun filtre ne masque d'exercice : un label contextuel (ex. « Renfo »
 *   pour une séance de renforcement) ne fait que remonter les exercices qui
 *   le portent en tête de liste. Avant, ce filtre excluait tous les autres
 *   exercices et la liste pouvait être vide sans explication.
 * - Recherche insensible à la casse, aux accents et aux espaces superflus
 *   (le clavier Samsung ajoute un espace après une saisie prédictive).
 */

/** Minuscules, sans accents, espaces de début/fin retirés et espaces internes réduits. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesExerciseSearch(exercise: Exercise, search: string): boolean {
  const query = normalizeSearchText(search);
  return query === "" || normalizeSearchText(exercise.name).includes(query);
}

export interface LibrarySection {
  /** null : section sans titre (liste unique). */
  title: string | null;
  exercises: Exercise[];
}

/**
 * Pourquoi la liste est vide :
 * - library_empty : la bibliothèque ne contient aucun exercice ;
 * - all_added : tous les exercices sont déjà dans la séance ;
 * - no_match : la recherche ne renvoie rien.
 */
export type LibraryEmptyReason = "library_empty" | "all_added" | "no_match";

export interface LibraryView {
  sections: LibrarySection[];
  emptyReason: LibraryEmptyReason | null;
}

export interface LibraryViewOptions {
  /** Exercices déjà liés à la séance, retirés de la liste. */
  excludeIds: readonly string[];
  search: string;
  /** Label mis en avant (ex. « Renfo ») : ses exercices passent en premier. */
  preferredLabel?: string;
}

export function buildLibraryView(allExercises: readonly Exercise[], options: LibraryViewOptions): LibraryView {
  if (allExercises.length === 0) return { sections: [], emptyReason: "library_empty" };

  const notAdded = allExercises.filter((e) => !options.excludeIds.includes(e.id));
  if (notAdded.length === 0) return { sections: [], emptyReason: "all_added" };

  const matching = notAdded.filter((e) => matchesExerciseSearch(e, options.search));
  if (matching.length === 0) return { sections: [], emptyReason: "no_match" };

  const label = options.preferredLabel;
  if (!label) return { sections: [{ title: null, exercises: matching }], emptyReason: null };

  const preferred = matching.filter((e) => e.labels.includes(label));
  const others = matching.filter((e) => !e.labels.includes(label));
  if (preferred.length === 0 || others.length === 0) {
    return { sections: [{ title: null, exercises: matching }], emptyReason: null };
  }
  return {
    sections: [
      { title: `Taggés « ${label} »`, exercises: preferred },
      { title: "Autres exercices", exercises: others },
    ],
    emptyReason: null,
  };
}
