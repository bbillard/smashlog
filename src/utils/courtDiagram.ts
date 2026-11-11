import { SHOTS_BY_ID } from "@/src/data/shots";
import {
  CourtZone,
  ExerciseSequence,
  SequencePlayer,
  SequenceStep,
  ShotDirection,
} from "@/src/types/index";
import { playerSides, sequencePlayers } from "@/src/utils/exerciseSequence";

/**
 * Calcul pur du schéma terrain d'une séquence de jeu (ticket v1.4.1 « Fiche
 * exercice — schéma terrain généré depuis la séquence + export PNG »).
 *
 * Rien n'est stocké : le schéma est recalculé à chaque affichage à partir de
 * exercise.sequence. Toutes les coordonnées sont en MÈTRES, terrain en
 * PORTRAIT : x ∈ [0 ; 6,10] (largeur), y ∈ [0 ; 13,40] (longueur), filet en
 * y = 6,70. Demi-terrain du haut = relanceurs, du bas = travailleurs.
 * La rotation en paysage (fiche) se fait au rendu via toLandscape().
 */

// ─── Dimensions réglementaires ───────────────────────────────────────────────

export const COURT = {
  length: 13.4,
  width: 6.1,
  halfLength: 6.7,
  /** Lignes de côté de simple, à 0,46 m des lignes de côté de double. */
  singlesInset: 0.46,
  /** Ligne de service court, à 1,98 m du filet. */
  shortServiceFromNet: 1.98,
  /** Ligne de service long de double, à 0,76 m de la ligne de fond. */
  doublesLongServiceFromBack: 0.76,
} as const;

export interface DiagramPoint {
  x: number;
  y: number;
}

export interface DiagramSegment {
  from: DiagramPoint;
  to: DiagramPoint;
}

/** 0 = demi-terrain du bas (travailleurs), 1 = demi-terrain du haut (relanceurs). */
type Half = 0 | 1;

/**
 * Lignes du terrain de badminton (pas de tracé de tennis) : périmètre double,
 * lignes de côté de simple, lignes de service court, lignes de service long
 * de double, ligne médiane uniquement entre service court et fond.
 */
export function courtLines(): DiagramSegment[] {
  const { length: L, width: W, halfLength: N, singlesInset: s } = COURT;
  const shortTop = N - COURT.shortServiceFromNet;
  const shortBottom = N + COURT.shortServiceFromNet;
  const longTop = COURT.doublesLongServiceFromBack;
  const longBottom = L - COURT.doublesLongServiceFromBack;
  const cx = W / 2;
  const h = (y: number): DiagramSegment => ({ from: { x: 0, y }, to: { x: W, y } });
  const v = (x: number, y1: number = 0, y2: number = L): DiagramSegment => ({ from: { x, y: y1 }, to: { x, y: y2 } });
  return [
    h(0),
    h(L),
    v(0),
    v(W),
    v(s),
    v(W - s),
    h(shortTop),
    h(shortBottom),
    h(longTop),
    h(longBottom),
    v(cx, 0, shortTop),
    v(cx, shortBottom, L),
  ];
}

/** Filet (légèrement débordant) et poteaux sur les lignes de côté de double. */
export function courtNet(): { line: DiagramSegment; posts: DiagramPoint[] } {
  const { width: W, halfLength: N } = COURT;
  return {
    line: { from: { x: -0.15, y: N }, to: { x: W + 0.15, y: N } },
    posts: [
      { x: 0, y: N },
      { x: W, y: N },
    ],
  };
}

// ─── Positions ───────────────────────────────────────────────────────────────

/** Distance au filet du point d'impact selon la zone. */
const ZONE_DEPTH: Record<CourtZone, number> = {
  avant: 1.3,
  milieu: 3.5,
  fond: 5.75,
};
/** Le Slice arrive entre l'avant et le milieu, plus long qu'un amorti. */
const SLICE_DEPTH = 2.3;
/** Les services partent juste derrière la ligne de service court. */
const SERVICE_DEPTH = COURT.shortServiceFromNet + 0.35;

const CENTER_X = COURT.width / 2;
const LANE_OFFSET = 1.65;
const LEFT_X = CENTER_X - LANE_OFFSET;
const RIGHT_X = CENTER_X + LANE_OFFSET;
/** Le serveur se place au milieu de sa zone de service (côté droit). */
const SERVICE_LANE_OFFSET = 1.3;

