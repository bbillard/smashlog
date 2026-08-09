import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { PanResponder, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SESSION_COLORS, SESSION_COLORS_BG } from "@/src/constants/sessionColors";
import { ScheduledSlot, createScheduledSlotId } from "@/src/services/onboarding";
import { palette } from "@/src/theme/colors";
import { fonts } from "@/src/theme/typography";

type SlotFamily = ScheduledSlot["family"];
type InlineEditor = { slotId: string; mode: "day" | "family" } | null;

const DAY_SHORT_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_FULL_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}h${String(minute).padStart(2, "0")}`;
}

function sortSlots(slots: ScheduledSlot[]) {
  return [...slots].sort((left, right) => {
    if (left.dayOfWeek !== right.dayOfWeek) {
      return left.dayOfWeek - right.dayOfWeek;
    }

    if (left.hour !== right.hour) {
      return left.hour - right.hour;
    }

    return left.minute - right.minute;
  });
}

function getDaySlots(slots: ScheduledSlot[], dayOfWeek: ScheduledSlot["dayOfWeek"]) {
  return slots.filter((slot) => slot.dayOfWeek === dayOfWeek);
}

// Note : "badminton" regroupe les séances match / entraînement / jeu libre
// dans la semaine type (pas de distinction dans le planning). Il reprend la
// couleur "entrainement" (lime) de la source de vérité SESSION_COLORS.
export function getFamilyTokens(family: SlotFamily) {
  if (family === "badminton") {
    return {
      accent: SESSION_COLORS.entrainement,
      background: SESSION_COLORS_BG.entrainement,
      pillBackground: SESSION_COLORS_BG.entrainement,
    };
  }

  if (family === "renforcement") {
    return {
      accent: SESSION_COLORS.renforcement,
      background: SESSION_COLORS_BG.renforcement,
      pillBackground: SESSION_COLORS_BG.renforcement,
    };
  }

  if (family === "autre") {
    return {
      accent: SESSION_COLORS.autre,
      background: SESSION_COLORS_BG.autre,
      pillBackground: SESSION_COLORS_BG.autre,
    };
  }

  return {
    accent: SESSION_COLORS.cardio,
    background: SESSION_COLORS_BG.cardio,
    pillBackground: SESSION_COLORS_BG.cardio,
  };
}

function getFamilyLabel(family: SlotFamily) {
  if (family === "badminton") {
    return "Badminton";
  }

  if (family === "renforcement") {
    return "Renfo";
  }

  if (family === "autre") {
    return "Autre";
  }

  return "Cardio";
}

function getDayVisuals(daySlots: ScheduledSlot[]) {
  if (daySlots.length === 0) {
    return {
      borderColor: "rgba(255,255,255,0.07)",
      backgroundColor: "#1e1e24",
      dots: [] as string[],
    };
  }

  const counts = daySlots.reduce(
    (accumulator, slot) => {
      accumulator[slot.family] += 1;
      return accumulator;
    },
    { badminton: 0, renforcement: 0, cardio: 0, autre: 0 } as Record<SlotFamily, number>,
  );
  const maxCount = Math.max(counts.badminton, counts.renforcement, counts.cardio, counts.autre);
  const leadingFamilies = (Object.keys(counts) as SlotFamily[]).filter(
    (family) => counts[family] === maxCount,
  );
  const primaryFamily: SlotFamily =
    leadingFamilies.length === 1
      ? leadingFamilies[0]
      : (daySlots[0]?.family ?? "badminton");
  const tokens = getFamilyTokens(primaryFamily);

  return {
    borderColor: tokens.accent,
    backgroundColor: tokens.background,
    dots: daySlots.map((slot) => getFamilyTokens(slot.family).accent),
  };
}

function DayDots({ colors }: { colors: string[] }) {
  if (colors.length === 1) {
    return <View style={[styles.dayInner, { backgroundColor: colors[0] }]} />;
  }

  const firstRow = colors.slice(0, 3);
  const secondRow = colors.slice(3, 6);

  return (
    <View style={styles.dayDotsStack}>
      <View style={styles.dayDotsRow}>
        {firstRow.map((color, index) => (
          <View key={`top-${color}-${index}`} style={[styles.dayDotSmall, { backgroundColor: color }]} />
        ))}
      </View>
      {secondRow.length > 0 ? (
        <View style={styles.dayDotsRow}>
          {secondRow.map((color, index) => (
            <View key={`bottom-${color}-${index}`} style={[styles.dayDotSmall, { backgroundColor: color }]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SlotRow({
  slot,
  inlineEditor,
  onDelete,
  onOpenTime,
  onToggleDayEditor,
  onToggleFamilyEditor,
  onSelectDay,
  onSelectFamily,
}: {
  slot: ScheduledSlot;
  inlineEditor: InlineEditor;
  onDelete: () => void;
  onOpenTime: () => void;
  onToggleDayEditor: () => void;
  onToggleFamilyEditor: () => void;
  onSelectDay: (dayOfWeek: ScheduledSlot["dayOfWeek"]) => void;
  onSelectFamily: (family: SlotFamily) => void;
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
  const isDayEditorOpen = inlineEditor?.slotId === slot.id && inlineEditor.mode === "day";
  const isFamilyEditorOpen = inlineEditor?.slotId === slot.id && inlineEditor.mode === "family";

  return (
    <View {...swipe.panHandlers} style={styles.slotCard}>
      <View style={styles.slotRow}>
        <Pressable onPress={onToggleDayEditor} style={styles.slotFieldButton}>
          <Text style={[styles.slotDay, { color: tokens.accent }]}>{DAY_FULL_LABELS[slot.dayOfWeek]}</Text>
        </Pressable>

        <Pressable onPress={onOpenTime} style={[styles.slotFieldButton, styles.slotTimeButton]}>
          <Text style={styles.slotTime}>{formatTime(slot.hour, slot.minute)}</Text>
        </Pressable>

        <View style={styles.slotActions}>
          <Pressable
            onPress={onToggleFamilyEditor}
            style={[styles.slotType, { backgroundColor: tokens.pillBackground }]}
          >
            <Text style={[styles.slotTypeText, { color: tokens.accent }]}>
              {getFamilyLabel(slot.family)}
            </Text>
          </Pressable>

          <Pressable onPress={onDelete} style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>×</Text>
          </Pressable>
        </View>
      </View>

      {isDayEditorOpen ? (
        <View style={styles.inlineEditor}>
          <Text style={styles.inlineEditorLabel}>Jour</Text>
          <View style={styles.inlineEditorGrid}>
            {DAY_FULL_LABELS.map((label, index) => {
              const selected = slot.dayOfWeek === index;
              return (
                <Pressable
                  key={`${slot.id}-day-${label}`}
                  onPress={() => onSelectDay(index as ScheduledSlot["dayOfWeek"])}
                  style={[
                    styles.inlineOption,
                    selected ? { backgroundColor: "rgba(206,255,0,0.12)", borderColor: "#CEFF00" } : null,
                  ]}
                >
                  <Text style={[styles.inlineOptionText, selected ? styles.inlineOptionTextSelected : null]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {isFamilyEditorOpen ? (
        <View style={styles.inlineEditor}>
          <Text style={styles.inlineEditorLabel}>Type</Text>
          <View style={styles.inlineEditorFamilyRow}>
            {([
              { value: "badminton" as const, label: "Badminton" },
              { value: "renforcement" as const, label: "Renfo" },
              { value: "cardio" as const, label: "Cardio" },
              { value: "autre" as const, label: "Autre" },
            ]).map(({ value, label }) => {
              const familyTokens = getFamilyTokens(value);
              const selected = slot.family === value;
              return (
                <Pressable
                  key={`${slot.id}-family-${value}`}
                  onPress={() => onSelectFamily(value)}
                  style={[
                    styles.inlineFamilyOption,
                    selected
                      ? { backgroundColor: familyTokens.background, borderColor: familyTokens.accent }
                      : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.inlineFamilyOptionText,
                      { color: selected ? familyTokens.accent : palette.textDim },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function PlanningEditor({
  slots,
  onSlotsChange,
}: {
  slots: ScheduledSlot[];
  onSlotsChange: (slots: ScheduledSlot[]) => void;
}) {
  const insets = useSafeAreaInsets();
  const [family, setFamily] = useState<SlotFamily>("badminton");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingFamily, setEditingFamily] = useState<SlotFamily>("badminton");
  const [inlineEditor, setInlineEditor] = useState<InlineEditor>(null);
  const [pickerDate, setPickerDate] = useState(() => {
    const date = new Date();
    date.setHours(19, 0, 0, 0);
    return date;
  });
  const [webHourInput, setWebHourInput] = useState("19");
  const [webMinuteInput, setWebMinuteInput] = useState("00");

  const slotCountsByDay = useMemo(() => {
    const map = new Map<number, number>();
    for (const slot of slots) {
      map.set(slot.dayOfWeek, (map.get(slot.dayOfWeek) ?? 0) + 1);
    }
    return map;
  }, [slots]);

  function updateSlot(slotId: string, updates: Partial<ScheduledSlot>) {
    onSlotsChange(
      sortSlots(slots.map((slot) => (slot.id === slotId ? { ...slot, ...updates } : slot))),
    );
  }

  function openPicker(dayOfWeek: number, slot?: ScheduledSlot) {
    const nextDate = new Date();
    nextDate.setHours(slot?.hour ?? 19, slot?.minute ?? 0, 0, 0);
    setPickerDate(nextDate);
    setWebHourInput(String(nextDate.getHours()).padStart(2, "0"));
    setWebMinuteInput(String(nextDate.getMinutes()).padStart(2, "0"));
    setEditingDay(dayOfWeek);
    setEditingSlotId(slot?.id ?? null);
    setEditingFamily(slot?.family ?? family);
    setPickerVisible(true);
    setInlineEditor(null);
  }

  function closePicker() {
    setPickerVisible(false);
    setEditingDay(null);
    setEditingSlotId(null);
    setEditingFamily(family);
  }

  function upsertSlot(dayOfWeek: number, date: Date, forcedId?: string, forcedFamily?: SlotFamily) {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const nextId = forcedId ?? editingSlotId ?? createScheduledSlotId();
    const nextSlot: ScheduledSlot = {
      id: nextId,
      dayOfWeek: dayOfWeek as ScheduledSlot["dayOfWeek"],
      hour,
      minute,
      family: forcedFamily ?? editingFamily ?? family,
    };

    onSlotsChange(sortSlots([...slots.filter((slot) => slot.id !== nextId), nextSlot]));
  }

  function handlePickerChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === "dismissed" || editingDay === null || !selectedDate) {
      if (Platform.OS === "android") {
        closePicker();
      }
      return;
    }

    setPickerDate(selectedDate);
    if (Platform.OS === "android") {
      upsertSlot(editingDay, selectedDate);
      closePicker();
    }
  }

  function handleConfirmPicker() {
    if (editingDay === null) {
      return;
    }

    upsertSlot(editingDay, pickerDate);
    closePicker();
  }

  function handleConfirmWebTime() {
    if (editingDay === null) {
      return;
    }

    const nextDate = new Date(pickerDate);
    const hour = Math.min(Math.max(Number.parseInt(webHourInput, 10) || 0, 0), 23);
    const minute = Math.min(Math.max(Number.parseInt(webMinuteInput, 10) || 0, 0), 59);
    nextDate.setHours(hour, minute, 0, 0);
    upsertSlot(editingDay, nextDate);
    closePicker();
  }

  function toggleInlineEditor(slotId: string, mode: InlineEditor extends null ? never : "day" | "family") {
    setInlineEditor((current) => {
      if (current?.slotId === slotId && current.mode === mode) {
        return null;
      }
      return { slotId, mode };
    });
  }

  return (
    <View style={styles.root}>
      <Text style={styles.sectionLabel}>Type de séance</Text>
      <View style={styles.familyRow}>
        {([
          { value: "badminton" as const, label: "Badminton" },
          { value: "renforcement" as const, label: "Renfo" },
          { value: "cardio" as const, label: "Cardio" },
          { value: "autre" as const, label: "Autre" },
        ]).map(({ value, label }) => {
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
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Jour</Text>
      <View style={styles.daysGrid}>
        {DAY_SHORT_LABELS.map((label, index) => {
          const dayOfWeek = index as ScheduledSlot["dayOfWeek"];
          const slotCount = slotCountsByDay.get(dayOfWeek) ?? 0;
          const daySlots = getDaySlots(slots, dayOfWeek);
          const visuals = getDayVisuals(daySlots);

          return (
            <View key={`${label}-${index}`} style={styles.dayCol}>
              <Text style={styles.dayLabel}>{label}</Text>
              <Pressable
                onPress={() => openPicker(dayOfWeek)}
                style={[
                  styles.dayButton,
                  {
                    backgroundColor: visuals.backgroundColor,
                    borderColor: visuals.borderColor,
                  },
                ]}
              >
                {slotCount > 0 ? (
                  <DayDots colors={visuals.dots} />
                ) : (
                  <Text style={styles.dayPlus}>+</Text>
                )}
                {slotCount > 0 ? <Text style={styles.dayAddHint}>+</Text> : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      {pickerVisible && Platform.OS === "web" ? (
        <View style={styles.pickerCard}>
          <View style={styles.inlineEditor}>
            <Text style={styles.inlineEditorLabel}>Heure du créneau</Text>
            <View style={styles.webTimeRow}>
              <TextInput
                keyboardType="number-pad"
                maxLength={2}
                onChangeText={setWebHourInput}
                style={styles.webTimeInput}
                value={webHourInput}
              />
              <Text style={styles.webTimeSeparator}>:</Text>
              <TextInput
                keyboardType="number-pad"
                maxLength={2}
                onChangeText={setWebMinuteInput}
                style={styles.webTimeInput}
                value={webMinuteInput}
              />
            </View>
          </View>
          <View style={styles.pickerActions}>
            <Pressable onPress={closePicker} style={styles.pickerSecondaryAction}>
              <Text style={styles.pickerSecondaryText}>Annuler</Text>
            </Pressable>
            <Pressable onPress={handleConfirmWebTime} style={styles.pickerPrimaryAction}>
              <Text style={styles.pickerPrimaryText}>Valider</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {pickerVisible && Platform.OS !== "web" ? (
        <View style={Platform.OS === "ios" ? styles.pickerCard : null}>
          <DateTimePicker
            display={Platform.OS === "ios" ? "spinner" : "default"}
            mode="time"
            onChange={handlePickerChange}
            themeVariant={Platform.OS === "ios" ? "dark" : undefined}
            value={pickerDate}
          />
          {Platform.OS === "ios" ? (
            <View style={[styles.pickerActions, { paddingBottom: 10 + Math.max(0, insets.bottom - 4) }]}>
              <Pressable onPress={closePicker} style={styles.pickerSecondaryAction}>
                <Text style={styles.pickerSecondaryText}>Annuler</Text>
              </Pressable>
              <Pressable onPress={handleConfirmPicker} style={styles.pickerPrimaryAction}>
                <Text style={styles.pickerPrimaryText}>Valider</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Créneaux</Text>
      <View style={styles.slotList}>
        {slots.length === 0 ? (
          <Text style={styles.emptyText}>Choisis un type, tape un jour, puis règle l'heure du créneau.</Text>
        ) : (
          slots.map((slot) => (
            <SlotRow
              key={slot.id}
              inlineEditor={inlineEditor}
              onDelete={() => {
                if (inlineEditor?.slotId === slot.id) {
                  setInlineEditor(null);
                }
                onSlotsChange(slots.filter((entry) => entry.id !== slot.id));
              }}
              onOpenTime={() => openPicker(slot.dayOfWeek, slot)}
              onSelectDay={(dayOfWeek) => {
                updateSlot(slot.id, { dayOfWeek });
                setInlineEditor(null);
              }}
              onSelectFamily={(family) => {
                updateSlot(slot.id, { family });
                setInlineEditor(null);
              }}
              onToggleDayEditor={() => toggleInlineEditor(slot.id, "day")}
              onToggleFamilyEditor={() => toggleInlineEditor(slot.id, "family")}
              slot={slot}
            />
          ))
        )}
      </View>
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
    marginBottom: 8,
  },
  familyButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: "#1e1e24",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.07)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  familyDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  familyText: {
    flexShrink: 1,
    fontSize: 8,
    letterSpacing: 0.2,
    fontFamily: fonts.displayBold,
    textAlign: "center",
  },
  daysGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
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
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  dayDotsStack: {
    minWidth: 18,
    minHeight: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayDotSmall: {
    width: 4,
    height: 4,
    borderRadius: 999,
  },
  dayPlus: {
    fontSize: 14,
    lineHeight: 16,
    color: "#6b6b7a",
    fontFamily: fonts.displayBold,
  },
  dayAddHint: {
    position: "absolute",
    right: 4,
    bottom: 1,
    fontSize: 10,
    lineHeight: 10,
    color: "#6b6b7a",
    fontFamily: fonts.displayBold,
  },
  slotList: {
    gap: 7,
  },
  slotCard: {
    borderRadius: 10,
    backgroundColor: "#16161a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
  },
  slotRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  slotFieldButton: {
    justifyContent: "center",
  },
  slotTimeButton: {
    flex: 1,
  },
  slotDay: {
    minWidth: 28,
    fontSize: 12,
    fontFamily: fonts.displayBold,
  },
  slotTime: {
    fontSize: 13,
    color: "#f0f0f2",
    fontFamily: fonts.bodyRegular,
  },
  slotType: {
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  slotActions: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  slotTypeText: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: fonts.displayBold,
  },
  deleteButton: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: palette.textDim,
    fontSize: 18,
    lineHeight: 18,
    fontFamily: fonts.bodyRegular,
  },
  inlineEditor: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  inlineEditorLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#6b6b7a",
    fontFamily: fonts.bodySemiBold,
  },
  inlineEditorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  inlineOption: {
    minWidth: 40,
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e1e24",
    paddingHorizontal: 8,
  },
  inlineOptionText: {
    color: "#f0f0f2",
    fontSize: 12,
    fontFamily: fonts.displayBold,
  },
  inlineOptionTextSelected: {
    color: "#CEFF00",
  },
  inlineEditorFamilyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inlineFamilyOption: {
    minWidth: 96,
    flexGrow: 1,
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1e1e24",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  inlineFamilyOptionText: {
    fontSize: 11,
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
  pickerCard: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: "#16161a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
  },
  pickerActions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  webTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  webTimeInput: {
    width: 64,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    backgroundColor: "#1e1e24",
    color: "#f0f0f2",
    textAlign: "center",
    fontSize: 18,
    fontFamily: fonts.displayBold,
  },
  webTimeSeparator: {
    color: palette.textDim,
    fontSize: 18,
    fontFamily: fonts.displayBold,
  },
  pickerSecondaryAction: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: "#1e1e24",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerPrimaryAction: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: "#CEFF00",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerSecondaryText: {
    color: "#f0f0f2",
    fontSize: 13,
    fontFamily: fonts.displayBold,
  },
  pickerPrimaryText: {
    color: "#0d0d0f",
    fontSize: 13,
    fontFamily: fonts.displayBold,
  },
});
