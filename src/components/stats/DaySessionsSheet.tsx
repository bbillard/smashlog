import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SESSION_COLORS, SESSION_COLORS_BG } from "@/src/constants/sessionColors";
import { SESSION_TYPE_LABELS } from "@/src/constants/sessionOptions";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { Session } from "@/src/types/session";

/**
 * Liste intermédiaire des séances d'un jour, ouverte depuis le calendrier des
 * Stats quand ce jour compte plusieurs séances.
 */

function formatDayTitle(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function DaySessionsSheet({
  date,
  sessions,
  onClose,
  onSelect,
}: {
  /** null = fermé */
  date: Date | null;
  sessions: Session[];
  onClose: () => void;
  onSelect: (session: Session) => void;
}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={date !== null}>
      <Pressable accessibilityLabel="Fermer" onPress={onClose} style={styles.backdrop} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: 20 + insets.bottom },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{date ? formatDayTitle(date) : ""}</Text>
          <Pressable hitSlop={10} onPress={onClose}>
            <Ionicons color={theme.secondaryText} name="close" size={18} />
          </Pressable>
        </View>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          {sessions.length} séance{sessions.length > 1 ? "s" : ""} ce jour-là
        </Text>

        <View style={styles.list}>
          {sessions.map((session) => (
            <Pressable
              key={session.id}
              onPress={() => onSelect(session)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={[styles.badge, { backgroundColor: SESSION_COLORS_BG[session.type] }]}>
                <Text style={[styles.badgeText, { color: SESSION_COLORS[session.type] }]}>
                  {SESSION_TYPE_LABELS[session.type]}
                </Text>
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.time, { color: theme.text }]}>{formatTime(session.createdAt)}</Text>
                {session.title ? (
                  <Text numberOfLines={1} style={[styles.sessionTitle, { color: theme.secondaryText }]}>
                    {session.title}
                  </Text>
                ) : null}
              </View>
              {session.rating > 0 ? (
                <Text style={[styles.rating, { color: theme.accent }]}>
                  {"★".repeat(session.rating)}
                  <Text style={{ color: theme.secondaryText }}>{"☆".repeat(Math.max(0, 5 - session.rating))}</Text>
                </Text>
              ) : null}
              <Ionicons color={theme.secondaryText} name="chevron-forward" size={14} />
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 6,
  },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
    textTransform: "capitalize",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
    marginBottom: 8,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  time: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  sessionTitle: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },
  rating: {
    fontSize: 11,
    letterSpacing: 1,
  },
});
