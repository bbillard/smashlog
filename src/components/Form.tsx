import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";

interface InputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}

export function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: InputProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>{label}</Text>
      <TextInput
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.secondaryText}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            color: theme.text,
            fontFamily: fonts.bodyRegular,
          },
        ]}
        textAlignVertical={multiline ? "top" : "center"}
        value={value}
      />
    </View>
  );
}

interface ToggleProps {
  label: string;
  value: boolean;
  onToggle: () => void;
}

export function ToggleRow({ label, value, onToggle }: ToggleProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable onPress={onToggle} style={styles.toggleRow}>
      <Text style={[styles.label, { color: theme.text, flex: 1 }]}>{label}</Text>
      <View
        style={[
          styles.toggle,
          {
            backgroundColor: value ? theme.primary : theme.surfaceAlt,
            borderColor: theme.border,
            alignItems: value ? "flex-end" : "flex-start",
          },
        ]}
      >
        <View style={[styles.knob, { backgroundColor: "#FFFFFF" }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 13,
    lineHeight: 20,
  },
  multiline: {
    minHeight: 110,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    justifyContent: "center",
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});
