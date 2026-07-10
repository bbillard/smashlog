import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";

import {
  ScheduledSlot,
  getOnboardingCompleted,
  getOnboardingUsername,
  getScheduledSlots,
  saveScheduledSlots,
  setOnboardingCompleted,
  setOnboardingUsername,
} from "@/src/services/onboarding";
import { DEFAULT_PROFILE, getProfile, saveProfile } from "@/src/services/profile";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  getNotificationSettings,
  saveNotificationSettings,
} from "@/src/services/settings";
import {
  getCustomLabels,
  getExercises,
  getPlayers,
  getSessions,
  replaceExercises,
  replacePlayers,
  replaceSessions,
  saveCustomLabels,
} from "@/src/services/storage";
import { Exercise, Player } from "@/src/types/index";
import { Profile } from "@/src/types/profile";
import { NotificationSettings, Session } from "@/src/types/session";

// L'identifiant applicatif présent dans toute sauvegarde Smashlog valide (voir app.json).
export const BACKUP_APP_ID = "com.smashlog.app";

export interface BackupProfile extends Profile {
  notificationSettings: NotificationSettings;
  onboardingCompleted: boolean;
  onboardingUsername: string;
}

export interface BackupMeta {
  version: string;
  exportedAt: string;
  appId: string;
}

export interface BackupPayload {
  meta: BackupMeta;
  sessions: Session[];
  exercises: Exercise[];
  players: Player[];
  profile: BackupProfile;
  planning: ScheduledSlot[];
  customLabels: string[];
}

export interface ImportSummary {
  restoredKeys: string[];
  skippedKeys: string[];
  missingKeys: string[];
  counts: {
    sessions: number;
    exercises: number;
    players: number;
    planning: number;
  };
  backupVersion: string | null;
  isOlderVersion: boolean;
}

export class InvalidBackupFileError extends Error {
  constructor() {
    super("invalid_backup_file");
    this.name = "InvalidBackupFileError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Version de l'application courante, lue depuis la config Expo (app.json) pour
 * ne jamais avoir à la dupliquer manuellement ici.
 */
export function getAppVersion(): string {
  return Constants.expoConfig?.version ?? "1.0.0";
}

/**
 * Nom de fichier standard pour un export : smashlog-backup-YYYY-MM-DD.json
 */
export function getBackupFileName(date = new Date()): string {
  const iso = date.toISOString().slice(0, 10);
  return `smashlog-backup-${iso}.json`;
}

/**
 * Rassemble l'intégralité des données de l'application (séances, exercices,
 * joueurs, planning, profil et préférences) dans un objet JSON exportable.
 */
export async function buildBackupPayload(): Promise<BackupPayload> {
  const [sessions, exercises, players, customLabels, profile, notificationSettings, planning, onboardingCompleted, onboardingUsername] =
    await Promise.all([
      getSessions(),
      getExercises(),
      getPlayers(),
      getCustomLabels(),
      getProfile(),
      getNotificationSettings(),
      getScheduledSlots(),
      getOnboardingCompleted(),
      getOnboardingUsername(),
    ]);

  return {
    meta: {
      version: getAppVersion(),
      exportedAt: new Date().toISOString(),
      appId: BACKUP_APP_ID,
    },
    sessions,
    exercises,
    players,
    profile: {
      ...profile,
      notificationSettings,
      onboardingCompleted,
      onboardingUsername,
    },
    planning,
    customLabels,
  };
}

/**
 * Écrit la sauvegarde complète dans un fichier JSON temporaire et retourne
 * son chemin, prêt à être partagé via le share sheet natif.
 */
export async function exportBackupAsync(): Promise<{ fileUri: string; fileName: string }> {
  const payload = await buildBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  const fileName = getBackupFileName();
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { fileUri, fileName };
}

export type PickBackupFileResult =
  | { canceled: true }
  | { canceled: false; raw: string };

/**
 * Ouvre le sélecteur de fichiers natif et retourne le contenu brut du fichier
 * JSON choisi (ou `canceled: true` si l'utilisateur annule).
 */
export async function pickBackupFileAsync(): Promise<PickBackupFileResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "public.json", "text/json"],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return { canceled: true };
  }

  const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { canceled: false, raw };
}

/**
 * Vérifie qu'un objet JSON parsé est bien une sauvegarde Smashlog (présence
 * et validité de `meta.appId`).
 */
export function isBackupFile(parsed: unknown): parsed is Partial<BackupPayload> & { meta: BackupMeta } {
  if (!isRecord(parsed) || !isRecord(parsed.meta)) {
    return false;
  }

  return parsed.meta.appId === BACKUP_APP_ID;
}

