import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { LabeledInput } from "@/src/components/Form";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { Screen } from "@/src/components/Screen";
import { SectionCard } from "@/src/components/SectionCard";
import { GenericShareCard } from "@/src/components/share/GenericShareCard";
import { ProgressShareCard } from "@/src/components/share/ProgressShareCard";
import { SpecialShareCard } from "@/src/components/share/SpecialShareCard";
import { SESSION_TYPE_OPTIONS } from "@/src/constants/sessionOptions";
import { useAuth } from "@/src/context/AuthContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { flushSyncQueue } from "@/src/services/cloudSync";
import {
  setForceOnboarding,
  setOnboardingCompleted,
  setOnboardingUsername,
} from "@/src/services/onboarding";
import {
  computeSharingPayload,
  getWinRateLastShown,
  resetSpecialCardsHistory,
  resetWinRateThrottle,
  type SharingPayload,
} from "@/src/services/sharingOrchestrator";
import { DEFAULT_PROFILE, getProfile, saveProfile } from "@/src/services/profile";
import { SESSIONS_KEY, getSessions } from "@/src/services/storage";
import { clearSyncQueue, getSyncQueue, type SyncOperation } from "@/src/services/syncQueue";
import { Profile } from "@/src/types/profile";
import { Session } from "@/src/types/session";
import { fonts } from "@/src/theme/typography";

type StreakUnit = "weeks" | "months" | "years";
const DEBUG_SESSION_PREFIX = "debug-session-";
const DEBUG_REAL_SESSIONS_BACKUP_KEY = "badlog_debug_real_sessions_backup";

interface InsertedStreakState {
  rawValue: number;
  unit: StreakUnit;
  weeks: number;
}

function parseInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function convertStreakValueToWeeks(value: number, unit: StreakUnit): number {
  if (unit === "weeks") {
    return value;
  }

  if (unit === "months") {
    if (value === 12) return 52;
    if (value === 18) return 78;
    if (value === 24) return 104;
    return value * 4;
  }

  return value * 52;
}

function isDebugSession(session: Session) {
  return session.id.startsWith(DEBUG_SESSION_PREFIX);
}

