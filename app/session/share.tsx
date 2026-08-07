import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ViewShot from "react-native-view-shot";

import { ExercisesShareCard } from "@/src/components/share/ExercisesShareCard";
import { FallbackShareCard } from "@/src/components/share/FallbackShareCard";
import { GenericShareCard } from "@/src/components/share/GenericShareCard";
import { MatchResultShareCard } from "@/src/components/share/MatchResultShareCard";
import { ProgressShareCard } from "@/src/components/share/ProgressShareCard";
import { SessionSummaryShareCard } from "@/src/components/share/SessionSummaryShareCard";
import { SpecialShareCard } from "@/src/components/share/SpecialShareCard";
import { WinRateShareCard } from "@/src/components/share/WinRateShareCard";
import { LoadingView } from "@/src/components/LoadingView";
import { Screen } from "@/src/components/Screen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { getProfile } from "@/src/services/profile";
import { downloadImageAsync, shareImageAsync } from "@/src/services/sharing";
import { SharingPayload } from "@/src/services/sharingOrchestrator";
import { getExercises, getSessions } from "@/src/services/storage";
import { Exercise } from "@/src/types/index";
import { Profile } from "@/src/types/profile";
import { Session } from "@/src/types/session";
import { fonts } from "@/src/theme/typography";

interface ShareTemplate {
  key: string;
  render: () => ReactNode;
}

const EMPTY_PAYLOAD: SharingPayload = { specialCards: [] };

