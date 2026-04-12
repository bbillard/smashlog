import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { fonts } from "@/src/theme/typography";
import { Session } from "@/src/types/session";

function getTrend(currentRating: number, average: number) {
  const delta = currentRating - average;
  const stableThreshold = 0.35;

  if (delta > stableThreshold) {
    return {
      label: "↑ En hausse",
      backgroundColor: "rgba(206,255,0,0.1)",
      color: "#CEFF00",
    };
  }

  if (delta < -stableThreshold) {
    return {
      label: "↓ En baisse",
      backgroundColor: "rgba(255,77,109,0.12)",
      color: "#FF4D6D",
    };
  }

  return {
    label: "→ Stable",
    backgroundColor: "rgba(255,255,255,0.08)",
    color: "#F0F0F2",
  };
}

function AverageStars({ average }: { average: number }) {
  const rounded = Math.round(average * 2) / 2;
  const fullStars = Math.floor(rounded);
  const hasHalf = rounded - fullStars >= 0.5;

  return (
    <View style={styles.avgStars}>
      {Array.from({ length: 5 }, (_, index) => {
        if (index < fullStars) {
          return <Ionicons key={index} color="#CEFF00" name="star" size={12} />;
        }

        if (index === fullStars && hasHalf) {
          return <Ionicons key={index} color="#CEFF00" name="star-half" size={12} />;
        }

        return <Ionicons key={index} color="#6B6B7A" name="star-outline" size={12} />;
      })}
    </View>
  );
}

export function ProgressShareCard({
  sessions,
  sessionNumber,
  username,
}: {
  sessions: Session[];
  sessionNumber: number;
  username: string;
}) {
  const lastSevenSessions = sessions.slice(0, 7).reverse();
  const ratings = lastSevenSessions.map((session) => session.rating);
  const average = ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
  const currentRating = lastSevenSessions[lastSevenSessions.length - 1]?.rating ?? average;
  const trend = getTrend(currentRating, average);
  const shareUsername = username.trim().startsWith("@") ? username.trim() : `@${username.trim()}`;
  const firstSessionNumber = Math.max(sessionNumber - lastSevenSessions.length + 1, 1);
  const averageLabel = `Moyenne ${lastSevenSessions.length} séance${lastSevenSessions.length > 1 ? "s" : ""}`;

  return (
    <View style={styles.card}>
      <View>
        <View style={styles.top}>
          <Text style={styles.title}>Ma progression</Text>
          <Text style={styles.sessionMeta}>Séance {sessionNumber}</Text>
        </View>

        <View style={styles.chart}>
          {lastSevenSessions.map((session, index) => {
            const isCurrent = index === lastSevenSessions.length - 1;
            const heightPercent = Math.max((session.rating / 5) * 88, 8);

            return (
              <View key={session.id} style={styles.barWrap}>
                <View
                  style={[
                    styles.bar,
                    { height: `${heightPercent}%` },
                    isCurrent ? styles.barToday : null,
                  ]}
                />
                <Text style={[styles.barLabel, isCurrent ? styles.barLabelToday : null]}>
                  {isCurrent ? "Auj." : `S${firstSessionNumber + index}`}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.averageRow}>
          <Text style={styles.averageLabel}>{averageLabel}</Text>
          <AverageStars average={average} />
          <View style={[styles.trendBadge, { backgroundColor: trend.backgroundColor }]}>
            <Text style={[styles.trendText, { color: trend.color }]}>{trend.label}</Text>
          </View>
        </View>
      </View>

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
    backgroundColor: "#0F0F1A",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    aspectRatio: 1,
    borderRadius: 24,
    justifyContent: "space-between",
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
    color: "#6B6B7A",
    letterSpacing: 0.65,
  },
  sessionMeta: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 5,
    height: 132,
    marginBottom: 8,
  },
  barWrap: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },
  bar: {
    width: "100%",
    minHeight: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  barToday: {
    backgroundColor: "#CEFF00",
  },
  barLabel: {
    fontFamily: fonts.bodyRegular,
    fontSize: 9,
    color: "#6B6B7A",
    opacity: 0.5,
    textAlign: "center",
  },
  barLabelToday: {
    color: "#CEFF00",
    opacity: 1,
    fontFamily: fonts.bodySemiBold,
  },
  averageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  averageLabel: {
    flexShrink: 1,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: "#6B6B7A",
  },
  avgStars: {
    flexDirection: "row",
    gap: 3,
  },
  trendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  trendText: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
