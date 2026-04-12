// ─────────────────────────────────────────────────────────────────────────────
// src/services/sharingMessage.ts
//
// Étape 3 — Sélection et génération du message.
// Prend un TriggeredCard, choisit un message adapté, tire un joueur au sort
// si nécessaire, et retourne la chaîne finale prête à afficher.
// ─────────────────────────────────────────────────────────────────────────────

import {
  MESSAGES,
  PLAYERS,
  type CardType,
  type MessageLevel,
  type MessageType,
  type ShareMessage,
} from '../data/sharingData';
import type { TriggeredCard } from './sharingTrigger';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GeneratedMessage {
  text: string;           // message final, *player_name* déjà substitué
  messageId: number;      // id du message sélectionné (pour analytics / anti-répétition)
  playerName: string | null; // joueur tiré, null si pas de joueur dans le message
}

// ── Tirage pondéré d'un joueur ────────────────────────────────────────────────

function pickPlayer(): string {
  const totalWeight = PLAYERS.reduce((sum, p) => sum + p.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const player of PLAYERS) {
    rand -= player.weight;
    if (rand <= 0) return player.name;
  }
  return PLAYERS[0].name; // fallback
}

// ── Mapping CardType → MessageType ───────────────────────────────────────────

function cardTypeToMessageType(cardType: CardType): MessageType {
  switch (cardType) {
    case 'weeksStreak':     return 'weeks_streak';
    case 'sessionsPerWeek': return 'sessions_per_week';
    case 'milestone':       return 'milestones';
  }
}

// ── Sélection du message ──────────────────────────────────────────────────────

/**
 * Filtre les messages éligibles selon :
 *   - le niveau du palier atteint (±1 de tolérance pour élargir le pool)
 *   - le type : messages universels (null) + messages spécifiques au cardType
 *
 * Exclut les ids déjà utilisés récemment pour éviter les répétitions.
 */
function selectMessage(
  level: MessageLevel,
  cardType: CardType,
  recentlyUsedIds: number[] = []
): ShareMessage {
  const targetType = cardTypeToMessageType(cardType);

  // Pool : messages universels + messages du type exact
  // Niveau : exact ou ±1 pour avoir assez de choix
  const pool = MESSAGES.filter((m) => {
    const typeMatch = m.type === null || m.type === targetType;
    const levelMatch = Math.abs(m.level - level) <= 1;
    const notRecent = !recentlyUsedIds.includes(m.id);
    return typeMatch && levelMatch && notRecent;
  });

  // Si le pool est vide (trop de messages récents), on ignore le filtre anti-répétition
  const finalPool = pool.length > 0
    ? pool
    : MESSAGES.filter((m) => {
        const typeMatch = m.type === null || m.type === targetType;
        const levelMatch = Math.abs(m.level - level) <= 1;
        return typeMatch && levelMatch;
      });

  // Tirage aléatoire dans le pool
  const index = Math.floor(Math.random() * finalPool.length);
  return finalPool[index];
}

// ── Fonction principale ───────────────────────────────────────────────────────

/**
 * Génère le message final pour une carte déclenchée.
 *
 * @param card        - La carte déclenchée (issue de detectTriggeredCards)
 * @param recentIds   - IDs des messages affichés récemment (stockés en AsyncStorage)
 *                      Permet d'éviter les répétitions sur les dernières ~10 cartes.
 */
export function generateMessage(
  card: TriggeredCard,
  recentIds: number[] = []
): GeneratedMessage {
  const selected = selectMessage(card.level, card.cardType, recentIds);

  let playerName: string | null = null;
  let text = selected.template;

  if (selected.hasPlayer) {
    playerName = pickPlayer();
    text = text.replace('*player_name*', playerName);
  }

  return {
    text,
    messageId: selected.id,
    playerName,
  };
}

// ── Gestion de l'historique anti-répétition ───────────────────────────────────
// À utiliser avec AsyncStorage dans storage.ts

const MAX_RECENT = 10; // nb de messages à mémoriser

/**
 * Ajoute un messageId à l'historique et retourne le nouvel historique
 * (tronqué à MAX_RECENT). À persister en AsyncStorage.
 */
export function updateRecentMessageIds(
  currentIds: number[],
  newId: number
): number[] {
  const updated = [newId, ...currentIds.filter((id) => id !== newId)];
  return updated.slice(0, MAX_RECENT);
}
