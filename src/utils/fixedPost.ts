import { COURT_ZONE_LABELS, SHOTS_BY_ID } from "@/src/data/shots";
import {
  CourtSide,
  CourtSpot,
  CourtZone,
  FixedPost,
  FixedPostContinuous,
  FixedPostMultishuttle,
  MultishuttleStrike,
  OrderedSend,
  SequenceEnding,
  SequencePlayer,
  ShotDirection,
  ShotId,
} from "@/src/types/index";
import {
  SEQUENCE_PLAYERS,
  directionLabel,
  isDirectionAllowed,
  sequencePlayers,
  shotLabel,
  sideContext,
} from "@/src/utils/exerciseSequence";

/**
 * Règles pures du mode « Poste fixe » de la Saisie express (ticket v1.4.1
 * « Saisie express — mode « Poste fixe » »). Aucune dépendance UI.
 *
 * Principe : on dessine les coups de celui dont le placement varie.
 * - Volant continu + poste fixe : un ou plusieurs relanceurs restent dans une
 *   zone fixe et envoient vers des zones choisies ; le ou les joueurs qui
 *   travaillent (tous les autres) renvoient toujours vers eux. On ne saisit
 *   que les envois des relanceurs.
 * - Multivolant (toujours en poste fixe) : un joueur travaille, les autres
 *   distribuent. On saisit les frappes du joueur qui travaille (d'où, quel
 *   coup, quelle direction) ; les envois des distributeurs sont déduits et
 *   leur position n'est pas saisie.
 *
 * Zones : { depth, side }, le côté étant TOUJOURS exprimé du point de vue du
 * joueur qui occupe ce demi-terrain, face au filet (position d'un relanceur :
 * son point de vue ; zone d'envoi : point de vue du joueur qui travaille).
 */

// ─── Zones ───────────────────────────────────────────────────────────────────

export const SPOT_DEPTHS: readonly CourtZone[] = ["avant", "milieu", "fond"];
export const SPOT_SIDES: readonly CourtSide[] = ["gauche", "centre", "droite"];

/** Les 9 zones d'un demi-terrain, filet en haut, ligne par ligne (Avant G → Fond D). */
export const ALL_SPOTS: readonly CourtSpot[] = SPOT_DEPTHS.flatMap((depth) =>
  SPOT_SIDES.map((side) => ({ depth, side })),
);

/** « droit » au masculin : on parle de l'avant / du milieu / du fond. */
const SIDE_WORDS: Record<CourtSide, string> = {
  gauche: "gauche",
  centre: "centre",
  droite: "droit",
};

const SIDE_INITIALS: Record<CourtSide, string> = {
  gauche: "G",
  centre: "C",
  droite: "D",
};

const DEPTH_WITH_ARTICLE: Record<CourtZone, { de: string; a: string }> = {
  avant: { de: "l'avant", a: "à l'avant" },
  milieu: { de: "le milieu", a: "au milieu" },
  fond: { de: "le fond", a: "au fond" },
};

export function spotKey(spot: CourtSpot): string {
  return `${spot.depth}-${spot.side}`;
}

export function sameSpot(a: CourtSpot | undefined, b: CourtSpot | undefined): boolean {
  return !!a && !!b && a.depth === b.depth && a.side === b.side;
}

/** Libellé de liste : « Fond gauche », « Avant centre », « Milieu droit ». */
export function spotLabel(spot: CourtSpot): string {
  return `${COURT_ZONE_LABELS[spot.depth]} ${SIDE_WORDS[spot.side]}`;
}

/** Libellé de case du mini demi-terrain : « Avant G ». */
export function spotShortLabel(spot: CourtSpot): string {
  return `${COURT_ZONE_LABELS[spot.depth]} ${SIDE_INITIALS[spot.side]}`;
}

/** En minuscules dans une phrase : « fond gauche ». */
export function spotPhrase(spot: CourtSpot): string {
  return spotLabel(spot).toLowerCase();
}

