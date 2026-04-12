// ─────────────────────────────────────────────────────────────────────────────
// src/services/sharingOrchestrator.ts
//
// Étape 4 — Point d'entrée unique.
// Orchestre les étapes 2 et 3. C'est la seule fonction que l'écran de fin
// de séance doit appeler.
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectTriggeredCards, computeWeeksStreak, computeSessionsThisWeek } from './sharingTrigger';
import { generateMessage, updateRecentMessageIds } from './sharingMessage';
import type { TriggeredCard } from './sharingTrigger';
import type { GeneratedMessage } from './sharingMessage';

// ── Clés AsyncStorage ─────────────────────────────────────────────────────────

const RECENT_MESSAGE_IDS_KEY = 'smashlog_recent_message_ids';

// ── Types exposés à l'UI ──────────────────────────────────────────────────────

export interface SpecialCard {
  cardType: 'weeksStreak' | 'sessionsPerWeek' | 'milestone';
  value: number;          // valeur du palier (ex: 7, 50, 100)
  level: 1 | 2 | 3 | 4 | 5;
  message: GeneratedMessage;
}

export interface SharingPayload {
  specialCards: SpecialCard[]; // vide = pas de carte spéciale, afficher cartes génériques
}

export interface SharingDebugOverrides {
  weeksStreak?: number;
  sessionsThisWeek?: number;
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

  if (cards.length === 0) {
    return { specialCards: [] };
  }

  // 3. Récupérer l'historique anti-répétition
  let recentIds: number[] = [];
  try {
    const stored = await AsyncStorage.getItem(RECENT_MESSAGE_IDS_KEY);
    if (stored) recentIds = JSON.parse(stored);
  } catch {
    // AsyncStorage indisponible → on continue sans historique
  }

  // 4. Générer un message pour chaque carte déclenchée
  const specialCards: SpecialCard[] = [];
  let updatedIds = [...recentIds];

  for (const card of cards) {
    const message = generateMessage(card, updatedIds);
    specialCards.push({ ...card, message });
    updatedIds = updateRecentMessageIds(updatedIds, message.messageId);
  }

  // 5. Persister le nouvel historique
  try {
    await AsyncStorage.setItem(RECENT_MESSAGE_IDS_KEY, JSON.stringify(updatedIds));
  } catch {
    // silencieux
  }

  return { specialCards };
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
//     message: {
//       text: "50 séances. À ce rythme, Momota commence à s'inquiéter.",
//       messageId: 6,
//       playerName: 'Kento Momota', // null si pas de joueur dans le message
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
