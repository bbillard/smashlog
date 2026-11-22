import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CourtDiagramModal } from "@/src/components/exercise/CourtDiagramModal";
import { CourtDiagramThumbnail } from "@/src/components/exercise/CourtDiagramThumbnail";
import { DiagramLegend } from "@/src/components/exercise/DiagramLegend";
import { SectionCard } from "@/src/components/SectionCard";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { ShotSequence } from "@/src/types/index";
import { diagramLegend } from "@/src/utils/courtDiagram";
import { endingLabel } from "@/src/utils/exerciseSequence";

interface CourtDiagramCardProps {
  exerciseName: string;
  sequence: ShotSequence;
}

/**
 * Section « Schéma » de la fiche exercice : terrain en paysage (camp du
 * coup n°1 à gauche), légende des joueurs, indicateur de fin et bouton
 * « Agrandir » vers la vue plein écran exportable en PNG.
 */
export function CourtDiagramCard({ exerciseName, sequence }: CourtDiagramCardProps) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const legend = diagramLegend(sequence);

  return (
    <SectionCard>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={[styles.label, { color: theme.secondaryText }]}>Schéma</Text>
          <Text style={[styles.indicator, { color: theme.primary }]}>{endingLabel(sequence)}</Text>
        </View>
        <Pressable
          onPress={() => setExpanded(true)}
          style={[styles.expandButton, { borderColor: theme.border }]}
          accessibilityLabel="Agrandir le schéma"
        >
          <Ionicons name="expand-outline" size={14} color={theme.tertiaryText} />
          <Text style={[styles.expandText, { color: theme.tertiaryText }]}>Agrandir</Text>
        </Pressable>
      </View>

      <CourtDiagramThumbnail
        sequence={sequence}
        onPress={() => setExpanded(true)}
        accessibilityLabel="Ouvrir le schéma en plein écran"
      />

      <View style={styles.legendRow}>
        <DiagramLegend players={legend.top} color={theme.tertiaryText} align="flex-start" />
        <DiagramLegend players={legend.bottom} color={theme.tertiaryText} align="flex-end" />
      </View>

      <CourtDiagramModal
        visible={expanded}
        exerciseName={exerciseName}
        sequence={sequence}
        onClose={() => setExpanded(false)}
      />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  indicator: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
  expandButton: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  expandText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
});
