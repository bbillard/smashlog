import { StyleSheet, Text, View } from "react-native";

import { SESSION_COLORS, SESSION_COLORS_BG } from "@/src/constants/sessionColors";
import { SESSION_TYPE_LABELS } from "@/src/constants/sessionOptions";
import { fonts } from "@/src/theme/typography";
import { Session } from "@/src/types/session";
import { truncate } from "@/src/utils/format";

function ShareStars({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      {Array.from({ length: 5 }, (_, index) => (
        <Text
          key={index}
          style={[styles.star, index < rating ? styles.starOn : styles.starOff]}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

export function GenericShareCard({
  session,
  sessionNumber,
  username,
}: {
  session: Session;
  sessionNumber: number;
  username: string;
}) {
  const badgeTone = {
    backgroundColor: SESSION_COLORS_BG[session.type],
    color: SESSION_COLORS[session.type],
  };

  const shareUsername = username.trim().startsWith("@") ? username.trim() : `@${username.trim()}`;

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.top}>
          <View>
            <Text style={styles.sessionNumber}>{sessionNumber}</Text>
            <Text style={styles.sessionNumberLabel}>Séance</Text>
          </View>
          <View style={styles.right}>
            <View style={[styles.badge, { backgroundColor: badgeTone.backgroundColor }]}>
              <Text style={[styles.badgeText, { color: badgeTone.color }]}>
                {SESSION_TYPE_LABELS[session.type]}
              </Text>
            </View>
            <ShareStars rating={session.rating} />
          </View>
        </View>

        {session.title ? (
          <Text adjustsFontSizeToFit ellipsizeMode="tail" minimumFontScale={0.82} numberOfLines={2} style={styles.title}>
            {truncate(session.title, 120)}
          </Text>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.intentionLabel}>Prochaine séance</Text>
        <Text
          adjustsFontSizeToFit
          ellipsizeMode="tail"
          minimumFontScale={0.76}
          numberOfLines={4}
          style={styles.intentionText}
        >
          {truncate(session.nextIntention, 220)}
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
    backgroundColor: "#0D1F1A",
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
    marginBottom: 14,
  },
  content: {
    flexShrink: 1,
    minHeight: 0,
  },
  sessionNumber: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 52,
    lineHeight: 52,
    letterSpacing: -1,
    color: "#CEFF00",
    marginTop: 4,
  },
  sessionNumberLabel: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: "#CEFF00",
    marginTop: 2,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  right: {
    alignItems: "flex-end",
    gap: 6,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    lineHeight: 22,
    color: "#F0F0F2",
    marginBottom: 14,
    maxWidth: "88%",
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
  stars: {
    flexDirection: "row",
    gap: 4,
  },
  star: {
    fontSize: 20,
    lineHeight: 22,
  },
  starOn: {
    color: "#CEFF00",
  },
  starOff: {
    color: "rgba(107,107,122,0.55)",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginBottom: 12,
  },
  intentionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "rgba(206,255,0,0.5)",
    marginBottom: 7,
  },
  intentionText: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    lineHeight: 22,
    color: "#F0F0F2",
    borderLeftWidth: 2,
    borderLeftColor: "#CEFF00",
    paddingLeft: 9,
    marginBottom: 18,
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
