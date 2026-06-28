import { useEffect, useRef, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";

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
import { getSessions, importSessions, updateSession } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { NotificationSettings } from "@/src/types/session";

function parseBoundedInteger(value: string, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

const SLOT_TYPE_LABELS: Record<string, string> = {
  badminton: "Badminton",
  renforcement: "Renforcement",
  cardio: "Cardio",
  autre: "Séance",
};

function formatNextSlotSummary(dateIso: string | null, type?: string) {
  if (!dateIso) {
    return "Aucune séance planifiée";
  }

  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return "Aucune séance planifiée";
  }

  const typeLabel = type ? (SLOT_TYPE_LABELS[type] ?? "Séance") : "Séance";
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${typeLabel} · ${formatted}`;
}

export default function SettingsScreen() {
  const { theme } = useAppTheme();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [canOpenDebug, setCanOpenDebug] = useState(false);
  const [hasPlanning, setHasPlanning] = useState(false);
  const [nextSlotSummary, setNextSlotSummary] = useState("Aucune prochaine séance planifiée");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const exportFileRef = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      const [profile, slots] = await Promise.all([getProfile(), getScheduledSlots()]);
      setCanOpenDebug(__DEV__ && profile.username.trim().toLowerCase() === "admin");
      setHasPlanning(slots.length > 0);
      const syncedSettings = await applyPlanningToNotificationSettings(slots);
      setSettings(syncedSettings);
      const nextSlot = getNextScheduledSlotDate(slots);
      setNextSlotSummary(formatNextSlotSummary(nextSlot?.date.toISOString() ?? null, nextSlot?.slot.type));
    }

    load();
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const sessions = await getSessions();
      const json = JSON.stringify({ version: 1, sessions }, null, 2);
      const fileName = `badlog-export-${new Date().toISOString().split("T")[0]}.json`;

      // Write to a temp file then share it
      const path = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
      exportFileRef.current = path;

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Partage indisponible", "Le partage de fichiers n'est pas disponible sur cet appareil.");
        return;
      }

      await Sharing.shareAsync(path, { mimeType: "application/json", dialogTitle: "Exporter mes données" });
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'exporter les données.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImport() {
    setIsImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === "ios" ? "public.json" : "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        Alert.alert("Format invalide", "Le fichier sélectionné n'est pas un JSON valide.");
        return;
      }

      // Validate shape
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("sessions" in parsed) ||
        !Array.isArray((parsed as { sessions: unknown }).sessions)
      ) {
        Alert.alert("Format invalide", "Le fichier ne contient pas de données Badlog valides.");
        return;
      }

      const incoming = (parsed as { sessions: unknown[] }).sessions;
      const validSessions = incoming.filter(
        (s) =>
          typeof s === "object" &&
          s !== null &&
          typeof (s as Record<string, unknown>).id === "string" &&
          typeof (s as Record<string, unknown>).createdAt === "string" &&
          typeof (s as Record<string, unknown>).type === "string",
      );

      if (validSessions.length === 0) {
        Alert.alert("Aucune séance", "Le fichier ne contient aucune séance valide.");
        return;
      }

      const { imported, skipped } = await importSessions(validSessions as Parameters<typeof importSessions>[0]);

      const message =
        imported === 0
          ? "Toutes les séances étaient déjà présentes."
          : `${imported} séance${imported > 1 ? "s" : ""} importée${imported > 1 ? "s" : ""}${skipped > 0 ? ` · ${skipped} ignorée${skipped > 1 ? "s" : ""} (doublons)` : ""}.`;

      Alert.alert("Import terminé", message);
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'importer les données.");
    } finally {
      setIsImporting(false);
    }
  }

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
      nativeHeader
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

      <SectionCard>
        <Text style={[styles.dataTitle, { color: theme.text }]}>Mes données</Text>
        <Text style={[styles.dataDescription, { color: theme.secondaryText }]}>
          Exporte tes séances en JSON pour les sauvegarder ou les transférer. L'import fusionne sans écraser.
        </Text>
        <PrimaryButton
          label={isExporting ? "Export en cours…" : "Exporter mes données"}
          onPress={handleExport}
          tone="secondary"
        />
        <View style={styles.importButton}>
          <PrimaryButton
            label={isImporting ? "Import en cours…" : "Importer mes données"}
            onPress={handleImport}
            tone="secondary"
          />
        </View>
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
  dataTitle: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
    marginBottom: 8,
  },
  dataDescription: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: fonts.bodyRegular,
    marginBottom: 12,
  },
  importButton: {
    marginTop: 8,
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
