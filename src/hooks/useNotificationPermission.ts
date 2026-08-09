import { useCallback, useRef, useState } from "react";

import {
  getNotificationPermissionStatus,
  requestNotificationPermissions,
} from "@/src/services/notifications";

export type NotificationPermissionOutcome = "granted" | "denied" | "cancelled";

interface UseNotificationPermissionResult {
  /** true tant que la pré-modale doit être affichée. */
  isPrimerVisible: boolean;
  /**
   * Vérifie le statut système et, si l'OS n'a pas encore statué,
   * affiche d'abord la pré-modale explicative avant la popup système.
   * Si l'utilisateur a déjà refusé définitivement (canAskAgain === false),
   * ne redemande jamais silencieusement : renvoie "denied" directement.
   */
  requestWithPrimer: () => Promise<NotificationPermissionOutcome>;
  /** À appeler par le bouton "Activer" de la pré-modale. */
  confirmPrimer: () => void;
  /** À appeler par le bouton "Plus tard" / la fermeture de la pré-modale. */
  dismissPrimer: () => void;
}

export function useNotificationPermission(): UseNotificationPermissionResult {
  const [isPrimerVisible, setPrimerVisible] = useState(false);
  const resolverRef = useRef<((continueFlow: boolean) => void) | null>(null);

  const confirmPrimer = useCallback(() => {
    setPrimerVisible(false);
    resolverRef.current?.(true);
    resolverRef.current = null;
  }, []);

  const dismissPrimer = useCallback(() => {
    setPrimerVisible(false);
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  const requestWithPrimer = useCallback(async (): Promise<NotificationPermissionOutcome> => {
    const status = await getNotificationPermissionStatus();

    if (status.granted) {
      return "granted";
    }

    if (!status.canAskAgain) {
      // L'utilisateur a déjà refusé définitivement : on ne redemande pas
      // silencieusement, l'appelant doit orienter vers les réglages.
      return "denied";
    }

    const continueFlow = await new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setPrimerVisible(true);
    });

    if (!continueFlow) {
      return "cancelled";
    }

    const granted = await requestNotificationPermissions();
    return granted ? "granted" : "denied";
  }, []);

  return {
    isPrimerVisible,
    requestWithPrimer,
    confirmPrimer,
    dismissPrimer,
  };
}
