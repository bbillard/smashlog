// ─────────────────────────────────────────────────────────────────────────────
// src/services/sharingOrchestrator.ts
//
// Étape 4 — Point d'entrée unique.
// Orchestre les étapes 2 et 3. C'est la seule fonction que l'écran de fin
// de séance doit appeler.
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectTriggeredCards, computeWeeksStreak, computeSessionsThisWeek, getISOWeekString } from './sharingTrigger';
import { generateMessage, updateRecentMessageIds } from './sharingMessage';
import type { TriggeredCard } from './sharingTrigger';
import type { GeneratedMessage } from './sharingMessage';
import type { Match, SessionType } from '../types/session';

// ── Clés AsyncStorage ─────────────────────────────────────────────────────────

const RECENT_MESSAGE_IDS_KEY = 'smashlog_recent_message_ids';
const WINRATE_LAST_SHOWN_KEY = 'smashlog_winrate_card_last_shown';
const SPECIAL_CARDS_LAST_SHOWN_KEY = 'smashlog_special_cards_last_shown';

// ── Types exposés à l'UI ──────────────────────────────────────────────────────

export interface SpecialCard {
  cardType: 'weeksStreak' | 'sessionsPerWeek' | 'milestone';
  value: number;          // valeur du palier (ex: 7, 50, 100)
  level: 1 | 2 | 3 | 4 | 5;
  // Absent pour les paliers de niveau < MIN_MESSAGE_LEVEL : la carte s'affiche
  // quand même (palier atteint = carte), mais sans texte motivationnel ni
  // joueur tiré au sort, pour éviter la redondance sur les paliers fréquents.
  message?: GeneratedMessage;
}

export type TrendDirection = 'up' | 'down' | 'stable' | null;

export interface WinRateSnapshot {
  winRatePercent: number;           // ex: 68
  matchCount: number;               // matchs joués sur les 30 derniers jours
  trendPercent: number | null;      // null si données insuffisantes (< 3 matchs sur J-60/J-31)
  trendDirection: TrendDirection;   // null si données insuffisantes
}

export interface SharingPayload {
  specialCards: SpecialCard[];      // vide = pas de carte spéciale, afficher cartes génériques
  winRateSnapshot?: WinRateSnapshot; // présent si la condition est remplie (5+ matchs / 30j + throttle hebdo)
}

export interface SharingDebugOverrides {
  weeksStreak?: number;
  sessionsThisWeek?: number;
  currentSessionType?: SessionType;
}

const WINRATE_ELIGIBLE_SESSION_TYPES: SessionType[] = ['match', 'jeu_libre'];

// ── Niveau minimum pour générer un message motivationnel ──────────────────────

/**
 * Toutes les cartes de palier sont affichées, quel que soit leur niveau.
 * En revanche, seuls les paliers de niveau ≥ MIN_MESSAGE_LEVEL reçoivent un
 * texte motivationnel (avec tirage de joueur) : en dessous, les paliers sont
 * trop fréquents et généreraient trop de répétition / de noms de joueurs.
 */
const MIN_MESSAGE_LEVEL = 2;

// ── Anti-doublon des cartes de palier ──────────────────────────────────────────

/**
 * Certains paliers (notamment weeksStreak) ne changent pas de valeur tant que
 * la semaine calendaire en cours ne change pas — enregistrer plusieurs séances
 * la même semaine ne doit donc pas réafficher la carte à chaque fois. On
 * mémorise le dernier palier affiché par cardType (+ la semaine ISO pour les
 * paliers hebdomadaires) et on ignore un palier déjà montré dans ce contexte.
 */
interface SpecialCardsLastShown {
  milestone?: number;
  weeksStreak?: { value: number; week: string };
  sessionsPerWeek?: { value: number; week: string };
}

// ── Win Rate Snapshot ─────────────────────────────────────────────────────────

