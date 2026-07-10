import { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/hooks/useAppTheme";

interface ScreenProps extends PropsWithChildren {
  scrollable?: boolean;
  footer?: ReactNode;
  /**
   * Passe à true quand l'écran est rendu sous un header natif (Stack.Screen /
   * expo-router). Dans ce cas, le header gère déjà l'espacement du haut et la
   * zone de sécurité — Screen ne doit donc pas ajouter son propre padding top
   * ni son propre inset "top" de SafeAreaView.
   */
  nativeHeader?: boolean;
}

export function Screen({ children, scrollable = false, footer, nativeHeader = false }: ScreenProps) {
  const { theme } = useAppTheme();

  return (
    <SafeAreaView
      edges={nativeHeader ? ["right", "bottom", "left"] : undefined}
      style={StyleSheet.flatten([styles.safeArea, { backgroundColor: theme.background }])}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {scrollable ? (
          <ScrollView
            contentContainerStyle={StyleSheet.flatten([
              nativeHeader ? styles.scrollContentNativeHeader : styles.scrollContent,
              footer ? styles.withFooter : null,
            ])}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View
            style={StyleSheet.flatten([
              nativeHeader ? styles.contentNativeHeader : styles.content,
              footer ? styles.withFooter : null,
            ])}
          >
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
    paddingTop: 28,
    gap: 16,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 28,
    gap: 16,
  },
  contentNativeHeader: {
    flex: 1,
    padding: 20,
    paddingTop: 12,
    gap: 16,
  },
  scrollContentNativeHeader: {
    padding: 20,
    paddingTop: 12,
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
