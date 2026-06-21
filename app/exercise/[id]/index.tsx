import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingView } from "@/src/components/LoadingView";
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

// ─── Section header ───────────────────────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={sectionStyles.row}>
      <Text style={[sectionStyles.text, { color: theme.secondaryText }]}>{label}</Text>
      <View style={[sectionStyles.line, { backgroundColor: theme.border }]} />
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  text: {
    fontSize: 9,
    fontFamily: fonts.displayBold,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  line: {
    flex: 1,
    height: 1,
  },
});

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useAppTheme();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

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
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <LoadingView />
      </SafeAreaView>
    );
  }

  const hasOptional =
    exercise.durationMinutes !== undefined ||
    exercise.level !== undefined ||
    exercise.orientation !== undefined;

  const hasAttention = !!exercise.attentionPoints?.trim();
  const hasVariants =
    !!exercise.variantEasier?.trim() || !!exercise.variantHarder?.trim();
  const hasPhotos = exercise.photos && exercise.photos.length > 0;
  const hasSource = !!exercise.source?.trim();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* ── Header bar ── */}
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backRow} hitSlop={8}>
          <Ionicons name="chevron-back" size={16} color={theme.secondaryText} />
          <Text style={[styles.backText, { color: theme.secondaryText }]}>Mes exercices</Text>
        </Pressable>
      </View>

      {/* ── Hero ── */}
      <View style={[styles.hero, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.heroCategory, { color: theme.primary }]}>
          {exercise.labels.slice(0, 2).join(" · ")}
        </Text>
        <Text style={[styles.heroName, { color: theme.text }]}>{exercise.name}</Text>
        <View style={styles.heroChips}>
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
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <View style={styles.section}>
          <SectionTitle label="Description" />
          <Text style={[styles.bodyText, { color: theme.tertiaryText }]}>
            {exercise.description}
          </Text>
        </View>

        {/* Labels */}
        <View style={styles.section}>
          <SectionTitle label="Ce que ça travaille" />
          <View style={styles.chipsWrap}>
            {exercise.labels.map((l) => (
              <LabelChip key={l} label={l} />
            ))}
          </View>
        </View>

        {/* Attention points */}
        {hasAttention ? (
          <View style={styles.section}>
            <SectionTitle label="Points d'attention" />
            <Text style={[styles.bodyText, { color: theme.tertiaryText }]}>
              {exercise.attentionPoints}
            </Text>
          </View>
        ) : null}

        {/* Variants */}
        {hasVariants ? (
          <View style={styles.section}>
            <SectionTitle label="Variantes" />
            <View style={styles.variantsRow}>
              {exercise.variantEasier?.trim() ? (
                <View
                  style={[
                    styles.variantCard,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.variantLabel, { color: "#00E5C8" }]}>Plus simple</Text>
                  <Text style={[styles.variantText, { color: theme.tertiaryText }]}>
                    {exercise.variantEasier}
                  </Text>
                </View>
              ) : null}
              {exercise.variantHarder?.trim() ? (
                <View
                  style={[
                    styles.variantCard,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.variantLabel, { color: theme.accent2 }]}>Plus difficile</Text>
                  <Text style={[styles.variantText, { color: theme.tertiaryText }]}>
                    {exercise.variantHarder}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Photos */}
        {hasPhotos ? (
          <View style={styles.section}>
            <SectionTitle label="Photos" />
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
          </View>
        ) : null}

        {/* Source */}
        {hasSource ? (
          <View style={styles.section}>
            <SectionTitle label="Source" />
            <View style={styles.sourceRow}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={theme.secondaryText}
              />
              <Text style={[styles.sourceText, { color: theme.secondaryText }]}>
                {exercise.source}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Footer ── */}
      <View
        style={[
          styles.footer,
          { backgroundColor: theme.background, borderTopColor: theme.border },
        ]}
      >
        <Pressable
          onPress={handleEdit}
          style={[
            styles.footerBtn,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border, flex: 1 },
          ]}
        >
          <Ionicons name="pencil-outline" size={14} color={theme.secondaryText} />
          <Text style={[styles.footerBtnText, { color: theme.secondaryText }]}>Modifier</Text>
        </Pressable>

        <Pressable
          onPress={handleDelete}
          disabled={isDeleting}
          style={[
            styles.footerBtn,
            {
              backgroundColor: "rgba(255,77,109,0.08)",
              borderColor: "rgba(255,77,109,0.2)",
              opacity: isDeleting ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons name="trash-outline" size={14} color={theme.accent2} />
          <Text style={[styles.footerBtnText, { color: theme.accent2 }]}>Supprimer</Text>
        </Pressable>
      </View>

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
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },
  hero: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 5,
  },
  heroCategory: {
    fontSize: 10,
    fontFamily: fonts.displayBold,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroName: {
    fontSize: 22,
    fontFamily: fonts.displayExtraBold,
    letterSpacing: -0.4,
    lineHeight: 27,
  },
  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 4,
  },
  scroll: {
    padding: 14,
    gap: 4,
  },
  section: {
    marginBottom: 16,
  },
  bodyText: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
    lineHeight: 21,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
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
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
    fontStyle: "italic",
    flex: 1,
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 8,
  },
  footer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  footerBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
  },
  footerBtnText: {
    fontSize: 13,
    fontFamily: fonts.displayBold,
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
