import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getFamilyTokens } from "@/src/components/planning/PlanningEditor";
import { requestNotificationPermissions, rescheduleNotifications } from "@/src/services/notifications";
import {
  ScheduledSlot,
  createScheduledSlotId,
  getScheduledSlots,
  saveScheduledSlots,
} from "@/src/services/onboarding";
import { applyPlanningToNotificationSettings, saveNotificationSettings } from "@/src/services/settings";
import { getSessions, updateSession } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";

type SlotFamily = ScheduledSlot["family"];

const DAY_SHORT = ["L", "M", "M", "J", "V", "S", "D"] as const;
const DAY_FULL = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

const FAMILY_OPTIONS: { value: SlotFamily; label: string }[] = [
  { value: "badminton", label: "Badminton" },
  { value: "renforcement", label: "Renforcement" },
  { value: "cardio", label: "Cardio" },
  { value: "autre", label: "Autre" },
];

function sortSlots(slots: ScheduledSlot[]): ScheduledSlot[] {
  return [...slots].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    if (a.hour !== b.hour) return a.hour - b.hour;
    return a.minute - b.minute;
  });
}

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}h${String(minute).padStart(2, "0")}`;
}

function getFamilyLabel(family: SlotFamily) {
  if (family === "badminton") return "Badminton";
  if (family === "renforcement") return "Renforcement";
  if (family === "autre") return "Autre";
  return "Cardio";
}

function DayDots({ daySlots }: { daySlots: ScheduledSlot[] }) {
  const colors = daySlots.map((s) => getFamilyTokens(s.family).accent);
  if (colors.length === 0) return null;
  if (colors.length === 1) {
    return <View style={[dotStyles.large, { backgroundColor: colors[0] }]} />;
  }
  const firstRow = colors.slice(0, 3);
  const secondRow = colors.slice(3, 6);
  return (
    <View style={dotStyles.stack}>
      <View style={dotStyles.row}>
        {firstRow.map((c, i) => (
          <View key={`top-${i}`} style={[dotStyles.small, { backgroundColor: c }]} />
        ))}
      </View>
      {secondRow.length > 0 ? (
        <View style={dotStyles.row}>
          {secondRow.map((c, i) => (
            <View key={`bot-${i}`} style={[dotStyles.small, { backgroundColor: c }]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  stack: { alignItems: "center", justifyContent: "center", gap: 2 },
  row: { flexDirection: "row", gap: 2, justifyContent: "center" },
  large: { width: 8, height: 8, borderRadius: 999 },
  small: { width: 4, height: 4, borderRadius: 999 },
});

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const [slots, setSlots] = useState<ScheduledSlot[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saveErrorShown, setSaveErrorShown] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalFamily, setModalFamily] = useState<SlotFamily>("badminton");
  const [modalDay, setModalDay] = useState<ScheduledSlot["dayOfWeek"]>(0);
  const [pickerDate, setPickerDate] = useState(() => {
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    return d;
  });

  const loadSlots = useCallback(async () => {
    const nextSlots = await getScheduledSlots();
    setSlots(nextSlots);
    setHasLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSlots();
    }, [loadSlots]),
  );

  useEffect(() => {
    if (!hasLoaded) return;

    let cancelled = false;

    async function syncPlanning() {
      try {
        setSaveErrorShown(false);
        await saveScheduledSlots(slots);
        const syncedSettings = await applyPlanningToNotificationSettings(slots);
        const nextSettings =
          slots.length > 0
            ? { ...syncedSettings, fixedTimeEnabled: false, nextSessionReminderEnabled: true }
            : syncedSettings;
        await saveNotificationSettings(nextSettings);
        if (slots.length > 0) {
          try {
            await requestNotificationPermissions();
          } catch {
            // do not block save
          }
        }
        const sessions = await getSessions();
        const latestSession = sessions[0];
        const notificationState = await rescheduleNotifications(nextSettings);
        if (latestSession) {
          await updateSession(latestSession.id, notificationState);
        }
      } catch {
        if (!cancelled && !saveErrorShown) {
          setSaveErrorShown(true);
          Alert.alert("Erreur", "Impossible d'enregistrer le planning.");
        }
      }
    }

    syncPlanning();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoaded, slots]);

  function openModal() {
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    setPickerDate(d);
    setModalFamily("badminton");
    const raw = new Date().getDay(); // 0 = Sunday
    const mondayIndexed = raw === 0 ? 6 : raw - 1;
    setModalDay(mondayIndexed as ScheduledSlot["dayOfWeek"]);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
  }

  function handleAddSlot() {
    const newSlot: ScheduledSlot = {
      id: createScheduledSlotId(),
      dayOfWeek: modalDay,
      hour: pickerDate.getHours(),
      minute: pickerDate.getMinutes(),
      family: modalFamily,
    };
    setSlots((current) => sortSlots([...current, newSlot]));
    setModalVisible(false);
  }

  function handleDeleteSlot(id: string) {
    setSlots((current) => current.filter((s) => s.id !== id));
  }

  function handlePickerChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (selectedDate) {
      setPickerDate(selectedDate);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.title}>Planning</Text>
        <Text style={styles.subtitle}>
          Configure tes créneaux hebdomadaires. Ils servent de base au rappel avant la prochaine séance.
        </Text>

        {/* Legend chips */}
        <View style={styles.legendRow}>
          {FAMILY_OPTIONS.map(({ value, label }) => {
            const tokens = getFamilyTokens(value);
            return (
              <View
                key={value}
                style={[
                  styles.legendChip,
                  { backgroundColor: tokens.background, borderColor: tokens.accent },
                ]}
              >
                <View style={[styles.legendDot, { backgroundColor: tokens.accent }]} />
                <Text style={[styles.legendLabel, { color: tokens.accent }]}>{label}</Text>
              </View>
            );
          })}
        </View>

        {/* 7-day grid */}
        <View style={styles.weekGrid}>
          {DAY_SHORT.map((label, index) => {
            const dayOfWeek = index as ScheduledSlot["dayOfWeek"];
            const daySlots = slots.filter((s) => s.dayOfWeek === dayOfWeek);
            const hasSlots = daySlots.length > 0;
            const tokens = hasSlots ? getFamilyTokens(daySlots[0].family) : null;

            return (
              <View key={`${label}-${index}`} style={styles.dayCol}>
                <Text style={styles.dayLabel}>{label}</Text>
                <View
                  style={[
                    styles.dayCell,
                    hasSlots && tokens
                      ? { borderColor: tokens.accent, backgroundColor: tokens.background }
                      : null,
                  ]}
                >
                  {hasSlots ? (
                    <DayDots daySlots={daySlots} />
                  ) : (
                    <View style={styles.dayEmpty} />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Slot list */}
        {slots.length > 0 ? (
          <View style={styles.slotList}>
            {slots.map((slot) => {
              const tokens = getFamilyTokens(slot.family);
              return (
                <View key={slot.id} style={styles.slotCard}>
                  <View style={[styles.slotAccent, { backgroundColor: tokens.accent }]} />
                  <Text style={[styles.slotDay, { color: tokens.accent }]}>
                    {DAY_FULL[slot.dayOfWeek]}
                  </Text>
                  <Text style={styles.slotTime}>{formatTime(slot.hour, slot.minute)}</Text>
                  <View style={[styles.slotBadge, { backgroundColor: tokens.background }]}>
                    <Text style={[styles.slotBadgeText, { color: tokens.accent }]}>
                      {getFamilyLabel(slot.family)}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleDeleteSlot(slot.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Add button */}
        <Pressable onPress={openModal} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Ajouter un créneau</Text>
        </Pressable>
      </ScrollView>

      {/* Bottom sheet modal */}
      <Modal
        animationType="slide"
        onRequestClose={closeModal}
        presentationStyle="overFullScreen"
        transparent
        visible={modalVisible}
      >
        <View style={styles.modalContainer}>
          <Pressable onPress={closeModal} style={styles.modalBackdrop} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Title */}
            <Text style={styles.modalTitle}>Nouveau créneau</Text>

            {/* Family picker */}
            <Text style={styles.modalSectionLabel}>Type de séance</Text>
            <View style={styles.modalFamilyRow}>
              {FAMILY_OPTIONS.map(({ value, label }) => {
                const tokens = getFamilyTokens(value);
                const selected = modalFamily === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setModalFamily(value)}
                    style={[
                      styles.modalFamilyChip,
                      selected
                        ? { backgroundColor: tokens.background, borderColor: tokens.accent }
                        : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.modalFamilyDot,
                        { backgroundColor: selected ? tokens.accent : "#6b6b7a" },
                      ]}
                    />
                    <Text
                      style={[
                        styles.modalFamilyLabel,
                        { color: selected ? tokens.accent : "#6b6b7a" },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Day picker */}
            <Text style={styles.modalSectionLabel}>Jour</Text>
            <View style={styles.modalDayRow}>
              {DAY_SHORT.map((label, index) => {
                const day = index as ScheduledSlot["dayOfWeek"];
                const selected = modalDay === day;
                const tokens = getFamilyTokens(modalFamily);
                return (
                  <Pressable
                    key={`modal-day-${index}`}
                    onPress={() => setModalDay(day)}
                    style={[
                      styles.modalDayBtn,
                      selected
                        ? { backgroundColor: tokens.background, borderColor: tokens.accent }
                        : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalDayLabel,
                        { color: selected ? tokens.accent : "#8b8b98" },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Time picker */}
            <Text style={styles.modalSectionLabel}>Heure</Text>
            {Platform.OS !== "web" ? (
              <View style={styles.pickerWrapper}>
                <DateTimePicker
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minuteInterval={5}
                  mode="time"
                  onChange={handlePickerChange}
                  themeVariant="dark"
                  value={pickerDate}
                />
              </View>
            ) : null}

            {/* CTA */}
            <Pressable onPress={handleAddSlot} style={styles.ctaButton}>
              <Text style={styles.ctaText}>Ajouter</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0d0d0f",
  },
  scroll: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.displayExtraBold,
    color: "#f0f0f2",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.bodyRegular,
    color: "#6b6b7a",
    marginBottom: 20,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  legendLabel: {
    fontSize: 11,
    fontFamily: fonts.displayBold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  dayCol: {
    alignItems: "center",
    gap: 6,
  },
  dayLabel: {
    fontSize: 10,
    color: "#6b6b7a",
    fontFamily: fonts.bodySemiBold,
  },
  dayCell: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "#1e1e24",
    alignItems: "center",
    justifyContent: "center",
  },
  dayEmpty: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  slotList: {
    gap: 8,
    marginBottom: 12,
  },
  slotCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16161a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
    minHeight: 52,
    paddingRight: 8,
  },
  slotAccent: {
    width: 3,
    alignSelf: "stretch",
    marginRight: 12,
  },
  slotDay: {
    fontSize: 13,
    fontFamily: fonts.displayBold,
    minWidth: 36,
  },
  slotTime: {
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
    color: "#f0f0f2",
    flex: 1,
  },
  slotBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  slotBadgeText: {
    fontSize: 9,
    fontFamily: fonts.displayBold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: {
    color: "#6b6b7a",
    fontSize: 16,
    fontFamily: fonts.bodyRegular,
  },
  addButton: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: Platform.OS === "ios" ? 12 : 0,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#6b6b7a",
    fontSize: 14,
    fontFamily: fonts.displayBold,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  modalSheet: {
    backgroundColor: "#16161a",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: fonts.displayExtraBold,
    color: "#f0f0f2",
    marginBottom: 20,
  },
  modalSectionLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#6b6b7a",
    fontFamily: fonts.bodySemiBold,
    marginBottom: 8,
  },
  modalFamilyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  modalFamilyChip: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1e1e24",
    paddingHorizontal: 8,
  },
  modalFamilyDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  modalFamilyLabel: {
    fontSize: 11,
    fontFamily: fonts.displayBold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  modalDayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 5,
    marginBottom: 20,
  },
  modalDayBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1e1e24",
    alignItems: "center",
    justifyContent: "center",
  },
  modalDayLabel: {
    fontSize: 12,
    fontFamily: fonts.displayBold,
  },
  pickerWrapper: {
    marginBottom: 20,
    alignItems: "center",
  },
  ctaButton: {
    backgroundColor: "#CEFF00",
    borderRadius: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#0d0d0f",
    fontSize: 15,
    fontFamily: fonts.displayExtraBold,
  },
});
