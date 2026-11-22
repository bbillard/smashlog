import { SHOT_DIRECTION_LABELS, SHOTS_BY_ID } from "@/src/data/shots";
import {
  CourtSide,
  CourtZone,
  ExerciseSequence,
  SequenceEnding,
  SequencePlayer,
  SequenceStep,
  ShotDirection,
  ShotId,
  ShotSequence,
} from "@/src/types/index";

/**
 * Règles pures de la « Saisie express » (ticket v1.4.1 « Formulaire exercice
 * — Saisie express (séquence de coups) »). Aucune dépendance UI : grisage des
 * coups, alternance des joueurs, position latérale du frappeur et libellés de
 * direction, génération / remplacement du texte de description, validation et
 * relecture d'une séquence venue du stockage.
 *
 * Seul le cas `kind: "sequence"` (volant continu) est implémenté ; le cas
 * « Poste fixe » est typé (src/types/index.ts) et sera traité par son ticket.
 *
 * Repère : deux coups consécutifs sont toujours joués depuis des camps
 * opposés ; le coup n°1 part du camp du haut (portrait). Les couloirs
 * latéraux (« lanes ») sont absolus, vus du dessus du terrain en portrait :
 * left = x petit, right = x grand.
 */

export const SEQUENCE_PLAYERS: readonly SequencePlayer[] = ["A", "B", "C", "D"];

/** Joueurs présents selon le nombre de joueurs de l'exercice. */
export function sequencePlayers(playersCount: number): SequencePlayer[] {
  const count = Math.max(0, Math.min(4, Math.floor(playersCount)));
  return SEQUENCE_PLAYERS.slice(0, count);
}

export function createEmptySequence(): ShotSequence {
  return {
    schemaVersion: 1,
    kind: "sequence",
    distribution: "volant_continu",
    ending: "boucle",
    steps: [],
    generatedText: "",
  };
}

