import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SectionCard } from "@/src/components/SectionCard";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { Session } from "@/src/types/session";
import {
  computeResultCounts,
  formatResultCounts,
  formatWinRate,
  MATCH_MODE_LABELS,
  MATCH_RESULT_COLORS,
  winRateColor,
} from "@/src/utils/matchResult";
import {
  collectDatedMatches,
  computeModeBreakdown,
  computeEvolution,
  Evolution,
  StatsPeriod,
} from "@/src/utils/matchStats";

const MODES = ["simple", "double", "mixte"] as const;
const CHART_HEIGHT = 96;


function formatPointLabel(date: Date, granularity: Evolution["granularity"]): string {
  return new Intl.DateTimeFormat(
    "fr-FR",
    granularity === "week" ? { day: "numeric", month: "short" } : { month: "short", year: "numeric" },
  ).format(date);
}

/** Libellé de la fenêtre du graphe, selon la période sélectionnée. */
const EVOLUTION_WINDOW_LABELS: Record<StatsPeriod, string> = {
  month: "ce mois",
  "3months": "3 derniers mois",
  all: "12 derniers mois",
};

/**
 * Section « Mes matchs » de l'écran Stats : chiffres clés, win rate par mode et
 * évolution du win rate. Les nuls sont exclus des taux.
 * `sessions` est déjà filtré sur la période sélectionnée ; le graphe s'adapte à
 * la période (par semaine pour Ce mois / 3 mois, par mois pour Tout).
 * Non rendue tant qu'aucun match n'est saisi sur la période.
 */
