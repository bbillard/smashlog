import { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/hooks/useAppTheme";

interface ScreenProps extends PropsWithChildren {
  scrollable?: boolean;
  footer?: ReactNode;
}

export function Screen({ children, scrollable = false, footer }: ScreenProps) {
  const { theme } = useAppTheme();

  return (
    <SafeAreaView style={StyleSheet.flatten([styles.safeArea, { backgroundColor: theme.background }])}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {scrollable ? (
          <ScrollView
            contentContainerStyle={StyleSheet.flatten([
              styles.scrollContent,
              footer ? styles.withFooter : null,
            ])}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={StyleSheet.flatten([styles.content, footer ? styles.withFooter : null])}>
            {children}
          </View>
        )}
        {footer ? (
          <View style={StyleSheet.flatten([styles.footer, { backgroundColor: theme.background }])}>
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  withFooter: {
    paddingBottom: 120,
  },
});
