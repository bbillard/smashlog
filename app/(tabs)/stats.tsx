import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppSidebar } from "@/src/components/AppSidebar";
import { EmptyState } from "@/src/components/EmptyState";
import { LoadingView } from "@/src/components/LoadingView";
import { ProfileAvatar } from "@/src/components/ProfileAvatar";
import { Screen } from "@/src/components/Screen";
import { SectionCard } from "@/src/components/SectionCard";
import { SESSION_TYPE_LABELS, SESSION_TYPE_OPTIONS } from "@/src/constants/sessionOptions";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useSidebarSwipe } from "@/src/hooks/useSidebarSwipe";
import { getProfile } from "@/src/services/profile";
import { getSessions } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { Profile } from "@/src/types/profile";
import { Session } from "@/src/types/session";
import { pickDominantType } from "@/src/utils/dominantType";
import { truncate } from "@/src/utils/format";

function StatBar({ label, value, total }: { label: string; value: number; total: number }) {
  const { theme } = useAppTheme();
  const width = total === 0 ? 0 : Math.max((value / total) * 100, value > 0 ? 10 : 0);

  return (
    <View style={styles.barGroup}>
      <View style={styles.barLabelRow}>
        <Text style={[styles.barLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.barLabel, { color: theme.secondaryText }]}>{value}</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: theme.surfaceAlt }]}>
        <View style={[styles.barFill, { width: `${width}%`, backgroundColor: theme.primary }]} />
      </View>
    </View>
  );
}

function toDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildMonthGrid(referenceDate: Date) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      isCurrentMonth: date.getMonth() === month,
    };
  });
}

