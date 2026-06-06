import AsyncStorage from "@react-native-async-storage/async-storage";

import { Session } from "@/src/types/session";

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
