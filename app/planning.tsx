import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SLOT_TYPE_CONFIG } from "@/src/components/planning/PlanningEditor";
import {
  cancelPlanningSlotNotification,
  reschedulePlanningNotifications,
  schedulePlanningSlotNotification,
} from "@/src/services/notifications";
import {
  ScheduledSlot,
  SlotType,
  createScheduledSlotId,
  getScheduledSlots,
  saveScheduledSlots,
} from "@/src/services/onboarding";
import { getNotificationSettings } from "@/src/services/settings";
import { getSessions } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";

// ─── constants ─────────────────────────────────────────────────────────────

const DAY_SHORT = ["L", "M", "M", "J", "V", "S", "D"] as const;
const DAY_FULL = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const SLOT_TYPES: SlotType[] = ["badminton", "renforcement", "cardio", "autre"];

const TYPE_SUBTITLES: Record<SlotType, string> = {
  badminton: "Match, entraînement, jeu libre",
  renforcement: "Muscu, gainage",
  cardio: "Shadow, course, vélo",
  autre: "Mobilité, récupération",
};

// ─── helpers ───────────────────────────────────────────────────────────────

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}h${String(minute).padStart(2, "0")}`;
}

// ─── sub-components ────────────────────────────────────────────────────────

function TypeLegend() {
  return (
    <View style={styles.legend}>
      {(["badminton", "renforcement", "cardio", "autre"] as SlotType[]).map((t) => {
        const cfg = SLOT_TYPE_CONFIG[t];
        return (
          <View
            key={t}
            style={[styles.legendChip, { backgroundColor: cfg.background, borderColor: cfg.accent }]}
          >
            <View style={[styles.legendDot, { backgroundColor: cfg.accent }]} />
            <Text style={[styles.legendLabel, { color: cfg.accent }]}>{cfg.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function DayGrid({
  slots,
  onDayPress,
}: {
  slots: ScheduledSlot[];
  onDayPress: (day: DayIndex) => void;
}) {
  // One dot per slot (preserves duplicates of the same type on the same day)
  const byDay = useMemo(() => {
    const map = new Map<number, SlotType[]>();
    for (const slot of slots) {
      const existing = map.get(slot.dayOfWeek) ?? [];
      existing.push(slot.type);
      map.set(slot.dayOfWeek, existing);
    }
    return map;
  }, [slots]);

  return (
    <View style={styles.daysGrid}>
      {DAY_SHORT.map((label, index) => {
        const day = index as DayIndex;
        const types = byDay.get(day) ?? [];
        const isEmpty = types.length === 0;

        // Tinted bg + colored border only when all slots share the same type
        const uniqueTypes = [...new Set(types)];
        const isMono = !isEmpty && uniqueTypes.length === 1;
        const monoCfg = isMono ? SLOT_TYPE_CONFIG[uniqueTypes[0]!] : null;

        return (
          <View key={`${label}-${index}`} style={styles.dayCol}>
            <Text style={styles.dayLbl}>{label}</Text>
            <Pressable
              onPress={() => onDayPress(day)}
              style={[
                styles.dayBtn,
                isEmpty
                  ? styles.dayBtnEmpty
                  : isMono
                    ? { backgroundColor: monoCfg!.background, borderColor: `${monoCfg!.accent}4D` }
                    : styles.dayBtnMulti,
              ]}
            >
              {isEmpty ? (
                <Text style={styles.dayPlus}>+</Text>
              ) : (
                <View style={styles.miniDots}>
                  {types.map((t, i) => (
                    <View
                      key={`${t}-${i}`}
                      style={[styles.miniDot, { backgroundColor: SLOT_TYPE_CONFIG[t].accent }]}
                    />
                  ))}
                </View>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function SlotRow({
  slot,
  onDelete,
}: {
  slot: ScheduledSlot;
  onDelete: () => void;
}) {
  const cfg = SLOT_TYPE_CONFIG[slot.type];
  return (
    <View style={styles.slotCard}>
      <Text style={[styles.slotDay, { color: cfg.accent }]}>{DAY_FULL[slot.dayOfWeek]}</Text>
      <Text style={styles.slotTime}>{formatTime(slot.hour, slot.minute)}</Text>
      <View style={[styles.slotBadge, { backgroundColor: cfg.background }]}>
        <Text style={[styles.slotBadgeText, { color: cfg.accent }]}>{cfg.label.toUpperCase()}</Text>
      </View>
      <Pressable onPress={onDelete} hitSlop={10} style={styles.slotDelete}>
        <Ionicons name="close" size={16} color="#2a2a2e" />
      </Pressable>
    </View>
  );
}

// ─── modal ─────────────────────────────────────────────────────────────────

function AddSlotModal({
  visible,
  initialDay,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  initialDay: DayIndex;
  onClose: () => void;
  onConfirm: (type: SlotType, day: DayIndex, hour: number, minute: number) => void;
}) {
  const [selectedType, setSelectedType] = useState<SlotType>("badminton");
  const [selectedDay, setSelectedDay] = useState<DayIndex>(initialDay);
  const [pickerDate, setPickerDate] = useState(() => {
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);

  // Sync initialDay each time the modal opens
  useEffect(() => {
    if (visible) {
      setSelectedDay(initialDay);
    }
  }, [visible, initialDay]);

  const typeColor = SLOT_TYPE_CONFIG[selectedType].accent;

  function handlePickerChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") setShowPicker(false);
    if (event.type === "dismissed" || !date) return;
    setPickerDate(date);
  }

  function handleConfirm() {
    onConfirm(selectedType, selectedDay, pickerDate.getHours(), pickerDate.getMinutes());
    // Reset state for next open
    setSelectedType("badminton");
    setPickerDate(new Date(new Date().setHours(19, 0, 0, 0)));
    setShowPicker(false);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.sheetHandle} />

        <Text style={styles.sheetTitle}>Nouveau créneau</Text>

        {/* Type selection */}
        <Text style={styles.sheetLabel}>TYPE DE SÉANCE</Text>
        <View style={styles.typeList}>
          {SLOT_TYPES.map((t) => {
            const cfg = SLOT_TYPE_CONFIG[t];
            const selected = selectedType === t;
            return (
              <Pressable
                key={t}
                onPress={() => setSelectedType(t)}
                style={[
                  styles.typeRow,
                  selected
                    ? { borderColor: cfg.accent, backgroundColor: cfg.background }
                    : null,
                ]}
              >
                <View style={[styles.typeDot, { backgroundColor: cfg.accent }]} />
                <View style={styles.typeTexts}>
                  <Text style={[styles.typeName, selected ? { color: cfg.accent } : null]}>
                    {cfg.label}
                  </Text>
                  <Text style={styles.typeSub}>{TYPE_SUBTITLES[t]}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Day selection */}
        <Text style={styles.sheetLabel}>JOUR</Text>
        <View style={styles.modalDaysGrid}>
          {DAY_SHORT.map((label, index) => {
            const day = index as DayIndex;
            const selected = selectedDay === day;
            return (
              <Pressable
                key={`modal-day-${index}`}
                onPress={() => setSelectedDay(day)}
                style={[
                  styles.modalDayBtn,
                  selected
                    ? { borderColor: typeColor, backgroundColor: `${typeColor}1A` }
                    : null,
                ]}
              >
                <Text
                  style={[
                    styles.modalDayText,
                    selected ? { color: typeColor } : null,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Time */}
        <Text style={styles.sheetLabel}>HEURE</Text>
        {Platform.OS === "ios" ? (
          <DateTimePicker
            display="spinner"
            mode="time"
            minuteInterval={5}
            onChange={handlePickerChange}
            themeVariant="dark"
            textColor="#f0f0f2"
            value={pickerDate}
            style={styles.iosPicker}
          />
        ) : (
          <>
            <Pressable style={styles.androidTimeBtn} onPress={() => setShowPicker(true)}>
              <Text style={styles.androidTimeText}>{formatTime(pickerDate.getHours(), pickerDate.getMinutes())}</Text>
            </Pressable>
            {showPicker ? (
              <DateTimePicker
                display="default"
                mode="time"
                minuteInterval={5}
                onChange={handlePickerChange}
                value={pickerDate}
              />
            ) : null}
          </>
        )}

        {/* CTA */}
        <Pressable style={styles.ctaBtn} onPress={handleConfirm}>
          <Text style={styles.ctaText}>Enregistrer le créneau</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ─── screen ────────────────────────────────────────────────────────────────

export default function PlanningScreen() {
  const [slots, setSlots] = useState<ScheduledSlot[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInitialDay, setModalInitialDay] = useState<DayIndex>(0);

  const loadSlots = useCallback(async () => {
    const nextSlots = await getScheduledSlots();
    setSlots(nextSlots);

    // Refresh all planning notifications with the latest intentions.
    // This covers slots created before the intention logic was introduced,
    // and keeps content up-to-date whenever the screen is opened.
    if (nextSlots.length > 0) {
      try {
        const [settings, sessions] = await Promise.all([getNotificationSettings(), getSessions()]);
        const refreshed = await reschedulePlanningNotifications(
          nextSlots,
          settings.nextSessionLeadMinutes,
          sessions,
        );
        // Persist updated notificationIds only if something actually changed
        const hasChanges = refreshed.some((s, i) => s.notificationId !== nextSlots[i]?.notificationId);
        if (hasChanges) {
          await saveScheduledSlots(refreshed);
          setSlots(refreshed);
        }
      } catch {
        // Non-blocking: notification refresh failure should not affect UI
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSlots();
    }, [loadSlots]),
  );

  function openModal(day: DayIndex = 0) {
    setModalInitialDay(day);
    setModalVisible(true);
  }

  async function handleAddSlot(type: SlotType, day: DayIndex, hour: number, minute: number) {
    setModalVisible(false);

    const newSlot: ScheduledSlot = {
      id: createScheduledSlotId(),
      type,
      dayOfWeek: day,
      hour,
      minute,
    };

    // Schedule weekly notification with the latest known intention for this type
    try {
      const [settings, sessions] = await Promise.all([getNotificationSettings(), getSessions()]);
      const notifId = await schedulePlanningSlotNotification(newSlot, settings.nextSessionLeadMinutes, sessions);
      if (notifId) newSlot.notificationId = notifId;
    } catch {
      // Do not block slot creation if notification scheduling fails
    }

    const sorted = [...slots, newSlot].sort(
      (a, b) => a.dayOfWeek - b.dayOfWeek || a.hour - b.hour || a.minute - b.minute,
    );

    setSlots(sorted);
    await saveScheduledSlots(sorted);
  }

  async function handleDeleteSlot(slotId: string) {
    const slot = slots.find((s) => s.id === slotId);

    if (slot?.notificationId) {
      try {
        await cancelPlanningSlotNotification(slot.notificationId);
      } catch {
        // Ignore cancellation errors
      }
    }

    const next = slots.filter((s) => s.id !== slotId);
    setSlots(next);
    await saveScheduledSlots(next);
  }

  return (
    <SafeAreaView edges={["right", "bottom", "left"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <Text style={styles.title}>Planning</Text>
        <Text style={styles.subtitle}>
          Configure ta semaine type. Chaque créneau génère un rappel avant ta prochaine séance.
        </Text>

        {/* Legend */}
        <Text style={styles.sectionLabel}>TYPE DE SÉANCE</Text>
        <TypeLegend />

        {/* 7-day grid */}
        <Text style={styles.sectionLabel}>SEMAINE TYPE</Text>
        <DayGrid slots={slots} onDayPress={openModal} />

        {/* Divider */}
        <View style={styles.divider} />

        {/* Slot list */}
        <Text style={styles.sectionLabel}>CRÉNEAUX</Text>
        <View style={styles.slotList}>
          {slots.length === 0 ? (
            <Text style={styles.emptyText}>
              Appuie sur un jour ou sur le bouton ci-dessous pour ajouter un créneau.
            </Text>
          ) : (
            slots.map((slot) => (
              <SlotRow key={slot.id} slot={slot} onDelete={() => handleDeleteSlot(slot.id)} />
            ))
          )}
        </View>

        {/* Add button */}
        <Pressable style={styles.addBtn} onPress={() => openModal()}>
          <Ionicons name="add" size={16} color="#6b6b7a" />
          <Text style={styles.addBtnText}>Ajouter un créneau</Text>
        </Pressable>
      </ScrollView>

      <AddSlotModal
        visible={modalVisible}
        initialDay={modalInitialDay}
        onClose={() => setModalVisible(false)}
        onConfirm={handleAddSlot}
      />
    </SafeAreaView>
  );
}

// ─── styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0d0d0f",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 0,
  },

  // Header
  title: {
    fontSize: 28,
    fontFamily: fonts.displayExtraBold,
    color: "#f0f0f2",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: "#6b6b7a",
    fontFamily: fonts.bodyRegular,
    lineHeight: 18,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: fonts.bodyMedium,
    color: "#6b6b7a",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  // Legend
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 20,
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
  },
  legendLabel: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },

  // Day grid
  daysGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  dayCol: {
    alignItems: "center",
    gap: 5,
  },
  dayLbl: {
    fontSize: 10,
    color: "#6b6b7a",
    fontFamily: fonts.bodyMedium,
    textTransform: "uppercase",
  },
  dayBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: "#16161a",
    borderColor: "#1e1e24",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 3,
  },
  dayBtnEmpty: {
    borderColor: "#1e1e24",
  },
  dayBtnMulti: {
    borderColor: "#2a2a2e",
  },
  dayPlus: {
    fontSize: 18,
    color: "#2a2a2e",
    fontFamily: fonts.bodyRegular,
    lineHeight: 22,
  },
  miniDots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  miniDot: {
    width: 5,
    height: 5,
    borderRadius: 99,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "#1e1e24",
    marginBottom: 16,
  },

  // Slot list
  slotList: {
    gap: 6,
    marginBottom: 8,
  },
  slotCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#16161a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e1e24",
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  slotDay: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
    width: 30,
    flexShrink: 0,
  },
  slotTime: {
    fontSize: 13,
    color: "#f0f0f2",
    fontFamily: fonts.bodyRegular,
    flex: 1,
  },
  slotBadge: {
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 3,
    flexShrink: 0,
  },
  slotBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bodyMedium,
    letterSpacing: 0.4,
  },
  slotDelete: {
    flexShrink: 0,
  },
  emptyText: {
    fontSize: 12,
    color: "#6b6b7a",
    fontFamily: fonts.bodyRegular,
    lineHeight: 18,
  },

  // Add button
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    // Note: borderStyle "dashed" on Android only renders on square corners.
    // We keep borderRadius for iOS and accept solid fallback on Android.
    borderRadius: Platform.OS === "ios" ? 10 : 0,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#2a2a2e",
    marginTop: 2,
  },
  addBtnText: {
    fontSize: 12,
    color: "#6b6b7a",
    fontFamily: fonts.bodyRegular,
  },

  // ── Modal / bottom sheet ──────────────────────────────────────────────

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(13,13,15,0.85)",
  },
  sheet: {
    backgroundColor: "#16161a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: "#2a2a2e",
    paddingHorizontal: 16,
    paddingBottom: 36,
    paddingTop: 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#2a2a2e",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: fonts.displayExtraBold,
    color: "#f0f0f2",
    marginBottom: 18,
  },
  sheetLabel: {
    fontSize: 10,
    fontFamily: fonts.bodyMedium,
    color: "#6b6b7a",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  // Type list in modal
  typeList: {
    gap: 5,
    marginBottom: 18,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2a2e",
    backgroundColor: "#1a1a1e",
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    flexShrink: 0,
  },
  typeTexts: {
    flex: 1,
    gap: 1,
  },
  typeName: {
    fontSize: 13,
    color: "#f0f0f2",
    fontFamily: fonts.bodyMedium,
  },
  typeSub: {
    fontSize: 11,
    color: "#6b6b7a",
    fontFamily: fonts.bodyRegular,
  },

  // Day grid in modal
  modalDaysGrid: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 18,
  },
  modalDayBtn: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a2e",
    backgroundColor: "#1a1a1e",
    alignItems: "center",
    justifyContent: "center",
  },
  modalDayText: {
    fontSize: 11,
    color: "#6b6b7a",
    fontFamily: fonts.bodyRegular,
  },

  // Time picker
  iosPicker: {
    marginBottom: 8,
  },
  androidTimeBtn: {
    backgroundColor: "#1a1a1e",
    borderWidth: 1,
    borderColor: "#2a2a2e",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 13,
    alignItems: "center",
    marginBottom: 22,
  },
  androidTimeText: {
    fontSize: 24,
    color: "#f0f0f2",
    fontFamily: fonts.bodyRegular,
  },

  // CTA
  ctaBtn: {
    width: "100%",
    backgroundColor: "#CEFF00",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: "#0d0d0f",
    letterSpacing: 0.1,
  },
});
