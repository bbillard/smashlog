import { supabase } from "@/src/lib/supabase";
import type { TablesInsert } from "@/src/lib/supabase";
import type { Json } from "@/src/types/supabase";
import { getOnboardingUsername, getScheduledSlots, setOnboardingUsername, type ScheduledSlot } from "@/src/services/onboarding";
import { getProfile, saveProfile } from "@/src/services/profile";
import { getExercises, getPlayers, getSessions } from "@/src/services/storage";
import { Exercise, Player } from "@/src/types/index";
import { Match, Session } from "@/src/types/session";
import { deterministicId } from "@/src/utils/deterministicId";

/**
 * Migration automatique des données AsyncStorage vers Supabase, rejouée à
 * chaque connexion/reconnexion réussie (voir src/context/MigrationContext.tsx
 * pour le déclenchement et l'UI) — pas seulement à la toute première.
 *
 * Il n'y a volontairement PAS de flag "migration déjà faite" persistant :
 * un utilisateur peut très bien créer des données en local pendant qu'il
 * n'est pas connecté (l'app reste utilisable sans compte), puis se
 * reconnecter plus tard — ces données doivent remonter à CE moment-là,
 * pas seulement à la toute première connexion historique de l'appareil.
 * On s'appuie donc entièrement sur l'idempotence des upserts ci-dessous
 * pour que rejouer la migration à chaque connexion soit sans danger et peu
 * coûteux (cf. src/context/MigrationContext.tsx, le ref `attemptedForUserId`
 * évite juste les déclenchements redondants pendant qu'une session reste
 * montée).
 *
 * Stratégie de dédoublonnage : chaque enregistrement local a déjà un id
 * stable (uuid v4, cf. src/utils/id.ts) — sauf les `Match`, qui n'ont pas
 * d'id local, pour lesquels on dérive un id déterministe à partir de
 * `session.id` + index (cf. src/utils/deterministicId.ts). On upsert avec
 * `ignoreDuplicates: true` sur `id` : un enregistrement déjà présent côté
 * Supabase (même id) n'est jamais écrasé, et un enregistrement local absent
 * du cloud est inséré. Ce même mécanisme couvre à la fois :
 * - le rejeu sans danger à chaque connexion (les lignes déjà migrées sont
 *   simplement ignorées, pas de doublon, pas d'erreur) ;
 * - le merge automatique multi-appareils pour joueurs/exercices/planning/
 *   séances/matchs (des ids différents sur les deux appareils s'insèrent
 *   tous les deux, sans conflit).
 *
 * Seul le pseudo du profil nécessite une résolution manuelle (l'utilisateur
 * choisit une valeur textuelle, on ne peut pas "merger" deux pseudos) : cf.
 * reconcileProfile / resolveProfileConflict plus bas.
 */

const UPSERT_CHUNK_SIZE = 300;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// ─── Row mappers : modèle local -> Insert Supabase ────────────────────────

function toPlayerRow(player: Player, userId: string): TablesInsert<"players"> {
  return {
    id: player.id,
    user_id: userId,
    name: player.name,
    notes: player.notes ?? null,
    created_at: player.createdAt,
  };
}

