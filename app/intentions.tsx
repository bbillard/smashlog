import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/EmptyState";
import { LoadingView } from "@/src/components/LoadingView";
import { SESSION_COLORS, SESSION_COLORS_BG } from "@/src/constants/sessionColors";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { getSessions } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { Session, SessionType } from "@/src/types/session";
import { formatShortDate } from "@/src/utils/format";

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterValue = "tous" | SessionType;

interface FilterOption {
  label: string;
  value: FilterValue;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const FILTERS: FilterOption[] = [
  { label: "Tous", value: "tous" },
  { label: "Match", value: "match" },
  { label: "Entraînement", value: "entrainement" },
  { label: "Jeu libre", value: "jeu_libre" },
  { label: "Renforcement", value: "renforcement" },
  { label: "Cardio", value: "cardio" },
  { label: "Autre", value: "autre" },
];

function getBadgeStyle(type: SessionType): { backgroundColor: string; color: string } {
  return { backgroundColor: SESSION_COLORS_BG[type], color: SESSION_COLORS[type] };
}

const TYPE_LABELS: Record<SessionType, string> = {
  match: "Match",
  entrainement: "Entraînement",
  jeu_libre: "Jeu libre",
  renforcement: "Renforcement",
  cardio: "Cardio",
  autre: "Autre",
};

// ── Composant carte intention ─────────────────────────────────────────────────

function IntentionCard({ session, onPress }: { session: Session; onPress: () => void }) {
  const { theme } = useAppTheme();
  const badge = getBadgeStyle(session.type);

  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardTop}>
        <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{TYPE_LABELS[session.type]}</Text>
        </View>
        <Text style={[styles.date, { color: theme.secondaryText }]}>{formatShortDate(session.createdAt)}</Text>
        <Ionicons color={theme.secondaryText} name="chevron-forward" size={14} />
      </View>
      <Text style={[styles.intention, { color: theme.text, borderLeftColor: theme.primary }]}>
        {session.nextIntention}
      </Text>
    </Pressable>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────

const VALID_FILTERS: FilterValue[] = ["tous", "match", "entrainement", "jeu_libre", "renforcement", "cardio", "autre"];

export default function IntentionsScreen() {
  const router = useRouter();
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const { theme } = useAppTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterValue>(() =>
    VALID_FILTERS.includes(filterParam as FilterValue) ? (filterParam as FilterValue) : "tous",
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const all = await getSessions();
    const withIntention = all.filter((s) => s.nextIntention && s.nextIntention.trim() !== "");
    setSessions(withIntention);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const filtered = useMemo(
    () =>
      activeFilter === "tous"
        ? sessions
        : sessions.filter((s) => s.type === activeFilter),
    [sessions, activeFilter],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Mes intentions</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            {sessions.length} intention{sessions.length > 1 ? "s" : ""} enregistrée{sessions.length > 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Chips filtre */}
      <ScrollView
        contentContainerStyle={styles.filtersContent}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersRow}
      >
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => setActiveFilter(f.value)}
              style={[
                styles.chip,
                { backgroundColor: theme.surface, borderColor: theme.border },
                isActive && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: theme.secondaryText },
                  isActive && styles.chipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Contenu */}
      {isLoading ? (
        <LoadingView />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <EmptyState
            title="Aucune intention"
            description={
              activeFilter === "tous"
                ? "Tes intentions apparaîtront ici après chaque séance."
                : "Aucune intention pour ce type de séance."
            }
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <IntentionCard
              onPress={() =>
                router.push({
                  pathname: "/session/[id]",
                  params: { id: item.id, from: "intentions", filter: activeFilter },
                })
              }
              session={item}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.displayExtraBold,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
  },

  // ── Chips ──────────────────────────────────────────────────────────────────
  filtersRow: {
    flexGrow: 0,
    paddingVertical: 8,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: "rgba(206,255,0,0.1)",
    borderColor: "#CEFF00",
  },
  chipText: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
  },
  chipTextActive: {
    color: "#CEFF00",
  },

  // ── Liste ──────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 32,
    gap: 12,
  },
  emptyWrapper: {
    padding: 20,
  },

  // ── Carte ──────────────────────────────────────────────────────────────────
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  date: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
    flex: 1,
  },
  intention: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.bodyRegular,
    borderLeftWidth: 2,
    paddingLeft: 10,
  },
});
