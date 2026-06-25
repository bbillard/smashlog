import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { EmptyState } from "@/src/components/EmptyState";
import { LoadingView } from "@/src/components/LoadingView";
import {
  PlayerGrid,
  PlayerRow,
  PlayerWithStats,
  SectionHeader,
  sortByLastMatch,
} from "@/src/components/players/PlayerListShared";
import { Screen } from "@/src/components/Screen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { getPlayers, getSessions } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { Player } from "@/src/types/index";
import { Session } from "@/src/types/session";
import { computePlayerStats, normalizeStr } from "@/src/utils/playerStats";

export default function AdversairesScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        setIsLoading(true);
        const [allPlayers, allSessions] = await Promise.all([getPlayers(), getSessions()]);
        if (active) {
          setPlayers(allPlayers);
          setSessions(allSessions);
          setIsLoading(false);
        }
      }
      load();
      return () => { active = false; };
    }, []),
  );

  const playersWithStats = useMemo<PlayerWithStats[]>(
    () => players.map((p) => ({ ...p, stats: computePlayerStats(p, sessions) })),
    [players, sessions],
  );

  const adversaires = useMemo(
    () => playersWithStats.filter((p) => p.stats.isAdversaire).sort(sortByLastMatch),
    [playersWithStats],
  );

  const filtered = useMemo<PlayerWithStats[]>(() => {
    if (!searchQuery.trim()) return adversaires;
    const q = normalizeStr(searchQuery);
    return adversaires.filter((p) => normalizeStr(p.name).includes(q));
  }, [adversaires, searchQuery]);

  const isSearchActive = searchQuery.trim().length > 0;
  const navigateToPlayer = (id: string) =>
    router.push({ pathname: "/players/[id]", params: { id } });

  return (
    <>
      <Stack.Screen options={{ title: "Adversaires" }} />
      <Screen scrollable nativeHeader>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]}>Adversaires</Text>
        </View>

        {/* Barre de recherche */}
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: isSearchActive ? "rgba(206,255,0,0.3)" : theme.border }]}>
          <Ionicons name="search" size={14} color={isSearchActive ? "#CEFF00" : theme.secondaryText} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Rechercher un adversaire..."
            placeholderTextColor={theme.secondaryText + "70"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
          />
          {isSearchActive ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <View style={styles.searchClear}>
                <Ionicons name="close" size={9} color={theme.secondaryText} />
              </View>
            </Pressable>
          ) : null}
        </View>

        {isLoading ? <LoadingView /> : null}

        {!isLoading && adversaires.length === 0 ? (
          <EmptyState
            title="Aucun adversaire"
            description="Les adversaires apparaissent ici lorsque tu renseignes un adversaire dans tes matchs."
          />
        ) : null}

        {!isLoading && filtered.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              label={isSearchActive ? "Résultats" : "Adversaires"}
              count={filtered.length}
            />
            {isSearchActive ? (
              /* Vue liste en recherche */
              filtered.map((p) => (
                <PlayerRow key={p.id} player={p} query={searchQuery} onPress={() => navigateToPlayer(p.id)} />
              ))
            ) : (
              /* Grille complète */
              <PlayerGrid items={filtered} role="adversaire" onNavigate={navigateToPlayer} />
            )}
          </View>
        ) : null}

        {!isLoading && isSearchActive && filtered.length === 0 ? (
          <EmptyState
            title="Aucun résultat"
            description={`Aucun adversaire ne correspond à "${searchQuery}".`}
          />
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  titleRow: { gap: 4 },
  title: { fontSize: 28, fontFamily: fonts.displayExtraBold },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: fonts.bodyRegular, padding: 0 },
  searchClear: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center",
  },
  section: { gap: 8 },
});
