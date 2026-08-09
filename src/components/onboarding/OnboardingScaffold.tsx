import { PropsWithChildren, ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fonts } from "@/src/theme/typography";

const TOTAL_STEPS = 4;

interface OnboardingScaffoldProps extends PropsWithChildren {
  progress?: 1 | 2 | 3 | 4;
  title?: ReactNode;
  body?: string;
  footer?: ReactNode;
}

export function OnboardingScaffold({
  progress,
  title,
  body,
  children,
  footer,
}: OnboardingScaffoldProps) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      {progress ? (
        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_STEPS }, (_, index) => index + 1).map((step) => (
            <View
              key={step}
              style={[
                styles.progressSeg,
                step < progress ? styles.progressDone : null,
                step === progress ? styles.progressCurrent : null,
              ]}
            />
          ))}
        </View>
      ) : null}

      <ScrollView
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {title ? <View style={styles.headerBlock}>{title}</View> : null}
          {body ? <Text style={styles.body}>{body}</Text> : null}
          <View style={styles.main}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function OnboardingButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cta,
        disabled ? styles.ctaDisabled : null,
        !disabled && pressed ? styles.ctaPressed : null,
      ]}
    >
      <Text style={[styles.ctaText, disabled ? styles.ctaTextDisabled : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0d0d0f",
  },
  progressRow: {
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  scrollContent: {
    flexGrow: 1,
  },
  progressSeg: {
    flex: 1,
    height: 2,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  progressDone: {
    backgroundColor: "#CEFF00",
  },
  progressCurrent: {
    backgroundColor: "#CEFF00",
    opacity: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 24,
    minHeight: "100%",
  },
  headerBlock: {
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: "#9999aa",
    fontFamily: fonts.bodyRegular,
    marginBottom: 28,
  },
  main: {
    flex: 1,
  },
  footer: {
    marginTop: 16,
    paddingBottom: 8,
  },
  cta: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#CEFF00",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPressed: {
    opacity: 0.92,
  },
  ctaDisabled: {
    backgroundColor: "#1e1e24",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  ctaText: {
    fontSize: 15,
    color: "#000000",
    fontFamily: fonts.displayBold,
  },
  ctaTextDisabled: {
    color: "#6b6b7a",
  },
});