function toExerciseRow(exercise: Exercise, userId: string): TablesInsert<"exercises"> {
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
 * (src/services/onboarding.ts) a longtemps pu générer un id au format
 * `slot-<timestamp>-<random>` sur les runtimes JS sans crypto.randomUUID —
 * déjà corrigé à la source, mais des appareils existants peuvent encore
 * avoir des slots locaux avec l'ancien format. On dérive un uuid stable à
 * partir de l'id original plutôt que de planter la migration entière
 * dessus (même mécanisme que pour les Match, cf. deterministicId).
 */
function toPlanningRow(slot: ScheduledSlot, userId: string): TablesInsert<"planning_slots"> {
  return {
    id: UUID_RE.test(slot.id) ? slot.id : deterministicId(`smashlog:planning-slot:${slot.id}`),
    user_id: userId,
    day_of_week: slot.dayOfWeek,
    hour: slot.hour,
    minute: slot.minute,
    family: slot.family,
  };
}

function toSessionRow(session: Session, userId: string): TablesInsert<"sessions"> {
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

function toMatchRow(session: Session, match: Match, index: number, userId: string): TablesInsert<"matches"> {
  return {
    id: deterministicId(`smashlog:match:${session.id}:${index}`),
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

// ─── Upserts (idempotents, ignorent les conflits d'id) ────────────────────

async function upsertPlayers(players: Player[], userId: string): Promise<number> {
  const rows = players.map((player) => toPlayerRow(player, userId));
  for (const batch of chunk(rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await supabase.from("players").upsert(batch, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
  }
  return rows.length;
}

async function upsertExercises(exercises: Exercise[], userId: string): Promise<number> {
  const rows = exercises.map((exercise) => toExerciseRow(exercise, userId));
  for (const batch of chunk(rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await supabase.from("exercises").upsert(batch, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
  }
  return rows.length;
}

async function upsertPlanning(slots: ScheduledSlot[], userId: string): Promise<number> {
  const rows = slots.map((slot) => toPlanningRow(slot, userId));
  for (const batch of chunk(rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await supabase.from("planning_slots").upsert(batch, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
  }
  return rows.length;
}

async function upsertSessions(sessions: Session[], userId: string): Promise<number> {
  const rows = sessions.map((session) => toSessionRow(session, userId));
  for (const batch of chunk(rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await supabase.from("sessions").upsert(batch, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
  }
  return rows.length;
}

async function upsertMatches(sessions: Session[], userId: string): Promise<number> {
  const rows = sessions.flatMap((session) =>
    (session.matches ?? []).map((match, index) => toMatchRow(session, match, index, userId)),
  );
  for (const batch of chunk(rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await supabase.from("matches").upsert(batch, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
  }
  return rows.length;
}

// ─── Profil : réconciliation du pseudo (seule donnée non "mergeable") ─────

export interface ProfileConflict {
  localUsername: string;
  cloudUsername: string;
}

/**
 * Compare le pseudo local au pseudo déjà présent côté Supabase.
 * - Cloud vide -> on pousse le pseudo local, pas de conflit.
 * - Cloud identique (insensible à la casse/espaces) -> rien à faire.
 * - Cloud différent -> conflit renvoyé, à trancher par l'utilisateur via
 *   resolveProfileConflict (aucune écriture faite ici dans ce cas).
 */
async function reconcileProfile(userId: string): Promise<ProfileConflict | null> {
  const localUsername = (await getOnboardingUsername()).trim();
  if (!localUsername) {
    return null;
  }

  const { data, error } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
  if (error) throw error;

  const cloudUsername = (data?.username ?? "").trim();

  if (!cloudUsername) {
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({ id: userId, username: localUsername }, { onConflict: "id" });
    if (upsertError) throw upsertError;
    return null;
  }

  if (cloudUsername.toLowerCase() === localUsername.toLowerCase()) {
    return null;
  }

  return { localUsername, cloudUsername };
}

/**
 * Applique le choix de l'utilisateur ("local" ou "cloud") suite à un
 * ProfileConflict.
 */
export async function resolveProfileConflict(
  userId: string,
  choice: "local" | "cloud",
  conflict: ProfileConflict,
): Promise<void> {
  const username = choice === "local" ? conflict.localUsername : conflict.cloudUsername;

  const { error } = await supabase.from("profiles").upsert({ id: userId, username }, { onConflict: "id" });
  if (error) throw error;

  if (choice === "cloud") {
    // Reflète le pseudo cloud choisi dans le stockage local pour rester cohérent.
    await setOnboardingUsername(username);
    const profile = await getProfile();
    await saveProfile({ ...profile, username });
  }
}

// ─── Orchestration ─────────────────────────────────────────────────────────

export interface MigrationCounts {
  players: number;
  exercises: number;
  planning: number;
  sessions: number;
  matches: number;
}

export type MigrationOutcome =
  | { status: "success"; counts: MigrationCounts; profileConflict: ProfileConflict | null }
  | { status: "error"; error: unknown };

/**
 * Point d'entrée : migre toutes les données locales vers Supabase pour
 * `userId`. Rejoué à chaque connexion (cf. commentaire en tête de fichier) :
 * si une étape échoue (réseau coupé, etc.), l'app reste utilisable en
 * local et la migration sera simplement retentée à la prochaine connexion
 * (les upserts déjà passés étant idempotents, ils ne sont jamais rejoués en
 * double).
 */
export async function runMigration(userId: string): Promise<MigrationOutcome> {
  try {
    const [players, exercises, planning, sessions] = await Promise.all([
      getPlayers(),
      getExercises(),
      getScheduledSlots(),
      getSessions(),
    ]);

    // Ordre imposé par les FK : profil (déjà garanti par ensureAuthProfile
    // avant l'appel à runMigration) -> joueurs -> exercices -> planning ->
    // séances -> matchs (référencent session_id et opponent_id/partner_id).
    const playersCount = await upsertPlayers(players, userId);
    const exercisesCount = await upsertExercises(exercises, userId);
    const planningCount = await upsertPlanning(planning, userId);
    const sessionsCount = await upsertSessions(sessions, userId);
    const matchesCount = await upsertMatches(sessions, userId);

    const profileConflict = await reconcileProfile(userId);

    return {
      status: "success",
      counts: {
        players: playersCount,
        exercises: exercisesCount,
        planning: planningCount,
        sessions: sessionsCount,
        matches: matchesCount,
      },
      profileConflict,
    };
  } catch (error) {
    return { status: "error", error };
  }
}
