import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { isPostSessionPayload } from "@/src/services/postSessionNotification";

/**
 * Deep link de la notification post-séance : au tap, ouvre le wizard de
 * création (app/session/new.tsx) avec la famille du créneau et son heure de
 * début. Couvre les deux cas :
 * - app tuée : getLastNotificationResponseAsync() au premier rendu prêt ;
 * - app en arrière-plan / au premier plan : listener de réponse.
 *
 * `enabled` doit attendre que la navigation soit montée et que l'onboarding
 * soit terminé (sinon la redirection d'onboarding écraserait la navigation).
 */
export function usePostSessionNotificationRouting(enabled: boolean) {
  const router = useRouter();
  // Une même réponse peut être relue (réponse « froide » + listener) : on ne la traite qu'une fois
  const handledIds = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;

    function handle(response: Notifications.NotificationResponse) {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const id = response.notification.request.identifier;
      if (handledIds.current.has(id)) return;
      const data = response.notification.request.content.data;
      if (!isPostSessionPayload(data)) return;
      handledIds.current.add(id);
      router.push({
        pathname: "/session/new",
        params: { family: data.family, startAt: data.startAt },
      });
    }

    let active = true;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!active || !response) return;
      handle(response);
      // Évite de rouvrir le wizard au prochain démarrage à froid
      Notifications.clearLastNotificationResponse();
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(handle);
    return () => {
      active = false;
      subscription.remove();
    };
  }, [enabled, router]);
}
