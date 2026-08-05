import AsyncStorage from "@react-native-async-storage/async-storage";

import { createId } from "@/src/utils/id";

/**
 * File d'attente des écritures Supabase en échec (offline ou erreur réseau),
 * persistée en AsyncStorage pour survivre à un redémarrage de l'app.
 * Consommée par flushSyncQueue() dans src/services/cloudSync.ts.
 */

export type SyncTable = "sessions" | "matches" | "players" | "exercises" | "planning_slots" | "profiles";
export type SyncOperationType = "insert" | "update" | "delete";

export interface SyncOperation {
  /** id de l'opération en file (distinct de l'id de la ligne visée). */
  id: string;
  table: SyncTable;
  operation: SyncOperationType;
  /** Pour insert/update : la ligne Supabase complète. Pour delete : { id }. */
  payload: Record<string, unknown>;
  createdAt: string;
}

const SYNC_QUEUE_KEY = "smashlog_sync_queue";

type QueueListener = () => void;
const listeners = new Set<QueueListener>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

/** S'abonne aux changements de la file (ajout/retrait). Renvoie une fonction de désabonnement. */
export function subscribeToSyncQueue(listener: QueueListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function readQueue(): Promise<SyncOperation[]> {
  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  if (!raw) {
    return [];
  }
  return JSON.parse(raw) as SyncOperation[];
}

async function writeQueue(queue: SyncOperation[]): Promise<void> {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export async function getSyncQueue(): Promise<SyncOperation[]> {
  const queue = await readQueue();
  return [...queue].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function getSyncQueueLength(): Promise<number> {
  return (await readQueue()).length;
}

export async function enqueueSyncOperation(
  op: Omit<SyncOperation, "id" | "createdAt">,
): Promise<void> {
  const queue = await readQueue();
  queue.push({ ...op, id: createId(), createdAt: new Date().toISOString() });
  await writeQueue(queue);
  notifyListeners();
}

export async function removeSyncOperation(operationId: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((item) => item.id !== operationId));
  notifyListeners();
}

export async function clearSyncQueue(): Promise<void> {
  await writeQueue([]);
  notifyListeners();
}
