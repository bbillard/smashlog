import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { formatDate } from "@/src/utils/format";

export function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
}) {
  const { theme } = useAppTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  function handleNativeDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (event.type !== "set" || !selectedDate) {
      return;
    }

    const nextDate = new Date(value);
    nextDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    onChange(nextDate);

    if (Platform.OS === "android") {
      setShowTimePicker(true);
    }
  }

  function handleNativeTimeChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (event.type !== "set" || !selectedDate) {
      return;
    }

    const nextDate = new Date(value);
    nextDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    onChange(nextDate);
  }

  if (Platform.OS === "web") {
    return (
      <View style={styles.wrapper}>
        <Text style={[styles.label, { color: theme.secondaryText }]}>{label}</Text>
        <View style={styles.webGroup}>
          <DateTimePicker
            mode="date"
            onChange={(_event, selectedDate) => {
              if (!selectedDate) {
                return;
              }

              const nextDate = new Date(value);
              nextDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
              onChange(nextDate);
            }}
            value={value}
          />
          <DateTimePicker
            mode="time"
            onChange={(_event, selectedDate) => {
              if (!selectedDate) {
                return;
              }

              const nextDate = new Date(value);
              nextDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
              onChange(nextDate);
            }}
            value={value}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => {
            setShowDatePicker((current) => !current);
            setShowTimePicker(false);
          }}
          style={[
            styles.trigger,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons color={theme.primary} name="calendar-outline" size={18} />
          <Text style={[styles.triggerText, { color: theme.text }]}>
            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(value)}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setShowTimePicker((current) => !current);
            setShowDatePicker(false);
          }}
          style={[
            styles.trigger,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons color={theme.primary} name="time-outline" size={18} />
          <Text style={[styles.triggerText, { color: theme.text }]}>
            {new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(value)}
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.preview, { color: theme.tertiaryText }]}>{formatDate(value.toISOString())}</Text>

      {showDatePicker ? (
        <DateTimePicker
          display={Platform.OS === "ios" ? "inline" : "default"}
          mode="date"
          onChange={handleNativeDateChange}
          themeVariant={Platform.OS === "ios" ? "dark" : undefined}
          value={value}
        />
      ) : null}

      {showTimePicker ? (
        <DateTimePicker
          display={Platform.OS === "ios" ? "spinner" : "default"}
          mode="time"
          onChange={handleNativeTimeChange}
          themeVariant={Platform.OS === "ios" ? "dark" : undefined}
          value={value}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  trigger: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  triggerText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
  },
  preview: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
  },
  webGroup: {
    gap: 8,
  },
});
