import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { DateTimeField } from "@/src/components/DateTimeField";
import { LabeledInput } from "@/src/components/Form";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { LoadingView } from "@/src/components/LoadingView";
import { RatingPicker } from "@/src/components/RatingPicker";
import { Screen } from "@/src/components/Screen";
import { SectionCard } from "@/src/components/SectionCard";
import { SessionTypePicker } from "@/src/components/SessionTypePicker";
import { SESSION_TYPE_LABELS } from "@/src/constants/sessionOptions";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { getNotificationSettings } from "@/src/services/settings";
import { rescheduleNotifications } from "@/src/services/notifications";
import { deleteSession, getExerciseById, getSessionById, getSessions, updateSession } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { Exercise } from "@/src/types/index";
import { Match, Session } from "@/src/types/session";
import { formatDate } from "@/src/utils/format";

interface EditableSession {
  createdAt: Date;
  title: string;
  type: Session["type"];
  rating: number;
  wentWell: string;
  wentWrong: string;
  nextIntention: string;
  freeNotes: string;
}

// ── Helpers matchs ────────────────────────────────────────────────────────────

function formatMatchScore(sets: Match["sets"]): string {
  if (sets.length === 0) return "";
  return sets.map((s) => `${s.scoreNous}-${s.scoreEux}`).join(", ");
}

const MATCH_MODE_LABELS: Record<Match["mode"], string> = {
  simple: "Simple",
  double: "Double",
  mixte: "Mixte",
};

const MATCH_RESULT_LABELS: Record<Match["resultat"], string> = {
  victoire: "Victoire",
  defaite: "Défaite",
};

// ── Carte match (vue lecture) ─────────────────────────────────────────────────

