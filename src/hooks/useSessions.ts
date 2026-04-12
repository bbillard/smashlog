import { useCallback, useEffect, useState } from "react";

import {
  addSession as addStoredSession,
  deleteSession as deleteStoredSession,
  getSessionById,
  getSessions,
  updateSession,
} from "@/src/services/storage";
import { Session } from "@/src/types/session";

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const nextSessions = await getSessions();
    setSessions(nextSessions);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(async (session: Session) => {
    await addStoredSession(session);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await deleteStoredSession(id);
    await refresh();
  }, [refresh]);

  const patch = useCallback(async (id: string, updates: Partial<Session>) => {
    await updateSession(id, updates);
    await refresh();
  }, [refresh]);

  const getById = useCallback((id: string) => getSessionById(id), []);

  return {
    sessions,
    isLoading,
    refresh,
    add,
    remove,
    patch,
    getById,
  };
}
