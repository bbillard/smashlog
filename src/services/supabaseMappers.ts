import type { TablesInsert } from "@/src/lib/supabase";
import type { Json } from "@/src/types/supabase";
import type { ScheduledSlot } from "@/src/services/onboarding";
import { Exercise, Player } from "@/src/types/index";
import { Match, Session } from "@/src/types/session";
import { deterministicId } from "@/src/utils/deterministicId";

/**
 * Convertit les modèles locaux (AsyncStorage) en lignes Supabase.
 *
 * Module partagé entre la migration initiale (src/services/migration.ts) et
 * la synchro temps réel (src/services/cloudSync.ts) : les deux doivent
 * produire exactement les mêmes lignes pour le même enregistrement local,
 * sous peine de divergence entre ce que voit un appareil qui vient de se
 * connecter (migration) et un appareil déjà connecté qui écrit en direct
 * (cloudSync).
 */

export function toPlayerRow(player: Player, userId: string): TablesInsert<"players"> {
  return {
    id: player.id,
    user_id: userId,
    name: player.name,
    notes: player.notes ?? null,
    created_at: player.createdAt,
  };
}

export function toExerciseRow(exercise: Exercise, userId: string): TablesInsert<"exercises"> {
  return {
    id: exercise.id,
    user_id: userId,
    name: exercise.name,
    description: exercise.description ?? null,
    players_count: exercise.playersCount ?? null,
    labels: (exercise.labels ?? []) as unknown as Json,
    duration_minutes: exercise.durationMinutes ?? null,
    level: exercise.level ?? null,
    orientation: exercise.orientation ?? null,
    attention_points: exercise.attentionPoints ?? null,
    variant_easier: exercise.variantEasier ?? null,
    variant_harder: exercise.variantHarder ?? null,
    source: exercise.source ?? null,
    photos: exercise.photos ?? null,
    created_at: exercise.createdAt,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * planning_slots.id est typé uuid côté Supabase, mais createScheduledSlotId()
 * a longtemps pu générer un id au format `slot-<timestamp>-<random>` sur les
 * runtimes JS sans crypto.randomUUID — déjà corrigé à la source, mais des
 * appareils existants peuvent encore avoir des slots locaux avec l'ancien
 * format. On dérive un uuid stable à partir de l'id original plutôt que de
 * planter dessus (même mécanisme que pour les Match).
 *
 * IMPORTANT : toute fonction qui vise une ligne planning_slots par id
 * (upsert ET delete) doit passer par ce helper, sinon un delete visant
 * l'id local brut échoue avec une erreur Postgres 22P02 "invalid input
 * syntax for type uuid" — la ligne n'a jamais existé sous cet id côté
 * Supabase (cf. syncPlanningReplace dans entitySync.ts).
 */
export function planningSlotRowId(slotId: string): string {
  return UUID_RE.test(slotId) ? slotId : deterministicId(`smashlog:planning-slot:${slotId}`);
}

export function toPlanningRow(slot: ScheduledSlot, userId: string): TablesInsert<"planning_slots"> {
  return {
    id: planningSlotRowId(slot.id),
    user_id: userId,
    day_of_week: slot.dayOfWeek,
    hour: slot.hour,
    minute: slot.minute,
    family: slot.family,
  };
}

export function toSessionRow(session: Session, userId: string): TablesInsert<"sessions"> {
  return {
    id: session.id,
    user_id: userId,
    // Pas de champ "date" distinct côté modèle local : createdAt représente
    // déjà la date/heure de la séance, éditable via DateTimeField (cf.
    // app/session/new.tsx).
    date: session.createdAt,
    created_at: session.createdAt,
    title: session.title ?? null,
    type: session.type,
    rating: session.rating ?? null,
    went_well: session.wentWell ?? null,
    went_wrong: session.wentWrong ?? null,
    next_intention: session.nextIntention ?? null,
    free_notes: session.freeNotes ?? null,
    exercise_ids: session.exerciseIds ?? null,
    notification_scheduled_at: session.notificationScheduledAt ?? null,
    notification_ids: session.notificationIds ?? null,
  };
}

export function matchDeterministicId(sessionId: string, index: number): string {
  return deterministicId(`smashlog:match:${sessionId}:${index}`);
}

export function toMatchRow(session: Session, match: Match, index: number, userId: string): TablesInsert<"matches"> {
  return {
    id: matchDeterministicId(session.id, index),
    session_id: session.id,
    user_id: userId,
    opponent: match.adversaire ?? null,
    opponent_id: match.adversaireId ?? null,
    opponent_ids: match.adversaireIds ?? null,
    partner: match.partenaire ?? null,
    partner_id: match.partenaireId ?? null,
    partner_ids: match.partenaireIds ?? null,
    result: match.resultat,
    mode: match.mode,
    sets: match.sets as unknown as Json,
    comment: match.commentaire ?? null,
  };
}
