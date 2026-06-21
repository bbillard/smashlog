import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LoadingView } from "@/src/components/LoadingView";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { Screen } from "@/src/components/Screen";
import { SectionCard } from "@/src/components/SectionCard";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { deleteExercise, getExerciseById } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { Exercise } from "@/src/types/index";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<NonNullable<Exercise["level"]>, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

const ORIENTATION_LABELS: Record<NonNullable<Exercise["orientation"]>, string> = {
  simple: "Simple",
  double: "Double",
  mixte: "Mixte",
};

function playersLabel(count: number) {
  if (count === 1) return "👤 Solo";
  if (count === 2) return "👥 Duo";
  return `👥 ${count} joueurs`;
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

// ─── Label chip (read-only) ───────────────────────────────────────────────────

function LabelChip({ label }: { label: string }) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        chipStyles.chip,
        { backgroundColor: theme.primaryMuted, borderColor: "rgba(206,255,0,0.15)" },
      ]}
    >
      <Text style={[chipStyles.text, { color: theme.primary }]}>{label}</Text>
    </View>
  );
}

function MetaChip({
  label,
  variant = "neutral",
}: {
  label: string;
  variant?: "neutral" | "accent" | "cyan" | "gold";
}) {
  const { theme } = useAppTheme();
  const colors = {
    neutral: { bg: "rgba(255,255,255,0.06)", text: theme.tertiaryText },
    accent: { bg: theme.primaryMuted, text: theme.primary },
    cyan: { bg: "rgba(0,229,255,0.1)", text: theme.accent3 },
    gold: { bg: "rgba(255,209,102,0.1)", text: "#FFD166" },
  }[variant];

  return (
    <View style={[chipStyles.chip, { backgroundColor: colors.bg }]}>
      <Text style={[chipStyles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "transparent",
  },
  text: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ExerciseDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { theme } = useAppTheme();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const backLabel = from === "session" ? "Séance" : "Mes exercices";

  useFocusEffect(
    useCallback(() => {
      getExerciseById(id).then(setExercise);
    }, [id]),
  );

  function handleEdit() {
    router.push({
      pathname: "/exercise/[id]/edit",
      params: { id },
    });
  }

  function handleDelete() {
    if (Platform.OS === "web") {
      const ok = globalThis.confirm?.(
        "Supprimer cet exercice ? Cette action est irréversible.",
      );
      if (ok) confirmDelete();
      return;
    }
    Alert.alert(
      "Supprimer cet exercice ?",
      "Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: confirmDelete,
        },
      ],
    );
  }

  async function confirmDelete() {
    setIsDeleting(true);
    try {
      await deleteExercise(id);
      router.replace("/(tabs)/exercises");
    } finally {
      setIsDeleting(false);
    }
  }

  if (!exercise) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Détail de l'exercice",
            headerBackVisible: false,
            headerLeft: () => (
              <Pressable
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={() => router.back()}
                style={styles.headerBack}
              >
                <Ionicons color={theme.secondaryText} name="chevron-back" size={18} />
                <Text style={[styles.headerBackText, { color: theme.secondaryText }]}>
                  {backLabel}
                </Text>
              </Pressable>
            ),
          }}
        />
        <Screen nativeHeader>
          <LoadingView />
        </Screen>
      </>
    );
  }

  const hasAttention = !!exercise.attentionPoints?.trim();
  const hasVariants =
    !!exercise.variantEasier?.trim() || !!exercise.variantHarder?.trim();
  const hasPhotos = exercise.photos && exercise.photos.length > 0;
  const hasSource = !!exercise.source?.trim();
  const footer = (
    <View style={styles.footerButtons}>
      <PrimaryButton label="Modifier l'exercice" onPress={handleEdit} tone="secondary" />
      <PrimaryButton
        label={isDeleting ? "Suppression..." : "Supprimer l'exercice"}
        onPress={handleDelete}
        tone="danger"
        disabled={isDeleting}
      />
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Détail de l'exercice",
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={() => router.back()}
              style={styles.headerBack}
            >
              <Ionicons color={theme.secondaryText} name="chevron-back" size={18} />
              <Text style={[styles.headerBackText, { color: theme.secondaryText }]}>
                {backLabel}
              </Text>
            </Pressable>
          ),
        }}
      />
      <Screen scrollable footer={footer} nativeHeader>
        <SectionCard>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryHeading}>
              <Text style={[styles.exerciseName, { color: theme.text }]}>{exercise.name}</Text>
              <Text style={[styles.exerciseMeta, { color: theme.secondaryText }]}>
                {exercise.labels.join(" · ")}
              </Text>
            </View>
            <Pressable onPress={handleEdit}>
              <Text style={[styles.editLink, { color: theme.primary }]}>Modifier</Text>
            </Pressable>
          </View>
          <View style={styles.summaryChips}>
            {exercise.durationMinutes !== undefined ? (
              <MetaChip label={`${exercise.durationMinutes} min`} variant="neutral" />
            ) : null}
            {exercise.level !== undefined ? (
              <MetaChip label={LEVEL_LABELS[exercise.level]} variant="accent" />
            ) : null}
            <MetaChip label={playersLabel(exercise.playersCount)} variant="cyan" />
            {exercise.orientation !== undefined ? (
              <MetaChip label={ORIENTATION_LABELS[exercise.orientation]} variant="gold" />
            ) : null}
          </View>
        </SectionCard>

        <Field label="Description" value={exercise.description} />

        <SectionCard>
          <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>
            Ce que ça travaille
          </Text>
          <View style={styles.chipsWrap}>
            {exercise.labels.map((l) => (
              <LabelChip key={l} label={l} />
            ))}
          </View>
        </SectionCard>

        {hasAttention ? (
          <Field label="Points d'attention" value={exercise.attentionPoints!} />
        ) : null}

        {hasVariants ? (
          <SectionCard>
            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Variantes</Text>
            <View style={styles.variantsRow}>
              {exercise.variantEasier?.trim() ? (
                <View
                  style={[
                    styles.variantCard,
                    { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.variantLabel, { color: "#00E5C8" }]}>Plus simple</Text>
                  <Text style={[styles.variantText, { color: theme.text }]}>
                    {exercise.variantEasier}
                  </Text>
                </View>
              ) : null}
              {exercise.variantHarder?.trim() ? (
                <View
                  style={[
                    styles.variantCard,
                    { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.variantLabel, { color: theme.accent2 }]}>Plus difficile</Text>
                  <Text style={[styles.variantText, { color: theme.text }]}>
                    {exercise.variantHarder}
                  </Text>
                </View>
              ) : null}
            </View>
          </SectionCard>
        ) : null}

        {hasPhotos ? (
          <SectionCard>
            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Photos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosRow}
            >
              {exercise.photos!.map((uri) => (
                <Pressable key={uri} onPress={() => setLightboxUri(uri)}>
                  <Image
                    source={{ uri }}
                    style={[
                      styles.photoThumb,
                      { borderColor: theme.border },
                    ]}
                  />
                </Pressable>
              ))}
            </ScrollView>
          </SectionCard>
        ) : null}

        {hasSource ? (
          <SectionCard>
            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Source</Text>
            <View style={styles.sourceRow}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={theme.secondaryText}
              />
              <Text style={[styles.sourceText, { color: theme.text }]}>
                {exercise.source}
              </Text>
            </View>
          </SectionCard>
        ) : null}
      </Screen>

      {/* ── Lightbox ── */}
      <Modal
        visible={lightboxUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUri(null)}
      >
        <Pressable
          style={styles.lightboxOverlay}
          onPress={() => setLightboxUri(null)}
        >
          {lightboxUri ? (
            <Image
              source={{ uri: lightboxUri }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          ) : null}
          <Pressable
            onPress={() => setLightboxUri(null)}
            style={styles.lightboxClose}
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 8,
  },
  headerBackText: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  summaryHeading: {
    flex: 1,
    gap: 4,
  },
  exerciseName: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: fonts.displayExtraBold,
  },
  exerciseMeta: {
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
  },
  summaryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
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
  variantsRow: {
    flexDirection: "row",
    gap: 8,
  },
  variantCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  variantLabel: {
    fontSize: 9,
    fontFamily: fonts.displayBold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  variantText: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
    lineHeight: 18,
  },
  photosRow: {
    gap: 8,
    paddingRight: 4,
  },
  photoThumb: {
    width: 120,
    height: 90,
    borderRadius: 10,
    borderWidth: 1,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  sourceText: {
    fontSize: 16,
    fontFamily: fonts.bodyRegular,
    flex: 1,
    lineHeight: 24,
  },
  footerButtons: {
    gap: 12,
  },
  editLink: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  // Lightbox
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImage: {
    width: "100%",
    height: "80%",
  },
  lightboxClose: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
