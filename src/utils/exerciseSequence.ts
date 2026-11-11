import { SHOT_DIRECTION_LABELS, SHOTS_BY_ID } from "@/src/data/shots";
import {
  CourtZone,
  ExerciseSequence,
  SequenceDistribution,
  SequenceEnding,
  SequencePlayer,
  SequenceRole,
  SequenceStep,
  ShotDirection,
  ShotId,
} from "@/src/types/index";

/**
 * Règles pures de la séquence de jeu d'un exercice (ticket v1.4.1 « Wizard
 * exercice — étape Séquence de jeu »). Aucune dépendance UI : grisage des
 * coups, alternance des joueurs, aperçu texte, validation et relecture d'une
 * séquence venue du stockage (AsyncStorage, Supabase, import de sauvegarde).
 */

export const SEQUENCE_PLAYERS: readonly SequencePlayer[] = ["A", "B", "C", "D"];

/** Nombre max de répétitions saisissable pour « × N fois ». */
export const MAX_SEQUENCE_REPETITIONS = 99;

/** Joueurs présents selon le nombre de joueurs de l'exercice. */
export function sequencePlayers(playersCount: number): SequencePlayer[] {
  const count = Math.max(0, Math.min(4, Math.floor(playersCount)));
  return SEQUENCE_PLAYERS.slice(0, count);
}

/** Rôles par défaut : A travaille, les autres relancent. */
export function defaultRoles(playersCount: number): Partial<Record<SequencePlayer, SequenceRole>> {
  return Object.fromEntries(
    sequencePlayers(playersCount).map((p) => [p, p === "A" ? "travaille" : "relance"]),
  ) as Partial<Record<SequencePlayer, SequenceRole>>;
}

/**
 * Rôles restreints aux joueurs présents, complétés par les valeurs par défaut
 * (utile quand le nombre de joueurs change après coup dans le wizard).
 */
export function normalizeRoles(
  roles: Partial<Record<SequencePlayer, SequenceRole>>,
  playersCount: number,
): Partial<Record<SequencePlayer, SequenceRole>> {
  const defaults = defaultRoles(playersCount);
  return Object.fromEntries(
    sequencePlayers(playersCount).map((p) => [p, roles[p] ?? defaults[p]]),
  ) as Partial<Record<SequencePlayer, SequenceRole>>;
}

export function createEmptySequence(playersCount: number): ExerciseSequence {
  return {
    roles: defaultRoles(playersCount),
    distribution: "echange",
    steps: [],
    ending: "boucle",
  };
}

/**
 * Demi-terrain de chaque joueur : 0 = travailleurs, 1 = relanceurs.
 * Si tout le monde a le même rôle, on répartit A/C d'un côté et B/D de
 * l'autre pour garder deux camps (alternance et schéma restent lisibles).
 */
export function playerSides(
  roles: Partial<Record<SequencePlayer, SequenceRole>>,
  players: readonly SequencePlayer[],
): Record<SequencePlayer, 0 | 1> {
  const sides = { A: 0, B: 1, C: 0, D: 1 } as Record<SequencePlayer, 0 | 1>;
  const workers = players.filter((p) => roles[p] === "travaille");
  const feeders = players.filter((p) => roles[p] !== "travaille");
  if (workers.length === 0 || feeders.length === 0) return sides;
  for (const p of players) sides[p] = roles[p] === "travaille" ? 0 : 1;
  return sides;
}

/**
 * Joueur pré-sélectionné pour le coup ajouté à la position `index` (par
 * défaut : à la fin de la séquence).
 * - Coup n°1 : le premier relanceur (c'est lui qui met en jeu), sinon A.
 * - Ensuite : un joueur du camp opposé à celui qui vient de frapper ; s'il y
 *   en a plusieurs, celui qui n'a pas frappé depuis le plus longtemps
 *   (rotation), à égalité dans l'ordre A, B, C, D.
 * - Camp opposé vide (cas dégénéré) : joueur suivant dans l'ordre.
 */