function pointAt(half: Half, depth: number, x: number): DiagramPoint {
  return { x, y: half === 1 ? COURT.halfLength - depth : COURT.halfLength + depth };
}

function halfOf(point: DiagramPoint): Half {
  return point.y < COURT.halfLength ? 1 : 0;
}

type Lateral = "left" | "center" | "right";

function lateralOf(x: number): Lateral {
  if (x < CENTER_X - 0.3) return "left";
  if (x > CENTER_X + 0.3) return "right";
  return "center";
}

/**
 * Position latérale d'arrivée selon la direction, relativement au frappeur :
 * Droit = même côté, Croisé = côté opposé, Centre = axe central.
 * Sans direction : Droit. Frappeur au centre : Droit reste au centre, Croisé
 * part alternativement à droite / à gauche (selon le numéro du coup) pour
 * éviter que les flèches se superposent.
 */
export function arrivalX(hitterX: number, direction: ShotDirection | undefined, index: number): number {
  const dir = direction ?? "droit";
  if (dir === "centre") return CENTER_X;
  const side = lateralOf(hitterX);
  if (side === "center") {
    if (dir === "droit") return CENTER_X;
    return index % 2 === 0 ? RIGHT_X : LEFT_X;
  }
  const same = side === "left" ? LEFT_X : RIGHT_X;
  const opposite = side === "left" ? RIGHT_X : LEFT_X;
  return dir === "droit" ? same : opposite;
}

/** Zone de départ « naturelle » d'un coup sans coup précédent exploitable. */
function preferredStartZone(step: SequenceStep): CourtZone {
  const zones = SHOTS_BY_ID[step.shot].startZones;
  if (zones.length === 3) return "milieu";
  return zones[0];
}

/**
 * Profondeur d'arrivée d'un coup. Plusieurs zones d'arrivée possibles (Block) :
 * si le coup suivant ne peut partir que d'une seule de ces zones, on la
 * retient ; sinon on se place à la limite entre les zones.
 */
export function arrivalDepth(step: SequenceStep, next: SequenceStep | undefined): number {
  if (step.shot === "slice") return SLICE_DEPTH;
  const zones = SHOTS_BY_ID[step.shot].arrivalZones;
  if (zones.length === 1) return ZONE_DEPTH[zones[0]];
  if (next && next.shot !== "au_choix") {
    const starts = SHOTS_BY_ID[next.shot].startZones;
    const common = zones.filter((z) => starts.includes(z));
    if (common.length === 1) return ZONE_DEPTH[common[0]];
  }
  const depths = zones.map((z) => ZONE_DEPTH[z]);
  return (Math.min(...depths) + Math.max(...depths)) / 2;
}

export interface DiagramShot {
  /** 0-based ; la pastille affiche index + 1. */
  index: number;
  stepId: string;
  player: SequencePlayer;
  /** Point de frappe (emplacement de la pastille numérotée). */
  from: DiagramPoint;
  /** Point d'arrivée (indicatif pour un coup « Au choix »). */
  to: DiagramPoint;
  /** Coup « Au choix » : flèche en pointillés, sans point d'arrivée précis. */
  approximate: boolean;
}

/**
 * Séquence → liste de flèches. Le point d'arrivée d'un coup devient le point
 * de frappe du suivant ; après un « Au choix », le coup suivant part d'une
 * position par défaut au centre de la zone du joueur.
 */
export function computeDiagramShots(
  sequence: ExerciseSequence,
  playersCount: number,
): DiagramShot[] {
  const players = sequencePlayers(playersCount);
  const sides = playerSides(sequence.roles, players.length > 0 ? players : ["A", "B"]);
  // playerSides : 0 = travailleurs (bas), 1 = relanceurs (haut).
  const halfOfPlayer = (p: SequencePlayer): Half => sides[p];

  const shots: DiagramShot[] = [];
  let previous: DiagramShot | undefined;

  sequence.steps.forEach((step, index) => {
    const def = SHOTS_BY_ID[step.shot];
    const next = sequence.steps[index + 1];

    let from: DiagramPoint;
    if (previous && !previous.approximate) {
      from = previous.to;
    } else {
      const half: Half = previous ? (halfOf(previous.from) === 1 ? 0 : 1) : halfOfPlayer(step.player);
      if (!previous && def.isService) {
        // Côté droit du serveur : il fait face au filet, donc sa droite est à
        // gauche de l'écran pour le demi-terrain du haut.
        const x = half === 1 ? CENTER_X - SERVICE_LANE_OFFSET : CENTER_X + SERVICE_LANE_OFFSET;
        from = pointAt(half, SERVICE_DEPTH, x);
      } else {
        from = pointAt(half, ZONE_DEPTH[preferredStartZone(step)], CENTER_X);
      }
    }

    const targetHalf: Half = halfOf(from) === 1 ? 0 : 1;
    const approximate = step.shot === "au_choix";
    const to = approximate
      ? pointAt(targetHalf, ZONE_DEPTH.milieu, CENTER_X)
      : pointAt(targetHalf, arrivalDepth(step, next), arrivalX(from.x, step.direction, index));

    const shot: DiagramShot = { index, stepId: step.id, player: step.player, from, to, approximate };
    shots.push(shot);
    previous = shot;
  });

  return shots;
}

