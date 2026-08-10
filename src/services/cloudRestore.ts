import type { Tables } from "@/src/lib/supabase";
import { supabase } from "@/src/lib/supabase";
import { getScheduledSlots, replaceScheduledSlotsLocal } from "@/src/services/onboarding";
import { getProfile, saveProfileLocal } from "@/src/services/profile";
import {
  fromExerciseRow,
  fromMatchRow,
  fromPlanningRow,
  fromPlayerRow,
  fromSessionRow,
} from "@/src/services/supabaseMappers";
import {
  getExercises,
  getPlayers,
  getSessions,
  replaceExercises,
  replacePlayers,
  replaceSessions,
} from "@/src/services/storage";

/**
 * Restauration cloud -> local : sens inverse de la migration/synchro
 * temps réel (qui ne poussent que du local vers Supabase). Sans ce module,
 * un appareil dont le stockage local est vide (nouvelle installation,
 * nouvel appareil, ou stockage vidé après une suppression de compte) n'a
 * aucun moyen de retrouver les données pourtant toujours présentes côté
 * Supabase — cf. discussion "changer de compte / supprimer un compte fait
 * disparaître les données de l'autre compte encore actif".
 *
 * Écrit via les variantes "Local" (replaceScheduledSlotsLocal,
 * saveProfileLocal) et les replaceX de storage.ts, qui n'émettent aucune
 * écriture Supabase — inutile de repousser ce qu'on vient de lire.
 */

export interface RestoreCounts {
  players: number;
  exercises: number;
  planning: number;
  sessions: number;
  matches: number;
}

/** true si le stockage local ne contient aucune donnée exploitable. */
export async function isLocalDataEmpty(): Promise<boolean> {
  const [sessions, players, exercises, planning] = await Promise.all([
    getSessions(),
    getPlayers(),
    getExercises(),
    getScheduledSlots(),
  ]);

  return sessions.length === 0 && players.length === 0 && exercises.length === 0 && planning.length === 0;
}

function groupMatchesBySession(rows: Tables<"matches">[]): Map<string, Tables<"matches">[]> {
  const bySession = new Map<string, Tables<"matches">[]>();

  for (const row of rows) {
    if (!row.session_id) continue;
    const list = bySession.get(row.session_id) ?? [];
    list.push(row);
    bySession.set(row.session_id, list);
  }

  // L'ordre des matchs dans une séance n'est pas stocké explicitement côté
  // Supabase (l'id est un hash déterministe de session_id+index, pas
  // réversible) : created_at (posé à l'insertion, jamais modifié ensuite)
  // reconstruit un ordre fiable puisque les matchs d'une séance sont
  // toujours insérés séquentiellement (cf. syncSessionUpsert).
  for (const list of bySession.values()) {
    list.sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
  }

  return bySession;
}

/**
 * Lit toutes les données de `userId` depuis Supabase et remplace
 * intégralement le contenu local (AsyncStorage) par ce qui est trouvé côté
 * cloud. Le profil ne remplace que le pseudo (photo jamais synchronisée).
 */
export async function restoreFromCloud(userId: string): Promise<RestoreCounts> {
  const [playersRes, exercisesRes, planningRes, sessionsRes, matchesRes, profileRes] = await Promise.all([
    supabase.from("players").select("*").eq("user_id", userId),
    supabase.from("exercises").select("*").eq("user_id", userId),
    supabase.from("planning_slots").select("*").eq("user_id", userId),
    supabase.from("sessions").select("*").eq("user_id", userId),
    supabase.from("matches").select("*").eq("user_id", userId),
    supabase.from("profiles").select("username").eq("id", userId).maybeSingle(),
  ]);

  for (const result of [playersRes, exercisesRes, planningRes, sessionsRes, matchesRes, profileRes]) {
    if (result.error) throw result.error;
  }

  const players = (playersRes.data ?? []).map(fromPlayerRow);
  const exercises = (exercisesRes.data ?? []).map(fromExerciseRow);
  const planning = (planningRes.data ?? []).map(fromPlanningRow);

  const matchesBySession = groupMatchesBySession(matchesRes.data ?? []);
  const sessions = (sessionsRes.data ?? []).map((row) =>
    fromSessionRow(row, (matchesBySession.get(row.id) ?? []).map(fromMatchRow)),
  );

  await Promise.all([
    replacePlayers(players),
    replaceExercises(exercises),
    replaceScheduledSlotsLocal(planning),
    replaceSessions(sessions),
  ]);

  const cloudUsername = profileRes.data?.username?.trim();
  if (cloudUsername) {
    const currentProfile = await getProfile();
    await saveProfileLocal({ ...currentProfile, username: cloudUsername });
  }

  return {
    players: players.length,
    exercises: exercises.length,
    planning: planning.length,
    sessions: sessions.length,
    matches: (matchesRes.data ?? []).length,
  };
}
