import { StyleSheet, Text, View } from "react-native";

import { SESSION_COLORS } from "@/src/constants/sessionColors";
import { SESSION_TYPE_LABELS } from "@/src/constants/sessionOptions";
import { fonts } from "@/src/theme/typography";
import { Session } from "@/src/types/session";

const TYPE_DOT_COLORS = SESSION_COLORS;

function formatSessionDate(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

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

function TypeRow({ session }: { session: Session }) {
  const dotColor = TYPE_DOT_COLORS[session.type];
  const date = formatSessionDate(session.createdAt);

  return (
    <View style={styles.typeRow}>
      <View style={[styles.typeDot, { backgroundColor: dotColor }]} />
      <Text style={styles.typeLabel}>
        {SESSION_TYPE_LABELS[session.type]} · {date}
      </Text>
    </View>
  );
}

function CardFooter({ username }: { username: string }) {
  const shareUsername = username.trim().startsWith("@") ? username.trim() : `@${username.trim()}`;

  return (
    <View style={styles.footer}>
      <Text style={styles.logo}>
        Smash<Text style={styles.logoDim}>log</Text>
      </Text>
      <Text style={styles.username}>{shareUsername}</Text>
    </View>
  );
}

// ── Variante 1 — Première séance ─────────────────────────────────────────────

function FirstSessionCard({
  session,
  username,
}: {
  session: Session;
  username: string;
}) {
  return (
    <View style={styles.cardV1}>
      {/* Top : badge + étoiles */}
      <View style={styles.topRow}>
        <View style={styles.badgeSolid}>
          <Text style={styles.badgeSolidText}>Première séance</Text>
        </View>
        <ShareStars rating={session.rating} />
      </View>

      {/* Centre : grand numéro */}
      <View style={styles.v1Center}>
        <Text style={styles.v1Number}>1</Text>
        <Text style={styles.v1NumberLabel}>séance enregistrée</Text>
      </View>

      {/* Bas : type + footer */}
      <View>
        <TypeRow session={session} />
        <View style={styles.footerSpacer} />
        <CardFooter username={username} />
      </View>
    </View>
  );
}

// ── Variante 2 — Séances suivantes ───────────────────────────────────────────

function NthSessionCard({
  session,
  sessionNumber,
  username,
}: {
  session: Session;
  sessionNumber: number;
  username: string;
}) {
  return (
    <View style={styles.cardV2}>
      {/* Top : badge + étoiles */}
      <View style={styles.topRow}>
        <View style={styles.badgeOutline}>
          <Text style={styles.badgeOutlineText}>Séance enregistrée</Text>
        </View>
        <ShareStars rating={session.rating} />
      </View>

      {/* Numéro */}
      <View>
        <Text style={styles.v2Label}>Séance</Text>
        <Text style={styles.v2Number}>
          <Text style={styles.v2Hash}>#</Text>
          <Text style={styles.v2Digits}>{sessionNumber}</Text>
        </Text>
        <TypeRow session={session} />
      </View>

      {/* Footer */}
      <CardFooter username={username} />
    </View>
  );
}

// ── Export principal ──────────────────────────────────────────────────────────

export function FallbackShareCard({
  session,
  sessionNumber,
  username,
}: {
  session: Session;
  sessionNumber: number;
  username: string;
}) {
  if (sessionNumber === 1) {
    return <FirstSessionCard session={session} username={username} />;
  }

  return <NthSessionCard session={session} sessionNumber={sessionNumber} username={username} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Cards
  cardV1: {
    backgroundColor: "#0d0820",
    aspectRatio: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  cardV2: {
    backgroundColor: "#0a1628",
    aspectRatio: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    justifyContent: "space-between",
    overflow: "hidden",
  },

  // Top row
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Badges
  badgeSolid: {
    backgroundColor: "#CEFF00",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeSolidText: {
    fontFamily: fonts.displayBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#000000",
  },
  badgeOutline: {
    backgroundColor: "rgba(206,255,0,0.1)",
    borderWidth: 1,
    borderColor: "rgba(206,255,0,0.25)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeOutlineText: {
    fontFamily: fonts.displayBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#CEFF00",
  },

  // Stars
  stars: {
    flexDirection: "row",
    gap: 3,
  },
  star: {
    fontSize: 14,
    lineHeight: 15,
  },
  starOn: {
    color: "#CEFF00",
  },
  starOff: {
    color: "rgba(107,107,122,0.55)",
  },

  // V1 center
  v1Center: {
    alignItems: "center",
    justifyContent: "center",
  },
  v1Number: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 80,
    lineHeight: 80,
    letterSpacing: -3,
    color: "#CEFF00",
  },
  v1NumberLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.4,
    marginTop: 4,
  },

  // V2 number
  v2Label: {
    fontFamily: fonts.displayBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.3)",
    marginBottom: 2,
  },
  v2Number: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 58,
    lineHeight: 58,
    letterSpacing: -2,
    marginBottom: 8,
  },
  v2Hash: {
    color: "#FFFFFF",
  },
  v2Digits: {
    color: "#CEFF00",
  },

  // Type row
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 4,
  },
  typeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  typeLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    color: "#9999aa",
  },

  // Footer
  footerSpacer: {
    height: 12,
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
