import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/src/components/EmptyState";
import { LoadingView } from "@/src/components/LoadingView";
import { Screen } from "@/src/components/Screen";
import { SessionCard } from "@/src/components/SessionCard";
import { SESSION_TYPE_OPTIONS } from "@/src/constants/sessionOptions";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { getSessions } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { Session, SessionType } from "@/src/types/session";
import { formatShortDate } from "@/src/utils/format";

type DateFilterTarget = "from" | "to" | null;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export default function SessionsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedTypes, setSelectedTypes] = useState<SessionType[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [activePicker, setActivePicker] = useState<DateFilterTarget>(null);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    const nextSessions = await getSessions();
    setSessions(nextSessions);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const matchType = selectedTypes.length === 0 || selectedTypes.includes(session.type);

      const sessionDate = new Date(session.createdAt);
      const matchFrom = !dateFrom || sessionDate >= startOfDay(dateFrom);
      const matchTo = !dateTo || sessionDate <= endOfDay(dateTo);

      return matchType && matchFrom && matchTo;
    });
  }, [sessions, selectedTypes, dateFrom, dateTo]);

  function toggleType(type: SessionType) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type],
    );
  }

  function clearTypes() {
    setSelectedTypes([]);
  }

  function resetFilters() {
    setSelectedTypes([]);
    setDateFrom(null);
    setDateTo(null);
  }

  function handleDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    const target = activePicker;
    setActivePicker(null);

    if (event.type !== "set" || !selectedDate || !target) {
      return;
    }

    if (target === "from") {
      setDateFrom(selectedDate);
    } else {
      setDateTo(selectedDate);
    }
  }

  const isAllTypesSelected = selectedTypes.length === 0;
  const hasActiveFilters = selectedTypes.length > 0 || Boolean(dateFrom) || Boolean(dateTo);

  return (
    <Screen scrollable nativeHeader>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Séances</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          {filteredSessions.length} séance{filteredSessions.length > 1 ? "s" : ""}
          {hasActiveFilters ? ` sur ${sessions.length}` : " enregistrée" + (sessions.length > 1 ? "s" : "")}
        </Text>
      </View>

      {/* ─── Filtre par type ─── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <Pressable
          onPress={clearTypes}
          style={[
            styles.chip,
            {
              backgroundColor: isAllTypesSelected ? theme.primaryMuted : theme.surface,
              borderColor: isAllTypesSelected ? theme.primary : theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              { color: isAllTypesSelected ? theme.primary : theme.secondaryText },
            ]}
          >
            Tous
          </Text>
        </Pressable>

        {SESSION_TYPE_OPTIONS.map((option) => {
          const active = selectedTypes.includes(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => toggleType(option.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? `${option.accent}1A` : theme.surface,
                  borderColor: active ? option.accent : theme.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? option.accent : theme.secondaryText }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ─── Filtre par date ─── */}
      <View style={styles.dateFilterWrap}>
        <Text style={[styles.dateFilterLabel, { color: theme.secondaryText }]}>Période</Text>
        <View style={styles.dateFilterRow}>
          <Pressable
            onPress={() => setActivePicker("from")}
            style={[styles.dateTrigger, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Ionicons color={theme.primary} name="calendar-outline" size={16} />
            <Text
              style={[
                styles.dateTriggerText,
                { color: dateFrom ? theme.text : theme.secondaryText },
              ]}
              numberOfLines={1}
            >
              {dateFrom ? formatShortDate(dateFrom.toISOString()) : "Du"}
            </Text>
            {dateFrom ? (
              <Pressable hitSlop={8} onPress={() => setDateFrom(null)}>
                <Ionicons color={theme.secondaryText} name="close-circle" size={16} />
              </Pressable>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => setActivePicker("to")}
            style={[styles.dateTrigger, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Ionicons color={theme.primary} name="calendar-outline" size={16} />
            <Text
              style={[
                styles.dateTriggerText,
                { color: dateTo ? theme.text : theme.secondaryText },
              ]}
              numberOfLines={1}
            >
              {dateTo ? formatShortDate(dateTo.toISOString()) : "Au"}
            </Text>
            {dateTo ? (
              <Pressable hitSlop={8} onPress={() => setDateTo(null)}>
                <Ionicons color={theme.secondaryText} name="close-circle" size={16} />
              </Pressable>
            ) : null}
          </Pressable>
        </View>

        {Platform.OS === "web" && activePicker ? (
          <DateTimePicker
            mode="date"
            onChange={handleDateChange}
            value={(activePicker === "from" ? dateFrom : dateTo) ?? new Date()}
          />
        ) : null}
      </View>

      {hasActiveFilters ? (
        <Pressable onPress={resetFilters} style={styles.resetButton}>
          <Ionicons color={theme.secondaryText} name="refresh-outline" size={14} />
          <Text style={[styles.resetButtonText, { color: theme.secondaryText }]}>
            Réinitialiser les filtres
          </Text>
        </Pressable>
      ) : null}

      {Platform.OS !== "web" && activePicker ? (
        <DateTimePicker
          display={Platform.OS === "ios" ? "spinner" : "default"}
          mode="date"
          onChange={handleDateChange}
          themeVariant={Platform.OS === "ios" ? "dark" : undefined}
          {...(Platform.OS === "ios" ? { textColor: "#F0F0F2" } : null)}
          value={(activePicker === "from" ? dateFrom : dateTo) ?? new Date()}
        />
      ) : null}

      {isLoading ? <LoadingView /> : null}

      {!isLoading && sessions.length === 0 ? (
        <EmptyState
          title="Aucune séance enregistrée"
          description="Tes séances apparaîtront ici dès que tu commenceras à les logger."
        />
      ) : null}

      {!isLoading && sessions.length > 0 && filteredSessions.length === 0 ? (
        <EmptyState
          title="Aucune séance ne correspond"
          description="Essaie d'élargir la période ou de sélectionner d'autres types de séance."
        />
      ) : null}

      {!isLoading
        ? filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              onPress={() =>
                router.push({
                  pathname: "/session/[id]",
                  params: { id: session.id },
                })
              }
              session={session}
            />
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.displayExtraBold,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
  },
  chip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 12,
    fontFamily: fonts.displayBold,
  },
  dateFilterWrap: {
    gap: 8,
  },
  dateFilterLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  dateFilterRow: {
    flexDirection: "row",
    gap: 10,
  },
  dateTrigger: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateTriggerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  resetButtonText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
});
