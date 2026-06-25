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
import { addPlayer, getPlayers, getSessions } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { Player } from "@/src/types/index";
import { Session } from "@/src/types/session";
import { createId } from "@/src/utils/id";
import { computePlayerStats, normalizeStr } from "@/src/utils/playerStats";

const MAX_VISIBLE = 4;

export default function PlayersScreen() {
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
  const partenaires = useMemo(
    () => playersWithStats.filter((p) => p.stats.isPartenaire).sort(sortByLastMatch),
    [playersWithStats],
  );

  const searchResults = useMemo<PlayerWithStats[]>(() => {
    if (!searchQuery.trim()) return [];
    const q = normalizeStr(searchQuery);
    return playersWithStats.filter((p) => normalizeStr(p.name).includes(q));
  }, [playersWithStats, searchQuery]);

  async function handleCreateFromSearch() {
    const name = searchQuery.trim();
    if (!name) return;
    const newPlayer: Player = {
      id: createId(),
      createdAt: new Date().toISOString(),
      name,
    };
    await addPlayer(newPlayer);
    setPlayers((prev) => [...prev, newPlayer]);
    setSearchQuery("");
    router.push({ pathname: "/players/[id]", params: { id: newPlayer.id } });
  }

  const isSearchActive = searchQuery.trim().length > 0;
  const noPlayers = !isLoading && players.length === 0;

  const navigateToPlayer = (id: string) =>
    router.push({ pathname: "/players/[id]", params: { id } });

  return (
    <>
      <Stack.Screen
        options={{
          title: "Mes joueurs",
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.replace("/(tabs)")} style={styles.headerBack}>
              <Ionicons color="#F0F0F2" name="chevron-back" size={18} />
              <Text style={styles.headerBackText}>Accueil</Text>
            </Pressable>
          ),
        }}
      />
      <Screen scrollable nativeHeader>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]}>Mes joueurs</Text>
        </View>

        {/* Barre de recherche */}
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: isSearchActive ? "rgba(206,255,0,0.3)" : theme.border }]}>
          <Ionicons name="search" size={14} color={isSearchActive ? "#CEFF00" : theme.secondaryText} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Rechercher un joueur..."
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

        {noPlayers ? (
          <EmptyState
            title="Aucun joueur enregistré"
            description="Les joueurs apparaissent ici lorsque tu renseignes des adversaires ou partenaires dans tes matchs."
          />
        ) : null}

        {/* Vue recherche */}
        {!isLoading && isSearchActive ? (
          <>
            {searchResults.length > 0 ? (
              <>
                <SectionHeader label="Résultats" count={searchResults.length} />
                {searchResults.map((p) => (
                  <PlayerRow key={p.id} player={p} query={searchQuery} onPress={() => navigateToPlayer(p.id)} />
                ))}
              </>
            ) : null}
            <View style={[styles.createWrap, { borderColor: theme.border }]}>
              <Text style={[styles.createPrompt, { color: theme.secondaryText }]}>Pas de joueur trouvé ?</Text>
              <Pressable onPress={handleCreateFromSearch} style={styles.createBtn}>
                <Ionicons name="add" size={11} color="#FF4D6D" />
                <Text style={styles.createBtnText}>Créer "{searchQuery.trim()}" comme nouveau joueur</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {/* Vue principale */}
        {!isLoading && !isSearchActive && players.length > 0 ? (
          <>
            {/* ── Adversaires ── */}
            {adversaires.length > 0 ? (
              <View style={styles.section}>
                {/* Compteur = total réel */}
                <SectionHeader label="Adversaires" count={adversaires.length} />
                <PlayerGrid
                  items={adversaires.slice(0, MAX_VISIBLE)}
                  role="adversaire"
                  onNavigate={navigateToPlayer}
                />
                {adversaires.length > MAX_VISIBLE ? (
                  <Pressable
                    onPress={() => router.push("/players/adversaires")}
                    style={[styles.voirTousBtn, { borderColor: theme.border }]}
                  >
                    <Text style={[styles.voirTousText, { color: theme.secondaryText }]}>
                      Voir tous les adversaires
                    </Text>
                    <Ionicons name="chevron-forward" size={13} color={theme.secondaryText} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* ── Partenaires ── */}
            {partenaires.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader label="Partenaires" count={partenaires.length} />
                <PlayerGrid
                  items={partenaires.slice(0, MAX_VISIBLE)}
                  role="partenaire"
                  onNavigate={navigateToPlayer}
                />
                {partenaires.length > MAX_VISIBLE ? (
                  <Pressable
                    onPress={() => router.push("/players/partenaires")}
                    style={[styles.voirTousBtn, { borderColor: theme.border }]}
                  >
                    <Text style={[styles.voirTousText, { color: theme.secondaryText }]}>
                      Voir tous les partenaires
                    </Text>
                    <Ionicons name="chevron-forward" size={13} color={theme.secondaryText} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* Joueurs sans match */}
            {(() => {
              const orphans = playersWithStats.filter(
                (p) => !p.stats.isAdversaire && !p.stats.isPartenaire,
              );
              if (orphans.length === 0) return null;
              return (
                <View style={styles.section}>
                  <SectionHeader label="Autres joueurs" count={orphans.length} />
                  {orphans.map((p) => (
                    <PlayerRow key={p.id} player={p} query="" onPress={() => navigateToPlayer(p.id)} />
                  ))}
                </View>
              );
            })()}
          </>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  headerBack: { flexDirection: "row", alignItems: "center", gap: 3, paddingRight: 6 },
  headerBackText: { fontSize: 13, fontFamily: fonts.bodyRegular, color: "#F0F0F2" },
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

  voirTousBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, borderWidth: 1, borderRadius: 10, paddingVertical: 10,
  },
  voirTousText: { fontSize: 13, fontFamily: fonts.bodyMedium },

  createWrap: {
    borderWidth: 1, borderStyle: "dashed", borderRadius: 12,
    padding: 16, alignItems: "center", gap: 8,
  },
  createPrompt: { fontSize: 12, fontFamily: fonts.bodyRegular },
  createBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,77,109,0.08)",
    borderWidth: 1, borderColor: "rgba(255,77,109,0.2)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  createBtnText: { fontFamily: fonts.displayBold, fontSize: 11, color: "#FF4D6D" },
});
