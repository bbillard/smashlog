import { StyleSheet, Text, View } from "react-native";

import { SESSION_TYPE_LABELS } from "@/src/constants/sessionOptions";
import { fonts } from "@/src/theme/typography";
import { Match, Session } from "@/src/types/session";

// ── Types internes ─────────────────────────────────────────────────────────────

interface WinRate {
  victories: number;
  defeats: number;
  total: number;
}

interface ModeDistribution {
  simple: number;
  double: number;
  mixte: number;
}

interface TightestSet {
  high: number;
  low: number;
  margin: number;
}

// ── Helpers de calcul ──────────────────────────────────────────────────────────

function computeWinRate(matches: Match[]): WinRate {
  const victories = matches.filter((m) => m.resultat === "victoire").length;
  const defeats = matches.filter((m) => m.resultat === "defaite").length;
  return { victories, defeats, total: matches.length };
}

function computeModeDistribution(matches: Match[]): ModeDistribution {
  return {
    simple: matches.filter((m) => m.mode === "simple").length,
    double: matches.filter((m) => m.mode === "double").length,
    mixte: matches.filter((m) => m.mode === "mixte").length,
  };
}

function hasMultipleModes(dist: ModeDistribution): boolean {
  return [dist.simple, dist.double, dist.mixte].filter((n) => n > 0).length > 1;
}

function formatModeDistribution(dist: ModeDistribution): string {
  const parts: string[] = [];
  if (dist.simple > 0) parts.push(`${dist.simple} simple${dist.simple > 1 ? "s" : ""}`);
  if (dist.double > 0) parts.push(`${dist.double} double${dist.double > 1 ? "s" : ""}`);
  if (dist.mixte > 0) parts.push(`${dist.mixte} mixte${dist.mixte > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

/**
 * Trouve le set avec la marge la plus serrée parmi tous les matches.
 * En cas d'égalité de marge, préfère le total de points le plus élevé.
 * Ignore les sets non renseignés (0-0).
 */
function findTightestSet(matches: Match[]): TightestSet | null {
  let best: TightestSet | null = null;

  for (const match of matches) {
    for (const set of match.sets) {
      if (set.scoreNous === 0 && set.scoreEux === 0) continue;

      const margin = Math.abs(set.scoreNous - set.scoreEux);
      const total = set.scoreNous + set.scoreEux;
      const high = Math.max(set.scoreNous, set.scoreEux);
      const low = Math.min(set.scoreNous, set.scoreEux);

      if (
        best === null ||
        margin < best.margin ||
        (margin === best.margin && total > best.high + best.low)
      ) {
        best = { high, low, margin };
      }
    }
  }

  return best;
}

function formatSessionDate(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

// ── Composant ──────────────────────────────────────────────────────────────────

export function SessionSummaryShareCard({
  session,
  username,
}: {
  session: Session;
  username: string;
}) {
  const matches = session.matches ?? [];
  const shareUsername = username.trim().startsWith("@") ? username.trim() : `@${username.trim()}`;
  const date = formatSessionDate(session.createdAt);
  const typeLabel = SESSION_TYPE_LABELS[session.type];

  const winRate = computeWinRate(matches);
  const modeDist = computeModeDistribution(matches);
  const showModes = hasMultipleModes(modeDist);
  const tightestSet = findTightestSet(matches);
  const showSet = tightestSet !== null;
  const showDetails = showModes || showSet;

  const matchWord = winRate.total > 1 ? "matchs joués" : "match joué";

  return (
    <View style={styles.card}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Bilan séance</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{typeLabel}</Text>
        </View>
      </View>

      {/* Win rate — élément principal */}
      <View style={styles.winRateBlock}>
        <View style={styles.winRateRow}>
          <Text style={styles.winRateNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {winRate.victories}
          </Text>
          <Text style={styles.victories}>
            {winRate.victories > 1 ? "victoires" : "victoire"}
          </Text>
        </View>
        <View style={styles.winRateRow}>
          <Text style={styles.winRateNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {winRate.defeats}
          </Text>
          <Text style={styles.defeats}>
            {winRate.defeats > 1 ? "défaites" : "défaite"}
          </Text>
        </View>
        <Text style={styles.matchCount}>
          {winRate.total} {matchWord}
        </Text>
      </View>

      {/* Détails conditionnels */}
      {showDetails ? (
        <View style={styles.details}>
          <View style={styles.divider} />
          {showModes ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Modes</Text>
              <Text style={styles.detailValue}>{formatModeDistribution(modeDist)}</Text>
            </View>
          ) : null}
          {showSet ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Set serré</Text>
              <Text style={styles.detailValue}>
                {tightestSet.high}–{tightestSet.low}
              </Text>
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
    fontFamily: fonts.displayBold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase",
  },
  date: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: "rgba(255,255,255,0.25)",
    marginTop: 3,
  },
  badge: {
    backgroundColor: "rgba(206,255,0,0.1)",
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

  // ── Win rate ────────────────────────────────────────────────────────────────
  winRateBlock: {
    marginTop: 8,
    gap: 4,
  },
  winRateRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  winRateNumber: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 52,
    lineHeight: 54,
    letterSpacing: -2,
    color: "#F0F0F2",
  },
  victories: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 20,
    lineHeight: 22,
    color: "#CEFF00",
  },
  defeats: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 20,
    lineHeight: 22,
    color: "#FF4D6D",
  },
  matchCount: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    marginTop: 4,
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
