import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";

import { PlanningEditor } from "@/src/components/planning/PlanningEditor";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { Screen } from "@/src/components/Screen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { requestNotificationPermissions } from "@/src/services/notifications";
import { ScheduledSlot, getScheduledSlots, saveScheduledSlots } from "@/src/services/onboarding";
import { applyPlanningToNotificationSettings } from "@/src/services/settings";
import { fonts } from "@/src/theme/typography";

export default function PlanningScreen() {
  const { theme } = useAppTheme();
  const [slots, setSlots] = useState<ScheduledSlot[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadSlots = useCallback(async () => {
    const nextSlots = await getScheduledSlots();
    setSlots(nextSlots);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSlots();
    }, [loadSlots]),
  );

  async function handleSave() {
    setIsSaving(true);

    try {
      await saveScheduledSlots(slots);
      await applyPlanningToNotificationSettings(slots);
      if (slots.length > 0) {
        try {
          await requestNotificationPermissions();
        } catch {
          // do not block save
        }
      }
      Alert.alert("Planning enregistré", "Tes créneaux et rappels ont été mis à jour.");
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer le planning.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen
      nativeHeader
      scrollable
      footer={<PrimaryButton label={isSaving ? "Enregistrement..." : "Enregistrer"} onPress={handleSave} />}
    >
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
