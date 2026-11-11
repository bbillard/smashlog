import { StyleSheet, Text, View } from "react-native";

import { PlayerBadge } from "@/src/components/exercise/PlayerBadge";
import { fonts } from "@/src/theme/typography";
import { SequencePlayer, SequenceRole } from "@/src/types/index";

interface DiagramLegendProps {
  players: SequencePlayer[];
  roles: Partial<Record<SequencePlayer, SequenceRole>>;
  color: string;
  align?: "flex-start" | "center" | "flex-end";
}

/** Légende d'un demi-terrain du schéma : « [B] relance », « [A] travaille »… */
export function DiagramLegend({ players, roles, color, align = "center" }: DiagramLegendProps) {
  if (players.length === 0) return null;
  return (
    <View style={[styles.row, { justifyContent: align }]}>
      {players.map((p) => (
        <View key={p} style={styles.item}>
          <PlayerBadge player={p} size={18} />
          <Text style={[styles.text, { color }]}>
            {roles[p] === "travaille" ? "travaille" : "relance"}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  text: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
});
