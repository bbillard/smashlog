import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/src/hooks/useAppTheme";

export function EmptyState({ title, description }: { title: string; description: string }) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.secondaryText }]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
});
