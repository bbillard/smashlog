import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { OnboardingButton, OnboardingScaffold } from "@/src/components/onboarding/OnboardingScaffold";
import { PlanningEditor } from "@/src/components/planning/PlanningEditor";
import { requestNotificationPermissions } from "@/src/services/notifications";
import { ScheduledSlot, saveScheduledSlots } from "@/src/services/onboarding";
import { applyPlanningToNotificationSettings, resetNotificationSettingsToDefault } from "@/src/services/settings";
import { fonts } from "@/src/theme/typography";

export default function OnboardingPlanningScreen() {
  const router = useRouter();
  const [slots, setSlots] = useState<ScheduledSlot[]>([]);

  async function handleEnableReminders() {
    await saveScheduledSlots(slots);
    await applyPlanningToNotificationSettings(slots);
    try {
      await requestNotificationPermissions();
    } catch {
      // continue silently
    }
    router.push("/onboarding/pseudo");
  }

  async function handleSkip() {
    await saveScheduledSlots([]);
    await resetNotificationSettingsToDefault();
    router.push("/onboarding/pseudo");
  }

  return (
    <OnboardingScaffold
      progress={2}
      title={
        <Text style={styles.title}>
          Quand{"\n"}tu joues ?
        </Text>
      }
      body="On te rappellera le bon objectif avant chaque séance."
      footer={
        <>
          <OnboardingButton label="Activer les rappels →" onPress={handleEnableReminders} />
          <Pressable onPress={handleSkip} style={styles.skipWrap}>
            <Text style={styles.skipText}>Passer pour l'instant</Text>
          </Pressable>
        </>
      }
    >
      <PlanningEditor onSlotsChange={setSlots} slots={slots} />
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    lineHeight: 24,
    color: "#f0f0f2",
    fontFamily: fonts.displayExtraBold,
    letterSpacing: -0.4,
  },
  skipWrap: {
    marginTop: 10,
    alignItems: "center",
  },
  skipText: {
    fontSize: 12,
    color: "#6b6b7a",
    textDecorationLine: "underline",
    opacity: 0.6,
    fontFamily: fonts.bodyRegular,
  },
});
