import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Screen } from "@/src/components/Screen";
import { DEFAULT_LABELS } from "@/src/data/exerciseData";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { getExercises } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { Exercise } from "@/src/types/index";

const ORIENTATION_OPTIONS = [
  { label: "Tous", value: null },
  { label: "Simple", value: "simple" },
  { label: "Double", value: "double" },
  { label: "Mixte", value: "mixte" },
] as const;

type OrientationFilter = "simple" | "double" | "mixte" | null;

function playersLabel(count: number) {
  if (count === 1) return "Solo";
  if (count === 2) return "Duo";
  return `${count} joueurs`;
}

function ExerciseCard({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  const { theme } = useAppTheme();
  const visibleLabels = exercise.labels.slice(0, 3);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      {/* accent bar */}
      <View style={[styles.cardAccentBar, { backgroundColor: theme.primary }]} />

      <View style={styles.cardInner}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={2}>
            {exercise.name}
          </Text>
          {exercise.durationMinutes ? (
            <Text style={[styles.cardDuration, { color: theme.secondaryText }]}>
              {exercise.durationMinutes}′
            </Text>
          ) : null}
        </View>

        {visibleLabels.length > 0 ? (
          <View style={styles.cardLabels}>
            {visibleLabels.map((label) => (
              <View
                key={label}
                style={[styles.labelChip, { backgroundColor: theme.primaryMuted, borderColor: "rgba(206,255,0,0.15)" }]}
              >
                <Text style={[styles.labelChipText, { color: theme.primary }]}>{label}</Text>
              </View>
            ))}
            {exercise.labels.length > 3 ? (
              <View style={[styles.labelChip, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <Text style={[styles.labelChipText, { color: theme.secondaryText }]}>
                  +{exercise.labels.length - 3}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.cardMeta}>
          <Text style={[styles.cardMetaText, { color: theme.secondaryText }]}>
            {exercise.playersCount === 1 ? "👤" : "👥"} {playersLabel(exercise.playersCount)}
            {exercise.orientation ? ` · ${exercise.orientation.charAt(0).toUpperCase() + exercise.orientation.slice(1)}` : ""}
          </Text>
          {exercise.level ? (
            <View style={[styles.levelBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
              <Text style={[styles.levelBadgeText, { color: theme.tertiaryText }]}>
                {exercise.level === "debutant" ? "Débutant" : exercise.level === "intermediaire" ? "Intermédiaire" : "Avancé"}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function ExercisesScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [orientationFilter, setOrientationFilter] = useState<OrientationFilter>(null);

  const loadExercises = useCallback(async () => {
    setIsLoading(true);
    const data = await getExercises();
    setExercises(data);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExercises();
    }, [loadExercises]),
  );

  // Merge DEFAULT_LABELS with any custom labels found in exercises
  const allLabels = useMemo(() => {
    const custom = exercises.flatMap((ex) => ex.labels).filter((l) => !DEFAULT_LABELS.includes(l));
    return [...DEFAULT_LABELS, ...Array.from(new Set(custom))];
  }, [exercises]);

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const matchSearch =
        search.trim() === "" ||
        ex.name.toLowerCase().includes(search.trim().toLowerCase());

      const matchLabels =
        selectedLabels.length === 0 ||
        selectedLabels.some((l) => ex.labels.includes(l));

      const matchOrientation =
        orientationFilter === null || ex.orientation === orientationFilter;

      return matchSearch && matchLabels && matchOrientation;
    });
  }, [exercises, search, selectedLabels, orientationFilter]);

  function toggleLabel(label: string) {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  }

  function selectAll() {
    setSelectedLabels([]);
  }

  const isAllSelected = selectedLabels.length === 0;

  return (
    <Screen>
      {/* ─── Header ─── */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Mes exercices</Text>
        <Pressable
          onPress={() => router.push("/exercise/new")}
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
          hitSlop={8}
        >
          <Ionicons name="add" size={18} color="#000" />
        </Pressable>
      </View>

      {/* ─── Search ─── */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={15} color={theme.secondaryText} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Rechercher un exercice..."
            placeholderTextColor={theme.secondaryText}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* ─── Filters ─── */}
      <View style={styles.filtersWrap}>
        {/* Row 1 — Labels */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            onPress={selectAll}
            style={[
              styles.chip,
              {
                backgroundColor: isAllSelected ? theme.primaryMuted : theme.surface,
                borderColor: isAllSelected ? theme.primary : theme.border,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: isAllSelected ? theme.primary : theme.secondaryText }]}>
              Tous
            </Text>
          </Pressable>

          {allLabels.map((label) => {
            const active = selectedLabels.includes(label);
            return (
              <Pressable
                key={label}
                onPress={() => toggleLabel(label)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primaryMuted : theme.surface,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? theme.primary : theme.secondaryText }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Row 2 — Orientation */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {ORIENTATION_OPTIONS.map((opt) => {
            const active = orientationFilter === opt.value;
            return (
              <Pressable
                key={opt.label}
                onPress={() => setOrientationFilter(opt.value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primaryMuted : theme.surface,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? theme.primary : theme.secondaryText }]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── List ─── */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!isLoading && exercises.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Aucun exercice pour le moment</Text>
            <Text style={[styles.emptyDesc, { color: theme.secondaryText }]}>
              Construis ta bibliothèque personnelle d'exercices pour les retrouver facilement lors de tes séances.
            </Text>
            <Pressable
              onPress={() => router.push("/exercise/new")}
              style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={[styles.emptyBtnText, { color: "#000" }]}>Créer mon premier exercice</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && exercises.length > 0 && filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Aucun résultat</Text>
            <Text style={[styles.emptyDesc, { color: theme.secondaryText }]}>
              Essaie d'autres filtres ou une recherche différente.
            </Text>
          </View>
        ) : null}

        {!isLoading && filtered.length > 0 ? (
          <>
            <Text style={[styles.countLabel, { color: theme.secondaryText }]}>
              {filtered.length} exercice{filtered.length > 1 ? "s" : ""}
            </Text>
            {filtered.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                onPress={() =>
                  router.push({
                    pathname: "/exercise/[id]",
                    params: { id: ex.id },
                  })
                }
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.displayExtraBold,
    letterSpacing: -0.4,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
    padding: 0,
  },
  filtersWrap: {
    gap: 6,
    paddingBottom: 8,
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
  },
  chip: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 11,
    fontFamily: fonts.displayBold,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 8,
  },
  countLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  card: {
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  cardAccentBar: {
    width: 3,
    alignSelf: "stretch",
  },
  cardInner: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  cardName: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.displayBold,
    lineHeight: 19,
  },
  cardDuration: {
    fontSize: 12,
    fontFamily: fonts.displayBold,
    flexShrink: 0,
  },
  cardLabels: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  labelChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  labelChipText: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardMetaText: {
    fontSize: 11,
    fontFamily: fonts.bodyRegular,
  },
  levelBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  levelBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
    textAlign: "center",
    lineHeight: 21,
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    fontSize: 14,
    fontFamily: fonts.displayBold,
  },
});