/** « l'avant centre », « le fond gauche » (après « depuis »). */
export function spotWithArticle(spot: CourtSpot): string {
  return `${DEPTH_WITH_ARTICLE[spot.depth].de} ${SIDE_WORDS[spot.side]}`;
}

/** « à l'avant centre », « au fond gauche » (position d'un relanceur). */
export function spotLocative(spot: CourtSpot): string {
  return `${DEPTH_WITH_ARTICLE[spot.depth].a} ${SIDE_WORDS[spot.side]}`;
}

/**
 * Ordre canonique d'affichage des zones d'envoi : du fond vers l'avant, puis
 * de gauche à droite (« fond gauche, fond droit, milieu gauche… »), pour que
 * le texte et la liste ne dépendent pas de l'ordre des touchers.
 */
export function compareSpots(a: CourtSpot, b: CourtSpot): number {
  const depthOrder = (d: CourtZone) => SPOT_DEPTHS.length - 1 - SPOT_DEPTHS.indexOf(d);
  return depthOrder(a.depth) - depthOrder(b.depth) || SPOT_SIDES.indexOf(a.side) - SPOT_SIDES.indexOf(b.side);
}

export function sortSpots(spots: readonly CourtSpot[]): CourtSpot[] {
  return [...spots].sort(compareSpots);
}

// ─── Volant continu + poste fixe ─────────────────────────────────────────────

/** Poste fixe en cours de saisie : sa position n'est pas encore choisie. */
export type FixedPostDraft = Omit<FixedPost, "zone"> & { zone?: CourtSpot };

/** Brouillon du volant continu + poste fixe (le type persisté exige une position par poste). */
export type FixedPostContinuousDraft = Omit<FixedPostContinuous, "fixedPosts"> & {
  fixedPosts: FixedPostDraft[];
};

/**
 * Brouillon vide : un poste fixe tenu par B (A travaille), sans position,
 * envois aléatoires, en boucle.
 */
export function createEmptyFixedPostContinuous(playersCount: number): FixedPostContinuousDraft {
  const players = sequencePlayers(playersCount);
  return {
    schemaVersion: 1,
    kind: "poste_fixe",
    distribution: "volant_continu",
    fixedPosts: [{ player: players[1] ?? "B", targets: [] }],
    order: "aleatoire",
    ending: "boucle",
    generatedText: "",
  };
}

/** Joueurs qui travaillent : tous ceux qui ne tiennent pas de poste fixe. */
export function continuousWorkers(posts: readonly { player: SequencePlayer }[], playersCount: number): SequencePlayer[] {
  const posted = new Set(posts.map((p) => p.player));
  return sequencePlayers(playersCount).filter((p) => !posted.has(p));
}

/** Au plus playersCount − 1 postes : il faut au moins un joueur qui travaille. */
export function maxFixedPosts(playersCount: number): number {
  return Math.max(1, sequencePlayers(playersCount).length - 1);
}

export function canAddFixedPost(draft: FixedPostContinuousDraft, playersCount: number): boolean {
  return draft.fixedPosts.length < maxFixedPosts(playersCount);
}

/** Joueur du poste ajouté : le premier joueur libre, dans l'ordre A–D. */
export function nextFixedPostPlayer(
  posts: readonly { player: SequencePlayer }[],
  playersCount: number,
): SequencePlayer | undefined {
  const used = new Set(posts.map((p) => p.player));
  return sequencePlayers(playersCount).find((p) => !used.has(p));
}

export function addFixedPost(draft: FixedPostContinuousDraft, playersCount: number): FixedPostContinuousDraft {
  const player = nextFixedPostPlayer(draft.fixedPosts, playersCount);
  if (!player || !canAddFixedPost(draft, playersCount)) return draft;
  return { ...draft, fixedPosts: [...draft.fixedPosts, { player, targets: [] }] };
}

