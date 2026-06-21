import AsyncStorage from "@react-native-async-storage/async-storage";

import { Session } from "@/src/types/session";
import { Exercise } from "@/src/types/index";

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