/**
 * Compare deux numéros de version au format "x.y.z". Retourne un nombre
 * négatif si `a` < `b`, positif si `a` > `b`, 0 si égales.
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const partsB = b.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) {
      return diff > 0 ? 1 : -1;
    }
  }

  return 0;
}

/**
 * Un backup est considéré "ancien" si sa version est strictement inférieure
 * à la version courante de l'app, ou si la version est absente/illisible.
 */
export function isOlderBackupVersion(backupVersion: unknown): boolean {
  if (typeof backupVersion !== "string" || backupVersion.trim().length === 0) {
    return true;
  }

  return compareVersions(backupVersion, getAppVersion()) < 0;
}

function isValidSession(value: unknown): value is Session {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.type === "string"
  );
}

function isValidPlayer(value: unknown): value is Player {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

function isValidExercise(value: unknown): value is Exercise {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

function isValidScheduledSlot(value: unknown): value is ScheduledSlot {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.dayOfWeek === "number" &&
    typeof value.hour === "number" &&
    typeof value.minute === "number"
  );
}

/**
 * Restaure les données depuis un objet JSON de sauvegarde. Toute clé absente
 * ou invalide est ignorée silencieusement : les données existantes pour cette
 * clé ne sont pas écrasées. Les clés présentes et valides remplacent
 * intégralement les données actuelles.
 */
export async function importBackupAsync(parsed: unknown): Promise<ImportSummary> {
  if (!isBackupFile(parsed)) {
    throw new InvalidBackupFileError();
  }

  const payload = parsed;
  const restoredKeys: string[] = [];
  const skippedKeys: string[] = [];
  const missingKeys: string[] = [];
  const counts = { sessions: 0, exercises: 0, players: 0, planning: 0 };

  if (payload.sessions === undefined) {
    missingKeys.push("sessions");
  } else if (Array.isArray(payload.sessions) && payload.sessions.every(isValidSession)) {
    await replaceSessions(payload.sessions);
    restoredKeys.push("sessions");
    counts.sessions = payload.sessions.length;
  } else {
    skippedKeys.push("sessions");
  }

  if (payload.exercises === undefined) {
    missingKeys.push("exercises");
  } else if (Array.isArray(payload.exercises) && payload.exercises.every(isValidExercise)) {
    await replaceExercises(payload.exercises);
    restoredKeys.push("exercises");
    counts.exercises = payload.exercises.length;
  } else {
    skippedKeys.push("exercises");
  }

  if (payload.players === undefined) {
    missingKeys.push("players");
  } else if (Array.isArray(payload.players) && payload.players.every(isValidPlayer)) {
    await replacePlayers(payload.players);
    restoredKeys.push("players");
    counts.players = payload.players.length;
  } else {
    skippedKeys.push("players");
  }

  if (payload.planning === undefined) {
    missingKeys.push("planning");
  } else if (Array.isArray(payload.planning) && payload.planning.every(isValidScheduledSlot)) {
    await saveScheduledSlots(payload.planning);
    restoredKeys.push("planning");
    counts.planning = payload.planning.length;
  } else {
    skippedKeys.push("planning");
  }

  if (Array.isArray(payload.customLabels) && payload.customLabels.every((label) => typeof label === "string")) {
    await saveCustomLabels(payload.customLabels);
  }

  if (payload.profile === undefined || !isRecord(payload.profile)) {
    missingKeys.push("profile");
  } else {
    const incomingProfile = payload.profile as Record<string, unknown>;
    let restoredProfile = false;

    if (typeof incomingProfile.username === "string") {
      await saveProfile({
        username: incomingProfile.username,
        photoUri: typeof incomingProfile.photoUri === "string" ? incomingProfile.photoUri : DEFAULT_PROFILE.photoUri,
      });
      restoredProfile = true;
    }

    if (isRecord(incomingProfile.notificationSettings)) {
      const current = await getNotificationSettings();
      await saveNotificationSettings({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...current,
        ...(incomingProfile.notificationSettings as Partial<NotificationSettings>),
      });
      restoredProfile = true;
    }

    if (typeof incomingProfile.onboardingUsername === "string") {
      await setOnboardingUsername(incomingProfile.onboardingUsername);
      restoredProfile = true;
    }

    if (typeof incomingProfile.onboardingCompleted === "boolean") {
      await setOnboardingCompleted(incomingProfile.onboardingCompleted);
      restoredProfile = true;
    }

    if (restoredProfile) {
      restoredKeys.push("profile");
    } else {
      skippedKeys.push("profile");
    }
  }

  const backupVersion = typeof payload.meta.version === "string" ? payload.meta.version : null;

  return {
    restoredKeys,
    skippedKeys,
    missingKeys,
    counts,
    backupVersion,
    isOlderVersion: isOlderBackupVersion(backupVersion),
  };
}