export function MatchesStatsSection({
  sessions,
  period,
}: {
  sessions: Session[];
  period: StatsPeriod;
}) {
  const { theme } = useAppTheme();
  const router = useRouter();

  const { counts, byMode, evolution, evolutionCounts } = useMemo(() => {
    const entries = collectDatedMatches(sessions);
    const evo = computeEvolution(entries, period);
    return {
      counts: computeResultCounts(entries.map((e) => e.match)),
      byMode: computeModeBreakdown(entries),
      evolution: evo,
      // Bilan agrégé sur la fenêtre du graphe (12 mois pour « Tout »)
      evolutionCounts: computeResultCounts(
        entries.filter((e) => e.date >= evo.points[0].start).map((e) => e.match),
      ),
    };
  }, [sessions, period]);

  if (counts.total === 0) return null;

  return (
    <SectionCard>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Mes matchs
        </Text>
        <Pressable
          hitSlop={8}
          onPress={() => router.push({ pathname: "/matches", params: { from: "stats" } })}
          style={styles.seeAll}
        >
          <Text style={[styles.seeAllText, { color: theme.accent3 }]}>
            Tout voir
          </Text>
          <Ionicons color={theme.accent3} name="chevron-forward" size={13} />
        </Pressable>
      </View>

      {/* ── Chiffres clés ─────────────────────────────────────────────── */}
      <View style={styles.keyRow}>
        <View style={styles.keyMain}>
          <Text style={[styles.metric, { color: winRateColor(counts.winRate) }]}>
            {formatWinRate(counts.winRate)}
          </Text>
          <Text style={[styles.caption, { color: theme.secondaryText }]}>
            Win rate · {counts.decisive} match{counts.decisive > 1 ? "s" : ""}{" "}
            comptabilisé{counts.decisive > 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.keySide}>
          <Text style={[styles.totalValue, { color: theme.text }]}>
            {counts.total}
          </Text>
          <Text style={[styles.caption, { color: theme.secondaryText }]}>
            joué{counts.total > 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <View style={styles.boxRow}>
        {(
          [
            ["Victoires", counts.wins, MATCH_RESULT_COLORS.victoire],
            ["Défaites", counts.losses, MATCH_RESULT_COLORS.defaite],
            ["Nuls", counts.draws, MATCH_RESULT_COLORS.nul],
          ] as const
        ).map(([label, value, color]) => (
          <View
            key={label}
            style={[
              styles.box,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.boxValue, { color }]}>{value}</Text>
            <Text style={[styles.boxLabel, { color: theme.secondaryText }]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Par mode ──────────────────────────────────────────────────── */}
      <Text style={[styles.subTitle, { color: theme.secondaryText }]}>
        Par mode
      </Text>
      <View style={styles.boxRow}>
        {MODES.map((mode) => {
          const c = byMode[mode];
          return (
            <View
              key={mode}
              style={[
                styles.box,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.boxLabel, { color: theme.secondaryText }]}>
                {MATCH_MODE_LABELS[mode]}
              </Text>
              <Text style={[styles.boxValue, { color: winRateColor(c.winRate) }]}>
                {formatWinRate(c.winRate)}
              </Text>
              <Text style={[styles.boxSub, { color: theme.tertiaryText }]}>
                {c.total === 0 ? "Aucun match" : formatResultCounts(c)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* ── Évolution ─────────────────────────────────────────────────── */}
      <Text style={[styles.subTitle, { color: theme.secondaryText }]}>
        Évolution · {EVOLUTION_WINDOW_LABELS[period]}
        {evolutionCounts.winRate !== null ? (
          <>
            {" · "}
            <Text
              style={[
                styles.subTitleRate,
                { color: winRateColor(evolutionCounts.winRate) },
              ]}
            >
              {formatWinRate(evolutionCounts.winRate)}
            </Text>
          </>
        ) : null}
      </Text>
      {evolutionCounts.decisive === 0 ? (
        <Text style={[styles.caption, { color: theme.secondaryText }]}>
          Aucun match comptabilisé sur cette période.
        </Text>
      ) : (
        <View>
          <View style={styles.chartRow}>
            {/* Graduation du repère 50 %, alignée sur le trait central */}
            <View style={[styles.yAxis, { height: CHART_HEIGHT }]}>
              <Text
                style={[
                  styles.yAxisLabel,
                  { top: CHART_HEIGHT / 2 - 7, color: theme.tertiaryText },
                ]}
              >
                50%
              </Text>
            </View>
            <View style={[styles.chart, { height: CHART_HEIGHT }]}>
              {/* Repère 50 % */}
              <View
                style={[
                  styles.midLine,
                  { top: CHART_HEIGHT / 2, borderColor: theme.border },
                ]}
              />
              {evolution.points.map((point) => {
                const rate = point.counts.winRate;
                return (
                  <View
                    key={point.start.toISOString()}
                    style={styles.barSlot}
                  >
                    {rate === null ? (
                      <View
                        style={[
                          styles.emptyTick,
                          { backgroundColor: theme.border },
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.bar,
                          {
                            // 4 px minimum pour qu'une semaine à 0 % reste visible
                            height: Math.max(4, (rate / 100) * CHART_HEIGHT),
                            backgroundColor: winRateColor(rate),
                          },
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
          <View style={styles.axisRow}>
            <Text style={[styles.axisLabel, { color: theme.tertiaryText }]}>
              {formatPointLabel(evolution.points[0].start, evolution.granularity)}
            </Text>
            <Text style={[styles.axisLabel, { color: theme.tertiaryText }]}>
              {evolution.granularity === "week" ? "Cette semaine" : "Ce mois"}
            </Text>
          </View>
          <Text style={[styles.legend, { color: theme.tertiaryText }]}>
            Win rate par {evolution.granularity === "week" ? "semaine" : "mois"} — nuls exclus.
          </Text>
        </View>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
    marginBottom: 4,
  },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
  keyRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  keyMain: {
    gap: 2,
  },
  keySide: {
    alignItems: "flex-end",
    gap: 2,
  },
  metric: {
    fontSize: 34,
    fontFamily: fonts.displayExtraBold,
  },
  totalValue: {
    fontSize: 22,
    fontFamily: fonts.displayExtraBold,
  },
  caption: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },
  subTitle: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 6,
  },
  boxRow: {
    flexDirection: "row",
    gap: 8,
  },
  box: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 2,
  },
  boxValue: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 18,
    lineHeight: 22,
  },
  boxLabel: {
    fontSize: 9,
    fontFamily: fonts.displayBold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  boxSub: {
    fontSize: 10,
    fontFamily: fonts.bodyRegular,
  },
  subTitleRate: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 13,
    letterSpacing: 0,
  },
  chartRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  yAxis: {
    width: 28,
  },
  yAxisLabel: {
    position: "absolute",
    right: 0,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: fonts.bodySemiBold,
  },
  chart: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  midLine: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
  },
  barSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  bar: {
    width: "100%",
    borderRadius: 4,
  },
  emptyTick: {
    width: "100%",
    height: 2,
    borderRadius: 1,
  },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    // Aligné sur la zone des barres (largeur de la graduation + gap)
    paddingLeft: 34,
  },
  axisLabel: {
    fontSize: 10,
    fontFamily: fonts.bodyRegular,
  },
  legend: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: fonts.bodyRegular,
  },
});
