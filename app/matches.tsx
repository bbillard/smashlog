import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/src/components/EmptyState";
import { LoadingView } from "@/src/components/LoadingView";
import { Screen } from "@/src/components/Screen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { getSessions } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { Match } from "@/src/types/session";
import { formatShortDate } from "@/src/utils/format";
import {
  computeResultCounts,
  formatResultCounts,
  formatWinRate,
  MATCH_MODE_LABELS,
  MATCH_RESULT_BG,
  MATCH_RESULT_COLORS,
  MATCH_RESULT_LABELS,
  MATCH_RESULTS,
  MatchResult,
} from "@/src/utils/matchResult";
import { formatMatchScore } from "@/src/utils/playerStats";

/** Un match + sa position dans la séance parente (identité positionnelle). */
interface MatchEntry {
  sessionId: string;
  sessionDate: string;
  matchIndex: number;
  match: Match;
}

const MODES: readonly Match["mode"][] = ["simple", "double", "mixte"] as const;

// ── Ligne match ───────────────────────────────────────────────────────────────

function MatchRow({ entry, onPress }: { entry: MatchEntry; onPress: () => void }) {
  const { theme } = useAppTheme();
  const { match } = entry;
  const score = formatMatchScore(match.sets);
  const color = MATCH_RESULT_COLORS[match.resultat];

  return (
    <Pressable
      accessibilityLabel="Ouvrir le match"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.rowBar, { backgroundColor: color }]} />
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <View style={[styles.badge, { backgroundColor: MATCH_RESULT_BG[match.resultat] }]}>
            <Text style={[styles.badgeText, { color }]}>{MATCH_RESULT_LABELS[match.resultat]}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
            <Text style={[styles.modeBadgeText, { color: theme.secondaryText }]}>
              {MATCH_MODE_LABELS[match.mode]}
            </Text>
          </View>
          <Text style={[styles.date, { color: theme.secondaryText }]}>
            {formatShortDate(entry.sessionDate)}
          </Text>
          {score ? <Text style={[styles.score, { color: theme.text }]}>{score}</Text> : null}
        </View>
        {match.adversaire || match.partenaire ? (
          <Text numberOfLines={1} style={[styles.players, { color: theme.tertiaryText }]}>
            {match.adversaire ? (
              <>
                vs. <Text style={[styles.playerName, { color: theme.text }]}>{match.adversaire}</Text>
              </>
            ) : null}
            {match.partenaire ? (
              <>
                {match.adversaire ? " · " : ""}avec{" "}
                <Text style={[styles.playerName, { color: theme.text }]}>{match.partenaire}</Text>
              </>
            ) : null}
          </Text>
        ) : null}
      </View>
      <Ionicons color={theme.secondaryText} name="chevron-forward" size={14} style={styles.chevron} />
    </Pressable>
  );
}