export function nextPlayer(
  steps: readonly SequenceStep[],
  roles: Partial<Record<SequencePlayer, SequenceRole>>,
  playersCount: number,
  index: number = steps.length,
): SequencePlayer {
  const players = sequencePlayers(playersCount);
  if (players.length === 0) return "A";
  const previous = steps.slice(0, index);
  const last = previous[previous.length - 1];
  if (!last) {
    return players.find((p) => roles[p] === "relance") ?? players[0];
  }
  const sides = playerSides(roles, players);
  const opponents = players.filter((p) => sides[p] !== sides[last.player]);
  if (opponents.length === 0) {
    const i = players.indexOf(last.player);
    return players[(i + 1) % players.length];
  }
  const lastPlayedAt = (p: SequencePlayer) => {
    for (let i = previous.length - 1; i >= 0; i -= 1) {
      if (previous[i].player === p) return i;
    }
    return -1;
  };
  return opponents.reduce((best, p) => (lastPlayedAt(p) < lastPlayedAt(best) ? p : best));
}

/**
 * Un coup est-il jouable à la position `index`, après `previousShot` ?
 * - Coup n°1 : tous les coups.
 * - Services : uniquement en coup n°1.
 * - « Au choix » : jamais grisé ; après un « Au choix », tout sauf les services.
 * - Sinon : la zone de départ doit contenir au moins une des zones d'arrivée
 *   du coup précédent.
 */
export function isShotAvailable(
  shot: ShotId,
  previousShot: ShotId | undefined,
  index: number,
): boolean {
  const def = SHOTS_BY_ID[shot];
  if (index === 0 || previousShot === undefined) return true;
  if (def.isService) return false;
  if (shot === "au_choix" || previousShot === "au_choix") return true;
  const arrival = SHOTS_BY_ID[previousShot].arrivalZones;
  return def.startZones.some((zone) => arrival.includes(zone));
}

/** Zones d'où le coup n°`index` doit partir (pour le sous-titre du panneau). */
export function requiredStartZones(
  previousShot: ShotId | undefined,
): readonly CourtZone[] | null {
  if (!previousShot || previousShot === "au_choix") return null;
  return SHOTS_BY_ID[previousShot].arrivalZones;
}

/**
 * Ids des coups devenus impossibles (après modification/suppression d'un coup
 * précédent, ou joueur absent après un changement du nombre de joueurs).
 * L'étape ne peut pas être validée tant que cette liste n'est pas vide.
 */
export function findInvalidStepIds(
  steps: readonly SequenceStep[],
  playersCount: number,
): string[] {
  const players = sequencePlayers(playersCount);
  return steps
    .filter((step, i) => {
      if (!players.includes(step.player)) return true;
      return !isShotAvailable(step.shot, steps[i - 1]?.shot, i);
    })
    .map((step) => step.id);
}

export function isSequenceValid(sequence: ExerciseSequence, playersCount: number): boolean {
  if (sequence.steps.length === 0) return false;
  if (findInvalidStepIds(sequence.steps, playersCount).length > 0) return false;
  if (sequence.ending === "repetitions") {
    const n = sequence.repetitions ?? 0;
    return Number.isInteger(n) && n >= 1 && n <= MAX_SEQUENCE_REPETITIONS;
  }
  return true;
}

export function shotLabel(shot: ShotId): string {
  return SHOTS_BY_ID[shot].label;
}

export function directionLabel(direction: ShotDirection): string {
  return SHOT_DIRECTION_LABELS[direction];
}

/** Libellé court de la fin de séquence (badges, frise, schéma). */
export function endingLabel(sequence: Pick<ExerciseSequence, "ending" | "repetitions">): string {
  if (sequence.ending === "repetitions") return `× ${sequence.repetitions ?? 1} fois`;
  if (sequence.ending === "jeu_libre") return "Puis jeu libre";
  return "↻ En boucle";
}

/** Symbole compact de la fin de séquence (aperçu texte, en-tête du schéma). */
export function endingSymbol(sequence: Pick<ExerciseSequence, "ending" | "repetitions">): string {
  if (sequence.ending === "repetitions") return `× ${sequence.repetitions ?? 1}`;
  if (sequence.ending === "jeu_libre") return "→ jeu libre";
  return "↻";
}

