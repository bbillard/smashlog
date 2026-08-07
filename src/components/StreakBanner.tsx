import { StyleSheet, Text } from "react-native";

import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";

interface StreakBannerProps {
  weeks: number;
}

/** "🔥 X semaine(s) consécutive(s)" — shown only when weeks > 0. */
export function StreakBanner({ weeks }: StreakBannerProps) {
  const { theme } = useAppTheme();

  return (
    <Text style={[styles.text, { color: theme.primary }]}>
      🔥 {weeks} semaine{weeks > 1 ? "s" : ""} consécutive{weeks > 1 ? "s" : ""}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 20,
    fontFamily: fonts.displayExtraBold,
  },
});
