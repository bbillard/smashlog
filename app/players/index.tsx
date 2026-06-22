import { Ionicons } from "@expo/vector-icons";
import { randomUUID } from "expo-crypto";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { EmptyState } from "@/src/components/EmptyState";
import { LoadingView } from "@/src/components/LoadingView";
import { Screen } from "@/src/components/Screen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { addPlayer, getPlayers, getSessions } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { Player } from "@/src/types/index";
import { Session } from "@/src/types/session";
import {
  avatarColors,
  computePlayerStats,
  normalizeStr,
  PlayerStats,
  relativeDate,
  winRateColor,
} from "@/src/utils/playerStats";

// ── Types internes ────────────────────────────────────────────────────────────

interface PlayerWithStats extends Player {
  stats: PlayerStats;
}

// ── Carte joueur (grille 2 colonnes) ─────────────────────────────────────────

function PlayerCard({
  player,
  role,
  onPress,
}: {
  player: PlayerWithStats;
  role: "adversaire" | "partenaire";
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  const av = avatarColors(player.name);
  const { stats } = player;
  const accentColor = role === "adversaire" ? "#FF4D6D" : "#00E5FF";
  const wrColor = winRateColor(stats.winRate);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && { opacity: 0.8 },
      ]}
    >
      {/* Filet de couleur en haut */}
      <View style={[styles.cardAccent, { backgroundColor: accentColor + "99" }]} />

      <View style={[styles.cardAvatar, { backgroundColor: av.bg }]}>
        <Text style={[styles.cardAvatarText, { color: av.text }]}>
          {player.name[0].toUpperCase()}
        </Text>
      </View>

      <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>
        {player.name}
      </Text>

      <Text style={[styles.cardStats, { color: theme.secondaryText }]}>
        {stats.total} match{stats.total > 1 ? "s" : ""}
      </Text>

      {stats.total > 0 ? (
        <Text style={[styles.cardWR, { color: wrColor }]}>
          {stats.winRate}%
        </Text>
      ) : null}

      {stats.lastMatchDate ? (
        <Text style={[styles.cardLast, { color: theme.secondaryText }]}>
          {relativeDate(stats.lastMatchDate)}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ── Ligne joueur (vue liste / recherche) ──────────────────────────────────────

function PlayerRow({
  player,
  query,
  onPress,
}: {
  player: PlayerWithStats;
  query: string;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  const av = avatarColors(player.name);
  const { stats } = player;
  const wrColor = winRateColor(stats.winRate);

  // Surlignage de la portion tapée
  const renderName = () => {
    const normName = normalizeStr(player.name);
    const normQ = normalizeStr(query);
    const idx = normName.indexOf(normQ);
    if (idx === -1 || !query)
      return <Text style={[styles.rowName, { color: theme.text }]}>{player.name}</Text>;
    return (
      <Text style={[styles.rowName, { color: theme.text }]}>
        {player.name.slice(0, idx)}
        <Text style={styles.rowNameHL}>{player.name.slice(idx, idx + query.length)}</Text>
        {player.name.slice(idx + query.length)}
      </Text>
    );
  };

  const ctx = [
    stats.isAdversaire ? "Adversaire" : null,
    stats.isPartenaire ? "Partenaire" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const sub = [ctx, stats.total > 0 ? `${stats.total} match${stats.total > 1 ? "s" : ""}` : "Aucun match"].filter(Boolean).join(" · ");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.rowAvatar, { backgroundColor: av.bg }]}>
        <Text style={[styles.rowAvatarText, { color: av.text }]}>
          {player.name[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.rowContent}>
        {renderName()}
        <Text style={[styles.rowSub, { color: theme.secondaryText }]} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {stats.total > 0 ? (
        <Text style={[styles.rowWR, { color: wrColor }]}>{stats.winRate}%</Text>
      ) : null}
    </Pressable>
  );
}

// ── En-tête de section ────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>{label}</Text>
      <View style={[styles.sectionLine, { backgroundColor: theme.border }]} />
      <Text style={[styles.sectionCount, { color: theme.secondaryText }]}>{count}</Text>
    </View>
  );
}

