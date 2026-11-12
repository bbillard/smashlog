import { SHOT_DIRECTION_LABELS, SHOTS_BY_ID } from "@/src/data/shots";
import {
  CourtZone,
  ExerciseSequence,
  SequenceDistribution,
  SequenceEnding,
  SequencePlayer,
  SequenceStep,
  ShotDirection,
  ShotId,
} from "@/src/types/index";

/**
 * Règles pures de la « Saisie express » (ticket v1.4.1 « Formulaire exercice
 * — Saisie express (séquence de coups) »). Aucune dépendance UI : grisage des
 * coups, alternance des joueurs, position latérale du frappeur et libellés de
 * direction, génération / remplacement du texte de description, validation et
 * relecture d'une séquence venue du stockage.
 *
 * Repère : deux coups consécutifs sont toujours joués depuis des camps
 * opposés ; le coup n°1 part du camp du haut (portrait). Les couloirs
 * latéraux (« lanes ») sont absolus, vus du dessus du terrain en portrait :
 * left = x petit, right = x grand.
 */

export const SEQUENCE_PLAYERS: readonly SequencePlayer[] = ["A", "B", "C", "D"];

export const DEFAULT_SHUTTLES_PER_ROUND = 15;
export const MIN_SHUTTLES_PER_ROUND = 1;
export const MAX_SHUTTLES_PER_ROUND = 50;

/** Joueurs présents selon le nombre de joueurs de l'exercice. */
export function sequencePlayers(playersCount: number): SequencePlayer[] {
  const count = Math.max(0, Math.min(4, Math.floor(playersCount)));
  return SEQUENCE_PLAYERS.slice(0, count);
}

export function createEmptySequence(): ExerciseSequence {
  return { kind: "sequence", distribution: "volant_continu", ending: "boucle", steps: [] };
}

/** Change la distribution en gardant des champs cohérents (fin OU volants par passage). */
export function withDistribution(
  sequence: ExerciseSequence,
  distribution: SequenceDistribution,
): ExerciseSequence {
  const { ending, shuttlesPerRound, ...rest } = sequence;
  return distribution === "multivolant"
    ? { ...rest, distribution, shuttlesPerRound: shuttlesPerRound ?? DEFAULT_SHUTTLES_PER_ROUND }
    : { ...rest, distribution, ending: ending ?? "boucle" };
}

export function clampShuttles(n: number): number {
  return Math.max(MIN_SHUTTLES_PER_ROUND, Math.min(MAX_SHUTTLES_PER_ROUND, Math.round(n)));
}

// ─── Camps et alternance ─────────────────────────────────────────────────────

/** Camp d'un coup : 1 = haut (coups pairs : 1er, 3e…), 0 = bas. */
export function stepHalf(index: number): 0 | 1 {
  return index % 2 === 0 ? 1 : 0;
}

/**
 * Joueur pré-sélectionné pour le coup n°`index` (par défaut : en fin de
 * séquence) : joueur suivant, du côté opposé au dernier frappeur.
 * - Coup n°1 : A.
 * - Ensuite : parmi les joueurs déjà vus dans le camp de ce coup (camp de
 *   leur dernière frappe) et ceux qui n'ont pas encore joué, celui qui n'a pas
 *   frappé depuis le plus longtemps (les nouveaux d'abord, dans l'ordre A–D).
 *   À 2 joueurs : A, B, A, B… ; à 4 : A, B, C, D, A, B…
 */
export function nextPlayer(
  steps: readonly SequenceStep[],
  playersCount: number,
  index: number = steps.length,
): SequencePlayer {
  const players = sequencePlayers(playersCount);
  if (players.length === 0) return "A";
  const previous = steps.slice(0, index);
  if (previous.length === 0) return players[0];

  const lastIndex = (p: SequencePlayer) => {
    for (let i = previous.length - 1; i >= 0; i -= 1) if (previous[i].player === p) return i;
    return -1;
  };
  const half = stepHalf(index);
  const candidates = players.filter((p) => {
    const last = lastIndex(p);
    return last === -1 || stepHalf(last) === half;
  });
  if (candidates.length === 0) {
    const lastPlayer = previous[previous.length - 1].player;
    return players[(players.indexOf(lastPlayer) + 1) % players.length] ?? players[0];
  }
  return candidates.reduce((best, p) => (lastIndex(p) < lastIndex(best) ? p : best));
}

/** Joueurs présents dans chaque camp (légende du schéma, en-tête de la modale). */
export function playersByHalf(steps: readonly SequenceStep[]): { top: SequencePlayer[]; bottom: SequencePlayer[] } {
  const top = new Set<SequencePlayer>();
  const bottom = new Set<SequencePlayer>();
  steps.forEach((step, i) => (stepHalf(i) === 1 ? top : bottom).add(step.player));
  const order = (set: Set<SequencePlayer>) => SEQUENCE_PLAYERS.filter((p) => set.has(p));
  return { top: order(top), bottom: order(bottom) };
}