export function removeFixedPost(draft: FixedPostContinuousDraft, index: number): FixedPostContinuousDraft {
  const removed = draft.fixedPosts[index];
  if (!removed || draft.fixedPosts.length <= 1) return draft;
  return {
    ...draft,
    fixedPosts: draft.fixedPosts.filter((_, i) => i !== index),
    ...(draft.orderedSends
      ? { orderedSends: draft.orderedSends.filter((s) => s.player !== removed.player) }
      : {}),
  };
}

/** Un joueur = un poste fixe au plus : les envois ordonnés suivent le changement de joueur. */
export function setFixedPostPlayer(
  draft: FixedPostContinuousDraft,
  index: number,
  player: SequencePlayer,
): FixedPostContinuousDraft {
  const post = draft.fixedPosts[index];
  if (!post || post.player === player) return draft;
  if (draft.fixedPosts.some((p, i) => i !== index && p.player === player)) return draft;
  return {
    ...draft,
    fixedPosts: draft.fixedPosts.map((p, i) => (i === index ? { ...p, player } : p)),
    ...(draft.orderedSends
      ? { orderedSends: draft.orderedSends.map((s) => (s.player === post.player ? { ...s, player } : s)) }
      : {}),
  };
}

/** Deux postes fixes ne peuvent pas occuper la même zone. */
export function isFixedPostZoneTaken(draft: FixedPostContinuousDraft, index: number, spot: CourtSpot): boolean {
  return draft.fixedPosts.some((p, i) => i !== index && sameSpot(p.zone, spot));
}

export function setFixedPostZone(
  draft: FixedPostContinuousDraft,
  index: number,
  zone: CourtSpot,
): FixedPostContinuousDraft {
  if (isFixedPostZoneTaken(draft, index, zone)) return draft;
  return {
    ...draft,
    fixedPosts: draft.fixedPosts.map((p, i) => (i === index ? { ...p, zone } : p)),
  };
}

/** Numéro d'envoi (1-based, tous postes confondus) en mode « Dans l'ordre ». */
export function sendNumber(
  draft: Pick<FixedPostContinuousDraft, "order" | "orderedSends">,
  player: SequencePlayer,
  target: CourtSpot,
): number | undefined {
  if (draft.order !== "ordre" || !draft.orderedSends) return undefined;
  const index = draft.orderedSends.findIndex((s) => s.player === player && sameSpot(s.target, target));
  return index === -1 ? undefined : index + 1;
}

/**
 * Toucher d'une zone d'envoi du poste n°`index` :
 * - « Aléatoire » : ajoute ou retire la zone ;
 * - « Dans l'ordre » : une zone non numérotée reçoit le numéro suivant (elle
 *   est ajoutée si besoin) ; une zone déjà numérotée est retirée et les
 *   numéros suivants se resserrent.
 */
export function toggleFixedPostTarget(
  draft: FixedPostContinuousDraft,
  index: number,
  target: CourtSpot,
): FixedPostContinuousDraft {
  const post = draft.fixedPosts[index];
  if (!post) return draft;
  const selected = post.targets.some((t) => sameSpot(t, target));
  const withTargets = (targets: CourtSpot[]) =>
    draft.fixedPosts.map((p, i) => (i === index ? { ...p, targets: sortSpots(targets) } : p));

  if (draft.order !== "ordre") {
    return {
      ...draft,
      fixedPosts: withTargets(selected ? post.targets.filter((t) => !sameSpot(t, target)) : [...post.targets, target]),
    };
  }

  const sends = draft.orderedSends ?? [];
  const numbered = sendNumber(draft, post.player, target) !== undefined;
  if (numbered) {
    return {
      ...draft,
      fixedPosts: withTargets(post.targets.filter((t) => !sameSpot(t, target))),
      orderedSends: sends.filter((s) => !(s.player === post.player && sameSpot(s.target, target))),
    };
  }
  return {
    ...draft,
    fixedPosts: selected ? draft.fixedPosts : withTargets([...post.targets, target]),
    orderedSends: [...sends, { player: post.player, target }],
  };
}

