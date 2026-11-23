import { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { CourtDiagram } from "@/src/components/exercise/CourtDiagram";
import { DOT_LEGEND_HEIGHT, DiagramLegend } from "@/src/components/exercise/DiagramLegend";
import { SchemaLogo, schemaLogoWidth } from "@/src/components/exercise/SchemaLogo";
import { SCHEMA_SCREEN_COLORS } from "@/src/constants/sequenceColors";
import { fonts } from "@/src/theme/typography";
import { ExerciseSequence } from "@/src/types/index";
import { diagramContextLine } from "@/src/utils/diagramLayout";
import { schemaLegend } from "@/src/utils/diagramScene";

/**
 * Briques communes à la vue plein écran du schéma et à son export PNG
 * (écran 5 bis) : en-tête et carte du terrain. Les deux rendus partagent ces
 * composants pour que l'image exportée reste identique à l'écran.
 */

const CARD_PADDING_H = 12;
const CARD_PADDING_V = 10;
const CARD_GAP = 4;
const LOGO_HEIGHT = 12;

/** Largeur prise par les marges intérieures de la carte. */
export const CARD_HORIZONTAL_RESERVE = CARD_PADDING_H * 2;
/** Hauteur prise dans la carte par les marges et les deux légendes (jamais par-dessus le terrain). */
export const CARD_VERTICAL_RESERVE = CARD_PADDING_V * 2 + DOT_LEGEND_HEIGHT * 2 + CARD_GAP * 2;

interface SchemaHeaderTextProps {
  sequence: ExerciseSequence;
  exerciseName: string;
  /** Boutons à droite (vue plein écran) ; absents dans le PNG. */
  actions?: ReactNode;
}

/** En-tête : ligne de contexte lime en petites capitales, nom de l'exercice (2 lignes au plus). */
export function SchemaHeader({ sequence, exerciseName, actions }: SchemaHeaderTextProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.kicker} numberOfLines={1}>
          {diagramContextLine(sequence)}
        </Text>
        <Text style={styles.title} numberOfLines={2} accessibilityRole="header">
          {exerciseName}
        </Text>
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

interface SchemaCourtCardProps {
  sequence: ExerciseSequence;
  playersCount: number;
  /** Largeur du terrain (px), calculée par l'appelant (fitCourtWidth à l'écran). */
  courtWidth: number;
  style?: StyleProp<ViewStyle>;
  onLayout?: (size: { width: number; height: number }) => void;
  onLogoLoad?: () => void;
}

/**
 * Carte du terrain : légende du camp du haut, terrain en portrait, légende
 * du camp du bas et logo en bas à droite. Le logo a sa colonne réservée
 * (et une colonne vide de même largeur à gauche) : il ne chevauche jamais la
 * légende, qui reste centrée.
 */
export function SchemaCourtCard({ sequence, playersCount, courtWidth, style, onLayout, onLogoLoad }: SchemaCourtCardProps) {
  const legend = schemaLegend(sequence, playersCount);
  const logoWidth = schemaLogoWidth(LOGO_HEIGHT);
  return (
    <View
      style={[styles.card, style]}
      onLayout={
        onLayout
          ? (e) => onLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
          : undefined
      }
    >
      <DiagramLegend variant="dot" players={legend.top} role={legend.topRole} color={SCHEMA_SCREEN_COLORS.legend} />
      {courtWidth > 0 ? (
        <CourtDiagram sequence={sequence} playersCount={playersCount} orientation="portrait" width={courtWidth} />
      ) : (
        <View style={styles.courtPlaceholder} />
      )}
      <View style={styles.bottomRow}>
        <View style={{ width: logoWidth }} />
        <View style={styles.bottomLegend}>
          <DiagramLegend variant="dot" players={legend.bottom} role={legend.bottomRole} color={SCHEMA_SCREEN_COLORS.legend} />
        </View>
        <View style={[styles.logoSlot, { width: logoWidth }]}>
          <SchemaLogo height={LOGO_HEIGHT} onLoad={onLogoLoad} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.88,
    textTransform: "uppercase",
    color: SCHEMA_SCREEN_COLORS.accent,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.displayExtraBold,
    color: SCHEMA_SCREEN_COLORS.title,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: SCHEMA_SCREEN_COLORS.cardBorder,
    backgroundColor: SCHEMA_SCREEN_COLORS.card,
    paddingHorizontal: CARD_PADDING_H,
    paddingVertical: CARD_PADDING_V,
    gap: CARD_GAP,
    alignItems: "center",
    justifyContent: "center",
  },
  courtPlaceholder: {
    flex: 1,
  },
  bottomRow: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    height: DOT_LEGEND_HEIGHT,
  },
  bottomLegend: {
    flex: 1,
    alignItems: "center",
  },
  logoSlot: {
    alignItems: "flex-end",
  },
});
