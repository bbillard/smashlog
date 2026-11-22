import { StyleSheet, Text, View } from "react-native";

import {
  SCHEMA_SCREEN_COLORS,
  SEQUENCE_PLAYER_COLORS,
  SEQUENCE_PLAYER_ON_COLOR,
} from "@/src/constants/sequenceColors";
import { fonts } from "@/src/theme/typography";
import { SequencePlayer } from "@/src/types/index";

type ShotNumberBadgeProps =
  | { kind: "shot"; number: number; player: SequencePlayer; size?: number }
  | { kind: "ending"; mode: "boucle" | "finir_point"; size?: number };

/**
 * Pastille ronde de la liste de séquence : numéro du coup en Syne Bold à la
 * couleur du joueur, ou pastille cerclée de la ligne de fin (↻ lime en
 * boucle, → gris pour « Puis point libre »).
 */
export function ShotNumberBadge(props: ShotNumberBadgeProps) {
  const size = props.size ?? 22;
  const base = { width: size, height: size, borderRadius: size / 2 };
  if (props.kind === "ending") {
    const loop = props.mode === "boucle";
    const color = loop ? SCHEMA_SCREEN_COLORS.accent : SCHEMA_SCREEN_COLORS.muted;
    return (
      <View style={[styles.badge, base, styles.ring, { borderColor: color }]}>
        <Text style={[styles.endingText, { color, fontSize: Math.round(size * 0.58) }]}>{loop ? "↻" : "→"}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, base, { backgroundColor: SEQUENCE_PLAYER_COLORS[props.player] }]}>
      <Text style={[styles.number, { fontSize: Math.round(size * 0.5) }]}>{props.number}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ring: {
    borderWidth: 1.5,
  },
  number: {
    fontFamily: fonts.displayBold,
    color: SEQUENCE_PLAYER_ON_COLOR,
  },
  endingText: {
    fontFamily: fonts.bodySemiBold,
  },
});
