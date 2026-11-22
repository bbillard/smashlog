import { SHOTS_BY_ID } from "@/src/data/shots";
import { CourtZone, SequencePlayer, SequenceStep, ShotSequence } from "@/src/types/index";
import {
  Lane,
  arrivalLane,
  hitterLanes,
  needsFromSide,
  playersByHalf,
  stepHalf,
} from "@/src/utils/exerciseSequence";

/**
 * Calcul pur du schéma terrain d'une séquence de jeu (ticket v1.4.1 « Fiche
 * exercice — schéma terrain généré depuis la séquence + export PNG »).
 *
 * Rien n'est stocké : le schéma est recalculé à chaque affichage à partir de
 * exercise.sequence. Toutes les coordonnées sont en MÈTRES, terrain en
 * PORTRAIT : x ∈ [0 ; 6,10] (largeur), y ∈ [0 ; 13,40] (longueur), filet en
 * y = 6,70. Camp du haut = joueur du coup n°1 (puis coups 3, 5…).
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
const LANE_X: Record<Lane, number> = {
  left: CENTER_X - 1.65,
  center: CENTER_X,
  right: CENTER_X + 1.65,
};
/** Le serveur se place au milieu de sa zone de service (côté « Depuis »). */
const SERVICE_LANE_OFFSET = 1.3;

/** Seuil (m) en deçà duquel deux trajets sont jugés « similaires ». */
const SIMILAR_PATH_THRESHOLD = 1.0;
/** Diamètre de pastille par défaut (m) si l'appelant n'en fournit pas. */
const DEFAULT_MIN_DISTANCE = 0.6;

function pointAt(half: 0 | 1, depth: number, x: number): DiagramPoint {
  return { x, y: half === 1 ? COURT.halfLength - depth : COURT.halfLength + depth };
}

function distance(a: DiagramPoint, b: DiagramPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
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
  /** Point de frappe affiché (pastille), après décalage anti-superposition. */
  from: DiagramPoint;
  /** Point d'arrivée affiché (indicatif pour un coup « Au choix »). */
  to: DiagramPoint;
  /** Coup « Au choix » : flèche en pointillés, sans point d'arrivée précis. */
  approximate: boolean;
  /**
   * Courbure relative (signe = côté, |valeur| = intensité, 1 par défaut).
   * Deux trajets similaires ont des courbes de côtés opposés.
   */
  curvature: number;
}

export interface DiagramOptions {
  /**
   * Distance minimale (m) entre deux pastilles : en pratique leur diamètre au
   * rendu. Les points de frappe plus proches sont écartés.
   */
  minDistance?: number;
}

/**
 * Écarte les points distants de moins de `minDistance`, de façon
 * déterministe (même entrée → même rendu) : chaque groupe de points proches
 * est réparti en cercle autour de sa position moyenne d'origine, dans
 * l'ordre des coups (premier point en haut).
 *
 * Un point écarté peut se retrouver trop près d'un voisin qui n'était pas
 * dans son groupe : on recommence alors en FUSIONNANT les groupes (un groupe
 * ne se défait jamais), puis on répartit le groupe fusionné sur un cercle
 * plus grand. Les groupes ne font que grossir : au plus n passes.
 */
export function spreadPoints(points: DiagramPoint[], minDistance: number): DiagramPoint[] {
  const parent = points.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  let current = points.map((p) => ({ ...p }));

  for (let pass = 0; pass < Math.max(1, points.length); pass += 1) {
    let merged = false;
    for (let i = 0; i < current.length; i += 1) {
      for (let j = i + 1; j < current.length; j += 1) {
        // Petite tolérance : des voisins déjà écartés à minDistance pile ne
        // sont pas considérés comme superposés.
        if (find(i) !== find(j) && distance(current[i], current[j]) < minDistance - 1e-6) {
          parent[find(j)] = find(i);
          merged = true;
        }
      }
    }
    if (!merged) break;

    const groups = new Map<number, number[]>();
    points.forEach((_, i) => {
      const root = find(i);
      groups.set(root, [...(groups.get(root) ?? []), i]);
    });
    const next = points.map((p) => ({ ...p }));
    for (const members of groups.values()) {
      if (members.length < 2) continue;
      const k = members.length;
      const cx = members.reduce((sum, i) => sum + points[i].x, 0) / k;
      const cy = members.reduce((sum, i) => sum + points[i].y, 0) / k;
      // Rayon tel que deux voisins sur le cercle soient espacés d'au moins minDistance.
      const radius = (minDistance / (2 * Math.sin(Math.PI / k))) * 1.05;
      members.forEach((i, rank) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * rank) / k;
        next[i] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
      });
    }
    current = next;
  }
  return current;
}

