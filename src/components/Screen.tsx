import { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/hooks/useAppTheme";

interface ScreenProps extends PropsWithChildren {
  scrollable?: boolean;
  footer?: ReactNode;
  /**
   * Mettre à true pour les écrans sous un header Stack natif.
   * Le header natif gère déjà le top safe area (notch/status bar),
   * donc on retire le top edge du SafeAreaView pour éviter le double espacement.
   */
  nativeHeader?: boolean;
}

export function Screen({ children, scrollable = false, footer, nativeHeader = false }: ScreenProps) {
  const { theme } = useAppTheme();

  const edges = nativeHeader
    ? (["right", "bottom", "left"] as const)
    : (["top", "right", "bottom", "left"] as const);

  const paddingTop = nativeHeader ? 16 : 20;

  return (
    <SafeAreaView
      edges={edges}
      style={StyleSheet.flatten([styles.safeArea, { backgroundColor: theme.background }])}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {scrollable ? (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop },
              footer ? styles.withFooter : null,
            ]}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, { paddingTop }, footer ? styles.withFooter : null]}>
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
