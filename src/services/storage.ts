import AsyncStorage from "@react-native-async-storage/async-storage";

import { Session } from "@/src/types/session";
import { Exercise, Player } from "@/src/types/index";
import { createId } from "@/src/utils/id";

export const SESSIONS_KEY = "badminton_journal_sessions";

async function persistSessions(sessions: Session[]) {
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function getSessions(): Promise<Session[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  if (!raw) {
    return [];
  }

  const sessions = (JSON.parse(raw) as Session[]).map((session) => ({
    ...session,
    matches: session.matches ?? [],
    nextIntention: session.nextIntention ?? "",
    freeNotes: session.freeNotes ?? "",
    exerciseIds: session.exerciseIds ?? [],
  }));
  return sessions.sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export async function addSession(session: Session): Promise<void> {
  const sessions = await getSessions();
  const updated = [session, ...sessions].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  await persistSessions(updated);
}

export async function updateSession(id: string, updates: Partial<Session>): Promise<void> {
  const sessions = await getSessions();
  const updated = sessions.map((session) =>
    session.id === id ? { ...session, ...updates } : session,
  );
  await persistSessions(updated);
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions();
  await persistSessions(sessions.filter((session) => session.id !== id));
}

export async function getSessionById(id: string): Promise<Session | null> {
  const sessions = await getSessions();
  return sessions.find((session) => session.id === id) ?? null;
}

// ─── Exercises ───────────────────────────────────────────────────────────────

export const EXERCISES_KEY = "smashlog_exercises";

function migrateExercise(raw: Partial<Exercise>): Exercise {
  return {
    id: raw.id ?? "",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    name: raw.name ?? "",
    description: raw.description ?? "",
    playersCount: raw.playersCount ?? 2,
    labels: raw.labels ?? [],
    ...(raw.durationMinutes !== undefined && { durationMinutes: raw.durationMinutes }),
    ...(raw.level !== undefined && { level: raw.level }),
    ...(raw.orientation !== undefined && { orientation: raw.orientation }),
    ...(raw.attentionPoints !== undefined && { attentionPoints: raw.attentionPoints }),
    ...(raw.variantEasier !== undefined && { variantEasier: raw.variantEasier }),
    ...(raw.variantHarder !== undefined && { variantHarder: raw.variantHarder }),
    ...(raw.source !== undefined && { source: raw.source }),
    ...(raw.photos !== undefined && { photos: raw.photos }),
  };
}

async function persistExercises(exercises: Exercise[]): Promise<void> {
  await AsyncStorage.setItem(EXERCISES_KEY, JSON.stringify(exercises));
}

export async function getExercises(): Promise<Exercise[]> {
  const raw = await AsyncStorage.getItem(EXERCISES_KEY);
  if (!raw) return [];
  return (JSON.parse(raw) as Partial<Exercise>[]).map(migrateExercise);
}

export async function addExercise(exercise: Exercise): Promise<void> {
  const exercises = await getExercises();
  await persistExercises([...exercises, exercise]);
}

export async function updateExercise(id: string, updates: Partial<Exercise>): Promise<void> {
  const exercises = await getExercises();
  const updated = exercises.map((ex) => (ex.id === id ? { ...ex, ...updates } : ex));
  await persistExercises(updated);
}

export async function deleteExercise(id: string): Promise<void> {
  const exercises = await getExercises();
  await persistExercises(exercises.filter((ex) => ex.id !== id));
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const exercises = await getExercises();
  return exercises.find((ex) => ex.id === id) ?? null;
}

// ─── Custom Labels ────────────────────────────────────────────────────────────

export const CUSTOM_LABELS_KEY = "smashlog_custom_labels";

export async function getCustomLabels(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(CUSTOM_LABELS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as string[];
}

export async function saveCustomLabels(labels: string[]): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_LABELS_KEY, JSON.stringify(labels));
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function importSessions(incoming: Session[]): Promise<{ imported: number; skipped: number }> {
  const existing = await getSessions();
  const existingIds = new Set(existing.map((s) => s.id));

  const toAdd = incoming.filter((s) => !existingIds.has(s.id));
  const skipped = incoming.length - toAdd.length;

  if (toAdd.length > 0) {
    const merged = [...existing, ...toAdd].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
    await persistSessions(merged);
  }

  return { imported: toAdd.length, skipped };
}

// ─── Players ─────────────────────────────────────────────────────────────────

export const PLAYERS_KEY = "smashlog_players";
export const PLAYERS_MIGRATION_FLAG = "smashlog_players_migration_done";

async function persistPlayers(players: Player[]): Promise<void> {
  await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
}

export async function getPlayers(): Promise<Player[]> {
  const raw = await AsyncStorage.getItem(PLAYERS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as Player[];
}

export async function addPlayer(player: Player): Promise<void> {
  const players = await getPlayers();
  await persistPlayers([...players, player]);
}

export async function updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
  const players = await getPlayers();
  const updated = players.map((p) => (p.id === id ? { ...p, ...updates } : p));
  await persistPlayers(updated);
}

export async function deletePlayer(id: string): Promise<void> {
  const players = await getPlayers();
  await persistPlayers(players.filter((p) => p.id !== id));
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const players = await getPlayers();
  return players.find((p) => p.id === id) ?? null;
}

/**
 * Propage le nouveau nom d'un joueur dans toutes les sessions qui le référencent.
 * À appeler APRÈS updatePlayer(), afin que getPlayers() retourne déjà le nom à jour.
 */
export async function renamePlayerInSessions(playerId: string, newName: string): Promise<void> {
  const [sessions, allPlayers] = await Promise.all([getSessions(), getPlayers()]);

  // Carte id → nom (le nouveau nom est déjà présent car updatePlayer() a été appelé avant)
  const nameMap = new Map(allPlayers.map((p) => [p.id, p.name]));
  // Sécurité : on s'assure que le nouveau nom est bien présent même si le cache est légèrement en retard
  nameMap.set(playerId, newName);

  for (const session of sessions) {
    if (!session.matches?.length) continue;

    let sessionChanged = false;
    const updatedMatches = session.matches.map((match) => {
      let updated = { ...match };
      let changed = false;

      // Adversaire(s) ─ double/mixte : on reconstruit la chaîne à partir de tous les ids
      if (match.adversaireIds?.includes(playerId)) {
        const names = match.adversaireIds
          .map((id) => nameMap.get(id))
          .filter((n): n is string => Boolean(n));
        if (names.length > 0) {
          updated.adversaire = names.join(" / ");
          changed = true;
        }
      } else if (match.adversaireId === playerId) {
        // Simple : un seul adversaire
        updated.adversaire = newName;
        changed = true;
      }

      // Partenaire
      if (match.partenaireId === playerId) {
        updated.partenaire = newName;
        changed = true;
      }

      if (changed) sessionChanged = true;
      return updated;
    });

    if (sessionChanged) {
      await updateSession(session.id, { matches: updatedMatches });
    }
  }
}

export async function migratePlayersFromMatches(): Promise<void> {
  const alreadyDone = await AsyncStorage.getItem(PLAYERS_MIGRATION_FLAG);
  if (alreadyDone) return;

  const sessions = await getSessions();
  const players = await getPlayers();

  // Index des joueurs existants par nom normalisé
  const playersByNorm = new Map<string, Player>(
    players.map((p) => [p.name.trim().toLowerCase(), p]),
  );

  function findOrCreatePlayer(name: string): Player {
    const norm = name.trim().toLowerCase();
    if (playersByNorm.has(norm)) {
      return playersByNorm.get(norm)!;
    }
    const newPlayer: Player = {
      id: createId(),
      createdAt: new Date().toISOString(),
      name: name.trim(),
    };
    playersByNorm.set(norm, newPlayer);
    return newPlayer;
  }

  let sessionsChanged = false;

  const updatedSessions = sessions.map((session) => {
    if (!session.matches || session.matches.length === 0) return session;

    let matchesChanged = false;
    const updatedMatches = session.matches.map((match) => {
      let updated = { ...match };
      let changed = false;

      if (match.adversaire?.trim() && !match.adversaireId) {
        const player = findOrCreatePlayer(match.adversaire);
        updated.adversaireId = player.id;
        changed = true;
      }

      if (match.partenaire?.trim() && !match.partenaireId) {
        const player = findOrCreatePlayer(match.partenaire);
        updated.partenaireId = player.id;
        changed = true;
      }

      if (changed) matchesChanged = true;
      return updated;
    });

    if (matchesChanged) {
      sessionsChanged = true;
      return { ...session, matches: updatedMatches };
    }
    return session;
  });

  // Persiste les nouveaux joueurs créés pendant la migration
  const allPlayers = Array.from(playersByNorm.values());
  await persistPlayers(allPlayers);

  // Persiste les sessions mises à jour uniquement si nécessaire
  if (sessionsChanged) {
    for (const session of updatedSessions) {
      const original = sessions.find((s) => s.id === session.id);
      if (original !== session) {
        await updateSession(session.id, { matches: session.matches });
      }
    }
  }

  await AsyncStorage.setItem(PLAYERS_MIGRATION_FLAG, "true");
}