/** Joueurs utilisés par la séquence mais absents pour ce nombre de joueurs. */
export function missingPlayers(sequence: ExerciseSequence, playersCount: number): SequencePlayer[] {
  const present = sequencePlayers(playersCount);
  return SEQUENCE_PLAYERS.filter(
    (p) => !present.includes(p) && sequence.steps.some((s) => s.player === p),
  );
}

// ─── Grisage des coups ───────────────────────────────────────────────────────

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

/** Zones d'où le coup suivant `previousShot` doit partir (contexte du panneau). */
export function requiredStartZones(previousShot: ShotId | undefined): readonly CourtZone[] | null {
  if (!previousShot || previousShot === "au_choix") return null;
  return SHOTS_BY_ID[previousShot].arrivalZones;
}

// ─── Position latérale et directions ─────────────────────────────────────────

export type Lane = "left" | "center" | "right";
export type DirectionContext = "side" | "center";

const SIDE_DIRECTIONS: readonly ShotDirection[] = ["droit", "croise", "centre"];
const CENTER_DIRECTIONS: readonly ShotDirection[] = ["gauche", "centre", "droite"];

export function directionContext(lane: Lane): DirectionContext {
  return lane === "center" ? "center" : "side";
}

export function isDirectionAllowed(direction: ShotDirection, context: DirectionContext): boolean {
  return (context === "side" ? SIDE_DIRECTIONS : CENTER_DIRECTIONS).includes(direction);
}

/**
 * Couloir d'arrivée d'un coup joué depuis `lane` par un frappeur du camp
 * `half`. Droit = même côté, Croisé = côté opposé, Centre = axe central ;
 * depuis le centre, Gauche / Droite du point de vue du frappeur (le camp du
 * haut fait face au bas : sa gauche est à droite de l'écran). Sans direction :
 * Droit (Centre si le frappeur est au centre). Une direction hors contexte
 * (coup à corriger) est traitée comme l'absence de direction.
 */
export function arrivalLane(lane: Lane, half: 0 | 1, direction: ShotDirection | undefined): Lane {
  const context = directionContext(lane);
  const dir = direction && isDirectionAllowed(direction, context) ? direction : undefined;
  if (context === "side") {
    if (dir === "centre") return "center";
    if (dir === "croise") return lane === "left" ? "right" : "left";
    return lane;
  }
  if (dir === "gauche") return half === 1 ? "right" : "left";
  if (dir === "droite") return half === 1 ? "left" : "right";
  return "center";
}

/**
 * Couloir de départ du coup du serveur : sa zone de service droite (il fait
 * face au filet, donc à gauche de l'écran pour le camp du haut).
 */
export function serviceLane(half: 0 | 1): Lane {
  return half === 1 ? "left" : "right";
}

/**
 * Couloir du frappeur de chaque coup = couloir d'arrivée du coup précédent.
 * Coup n°1 : un service part d'un côté, un autre coup part du centre.
 * Après « Au choix » : centre.
 */
export function hitterLanes(steps: readonly SequenceStep[]): Lane[] {
  const lanes: Lane[] = [];
  steps.forEach((step, i) => {
    if (i === 0) {
      lanes.push(SHOTS_BY_ID[step.shot].isService ? serviceLane(stepHalf(0)) : "center");
      return;
    }
    const prev = steps[i - 1];
    lanes.push(
      prev.shot === "au_choix" ? "center" : arrivalLane(lanes[i - 1], stepHalf(i - 1), prev.direction),
    );
  });
  return lanes;
}

/**
 * Contexte de direction du coup n°`index` en cours de saisie : dépend du
 * coup précédent (et du coup lui-même pour le n°1 : service = côté).
 */
