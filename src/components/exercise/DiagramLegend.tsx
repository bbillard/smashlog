import { StyleSheet, Text, View } from "react-native";

import { PlayerBadge } from "@/src/components/exercise/PlayerBadge";
import { SEQUENCE_PLAYER_COLORS } from "@/src/constants/sequenceColors";
import { fonts } from "@/src/theme/typography";
import { SequencePlayer } from "@/src/types/index";

interface DiagramLegendProps {
  players: SequencePlayer[];
  color: string;
  align?: "flex-start" | "center" | "flex-end";
  /**
   * « badge » : pastille carrée avec la lettre (fiche exercice).
   * « dot » : point rond à la couleur du joueur, sur une seule ligne (vue
   * plein écran et export PNG, écran 5 bis).
   */
  variant?: "badge" | "dot";
  /** Rôle du camp en poste fixe : « Joueur B · poste fixe », « Joueur A · travaille ». */
  role?: string;
}

/** Hauteur d'une ligne de légende « dot », réservée dans le calcul de la taille du terrain. */
export const DOT_LEGEND_HEIGHT = 18;

/** Légende d'un camp du schéma : « ● Joueur A   ● Joueur C »… */
export function DiagramLegend({ players, color, align = "center", variant = "badge", role }: DiagramLegendProps) {
  const suffix = role ? ` · ${role}` : "";
  if (variant === "dot") {
    return (
      <View style={[styles.dotRow, { justifyContent: align }]}>
        {players.map((p) => (
          <View key={p} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: SEQUENCE_PLAYER_COLORS[p] }]} />
            <Text style={[styles.text, { color }]} numberOfLines={1}>
              Joueur {p}
              {suffix}
            </Text>
          </View>
        ))}
      </View>
    );
  }
  if (players.length === 0) return null;
  return (
    <View style={[styles.row, { justifyContent: align }]}>
      {players.map((p) => (
        <View key={p} style={styles.item}>
          <PlayerBadge player={p} size={18} />
          <Text style={[styles.text, { color }]}>
            Joueur {p}
            {suffix}
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
  dotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    height: DOT_LEGEND_HEIGHT,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  text: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
});