function MatchDetailCard({ match }: { match: Match }) {
  const { theme } = useAppTheme();
  const isWin = match.resultat === "victoire";
  const barColor = isWin ? "#CEFF00" : "#FF4D6D";
  const score = formatMatchScore(match.sets);

  return (
    <View
      style={[
        matchStyles.card,
        { borderColor: theme.border },
      ]}
    >
      <View style={[matchStyles.bar, { backgroundColor: barColor }]} />
      <View style={matchStyles.content}>
        <View style={matchStyles.topRow}>
          <View
            style={[
              matchStyles.resultBadge,
              { backgroundColor: isWin ? "rgba(206,255,0,0.1)" : "rgba(255,77,109,0.1)" },
            ]}
          >
            <Text style={[matchStyles.resultBadgeText, { color: isWin ? "#CEFF00" : "#FF4D6D" }]}>
              {MATCH_RESULT_LABELS[match.resultat]}
            </Text>
          </View>
          <View style={[matchStyles.modeBadge, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
            <Text style={[matchStyles.modeBadgeText, { color: theme.secondaryText }]}>
              {MATCH_MODE_LABELS[match.mode]}
            </Text>
          </View>
          {score ? (
            <Text style={[matchStyles.score, { color: theme.text }]}>{score}</Text>
          ) : null}
        </View>
        <Text style={[matchStyles.vs, { color: theme.tertiaryText }]}>
          vs.{" "}
          <Text style={[matchStyles.vsName, { color: theme.text }]}>{match.adversaire}</Text>
          {match.partenaire ? (
            <Text style={{ color: theme.tertiaryText }}> · avec {match.partenaire}</Text>
          ) : null}
        </Text>
        {match.commentaire ? (
          <Text style={[matchStyles.comment, { color: theme.secondaryText, borderLeftColor: theme.border }]}>
            {match.commentaire}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ── Section matchs ────────────────────────────────────────────────────────────

function MatchesSection({ matches }: { matches: Match[] }) {
  const { theme } = useAppTheme();
  if (matches.length === 0) return null;

  const wins = matches.filter((m) => m.resultat === "victoire").length;
  const losses = matches.filter((m) => m.resultat === "defaite").length;
  const winRate = Math.round((wins / matches.length) * 100);

  return (
    <SectionCard>
      <Text style={[styles.matchesSectionTitle, { color: theme.secondaryText }]}>
        Matchs · {matches.length} joué{matches.length > 1 ? "s" : ""}
      </Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Text style={[styles.statValue, { color: "#CEFF00" }]}>{wins}</Text>
          <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
            Victoire{wins > 1 ? "s" : ""}
          </Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Text style={[styles.statValue, { color: "#FF4D6D" }]}>{losses}</Text>
          <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
            Défaite{losses > 1 ? "s" : ""}
          </Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Text style={[styles.statValue, { color: theme.tertiaryText }]}>{winRate}%</Text>
          <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Win rate</Text>
        </View>
      </View>

      {/* Cartes match */}
      <View style={styles.matchList}>
        {matches.map((match, index) => (
          <MatchDetailCard key={index} match={match} />
        ))}
      </View>
    </SectionCard>
  );
}

// ── Section exercices liés ────────────────────────────────────────────────────

function LinkedExercisesSection({ exercises }: { exercises: Exercise[] }) {
  const { theme } = useAppTheme();
  const router = useRouter();

  return (
    <SectionCard>
      <Text style={[styles.matchesSectionTitle, { color: theme.secondaryText }]}>
        Exercices travaillés · {exercises.length}
      </Text>
      {exercises.map((ex, idx) => (
        <Pressable
          key={ex.id}
          onPress={() =>
            router.push({ pathname: "/exercise/[id]", params: { id: ex.id } })
          }
          style={[
            linkedStyles.row,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
        >
          <View style={[linkedStyles.badge, { backgroundColor: "rgba(0,229,255,0.1)" }]}>
            <Text style={[linkedStyles.badgeText, { color: theme.accent3 }]}>{idx + 1}</Text>
          </View>
          <Text style={[linkedStyles.name, { color: theme.text }]} numberOfLines={1}>
            {ex.name}
          </Text>
          {ex.durationMinutes ? (
            <Text style={[linkedStyles.dur, { color: theme.secondaryText }]}>
              {ex.durationMinutes}′
            </Text>
          ) : null}
          <Ionicons name="chevron-forward" size={14} color={theme.secondaryText} />
        </Pressable>
      ))}
    </SectionCard>
  );
}

const linkedStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.displayBold,
  },
  name: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
  },
  dur: {
    fontSize: 11,
    fontFamily: fonts.bodyRegular,
    flexShrink: 0,
  },
});

// ── Composant Field ───────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();

  return (
    <SectionCard>
      <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: theme.text }]}>{value}</Text>
    </SectionCard>
  );
}