// ── Écran ─────────────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [entries, setEntries] = useState<MatchEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResults, setSelectedResults] = useState<MatchResult[]>([]);
  const [selectedModes, setSelectedModes] = useState<Match["mode"][]>([]);

  const loadMatches = useCallback(async () => {
    setIsLoading(true);
    // getSessions() trie déjà du plus récent au plus ancien ; dans une séance,
    // le dernier match saisi est considéré comme le plus récent.
    const sessions = await getSessions();
    const next: MatchEntry[] = [];
    for (const session of sessions) {
      const matches = session.matches ?? [];
      for (let i = matches.length - 1; i >= 0; i -= 1) {
        next.push({ sessionId: session.id, sessionDate: session.createdAt, matchIndex: i, match: matches[i] });
      }
    }
    setEntries(next);
    setIsLoading(false);
  }, []);

  // Rechargé au retour de l'écran d'édition
  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [loadMatches]),
  );

  const filtered = useMemo(
    () =>
      entries.filter(
        ({ match }) =>
          (selectedResults.length === 0 || selectedResults.includes(match.resultat)) &&
          (selectedModes.length === 0 || selectedModes.includes(match.mode)),
      ),
    [entries, selectedResults, selectedModes],
  );

  const counts = useMemo(() => computeResultCounts(filtered.map((e) => e.match)), [filtered]);
  const hasActiveFilters = selectedResults.length > 0 || selectedModes.length > 0;

  function toggle<T>(value: T, setter: (fn: (prev: T[]) => T[]) => void) {
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function renderChip(label: string, active: boolean, accent: string, onPress: () => void) {
    return (
      <Pressable
        key={label}
        onPress={onPress}
        style={[
          styles.chip,
          {
            backgroundColor: active ? `${accent}1A` : theme.surface,
            borderColor: active ? accent : theme.border,
          },
        ]}
      >
        <Text style={[styles.chipText, { color: active ? accent : theme.secondaryText }]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Screen scrollable nativeHeader>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Mes matchs</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          {filtered.length} match{filtered.length > 1 ? "s" : ""}
          {hasActiveFilters ? ` sur ${entries.length}` : ` joué${filtered.length > 1 ? "s" : ""}`}
          {counts.total > 0 ? ` · ${formatResultCounts(counts)} · ${formatWinRate(counts.winRate)}` : ""}
        </Text>
      </View>

      {/* ─── Filtre par résultat ─── */}
      <View style={styles.filterBlock}>
        <Text style={[styles.filterLabel, { color: theme.secondaryText }]}>Résultat</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {renderChip("Tous", selectedResults.length === 0, theme.primary, () => setSelectedResults([]))}
          {MATCH_RESULTS.map((r) =>
            renderChip(MATCH_RESULT_LABELS[r], selectedResults.includes(r), MATCH_RESULT_COLORS[r], () =>
              toggle(r, setSelectedResults),
            ),
          )}
        </ScrollView>
      </View>

      {/* ─── Filtre par mode ─── */}
      <View style={styles.filterBlock}>
        <Text style={[styles.filterLabel, { color: theme.secondaryText }]}>Mode</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {renderChip("Tous", selectedModes.length === 0, theme.primary, () => setSelectedModes([]))}
          {MODES.map((m) =>
            renderChip(MATCH_MODE_LABELS[m], selectedModes.includes(m), theme.accent3, () =>
              toggle(m, setSelectedModes),
            ),
          )}
        </ScrollView>
      </View>

      {hasActiveFilters ? (
        <Pressable
          onPress={() => {
            setSelectedResults([]);
            setSelectedModes([]);
          }}
          style={styles.resetButton}
        >
          <Ionicons color={theme.secondaryText} name="refresh-outline" size={14} />
          <Text style={[styles.resetButtonText, { color: theme.secondaryText }]}>Réinitialiser les filtres</Text>
        </Pressable>
      ) : null}

      {isLoading ? <LoadingView /> : null}

      {!isLoading && entries.length === 0 ? (
        <EmptyState
          title="Aucun match enregistré"
          description="Ajoute le détail de tes matchs dans une séance pour les retrouver ici."
        />
      ) : null}

      {!isLoading && entries.length > 0 && filtered.length === 0 ? (
        <EmptyState
          title="Aucun match ne correspond"
          description="Essaie d'élargir les filtres de résultat ou de mode."
        />
      ) : null}

      {!isLoading
        ? filtered.map((entry) => (
            <MatchRow
              key={`${entry.sessionId}-${entry.matchIndex}`}
              entry={entry}
              onPress={() =>
                router.push({
                  pathname: "/match/edit",
                  params: { sessionId: entry.sessionId, index: String(entry.matchIndex) },
                })
              }
            />
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
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
  filterBlock: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
  },
  chip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 12,
    fontFamily: fonts.displayBold,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  resetButtonText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  rowBar: {
    width: 3,
    alignSelf: "stretch",
  },
  rowContent: {
    flex: 1,
    paddingVertical: 11,
    paddingLeft: 12,
    gap: 6,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: fonts.displayBold,
    fontSize: 10,
  },
  modeBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
  },
  date: {
    fontSize: 11,
    fontFamily: fonts.bodyRegular,
    flex: 1,
  },
  score: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
  },
  players: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },
  playerName: {
    fontFamily: fonts.bodySemiBold,
  },
  chevron: {
    paddingHorizontal: 10,
  },
});
