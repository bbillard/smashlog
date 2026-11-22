import { SequencePlayer, ShotSequence } from "@/src/types/index";
import {
  directionLabel,
  distributionLabel,
  endingLabel,
  sequenceEnding,
  shotLabel,
} from "@/src/utils/exerciseSequence";

/**
 * Règles pures de mise en page du schéma plein écran et de son export PNG
 * (ticket « Schéma exercice — UI plein écran (terrain + séquence), logo et
 * export PNG dédié »). Aucune dépendance UI : tout est recalculé depuis
 * exercise.sequence, rien n'est stocké.
 */

// ─── En-tête ─────────────────────────────────────────────────────────────────

/**
 * Ligne de contexte de l'en-tête, ex. « Volant continu · ↻ En boucle ».
 * Affichée en petites capitales (textTransform) : la casse est conservée ici
 * pour la lecture d'écran.
 */
export function diagramContextLine(sequence: ShotSequence): string {
  return `${distributionLabel(sequence)} · ${endingLabel(sequence)}`;
}

/** Titre de la liste : « Séquence · 5 coups ». */
export function sequenceListTitle(sequence: ShotSequence): string {
  const n = sequence.steps.length;
  return `Séquence · ${n} coup${n > 1 ? "s" : ""}`;
}

// ─── Taille du terrain ───────────────────────────────────────────────────────

export interface FitCourtInput {
  /** Largeur disponible pour le terrain (px). */
  availableWidth: number;
  /** Hauteur disponible pour le terrain, légendes déjà déduites (px). */
  availableHeight: number;
  /** Rapport hauteur / largeur du schéma (cf. courtDiagramAspect). */
  aspect: number;
}

/**
 * Largeur du terrain qui tient dans la boîte en gardant ses proportions :
 * limitée par la hauteur sur un écran portrait, jamais étirée en largeur.
 * Arrondie au pixel inférieur, jamais négative.
 */
export function fitCourtWidth({ availableWidth, availableHeight, aspect }: FitCourtInput): number {
  if (!(aspect > 0) || availableWidth <= 0 || availableHeight <= 0) return 0;
  return Math.max(0, Math.floor(Math.min(availableWidth, availableHeight / aspect)));
}

// ─── Liste des coups ─────────────────────────────────────────────────────────

export type SequenceListItem =
  | {
      kind: "shot";
      key: string;
      /** Numéro affiché dans la pastille (1-based). */
      number: number;
      player: SequencePlayer;
      /** Libellé du coup (en gras), ex. « Service long ». */
      shot: string;
      /** Direction en minuscules (en gris), ex. « croisé » ; absente sans direction. */
      direction?: string;
    }
  | {
      kind: "ending";
      key: "ending";
      mode: "boucle" | "finir_point";
      label: string;
    };

/**
 * Éléments de la liste : un par coup (sans nom de joueur, la couleur de la
 * pastille suffit), puis la ligne de fin : « Retour au coup 1 » (En boucle)
 * ou « Puis point libre » (Finir le point). Pas de ligne de fin en
 * multivolant (Poste fixe, hors de ce type : l'information est dans l'en-tête).
 */
export function sequenceListItems(sequence: ShotSequence): SequenceListItem[] {
  const items: SequenceListItem[] = sequence.steps.map((step, i) => ({
    kind: "shot",
    key: step.id,
    number: i + 1,
    player: step.player,
    shot: shotLabel(step.shot),
    direction: step.direction ? directionLabel(step.direction).toLowerCase() : undefined,
  }));
  // Le mode séquence est toujours en volant continu : le cas multivolant (pas
  // de ligne de fin) relève du Poste fixe et de son propre ticket.
  if (sequence.steps.length === 0) return items;
  const mode = sequenceEnding(sequence);
  items.push({
    kind: "ending",
    key: "ending",
    mode,
    label: mode === "boucle" ? "Retour au coup 1" : "Puis point libre",
  });
  return items;
}

/** Nombre de lignes de la grille à l'écran. */
export const LIST_ROWS = 3;
/** Nombre de colonnes visibles d'un coup d'œil à l'écran. */
export const LIST_VISIBLE_COLUMNS = 2;
/** Au-delà, l'écran défile et le PNG allonge ses colonnes. */
export const LIST_MAX_STATIC_ITEMS = LIST_ROWS * LIST_VISIBLE_COLUMNS;

/**
 * Répartition de la liste en colonnes ordonnées.
 * - « screen » : colonnes de 3, remplies colonne par colonne (1-2-3, 4-5-6…),
 *   la ligne de fin en dernier élément de la grille.
 * - « export » : jusqu'à 6 éléments, identique à l'écran ; au-delà, toujours
 *   2 colonnes : ceil(N/2) coups à gauche, les suivants à droite, puis la
 *   ligne de fin en bas de la colonne de droite.
 */
export function listColumns<T extends { kind: string }>(items: readonly T[], mode: "screen" | "export"): T[][] {
  if (items.length === 0) return [];
  if (mode === "screen" || items.length <= LIST_MAX_STATIC_ITEMS) {
    const columns: T[][] = [];
    for (let i = 0; i < items.length; i += LIST_ROWS) columns.push(items.slice(i, i + LIST_ROWS));
    return columns;
  }
  const shots = items.filter((item) => item.kind !== "ending");
  const ending = items.filter((item) => item.kind === "ending");
  const leftCount = Math.ceil(shots.length / 2);
  return [shots.slice(0, leftCount), [...shots.slice(leftCount), ...ending]];
}

/**
 * Nombre de positions d'accroche (points de pagination) de la liste à
 * l'écran : une par colonne qu'on peut amener en tête, 1 si tout tient.
 */
export function listPageCount(columnCount: number, visibleColumns: number = LIST_VISIBLE_COLUMNS): number {
  return Math.max(1, columnCount - visibleColumns + 1);
}

/** Position d'accroche courante d'après le défilement horizontal. */
export function listPageIndex(offsetX: number, snapInterval: number, pageCount: number): number {
  if (!(snapInterval > 0) || pageCount <= 1) return 0;
  return Math.min(pageCount - 1, Math.max(0, Math.round(offsetX / snapInterval)));
}

// ─── Export PNG ──────────────────────────────────────────────────────────────

/** Largeur du PNG exporté, en pixels. */
export const EXPORT_WIDTH_PX = 1080;

/**
 * Slug d'un nom d'exercice pour un nom de fichier : sans accents, minuscules,
 * tirets entre les mots, 60 caractères au plus. « exercice » si le nom est
 * vide ou sans caractère exploitable.
 */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "exercice";
}

/** Nom du PNG exporté : smashlog-schema-[nom-de-l-exercice-en-slug].png. */
export function exportFileName(exerciseName: string): string {
  return `smashlog-schema-${slugify(exerciseName)}.png`;
}

/**
 * Taille de capture en pixels : 1080 px de large, hauteur proportionnelle à
 * la vue d'export mesurée (en points).
 */
export function exportCaptureSize(
  layout: { width: number; height: number },
  targetWidth: number = EXPORT_WIDTH_PX,
): { width: number; height: number } {
  if (!(layout.width > 0) || !(layout.height > 0)) return { width: targetWidth, height: targetWidth };
  return { width: targetWidth, height: Math.round((targetWidth * layout.height) / layout.width) };
}
