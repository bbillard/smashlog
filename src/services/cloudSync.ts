import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "@/src/lib/supabase";
import type { TablesInsert } from "@/src/lib/supabase";
import {
  enqueueSyncOperation,
  getSyncQueue,
  getSyncQueueLength,
  removeSyncOperation,
  type SyncOperationType,
  type SyncTable,
} from "@/src/services/syncQueue";

/**
 * Écriture cloud "local-first" : appelée en fire-and-forget (jamais awaited
 * par l'UI) juste après chaque écriture AsyncStorage réussie dans
 * src/services/storage.ts, src/services/profile.ts et
 * src/services/onboarding.ts.
 *
 * - Utilisateur non connecté -> no-op immédiat (aucune tentative réseau).
 * - Connecté + réseau dispo -> écrit directement dans Supabase.
 * - Connecté + hors-ligne (ou erreur réseau) -> mis en file
 *   (src/services/syncQueue.ts), rejoué par flushSyncQueue() au retour
 *   réseau (déclenché depuis src/context/SyncContext.tsx).
 */

const LAST_SYNCED_AT_KEY = "smashlog_last_synced_at";

// Le client Supabase typé résout `.from(table).upsert(row)` par surcharge sur
// un littéral de table, pas sur un paramètre générique `T extends SyncTable`
// (limitation connue de supabase-js). On passe donc par une union discriminée
// + switch : chaque branche du switch reçoit `table` et `row` déjà étroitement
// typés pour ce littéral, sans jamais recourir à `any`.
type SyncRowMap = {
  sessions: TablesInsert<"sessions">;
  matches: TablesInsert<"matches">;
  players: TablesInsert<"players">;
  exercises: TablesInsert<"exercises">;
  planning_slots: TablesInsert<"planning_slots">;
  profiles: TablesInsert<"profiles">;
};

type SyncWriteInput = { [K in SyncTable]: { table: K; row: SyncRowMap[K] } }[SyncTable];

export async function getAuthUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected !== false;
}

export async function getLastSyncedAt(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNCED_AT_KEY);
}

type LastSyncedListener = () => void;
const lastSyncedListeners = new Set<LastSyncedListener>();

/** S'abonne aux mises à jour de la date de dernière synchro (cf. SyncContext.tsx). */
export function subscribeToLastSyncedAt(listener: LastSyncedListener): () => void {
  lastSyncedListeners.add(listener);
  return () => {
    lastSyncedListeners.delete(listener);
  };
}

async function markSyncedNow(): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNCED_AT_KEY, new Date().toISOString());
  for (const listener of lastSyncedListeners) {
    listener();
  }
}

async function writeRow(input: SyncWriteInput): Promise<void> {
  switch (input.table) {
    case "sessions": {
      const { error } = await supabase.from("sessions").upsert(input.row, { onConflict: "id" });
      if (error) throw error;
      return;
    }
    case "matches": {
      const { error } = await supabase.from("matches").upsert(input.row, { onConflict: "id" });
      if (error) throw error;
      return;
    }
    case "players": {
      const { error } = await supabase.from("players").upsert(input.row, { onConflict: "id" });
      if (error) throw error;
      return;
    }
    case "exercises": {
      const { error } = await supabase.from("exercises").upsert(input.row, { onConflict: "id" });
      if (error) throw error;
      return;
    }
    case "planning_slots": {
      const { error } = await supabase.from("planning_slots").upsert(input.row, { onConflict: "id" });
      if (error) throw error;
      return;
    }
    case "profiles": {
      const { error } = await supabase.from("profiles").upsert(input.row, { onConflict: "id" });
      if (error) throw error;
      return;
    }
  }
}

async function deleteRow(table: SyncTable, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

/**
 * Écrit (insert/update) une ligne dans une table Supabase, avec repli sur
 * la file d'attente offline en cas d'échec. Ne fait rien si personne n'est
 * connecté (cf. contrainte "utilisateur non connecté" du ticket).
 */
export async function syncUpsert<T extends SyncTable>(
  table: T,
  row: TablesInsert<T>,
  operation: Extract<SyncOperationType, "insert" | "update"> = "update",
): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) {
    return;
  }

  if (!(await isOnline())) {
    await enqueueSyncOperation({ table, operation, payload: row as Record<string, unknown> });
    return;
  }

  try {
    await writeRow({ table, row } as SyncWriteInput);
    if ((await getSyncQueueLength()) === 0) {
      await markSyncedNow();
    }
  } catch (error) {
    // Panne réseau ponctuelle, erreur serveur transitoire... on ne perd pas
    // l'écriture : elle sera rejouée depuis la file au prochain flush. Loggé
    // pour diagnostiquer les échecs permanents (ex: policy RLS manquante),
    // qui sinon retentent silencieusement à l'infini sans jamais aboutir.
    console.warn(`[cloudSync] Échec upsert "${table}", mis en file d'attente :`, error);
    await enqueueSyncOperation({ table, operation, payload: row as Record<string, unknown> });
  }
}

/** Supprime une ligne dans Supabase, avec le même repli offline que syncUpsert. */
export async function syncDelete(table: SyncTable, id: string): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) {
    return;
  }

  if (!(await isOnline())) {
    await enqueueSyncOperation({ table, operation: "delete", payload: { id } });
    return;
  }

  try {
    await deleteRow(table, id);
    if ((await getSyncQueueLength()) === 0) {
      await markSyncedNow();
    }
  } catch (error) {
    console.warn(`[cloudSync] Échec delete "${table}" (${id}), mis en file d'attente :`, error);
    await enqueueSyncOperation({ table, operation: "delete", payload: { id } });
  }
}

export interface FlushResult {
  flushed: number;
  remaining: number;
  /** Détail de l'échec qui a stoppé le flush, le cas échéant (cf. écran debug). */
  lastError: string | null;
}

function describeError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/**
 * Vide la file d'attente dans l'ordre chronologique. S'arrête au premier
 * échec (probablement un nouveau décrochage réseau, ou une écriture
 * durablement invalide côté serveur) : les opérations restantes sont
 * laissées en file pour le prochain essai, jamais perdues.
 */
export async function flushSyncQueue(): Promise<FlushResult> {
  const userId = await getAuthUserId();
  if (!userId || !(await isOnline())) {
    return { flushed: 0, remaining: await getSyncQueueLength(), lastError: null };
  }

  const queue = await getSyncQueue();
  let flushed = 0;
  let lastError: string | null = null;

  for (const op of queue) {
    try {
      if (op.operation === "delete") {
        await deleteRow(op.table, op.payload.id as string);
      } else {
        await writeRow({ table: op.table, row: op.payload } as SyncWriteInput);
      }
      await removeSyncOperation(op.id);
      flushed += 1;
    } catch (error) {
      lastError = describeError(error);
      console.warn(
        `[cloudSync] Échec flush "${op.table}" (${op.operation}), file laissée en l'état :`,
        error,
      );
      break;
    }
  }

  const remaining = await getSyncQueueLength();
  if (remaining === 0 && flushed > 0) {
    await markSyncedNow();
  }

  return { flushed, remaining, lastError };
}