// ─── Géométrie de rendu ──────────────────────────────────────────────────────

/** Rotation portrait → paysage (demi-terrain du haut à gauche). */
export function toLandscape(point: DiagramPoint): DiagramPoint {
  return { x: point.y, y: COURT.width - point.x };
}

export interface ArrowGeometry {
  /** Courbe quadratique SVG « M … Q … ». */
  path: string;
  /** Triangle de la pointe (vide pour une flèche sans pointe). */
  head: DiagramPoint[];
}

export interface ArrowOptions {
  /** Courbure relative à la longueur (signe = côté de la courbe). */
  curvature: number;
  /** Retrait au départ (rayon de la pastille du frappeur). */
  trimStart: number;
  /** Retrait à l'arrivée, pour que la pointe ne soit pas masquée par la pastille suivante. */
  trimEnd: number;
  headLength: number;
  headWidth: number;
  withHead: boolean;
}

const fmt = (n: number) => (Math.round(n * 1000) / 1000).toString();

/**
 * Flèche légèrement courbée de `from` vers `to`, dans le repère du rendu
 * (mètres paysage ou portrait). La pointe s'arrête avant le point d'arrivée
 * (trimEnd) pour rester visible à côté de la pastille du coup suivant.
 */
export function arrowGeometry(from: DiagramPoint, to: DiagramPoint, options: ArrowOptions): ArrowGeometry {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return { path: "", head: [] };
  const ux = dx / length;
  const uy = dy / length;
  // Normale à gauche du segment.
  const nx = -uy;
  const ny = ux;

  const start = { x: from.x + ux * options.trimStart, y: from.y + uy * options.trimStart };
  const tip = { x: to.x - ux * options.trimEnd, y: to.y - uy * options.trimEnd };
  const offset = options.curvature * length;
  const control = {
    x: (start.x + tip.x) / 2 + nx * offset,
    y: (start.y + tip.y) / 2 + ny * offset,
  };

  // Direction de la tangente à l'arrivée (contrôle → pointe).
  const tx = tip.x - control.x;
  const ty = tip.y - control.y;
  const tl = Math.hypot(tx, ty) || 1;
  const hx = tx / tl;
  const hy = ty / tl;
  const base = { x: tip.x - hx * options.headLength, y: tip.y - hy * options.headLength };
  // La ligne s'arrête à la base de la pointe pour ne pas dépasser du triangle.
  const lineEnd = options.withHead ? base : tip;

  const path = `M${fmt(start.x)} ${fmt(start.y)} Q${fmt(control.x)} ${fmt(control.y)} ${fmt(lineEnd.x)} ${fmt(lineEnd.y)}`;
  const head = options.withHead
    ? [
        tip,
        { x: base.x - hy * (options.headWidth / 2), y: base.y + hx * (options.headWidth / 2) },
        { x: base.x + hy * (options.headWidth / 2), y: base.y - hx * (options.headWidth / 2) },
      ]
    : [];
  return { path, head };
}

/** Points d'un polygone au format de l'attribut SVG `points`. */
export function polygonPoints(points: DiagramPoint[]): string {
  return points.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(" ");
}

/**
 * Groupes de légende : joueurs du demi-terrain du haut (relanceurs) et du
 * bas (travailleurs), ex. « B · relance », « A, C · travaille ».
 */
export function diagramLegend(
  sequence: ExerciseSequence,
  playersCount: number,
): { top: SequencePlayer[]; bottom: SequencePlayer[] } {
  const players = sequencePlayers(playersCount);
  const sides = playerSides(sequence.roles, players);
  return {
    top: players.filter((p) => sides[p] === 1),
    bottom: players.filter((p) => sides[p] === 0),
  };
}
