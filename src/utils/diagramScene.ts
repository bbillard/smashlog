import {
  CourtSpot,
  CourtZone,
  ExerciseSequence,
  FixedPostContinuous,
  FixedPostMultishuttle,
  SequencePlayer,
} from "@/src/types/index";
import {
  CENTER_X,
  COURT,
  DiagramOptions,
  DiagramPoint,
  DiagramScene,
  LANE_X,
  SceneArrow,
  SceneBadge,
  SceneLabel,
  SceneZone,
  ZONE_DEPTH,
  diagramLegend,
  pathCurvatures,
  pointAt,
  shotArrivalDepth,
  shotSequenceScene,
  spreadPoints,
} from "@/src/utils/courtDiagram";
import { Lane, arrivalLane, sideToLane } from "@/src/utils/exerciseSequence";
import { continuousSends, continuousWorkers, isMultishuttleOrdered, sendNumber, spotKey } from "@/src/utils/fixedPost";

/**
 * Calcul pur des schémas du mode « Poste fixe » (ticket v1.4.1 « Saisie
 * express — mode « Poste fixe » ») et point d'entrée commun à tous les modes
 * (computeDiagramScene). Réutilise le moteur du schéma de séquence
 * (src/utils/courtDiagram.ts) : terrain, repère en mètres portrait,
 * anti-superposition des pastilles, courbures.
 *
 * Repère : le relanceur / distributeur occupe le camp du HAUT (half 1), le
 * joueur qui travaille le camp du BAS (half 0). Les zones sont exprimées du
 * point de vue du joueur qui occupe le demi-terrain (sideToLane fait la
 * conversion en couloir absolu).
 */

// ─── Zones en mètres ─────────────────────────────────────────────────────────

/**
 * Limites de profondeur des zones (distance au filet) : Avant jusqu'à la
 * ligne de service court, Milieu jusqu'à 4,20 m, Fond jusqu'à la ligne de
 * fond. Les couloirs sont les trois tiers de la largeur du terrain.
 */
const DEPTH_BOUNDS: Record<CourtZone, [number, number]> = {
  avant: [0, COURT.shortServiceFromNet],
  milieu: [COURT.shortServiceFromNet, 4.2],
  fond: [4.2, COURT.halfLength],
};
const LANE_WIDTH = COURT.width / 3;
const LANE_BOUNDS: Record<Lane, [number, number]> = {
  left: [0, LANE_WIDTH],
  center: [LANE_WIDTH, LANE_WIDTH * 2],
  right: [LANE_WIDTH * 2, COURT.width],
};
/** Retrait de chaque zone surlignée, pour que deux zones voisines restent distinctes. */
const ZONE_INSET = 0.07;
/** Profondeur des pastilles « au centre du demi-terrain » (travaille / distribue). */
const WORKER_DEPTH = 4.2;
const FEEDER_DEPTH = 2.9;
/** Écart horizontal entre plusieurs pastilles posées côte à côte. */
const SIDE_BY_SIDE_GAP = 0.95;
/** En deçà de cet écart d'angle (rad), deux flèches d'un même relanceur sont jugées superposées. */
const SIMILAR_ANGLE = 0.2;
/** Courbure donnée à deux flèches qui partaient droites dans le même axe (une de chaque côté). */
const STRAIGHT_SPLIT = 1;
const DEFAULT_MIN_DISTANCE = 0.6;

export function spotLane(spot: CourtSpot, half: 0 | 1): Lane {
  return sideToLane(spot.side, half);
}

/** Rectangle (mètres, portrait) d'une zone d'un demi-terrain, légèrement rentré. */
export function spotRect(spot: CourtSpot, half: 0 | 1): { x: number; y: number; width: number; height: number } {
  const [d1, d2] = DEPTH_BOUNDS[spot.depth];
  const [x1, x2] = LANE_BOUNDS[spotLane(spot, half)];
  const yNear = pointAt(half, d1, 0).y;
  const yFar = pointAt(half, d2, 0).y;
  const top = Math.min(yNear, yFar);
  return {
    x: x1 + ZONE_INSET,
    y: top + ZONE_INSET,
    width: x2 - x1 - ZONE_INSET * 2,
    height: Math.abs(yFar - yNear) - ZONE_INSET * 2,
  };
}

/** Centre d'une zone d'un demi-terrain. */
export function spotCenter(spot: CourtSpot, half: 0 | 1): DiagramPoint {
  const [d1, d2] = DEPTH_BOUNDS[spot.depth];
  const [x1, x2] = LANE_BOUNDS[spotLane(spot, half)];
  return pointAt(half, (d1 + d2) / 2, (x1 + x2) / 2);
}