/**
 * Séquence → liste de flèches. Camps déduits de la séquence (coups
 * consécutifs depuis des camps opposés, coup n°1 en haut). Le point
 * d'arrivée d'un coup devient le point de frappe du suivant. Coup n°1 et
 * coup qui suit un « Au choix » : le frappeur part du côté « Depuis »
 * (fromSide), ce qui ancre le schéma (pas de rendu en miroir). Les pastilles trop proches sont écartées et les flèches
 * suivent les positions décalées.
 */
export function computeDiagramShots(
  sequence: ShotSequence,
  options: DiagramOptions = {},
): DiagramShot[] {
  const minDistance = options.minDistance ?? DEFAULT_MIN_DISTANCE;
  const steps = sequence.steps;
  const lanes = hitterLanes(steps);

  // 1. Positions brutes.
  const rawFrom: DiagramPoint[] = [];
  const rawTo: DiagramPoint[] = [];
  steps.forEach((step, i) => {
    const half = stepHalf(i);
    const def = SHOTS_BY_ID[step.shot];
    if (!needsFromSide(steps, i)) {
      rawFrom.push(rawTo[i - 1]);
    } else if (def.isService) {
      // Zone de service du côté « Depuis » (au milieu de la zone).
      const offset = lanes[i] === "left" ? -SERVICE_LANE_OFFSET : lanes[i] === "right" ? SERVICE_LANE_OFFSET : 0;
      rawFrom.push(pointAt(half, SERVICE_DEPTH, CENTER_X + offset));
    } else {
      rawFrom.push(pointAt(half, ZONE_DEPTH[preferredStartZone(step)], LANE_X[lanes[i]]));
    }
    const targetHalf = half === 1 ? 0 : 1;
    rawTo.push(
      step.shot === "au_choix"
        ? pointAt(targetHalf, ZONE_DEPTH.milieu, CENTER_X)
        : pointAt(targetHalf, arrivalDepth(step, steps[i + 1]), LANE_X[arrivalLane(lanes[i], half, step.direction)]),
    );
  });

  // 2. Pastilles écartées si superposées.
  const from = spreadPoints(rawFrom, minDistance);

  // 3. Courbures : alternées par défaut. Les trajets similaires (même trajet
  // dans un sens ou dans l'autre) forment un groupe : on alterne le côté
  // géométrique de la courbe et on l'accentue tous les deux membres, pour
  // que chaque flèche reste distincte.
  const orientation = (i: number): 1 | -1 =>
    rawTo[i].y > rawFrom[i].y || (rawTo[i].y === rawFrom[i].y && rawTo[i].x >= rawFrom[i].x) ? 1 : -1;
  const groupOf: number[] = [];
  const curvatures: number[] = [];
  steps.forEach((_, j) => {
    let group = j;
    for (let i = 0; i < j; i += 1) {
      const same =
        distance(rawFrom[i], rawFrom[j]) < SIMILAR_PATH_THRESHOLD &&
        distance(rawTo[i], rawTo[j]) < SIMILAR_PATH_THRESHOLD;
      const reversed =
        distance(rawFrom[i], rawTo[j]) < SIMILAR_PATH_THRESHOLD &&
        distance(rawTo[i], rawFrom[j]) < SIMILAR_PATH_THRESHOLD;
      if (same || reversed) {
        group = groupOf[i];
        break;
      }
    }
    groupOf.push(group);
    const defaultSign = group % 2 === 0 ? 1 : -1;
    if (group === j) {
      curvatures.push(defaultSign);
      return;
    }
    // Rang parmi les membres du groupe qui vont dans le même sens : deux
    // trajets identiques se courbent de côtés opposés ; les trajets en sens
    // inverse reprennent l'alternance avec une courbe plus marquée.
    const sameWay = groupOf
      .slice(0, j)
      .map((g, i) => ({ g, i }))
      .filter(({ g, i }) => g === group && orientation(i) === orientation(j)).length;
    const firstSide = defaultSign * orientation(group);
    const side = sameWay % 2 === 0 ? firstSide : -firstSide;
    const reversedWay = orientation(j) !== orientation(group) ? 0.6 : 0;
    const magnitude = 1 + reversedWay + Math.floor(sameWay / 2) * 0.6;
    curvatures.push(side * orientation(j) * magnitude);
  });

  return steps.map((step, i) => {
    const approximate = step.shot === "au_choix";
    const chained = !approximate && i + 1 < steps.length;
    return {
      index: i,
      stepId: step.id,
      player: step.player,
      from: from[i],
      to: chained ? from[i + 1] : rawTo[i],
      approximate,
      curvature: curvatures[i],
    };
  });
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
 * Légende des camps : joueurs du camp du haut (coups 1, 3, 5…) et du bas,
 * affichés « Joueur A », « Joueur B »… de chaque côté du schéma.
 */
export function diagramLegend(sequence: ShotSequence): { top: SequencePlayer[]; bottom: SequencePlayer[] } {
  return playersByHalf(sequence.steps);
}
