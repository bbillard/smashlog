import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { CourtDiagram } from "@/src/components/exercise/CourtDiagram";
import { COURT_DIAGRAM_COLORS } from "@/src/constants/sequenceColors";
import { ExerciseSequence } from "@/src/types/index";

interface CourtDiagramThumbnailProps {
  sequence: ExerciseSequence;
  onPress?: () => void;
  accessibilityLabel?: string;
}

/**
 * Schéma en paysage qui occupe toute la largeur disponible (mesurée au
 * layout). Utilisé par la fiche exercice et par le bloc « Saisie express »
 * rempli du formulaire.
 */
export function CourtDiagramThumbnail({ sequence, onPress, accessibilityLabel }: CourtDiagramThumbnailProps) {
  const [width, setWidth] = useState(0);
  const content =
    width > 0 ? <CourtDiagram sequence={sequence} orientation="landscape" width={width} /> : null;
  const style = [styles.wrap, { backgroundColor: COURT_DIAGRAM_COLORS.background }];
  const onLayout = (e: { nativeEvent: { layout: { width: number } } }) =>
    setWidth(Math.floor(e.nativeEvent.layout.width));

  if (!onPress) {
    return (
      <View style={style} onLayout={onLayout}>
        {content}
      </View>
    );
  }
  return (
    <Pressable style={style} onLayout={onLayout} onPress={onPress} accessibilityLabel={accessibilityLabel}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    overflow: "hidden",
  },
});