const WINRATE_MIN_MATCHES = 5;         // seuil d'affichage sur la période courante
const WINRATE_MIN_PREVIOUS = 3;        // seuil minimum pour afficher la tendance
const WINRATE_STABLE_THRESHOLD = 2;   // < 2 points d'écart = stable
const WINRATE_THROTTLE_DAYS = 7;       // délai minimal entre deux affichages

interface SessionWithMatches {
  createdAt: string;
  matches?: Match[];
}

function collectMatchesInWindow(
  sessions: SessionWithMatches[],
  windowStart: Date,
  windowEnd: Date,
): Match[] {
  const result: Match[] = [];
  for (const session of sessions) {
    const date = new Date(session.createdAt);
    if (date >= windowStart && date < windowEnd) {
      result.push(...(session.matches ?? []));
    }
  }
  return result;
}

function computeWinRatePercent(matches: Match[]): number {
  if (matches.length === 0) return 0;
  const victories = matches.filter((m) => m.resultat === 'victoire').length;
  return Math.round((victories / matches.length) * 100);
}

/**
 * Calcule les données de la carte Win Rate à partir de toutes les sessions.
 * Retourne null si la condition d'affichage n'est pas remplie (< 5 matchs / 30j).
 */
export function computeWinRateSnapshotData(
  sessions: SessionWithMatches[],
  now: Date = new Date(),
): WinRateSnapshot | null {
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(now.getDate() - 60);

  const currentMatches = collectMatchesInWindow(sessions, thirtyDaysAgo, now);
  if (currentMatches.length < WINRATE_MIN_MATCHES) return null;

  const previousMatches = collectMatchesInWindow(sessions, sixtyDaysAgo, thirtyDaysAgo);
  const currentRate = computeWinRatePercent(currentMatches);

  let trendPercent: number | null = null;
  let trendDirection: TrendDirection = null;

  if (previousMatches.length >= WINRATE_MIN_PREVIOUS) {
    const previousRate = computeWinRatePercent(previousMatches);
    trendPercent = currentRate - previousRate;
    if (Math.abs(trendPercent) < WINRATE_STABLE_THRESHOLD) {
      trendDirection = 'stable';
    } else if (trendPercent > 0) {
      trendDirection = 'up';
    } else {
      trendDirection = 'down';
    }
  }

  return {
    winRatePercent: currentRate,
    matchCount: currentMatches.length,
    trendPercent,
    trendDirection,
  };
}

// ── Orchestrateur principal ───────────────────────────────────────────────────

/**
 * À appeler depuis l'écran de fin de séance (session/new.tsx),
 * juste après que storage.addSession() a enregistré la séance.
 *
 * Exemple d'usage dans le wizard :
 *
 *   const payload = await computeSharingPayload(allSessions);
 *   navigation.navigate('ShareScreen', { payload });
 *
 * @param allSessions - Toutes les sessions de l'utilisateur APRÈS ajout
 *                      (lire depuis storage.getSessions())
 */
