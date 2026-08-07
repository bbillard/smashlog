import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";

interface StreakBannerProps {
  weeks: number;
}

/**
 * Flame icon + big cyan number, left-aligned and vertically centered with
 * "semaine(s) consécutive(s)".
 *
 * Uses an Ionicons glyph instead of a raw 🔥 emoji character: the emoji was
 * rendering as an unreliable "tofu" placeholder (wrong color, and an oversized
 * invisible advance width that pushed everything after it out of alignment).
 * Ionicons is a vector icon already used everywhere else in the app, so it
 * renders consistently and has a predictable, fixed size we can control.
 */
export function StreakBanner({ weeks }: StreakBannerProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.row}>
      <View style={styles.numberGroup}>
        <Ionicons color={theme.accent3} name="flame" size={30} />
        <Text style={[styles.number, { color: theme.accent3 }]}>{weeks}</Text>
      </View>
      <Text style={[styles.label, { color: theme.text }]}>
        semaine{weeks > 1 ? "s" : ""} consécutive{weeks > 1 ? "s" : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
  },
  numberGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  number: {
    fontSize: 44,
    fontFamily: fonts.displayExtraBold,
    lineHeight: 44,
  },
  label: {
    flexShrink: 1,
    fontSize: 15,
    fontFamily: fonts.displayBold,
    lineHeight: 19,
  },
});