/** Pastilles côte à côte, centrées sur l'axe du terrain. */
function sideBySide(count: number, half: 0 | 1, depth: number): DiagramPoint[] {
  return Array.from({ length: count }, (_, i) =>
    pointAt(half, depth, CENTER_X + (i - (count - 1) / 2) * SIDE_BY_SIDE_GAP),
  );
}

/**
 * Courbure d'une flèche d'éventail : bombée vers l'extérieur (du côté où
 * elle part), droite si la cible est dans l'axe du relanceur.
 */
function fanCurvature(from: DiagramPoint, to: DiagramPoint): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) < 0.3) return 0;
  // Normale à gauche (cf. arrowGeometry) : décalage en x = −uy × courbure.
  return -Math.sign(dx) * Math.sign(dy || 1) * 0.7;
}

/**
 * Deux envois d'un même relanceur dans son axe (ex. milieu droit et fond
 * droit, juste en face) seraient deux flèches droites superposées : elles
 * sont courbées de part et d'autre, dans l'ordre des envois (rendu stable).
 * Les envois en diagonale, déjà bombés vers l'extérieur et de longueurs
 * différentes, restent distincts tels quels.
 */
function separateSimilarArrows(arrows: SceneArrow[]): SceneArrow[] {
  const angle = (a: SceneArrow) => Math.atan2(a.to.y - a.from.y, a.to.x - a.from.x);
  const result: SceneArrow[] = [];
  arrows.forEach((arrow) => {
    if (arrow.curvature !== 0) {
      result.push(arrow);
      return;
    }
    const straightTwins = result.filter(
      (other) => other.player === arrow.player && Math.abs(angle(other) - angle(arrow)) < SIMILAR_ANGLE && Math.abs(other.curvature) === STRAIGHT_SPLIT,
    ).length;
    const firstStraight = result.findIndex(
      (other) => other.player === arrow.player && Math.abs(angle(other) - angle(arrow)) < SIMILAR_ANGLE && other.curvature === 0,
    );
    if (firstStraight === -1 && straightTwins === 0) {
      result.push(arrow);
      return;
    }
    if (firstStraight !== -1) result[firstStraight] = { ...result[firstStraight], curvature: STRAIGHT_SPLIT };
    const rank = straightTwins + (firstStraight !== -1 ? 1 : 0);
    // 2e flèche : côté opposé ; suivantes : alternance de plus en plus marquée.
    const side = rank % 2 === 1 ? -1 : 1;
    result.push({ ...arrow, curvature: side * STRAIGHT_SPLIT * (1 + Math.floor(rank / 2) * 0.6) });
  });
  return result;
}

// ─── Volant continu + poste fixe (écran P1) ──────────────────────────────────

/**
 * Zone fixe de chaque relanceur surlignée à sa couleur (contour pointillé)
 * avec sa pastille ; éventail de flèches vers chaque zone d'envoi (zones
 * surlignées plus légèrement) ; numéros sur les flèches en « Dans l'ordre ».
 * Les retours du joueur qui travaille ne sont pas dessinés : sa pastille est
 * au centre de son demi-terrain.
 */
export function fixedPostContinuousScene(
  sequence: FixedPostContinuous,
  playersCount: number,
): DiagramScene {
  const zones: SceneZone[] = [];
  const arrows: SceneArrow[] = [];
  const badges: SceneBadge[] = [];

  sequence.fixedPosts.forEach((post) => {
    post.targets.forEach((target) => {
      zones.push({ key: `t${post.player}-${spotKey(target)}`, player: post.player, emphasis: "target", ...spotRect(target, 0) });
    });
  });
  sequence.fixedPosts.forEach((post) => {
    zones.push({ key: `p${post.player}`, player: post.player, emphasis: "post", ...spotRect(post.zone, 1) });
  });

  const postCenter = new Map(sequence.fixedPosts.map((p) => [p.player, spotCenter(p.zone, 1)]));
  continuousSends(sequence).forEach((send) => {
    const from = postCenter.get(send.player);
    if (!from) return;
    const to = spotCenter(send.target, 0);
    const number = sendNumber(sequence, send.player, send.target);
    arrows.push({
      key: `s${send.player}-${spotKey(send.target)}`,
      player: send.player,
      from,
      to,
      curvature: fanCurvature(from, to),
      approximate: false,
      endsAtBadge: false,
      ...(number !== undefined ? { number } : {}),
    });
  });

  const separated = separateSimilarArrows(arrows);

  sequence.fixedPosts.forEach((post) => {
    badges.push({ key: `bp${post.player}`, player: post.player, at: spotCenter(post.zone, 1), label: post.player });
  });
  const workers = continuousWorkers(sequence.fixedPosts, playersCount);
  sideBySide(workers.length, 0, WORKER_DEPTH).forEach((at, i) => {
    badges.push({ key: `bw${workers[i]}`, player: workers[i], at, label: workers[i] });
  });
  return { zones, arrows: separated, badges, labels: [] };
}

