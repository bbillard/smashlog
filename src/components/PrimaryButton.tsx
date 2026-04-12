import { Pressable, StyleSheet, Text } from "react-native";

import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "danger";
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  tone = "primary",
}: PrimaryButtonProps) {
  const { theme } = useAppTheme();
  const backgroundColor =
    tone === "danger"
      ? theme.danger
      : tone === "secondary"
        ? theme.surfaceAlt
        : theme.primary;
  const textColor = tone === "secondary" ? theme.buttonTextOnSecondary : theme.buttonTextOnPrimary;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
          borderColor: tone === "secondary" ? theme.border : backgroundColor,
        },
      ]}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  label: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    letterSpacing: 0.2,
  },
});
