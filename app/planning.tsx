import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";

import { PlanningEditor } from "@/src/components/planning/PlanningEditor";
import { Screen } from "@/src/components/Screen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { requestNotificationPermissions, rescheduleNotifications } from "@/src/services/notifications";
import { ScheduledSlot, getScheduledSlots, saveScheduledSlots } from "@/src/services/onboarding";
import { applyPlanningToNotificationSettings, saveNotificationSettings } from "@/src/services/settings";
import { getSessions, updateSession } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";

export default function PlanningScreen() {
  const { theme } = useAppTheme();
  const [slots, setSlots] = useState<ScheduledSlot[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saveErrorShown, setSaveErrorShown] = useState(false);

  const loadSlots = useCallback(async () => {
    const nextSlots = await getScheduledSlots();
    setSlots(nextSlots);
    setHasLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSlots();
    }, [loadSlots]),
  );

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    let cancelled = false;

    async function syncPlanning() {
      try {
        setSaveErrorShown(false);
        await saveScheduledSlots(slots);
        const syncedSettings = await applyPlanningToNotificationSettings(slots);
        const nextSettings =
          slots.length > 0
            ? {
                ...syncedSettings,
                fixedTimeEnabled: false,
                nextSessionReminderEnabled: true,
              }
            : syncedSettings;
        await saveNotificationSettings(nextSettings);
        if (slots.length > 0) {
          try {
            await requestNotificationPermissions();
        } catch {
          // do not block save
        }
      }
      const sessions = await getSessions();
      const latestSession = sessions[0];
        const notificationState = await rescheduleNotifications(nextSettings);
        if (latestSession) {
          await updateSession(latestSession.id, notificationState);
        }
      } catch {
        if (!cancelled && !saveErrorShown) {
          setSaveErrorShown(true);
          Alert.alert("Erreur", "Impossible d'enregistrer le planning.");
        }
      }
    }

    syncPlanning();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoaded, slots]);

  return (
    <Screen scrollable>
      <Text style={[styles.title, { color: theme.text }]}>Planning</Text>
      <Text style={[styles.description, { color: theme.secondaryText }]}>
        Configure tes créneaux hebdomadaires. Ils servent de base au rappel avant la prochaine séance.
      </Text>
      <PlanningEditor onSlotsChange={setSlots} slots={slots} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontFamily: fonts.displayExtraBold,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.bodyRegular,
  },
});