// ─── Multivolant (écran M3) ──────────────────────────────────────────────────

/**
 * Frappes du joueur qui travaille, numérotées, au centre de leur zone
 * « Depuis » (écartées si plusieurs frappes partent de la même zone) ;
 * flèche vers le point d'arrivée (profondeur du référentiel, côté selon la
 * direction, Droit sans direction). Distributeurs au centre du demi-terrain
 * opposé, côte à côte, avec la mention « distribue » ; aucune flèche de
 * distribution ni ligne de déplacement.
 */
export function multishuttleScene(sequence: FixedPostMultishuttle, options: DiagramOptions = {}): DiagramScene {
  const minDistance = options.minDistance ?? DEFAULT_MIN_DISTANCE;
  const rawFrom = sequence.strikes.map((s) => spotCenter(s.from, 0));
  const rawTo = sequence.strikes.map((s) =>
    s.shot === "au_choix"
      ? pointAt(1, ZONE_DEPTH.milieu, CENTER_X)
      : pointAt(1, shotArrivalDepth(s.shot), LANE_X[arrivalLane(spotLane(s.from, 0), 0, s.direction)]),
  );
  const from = spreadPoints(rawFrom, minDistance);
  const curvatures = pathCurvatures(rawFrom, rawTo);

  const arrows: SceneArrow[] = sequence.strikes.map((strike, i) => ({
    key: `a${strike.id}`,
    player: sequence.worker,
    from: from[i],
    to: rawTo[i],
    curvature: curvatures[i],
    approximate: strike.shot === "au_choix",
    endsAtBadge: false,
  }));
  // Ordre aléatoire : pastilles sans numéro (le distributeur choisit l'ordre).
  const ordered = isMultishuttleOrdered(sequence);
  const badges: SceneBadge[] = sequence.strikes.map((strike, i) => ({
    key: `b${strike.id}`,
    player: sequence.worker,
    at: from[i],
    label: ordered ? String(i + 1) : "",
  }));
  sideBySide(sequence.feeders.length, 1, FEEDER_DEPTH).forEach((at, i) => {
    const feeder = sequence.feeders[i];
    badges.push({ key: `bf${feeder}`, player: feeder, at, label: feeder });
  });
  // Une seule mention sous le groupe de distributeurs (pas de chevauchement).
  const labels: SceneLabel[] =
    sequence.feeders.length > 0
      ? [
          {
            key: "feeders",
            at: pointAt(1, FEEDER_DEPTH, CENTER_X),
            text: sequence.feeders.length > 1 ? "distribuent" : "distribue",
          },
        ]
      : [];
  return { zones: [], arrows, badges, labels };
}

// ─── Point d'entrée commun ───────────────────────────────────────────────────

/** Scène du schéma, quel que soit le mode de la saisie express. */
export function computeDiagramScene(
  sequence: ExerciseSequence,
  playersCount: number,
  options: DiagramOptions = {},
): DiagramScene {
  if (sequence.kind === "sequence") return shotSequenceScene(sequence, options);
  if (sequence.distribution === "multivolant") return multishuttleScene(sequence, options);
  return fixedPostContinuousScene(sequence, playersCount);
}

export interface SchemaLegend {
  top: SequencePlayer[];
  bottom: SequencePlayer[];
  /** Rôle affiché après le nom (« Joueur B · poste fixe »), absent en mode séquence. */
  topRole?: string;
  bottomRole?: string;
}

/**
 * Légende des camps : en mode séquence, joueurs des coups impairs (haut) et
 * pairs (bas) ; en poste fixe, « poste fixe » ou « distribue » en haut,
 * « travaille » en bas.
 */
export function schemaLegend(sequence: ExerciseSequence, playersCount: number): SchemaLegend {
  if (sequence.kind === "sequence") return diagramLegend(sequence);
  if (sequence.distribution === "multivolant") {
    return { top: sequence.feeders, bottom: [sequence.worker], topRole: "distribue", bottomRole: "travaille" };
  }
  return {
    top: sequence.fixedPosts.map((p) => p.player).sort(),
    bottom: continuousWorkers(sequence.fixedPosts, playersCount),
    topRole: "poste fixe",
    bottomRole: "travaille",
  };
}