export async function computeSharingPayload(
  allSessions: { createdAt: string }[],
  overrides: SharingDebugOverrides = {}
): Promise<SharingPayload> {

  // 1. Calculer les stats
  const totalSessions    = allSessions.length;
  const currentWeeksStreak  = overrides.weeksStreak ?? computeWeeksStreak(allSessions);
  const sessionsThisWeek    = overrides.sessionsThisWeek ?? computeSessionsThisWeek(allSessions);
  const isLowSessionRate    = sessionsThisWeek <= 1;

  // 2. Détecter les paliers atteints
  const { cards } = detectTriggeredCards({
    totalSessions,
    currentWeeksStreak,
    sessionsThisWeek,
    isLowSessionRate,
  });

  // 2.5. Écarter les paliers déjà affichés dans le même contexte, pour éviter
  //      qu'une carte redémarre à chaque nouvelle séance tant que le palier
  //      n'a pas réellement changé (ex : 2 séances la même semaine avec un
  //      streak de semaines qui reste à la même valeur).
  const currentWeek = getISOWeekString(new Date());
  let lastShown: SpecialCardsLastShown = {};
  try {
    const storedLastShown = await AsyncStorage.getItem(SPECIAL_CARDS_LAST_SHOWN_KEY);
    if (storedLastShown) lastShown = JSON.parse(storedLastShown);
  } catch {
    // AsyncStorage indisponible → on continue sans historique (au pire une
    // carte pourra être réaffichée)
  }

  const newCards = cards.filter((card) => {
    if (card.cardType === 'milestone') {
      return lastShown.milestone !== card.value;
    }
    if (card.cardType === 'weeksStreak') {
      return !(lastShown.weeksStreak?.value === card.value && lastShown.weeksStreak?.week === currentWeek);
    }
    return !(lastShown.sessionsPerWeek?.value === card.value && lastShown.sessionsPerWeek?.week === currentWeek);
  });

  if (newCards.length > 0) {
    const updatedLastShown: SpecialCardsLastShown = { ...lastShown };
    for (const card of newCards) {
      if (card.cardType === 'milestone') {
        updatedLastShown.milestone = card.value;
      } else if (card.cardType === 'weeksStreak') {
        updatedLastShown.weeksStreak = { value: card.value, week: currentWeek };
      } else {
        updatedLastShown.sessionsPerWeek = { value: card.value, week: currentWeek };
      }
    }

    try {
      await AsyncStorage.setItem(SPECIAL_CARDS_LAST_SHOWN_KEY, JSON.stringify(updatedLastShown));
    } catch {
      // silencieux
    }
  }

  // 3. Générer les messages pour les cartes spéciales dont le niveau le permet
  //    (les cartes en dessous de MIN_MESSAGE_LEVEL sont quand même incluses,
  //    mais sans message motivationnel)
  let specialCards: SpecialCard[] = [];

  if (newCards.length > 0) {
    let recentIds: number[] = [];
    try {
      const stored = await AsyncStorage.getItem(RECENT_MESSAGE_IDS_KEY);
      if (stored) recentIds = JSON.parse(stored);
    } catch {
      // AsyncStorage indisponible → on continue sans historique
    }

    let updatedIds = [...recentIds];
    for (const card of newCards) {
      if (card.level >= MIN_MESSAGE_LEVEL) {
        const message = generateMessage(card, updatedIds);
        specialCards.push({ ...card, message });
        updatedIds = updateRecentMessageIds(updatedIds, message.messageId);
      } else {
        specialCards.push({ ...card });
      }
    }

    try {
      await AsyncStorage.setItem(RECENT_MESSAGE_IDS_KEY, JSON.stringify(updatedIds));
    } catch {
      // silencieux
    }
  }

  // 4. Win Rate Snapshot — uniquement pour les séances de type match / jeu_libre
  const sessionTypeEligible =
    overrides.currentSessionType === undefined ||
    WINRATE_ELIGIBLE_SESSION_TYPES.includes(overrides.currentSessionType);
  const winRateSnapshot = sessionTypeEligible
    ? await computeWinRateSnapshotIfEligible(allSessions)
    : null;

  return { specialCards, ...(winRateSnapshot ? { winRateSnapshot } : {}) };
}

/**
 * Retourne la date du dernier affichage de la carte Win Rate,
 * ou null si elle n'a jamais été affichée.
 * Utile pour l'écran de debug.
 */
