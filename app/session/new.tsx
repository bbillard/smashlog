import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ExercisesAccordion } from "@/src/components/ExercisesAccordion";
import { MatchesAccordion } from "@/src/components/MatchesAccordion";
import { DateTimeField } from "@/src/components/DateTimeField";
import { LabeledInput } from "@/src/components/Form";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { RatingPicker } from "@/src/components/RatingPicker";
import { Screen } from "@/src/components/Screen";
import { SectionCard } from "@/src/components/SectionCard";
import { SessionTypePicker } from "@/src/components/SessionTypePicker";
import { WizardProgress } from "@/src/components/WizardProgress";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { rescheduleNotifications } from "@/src/services/notifications";
import { computeSharingPayload } from "@/src/services/sharingOrchestrator";
import { getNotificationSettings } from "@/src/services/settings";
import { addSession, getExercises, getSessions, updateSession } from "@/src/services/storage";
import { Exercise } from "@/src/types/index";
import { Match, Session, SessionType } from "@/src/types/session";
import { fonts } from "@/src/theme/typography";
import { createId } from "@/src/utils/id";

interface DraftSession {
  createdAt: Date;
  title: string;
  type: SessionType | null;
  rating: number;
  wentWell: string;
  wentWrong: string;
  nextIntention: string;
  freeNotes: string;
  matches: Match[];
  exerciseIds: string[];
}

const INITIAL_DRAFT: DraftSession = {
  createdAt: new Date(),
  title: "",
  type: null,
  rating: 0,
  wentWell: "",
  wentWrong: "",
  nextIntention: "",
  freeNotes: "",
  matches: [],
  exerciseIds: [],
};

const HEADER_BUTTON_COLOR = "#F0F0F2";

const FIELD_COPY: Record<
  SessionType,
  {
    wentWellLabel: string;
    wentWellPlaceholder: string;
    wentWrongLabel: string;
    wentWrongPlaceholder: string;
    nextLabel: string;
    nextPlaceholder: string;
    notesPlaceholder: string;
  }
> = {
  match: {
    wentWellLabel: "Ce qui a bien fonctionné",
    wentWellPlaceholder: "Ex: mon revers, mes déplacements...",
    wentWrongLabel: "Ce qui a posé problème",
    wentWrongPlaceholder: "Ex: ma défense, ma concentration, ma lecture du jeu en fond de court...",
    nextLabel: "Intention pour le prochain match",
    nextPlaceholder: "Ex: être plus patient, varier en attaque...",
    notesPlaceholder: "Contexe, adversaire, état physique...",
  },
  entrainement: {
    wentWellLabel: "Ce qui a bien fonctionné",
    wentWellPlaceholder: "Ex: la longueur sur les lobs, ma concentration sur toute la séance...",
    wentWrongLabel: "Ce qui a moins bien fonctionné",
    wentWrongPlaceholder: "Ex: précision smash croisé, déplacements retard...",
    nextLabel: "Intention pour la prochaine séance",
    nextPlaceholder: "Ex: travailler mon smash croisé pendant 15 minutes.",
    notesPlaceholder: "Contexe, exercices, état physique...",
  },
  jeu_libre: {
    wentWellLabel: "Ce qui a bien fonctionné",
    wentWellPlaceholder: "Ex: coups dans le retard, prise d'option...",
    wentWrongLabel: "Ce qui a moins bien fonctionné",
    wentWrongPlaceholder: "Ex: endurance en fin de set, précision au filet...",
    nextLabel: "Intention pour la prochaine séance",
    nextPlaceholder: "Ex: routine concentration au service, match à thème...",
    notesPlaceholder: "Contexe, matchs, adversaires et partenaires, état physique...",
  },
  renforcement: {
    wentWellLabel: "Ce qui a bien fonctionné",
    wentWellPlaceholder: "Ex: bon niveau d'énergie, nouveau record personnel...",
    wentWrongLabel: "Ce qui a moins bien fonctionné",
    wentWrongPlaceholder: "Ex: douleur au genou droit, fatigue sur les dernières séries...",
    nextLabel: "Intention pour la prochaine séance",
    nextPlaceholder: "Ex: augmenter le poids sur les squats, tester un nouvel exercice...",
    notesPlaceholder: "Contexe, exercices, état physique...",
  },
  cardio: {
    wentWellLabel: "Ce qui a bien fonctionné",
    wentWellPlaceholder: "Ex: enchainement doubles sauts corde à sauter, rythme cardiaque stable...",
    wentWrongLabel: "Ce qui a moins bien fonctionné",
    wentWrongPlaceholder: "Ex: fatigue précoce, foulée trop lourde...",
    nextLabel: "Intention pour la prochaine séance",
    nextPlaceholder: "Ex: 20 minutes de fractionné après l'échauffement...",
    notesPlaceholder: "Contexte, activité, état physique...",
  },
  autre: {
    wentWellLabel: "Ce qui a bien fonctionné",
    wentWellPlaceholder: "Ex: bon niveau d'énergie, ambiance...",
    wentWrongLabel: "Ce qui a moins bien fonctionné",
    wentWrongPlaceholder: "Ex: intensité trop faible, pertes de concentration...",
    nextLabel: "Intention pour la prochaine séance",
    nextPlaceholder: "Ex: idée à retester, quelque chose à ne pas oublier...",
    notesPlaceholder: "Contexte, activité, état physique...",
  },
};

