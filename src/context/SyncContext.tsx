import NetInfo from "@react-native-community/netinfo";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";

import { useAuth } from "@/src/context/AuthContext";
import { flushSyncQueue, getLastSyncedAt, subscribeToLastSyncedAt } from "@/src/services/cloudSync";
import { getSyncQueueLength, subscribeToSyncQueue } from "@/src/services/syncQueue";

/**
 * Statut de synchro affiché dans l'écran Profil (cf. src/components/SyncStatusBadge
 * utilisé par app/profile.tsx) :
 * - "disabled" : pas de compte -> aucune tentative de synchro (contrainte du ticket).
 * - "offline" : connecté mais pas de réseau.
 * - "pending" : connecté + réseau, mais des opérations restent en file.
 * - "synced" : tout est à jour.
 */
export type SyncStatus = "disabled" | "offline" | "pending" | "synced";

interface SyncContextValue {
  status: SyncStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
}

const SyncContext = createContext<SyncContextValue | null>(null);

/**
 * Écoute la connectivité réseau (NetInfo) et la file d'attente offline
 * (src/services/syncQueue.ts), et déclenche flushSyncQueue() dès qu'un
 * utilisateur connecté retrouve une connexion. Doit être monté à
 * l'intérieur d'<AuthProvider>.
 */
export function SyncProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const wasConnected = useRef(true);

  const refreshPendingCount = useCallback(async () => {
    setPendingCount(await getSyncQueueLength());
  }, []);

  const refreshLastSyncedAt = useCallback(async () => {
    setLastSyncedAt(await getLastSyncedAt());
  }, []);

  const runFlush = useCallback(async () => {
    await flushSyncQueue();
    await refreshPendingCount();
    await refreshLastSyncedAt();
  }, [refreshPendingCount, refreshLastSyncedAt]);

  // File d'attente : lecture initiale + abonnement aux changements (enqueue/dequeue).
  useEffect(() => {
    void refreshPendingCount();
    return subscribeToSyncQueue(() => {
      void refreshPendingCount();
    });
  }, [refreshPendingCount]);

  useEffect(() => {
    void refreshLastSyncedAt();
    return subscribeToLastSyncedAt(() => {
      void refreshLastSyncedAt();
    });
  }, [refreshLastSyncedAt]);

  // Réseau : détecte le retour de connexion et déclenche un flush.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nowConnected = state.isConnected !== false;
      setIsConnected(nowConnected);

      if (!wasConnected.current && nowConnected && user) {
        void runFlush();
      }
      wasConnected.current = nowConnected;
    });

    return unsubscribe;
  }, [user, runFlush]);

  // Connexion à un compte (ou relance de l'app avec une session déjà active
  // et une file non vide) : tente aussi un flush immédiat.
  useEffect(() => {
    if (user && isConnected && pendingCount > 0) {
      void runFlush();
    }
    // runFlush volontairement absent des deps : ne doit se déclencher que
    // sur un changement de user/isConnected/pendingCount, pas à chaque
    // recréation de runFlush.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isConnected, pendingCount]);

  const status: SyncStatus = !user
    ? "disabled"
    : !isConnected
      ? "offline"
      : pendingCount > 0
        ? "pending"
        : "synced";

  return (
    <SyncContext.Provider value={{ status, pendingCount, lastSyncedAt }}>{children}</SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync doit être utilisé à l'intérieur d'un <SyncProvider>.");
  }
  return context;
}
