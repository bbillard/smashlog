import { Pressable, StyleSheet, Text, View } from "react-native";

import { SESSION_TYPE_LABELS } from "@/src/constants/sessionOptions";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { Session } from "@/src/types/session";
import { formatShortDate, truncate } from "@/src/utils/format";

import { SectionCard } from "./SectionCard";

interface SessionCardProps {
  session: Session;
  onPress: () => void;
}

export function SessionCard({ session, onPress }: SessionCardProps) {
  const { theme } = useAppTheme();
  const badgeStyle =
    session.type === "match"
      ? { backgroundColor: "rgba(255,77,109,0.15)", color: theme.accent2 }
      : session.type === "entrainement"
        ? { backgroundColor: "rgba(0,229,255,0.12)", color: theme.accent3 }
        : { backgroundColor: "rgba(206,255,0,0.12)", color: theme.primary };

  return (
    <Pressable onPress={onPress}>
      <SectionCard>
        <View style={styles.row}>
          <View style={[styles.badge, { backgroundColor: badgeStyle.backgroundColor }]}>
            <Text style={[styles.badgeText, { color: badgeStyle.color }]}>{SESSION_TYPE_LABELS[session.type]}</Text>
          </View>
          <Text style={[styles.date, { color: theme.secondaryText }]}>{formatShortDate(session.createdAt)}</Text>
        </View>
        {session.title ? (
          <Text style={[styles.title, { color: theme.text }]}>{truncate(session.title, 60)}</Text>
        ) : null}
        <Text style={[styles.rating, { color: theme.accent }]}>{Array.from({ length: 5 }, (_, index) => (index < session.rating ? "★" : "☆")).join(" ")}</Text>
        <Text style={[styles.intention, { color: theme.tertiaryText, borderLeftColor: theme.primary }]}>
          {truncate(session.nextIntention, 90)}
        </Text>
      </SectionCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
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
  date: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
  },
  title: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: fonts.displayBold,
  },
  rating: {
    fontSize: 12,
    letterSpacing: 1.5,
  },
  intention: {
    fontSize: 13,
    lineHeight: 20,
    borderLeftWidth: 2,
    paddingLeft: 9,
    fontFamily: fonts.bodyRegular,
  },
});
