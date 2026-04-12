import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { LabeledInput, ToggleRow } from "@/src/components/Form";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { Screen } from "@/src/components/Screen";
import { SectionCard } from "@/src/components/SectionCard";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { getScheduledSlots } from "@/src/services/onboarding";
import { rescheduleNotifications, requestNotificationPermissions } from "@/src/services/notifications";
import { getProfile } from "@/src/services/profile";
import {
  applyPlanningToNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  getNextScheduledSlotDate,
  getNotificationSettings,
  saveNotificationSettings,
} from "@/src/services/settings";
import { getSessions, updateSession } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { NotificationSettings } from "@/src/types/session";

function parseBoundedInteger(value: string, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function formatNextSlotSummary(dateIso: string | null, family?: "badminton" | "physique") {
  if (!dateIso) {
    return "Aucune séance planifiée";
  }

  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return "Aucune séance planifiée";
  }

  const familyLabel = family === "physique" ? "Physique" : "Badminton";
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${familyLabel} · ${formatted}`;
}

export default function SettingsScreen() {
  const { theme } = useAppTheme();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [canOpenDebug, setCanOpenDebug] = useState(false);
  const [hasPlanning, setHasPlanning] = useState(false);
  const [nextSlotSummary, setNextSlotSummary] = useState("Aucune prochaine séance planifiée");

  useEffect(() => {
    async function load() {
      const [profile, slots] = await Promise.all([getProfile(), getScheduledSlots()]);
      setCanOpenDebug(__DEV__ && profile.username.trim().toLowerCase() === "admin");
      setHasPlanning(slots.length > 0);
      const syncedSettings = await applyPlanningToNotificationSettings(slots);
      setSettings(syncedSettings);
      const nextSlot = getNextScheduledSlotDate(slots);
      setNextSlotSummary(formatNextSlotSummary(nextSlot?.date.toISOString() ?? null, nextSlot?.slot.family));
    }

    load();
  }, []);

  async function handleSave() {
    setIsSaving(true);

    try {
      const permissionGranted = await requestNotificationPermissions();
      if (!permissionGranted) {
        Alert.alert("Notifications désactivées", "Autorise les notifications pour recevoir tes rappels.");
      }

      await saveNotificationSettings(settings);
      const sessions = await getSessions();
      const latestSession = sessions[0];
      const notificationState = await rescheduleNotifications(sessions, settings);
      if (latestSession) {
        await updateSession(latestSession.id, notificationState);
      }
      Alert.alert("Réglages enregistrés", "Tes rappels ont été mis à jour.");
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'enregistrer les réglages.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen
      scrollable
      footer={<PrimaryButton label={isSaving ? "Enregistrement..." : "Enregistrer"} onPress={handleSave} />}
    >
      <Text style={[styles.title, { color: theme.text }]}>Réglages notifications</Text>
      <Text style={[styles.description, { color: theme.secondaryText }]}>
        Configure les rappels selon ton planning de jeu et tes habitudes.
      </Text>

      <SectionCard>
        <ToggleRow
          label="Rappel quotidien à heure fixe"
          onToggle={() =>
            setSettings((current) => ({ ...current, fixedTimeEnabled: !current.fixedTimeEnabled }))
          }
          value={settings.fixedTimeEnabled}
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <LabeledInput
              label="Heure"
              onChangeText={(value) =>
                setSettings((current) => ({
                  ...current,
                  fixedHour: parseBoundedInteger(value, current.fixedHour, 0, 23),
                }))
              }
              value={String(settings.fixedHour)}
            />
          </View>
          <View style={styles.half}>
            <LabeledInput
              label="Minute"
              onChangeText={(value) =>
                setSettings((current) => ({
                  ...current,
                  fixedMinute: parseBoundedInteger(value, current.fixedMinute, 0, 59),
                }))
              }
              value={String(settings.fixedMinute)}
            />
          </View>
        </View>
      </SectionCard>

      <SectionCard>
        <Pressable
          onPress={() => {
            if (!hasPlanning) {
              Alert.alert("Planning requis", "Remplis d'abord ton planning pour activer ce rappel.");
              return;
            }

            setSettings((current) => ({
              ...current,
              nextSessionReminderEnabled: !current.nextSessionReminderEnabled,
            }));
          }}
          style={!hasPlanning ? styles.disabledBlock : null}
        >
          <ToggleRow
            label="Rappel avant la prochaine séance"
            onToggle={() => {
              if (!hasPlanning) {
                Alert.alert("Planning requis", "Remplis d'abord ton planning pour activer ce rappel.");
                return;
              }

              setSettings((current) => ({
                ...current,
                nextSessionReminderEnabled: !current.nextSessionReminderEnabled,
              }));
            }}
            value={settings.nextSessionReminderEnabled}
          />
        </Pressable>
        <View style={[styles.nextSessionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.nextSessionLabel, { color: theme.secondaryText }]}>Prochaine séance</Text>
          <Text style={[styles.nextSessionValue, { color: hasPlanning ? theme.text : theme.secondaryText }]}>
            {nextSlotSummary}
          </Text>
          <Pressable onPress={() => router.push("/planning")}>
            <Text style={[styles.nextSessionLink, { color: theme.primary }]}>
              {hasPlanning ? "Modifier le planning" : "Créer mon planning"}
            </Text>
          </Pressable>
        </View>
        <LabeledInput
          label="Temps avant le début (minutes)"
          onChangeText={(value) =>
            setSettings((current) => ({
              ...current,
              nextSessionLeadMinutes: parseBoundedInteger(value, current.nextSessionLeadMinutes, 0, 1440),
            }))
          }
          value={String(settings.nextSessionLeadMinutes)}
        />
      </SectionCard>

      {canOpenDebug ? (
        <SectionCard>
          <Text style={[styles.debugTitle, { color: theme.text }]}>Debug développement</Text>
          <Text style={[styles.debugDescription, { color: theme.secondaryText }]}>
            Outils de test pour injecter des séances fictives et vérifier le payload de partage.
          </Text>
          <PrimaryButton label="Ouvrir l'écran debug" onPress={() => router.push("/debug")} tone="secondary" />
        </SectionCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  half: {
    flex: 1,
  },
  disabledBlock: {
    opacity: 0.45,
  },
  nextSessionCard: {
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  nextSessionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: fonts.bodySemiBold,
  },
  nextSessionValue: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.bodyMedium,
  },
  nextSessionLink: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
  },
  debugTitle: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
    marginBottom: 8,
  },
  debugDescription: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: fonts.bodyRegular,
    marginBottom: 12,
  },
});
