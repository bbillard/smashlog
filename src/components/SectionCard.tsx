import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { useAppTheme } from "@/src/hooks/useAppTheme";

export function SectionCard({ children }: PropsWithChildren) {
  const { theme } = useAppTheme();

  return (
    <View
      style={StyleSheet.flatten([
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ])}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 0,
  },
});
