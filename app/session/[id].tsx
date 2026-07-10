import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
import { deleteSession, getSessionById, getSessions, updateSession } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { Session } from "@/src/types/session";
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useAppTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [draft, setDraft] = useState<EditableSession | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
    const notificationState = await rescheduleNotifications(settings);
    if (latestSession) {
      await updateSession(latestSession.id, notificationState);
    }
    router.replace("/");
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
      const notificationState = await rescheduleNotifications(settings);
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
          {session.notificationScheduledAt ? (
            <Field label="Prochain rappel prévu" value={formatDate(session.notificationScheduledAt)} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

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
});