export function directionContextAt(
  steps: readonly SequenceStep[],
  index: number,
  shot: ShotId | undefined,
): DirectionContext {
  if (index === 0) {
    return shot && SHOTS_BY_ID[shot].isService ? "side" : "center";
  }
  const previous = steps.slice(0, index);
  const prev = previous[index - 1];
  if (!prev || prev.shot === "au_choix") return "center";
  const lanes = hitterLanes(previous);
  return directionContext(arrivalLane(lanes[index - 1], stepHalf(index - 1), prev.direction));
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Ids des coups à corriger : coup devenu impossible après le précédent,
 * direction qui a changé de contexte (côté ↔ centre), ou joueur absent.
 */
export function findInvalidStepIds(steps: readonly SequenceStep[], playersCount: number): string[] {
  const players = sequencePlayers(playersCount);
  const lanes = hitterLanes(steps);
  return steps
    .filter((step, i) => {
      if (!players.includes(step.player)) return true;
      if (!isShotAvailable(step.shot, steps[i - 1]?.shot, i)) return true;
      if (step.direction && !isDirectionAllowed(step.direction, directionContext(lanes[i]))) return true;
      return false;
    })
    .map((step) => step.id);
}

export function isSequenceValid(sequence: ExerciseSequence, playersCount: number): boolean {
  return sequence.steps.length > 0 && findInvalidStepIds(sequence.steps, playersCount).length === 0;
}

// ─── Libellés et texte généré ────────────────────────────────────────────────

export function shotLabel(shot: ShotId): string {
  return SHOTS_BY_ID[shot].label;
}

export function directionLabel(direction: ShotDirection): string {
  return SHOT_DIRECTION_LABELS[direction];
}

export function sequenceEnding(sequence: ExerciseSequence): SequenceEnding {
  return sequence.ending ?? "boucle";
}

export function shuttlesPerRound(sequence: ExerciseSequence): number {
  return sequence.shuttlesPerRound ?? DEFAULT_SHUTTLES_PER_ROUND;
}

/** Badge de distribution : « Volant continu » / « Multivolant · 15 volants ». */
export function distributionLabel(sequence: ExerciseSequence): string {
  return sequence.distribution === "multivolant"
    ? `Multivolant · ${shuttlesPerRound(sequence)} volants`
    : "Volant continu";
}

/** Badge de fin (volant continu uniquement) : « ↻ En boucle » / « Finir le point ». */
export function endingLabel(sequence: ExerciseSequence): string | null {
  if (sequence.distribution === "multivolant") return null;
  return sequenceEnding(sequence) === "finir_point" ? "Finir le point" : "↻ En boucle";
}

/** Indicateur de fin du schéma : « ↻ En boucle », « Finir le point » ou « Multivolant · N volants ». */
export function sequenceEndIndicator(sequence: ExerciseSequence): string {
  return endingLabel(sequence) ?? distributionLabel(sequence);
}

/** Badge résumé du bloc du formulaire : « Séquence · 5 coups ↻ ». */
export function sequenceSummary(sequence: ExerciseSequence): string {
  const n = sequence.steps.length;
  const base = `Séquence · ${n} coup${n > 1 ? "s" : ""}`;
  if (sequence.distribution === "multivolant") return `${base} · ${shuttlesPerRound(sequence)} volants`;
  return sequenceEnding(sequence) === "boucle" ? `${base} ↻` : base;
}

/**
 * Texte ajouté à la description, ex. :
 * « B service long → A dégagement droit → B amorti croisé ↻ »
 * Variantes : « … puis point libre » (Finir le point), préfixe
 * « Multivolant, 15 volants : » en multivolant.
 */
export function generateSequenceText(sequence: ExerciseSequence): string {
  if (sequence.steps.length === 0) return "";
  const chain = sequence.steps
    .map((step) => {
      const direction = step.direction ? ` ${directionLabel(step.direction).toLowerCase()}` : "";
      return `${step.player} ${shotLabel(step.shot).toLowerCase()}${direction}`;
    })
    .join(" → ");
  if (sequence.distribution === "multivolant") {
    return `Multivolant, ${shuttlesPerRound(sequence)} volants : ${chain}`;
  }
  return sequenceEnding(sequence) === "finir_point" ? `${chain} puis point libre` : `${chain} ↻`;
}

/**
 * Applique le texte généré à la description, sans jamais écraser la saisie
 * de l'utilisateur :
 * - texte précédent encore présent à l'identique → remplacé par le nouveau ;
 * - description vide → devient le texte généré ;
 * - sinon → ajouté à la fin après une ligne vide ; `staleCopyLeft` signale
 *   qu'une ancienne version retouchée est restée (toast côté UI).
 */
export function applyGeneratedText(
  description: string,
  previousText: string | undefined,
  nextText: string,
): { description: string; staleCopyLeft: boolean } {
  if (previousText && description.includes(previousText)) {
    return { description: description.replace(previousText, nextText), staleCopyLeft: false };
  }
  if (description.trim().length === 0) {
    return { description: nextText, staleCopyLeft: false };
  }
  return {
    description: `${description.replace(/\s+$/, "")}\n\n${nextText}`,
    staleCopyLeft: !!previousText,
  };
}

// ─── Relecture depuis le stockage ────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const DIRECTION_VALUES: readonly ShotDirection[] = ["droit", "croise", "centre", "gauche", "droite"];

/**
 * Relit une séquence venue de l'extérieur (jsonb Supabase, AsyncStorage,
 * fichier de sauvegarde). Renvoie undefined si la forme est inutilisable,
 * pour que l'exercice reste valide « sans séquence » plutôt que de planter.
 * Les coups devenus incohérents sont conservés : ils seront signalés dans la
 * saisie express (findInvalidStepIds).
 */
export function parseExerciseSequence(value: unknown): ExerciseSequence | undefined {
  if (!isRecord(value) || value.kind !== "sequence" || !Array.isArray(value.steps)) return undefined;

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

  const generatedText = typeof value.generatedText === "string" ? value.generatedText : undefined;
  const base = { kind: "sequence" as const, steps, ...(generatedText ? { generatedText } : {}) };

  if (value.distribution === "multivolant") {
    const n = typeof value.shuttlesPerRound === "number" ? value.shuttlesPerRound : DEFAULT_SHUTTLES_PER_ROUND;
    return { ...base, distribution: "multivolant", shuttlesPerRound: clampShuttles(n) };
  }
  return {
    ...base,
    distribution: "volant_continu",
    ending: value.ending === "finir_point" ? "finir_point" : "boucle",
  };
}