export default function StatsScreen() {
  const { theme } = useAppTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profile, setProfile] = useState<Profile>({ username: "Joueur Badlog", photoUri: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const sidebarSwipe = useSidebarSwipe(() => setIsMenuOpen(true));

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    const [nextSessions, nextProfile] = await Promise.all([getSessions(), getProfile()]);
    setSessions(nextSessions);
    setProfile(nextProfile);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

  function goToPrevMonth() {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  const today = new Date();
  const isCurrentMonth =
    calendarDate.getMonth() === today.getMonth() &&
    calendarDate.getFullYear() === today.getFullYear();

  const averageRating =
    sessions.length === 0 ? 0 : sessions.reduce((sum, session) => sum + session.rating, 0) / sessions.length;
  const latestIntention = sessions[0]?.nextIntention;
  const calendarDays = buildMonthGrid(calendarDate);

  // Map dayKey → session types for that day (this month only), one entry per
  // session (duplicates preserved), ordered chronologically so the first
  // session of the day is first.
  const sessionTypesByDay = new Map<string, string[]>();
  sessions
    .map((session) => ({ date: new Date(session.createdAt), type: session.type }))
    .filter(
      ({ date }) =>
        date.getMonth() === calendarDate.getMonth() &&
        date.getFullYear() === calendarDate.getFullYear(),
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .forEach(({ date, type }) => {
      const key = toDayKey(date);
      if (!sessionTypesByDay.has(key)) sessionTypesByDay.set(key, []);
      sessionTypesByDay.get(key)!.push(type);
    });

  const SESSION_TYPE_ACCENT_MAP: Record<string, string> = Object.fromEntries(
    SESSION_TYPE_OPTIONS.map((o) => [o.value, o.accent]),
  );

  const todayKey = toDayKey(new Date());

  return (
    <Screen scrollable>
      <View style={styles.content} {...sidebarSwipe.panHandlers}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: theme.text }]}>Vue d'ensemble</Text>
          </View>
          <Pressable onPress={() => setIsMenuOpen(true)}>
            <ProfileAvatar uri={profile.photoUri} />
          </Pressable>
        </View>
        <Text style={[styles.description, { color: theme.secondaryText }]}>
          Un bilan simple pour repérer ta fréquence de pratique et la direction de ton travail.
        </Text>

        {isLoading ? <LoadingView /> : null}

        {!isLoading && sessions.length === 0 ? (
          <EmptyState
            title="Pas encore de statistiques"
            description="Les indicateurs apparaîtront dès que tu auras enregistré une première séance."
          />
        ) : null}

        {!isLoading && sessions.length > 0 ? (
          <>
            <SectionCard>
              <Text style={[styles.cardLabel, { color: theme.secondaryText }]}>Séances totales</Text>
              <Text style={[styles.metric, { color: theme.text }]}>{sessions.length}</Text>
            </SectionCard>

            <SectionCard>
              <Text style={[styles.cardLabel, { color: theme.secondaryText }]}>Note moyenne</Text>
              <Text style={[styles.metric, { color: theme.text }]}>{averageRating.toFixed(1)} / 5</Text>
            </SectionCard>

            <SectionCard>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Dernière intention</Text>
              <Text style={[styles.latestIntention, { color: theme.text }]}>{truncate(latestIntention ?? "", 160)}</Text>
            </SectionCard>

            <SectionCard>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Répartition par type</Text>
              {SESSION_TYPE_OPTIONS.map((option) => (
                <StatBar
                  key={option.value}
                  label={SESSION_TYPE_LABELS[option.value]}
                  total={sessions.length}
                  value={sessions.filter((session) => session.type === option.value).length}
                />
              ))}
            </SectionCard>

            <SectionCard>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Calendrier</Text>
              <View style={styles.calendarNav}>
                <Pressable onPress={goToPrevMonth} hitSlop={8}>
                  <Ionicons name="chevron-back" size={18} color={theme.text} />
                </Pressable>
                <Text style={[styles.calendarMonth, { color: theme.secondaryText }]}>
                  {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(calendarDate)}
                </Text>
                <Pressable onPress={goToNextMonth} hitSlop={8} disabled={isCurrentMonth}>
                  <Ionicons name="chevron-forward" size={18} color={isCurrentMonth ? theme.tertiaryText : theme.text} />
                </Pressable>
              </View>
              <View style={styles.calendarHeaderRow}>
                {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
                  <Text key={`${label}-${index}`} style={[styles.weekdayLabel, { color: theme.secondaryText }]}>
                    {label}
                  </Text>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {calendarDays.map(({ date, isCurrentMonth }) => {
                  const dayKey = toDayKey(date);
                  const dayTypes = sessionTypesByDay.get(dayKey) ?? [];
                  const hasSession = dayTypes.length > 0;
                  const dominantType = pickDominantType(dayTypes);
                  const primaryAccent = dominantType ? SESSION_TYPE_ACCENT_MAP[dominantType] : theme.primary;
                  const isToday = dayKey === todayKey;

                  return (
                    <View key={dayKey} style={styles.dayCell}>
                      <View
                        style={[
                          styles.dayCellInner,
                          {
                            backgroundColor: hasSession ? primaryAccent + "26" : "transparent",
                            borderColor: isToday ? theme.primary : theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNumber,
                            {
                              color: !isCurrentMonth
                                ? theme.secondaryText
                                : hasSession
                                  ? primaryAccent
                                  : theme.text,
                              opacity: isCurrentMonth ? 1 : 0.35,
                            },
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                        {hasSession ? (
                          <View style={styles.dotsRow}>
                            {dayTypes.map((type, index) => (
                              <View
                                key={`${type}-${index}`}
                                style={[styles.sessionDot, { backgroundColor: SESSION_TYPE_ACCENT_MAP[type] }]}
                              />
                            ))}
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
              <Text style={[styles.calendarLegend, { color: theme.tertiaryText }]}>
                La couleur de chaque jour correspond au type de séance enregistrée.
              </Text>
            </SectionCard>
          </>
        ) : null}
      </View>
      <AppSidebar onClose={() => setIsMenuOpen(false)} open={isMenuOpen} profile={profile} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.displayExtraBold,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
    fontFamily: fonts.bodyRegular,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
  },
  metric: {
    fontSize: 34,
    fontFamily: fonts.displayExtraBold,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
    marginBottom: 4,
  },
  latestIntention: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.bodyRegular,
  },
  barGroup: {
    gap: 8,
  },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  barLabel: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
  },
  barTrack: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
  },
  calendarNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarMonth: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
    textTransform: "capitalize",
    flex: 1,
    textAlign: "center",
  },
  calendarHeaderRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    textTransform: "uppercase",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.2857%",
    minHeight: 48,
    padding: 4,
  },
  dayCellInner: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dayNumber: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 2,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  sessionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  calendarLegend: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.bodyRegular,
  },
});
