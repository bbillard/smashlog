import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";

import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";

interface ToastProps {
  /** Message affiché ; null = masqué. */
  message: string | null;
  onHide: () => void;
  durationMs?: number;
}

/**
 * Message éphémère en bas d'écran, non bloquant (pas d'équivalent natif
 * multiplateforme : ToastAndroid n'existe pas sur iOS). À placer en dernier
 * enfant d'un conteneur plein écran.
 */
export function Toast({ message, onHide, durationMs = 3500 }: ToastProps) {
  const { theme } = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  // Ref : un onHide recréé à chaque rendu du parent ne doit pas relancer le minuteur.
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => onHideRef.current());
    }, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, opacity]);

  if (!message) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { opacity, backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
    >
      <Text style={[styles.text, { color: theme.text }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 28,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.bodyMedium,
    textAlign: "center",
  },
});