/** « A travaille · B relance · C relance » */
export function rolesSummary(
  roles: Partial<Record<SequencePlayer, SequenceRole>>,
  playersCount: number,
): string {
  return sequencePlayers(playersCount)
    .map((p) => `${p} ${roles[p] === "travaille" ? "travaille" : "relance"}`)
    .join(" · ");
}

/**
 * Aperçu texte généré à la volée, ex. :
 * « B service long → A dégagement droit → B amorti croisé ↻ ».
 * Jamais stocké, ne modifie jamais la description libre de l'exercice.
 */
export function sequencePreview(sequence: ExerciseSequence): string {
  if (sequence.steps.length === 0) return "";
  const parts = sequence.steps.map((step) => {
    const shot = shotLabel(step.shot).toLowerCase();
    const direction = step.direction ? ` ${directionLabel(step.direction).toLowerCase()}` : "";
    return `${step.player} ${shot}${direction}`;
  });
  return `${parts.join(" → ")} ${endingSymbol(sequence)}`;
}

// ─── Relecture depuis le stockage ────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ROLE_VALUES: readonly SequenceRole[] = ["travaille", "relance"];
const DISTRIBUTION_VALUES: readonly SequenceDistribution[] = ["echange", "multivolant"];
const ENDING_VALUES: readonly SequenceEnding[] = ["boucle", "repetitions", "jeu_libre"];
const DIRECTION_VALUES: readonly ShotDirection[] = ["croise", "droit", "centre"];

/**
 * Relit une séquence venue de l'extérieur (jsonb Supabase, AsyncStorage,
 * fichier de sauvegarde). Renvoie undefined si la forme est inutilisable,
 * pour que l'exercice reste valide « sans séquence » plutôt que de planter.
 * Les coups dont l'enchaînement est devenu impossible sont conservés : ils
 * seront signalés dans le wizard (findInvalidStepIds).
 */
export function parseExerciseSequence(value: unknown): ExerciseSequence | undefined {
  if (!isRecord(value) || !Array.isArray(value.steps)) return undefined;

  const steps: SequenceStep[] = [];
  for (const raw of value.steps) {
    if (!isRecord(raw)) return undefined;
    const { id, player, shot, direction } = raw;
    if (typeof id !== "string") return undefined;
    if (!SEQUENCE_PLAYERS.includes(player as SequencePlayer)) return undefined;
    if (typeof shot !== "string" || !(shot in SHOTS_BY_ID)) return undefined;
    steps.push({
      id,
      player: player as SequencePlayer,
      shot: shot as ShotId,
      ...(DIRECTION_VALUES.includes(direction as ShotDirection)
        ? { direction: direction as ShotDirection }
        : {}),
    });
  }
  if (steps.length === 0) return undefined;

  const roles: Partial<Record<SequencePlayer, SequenceRole>> = {};
  if (isRecord(value.roles)) {
    for (const p of SEQUENCE_PLAYERS) {
      const role = value.roles[p];
      if (ROLE_VALUES.includes(role as SequenceRole)) roles[p] = role as SequenceRole;
    }
  }

  const ending = ENDING_VALUES.includes(value.ending as SequenceEnding)
    ? (value.ending as SequenceEnding)
    : "boucle";
  const repetitions =
    typeof value.repetitions === "number" && Number.isInteger(value.repetitions) && value.repetitions >= 1
      ? Math.min(value.repetitions, MAX_SEQUENCE_REPETITIONS)
      : undefined;

  return {
    roles,
    distribution: DISTRIBUTION_VALUES.includes(value.distribution as SequenceDistribution)
      ? (value.distribution as SequenceDistribution)
      : "echange",
    steps,
    ending: ending === "repetitions" && repetitions === undefined ? "boucle" : ending,
    ...(ending === "repetitions" && repetitions !== undefined ? { repetitions } : {}),
  };
}