/**
 * Passage « Aléatoire » ↔ « Dans l'ordre ». En passant à « Dans l'ordre »,
 * les zones déjà choisies sont numérotées dans l'ordre d'affichage (poste
 * par poste) : l'utilisateur peut garder cet ordre ou le réinitialiser.
 */
export function setFixedPostOrder(
  draft: FixedPostContinuousDraft,
  order: FixedPostContinuous["order"],
): FixedPostContinuousDraft {
  if (order === draft.order) return draft;
  if (order === "aleatoire") {
    const { orderedSends: _orderedSends, ...rest } = draft;
    return { ...rest, order };
  }
  const orderedSends: OrderedSend[] = draft.fixedPosts.flatMap((p) =>
    p.targets.map((target) => ({ player: p.player, target })),
  );
  return { ...draft, order, orderedSends };
}

/** « Réinitialiser l'ordre » : les zones restent choisies, sans numéro, à renuméroter. */
export function resetFixedPostOrder(draft: FixedPostContinuousDraft): FixedPostContinuousDraft {
  return draft.order === "ordre" ? { ...draft, orderedSends: [] } : draft;
}

export function setContinuousEnding(draft: FixedPostContinuousDraft, ending: SequenceEnding): FixedPostContinuousDraft {
  return { ...draft, ending };
}

/** Zones envoyées en mode ordonné mais pas encore numérotées (à toucher pour valider). */
export function unnumberedTargetCount(draft: FixedPostContinuousDraft): number {
  if (draft.order !== "ordre") return 0;
  return draft.fixedPosts.reduce(
    (count, p) => count + p.targets.filter((t) => sendNumber(draft, p.player, t) === undefined).length,
    0,
  );
}

/**
 * « Valider » actif si : 1 à playersCount − 1 postes, joueurs présents et
 * distincts, chaque poste a une position (zones distinctes) et au moins une
 * zone d'envoi ; en « Dans l'ordre », chaque zone d'envoi est numérotée une
 * fois et chaque envoi correspond à une zone de son poste.
 */
export function isFixedPostContinuousValid(draft: FixedPostContinuousDraft, playersCount: number): boolean {
  const players = sequencePlayers(playersCount);
  const posts = draft.fixedPosts;
  if (posts.length === 0 || posts.length > maxFixedPosts(playersCount) || players.length < 2) return false;
  const seenPlayers = new Set<SequencePlayer>();
  const seenZones = new Set<string>();
  for (const post of posts) {
    if (!players.includes(post.player) || seenPlayers.has(post.player)) return false;
    seenPlayers.add(post.player);
    if (!post.zone || seenZones.has(spotKey(post.zone))) return false;
    seenZones.add(spotKey(post.zone));
    if (post.targets.length === 0) return false;
  }
  if (draft.order === "ordre") {
    const sends = draft.orderedSends ?? [];
    const keys = sends.map((s) => `${s.player}:${spotKey(s.target)}`);
    if (new Set(keys).size !== keys.length) return false;
    const expected = posts.reduce((n, p) => n + p.targets.length, 0);
    if (sends.length !== expected) return false;
    const valid = sends.every((s) => posts.some((p) => p.player === s.player && p.targets.some((t) => sameSpot(t, s.target))));
    if (!valid) return false;
  }
  return continuousWorkers(posts, playersCount).length > 0;
}

/** Brouillon validé → donnée persistée (null si incomplet). */
export function finalizeFixedPostContinuous(
  draft: FixedPostContinuousDraft,
  playersCount: number,
): FixedPostContinuous | null {
  if (!isFixedPostContinuousValid(draft, playersCount)) return null;
  // Postes rangés par joueur (A, B…) : texte, liste et légende dans un ordre stable.
  const fixedPosts = [...draft.fixedPosts]
    .sort((a, b) => a.player.localeCompare(b.player))
    .map((p) => ({ player: p.player, zone: p.zone as CourtSpot, targets: sortSpots(p.targets) }));
  const { orderedSends, ...rest } = draft;
  return {
    ...rest,
    fixedPosts,
    ...(draft.order === "ordre" && orderedSends ? { orderedSends } : {}),
  };
}

