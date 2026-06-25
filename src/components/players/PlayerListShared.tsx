/**
 * Composants et helpers partagés entre app/players/index.tsx,
 * app/players/adversaires.tsx et app/players/partenaires.tsx.
 */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { Player } from "@/src/types/index";
import {
  avatarColors,
  normalizeStr,
  PlayerStats,
  relativeDate,
} from "@/src/utils/playerStats";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlayerWithStats extends Player {
  stats: PlayerStats;
}

// ── Win rate rôle-spécifique ──────────────────────────────────────────────────

export function roleWRStats(
  records: PlayerStats["records"],
  role: "adversaire" | "partenaire",
): { total: number; wins: number; winRate: number; color: string } {
  const filtered = records.filter((r) =>
    role === "adversaire" ? r.isAdversaire : r.isPartenaire,
  );
  const wins = filtered.filter((r) => r.resultat === "victoire").length;
  const total = filtered.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const color =
    winRate >= 50 ? (role === "adversaire" ? "#CEFF00" : "#00E5FF") : "#FF4D6D";
  return { total, wins, winRate, color };
}

// ── Carte joueur (grille 2 colonnes) ─────────────────────────────────────────

export function PlayerCard({
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
  const accentColor = role === "adversaire" ? "#CEFF00" : "#00E5FF";
  const wr = roleWRStats(player.stats.records, role);
  const wrIcon = role === "adversaire" ? "trophy-outline" : "people-outline";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        sharedStyles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[sharedStyles.cardAccent, { backgroundColor: accentColor + "55" }]} />
      <View style={[sharedStyles.cardAvatar, { backgroundColor: av.bg }]}>
        <Text style={[sharedStyles.cardAvatarText, { color: av.text }]}>
          {player.name[0].toUpperCase()}
        </Text>
      </View>
      <Text style={[sharedStyles.cardName, { color: theme.text }]} numberOfLines={1}>
        {player.name}
      </Text>
      <Text style={[sharedStyles.cardStats, { color: theme.secondaryText }]}>
        {wr.total} match{wr.total > 1 ? "s" : ""}
      </Text>
      {wr.total > 0 ? (
        <View style={sharedStyles.cardWRRow}>
          <Text style={[sharedStyles.cardWR, { color: wr.color }]}>{wr.winRate}%</Text>
          <Ionicons name={wrIcon as any} size={11} color={wr.color} />
        </View>
      ) : null}
      {player.stats.lastMatchDate ? (
        <Text style={[sharedStyles.cardLast, { color: theme.secondaryText }]}>
          {relativeDate(player.stats.lastMatchDate)}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ── Ligne joueur (vue liste / recherche) ──────────────────────────────────────

export function PlayerRow({
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
  const dominantRole = player.stats.isAdversaire ? "adversaire" : "partenaire";
  const wr = roleWRStats(player.stats.records, dominantRole);
  const wrIcon = dominantRole === "adversaire" ? "trophy-outline" : "people-outline";

  const renderName = () => {
    const normName = normalizeStr(player.name);
    const normQ = normalizeStr(query);
    const idx = normName.indexOf(normQ);
    if (idx === -1 || !query)
      return <Text style={[sharedStyles.rowName, { color: theme.text }]}>{player.name}</Text>;
    return (
      <Text style={[sharedStyles.rowName, { color: theme.text }]}>
        {player.name.slice(0, idx)}
        <Text style={sharedStyles.rowNameHL}>{player.name.slice(idx, idx + query.length)}</Text>
        {player.name.slice(idx + query.length)}
      </Text>
    );
  };

  const ctx = [
    player.stats.isAdversaire ? "Adversaire" : null,
    player.stats.isPartenaire ? "Partenaire" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const sub = [
    ctx,
    wr.total > 0 ? `${wr.total} match${wr.total > 1 ? "s" : ""}` : "Aucun match",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        sharedStyles.row,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[sharedStyles.rowAvatar, { backgroundColor: av.bg }]}>
        <Text style={[sharedStyles.rowAvatarText, { color: av.text }]}>
          {player.name[0].toUpperCase()}
        </Text>
      </View>
      <View style={sharedStyles.rowContent}>
        {renderName()}
        <Text style={[sharedStyles.rowSub, { color: theme.secondaryText }]} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {wr.total > 0 ? (
        <View style={sharedStyles.rowWRRow}>
          <Text style={[sharedStyles.rowWR, { color: wr.color }]}>{wr.winRate}%</Text>
          <Ionicons name={wrIcon as any} size={11} color={wr.color} />
        </View>
      ) : null}
    </Pressable>
  );
}

// ── Grille de joueurs (2 colonnes) ────────────────────────────────────────────

export function PlayerGrid({
  items,
  role,
  onNavigate,
}: {
  items: PlayerWithStats[];
  role: "adversaire" | "partenaire";
  onNavigate: (id: string) => void;
}) {
  const pairs: PlayerWithStats[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push(items.slice(i, i + 2));
  }
  return (
    <>
      {pairs.map((pair, rowIdx) => (
        <View key={rowIdx} style={sharedStyles.gridRow}>
          {pair.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              role={role}
              onPress={() => onNavigate(p.id)}
            />
          ))}
          {pair.length === 1 ? <View style={sharedStyles.gridCardPlaceholder} /> : null}
        </View>
      ))}
    </>
  );
}

// ── En-tête de section ────────────────────────────────────────────────────────

export function SectionHeader({ label, count }: { label: string; count: number }) {
  const { theme } = useAppTheme();
  return (
    <View style={sharedStyles.sectionHeader}>
      <Text style={[sharedStyles.sectionLabel, { color: theme.secondaryText }]}>{label}</Text>
      <View style={[sharedStyles.sectionLine, { backgroundColor: theme.border }]} />
      <Text style={[sharedStyles.sectionCount, { color: theme.secondaryText }]}>{count}</Text>
    </View>
  );
}

// ── Tri par date du dernier match ─────────────────────────────────────────────

export function sortByLastMatch(a: PlayerWithStats, b: PlayerWithStats): number {
  if (!a.stats.lastMatchDate) return 1;
  if (!b.stats.lastMatchDate) return -1;
  return (
    new Date(b.stats.lastMatchDate).getTime() -
    new Date(a.stats.lastMatchDate).getTime()
  );
}

// ── Styles partagés ───────────────────────────────────────────────────────────

export const sharedStyles = StyleSheet.create({
  // Grille
  gridRow: { flexDirection: "row", gap: 7 },
  gridCardPlaceholder: { flex: 1 },

  // Carte joueur
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
  cardAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  cardAvatarText: { fontFamily: fonts.displayExtraBold, fontSize: 13 },
  cardName: { fontFamily: fonts.displayBold, fontSize: 11, lineHeight: 14 },
  cardStats: { fontSize: 10, fontFamily: fonts.bodyRegular },
  cardWRRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardWR: { fontFamily: fonts.displayExtraBold, fontSize: 11 },
  cardLast: { fontSize: 9, fontFamily: fonts.bodyRegular, opacity: 0.6 },

  // Ligne liste
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  rowAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowAvatarText: { fontFamily: fonts.displayExtraBold, fontSize: 14 },
  rowContent: { flex: 1, minWidth: 0, gap: 2 },
  rowName: { fontFamily: fonts.displayBold, fontSize: 13 },
  rowNameHL: { color: "#CEFF00", fontFamily: fonts.displayExtraBold },
  rowSub: { fontSize: 10, fontFamily: fonts.bodyRegular },
  rowWRRow: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 },
  rowWR: { fontFamily: fonts.displayExtraBold, fontSize: 13 },

  // Section header
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionLabel: { fontFamily: fonts.displayBold, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase" },
  sectionLine: { flex: 1, height: 1 },
  sectionCount: { fontSize: 9, fontFamily: fonts.bodyRegular, opacity: 0.6 },
});