export default function NewSessionScreen() {
  const { theme } = useAppTheme();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<DraftSession>(INITIAL_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  // Snapshot pris juste avant de naviguer vers la création d'exercice
  const exerciseSnapshotRef = useRef<Set<string> | null>(null);

  // Chargement garanti au montage
  useEffect(() => {
    getExercises().then(setAllExercises);
  }, []);

  // Rechargement au retour de focus + détection du nouvel exercice créé
  useFocusEffect(
    useCallback(() => {
      getExercises().then((exs) => {
        setAllExercises(exs);
        if (exerciseSnapshotRef.current !== null) {
          const snapshot = exerciseSnapshotRef.current;
          exerciseSnapshotRef.current = null;
          const newIds = exs.filter((e) => !snapshot.has(e.id)).map((e) => e.id);
          if (newIds.length > 0) {
            setDraft((prev) => ({
              ...prev,
              exerciseIds: [...prev.exerciseIds, ...newIds],
            }));
          }
        }
      });
    }, []),
  );

  const hasUnsavedDraft =
    step > 1 ||
    draft.type !== null ||
    draft.rating > 0 ||
    draft.title.trim().length > 0 ||
    draft.wentWell.trim().length > 0 ||
    draft.wentWrong.trim().length > 0 ||
    draft.nextIntention.trim().length > 0 ||
    draft.freeNotes.trim().length > 0;

  const canGoToStepTwo = draft.type !== null;
  const intentionRequired = draft.type === "match" || draft.type === "entrainement" || draft.type === "jeu_libre";
  const canSaveQuestions =
    draft.rating > 0 &&
    draft.wentWell.trim().length > 0 &&
    draft.wentWrong.trim().length > 0 &&
    (!intentionRequired || draft.nextIntention.trim().length > 0);
  const copy = draft.type ? FIELD_COPY[draft.type] : null;

  async function handleSave() {
    if (!draft.type || !canSaveQuestions || isSaving) {
      return;
    }

    setIsSaving(true);

    const session: Session = {
      id: createId(),
      createdAt: draft.createdAt.toISOString(),
      title: draft.title.trim() || undefined,
      type: draft.type,
      rating: draft.rating,
      wentWell: draft.wentWell.trim(),
      wentWrong: draft.wentWrong.trim(),
      nextIntention: draft.nextIntention.trim(),
      freeNotes: draft.freeNotes.trim() || undefined,
      matches: draft.matches,
      exerciseIds: draft.exerciseIds.length > 0 ? draft.exerciseIds : undefined,
    };

    try {
      await addSession(session);
      const sessions = await getSessions();
      const settings = await getNotificationSettings();
      const latestSession = sessions[0];
      const notificationState = await rescheduleNotifications(sessions, settings);
      if (latestSession) {
        await updateSession(latestSession.id, notificationState);
      }
      const sharingPayload = await computeSharingPayload(sessions);
      router.push({
        pathname: "/session/share",
        params: {
          payload: JSON.stringify(sharingPayload),
          sessionId: session.id,
        },
      });
    } catch (error) {
      Alert.alert("Impossible d'enregistrer", "Une erreur est survenue pendant la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  }

  const footer = (
      <View style={styles.footerButtons}>
      {step > 1 ? <PrimaryButton label="Retour" onPress={() => setStep(step - 1)} tone="secondary" /> : null}
      {step === 1 ? (
        <PrimaryButton disabled={!canGoToStepTwo} label="Suivant" onPress={() => setStep(2)} />
      ) : null}
      {step === 2 ? (
        <PrimaryButton disabled={!canSaveQuestions} label="Suivant" onPress={() => setStep(3)} />
      ) : null}
      {step === 3 ? (
        <PrimaryButton disabled={!canSaveQuestions || isSaving} label={isSaving ? "Enregistrement..." : "Enregistrer la séance"} onPress={handleSave} />
      ) : null}
    </View>
  );

  function handleHeaderExit() {
    if (!hasUnsavedDraft) {
      router.replace("/(tabs)");
      return;
    }

    if (Platform.OS === "web") {
      const confirmed = globalThis.confirm?.(
        "Revenir à l'accueil ? Les données non enregistrées seront perdues.",
      );
      if (confirmed) {
        router.replace("/(tabs)");
      }
      return;
    }

    Alert.alert(
      "Revenir à l'écran d'accueil ?",
      "Cela va supprimer les données qui ne sont pas enregistrées.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          style: "destructive",
          onPress: () => router.replace("/(tabs)"),
        },
      ],
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable onPress={handleHeaderExit} style={styles.headerExitButton}>
              <Ionicons color={HEADER_BUTTON_COLOR} name="chevron-back" size={18} />
              <Text style={[styles.headerExitText, { color: HEADER_BUTTON_COLOR }]}>Accueil</Text>
            </Pressable>
          ),
        }}
      />
    <Screen key={step} footer={footer} scrollable nativeHeader>
      <View style={styles.header}>
        {step > 1 ? (
          <Pressable onPress={() => setStep(step - 1)} style={styles.backRow}>
            <Ionicons color={theme.secondaryText} name="arrow-back" size={16} />
            <Text style={[styles.backText, { color: theme.secondaryText }]}>Retour</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <WizardProgress step={step} total={3} />
      </View>

      {step === 1 ? (
        <View style={styles.stack}>
          <Text style={[styles.title, { color: theme.text }]}>Quel type de séance viens-tu de faire ?</Text>
          <Text style={[styles.description, { color: theme.secondaryText }]}>
            Choisis le contexte principal de ta séance pour structurer ton journal.
          </Text>
          <DateTimeField
            label="Date de la séance"
            onChange={(createdAt) => setDraft((current) => ({ ...current, createdAt }))}
            value={draft.createdAt}
          />
          <LabeledInput
            label="Titre de la séance"
            onChangeText={(title) => setDraft((current) => ({ ...current, title }))}
            placeholder="Ex : Match interclub contre Lyon"
            value={draft.title}
          />
          <SessionTypePicker
            onChange={(type) => setDraft((current) => ({ ...current, type }))}
            value={draft.type}
          />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.stack}>
          <Text style={[styles.title, { color: theme.text }]}>Rejoue mentalement la séance</Text>
          <SectionCard>
            <Text style={[styles.fieldTitle, { color: theme.tertiaryText }]}>Note globale</Text>
            <RatingPicker rating={draft.rating} onChange={(rating) => setDraft((current) => ({ ...current, rating }))} />
          </SectionCard>
          <LabeledInput
            label={copy?.wentWellLabel ?? "Ce qui a bien fonctionné"}
            multiline
            onChangeText={(wentWell) => setDraft((current) => ({ ...current, wentWell }))}
            placeholder={copy?.wentWellPlaceholder ?? ""}
            value={draft.wentWell}
          />
          <LabeledInput
            label={copy?.wentWrongLabel ?? "Ce qui a posé problème"}
            multiline
            onChangeText={(wentWrong) => setDraft((current) => ({ ...current, wentWrong }))}
            placeholder={copy?.wentWrongPlaceholder ?? ""}
            value={draft.wentWrong}
          />
          <LabeledInput
            label={copy?.nextLabel ?? "Intention pour la prochaine séance"}
            multiline
            onChangeText={(nextIntention) => setDraft((current) => ({ ...current, nextIntention }))}
            placeholder={copy?.nextPlaceholder ?? ""}
            value={draft.nextIntention}
          />

          {draft.type === "match" || draft.type === "jeu_libre" ? (
            <MatchesAccordion
              matches={draft.matches}
              onChange={(matches) => setDraft((current) => ({ ...current, matches }))}
              singleMatch={draft.type === "match"}
            />
          ) : null}

          {draft.type === "entrainement" ? (
            <ExercisesAccordion
              exerciseIds={draft.exerciseIds}
              allExercises={allExercises}
              onAdd={(id) =>
                setDraft((current) => ({
                  ...current,
                  exerciseIds: [...current.exerciseIds, id],
                }))
              }
              onRemove={(id) =>
                setDraft((current) => ({
                  ...current,
                  exerciseIds: current.exerciseIds.filter((eid) => eid !== id),
                }))
              }
              onCreateNew={() => {
                exerciseSnapshotRef.current = new Set(allExercises.map((e) => e.id));
                router.push({
                  pathname: "/exercise/new",
                  params: { fromWizard: "true" },
                });
              }}
              onOpenLibrary={async () => {
                const exs = await getExercises();
                setAllExercises(exs);
              }}
            />
          ) : null}
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.stack}>
          <Text style={[styles.title, { color: theme.text }]}>Ajoute du contexte</Text>
          <LabeledInput
            label="Notes libres (optionnel)"
            multiline
            onChangeText={(freeNotes) => setDraft((current) => ({ ...current, freeNotes }))}
            placeholder={copy?.notesPlaceholder ?? ""}
            value={draft.freeNotes}
          />
        </View>
      ) : null}
    </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },
  header: {
    gap: 16,
  },
  headerExitButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingRight: 6,
  },
  headerExitText: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: fonts.displayExtraBold,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: fonts.bodyRegular,
  },
  footerButtons: {
    gap: 12,
  },
  fieldTitle: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
  },
});
