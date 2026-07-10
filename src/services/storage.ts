import AsyncStorage from "@react-native-async-storage/async-storage";

import { Exercise, Player } from "@/src/types/index";
import { Session } from "@/src/types/session";

export const SESSIONS_KEY = "badminton_journal_sessions";
export const PLAYERS_KEY = "badminton_journal_players";
export const EXERCISES_KEY = "badminton_journal_exercises";
export const CUSTOM_LABELS_KEY = "badminton_journal_custom_labels";

async function persistSessions(sessions: Session[]) {
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function getSessions(): Promise<Session[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  if (!raw) {
    return [];
  }

  const sessions = JSON.parse(raw) as Session[];
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

// ── Joueurs ──────────────────────────────────────────────────────────────────

async function persistPlayers(players: Player[]) {
  await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
}

export async function getPlayers(): Promise<Player[]> {
  const raw = await AsyncStorage.getItem(PLAYERS_KEY);
  if (!raw) {
    return [];
  }

  const players = JSON.parse(raw) as Player[];
  return players.sort((left, right) => left.name.localeCompare(right.name));
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const players = await getPlayers();
  return players.find((player) => player.id === id) ?? null;
}

export async function addPlayer(player: Player): Promise<void> {
  const players = await getPlayers();
  await persistPlayers([...players, player]);
}

export async function updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
  const players = await getPlayers();
  const updated = players.map((player) => (player.id === id ? { ...player, ...updates } : player));
  await persistPlayers(updated);
}

export async function deletePlayer(id: string): Promise<void> {
  const players = await getPlayers();
  await persistPlayers(players.filter((player) => player.id !== id));
}

/**
 * Propage un nouveau nom de joueur dans les matchs (legacy) qui le référencent
 * uniquement par chaîne de caractères (`adversaire` / `partenaire`), pour les
 * séances où le match n'a pas encore de référence par id.
 */
export async function renamePlayerInSessions(playerId: string, newName: string): Promise<void> {
  const sessions = await getSessions();

  const updated = sessions.map((session) => {
    if (!session.matches || session.matches.length === 0) {
      return session;
    }

    const matches = session.matches.map((match) => {
      let next = match;

      if (match.adversaireId === playerId) {
        next = { ...next, adversaire: newName };
      }
      if (match.partenaireId === playerId) {
        next = { ...next, partenaire: newName };
      }

      return next;
    });

    return { ...session, matches };
  });

  await persistSessions(updated);
}

// ── Exercices ────────────────────────────────────────────────────────────────

async function persistExercises(exercises: Exercise[]) {
  await AsyncStorage.setItem(EXERCISES_KEY, JSON.stringify(exercises));
}

export async function getExercises(): Promise<Exercise[]> {
  const raw = await AsyncStorage.getItem(EXERCISES_KEY);
  if (!raw) {
    return [];
  }

  const exercises = JSON.parse(raw) as Exercise[];
  return exercises.sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const exercises = await getExercises();
  return exercises.find((exercise) => exercise.id === id) ?? null;
}

export async function addExercise(exercise: Exercise): Promise<void> {
  const exercises = await getExercises();
  await persistExercises([exercise, ...exercises]);
}

export async function updateExercise(id: string, updates: Partial<Exercise>): Promise<void> {
  const exercises = await getExercises();
  const updated = exercises.map((exercise) =>
    exercise.id === id ? { ...exercise, ...updates } : exercise,
  );
  await persistExercises(updated);
}

export async function deleteExercise(id: string): Promise<void> {
  const exercises = await getExercises();
  await persistExercises(exercises.filter((exercise) => exercise.id !== id));
}

// ── Labels personnalisés (exercices) ──────────────────────────────────────────

export async function getCustomLabels(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(CUSTOM_LABELS_KEY);
  if (!raw) {
    return [];
  }

  return JSON.parse(raw) as string[];
}

export async function saveCustomLabels(labels: string[]): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_LABELS_KEY, JSON.stringify(Array.from(new Set(labels))));
}
