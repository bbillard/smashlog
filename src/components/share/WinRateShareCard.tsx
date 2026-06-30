import { StyleSheet, Text, View } from "react-native";

import { fonts } from "@/src/theme/typography";
import type { TrendDirection, WinRateSnapshot } from "@/src/services/sharingOrchestrator";

// ── Helpers ────────────────────────────────────────────────────────────────────

interface AccentColors {
  main: string;       // couleur pleine
  dim: string;        // version atténuée pour le "%"
  bg: string;         // fond du badge
}

function getAccentColors(winRatePercent: number): AccentColors {
  if (winRatePercent > 70) {
    return {
      main: '#00E5FF',
      dim: 'rgba(0,229,255,0.5)',
      bg: 'rgba(0,229,255,0.1)',
    };
  }
  if (winRatePercent < 30) {
    return {
      main: '#FF4D6D',
      dim: 'rgba(255,77,109,0.5)',
      bg: 'rgba(255,77,109,0.1)',
    };
  }
  return {
    main: '#CEFF00',
    dim: 'rgba(206,255,0,0.5)',
    bg: 'rgba(206,255,0,0.1)',
  };
}

interface TrendDisplay {
  label: string;
  color: string;
  backgroundColor: string;
}

function getTrendDisplay(
  trendPercent: number,
  trendDirection: Exclude<TrendDirection, null>,
): TrendDisplay {
  if (trendDirection === 'stable') {
    return {
      label: '= Stable',
      color: '#F0F0F2',
      backgroundColor: 'rgba(255,255,255,0.08)',
    };
  }

  const sign = trendDirection === 'up' ? '+' : '';
  const label = `${trendDirection === 'up' ? '▲' : '▼'} ${sign}${trendPercent}%`;

  if (trendDirection === 'up') {
    return {
      label,
      color: '#CEFF00',
      backgroundColor: 'rgba(206,255,0,0.1)',
    };
  }

  return {
    label,
    color: '#FF4D6D',
    backgroundColor: 'rgba(255,77,109,0.1)',
  };
}

// ── Composant ──────────────────────────────────────────────────────────────────

export function WinRateShareCard({
  snapshot,
  username,
}: {
  snapshot: WinRateSnapshot;
  username: string;
}) {
  const shareUsername = username.trim().startsWith("@") ? username.trim() : `@${username.trim()}`;
  const accent = getAccentColors(snapshot.winRatePercent);
  const hasTrend = snapshot.trendPercent !== null && snapshot.trendDirection !== null;
  const trend =
    hasTrend && snapshot.trendPercent !== null && snapshot.trendDirection !== null
      ? getTrendDisplay(snapshot.trendPercent, snapshot.trendDirection)
      : null;
  const matchWord = snapshot.matchCount > 1 ? 'matchs' : 'match';

  return (
    <View style={styles.card}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: accent.bg }]}>
          <Text style={[styles.badgeText, { color: accent.main }]}>Win rate</Text>
        </View>
        <Text style={styles.period}>30 derniers jours</Text>
      </View>

      {/* Chiffre principal */}
      <View style={styles.mainBlock}>
        <Text style={[styles.winRate, { color: accent.main }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {snapshot.winRatePercent}
          <Text style={[styles.winRateUnit, { color: accent.dim }]}>%</Text>
        </Text>
        <Text style={[styles.matchCount, { color: accent.dim }]}>
          sur {snapshot.matchCount} {matchWord}
        </Text>

        {/* Tendance — affichée uniquement si données suffisantes */}
        {trend !== null ? (
          <View style={[styles.trendBadge, { backgroundColor: trend.backgroundColor }]}>
            <Text style={[styles.trendText, { color: trend.color }]}>{trend.label}</Text>
            <Text style={[styles.trendSub, { color: trend.color }]}>
              {" vs 30j précédents"}
            </Text>
          </View>
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
    alignItems: "center",
  },
  badge: {
    backgroundColor: "rgba(206,255,0,0.1)",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: fonts.displayBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#CEFF00",
  },
  period: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: "rgba(255,255,255,0.25)",
  },

  // ── Chiffre principal ──────────────────────────────────────────────────────
  mainBlock: {
    gap: 8,
  },
  winRate: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 80,
    lineHeight: 80,
    letterSpacing: -3,
    color: "#CEFF00",
  },
  winRateUnit: {
    fontSize: 44,
    lineHeight: 44,
    letterSpacing: -1,
    color: "rgba(206,255,0,0.55)",
  },
  matchCount: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    marginTop: -4,
  },

  // ── Tendance ───────────────────────────────────────────────────────────────
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
    marginTop: 4,
  },
  trendText: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
  },
  trendSub: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    opacity: 0.8,
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
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