// ── Écran ─────────────────────────────────────────────────────────────────────

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
      return () => {
        active = false;
      };
    }, []),
  );

  // Calcul des stats pour tous les joueurs
  const playersWithStats = useMemo<PlayerWithStats[]>(
    () => players.map((p) => ({ ...p, stats: computePlayerStats(p, sessions) })),
    [players, sessions],
  );

  // Section Adversaires : joueurs ayant au moins 1 match en tant qu'adversaire
  const adversaires = useMemo(
    () =>
      playersWithStats
        .filter((p) => p.stats.isAdversaire)
        .sort((a, b) => {
          if (!a.stats.lastMatchDate) return 1;
          if (!b.stats.lastMatchDate) return -1;
          return new Date(b.stats.lastMatchDate).getTime() - new Date(a.stats.lastMatchDate).getTime();
        }),
    [playersWithStats],
  );

  // Section Partenaires
  const partenaires = useMemo(
    () =>
      playersWithStats
        .filter((p) => p.stats.isPartenaire)
        .sort((a, b) => {
          if (!a.stats.lastMatchDate) return 1;
          if (!b.stats.lastMatchDate) return -1;
          return new Date(b.stats.lastMatchDate).getTime() - new Date(a.stats.lastMatchDate).getTime();
        }),
    [playersWithStats],
  );

  // Résultats de recherche
  const searchResults = useMemo<PlayerWithStats[]>(() => {
    if (!searchQuery.trim()) return [];
    const q = normalizeStr(searchQuery);
    return playersWithStats.filter((p) => normalizeStr(p.name).includes(q));
  }, [playersWithStats, searchQuery]);

  async function handleCreateFromSearch() {
    const name = searchQuery.trim();
    if (!name) return;
    const newPlayer: Player = {
      id: randomUUID(),
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

  const renderGridPairs = (items: PlayerWithStats[], role: "adversaire" | "partenaire") => {
    const pairs: PlayerWithStats[][] = [];
    for (let i = 0; i < items.length; i += 2) {
      pairs.push(items.slice(i, i + 2));
    }
    return pairs.map((pair, rowIdx) => (
      <View key={rowIdx} style={styles.gridRow}>
        {pair.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            role={role}
            onPress={() => router.push({ pathname: "/players/[id]", params: { id: p.id } })}
          />
        ))}
        {/* Placeholder pour la dernière carte seule */}
        {pair.length === 1 ? <View style={styles.gridCardPlaceholder} /> : null}
      </View>
    ));
  };

  return (
    <>
      <Stack.Screen options={{ title: "Mes joueurs" }} />
      <Screen scrollable nativeHeader>
        {/* Titre */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]}>Mes joueurs</Text>
        </View>

        {/* Barre de recherche */}
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: isSearchActive ? "rgba(206,255,0,0.3)" : theme.border }]}>
          <Ionicons
            name="search"
            size={14}
            color={isSearchActive ? "#CEFF00" : theme.secondaryText}
          />
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

        {/* Chargement */}
        {isLoading ? <LoadingView /> : null}

        {/* Aucun joueur */}
        {noPlayers && !isLoading ? (
          <EmptyState
            title="Aucun joueur enregistré"
            description="Les joueurs apparaissent ici lorsque tu renseignes des adversaires ou partenaires dans tes matchs."
          />
        ) : null}

        {/* ── Vue recherche active ── */}
        {!isLoading && isSearchActive ? (
          <>
            {searchResults.length > 0 ? (
              <>
                <SectionHeader label="Résultats" count={searchResults.length} />
                {searchResults.map((p) => (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    query={searchQuery}
                    onPress={() =>
                      router.push({ pathname: "/players/[id]", params: { id: p.id } })
                    }
                  />
                ))}
              </>
            ) : null}

            {/* Option créer */}
            <View style={[styles.createWrap, { borderColor: theme.border }]}>
              <Text style={[styles.createPrompt, { color: theme.secondaryText }]}>
                Pas de joueur trouvé ?
              </Text>
              <Pressable onPress={handleCreateFromSearch} style={styles.createBtn}>
                <Ionicons name="add" size={11} color="#FF4D6D" />
                <Text style={styles.createBtnText}>
                  Créer "{searchQuery.trim()}" comme nouveau joueur
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {/* ── Vue principale (sans recherche) ── */}
        {!isLoading && !isSearchActive && players.length > 0 ? (
          <>
            {adversaires.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader label="Adversaires" count={adversaires.length} />
                {renderGridPairs(adversaires, "adversaire")}
              </View>
            ) : null}

            {partenaires.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader label="Partenaires" count={partenaires.length} />
                {renderGridPairs(partenaires, "partenaire")}
              </View>
            ) : null}

            {/* Joueurs sans match (créés manuellement) */}
            {(() => {
              const orphans = playersWithStats.filter(
                (p) => !p.stats.isAdversaire && !p.stats.isPartenaire,
              );
              if (orphans.length === 0) return null;
              return (
                <View style={styles.section}>
                  <SectionHeader label="Autres joueurs" count={orphans.length} />
                  {orphans.map((p) => (
                    <PlayerRow
                      key={p.id}
                      player={p}
                      query=""
                      onPress={() =>
                        router.push({ pathname: "/players/[id]", params: { id: p.id } })
                      }
                    />
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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  titleRow: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.displayExtraBold,
  },

  // ── Recherche ────────────────────────────────────────────────────────────────
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
    padding: 0,
  },
  searchClear: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Section ──────────────────────────────────────────────────────────────────
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  sectionCount: {
    fontSize: 9,
    fontFamily: fonts.bodyRegular,
    opacity: 0.6,
  },

  // ── Grille ───────────────────────────────────────────────────────────────────
  gridRow: {
    flexDirection: "row",
    gap: 7,
  },
  gridCardPlaceholder: {
    flex: 1,
  },

  // ── Carte joueur ─────────────────────────────────────────────────────────────
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 5,
    overflow: "hidden",
    position: "relative",
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    height: 2,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  cardAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardAvatarText: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 13,
  },
  cardName: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    lineHeight: 14,
  },
  cardStats: {
    fontSize: 10,
    fontFamily: fonts.bodyRegular,
  },
  cardWR: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 11,
  },
  cardLast: {
    fontSize: 9,
    fontFamily: fonts.bodyRegular,
    opacity: 0.6,
  },

  // ── Ligne liste ──────────────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowAvatarText: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 14,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowName: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
  },
  rowNameHL: {
    color: "#CEFF00",
    fontFamily: fonts.displayExtraBold,
  },
  rowSub: {
    fontSize: 10,
    fontFamily: fonts.bodyRegular,
  },
  rowWR: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 13,
    flexShrink: 0,
  },

  // ── Créer joueur ─────────────────────────────────────────────────────────────
  createWrap: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  createPrompt: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,77,109,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,77,109,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  createBtnText: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    color: "#FF4D6D",
  },
});