/** Envois numérotés dans l'ordre, ou envois de chaque poste dans l'ordre d'affichage. */
export function continuousSends(sequence: Pick<FixedPostContinuousDraft, "fixedPosts" | "order" | "orderedSends">): OrderedSend[] {
  if (sequence.order === "ordre" && sequence.orderedSends) return sequence.orderedSends;
  return sequence.fixedPosts.flatMap((p) => p.targets.map((target) => ({ player: p.player, target })));
}

// ─── Multivolant ─────────────────────────────────────────────────────────────

export const DEFAULT_SHUTTLES_PER_ROUND = 15;
export const MIN_SHUTTLES_PER_ROUND = 1;
export const MAX_SHUTTLES_PER_ROUND = 50;

export function clampShuttles(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SHUTTLES_PER_ROUND;
  return Math.min(MAX_SHUTTLES_PER_ROUND, Math.max(MIN_SHUTTLES_PER_ROUND, Math.round(value)));
}

/** Distributeurs : tous les joueurs sauf celui qui travaille. */
export function multishuttleFeeders(worker: SequencePlayer, playersCount: number): SequencePlayer[] {
  return sequencePlayers(playersCount).filter((p) => p !== worker);
}

export function createEmptyMultishuttle(playersCount: number): FixedPostMultishuttle {
  const players = sequencePlayers(playersCount);
  const worker = players[0] ?? "A";
  return {
    schemaVersion: 1,
    kind: "poste_fixe",
    distribution: "multivolant",
    worker,
    feeders: multishuttleFeeders(worker, playersCount),
    strikes: [],
    shuttlesPerRound: DEFAULT_SHUTTLES_PER_ROUND,
    order: "ordre",
    generatedText: "",
  };
}

/** Frappes numérotées (dans l'ordre) ou ordre laissé au distributeur (aléatoire). */
export function isMultishuttleOrdered(sequence: Pick<FixedPostMultishuttle, "order">): boolean {
  return sequence.order !== "aleatoire";
}

/** « Qui travaille ? » : les autres joueurs deviennent les distributeurs. */
export function setMultishuttleWorker(
  draft: FixedPostMultishuttle,
  worker: SequencePlayer,
  playersCount: number,
): FixedPostMultishuttle {
  return { ...draft, worker, feeders: multishuttleFeeders(worker, playersCount) };
}

/**
 * Coup jouable depuis la zone « Depuis » d'une frappe : ses zones de départ
 * contiennent la profondeur de la zone. Les services sont toujours grisés en
 * multivolant ; « Au choix » ne l'est jamais. Sans zone choisie : tout sauf
 * les services.
 */
export function isStrikeShotAvailable(shot: ShotId, from: CourtSpot | undefined): boolean {
  const def = SHOTS_BY_ID[shot];
  if (def.isService) return false;
  if (shot === "au_choix" || !from) return true;
  return def.startZones.includes(from.depth);
}

/** Libellés de direction : Droit / Croisé / Centre sur un côté, Gauche / Centre / Droite au centre. */
export function strikeDirectionContext(from: CourtSpot) {
  return sideContext(from.side);
}

/** Frappe à corriger : coup impossible depuis sa zone, ou direction hors contexte. */
export function isStrikeValid(strike: Omit<MultishuttleStrike, "id">): boolean {
  if (!isStrikeShotAvailable(strike.shot, strike.from)) return false;
  if (strike.direction && !isDirectionAllowed(strike.direction, strikeDirectionContext(strike.from))) return false;
  return true;
}

export function findInvalidStrikeIds(strikes: readonly MultishuttleStrike[]): string[] {
  return strikes.filter((s) => !isStrikeValid(s)).map((s) => s.id);
}

