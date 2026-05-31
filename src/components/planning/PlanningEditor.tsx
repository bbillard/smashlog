import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { PanResponder, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ScheduledSlot, createScheduledSlotId } from "@/src/services/onboarding";
import { fonts } from "@/src/theme/typography";

type SlotFamily = ScheduledSlot["family"];

const DAY_SHORT_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_FULL_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}h${String(minute).padStart(2, "0")}`;
}

export function getFamilyTokens(family: SlotFamily) {
  return family === "badminton"
    ? {
        accent: "#00E5C8",
        background: "rgba(0,229,200,0.1)",
        pillBackground: "rgba(0,229,200,0.12)",
      }
    : {
        accent: "#FF8C00",
        background: "rgba(255,140,0,0.1)",
        pillBackground: "rgba(255,140,0,0.12)",
      };
}

function SlotRow({
  slot,
  onDelete,
  onEdit,
}: {
  slot: ScheduledSlot;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dx < -18 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -52) {
            onDelete();
          }
        },
      }),
    [onDelete],
  );
  const tokens = getFamilyTokens(slot.family);

  return (
    <Pressable onPress={onEdit} {...swipe.panHandlers} style={styles.slotRow}>
      <Text style={[styles.slotDay, { color: tokens.accent }]}>{DAY_FULL_LABELS[slot.dayOfWeek]}</Text>
      <Text style={styles.slotTime}>{formatTime(slot.hour, slot.minute)}</Text>
      <View style={[styles.slotType, { backgroundColor: tokens.pillBackground }]}>
        <Text style={[styles.slotTypeText, { color: tokens.accent }]}>
          {slot.family === "badminton" ? "Badminton" : "Physique"}
        </Text>
      </View>
    </Pressable>
  );
}

export function PlanningEditor({
  slots,
  onSlotsChange,
}: {
  slots: ScheduledSlot[];
  onSlotsChange: (slots: ScheduledSlot[]) => void;
}) {
  const [family, setFamily] = useState<SlotFamily>("badminton");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [pickerDate, setPickerDate] = useState(() => {
    const date = new Date();
    date.setHours(19, 0, 0, 0);
    return date;
  });

  const slotsByDay = useMemo(() => new Map(slots.map((slot) => [slot.dayOfWeek, slot])), [slots]);

  function openPicker(dayOfWeek: number, slot?: ScheduledSlot) {
    const nextDate = new Date();
    nextDate.setHours(slot?.hour ?? 19, slot?.minute ?? 0, 0, 0);
    setPickerDate(nextDate);
    setEditingDay(dayOfWeek);
    setEditingSlotId(slot?.id ?? null);
    setPickerVisible(true);
    if (slot?.family) {
      setFamily(slot.family);
    }
  }

  function upsertSlot(dayOfWeek: number, date: Date) {
    const minute = date.getMinutes() >= 30 ? 30 : 0;
    const hour = date.getHours();
    const existing = slots.find((slot) => slot.dayOfWeek === dayOfWeek);
    const nextSlot: ScheduledSlot = {
      id: existing?.id ?? editingSlotId ?? createScheduledSlotId(),
      dayOfWeek: dayOfWeek as ScheduledSlot["dayOfWeek"],
      hour,
      minute,
      family,
    };

    onSlotsChange(
      [...slots.filter((slot) => slot.dayOfWeek !== dayOfWeek), nextSlot].sort(
        (left, right) => left.dayOfWeek - right.dayOfWeek,
      ),
    );
  }

  function handlePickerChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setPickerVisible(false);
    }

    if (event.type === "dismissed" || editingDay === null || !selectedDate) {
      return;
    }

    upsertSlot(editingDay, selectedDate);
    setPickerDate(selectedDate);
  }

  return (
    <View style={styles.root}>
      <Text style={styles.sectionLabel}>Type de séance</Text>
      <View style={styles.familyRow}>
        {(["badminton", "physique"] as const).map((value) => {
          const selected = family === value;
          const tokens = getFamilyTokens(value);

          return (
            <Pressable
              key={value}
              onPress={() => setFamily(value)}
              style={[
                styles.familyButton,
                selected ? { backgroundColor: tokens.background, borderColor: tokens.accent } : null,
              ]}
            >
              <View style={[styles.familyDot, { backgroundColor: selected ? tokens.accent : "#6b6b7a" }]} />
              <Text style={[styles.familyText, { color: selected ? tokens.accent : "#6b6b7a" }]}>
                {value === "badminton" ? "Badminton" : "Physique"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Jour</Text>
      <View style={styles.daysGrid}>
        {DAY_SHORT_LABELS.map((label, index) => {
          const dayOfWeek = index as ScheduledSlot["dayOfWeek"];
          const slot = slotsByDay.get(dayOfWeek);
          const tokens = getFamilyTokens(slot?.family ?? family);

          return (
            <View key={`${label}-${index}`} style={styles.dayCol}>
              <Text style={styles.dayLabel}>{label}</Text>
              <Pressable
                onPress={() => {
                  if (slot) {
                    onSlotsChange(slots.filter((entry) => entry.dayOfWeek !== dayOfWeek));
                    return;
                  }

                  openPicker(dayOfWeek);
                }}
                style={[
                  styles.dayButton,
                  slot ? { backgroundColor: tokens.background, borderColor: tokens.accent } : null,
                ]}
              >
                {slot ? <View style={[styles.dayInner, { backgroundColor: tokens.accent }]} /> : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Créneaux</Text>
      <View style={styles.slotList}>
        {slots.length === 0 ? (
          <Text style={styles.emptyText}>Ajoute un jour, choisis une heure, puis on créera le créneau.</Text>
        ) : (
          slots.map((slot) => (
            <SlotRow
              key={slot.id}
              onDelete={() => onSlotsChange(slots.filter((entry) => entry.id !== slot.id))}
              onEdit={() => openPicker(slot.dayOfWeek, slot)}
              slot={slot}
            />
          ))
        )}
      </View>

      {pickerVisible ? (
        <DateTimePicker
          display={Platform.OS === "ios" ? "spinner" : "default"}
          mode="time"
          minuteInterval={30}
          onChange={handlePickerChange}
          themeVariant={Platform.OS === "ios" ? "dark" : undefined}
          {...(Platform.OS === "ios" ? { textColor: "#F0F0F2" } : null)}
          value={pickerDate}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 0,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#6b6b7a",
    fontFamily: fonts.bodySemiBold,
    marginBottom: 6,
  },
  familyRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  familyButton: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1e1e24",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.07)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  familyDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  familyText: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontFamily: fonts.displayBold,
  },
  daysGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dayCol: {
    alignItems: "center",
    gap: 5,
  },
  dayLabel: {
    fontSize: 9,
    color: "#6b6b7a",
    fontFamily: fonts.bodySemiBold,
  },
  dayButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#1e1e24",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  dayInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  slotList: {
    gap: 7,
  },
  slotRow: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#16161a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  slotDay: {
    minWidth: 28,
    fontSize: 12,
    fontFamily: fonts.displayBold,
  },
  slotTime: {
    flex: 1,
    fontSize: 13,
    color: "#f0f0f2",
    fontFamily: fonts.bodyRegular,
  },
  slotType: {
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  slotTypeText: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: fonts.displayBold,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#6b6b7a",
    fontFamily: fonts.bodyRegular,
  },
});
