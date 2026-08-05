import { getAuthUserId, syncDelete, syncUpsert } from "@/src/services/cloudSync";
import type { ScheduledSlot } from "@/src/services/onboarding";
import {
  matchDeterministicId,
  planningSlotRowId,
  toExerciseRow,
  toMatchRow,
  toPlanningRow,
  toPlayerRow,
  toSessionRow,
} from "@/src/services/supabaseMappers";
import { Exercise, Player } from "@/src/types/index";
import { Match, Session } from "@/src/types/session";

/**
 * Fonctions de synchro "haut niveau" appelées depuis les services d'écriture
 * locale (src/services/storage.ts, profile.ts, onboarding.ts) juste après
 * chaque persistance AsyncStorage réussie — toujours en fire-and-forget
 * (`void syncXxx(...)`), jamais awaited par l'UI (contrainte du ticket).
 *
 * Chaque fonction est un no-op silencieux si personne n'est connecté
 * (vérifié ici ET dans syncUpsert/syncDelete, cf. cloudSync.ts).
 */

// ─── Players ───────────────────────────────────────────────────────────────

export async function syncPlayerUpsert(player: Player, operation: "insert" | "update" = "update"): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;
  await syncUpsert("players", toPlayerRow(player, userId), operation);
}

export async function syncPlayerDelete(id: string): Promise<void> {
  await syncDelete("players", id);
}

// ─── Exercises ─────────────────────────────────────────────────────────────

export async function syncExerciseUpsert(exercise: Exercise, operation: "insert" | "update" = "update"): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;
  await syncUpsert("exercises", toExerciseRow(exercise, userId), operation);
}

export async function syncExerciseDelete(id: string): Promise<void> {
  await syncDelete("exercises", id);
}

// ─── Sessions (+ matchs imbriqués) ──────────────────────────────────────────

/**
 * Synchronise une séance et ses matchs. `previousMatches` (l'état AVANT la
 * mise à jour, fourni par updateSession()) sert uniquement à détecter les
 * matchs retirés de la séance, pour les supprimer aussi côté Supabase — les
 * matchs n'ont pas d'id local propre, seulement un id déterministe dérivé
 * de `session.id` + index (cf. supabaseMappers.ts).
 */
export async function syncSessionUpsert(
  session: Session,
  previousMatches: Match[] | undefined,
  operation: "insert" | "update" = "update",
): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  await syncUpsert("sessions", toSessionRow(session, userId), operation);

  const currentMatches = session.matches ?? [];
  for (let index = 0; index < currentMatches.length; index += 1) {
    await syncUpsert("matches", toMatchRow(session, currentMatches[index], index, userId), operation);
  }

  const currentIds = new Set(currentMatches.map((_, index) => matchDeterministicId(session.id, index)));
  const previousCount = previousMatches?.length ?? 0;
  for (let index = 0; index < previousCount; index += 1) {
    const id = matchDeterministicId(session.id, index);
    if (!currentIds.has(id)) {
      await syncDelete("matches", id);
    }
  }
}

/** Supprime une séance et tous ses matchs dans Supabase. */
export async function syncSessionDelete(session: Session): Promise<void> {
  const matches = session.matches ?? [];
  for (let index = 0; index < matches.length; index += 1) {
    await syncDelete("matches", matchDeterministicId(session.id, index));
  }
  await syncDelete("sessions", session.id);
}

// ─── Planning (remplacement intégral de la liste) ──────────────────────────

/**
 * saveScheduledSlots() remplace toute la liste locale en un seul appel (pas
 * d'add/update/delete unitaires côté planning) : on upsert tout ce qui est
 * présent dans `next`, et on supprime dans Supabase tout id qui était dans
 * `previous` mais a disparu de `next`.
 */
export async function syncPlanningReplace(previous: ScheduledSlot[], next: ScheduledSlot[]): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  const nextIds = new Set(next.map((slot) => slot.id));
  for (const slot of previous) {
    if (!nextIds.has(slot.id)) {
      // Doit cibler le même id que celui réellement écrit par toPlanningRow()
      // (déterministe si l'id local est un ancien format non-uuid), sinon le
      // delete vise une ligne qui n'a jamais existé sous cet id et plante
      // avec une erreur Postgres 22P02 (cf. planningSlotRowId).
      await syncDelete("planning_slots", planningSlotRowId(slot.id));
    }
  }

  for (const slot of next) {
    await syncUpsert("planning_slots", toPlanningRow(slot, userId), "update");
  }
}

// ─── Profil ─────────────────────────────────────────────────────────────────

/**
 * Ne synchronise que le pseudo. `photoUri` est un chemin de fichier local
 * (file://...), jamais une URL publique : le pousser tel quel dans
 * `profiles.photo_url` produirait un lien inutilisable depuis un autre
 * appareil. L'upload de photo vers Supabase Storage est hors périmètre de
 * ce ticket.
 */
export async function syncProfileUpsert(username: string): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId || !username.trim()) return;
  await syncUpsert("profiles", { id: userId, username: username.trim() }, "update");
}
