import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CourtDiagram } from "@/src/components/exercise/CourtDiagram";
import { CourtDiagramModal } from "@/src/components/exercise/CourtDiagramModal";
import { DiagramLegend } from "@/src/components/exercise/DiagramLegend";
import { SectionCard } from "@/src/components/SectionCard";
import { COURT_DIAGRAM_COLORS } from "@/src/constants/sequenceColors";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { ExerciseSequence } from "@/src/types/index";
import { diagramLegend } from "@/src/utils/courtDiagram";

interface CourtDiagramCardProps {
  exerciseName: string;
  sequence: ExerciseSequence;
  playersCount: number;
}

/**
 * Section « Schéma » de la fiche exercice : terrain en paysage (relanceurs à
 * gauche, travailleurs à droite), légende des rôles et bouton « Agrandir »
 * vers la vue plein écran exportable en PNG.
 */
export function CourtDiagramCard({ exerciseName, sequence, playersCount }: CourtDiagramCardProps) {
  const { theme } = useAppTheme();
  const [width, setWidth] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const legend = diagramLegend(sequence, playersCount);

  return (
    <SectionCard>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: theme.secondaryText }]}>Schéma</Text>
        <Pressable
          onPress={() => setExpanded(true)}
          style={[styles.expandButton, { borderColor: theme.border }]}
          accessibilityLabel="Agrandir le schéma"
        >
          <Ionicons name="expand-outline" size={14} color={theme.tertiaryText} />
          <Text style={[styles.expandText, { color: theme.tertiaryText }]}>Agrandir</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => setExpanded(true)}
        onLayout={(e) => setWidth(Math.floor(e.nativeEvent.layout.width))}
        style={[styles.diagramWrap, { backgroundColor: COURT_DIAGRAM_COLORS.background }]}
        accessibilityLabel="Ouvrir le schéma en plein écran"
      >
        {width > 0 ? (
          <CourtDiagram
            sequence={sequence}
            playersCount={playersCount}
            orientation="landscape"
            width={width}
          />
        ) : null}
      </Pressable>

      <View style={styles.legendRow}>
        <DiagramLegend
          players={legend.top}
          roles={sequence.roles}
          color={theme.tertiaryText}
          align="flex-start"
        />
        <DiagramLegend
          players={legend.bottom}
          roles={sequence.roles}
          color={theme.tertiaryText}
          align="flex-end"
        />
      </View>

      <CourtDiagramModal
        visible={expanded}
        exerciseName={exerciseName}
        sequence={sequence}
        playersCount={playersCount}
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
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  diagramWrap: {
    borderRadius: 12,
    overflow: "hidden",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
});
