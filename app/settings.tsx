import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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
  getNextScheduledReminder,
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

function formatNextNotificationSummary(
  dateIso: string | null,
  family?: "badminton" | "renforcement" | "cardio" | "autre",
) {
  if (!dateIso) {
    return "Aucune notification planifiée";
  }

  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return "Aucune notification planifiée";
  }

  const familyLabel =
    family === "renforcement"
      ? "Renforcement"
      : family === "cardio"
        ? "Cardio"
        : family === "badminton"
          ? "Badminton"
          : family === "autre"
            ? "Autre"
            : "Quotidien";
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${familyLabel} · ${formatted}`;
}

function getNextFixedNotificationDate(hour: number, minute: number, reference = new Date()) {
  const nextDate = new Date(reference);
  nextDate.setSeconds(0, 0);
  nextDate.setHours(hour, minute, 0, 0);

  if (nextDate.getTime() <= reference.getTime()) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  return nextDate;
}

export default function SettingsScreen() {
  const { theme } = useAppTheme();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [canOpenDebug, setCanOpenDebug] = useState(false);
  const [hasPlanning, setHasPlanning] = useState(false);
  const [slots, setSlots] = useState<Awaited<ReturnType<typeof getScheduledSlots>>>([]);
  const [nextNotificationSummary, setNextNotificationSummary] = useState("Aucune notification planifiée");
  const [leadMinutesInput, setLeadMinutesInput] = useState(String(DEFAULT_NOTIFICATION_SETTINGS.nextSessionLeadMinutes));
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showFixedTimePicker, setShowFixedTimePicker] = useState(false);
  const lastSavedSettingsRef = useRef(JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS));
  const permissionAlertShownRef = useRef(false);

  const loadSettingsState = useCallback(async () => {
    async function load() {
      const [profile, nextSlots] = await Promise.all([getProfile(), getScheduledSlots()]);
      setCanOpenDebug(__DEV__ && profile.username.trim().toLowerCase() === "admin");
      setSlots(nextSlots);
      setHasPlanning(nextSlots.length > 0);
      const syncedSettings = await applyPlanningToNotificationSettings(nextSlots);
      setSettings(syncedSettings);
      setLeadMinutesInput(String(syncedSettings.nextSessionLeadMinutes));
      lastSavedSettingsRef.current = JSON.stringify(syncedSettings);
      setHasLoaded(true);
    }

    await load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettingsState();
    }, [loadSettingsState]),
  );

  useEffect(() => {
    const nextReminder = settings.nextSessionReminderEnabled
      ? getNextScheduledReminder(slots, settings.nextSessionLeadMinutes)
      : null;
    const nextFixedDate = settings.fixedTimeEnabled
      ? getNextFixedNotificationDate(settings.fixedHour, settings.fixedMinute)
      : null;

    if (nextReminder && nextFixedDate) {
      if (nextFixedDate.getTime() <= nextReminder.reminderDate.getTime()) {
        setNextNotificationSummary(formatNextNotificationSummary(nextFixedDate.toISOString()));
      } else {
        setNextNotificationSummary(
          formatNextNotificationSummary(nextReminder.reminderDate.toISOString(), nextReminder.slot.family),
        );
      }
      return;
    }

    if (nextReminder) {
      setNextNotificationSummary(
        formatNextNotificationSummary(nextReminder.reminderDate.toISOString(), nextReminder.slot.family),
      );
      return;
    }

    if (nextFixedDate) {
      setNextNotificationSummary(formatNextNotificationSummary(nextFixedDate.toISOString()));
      return;
    }

    setNextNotificationSummary("Aucune notification planifiée");
  }, [
    settings.fixedHour,
    settings.fixedMinute,
    settings.fixedTimeEnabled,
    settings.nextSessionLeadMinutes,
    settings.nextSessionReminderEnabled,
    slots,
  ]);

  function handleFixedTimeChange(event: DateTimePickerEvent, selectedDate?: Date) {
    setShowFixedTimePicker(false);
    if (event.type !== "set" || !selectedDate) {
      return;
    }

    setSettings((current) => ({
      ...current,
      fixedHour: selectedDate.getHours(),
      fixedMinute: selectedDate.getMinutes(),
    }));
  }

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    const normalizedLeadMinutes = parseBoundedInteger(
      leadMinutesInput,
      settings.nextSessionLeadMinutes,
      0,
      1440,
    );
    const nextSettings =
      normalizedLeadMinutes === settings.nextSessionLeadMinutes
        ? settings
        : {
            ...settings,
            nextSessionLeadMinutes: normalizedLeadMinutes,
          };
    const nextSignature = JSON.stringify(nextSettings);

    if (nextSignature === lastSavedSettingsRef.current) {
      return;
    }

    let cancelled = false;

    async function persistSettings() {
      try {
        if (nextSettings.fixedTimeEnabled || nextSettings.nextSessionReminderEnabled) {
          const permissionGranted = await requestNotificationPermissions();
          if (!permissionGranted) {
            if (!permissionAlertShownRef.current && !cancelled) {
              permissionAlertShownRef.current = true;
              Alert.alert("Notifications désactivées", "Autorise les notifications pour recevoir tes rappels.");
            }
          } else {
            permissionAlertShownRef.current = false;
          }
        }

        await saveNotificationSettings(nextSettings);
        const sessions = await getSessions();
        const latestSession = sessions[0];
        const notificationState = await rescheduleNotifications(nextSettings);
        if (latestSession) {
          await updateSession(latestSession.id, notificationState);
        }

        if (!cancelled) {
          lastSavedSettingsRef.current = nextSignature;
          if (nextSettings !== settings) {
            setSettings(nextSettings);
          }
        }
      } catch {
        if (!cancelled) {
          Alert.alert("Erreur", "Impossible d'enregistrer les réglages.");
        }
      }
    }

    persistSettings();

    return () => {
      cancelled = true;
    };
  }, [hasLoaded, leadMinutesInput, settings]);

  return (
    <Screen scrollable>
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
        <Pressable
          onPress={() => setShowFixedTimePicker(true)}
          style={[styles.timeTrigger, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Ionicons color={theme.primary} name="time-outline" size={18} />
          <Text style={[styles.timeTriggerLabel, { color: theme.secondaryText }]}>Heure du rappel</Text>
          <Text style={[styles.timeTriggerValue, { color: theme.text }]}>
            {String(settings.fixedHour).padStart(2, "0")}h{String(settings.fixedMinute).padStart(2, "0")}
          </Text>
        </Pressable>
        {showFixedTimePicker ? (
          <DateTimePicker
            display={Platform.OS === "ios" ? "spinner" : "default"}
            mode="time"
            onChange={handleFixedTimeChange}
            value={new Date(2025, 0, 1, settings.fixedHour, settings.fixedMinute)}
          />
        ) : null}
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
          <Text style={[styles.nextSessionLabel, { color: theme.secondaryText }]}>Prochaine notification</Text>
          <Text style={[styles.nextSessionValue, { color: hasPlanning ? theme.text : theme.secondaryText }]}>
            {nextNotificationSummary}
          </Text>
          <Pressable onPress={() => router.push("/planning")}>
            <Text style={[styles.nextSessionLink, { color: theme.primary }]}>
              {hasPlanning ? "Modifier le planning" : "Créer mon planning"}
            </Text>
          </Pressable>
        </View>
        <LabeledInput
          label="Temps avant le début (minutes)"
          onChangeText={(value) => {
            setLeadMinutesInput(value);
            const trimmed = value.trim();
            if (trimmed.length === 0) {
              return;
            }

            setSettings((current) => ({
              ...current,
              nextSessionLeadMinutes: parseBoundedInteger(trimmed, current.nextSessionLeadMinutes, 0, 1440),
            }));
          }}
          value={leadMinutesInput}
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
  timeTrigger: {
    marginTop: 12,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timeTriggerLabel: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
    flex: 1,
  },
  timeTriggerValue: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
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