export default function SessionDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id, from, filter } = useLocalSearchParams<{ id: string; from?: string; filter?: string }>();
  const { theme } = useAppTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [draft, setDraft] = useState<EditableSession | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [linkedExercises, setLinkedExercises] = useState<Exercise[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Surcharge du bouton retour quand on vient de "Mes intentions"
  useEffect(() => {
    if (from !== "intentions") return;
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() =>
            router.replace({ pathname: "/intentions", params: { filter: filter ?? "tous" } })
          }
          style={styles.headerBack}
        >
          <Ionicons color="#9999AA" name="chevron-back" size={18} />
          <Text style={[styles.headerBackText, { color: "#9999AA" }]}>Mes intentions</Text>
        </Pressable>
      ),
    });
  }, [from, filter, navigation, router]);

  const loadSession = useCallback(async () => {
    if (!id) {
      return;
    }

    setIsLoading(true);
    const nextSession = await getSessionById(id);
    setSession(nextSession);
    setDraft(
      nextSession
        ? {
            createdAt: new Date(nextSession.createdAt),
            title: nextSession.title ?? "",
            type: nextSession.type,
            rating: nextSession.rating,
            wentWell: nextSession.wentWell,
            wentWrong: nextSession.wentWrong,
            nextIntention: nextSession.nextIntention,
            freeNotes: nextSession.freeNotes ?? "",
          }
        : null,
    );
    if (nextSession?.exerciseIds?.length) {
      const exs = await Promise.all(
        nextSession.exerciseIds.map((eid) => getExerciseById(eid)),
      );
      setLinkedExercises(exs.filter((e): e is Exercise => e !== null));
    } else {
      setLinkedExercises([]);
    }
    setIsLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadSession();
    }, [loadSession]),
  );

  async function confirmAndDelete() {
    if (!session) {
      return;
    }

    await deleteSession(session.id);
    const sessions = await getSessions();
    const settings = await getNotificationSettings();
    const latestSession = sessions[0];
    const notificationState = await rescheduleNotifications(sessions, settings);
    if (latestSession) {
      await updateSession(latestSession.id, notificationState);
    }
    router.replace("/(tabs)");
  }

  async function handleDelete() {
    if (!session) {
      return;
    }

    if (Platform.OS === "web") {
      const confirmed = globalThis.confirm?.("Supprimer cette séance ? Cette action est définitive.");
      if (confirmed) {
        await confirmAndDelete();
      }
      return;
    }

    Alert.alert(
      "Supprimer la séance",
      "Cette action est définitive.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: confirmAndDelete,
        },
      ],
    );
  }

  async function handleSave() {
    if (!session || !draft || isSaving) {
      return;
    }

    if (
      draft.rating < 1 ||
      draft.wentWell.trim().length === 0 ||
      draft.wentWrong.trim().length === 0 ||
      draft.nextIntention.trim().length === 0
    ) {
      Alert.alert("Champs incomplets", "Remplis la note, les retours et l'intention.");
      return;
    }

    setIsSaving(true);

    try {
      await updateSession(session.id, {
        createdAt: draft.createdAt.toISOString(),
        title: draft.title.trim() || undefined,
        type: draft.type,
        rating: draft.rating,
        wentWell: draft.wentWell.trim(),
        wentWrong: draft.wentWrong.trim(),
        nextIntention: draft.nextIntention.trim(),
        freeNotes: draft.freeNotes.trim() || undefined,
      });

      const sessions = await getSessions();
      const settings = await getNotificationSettings();
      const latestSession = sessions[0];
      const notificationState = await rescheduleNotifications(sessions, settings);
      if (latestSession) {
        await updateSession(latestSession.id, notificationState);
      }

      setIsEditing(false);
      await loadSession();
    } catch (error) {
      Alert.alert("Erreur", "Impossible de mettre à jour la séance.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Screen>
        <LoadingView />
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        <Text style={[styles.missing, { color: theme.text }]}>Séance introuvable.</Text>
      </Screen>
    );
  }

  const footer = isEditing ? (
    <View style={styles.footerButtons}>
      <PrimaryButton label="Annuler" onPress={() => {
        setIsEditing(false);
        setDraft({
          createdAt: new Date(session.createdAt),
          title: session.title ?? "",
          type: session.type,
          rating: session.rating,
          wentWell: session.wentWell,
          wentWrong: session.wentWrong,
          nextIntention: session.nextIntention,
          freeNotes: session.freeNotes ?? "",
        });
      }} tone="secondary" />
      <PrimaryButton label={isSaving ? "Enregistrement..." : "Enregistrer"} onPress={handleSave} />
    </View>
  ) : (
    <View style={styles.footerButtons}>
      <PrimaryButton label="Modifier la séance" onPress={() => setIsEditing(true)} />
      <PrimaryButton label="Supprimer la séance" onPress={handleDelete} tone="danger" />
    </View>
  );

  return (
    <Screen scrollable footer={footer}>
      <SectionCard>
        <View style={styles.headerRow}>
          <View style={styles.headingBlock}>
            {session.title ? <Text style={[styles.sessionTitle, { color: theme.text }]}>{session.title}</Text> : null}
            <Text style={[styles.heading, { color: theme.text }]}>{SESSION_TYPE_LABELS[session.type]}</Text>
          </View>
          {!isEditing ? (
            <Pressable onPress={() => setIsEditing(true)}>
              <Text style={[styles.editLink, { color: theme.primary }]}>Modifier</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={[styles.meta, { color: theme.secondaryText }]}>{formatDate(session.createdAt)}</Text>
        <Text style={[styles.stars, { color: theme.accent }]}>{Array.from({ length: 5 }, (_, index) => (index < session.rating ? "★" : "☆")).join(" ")}</Text>
      </SectionCard>

      {isEditing && draft ? (
        <>
          <DateTimeField
            label="Date de la séance"
            onChange={(createdAt) => setDraft((current) => (current ? { ...current, createdAt } : current))}
            value={draft.createdAt}
          />
          <LabeledInput
            label="Titre de la séance"
            onChangeText={(title) => setDraft((current) => (current ? { ...current, title } : current))}
            placeholder="Ex : Match interclub contre Lyon"
            value={draft.title}
          />
          <SectionCard>
            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Type de séance</Text>
            <SessionTypePicker
              onChange={(type) => setDraft((current) => (current ? { ...current, type } : current))}
              value={draft.type}
            />
          </SectionCard>
          <SectionCard>
            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Note globale</Text>
            <RatingPicker
              rating={draft.rating}
              onChange={(rating) => setDraft((current) => (current ? { ...current, rating } : current))}
            />
          </SectionCard>
          <LabeledInput
            label="Ce qui a bien fonctionné"
            multiline
            onChangeText={(wentWell) => setDraft((current) => (current ? { ...current, wentWell } : current))}
            value={draft.wentWell}
          />
          <LabeledInput
            label="Ce qui a posé problème"
            multiline
            onChangeText={(wentWrong) => setDraft((current) => (current ? { ...current, wentWrong } : current))}
            value={draft.wentWrong}
          />
          <LabeledInput
            label="Intention pour la prochaine séance"
            multiline
            onChangeText={(nextIntention) =>
              setDraft((current) => (current ? { ...current, nextIntention } : current))
            }
            value={draft.nextIntention}
          />
          <LabeledInput
            label="Notes libres"
            multiline
            onChangeText={(freeNotes) => setDraft((current) => (current ? { ...current, freeNotes } : current))}
            value={draft.freeNotes}
          />
        </>
      ) : (
        <>
          {session.title ? <Field label="Titre de la séance" value={session.title} /> : null}
          <Field label="Date de la séance" value={formatDate(session.createdAt)} />
          <Field label="Ce qui a bien fonctionné" value={session.wentWell} />
          <Field label="Ce qui a posé problème" value={session.wentWrong} />
          <Field label="Intention pour la prochaine séance" value={session.nextIntention} />
          {session.freeNotes ? <Field label="Notes libres" value={session.freeNotes} /> : null}
          {session.matches && session.matches.length > 0 ? (
            <MatchesSection matches={session.matches} />
          ) : null}
          {linkedExercises.length > 0 ? (
            <LinkedExercisesSection exercises={linkedExercises} />
          ) : null}
          {session.notificationScheduledAt ? (
            <Field label="Prochain rappel prévu" value={formatDate(session.notificationScheduledAt)} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

// ── Styles matchs (locaux au module) ─────────────────────────────────────────

const matchStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  bar: {
    width: 3,
  },
  content: {
    flex: 1,
    padding: 11,
    gap: 5,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resultBadge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  resultBadgeText: {
    fontFamily: fonts.displayBold,
    fontSize: 9,
  },
  modeBadge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  modeBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
  },
  score: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    marginLeft: "auto",
  },
  vs: {
    fontSize: 12,
  },
  vsName: {
    fontFamily: fonts.bodySemiBold,
  },
  comment: {
    fontSize: 11,
    fontStyle: "italic",
    borderLeftWidth: 2,
    paddingLeft: 8,
  },
});

// ── Styles principaux ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headingBlock: {
    flex: 1,
    gap: 4,
  },
  sessionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: fonts.displayBold,
  },
  heading: {
    fontSize: 18,
    fontFamily: fonts.displayExtraBold,
  },
  meta: {
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
  },
  stars: {
    fontSize: 20,
    letterSpacing: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fonts.bodyRegular,
  },
  missing: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
  },
  footerButtons: {
    gap: 12,
  },
  editLink: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  matchesSectionTitle: {
    fontSize: 11,
    fontFamily: fonts.displayBold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  statsRow: {
    flexDirection: "row",
    gap: 7,
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 18,
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: fonts.bodyRegular,
  },
  matchList: {
    gap: 7,
  },
  headerBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 8,
  },
  headerBackText: {
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
  },
});
