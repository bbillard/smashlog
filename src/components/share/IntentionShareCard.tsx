import { StyleSheet, Text, View } from "react-native";

import { SESSION_TYPE_LABELS } from "@/src/constants/sessionOptions";
import { fonts } from "@/src/theme/typography";
import { Session } from "@/src/types/session";
import { truncate } from "@/src/utils/format";

function ShareStars({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      {Array.from({ length: 5 }, (_, index) => (
        <Text key={index} style={[styles.star, index < rating ? styles.starOn : styles.starOff]}>
          ★
        </Text>
      ))}
    </View>
  );
}

export function IntentionShareCard({
  session,
  sessionNumber,
  username,
}: {
  session: Session;
  sessionNumber: number;
  username: string;
}) {
  const badgeTone =
    session.type === "match"
      ? { backgroundColor: "rgba(255,77,109,0.12)", color: "#FF4D6D" }
      : session.type === "entrainement"
        ? { backgroundColor: "rgba(0,229,255,0.12)", color: "#00E5FF" }
        : { backgroundColor: "rgba(206,255,0,0.12)", color: "#CEFF00" };

  const shareUsername = username.trim().startsWith("@") ? username.trim() : `@${username.trim()}`;

  return (
    <View style={styles.card}>
      <View>
        <View style={styles.eyebrow}>
          <Text style={styles.sessionMeta}>Séance {sessionNumber}</Text>
          <View style={styles.dot} />
          <View style={[styles.badge, { backgroundColor: badgeTone.backgroundColor }]}>
            <Text style={[styles.badgeText, { color: badgeTone.color }]}>
              {SESSION_TYPE_LABELS[session.type]}
            </Text>
          </View>
          <View style={styles.starsWrap}>
            <ShareStars rating={session.rating} />
          </View>
        </View>
        <Text style={styles.quoteMark}>"</Text>
        <Text style={styles.intentionText}>
          {truncate(session.nextIntention, 82)}
          {"\n"}
          <Text style={styles.intentionMeta}>— Prochaine séance</Text>
        </Text>
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
    backgroundColor: "#100D1F",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    aspectRatio: 1,
    borderRadius: 24,
    justifyContent: "space-between",
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sessionMeta: {
    fontSize: 11,
    color: "#6B6B7A",
    letterSpacing: 0.5,
    fontFamily: fonts.bodySemiBold,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 3,
    backgroundColor: "#6B6B7A",
    opacity: 0.4,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: fonts.displayBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  starsWrap: {
    marginLeft: "auto",
  },
  stars: {
    flexDirection: "row",
    gap: 2,
  },
  star: {
    fontSize: 11,
    lineHeight: 12,
  },
  starOn: {
    color: "#CEFF00",
  },
  starOff: {
    color: "#6B6B7A",
  },
  quoteMark: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 48,
    lineHeight: 38,
    color: "rgba(255,255,255,0.06)",
    marginBottom: 6,
  },
  intentionText: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 17,
    lineHeight: 24,
    color: "#F0F0F2",
    letterSpacing: -0.3,
  },
  intentionMeta: {
    color: "rgba(255,255,255,0.35)",
    fontFamily: fonts.displayBold,
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
