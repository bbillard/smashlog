import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { durationMinutes, formatDuration, formatTime, withDayOf } from "@/src/utils/sessionTime";

/**
 * Champ optionnel « Heure de fin » (v1.4.1), à placer sous le DateTimeField de
 * début. Même sélecteur natif que l'heure de début ; l'heure choisie est
 * toujours rattachée au jour de `start`.
 * - value null = non renseignée : le bouton propose de l'ajouter
 * - `suggested` : heure proposée à l'ouverture du sélecteur quand value est null
 */
export function EndTimeField({
  start,
  value,
  suggested,
  onChange,
  error,
}: {
  start: Date;
  value: Date | null;
  suggested: Date;
  onChange: (end: Date | null) => void;
  error?: string | null;
}) {
  const { theme } = useAppTheme();
  const [showPicker, setShowPicker] = useState(false);
  const pickerValue = value ?? suggested;

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    // Android : dialogue modal, un seul onChange (validation/annulation).
    // iOS : spinner inline, fermé via « Terminé » (cf. DateTimeField).
    if (Platform.OS === "android") setShowPicker(false);
    if (event.type !== "set" || !selected) return;
    onChange(withDayOf(start, selected));
  }

  const duration = value ? durationMinutes(start.toISOString(), value.toISOString()) : null;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>
        Heure de fin <Text style={styles.optional}>· optionnel</Text>
      </Text>

      {Platform.OS === "web" ? (
        <DateTimePicker
          mode="time"
          onChange={(_event, selected) => {
            if (selected) onChange(withDayOf(start, selected));
          }}
          value={pickerValue}
        />
      ) : (
        <View style={styles.row}>
          <Pressable
            onPress={() => {
              // Ouvrir le sélecteur sur une valeur vide renseigne l'heure suggérée
              if (!value) onChange(withDayOf(start, suggested));
              setShowPicker(true);
            }}
            style={[
              styles.trigger,
              { backgroundColor: theme.surface, borderColor: error ? "#FF4D6D" : theme.border },
            ]}
          >
            <Ionicons color={theme.primary} name="time-outline" size={18} />
            <Text style={[styles.triggerText, { color: value ? theme.text : theme.secondaryText }]}>
              {value ? formatTime(value) : "Ajouter une heure de fin"}
            </Text>
            {duration ? (
              <Text style={[styles.duration, { color: theme.tertiaryText }]}>{formatDuration(duration)}</Text>
            ) : null}
          </Pressable>
          {value ? (
            <Pressable
              accessibilityLabel="Retirer l'heure de fin"
              hitSlop={8}
              onPress={() => {
                setShowPicker(false);
                onChange(null);
              }}
              style={[styles.clearBtn, { borderColor: theme.border }]}
            >
              <Ionicons color={theme.secondaryText} name="close" size={16} />
            </Pressable>
          ) : null}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {showPicker && Platform.OS !== "web" ? (
        <View style={styles.pickerContainer}>
          {Platform.OS === "ios" ? (
            <Pressable onPress={() => setShowPicker(false)} style={styles.doneButton}>
              <Text style={[styles.doneButtonText, { color: theme.primary }]}>Terminé</Text>
            </Pressable>
          ) : null}
          <DateTimePicker
            display={Platform.OS === "ios" ? "spinner" : "default"}
            mode="time"
            onChange={handleChange}
            themeVariant={Platform.OS === "ios" ? "dark" : undefined}
            {...(Platform.OS === "ios" ? { textColor: "#F0F0F2" } : null)}
            value={pickerValue}
          />
        </View>
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
  optional: {
    fontFamily: fonts.bodyRegular,
    letterSpacing: 0,
    textTransform: "none",
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
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
  },
  duration: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
  },
  clearBtn: {
    width: 56,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
    color: "#FF4D6D",
  },
  pickerContainer: {
    gap: 4,
  },
  doneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  doneButtonText: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
  },
});
