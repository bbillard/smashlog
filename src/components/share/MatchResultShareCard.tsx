import { StyleSheet, Text, View } from "react-native";

import { fonts } from "@/src/theme/typography";
import { Match, Session } from "@/src/types/session";

// ── Helpers ────────────────────────────────────────────────────────────────────

interface AccentColors {
  main: string;
  bg: string;
  border: string;
}

const VICTORY_ACCENT: AccentColors = {
  main: "#00E5FF",
  bg: "rgba(0,229,255,0.1)",
  border: "rgba(0,229,255,0.35)",
};

const DEFEAT_ACCENT: AccentColors = {
  main: "#FF4D6D",
  bg: "rgba(255,77,109,0.1)",
  border: "rgba(255,77,109,0.35)",
};

const MODE_LABELS: Record<Match["mode"], string> = {
  simple: "Simple",
  double: "Double",
  mixte: "Mixte",
};

function formatSessionDate(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Formate le détail des scores de chaque set joué (ex. "21-18 · 18-21 · 21-19").
 * Ignore les sets non renseignés (0-0). Retourne null si aucun set n'a de score.
 */
function formatSetScores(match: Match): string | null {
  const playedSets = match.sets.filter((set) => !(set.scoreNous === 0 && set.scoreEux === 0));
  if (playedSets.length === 0) return null;

  return playedSets.map((set) => `${set.scoreNous}-${set.scoreEux}`).join(" · ");
}

// ── Composant ──────────────────────────────────────────────────────────────────

export function MatchResultShareCard({
  session,
  match,
  username,
}: {
  session: Session;
  match: Match;
  username: string;
}) {
  const shareUsername = username.trim().startsWith("@") ? username.trim() : `@${username.trim()}`;
  const date = formatSessionDate(session.createdAt);

  const isVictory = match.resultat === "victoire";
  const accent = isVictory ? VICTORY_ACCENT : DEFEAT_ACCENT;
  const resultLabel = isVictory ? "Victoire" : "Défaite";
  const modeLabel = MODE_LABELS[match.mode];
  const scoreDetail = formatSetScores(match);

  return (
    <View style={styles.card}>
      {/* En-tête */}
      <View style={[styles.badge, { backgroundColor: accent.bg, borderColor: accent.border }]}>
        <View style={[styles.badgeDot, { backgroundColor: accent.main }]} />
        <Text style={[styles.badgeText, { color: accent.main }]}>
          Match · {resultLabel}
        </Text>
      </View>

      {/* Résultat — élément principal */}
      <View style={styles.resultBlock}>
        <Text
          style={[styles.resultLabel, { color: accent.main }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {resultLabel}
        </Text>
        <Text style={styles.date}>{date}</Text>
      </View>

      {/* Détails conditionnels */}
      {modeLabel || scoreDetail ? (
        <View style={styles.details}>
          <View style={styles.divider} />
          {modeLabel ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mode</Text>
              <Text style={styles.detailValue}>{modeLabel}</Text>
            </View>
          ) : null}
          {scoreDetail ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Score</Text>
              <Text style={[styles.detailValue, { color: accent.main }]}>{scoreDetail}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

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

// ── Styles ─────────────────────────────────────────────────────────────────────

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

  // ── Badge ──────────────────────────────────────────────────────────────────
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  // ── Résultat ────────────────────────────────────────────────────────────────
  resultBlock: {
    marginTop: 8,
  },
  resultLabel: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 64,
    lineHeight: 64,
    letterSpacing: -2,
  },
  date: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    marginTop: 8,
  },

  // ── Détails ─────────────────────────────────────────────────────────────────
  details: {
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase",
  },
  detailValue: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
    color: "#F0F0F2",
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
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
