import { StyleSheet, Text, View } from "react-native";

import { SESSION_COLORS } from "@/src/constants/sessionColors";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { Session } from "@/src/types/session";
import { groupSessionsByDay, toDayKey } from "@/src/utils/sessionCalendar";
import { addDays, getWeekDays, getWeekStart } from "@/src/utils/week";

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

interface WeekViewProps {
  sessions: Session[];
  /** Defaults to now — exposed for testing / previewing other weeks. */
  referenceDate?: Date;
}

/**
 * Current-week strip (Mon–Sun): one cell per day, with a mini colored dot
 * per session recorded that day (colors from SESSION_COLORS, the same
 * source of truth used by the Stats calendar). Today's cell is highlighted.
 */
export function WeekView({ sessions, referenceDate = new Date() }: WeekViewProps) {
  const { theme } = useAppTheme();
  const weekStart = getWeekStart(referenceDate);
  const weekDays = getWeekDays(weekStart);
  const sessionTypesByDay = groupSessionsByDay(sessions, { from: weekStart, to: addDays(weekStart, 7) });
  const todayKey = toDayKey(referenceDate);

  return (
    <View style={styles.row}>
      {weekDays.map((date, index) => {
        const dayKey = toDayKey(date);
        const dayTypes = sessionTypesByDay.get(dayKey) ?? [];
        const isToday = dayKey === todayKey;

        return (
          <View key={dayKey} style={styles.cell}>
            <Text style={[styles.weekdayLabel, { color: theme.secondaryText }]}>{WEEKDAY_LABELS[index]}</Text>
            <View
              style={[
                styles.cellInner,
                {
                  backgroundColor: theme.surface,
                  borderColor: isToday ? theme.primary : theme.surfaceAlt,
                  borderWidth: isToday ? 2 : 1,
                },
              ]}
            >
              {dayTypes.length > 0 ? (
                <View style={styles.dotsRow}>
                  {dayTypes.map((type, dotIndex) => (
                    <View key={`${type}-${dotIndex}`} style={[styles.dot, { backgroundColor: SESSION_COLORS[type] }]} />
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  weekdayLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    textTransform: "uppercase",
  },
  cellInner: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 2,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
