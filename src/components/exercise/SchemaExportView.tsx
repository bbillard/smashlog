import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { SchemaCourtCard, SchemaHeader } from "@/src/components/exercise/SchemaParts";
import { LIST_SIDE_PADDING, SequenceShotList } from "@/src/components/exercise/SequenceShotList";
import { SCHEMA_SCREEN_COLORS } from "@/src/constants/sequenceColors";
import { fonts } from "@/src/theme/typography";
import { ShotSequence } from "@/src/types/index";
import { sequenceListTitle } from "@/src/utils/diagramLayout";

/** Largeur logique de la vue d'export ; capturée à 1080 px (EXPORT_WIDTH_PX). */
export const EXPORT_VIEW_WIDTH = 360;
const CARD_MARGIN = 12;
/** Terrain dimensionné par la largeur (la hauteur de l'image est libre), proportions de l'écran. */
const EXPORT_COURT_WIDTH = Math.round((EXPORT_VIEW_WIDTH - CARD_MARGIN * 2) * 0.69);

interface SchemaExportViewProps {
  sequence: ShotSequence;
  exerciseName: string;
  onLayout?: (size: { width: number; height: number }) => void;
  onLogoLoad?: () => void;
}

/**
 * Mise en page du PNG exporté, rendue hors écran puis capturée (pas de
 * capture de la vue affichée) : même en-tête sans les boutons, même carte du
 * terrain avec légende et logo, et liste des coups toujours complète sur
 * 2 colonnes (l'image s'allonge au-delà de 6 éléments).
 */
export const SchemaExportView = forwardRef<View, SchemaExportViewProps>(function SchemaExportView(
  { sequence, exerciseName, onLayout, onLogoLoad },
  ref,
) {
  return (
    <View
      ref={ref}
      collapsable={false}
      style={styles.root}
      onLayout={
        onLayout
          ? (e) => onLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
          : undefined
      }
    >
      <SchemaHeader sequence={sequence} exerciseName={exerciseName} />
      <SchemaCourtCard
        sequence={sequence}
        courtWidth={EXPORT_COURT_WIDTH}
        style={styles.card}
        onLogoLoad={onLogoLoad}
      />
      <Text style={styles.listTitle}>{sequenceListTitle(sequence)}</Text>
      <SequenceShotList sequence={sequence} mode="export" width={EXPORT_VIEW_WIDTH} />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    width: EXPORT_VIEW_WIDTH,
    backgroundColor: SCHEMA_SCREEN_COLORS.background,
    paddingTop: 20,
    paddingBottom: 20,
  },
  card: {
    marginTop: 14,
    marginHorizontal: CARD_MARGIN,
  },
  listTitle: {
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: LIST_SIDE_PADDING,
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.88,
    textTransform: "uppercase",
    color: SCHEMA_SCREEN_COLORS.listTitle,
  },
});
