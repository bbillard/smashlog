import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAppTheme } from "@/src/hooks/useAppTheme";

export function LoadingView() {
  const { theme } = useAppTheme();

  return (
    <View style={styles.wrapper}>
      <ActivityIndicator color={theme.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
});