export async function getWinRateLastShown(): Promise<Date | null> {
  try {
    const raw = await AsyncStorage.getItem(WINRATE_LAST_SHOWN_KEY);
    return raw ? new Date(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Efface le throttle de la carte Win Rate.
 * La prochaine génération de payload pourra déclencher la carte immédiatement.
 * Réservé au debug.
 */
export async function resetWinRateThrottle(): Promise<void> {
  await AsyncStorage.removeItem(WINRATE_LAST_SHOWN_KEY);
}

/**
 * Efface l'historique anti-doublon des cartes de palier (milestone /
 * weeksStreak / sessionsPerWeek). La prochaine génération de payload pourra
 * redéclencher un palier déjà vu. Réservé au debug.
 */
export async function resetSpecialCardsHistory(): Promise<void> {
  await AsyncStorage.removeItem(SPECIAL_CARDS_LAST_SHOWN_KEY);
}

/**
 * Retourne un WinRateSnapshot si toutes les conditions sont remplies :
 *   - 5+ matchs dans les 30 derniers jours
 *   - La carte n'a pas été affichée depuis au moins 7 jours
 * Met à jour la date de dernier affichage si la carte est déclenchée.
 */
async function computeWinRateSnapshotIfEligible(
  sessions: { createdAt: string; matches?: Match[] }[],
): Promise<WinRateSnapshot | null> {
  const now = new Date();
  const snapshot = computeWinRateSnapshotData(sessions, now);
  if (!snapshot) return null;

  // Throttle : ne pas afficher plus d'une fois par semaine
  try {
    const lastShownRaw = await AsyncStorage.getItem(WINRATE_LAST_SHOWN_KEY);
    if (lastShownRaw) {
      const lastShown = new Date(lastShownRaw);
      const daysSince = (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < WINRATE_THROTTLE_DAYS) return null;
    }

    await AsyncStorage.setItem(WINRATE_LAST_SHOWN_KEY, now.toISOString());
  } catch {
    // AsyncStorage indisponible → on affiche quand même
  }

  return snapshot;
}

// ─────────────────────────────────────────────────────────────────────────────
// GUIDE D'INTÉGRATION POUR CODEX
// ─────────────────────────────────────────────────────────────────────────────
//
// STRUCTURE DE FICHIERS À CRÉER :
//
//   src/
//   ├── data/
//   │   └── sharingData.ts          ← données converties du sheet (fourni)
//   └── services/
//       ├── sharingTrigger.ts       ← détection des paliers (fourni)
//       ├── sharingMessage.ts       ← sélection + génération du message (fourni)
//       └── sharingOrchestrator.ts  ← ce fichier, point d'entrée unique (fourni)
//
// ─────────────────────────────────────────────────────────────────────────────
//
// INTÉGRATION DANS LE WIZARD (session/new.tsx) :
//
//   // Étape 3, après enregistrement de la séance
//   await storage.addSession(newSession);
//   const allSessions = await storage.getSessions();
//   const sharingPayload = await computeSharingPayload(allSessions);
//
//   // Naviguer vers l'écran de partage en passant le payload
//   router.push({
//     pathname: '/session/share',
//     params: { payload: JSON.stringify(sharingPayload) },
//   });
//
// ─────────────────────────────────────────────────────────────────────────────
//
// ÉCRAN DE PARTAGE (session/share.tsx) :
//
//   const { payload: payloadStr } = useLocalSearchParams();
//   const payload: SharingPayload = JSON.parse(payloadStr);
//
//   if (payload.specialCards.length > 0) {
//     // Afficher les cartes spéciales (streak / milestone) EN PREMIER
//     // puis les 3 cartes génériques en swipe derrière
//   } else {
//     // Afficher uniquement les 3 cartes génériques
//   }
//
// ─────────────────────────────────────────────────────────────────────────────
//
// STRUCTURE D'UNE SpecialCard (pour l'UI) :
//
//   {
//     cardType: 'milestone',        // 'weeksStreak' | 'sessionsPerWeek' | 'milestone'
//     value: 50,                    // valeur atteinte — afficher en grand sur la carte
//     level: 2,                     // 1-5 — peut servir pour des variations visuelles
//     message: {                    // absent si level < MIN_MESSAGE_LEVEL (2) :
//       text: "50 séances. À ce rythme, Momota commence à s'inquiéter.", // la carte
//       messageId: 6,                                                   // s'affiche
//       playerName: 'Kento Momota', // null si pas de joueur dans le message // sans texte
//     }
//   }
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LIBELLÉS D'AFFICHAGE selon cardType :
//
//   weeksStreak     → "{value} semaines consécutives"
//   sessionsPerWeek → "{value} séances cette semaine"
//   milestone       → "Séance n°{value}"
//
// ─────────────────────────────────────────────────────────────────────────────