function buildFakeSessions(count: number): Session[] {
  const now = new Date();
  const sessions: Session[] = [];
  const streakWeeks = Math.max(1, Math.min(count, 16));

  for (let index = 0; index < count; index += 1) {
    const createdAt = new Date(now);

    if (index < streakWeeks) {
      createdAt.setDate(now.getDate() - index * 7 - ((index * 3) % 5));
    } else {
      createdAt.setDate(now.getDate() - streakWeeks * 7 - ((index - streakWeeks) * 5 + (index % 4) * 9));
    }

    createdAt.setHours(18 + (index % 4), (index * 11) % 60, 0, 0);

    sessions.push({
      id: `${DEBUG_SESSION_PREFIX}${Date.now()}-${count - index}`,
      createdAt: createdAt.toISOString(),
      title: `Séance debug ${count - index}`,
      type: SESSION_TYPE_OPTIONS[index % SESSION_TYPE_OPTIONS.length].value,
      rating: 1 + ((count - index - 1) % 5),
      wentWell: "Debug: points forts",
      wentWrong: "Debug: points faibles",
      nextIntention: "Debug: prochaine intention",
      freeNotes: "Séance générée pour tester le partage",
    });
  }

  return sessions.sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export default function DebugScreen() {
  const { theme } = useAppTheme();
  const { user, isConnected, isBetaUser, isPremium, isAdmin, isPremiumOrBeta, refreshFeatureFlags } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const [isRefreshingFlags, setIsRefreshingFlags] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<SyncOperation[]>([]);
  const [isFlushing, setIsFlushing] = useState(false);
  const [lastFlushError, setLastFlushError] = useState<string | null>(null);
  const [sessionCountInput, setSessionCountInput] = useState("10");
  const [weeksStreakInput, setWeeksStreakInput] = useState("");
  const [streakUnit, setStreakUnit] = useState<StreakUnit>("weeks");
  const [sessionsPerWeekInput, setSessionsPerWeekInput] = useState("");
  const [onboardingUsernameInput, setOnboardingUsernameInput] = useState("");
  const [currentSessionCount, setCurrentSessionCount] = useState(0);
  const [currentRealSessionCount, setCurrentRealSessionCount] = useState(0);
  const [currentDebugSessionCount, setCurrentDebugSessionCount] = useState(0);
  const [hasRealSessionsBackup, setHasRealSessionsBackup] = useState(false);
  const [payloadPreview, setPayloadPreview] = useState<string>("");
  const [isInjecting, setIsInjecting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [insertedWeeksStreak, setInsertedWeeksStreak] = useState<InsertedStreakState | undefined>();
  const [insertedSessionsPerWeek, setInsertedSessionsPerWeek] = useState<number | undefined>();
  const [generatedPayload, setGeneratedPayload] = useState<SharingPayload | null>(null);
  const [generatedSession, setGeneratedSession] = useState<Session | null>(null);
  const [generatedSessions, setGeneratedSessions] = useState<Session[]>([]);
  const [winRateLastShown, setWinRateLastShown] = useState<Date | null | undefined>(undefined);
  const [isResettingWinRate, setIsResettingWinRate] = useState(false);
  const [isResettingSpecialCards, setIsResettingSpecialCards] = useState(false);

  async function refreshCount() {
    const sessions = await getSessions();
    const realSessions = sessions.filter((session) => !isDebugSession(session));
    const debugSessions = sessions.filter(isDebugSession);
    const backup = await AsyncStorage.getItem(DEBUG_REAL_SESSIONS_BACKUP_KEY);
    setCurrentSessionCount(sessions.length);
    setCurrentRealSessionCount(realSessions.length);
    setCurrentDebugSessionCount(debugSessions.length);
    setHasRealSessionsBackup(Boolean(backup));
  }

  async function refreshQueue() {
    setPendingOperations(await getSyncQueue());
  }

  async function handleForceFlush() {
    setIsFlushing(true);
    try {
      const result = await flushSyncQueue();
      setLastFlushError(result.lastError);
      await refreshQueue();
      Alert.alert(
        "Flush terminé",
        result.lastError
          ? `${result.flushed} synchronisée(s), ${result.remaining} en attente.\n\nErreur qui a stoppé le flush :\n${result.lastError}`
          : `${result.flushed} synchronisée(s), ${result.remaining} en attente.`,
      );
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Impossible de lancer le flush.");
    } finally {
      setIsFlushing(false);
    }
  }

  function handleClearQueue() {
    Alert.alert(
      "Vider la file de synchronisation",
      "Les opérations en attente seront abandonnées sans être rejouées vers Supabase. À utiliser uniquement pour des entrées cassées (ex : mauvais format d'id) que le flush ne pourra jamais résoudre.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Vider",
          style: "destructive",
          onPress: async () => {
            await clearSyncQueue();
            setLastFlushError(null);
            await refreshQueue();
          },
        },
      ],
    );
  }

  // L'accès à cet écran est désormais conditionné au flag admin (public.profiles.admin),
  // verrouillé côté DB (cf. migration admin_flag_and_column_protection) — plus au pseudo
  // local "admin", trop facile à usurper une fois l'app en production.
  useEffect(() => {
    async function bootstrap() {
      const nextProfile = await getProfile();
      setProfile(nextProfile);
      setOnboardingUsernameInput(nextProfile.username);

      if (!isAdmin) {
        setIsAllowed(false);
        router.replace("/settings");
        return;
      }

      setIsAllowed(true);
      await refreshCount();
      await refreshQueue();
      setWinRateLastShown(await getWinRateLastShown());
    }

    bootstrap();
  }, [isAdmin]);

  const previewCardWidth = Math.min(windowWidth - 72, 360);
  const streakValue = weeksStreakInput.trim().length > 0 ? Math.max(parseInteger(weeksStreakInput), 0) : undefined;
  const convertedWeeks = streakValue === undefined ? undefined : convertStreakValueToWeeks(streakValue, streakUnit);

  const generatedTemplates = useMemo(() => {
    if (!generatedPayload || !generatedSession) {
      return [];
    }

    const sessionNumber = generatedSessions.length;
    const specialTemplates = generatedPayload.specialCards.map((card, index) => ({
      key: `special-${card.cardType}-${card.value}-${index}`,
      render: () => <SpecialShareCard card={card} sessions={generatedSessions} username={profile.username} />,
    }));

    const genericTemplates = [
      {
        key: "generic",
        render: () => (
          <GenericShareCard
            session={generatedSession}
            sessionNumber={sessionNumber}
            username={profile.username}
          />
        ),
      },
      ...(generatedSessions.length >= 7
        ? [
            {
              key: "progress",
              render: () => (
                <ProgressShareCard
                  sessionNumber={sessionNumber}
                  sessions={generatedSessions}
                  username={profile.username}
                />
              ),
            },
          ]
        : []),
    ];

    return [...specialTemplates, ...genericTemplates];
  }, [generatedPayload, generatedSession, generatedSessions, profile.username]);

  async function handleInjectSessions() {
    const count = Math.max(parseInteger(sessionCountInput), 0);
    setIsInjecting(true);

    try {
      if (!isAllowed) {
        Alert.alert("Accès refusé", "Cet écran debug est réservé au mode développement avec le profil admin.");
        return;
      }

      const existingSessions = await getSessions();
      const realSessions = existingSessions.filter((session) => !isDebugSession(session));
      const sessions = buildFakeSessions(count);
      const mergedSessions = [...sessions, ...realSessions].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      );

      await AsyncStorage.setItem(
        DEBUG_REAL_SESSIONS_BACKUP_KEY,
        JSON.stringify(realSessions),
      );
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(mergedSessions));
      await refreshCount();
      Alert.alert(
        "Séances mises à jour",
        `${count} séances fictives ont été ajoutées sans toucher aux ${realSessions.length} vraies séances.`,
      );
    } catch {
      Alert.alert("Erreur", "Impossible d'insérer les séances fictives.");
    } finally {
      setIsInjecting(false);
    }
  }

  async function handleRemoveDebugSessions() {
    setIsInjecting(true);

    try {
      if (!isAllowed) {
        Alert.alert("Accès refusé", "Cet écran debug est réservé au mode développement avec le profil admin.");
        return;
      }

      const sessions = await getSessions();
      const realSessions = sessions.filter((session) => !isDebugSession(session));
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(realSessions));
      await refreshCount();
      Alert.alert("Séances debug supprimées", "Toutes les séances fictives ont été retirées.");
    } catch {
      Alert.alert("Erreur", "Impossible de supprimer les séances debug.");
    } finally {
      setIsInjecting(false);
    }
  }

  async function handleRestoreRealSessions() {
    setIsInjecting(true);

    try {
      if (!isAllowed) {
        Alert.alert("Accès refusé", "Cet écran debug est réservé au mode développement avec le profil admin.");
        return;
      }

      const backup = await AsyncStorage.getItem(DEBUG_REAL_SESSIONS_BACKUP_KEY);
      if (!backup) {
        Alert.alert("Aucune sauvegarde", "Aucune sauvegarde des vraies séances n'est disponible.");
        return;
      }

      const realSessions = JSON.parse(backup) as Session[];
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(realSessions));
      await refreshCount();
      Alert.alert("Vraies séances restaurées", `${realSessions.length} séance(s) ont été restaurées.`);
    } catch {
      Alert.alert("Erreur", "Impossible de restaurer les vraies séances.");
    } finally {
      setIsInjecting(false);
    }
  }

  function handleInsertWeeksStreak() {
    if (!isAllowed) {
      Alert.alert("Accès refusé", "Cet écran debug est réservé au mode développement avec le profil admin.");
      return;
    }

    if (streakValue === undefined || convertedWeeks === undefined) {
      setInsertedWeeksStreak(undefined);
    } else {
      setInsertedWeeksStreak({
        rawValue: streakValue,
        unit: streakUnit,
        weeks: convertedWeeks,
      });
    }
    Alert.alert(
      "Week Streak mis à jour",
      convertedWeeks === undefined
        ? "Aucun override actif."
        : `Streak forcé : ${streakValue} ${streakUnit === "weeks" ? "semaines" : streakUnit === "months" ? "mois" : "années"} (${convertedWeeks} semaines internes)`,
    );
  }

  function handleInsertSessionsPerWeek() {
    if (!isAllowed) {
      Alert.alert("Accès refusé", "Cet écran debug est réservé au mode développement avec le profil admin.");
      return;
    }

    const value =
      sessionsPerWeekInput.trim().length > 0 ? Math.max(parseInteger(sessionsPerWeekInput), 0) : undefined;
    setInsertedSessionsPerWeek(value);
    Alert.alert(
      "Séances / semaine mises à jour",
      value === undefined ? "Aucun override actif." : `${value} séance(s) sur la semaine courante`,
    );
  }

  async function handleGenerateResult() {
    setIsGenerating(true);

    try {
      if (!isAllowed) {
        Alert.alert("Accès refusé", "Cet écran debug est réservé au mode développement avec le profil admin.");
        return;
      }

      const sessions = await getSessions();
      const simulatedSession: Session = {
        id: `debug-generated-${Date.now()}`,
        createdAt: new Date().toISOString(),
        title: "Séance debug générée",
        type: "match",
        rating: 4,
        wentWell: "Simulation debug",
        wentWrong: "Simulation debug",
        nextIntention: "Simulation debug",
        freeNotes: "Simulation de résultat",
      };
      const simulatedSessions = [simulatedSession, ...sessions].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      );
      const payload = await computeSharingPayload(simulatedSessions, {
        weeksStreak: insertedWeeksStreak?.weeks,
        sessionsThisWeek: insertedSessionsPerWeek,
      });

      setGeneratedPayload(payload);
      setGeneratedSession(simulatedSession);
      setGeneratedSessions(simulatedSessions);
      setPayloadPreview(JSON.stringify(payload, null, 2));
      await refreshCount();
    } catch {
      Alert.alert("Erreur", "Impossible de générer le résultat.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleResetWinRateThrottle() {
    setIsResettingWinRate(true);
    try {
      await resetWinRateThrottle();
      setWinRateLastShown(null);
      Alert.alert("Throttle réinitialisé", "La carte Win Rate peut être déclenchée dès la prochaine génération.");
    } catch {
      Alert.alert("Erreur", "Impossible de réinitialiser le throttle.");
    } finally {
      setIsResettingWinRate(false);
    }
  }

  async function handleResetSpecialCardsHistory() {
    setIsResettingSpecialCards(true);
    try {
      await resetSpecialCardsHistory();
      Alert.alert(
        "Historique réinitialisé",
        "Les cartes de palier (milestone / streak semaines / séances par semaine) pourront être redéclenchées dès la prochaine génération, même si le palier a déjà été affiché.",
      );
    } catch {
      Alert.alert("Erreur", "Impossible de réinitialiser l'historique.");
    } finally {
      setIsResettingSpecialCards(false);
    }
  }

  async function handleRefreshFlags() {
    setIsRefreshingFlags(true);
    try {
      await refreshFeatureFlags();
    } catch {
      Alert.alert("Erreur", "Impossible de rafraîchir les feature flags.");
    } finally {
      setIsRefreshingFlags(false);
    }
  }

  async function handleLaunchOnboarding() {
    const nextUsername = onboardingUsernameInput.trim() || DEFAULT_PROFILE.username;

    setIsInjecting(true);

    try {
      if (!isAllowed) {
        Alert.alert("Accès refusé", "Cet écran debug est réservé au mode développement avec le profil admin.");
        return;
      }

      await saveProfile({
        ...profile,
        username: nextUsername,
      });
      await setOnboardingUsername(nextUsername);
      await setForceOnboarding(true);
      await setOnboardingCompleted(false);

      setProfile((current) => ({
        ...current,
        username: nextUsername,
      }));

      if (nextUsername.trim().toLowerCase() !== "admin") {
        setIsAllowed(false);
      }

      router.replace("/onboarding/splash");
    } catch {
      Alert.alert("Erreur", "Impossible de lancer l'onboarding.");
    } finally {
      setIsInjecting(false);
    }
  }

  return (
    <Screen scrollable>
      <Text style={[styles.title, { color: theme.text }]}>Debug partage</Text>
      <Text style={[styles.description, { color: theme.secondaryText }]}>
        Outils de test locaux pour streaks, milestones et cartes de partage.
      </Text>

      <SectionCard>
        <Text style={[styles.blockTitle, { color: theme.text }]}>Feature flags (cloud)</Text>
        <Text style={[styles.meta, { color: theme.secondaryText }]}>
          Valeurs actuelles exposées par useAuth(), lues depuis public.profiles.
        </Text>
        <Text style={[styles.meta, { color: theme.secondaryText }]}>
          Connecté : {isConnected ? "Oui" : "Non"}{user?.email ? ` (${user.email})` : ""}
        </Text>
        <Text style={[styles.meta, { color: theme.secondaryText }]}>
          isBetaUser : {isBetaUser ? "true" : "false"} · isPremium : {isPremium ? "true" : "false"} ·
          isPremiumOrBeta : {isPremiumOrBeta ? "true" : "false"} · isAdmin : {isAdmin ? "true" : "false"}
        </Text>
        <Text style={[styles.meta, { color: theme.secondaryText }]}>
          Pour tester : dans Supabase → Table Editor ou SQL Editor, modifie beta_access, premium_access ou
          admin sur ta ligne profiles, puis appuie sur "Rafraîchir" ci-dessous. Ces colonnes sont verrouillées
          uniquement en écriture depuis l'app (cf. migration admin_flag_and_column_protection) — le Dashboard
          n'est pas concerné.
        </Text>
        <PrimaryButton
          disabled={isRefreshingFlags || !isConnected}
          label={isRefreshingFlags ? "Rafraîchissement..." : "Rafraîchir depuis Supabase"}
          onPress={handleRefreshFlags}
          tone="secondary"
        />
      </SectionCard>

      <SectionCard>
        <Text style={[styles.blockTitle, { color: theme.text }]}>File de synchronisation</Text>
        <Text style={[styles.meta, { color: theme.secondaryText }]}>
          Opérations en attente : {pendingOperations.length}
        </Text>
        {pendingOperations.length === 0 ? (
          <Text style={[styles.meta, { color: theme.secondaryText }]}>Rien en attente.</Text>
        ) : (
          pendingOperations.map((op) => (
            <View key={op.id} style={[styles.queueItem, { borderColor: theme.border }]}>
              <Text style={[styles.queueItemTitle, { color: theme.text }]}>
                {op.table} · {op.operation}
              </Text>
              <Text style={[styles.queueItemMeta, { color: theme.secondaryText }]}>
                Depuis : {new Date(op.createdAt).toLocaleString("fr-FR")}
              </Text>
              <Text style={[styles.queueItemPayload, { color: theme.secondaryText }]}>
                {JSON.stringify(op.payload)}
              </Text>
            </View>
          ))
        )}
        {lastFlushError ? (
          <Text style={[styles.queueError, { color: theme.text }]}>Dernière erreur : {lastFlushError}</Text>
        ) : null}
        <View style={styles.debugActions}>
          <PrimaryButton
            disabled={isFlushing}
            label={isFlushing ? "Flush en cours..." : "Forcer un flush maintenant"}
            onPress={handleForceFlush}
            tone="secondary"
          />
        </View>
        <View style={styles.debugActions}>
          <PrimaryButton label="Rafraîchir la liste" onPress={refreshQueue} tone="secondary" />
        </View>
        <View style={styles.debugActions}>
          <PrimaryButton
            disabled={pendingOperations.length === 0}
            label="Vider la file (entrées cassées)"
            onPress={handleClearQueue}
            tone="secondary"
          />
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={[styles.blockTitle, { color: theme.text }]}>Séances</Text>
        <Text style={[styles.meta, { color: theme.secondaryText }]}>
          Séances actuellement stockées : {currentSessionCount}
        </Text>
        <Text style={[styles.meta, { color: theme.secondaryText }]}>
          Vraies séances : {currentRealSessionCount} · Séances debug : {currentDebugSessionCount}
        </Text>
        <LabeledInput
          label="Nombre de séances fictives"
          onChangeText={setSessionCountInput}
          placeholder="10"
          value={sessionCountInput}
        />
        <PrimaryButton
          label={isInjecting ? "Insertion..." : "Insérer"}
          onPress={handleInjectSessions}
        />
        <View style={styles.debugActions}>
          <PrimaryButton
            disabled={isInjecting || currentDebugSessionCount === 0}
            label="Supprimer les séances debug"
            onPress={handleRemoveDebugSessions}
            tone="secondary"
          />
        </View>
        <View style={styles.debugActions}>
          <PrimaryButton
            disabled={isInjecting || !hasRealSessionsBackup}
            label="Restaurer les vraies séances"
            onPress={handleRestoreRealSessions}
            tone="secondary"
          />
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={[styles.blockTitle, { color: theme.text }]}>Week Streak</Text>
        <Text style={[styles.meta, { color: theme.secondaryText }]}>
          Valeur forcée active : {insertedWeeksStreak
            ? `${insertedWeeksStreak.rawValue} ${
                insertedWeeksStreak.unit === "weeks"
                  ? "semaines"
                  : insertedWeeksStreak.unit === "months"
                    ? "mois"
                    : "années"
              }`
            : "aucune"}
        </Text>
        <View style={styles.unitRow}>
          <View style={styles.unitButton}>
            <PrimaryButton
              label="Semaines"
              onPress={() => setStreakUnit("weeks")}
              tone={streakUnit === "weeks" ? "primary" : "secondary"}
            />
          </View>
          <View style={styles.unitButton}>
            <PrimaryButton
              label="Mois"
              onPress={() => setStreakUnit("months")}
              tone={streakUnit === "months" ? "primary" : "secondary"}
            />
          </View>
          <View style={styles.unitButton}>
            <PrimaryButton
              label="Années"
              onPress={() => setStreakUnit("years")}
              tone={streakUnit === "years" ? "primary" : "secondary"}
            />
          </View>
        </View>
        <LabeledInput
          label={
            streakUnit === "weeks"
              ? "Nombre de semaines"
              : streakUnit === "months"
                ? "Nombre de mois"
                : "Nombre d'années"
          }
          onChangeText={setWeeksStreakInput}
          placeholder={streakUnit === "years" ? "Ex : 1" : streakUnit === "months" ? "Ex : 12" : "Ex : 8"}
          value={weeksStreakInput}
        />
        <Text style={[styles.meta, { color: theme.secondaryText }]}>
          Conversion interne : {convertedWeeks ?? "aucune"} semaine(s)
        </Text>
        <PrimaryButton label="Insérer" onPress={handleInsertWeeksStreak} />
      </SectionCard>

      <SectionCard>
        <Text style={[styles.blockTitle, { color: theme.text }]}>Séances sur une semaine</Text>
        <Text style={[styles.meta, { color: theme.secondaryText }]}>
          Valeur forcée active : {insertedSessionsPerWeek ?? "aucune"}
        </Text>
        <LabeledInput
          label="Nombre de séances cette semaine"
          onChangeText={setSessionsPerWeekInput}
          placeholder="Ex : 7"
          value={sessionsPerWeekInput}
        />
        <PrimaryButton label="Insérer" onPress={handleInsertSessionsPerWeek} />
      </SectionCard>

      <SectionCard>
        <Text style={[styles.blockTitle, { color: theme.text }]}>Onboarding</Text>
        <Text style={[styles.meta, { color: theme.secondaryText }]}>
          Relance le flux d'onboarding sans supprimer les séances déjà enregistrées.
        </Text>
        <LabeledInput
          label="Pseudo à utiliser"
          onChangeText={setOnboardingUsernameInput}
          placeholder="admin"
          value={onboardingUsernameInput}
        />
        <PrimaryButton
          label={isInjecting ? "Ouverture..." : "Lancer l'onboarding"}
          onPress={handleLaunchOnboarding}
        />
      </SectionCard>

      <SectionCard>
        <Text style={[styles.blockTitle, { color: theme.text }]}>Win Rate — throttle</Text>
        <Text style={[styles.meta, { color: theme.secondaryText }]}>
          {winRateLastShown === undefined
            ? "Chargement…"
            : winRateLastShown === null
              ? "Jamais affiché — carte éligible immédiatement."
              : `Dernier affichage : ${winRateLastShown.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} à ${winRateLastShown.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} — délai restant : ${Math.max(0, 7 - Math.floor((Date.now() - winRateLastShown.getTime()) / (1000 * 60 * 60 * 24)))} j`}
        </Text>
        <PrimaryButton
          disabled={isResettingWinRate || winRateLastShown === null}
          label={isResettingWinRate ? "Réinitialisation…" : "Reset throttle (forcer affichage)"}
          onPress={handleResetWinRateThrottle}
          tone="secondary"
        />
      </SectionCard>

      <SectionCard>
        <Text style={[styles.blockTitle, { color: theme.text }]}>Cartes de palier — anti-doublon</Text>
        <Text style={[styles.meta, { color: theme.secondaryText }]}>
          Un palier (milestone / streak semaines / séances par semaine) n'est affiché qu'une fois par
          contexte (semaine en cours pour les streaks). Réinitialiser l'historique permet de le
          redéclencher pour tester, même si sa valeur n'a pas changé.
        </Text>
        <PrimaryButton
          disabled={isResettingSpecialCards}
          label={isResettingSpecialCards ? "Réinitialisation…" : "Reset historique paliers (forcer réaffichage)"}
          onPress={handleResetSpecialCardsHistory}
          tone="secondary"
        />
      </SectionCard>

      <PrimaryButton
        label={isGenerating ? "Génération..." : "Générer résultat"}
        onPress={handleGenerateResult}
      />

      <SectionCard>
        <Text style={[styles.blockTitle, { color: theme.text }]}>Résultat</Text>
        <Text style={[styles.json, { color: theme.text }]}>
          {payloadPreview || "{\n  \"specialCards\": []\n}"}
        </Text>
      </SectionCard>

      {generatedTemplates.length > 0 ? (
        <SectionCard>
          <Text style={[styles.blockTitle, { color: theme.text }]}>Cartes générées</Text>
          <View style={styles.previewStack}>
            {generatedTemplates.map((template) => (
              <View key={template.key} style={[styles.previewCard, { width: previewCardWidth }]}>
                {template.render()}
              </View>
            ))}
          </View>
        </SectionCard>
      ) : null}
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
  blockTitle: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.bodyRegular,
    marginBottom: 12,
  },
  json: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Courier",
  },
  unitRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  unitButton: {
    flex: 1,
  },
  previewStack: {
    gap: 16,
    alignItems: "center",
  },
  debugActions: {
    marginTop: 10,
  },
  previewCard: {
    borderRadius: 18,
    overflow: "hidden",
  },
  queueItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    gap: 2,
  },
  queueItemTitle: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
  },
  queueItemMeta: {
    fontSize: 11,
    fontFamily: fonts.bodyRegular,
  },
  queueItemPayload: {
    fontSize: 11,
    fontFamily: "Courier",
    marginTop: 4,
  },
  queueError: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.bodyMedium,
    marginBottom: 10,
  },
});
