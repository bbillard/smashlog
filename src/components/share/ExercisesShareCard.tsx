import { StyleSheet, Text, View } from "react-native";

import { SESSION_TYPE_LABELS } from "@/src/constants/sessionOptions";
import { fonts } from "@/src/theme/typography";
import { Exercise } from "@/src/types/index";
import { Session } from "@/src/types/session";

const MAX_DISPLAYED = 5;

function formatSessionDate(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function ExerciseRow({ exercise, isLast }: { exercise: Exercise; isLast: boolean }) {
  const durationLabel = exercise.durationMinutes != null
    ? `${exercise.durationMinutes} min`
    : null;

  return (
    <View style={[styles.exerciseRow, isLast ? styles.exerciseRowLast : null]}>
      <View style={styles.exerciseDot} />
      <Text style={styles.exerciseName} numberOfLines={1}>
        {exercise.name}
      </Text>
      {durationLabel != null ? (
        <Text style={styles.exerciseDuration}>{durationLabel}</Text>
      ) : null}
    </View>
  );
}

export function ExercisesShareCard({
  session,
  exercises,
  username,
}: {
  session: Session;
  exercises: Exercise[];
  username: string;
}) {
  const shareUsername = username.trim().startsWith("@")
    ? username.trim()
    : `@${username.trim()}`;

  const displayed = exercises.slice(0, MAX_DISPLAYED);
  const overflow = exercises.length - displayed.length;
  const date = formatSessionDate(session.createdAt);
  const typeLabel = SESSION_TYPE_LABELS[session.type];

  return (
    <View style={styles.card}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Ma séance</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{typeLabel}</Text>
        </View>
      </View>

      {/* Séparateur */}
      <View style={styles.divider} />

      {/* Liste des exercices */}
      <View style={styles.exerciseList}>
        {displayed.map((ex, index) => (
          <ExerciseRow
            key={ex.id}
            exercise={ex}
            isLast={index === displayed.length - 1 && overflow === 0}
          />
        ))}
        {overflow > 0 ? (
          <Text style={styles.overflow}>+{overflow} autre{overflow > 1 ? "s" : ""}</Text>
        ) : null}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.logo}>
          Smash<Text style={styles.logoDim}>log</Text>
        </Text>
        <Text style={styles.username}>{shareUsername}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0d0d0f",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    aspectRatio: 1,
    borderRadius: 24,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flexShrink: 1,
    paddingRight: 10,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: "#F0F0F2",
  },
  date: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    marginTop: 3,
  },
  badge: {
    backgroundColor: "rgba(206,255,0,0.12)",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexShrink: 0,
  },
  badgeText: {
    fontFamily: fonts.displayBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#CEFF00",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginVertical: 14,
  },
  exerciseList: {
    flex: 1,
    gap: 10,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  exerciseRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  exerciseDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#CEFF00",
    flexShrink: 0,
  },
  exerciseName: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: "#F0F0F2",
    flex: 1,
  },
  exerciseDuration: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: "rgba(206,255,0,0.5)",
    flexShrink: 0,
  },
  overflow: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    paddingLeft: 15,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  logo: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 12,
    color: "#CEFF00",
  },
  logoDim: {
    color: "rgba(255,255,255,0.35)",
  },
  username: {
    fontFamily: fonts.bodyRegular,
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
  },
});