/** Séquence de coups, ou undefined pour un autre mode (Poste fixe) ou une absence. */
export function asShotSequence(sequence: ExerciseSequence | undefined): ShotSequence | undefined {
  return sequence?.kind === "sequence" ? sequence : undefined;
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

/** Joueurs utilisés par la donnée de saisie express, quel que soit le mode. */
export function usedPlayers(sequence: ExerciseSequence): SequencePlayer[] {
  const used = new Set<SequencePlayer>();
  if (sequence.kind === "sequence") {
    sequence.steps.forEach((s) => used.add(s.player));
  } else if (sequence.distribution === "volant_continu") {
    sequence.fixedPosts.forEach((p) => used.add(p.player));
    sequence.orderedSends?.forEach((s) => used.add(s.player));
  } else {
    sequence.feeders.forEach((p) => used.add(p));
    used.add(sequence.worker);
  }
  return SEQUENCE_PLAYERS.filter((p) => used.has(p));
}

/** Joueurs utilisés par la séquence mais absents pour ce nombre de joueurs. */
export function missingPlayers(sequence: ExerciseSequence, playersCount: number): SequencePlayer[] {
  const present = sequencePlayers(playersCount);
  return usedPlayers(sequence).filter((p) => !present.includes(p));
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
 * Couloir absolu (vue de dessus, portrait) d'un côté exprimé du point de vue
 * d'un joueur du camp `half`, face au filet : le camp du haut fait face au
 * bas, sa droite est donc à gauche de l'écran.
 */
export function sideToLane(side: CourtSide, half: 0 | 1): Lane {
  if (side === "centre") return "center";
  if (side === "droite") return half === 1 ? "left" : "right";
  return half === 1 ? "right" : "left";
}

/** Contexte de direction d'un frappeur qui part du côté `side`. */
export function sideContext(side: CourtSide): DirectionContext {
  return side === "centre" ? "center" : "side";
}

/**
 * Le coup n°`index` doit-il préciser son côté de départ (« Depuis ») ?
 * Oui pour le coup n°1 et pour le coup qui suit un « Au choix » : rien ne
 * permet alors de déduire la position latérale du frappeur.
 */
export function needsFromSide(steps: readonly SequenceStep[], index: number): boolean {
  return index === 0 || steps[index - 1]?.shot === "au_choix";
}

/** Valeur par défaut de « Depuis » : Droite pour un service, Centre sinon. */
export function defaultFromSide(shot: ShotId | undefined): CourtSide {
  return shot && SHOTS_BY_ID[shot].isService ? "droite" : "centre";
}

/**
 * Couloir du frappeur de chaque coup = couloir d'arrivée du coup précédent.
 * Coup n°1 et coup qui suit un « Au choix » : côté « Depuis » (fromSide) ;
 * s'il manque (coup à corriger), valeur par défaut.
 */
export function hitterLanes(steps: readonly SequenceStep[]): Lane[] {
  const lanes: Lane[] = [];
  steps.forEach((step, i) => {
    if (needsFromSide(steps, i)) {
      lanes.push(sideToLane(step.fromSide ?? defaultFromSide(step.shot), stepHalf(i)));
      return;
    }
    const prev = steps[i - 1];
    lanes.push(arrivalLane(lanes[i - 1], stepHalf(i - 1), prev.direction));
  });
  return lanes;
}

/**
 * Contexte de direction du coup n°`index` en cours de saisie : côté
 * « Depuis » choisi (`fromSide`) quand il est demandé, sinon point d'arrivée
 * latéral du coup précédent.
 */
export function directionContextAt(
  steps: readonly SequenceStep[],
  index: number,
  fromSide: CourtSide | undefined,
): DirectionContext {
  const previous = steps.slice(0, index);
  if (needsFromSide(previous, index)) return sideContext(fromSide ?? "centre");
  const lanes = hitterLanes(previous);
  const prev = previous[index - 1];
  return directionContext(arrivalLane(lanes[index - 1], stepHalf(index - 1), prev.direction));
}

/**
 * Retire `fromSide` des coups qui n'en ont pas besoin (il redevient déduit
 * de l'enchaînement, ex. après suppression d'un « Au choix »). Un coup qui en
 * aurait besoin et n'en a pas reste tel quel : il est signalé à corriger.
 */
export function normalizeSteps(steps: readonly SequenceStep[]): SequenceStep[] {
  return steps.map((step, i) => {
    if (needsFromSide(steps, i) || step.fromSide === undefined) return step;
    const { fromSide: _fromSide, ...rest } = step;
    return rest;
  });
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Ids des coups à corriger : coup devenu impossible après le précédent,
 * direction qui a changé de contexte (côté ↔ centre), côté « Depuis »
 * manquant (coup devenu n°1 ou suivant un « Au choix »), ou joueur absent.
 */
export function findInvalidStepIds(steps: readonly SequenceStep[], playersCount: number): string[] {
  const players = sequencePlayers(playersCount);
  const lanes = hitterLanes(steps);
  return steps
    .filter((step, i) => {
      if (!players.includes(step.player)) return true;
      if (needsFromSide(steps, i) && !step.fromSide) return true;
      if (!isShotAvailable(step.shot, steps[i - 1]?.shot, i)) return true;
      if (step.direction && !isDirectionAllowed(step.direction, directionContext(lanes[i]))) return true;
      return false;
    })
    .map((step) => step.id);
}

export function isSequenceValid(sequence: ShotSequence, playersCount: number): boolean {
  return sequence.steps.length > 0 && findInvalidStepIds(sequence.steps, playersCount).length === 0;
}

// ─── Libellés et texte généré ────────────────────────────────────────────────

export function shotLabel(shot: ShotId): string {
  return SHOTS_BY_ID[shot].label;
}

export function directionLabel(direction: ShotDirection): string {
  return SHOT_DIRECTION_LABELS[direction];
}

export function sequenceEnding(sequence: ShotSequence): SequenceEnding {
  return sequence.ending ?? "boucle";
}

/** Badge de distribution : « Volant continu » / « Multivolant ». */
export function distributionLabel(sequence: ExerciseSequence): string {
  return sequence.distribution === "multivolant" ? "Multivolant" : "Volant continu";
}

/** Badge et indicateur de fin : « ↻ En boucle » / « Finir le point ». */
export function endingLabel(sequence: ShotSequence): string {
  return sequenceEnding(sequence) === "finir_point" ? "Finir le point" : "↻ En boucle";
}

/** Badge résumé du bloc du formulaire : « Séquence · 5 coups ↻ ». */
export function sequenceSummary(sequence: ExerciseSequence): string {
  if (sequence.kind !== "sequence") return "Poste fixe";
  const n = sequence.steps.length;
  const base = `Séquence · ${n} coup${n > 1 ? "s" : ""}`;
  return sequenceEnding(sequence) === "boucle" ? `${base} ↻` : base;
}

const FROM_SIDE_PHRASES: Record<CourtSide, string> = {
  gauche: "la gauche",
  centre: "le centre",
  droite: "la droite",
};

/**
 * Texte ajouté à la description, ex. :
 * « Depuis la droite : B service long → A dégagement droit → B amorti croisé ↻ »
 * - le côté de départ du coup n°1 ouvre le texte ;
 * - après un « Au choix », le côté de départ du coup suivant est rappelé
 *   entre parenthèses (« A lob (depuis la gauche) ») ;
 * - « … puis point libre » pour Finir le point.
 */
export function generateSequenceText(sequence: ShotSequence): string {
  const { steps } = sequence;
  if (steps.length === 0) return "";
  const chain = steps
    .map((step, i) => {
      const direction = step.direction ? ` ${directionLabel(step.direction).toLowerCase()}` : "";
      const from = i > 0 && step.fromSide && needsFromSide(steps, i) ? ` (depuis ${FROM_SIDE_PHRASES[step.fromSide]})` : "";
      return `${step.player} ${shotLabel(step.shot).toLowerCase()}${direction}${from}`;
    })
    .join(" → ");
  const prefix = steps[0].fromSide ? `Depuis ${FROM_SIDE_PHRASES[steps[0].fromSide]} : ` : "";
  const suffix = sequenceEnding(sequence) === "finir_point" ? " puis point libre" : " ↻";
  return `${prefix}${chain}${suffix}`;
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
const SIDE_VALUES: readonly CourtSide[] = ["gauche", "centre", "droite"];

/**
 * Relit une donnée venue de l'extérieur (jsonb Supabase, AsyncStorage,
 * fichier de sauvegarde). Renvoie undefined si la forme est inutilisable,
 * pour que l'exercice reste valide « sans séquence » plutôt que de planter.
 *
 * - Seul `schemaVersion: 1` est accepté : les formats antérieurs (rôles,
 *   « echange », multivolant en mode séquence, sans côté de départ) sont
 *   ignorés — rien n'avait été mis en production.
 * - Seul le cas `kind: "sequence"` est relu pour l'instant : le cas
 *   « poste_fixe » sera ajouté par le ticket Poste fixe.
 * - Les coups devenus incohérents sont conservés : ils seront signalés dans
 *   la saisie express (findInvalidStepIds).
 */
export function parseExerciseSequence(value: unknown): ExerciseSequence | undefined {
  if (!isRecord(value) || value.schemaVersion !== 1) return undefined;
  if (value.kind !== "sequence" || value.distribution !== "volant_continu") return undefined;
  if (!Array.isArray(value.steps)) return undefined;

  const steps: SequenceStep[] = [];
  for (const raw of value.steps) {
    if (!isRecord(raw)) return undefined;
    const { id, player, shot, direction, fromSide } = raw;
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
      ...(SIDE_VALUES.includes(fromSide as CourtSide) ? { fromSide: fromSide as CourtSide } : {}),
    });
  }
  if (steps.length === 0) return undefined;

  return {
    schemaVersion: 1,
    kind: "sequence",
    distribution: "volant_continu",
    ending: value.ending === "finir_point" ? "finir_point" : "boucle",
    steps: normalizeSteps(steps),
    generatedText: typeof value.generatedText === "string" ? value.generatedText : "",
  };
}
