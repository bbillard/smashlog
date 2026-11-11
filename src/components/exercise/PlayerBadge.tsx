import { StyleSheet, Text, View } from "react-native";

import { SEQUENCE_PLAYER_COLORS, SEQUENCE_PLAYER_ON_COLOR } from "@/src/constants/sequenceColors";
import { fonts } from "@/src/theme/typography";
import { SequencePlayer } from "@/src/types/index";

interface PlayerBadgeProps {
  player: SequencePlayer;
  size?: number;
}

/** Pastille carrée arrondie à la couleur d'un joueur de séquence (A, B, C, D). */
export function PlayerBadge({ player, size = 30 }: PlayerBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.3),
          backgroundColor: SEQUENCE_PLAYER_COLORS[player],
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { fontSize: Math.round(size * 0.47), color: SEQUENCE_PLAYER_ON_COLOR },
        ]}
      >
        {player}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  text: {
    fontFamily: fonts.displayExtraBold,
  },
});