export default function ShareSessionScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { payload: payloadStr, sessionId } = useLocalSearchParams<{ payload?: string; sessionId?: string }>();
  const shareCardRefs = useRef<Array<ViewShot | null>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [profile, setProfile] = useState<Profile>({ username: "Joueur Badlog", photoUri: null });

  const payload = useMemo(() => {
    if (!payloadStr || Array.isArray(payloadStr)) {
      return EMPTY_PAYLOAD;
    }

    try {
      return JSON.parse(payloadStr) as SharingPayload;
    } catch {
      return EMPTY_PAYLOAD;
    }
  }, [payloadStr]);

  useEffect(() => {
    async function load() {
      const [allSessions, nextExercises, nextProfile] = await Promise.all([
        getSessions(),
        getExercises(),
        getProfile(),
      ]);
      const nextSession = allSessions.find((entry) => entry.id === sessionId) ?? null;
      setSessions(allSessions);
      setAllExercises(nextExercises);
      setSession(nextSession);
      setProfile(nextProfile);
      setIsLoading(false);
    }

    load();
  }, [sessionId]);

  // Exercices résolus pour la séance courante
  const sessionExercises = session
    ? allExercises.filter((ex) => session.exerciseIds?.includes(ex.id) ?? false)
    : [];

  const contentWidth = Math.max(windowWidth - 40, 0);
  const shareCardSize =
    Platform.OS === "web"
      ? Math.min(windowWidth - 28, 360)
      : Math.min(contentWidth, windowHeight - 420, 320);
  const sharePageWidth = Platform.OS === "web" ? shareCardSize : contentWidth;
  const sessionNumber = session ? sessions.length : 0;
  const genericTemplates: ShareTemplate[] =
    session && sessionNumber > 0
      ? [
          {
            key: "generic",
            render: () => (
              <GenericShareCard session={session} sessionNumber={sessionNumber} username={profile.username} />
            ),
          },
          ...(payload.winRateSnapshot != null
            ? [
                {
                  key: "winrate-snapshot",
                  render: () => (
                    <WinRateShareCard
                      snapshot={payload.winRateSnapshot!}
                      username={profile.username}
                    />
                  ),
                },
              ]
            : []),
          ...(session.type === "match" && (session.matches ?? []).length === 1
            ? [
                {
                  key: "match-result",
                  render: () => (
                    <MatchResultShareCard
                      session={session}
                      match={session.matches![0]}
                      username={profile.username}
                    />
                  ),
                },
              ]
            : []),
          ...(session.type === "jeu_libre" && (session.matches ?? []).length >= 1
            ? [
                {
                  key: "session-summary",
                  render: () => (
                    <SessionSummaryShareCard session={session} username={profile.username} />
                  ),
                },
              ]
            : []),
          ...(session.type !== "match" && sessionExercises.length >= 2
            ? [
                {
                  key: "exercises",
                  render: () => (
                    <ExercisesShareCard
                      session={session}
                      exercises={sessionExercises}
                      username={profile.username}
                    />
                  ),
                },
              ]
            : []),
          ...(sessionNumber >= 3
            ? [
                {
                  key: "progress",
                  render: () => (
                    <ProgressShareCard
                      sessionNumber={sessionNumber}
                      sessions={sessions}
                      username={profile.username}
                    />
                  ),
                },
              ]
            : []),
        ]
      : [];

  const specialTemplates: ShareTemplate[] = payload.specialCards.map((card, index) => ({
    key: `special-${card.cardType}-${card.value}-${index}`,
    render: () => <SpecialShareCard card={card} sessions={sessions} username={profile.username} />,
  }));

  const fallbackTemplate: ShareTemplate | null =
    session && sessionNumber > 0
      ? {
          key: "fallback",
          render: () => (
            <FallbackShareCard session={session} sessionNumber={sessionNumber} username={profile.username} />
          ),
        }
      : null;

  // Fallback en position 0 par défaut, en position 1 si une carte spéciale est présente
  const templates: ShareTemplate[] = fallbackTemplate
    ? specialTemplates.length > 0
      ? [specialTemplates[0], fallbackTemplate, ...specialTemplates.slice(1), ...genericTemplates]
      : [fallbackTemplate, ...genericTemplates]
    : [...specialTemplates, ...genericTemplates];
  const canGoPrevTemplate = activeTemplate > 0;
  const canGoNextTemplate = activeTemplate < templates.length - 1;

  useEffect(() => {
    setActiveTemplate(0);
  }, [templates.length]);

  function scrollToTemplate(index: number) {
    setActiveTemplate(index);
  }

  async function captureActiveCard() {
    if (!templates.length) {
      return null;
    }

    const activeRef = shareCardRefs.current[activeTemplate];
    const uri = await activeRef?.capture?.();
    return uri ?? null;
  }

  async function handleShare() {
    if (isSharing || isDownloading || !templates.length) {
      return;
    }

    if (Platform.OS === "web") {
      Alert.alert(
        "Partage non disponible sur le web",
        "La previsualisation fonctionne, mais le partage natif de la carte est reserve au mobile pour l'instant.",
      );
      return;
    }

    setIsSharing(true);

    try {
      const uri = await captureActiveCard();
      if (!uri) {
        throw new Error("capture_failed");
      }

      await shareImageAsync(uri);
    } catch {
      Alert.alert(
        "Partage indisponible",
        "Impossible de partager la carte pour le moment sur cet appareil.",
      );
    } finally {
      setIsSharing(false);
    }
  }

  async function handleDownload() {
    if (isDownloading || isSharing || !templates.length) {
      return;
    }

    setIsDownloading(true);

    try {
      const uri = await captureActiveCard();
      if (!uri) {
        throw new Error("capture_failed");
      }

      await downloadImageAsync(uri);
      Alert.alert(
        "Carte téléchargée",
        Platform.OS === "web"
          ? "Le téléchargement de la carte a démarré."
          : "La carte a été enregistrée dans ta photothèque.",
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message === "media_library_permission_denied"
          ? "L'autorisation d'enregistrer dans la photothèque a été refusée."
          : "Impossible d'enregistrer la carte pour le moment.";

      Alert.alert("Téléchargement indisponible", message);
    } finally {
      setIsDownloading(false);
    }
  }

  if (isLoading) {
    return (
      <Screen scrollable nativeHeader>
        <LoadingView />
      </Screen>
    );
  }

  if (!session || !templates.length) {
    return (
      <Screen scrollable nativeHeader>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Partage indisponible</Text>
          <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
            Impossible de retrouver la séance à partager.
          </Text>
          <Pressable onPress={() => router.replace("/(tabs)")} style={[styles.doneButton, { backgroundColor: theme.primary }]}>
            <Text style={[styles.doneButtonText, { color: theme.buttonTextOnPrimary }]}>Retour à l'accueil</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={Platform.OS === "web"} nativeHeader>
      <View style={styles.shareTop}>
        <View style={styles.shareCongratsRow}>
          <Text style={[styles.shareCongrats, { color: theme.text }]}>
            {sessionNumber === 1 ? "Félicitations" : "Séance notée"}
          </Text>
          <Text style={styles.shareCongratsEmoji}>{sessionNumber === 1 ? "🎉" : "🏸"}</Text>
        </View>
        <Text style={[styles.shareSub, { color: theme.secondaryText }]}>
          {sessionNumber === 1 ? "Ta première séance est enregistrée" : "Continue sur cette lancée"}
        </Text>
      </View>

      <View style={styles.pagination}>
        {templates.map((template, index) => (
          <Pressable
            key={template.key}
            onPress={() => scrollToTemplate(index)}
            style={[
              styles.paginationDot,
              index === activeTemplate ? styles.paginationDotActive : null,
              {
                backgroundColor: index === activeTemplate ? theme.primary : theme.surfaceAlt,
              },
            ]}
          />
        ))}
      </View>

      {Platform.OS === "web" ? (
        <View style={styles.webPickerActions}>
          <Pressable
            disabled={!canGoPrevTemplate}
            onPress={() => scrollToTemplate(activeTemplate - 1)}
            style={[
              styles.templateArrow,
              {
                backgroundColor: theme.surfaceAlt,
                opacity: canGoPrevTemplate ? 1 : 0.35,
              },
            ]}
          >
            <Ionicons color={theme.text} name="chevron-back" size={18} />
          </Pressable>

          <View style={[styles.sharePage, { width: shareCardSize }]}>
            <View style={styles.shareCardWrap}>{templates[activeTemplate].render()}</View>
          </View>

          <Pressable
            disabled={!canGoNextTemplate}
            onPress={() => scrollToTemplate(activeTemplate + 1)}
            style={[
              styles.templateArrow,
              {
                backgroundColor: theme.surfaceAlt,
                opacity: canGoNextTemplate ? 1 : 0.35,
              },
            ]}
          >
            <Ionicons color={theme.text} name="chevron-forward" size={18} />
          </Pressable>
        </View>
      ) : (
        <ScrollView
          horizontal
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / sharePageWidth);
            setActiveTemplate(nextIndex);
          }}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={[styles.sharePager, { width: sharePageWidth }]}
        >
          {templates.map((template, index) => (
            <View key={template.key} style={[styles.sharePageMobile, { width: sharePageWidth }]}>
              <ViewShot
                options={{ format: "png", quality: 1, result: "tmpfile" }}
                ref={(ref) => {
                  shareCardRefs.current[index] = ref;
                }}
                style={[styles.shareCardWrap, { width: shareCardSize }]}
              >
                {template.render()}
              </ViewShot>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.bottomSheet}>
        <Text style={[styles.shareHint, { color: theme.secondaryText }]}>
          Partager et inspirer ta communauté
        </Text>

        <View style={styles.shareActions}>
          <Pressable onPress={handleShare} style={styles.shareAction}>
            <View
              style={[
                styles.shareCirclePrimary,
                {
                  backgroundColor: Platform.OS === "web" ? theme.surfaceAlt : theme.primary,
                },
              ]}
            >
              <Ionicons
                color={Platform.OS === "web" ? theme.text : theme.buttonTextOnPrimary}
                name="share-social-outline"
                size={18}
              />
            </View>
            <Text style={[styles.shareActionLabel, { color: theme.secondaryText }]}>
              {Platform.OS === "web" ? "Mobile only" : "Partager"}
            </Text>
          </Pressable>
          <Pressable onPress={handleDownload} style={styles.shareAction}>
            <View
              style={[
                styles.shareCircleSecondary,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons color={theme.text} name="download-outline" size={18} />
            </View>
            <Text style={[styles.shareActionLabel, { color: theme.secondaryText }]}>
              {isDownloading ? "En cours" : "Télécharger"}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.shareDivider, { backgroundColor: theme.border }]} />

        <Pressable onPress={() => router.replace("/(tabs)")} style={[styles.doneButton, { backgroundColor: theme.primary }]}>
          <Text style={[styles.doneButtonText, { color: theme.buttonTextOnPrimary }]}>
            {isSharing ? "Partage..." : "Terminer"}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shareTop: {
    alignItems: "center",
    marginTop: 4,
  },
  shareCongratsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shareCongrats: {
    fontSize: 20,
    fontFamily: fonts.displayExtraBold,
  },
  shareCongratsEmoji: {
    fontSize: 20,
    // Pas de fontFamily custom ici : élément frère (pas imbriqué dans le Text
    // custom-font) pour garantir la police système, seule à couvrir les glyphes emoji.
  },
  shareSub: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
    marginTop: 3,
    marginBottom: 10,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginBottom: 8,
  },
  paginationDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  paginationDotActive: {
    width: 16,
  },
  sharePager: {
    marginBottom: 0,
  },
  webPickerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  templateArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sharePage: {
    paddingHorizontal: 14,
    alignSelf: "center",
  },
  sharePageMobile: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0,
  },
  shareCardWrap: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
  },
  bottomSheet: {
    paddingTop: 10,
    paddingBottom: 0,
  },
  shareHint: {
    fontSize: 11,
    fontFamily: fonts.bodyRegular,
    textAlign: "center",
    marginBottom: 8,
  },
  shareActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    marginBottom: 10,
  },
  shareAction: {
    alignItems: "center",
    gap: 5,
  },
  shareCirclePrimary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  shareCircleSecondary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  shareActionLabel: {
    fontSize: 9,
    lineHeight: 12,
    fontFamily: fonts.bodyRegular,
  },
  shareDivider: {
    height: 1,
    marginBottom: 10,
  },
  doneButton: {
    borderRadius: 12,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButtonText: {
    fontSize: 14,
    fontFamily: fonts.displayBold,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
    textAlign: "center",
    maxWidth: 260,
  },
});