/** Déplace une frappe d'un cran (réordonnancement de la liste). */
export function moveStrike(strikes: readonly MultishuttleStrike[], index: number, delta: -1 | 1): MultishuttleStrike[] {
  const target = index + delta;
  if (index < 0 || index >= strikes.length || target < 0 || target >= strikes.length) return [...strikes];
  const next = [...strikes];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function isMultishuttleValid(draft: FixedPostMultishuttle, playersCount: number): boolean {
  const players = sequencePlayers(playersCount);
  if (!players.includes(draft.worker)) return false;
  if (draft.feeders.length === 0) return false;
  if (draft.feeders.some((f) => f === draft.worker || !players.includes(f))) return false;
  if (draft.strikes.length === 0) return false;
  if (findInvalidStrikeIds(draft.strikes).length > 0) return false;
  return draft.shuttlesPerRound >= MIN_SHUTTLES_PER_ROUND && draft.shuttlesPerRound <= MAX_SHUTTLES_PER_ROUND;
}

// ─── Libellés et texte généré ────────────────────────────────────────────────

/** « A », « A et B », « A, B et C ». */
export function joinPlayers(players: readonly string[]): string {
  if (players.length <= 1) return players.join("");
  return `${players.slice(0, -1).join(", ")} et ${players[players.length - 1]}`;
}

function endingSuffix(ending: SequenceEnding): string {
  return ending === "finir_point" ? " Puis point libre." : " ↻";
}

/** « Smash droit » (direction en minuscules après le coup). */
export function strikeShotText(strike: { shot: ShotId; direction?: ShotDirection }): string {
  const direction = strike.direction ? ` ${directionLabel(strike.direction).toLowerCase()}` : "";
  return `${shotLabel(strike.shot)}${direction}`;
}

/** « depuis le fond gauche ». */
export function strikeFromText(strike: { from: CourtSpot }): string {
  return `depuis ${spotWithArticle(strike.from)}`;
}

/**
 * Texte du volant continu + poste fixe, ex. :
 * « Poste fixe — B à l'avant centre envoie vers : fond gauche, fond droit (aléatoire). A travaille et renvoie toujours vers B. ↻ »
 * Plusieurs postes : « Postes fixes — A à l'avant gauche (fond droit) et B à l'avant droit (fond gauche), aléatoire. C travaille et renvoie vers le relanceur qui a envoyé le volant. ↻ »
 * Dans l'ordre : envois numérotés (« 1. A → fond droit, 2. B → fond gauche »).
 */
export function generateFixedPostContinuousText(
  sequence: FixedPostContinuousDraft,
  playersCount: number,
): string {
  const posts = sequence.fixedPosts.filter((p) => p.zone).sort((a, b) => a.player.localeCompare(b.player));
  if (posts.length === 0 || posts.every((p) => p.targets.length === 0)) return "";
  const workers = continuousWorkers(sequence.fixedPosts, playersCount);
  const ordered = sequence.order === "ordre";
  const sends = continuousSends(sequence);
  const where = (p: FixedPostDraft) => `${p.player} ${spotLocative(p.zone as CourtSpot)}`;
  const plural = workers.length > 1;
  const workersText = workers.length > 0 ? joinPlayers(workers) : "Le joueur";
  let body: string;
  let back: string;

  if (posts.length === 1) {
    const post = posts[0];
    body = ordered
      ? `Poste fixe — ${where(post)} envoie dans l'ordre : ${sends.map((s, i) => `${i + 1}. ${spotPhrase(s.target)}`).join(", ")}.`
      : `Poste fixe — ${where(post)} envoie vers : ${post.targets.map(spotPhrase).join(", ")} (aléatoire).`;
    back = `${workersText} ${plural ? "travaillent et renvoient" : "travaille et renvoie"} toujours vers ${post.player}.`;
  } else {
    body = ordered
      ? `Postes fixes — ${joinPlayers(posts.map(where))}, dans l'ordre : ${sends
          .map((s, i) => `${i + 1}. ${s.player} → ${spotPhrase(s.target)}`)
          .join(", ")}.`
      : `Postes fixes — ${joinPlayers(posts.map((p) => `${where(p)} (${p.targets.map(spotPhrase).join(", ")})`))}, aléatoire.`;
    back = `${workersText} ${plural ? "travaillent et renvoient" : "travaille et renvoie"} vers le relanceur qui a envoyé le volant.`;
  }
  return `${body} ${back}${endingSuffix(sequence.ending)}`;
}

/**
 * Texte du multivolant, ex. :
 * « Multivolant, 15 volants. A : smash droit depuis le fond gauche → lob droit depuis l'avant droit. B distribue. »
 */
export function generateMultishuttleText(sequence: FixedPostMultishuttle): string {
  if (sequence.strikes.length === 0) return "";
  const n = sequence.shuttlesPerRound;
  const ordered = isMultishuttleOrdered(sequence);
  const chain = sequence.strikes
    .map((s) => `${strikeShotText(s).toLowerCase()} ${strikeFromText(s)}`)
    .join(ordered ? " → " : ", ");
  const feeders = sequence.feeders.length > 0 ? ` ${feedersSentence(sequence.feeders)}` : "";
  const who = ordered ? sequence.worker : `${sequence.worker}, dans un ordre aléatoire`;
  return `Multivolant, ${n} volant${n > 1 ? "s" : ""}. ${who} : ${chain}.${feeders}`;
}

/** « B distribue. » / « B et C distribuent. » */
export function feedersSentence(feeders: readonly SequencePlayer[]): string {
  if (feeders.length === 0) return "";
  return `${joinPlayers(feeders)} ${feeders.length > 1 ? "distribuent" : "distribue"}.`;
}

/** « B distribue. Ses envois sont déduits, pas besoin de les saisir. » (pluriel si besoin). */
export function feedersHint(feeders: readonly SequencePlayer[]): string {
  if (feeders.length === 0) return "";
  const deduced = feeders.length > 1 ? "Leurs envois sont déduits" : "Ses envois sont déduits";
  return `${feedersSentence(feeders)} ${deduced}, pas besoin de les saisir.`;
}

/** « C travaille et renvoie vers les postes fixes » (mention déduite du volant continu). */
export function workersHint(workers: readonly SequencePlayer[]): string {
  if (workers.length === 0) return "Il faut au moins un joueur qui travaille.";
  const plural = workers.length > 1;
  return `${joinPlayers(workers)} ${plural ? "travaillent et renvoient" : "travaille et renvoie"} vers les postes fixes.`;
}

/** Badge résumé : « Poste fixe · 1 relanceur · 4 zones » / « Multivolant · 3 frappes ». */
export function fixedPostSummary(sequence: FixedPostContinuousDraft | FixedPostMultishuttle): string {
  if (sequence.distribution === "multivolant") {
    const n = sequence.strikes.length;
    const base = `Multivolant · ${n} frappe${n > 1 ? "s" : ""}`;
    return isMultishuttleOrdered(sequence) ? base : `${base} · aléatoire`;
  }
  const posts = sequence.fixedPosts.length;
  const zones = sequence.fixedPosts.reduce((count, p) => count + p.targets.length, 0);
  return `Poste fixe · ${posts} relanceur${posts > 1 ? "s" : ""} · ${zones} zone${zones > 1 ? "s" : ""}`;
}

/** « 15 volants » (badge de la fiche, en-tête du schéma). */
export function shuttlesLabel(n: number): string {
  return `${n} volant${n > 1 ? "s" : ""}`;
}

// ─── Relecture depuis le stockage ────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const DIRECTION_VALUES: readonly ShotDirection[] = ["droit", "croise", "centre", "gauche", "droite"];

function parsePlayer(value: unknown): SequencePlayer | undefined {
  return SEQUENCE_PLAYERS.includes(value as SequencePlayer) ? (value as SequencePlayer) : undefined;
}

function parseSpot(value: unknown): CourtSpot | undefined {
  if (!isRecord(value)) return undefined;
  if (!SPOT_DEPTHS.includes(value.depth as CourtZone) || !SPOT_SIDES.includes(value.side as CourtSide)) return undefined;
  return { depth: value.depth as CourtZone, side: value.side as CourtSide };
}

/**
 * Relit un « poste_fixe » venu de l'extérieur (jsonb Supabase, AsyncStorage,
 * sauvegarde). Undefined si la forme est inutilisable : l'exercice reste
 * alors valide « sans saisie express ». Les incohérences légères (frappe
 * devenue impossible) sont conservées et signalées dans la saisie.
 */
export function parseFixedPostSequence(value: Record<string, unknown>): FixedPostContinuous | FixedPostMultishuttle | undefined {
  const generatedText = typeof value.generatedText === "string" ? value.generatedText : "";

  if (value.distribution === "volant_continu") {
    if (!Array.isArray(value.fixedPosts) || value.fixedPosts.length === 0) return undefined;
    const fixedPosts: FixedPost[] = [];
    for (const raw of value.fixedPosts) {
      if (!isRecord(raw) || !Array.isArray(raw.targets)) return undefined;
      const player = parsePlayer(raw.player);
      const zone = parseSpot(raw.zone);
      const targets = raw.targets.map(parseSpot);
      if (!player || !zone || targets.some((t) => !t) || targets.length === 0) return undefined;
      fixedPosts.push({ player, zone, targets: sortSpots(targets as CourtSpot[]) });
    }
    const order = value.order === "ordre" ? "ordre" : "aleatoire";
    let orderedSends: OrderedSend[] | undefined;
    if (order === "ordre") {
      if (!Array.isArray(value.orderedSends)) return undefined;
      orderedSends = [];
      for (const raw of value.orderedSends) {
        if (!isRecord(raw)) return undefined;
        const player = parsePlayer(raw.player);
        const target = parseSpot(raw.target);
        if (!player || !target) return undefined;
        orderedSends.push({ player, target });
      }
    }
    return {
      schemaVersion: 1,
      kind: "poste_fixe",
      distribution: "volant_continu",
      fixedPosts,
      order,
      ...(orderedSends ? { orderedSends } : {}),
      ending: value.ending === "finir_point" ? "finir_point" : "boucle",
      generatedText,
    };
  }

  if (value.distribution === "multivolant") {
    const worker = parsePlayer(value.worker);
    if (!worker || !Array.isArray(value.feeders) || !Array.isArray(value.strikes)) return undefined;
    const feeders = value.feeders.map(parsePlayer);
    if (feeders.length === 0 || feeders.some((f) => !f)) return undefined;
    const strikes: MultishuttleStrike[] = [];
    for (const raw of value.strikes) {
      if (!isRecord(raw) || typeof raw.id !== "string") return undefined;
      const from = parseSpot(raw.from);
      if (!from || typeof raw.shot !== "string" || !(raw.shot in SHOTS_BY_ID)) return undefined;
      strikes.push({
        id: raw.id,
        from,
        shot: raw.shot as ShotId,
        ...(DIRECTION_VALUES.includes(raw.direction as ShotDirection) ? { direction: raw.direction as ShotDirection } : {}),
      });
    }
    if (strikes.length === 0) return undefined;
    return {
      schemaVersion: 1,
      kind: "poste_fixe",
      distribution: "multivolant",
      worker,
      feeders: feeders as SequencePlayer[],
      strikes,
      shuttlesPerRound: clampShuttles(typeof value.shuttlesPerRound === "number" ? value.shuttlesPerRound : DEFAULT_SHUTTLES_PER_ROUND),
      order: value.order === "aleatoire" ? "aleatoire" : "ordre",
      generatedText,
    };
  }
  return undefined;
}
