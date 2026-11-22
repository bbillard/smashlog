import { StyleSheet, Text, View } from "react-native";

import { PlayerBadge } from "@/src/components/exercise/PlayerBadge";
import { SectionCard } from "@/src/components/SectionCard";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { CourtSide, ShotSequence } from "@/src/types/index";
import {
  directionLabel,
  distributionLabel,
  endingLabel,
  shotLabel,
} from "@/src/utils/exerciseSequence";

const FROM_SIDE_LABELS: Record<CourtSide, string> = {
  gauche: "la gauche",
  centre: "le centre",
  droite: "la droite",
};

interface SequenceTimelineProps {
  sequence: ShotSequence;
}

/**
 * Section « Séquence » de la fiche exercice : frise verticale des coups
 * (pastille joueur, coup, côté de départ s'il est précisé, direction),
 * badges « Volant continu » et de fin (« ↻ En boucle » / « Finir le point »).
 * Purement présentationnel.
 */
export function SequenceTimeline({ sequence }: SequenceTimelineProps) {
  const { theme } = useAppTheme();
  const ending = endingLabel(sequence);

  return (
    <SectionCard>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: theme.secondaryText }]}>Séquence</Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.07)" }]}>
            <Text style={[styles.badgeText, { color: theme.tertiaryText }]}>{distributionLabel(sequence)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: "rgba(206,255,0,0.1)" }]}>
            <Text style={[styles.badgeText, { color: theme.primary }]}>{ending}</Text>
          </View>
        </View>
      </View>

      <View>
        {sequence.steps.map((step, index) => (
          <View key={step.id} style={styles.stepRow}>
            <View style={styles.rail}>
              <PlayerBadge player={step.player} size={26} weight="bold" />
              {index < sequence.steps.length - 1 ? (
                <View style={[styles.railLine, { backgroundColor: theme.border }]} />
              ) : null}
            </View>
            <View style={styles.stepText}>
              <Text style={[styles.stepShot, { color: theme.text }]}>
                {index + 1}. {shotLabel(step.shot)}
              </Text>
              {step.fromSide || step.direction ? (
                <Text style={[styles.stepMeta, { color: theme.secondaryText }]}>
                  {[
                    step.fromSide ? `depuis ${FROM_SIDE_LABELS[step.fromSide]}` : null,
                    step.direction ? directionLabel(step.direction).toLowerCase() : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
  },
  rail: {
    width: 26,
    alignItems: "center",
  },
  railLine: {
    width: 2,
    flex: 1,
    minHeight: 12,
  },
  stepText: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    paddingTop: 3,
    paddingBottom: 14,
    flex: 1,
  },
  stepShot: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
  },
  stepMeta: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
  },
});
