import { Image, StyleSheet, Text, View } from "react-native";

import { SCHEMA_LOGO } from "@/src/constants/schemaLogo";
import { SCHEMA_SCREEN_COLORS } from "@/src/constants/sequenceColors";
import { fonts } from "@/src/theme/typography";

interface SchemaLogoProps {
  /** Hauteur du dessin du logo (px), marges transparentes du fichier exclues. */
  height?: number;
  onLoad?: () => void;
}

/** Largeur occupée par le logo pour une hauteur donnée (réservée dans la légende). */
export function schemaLogoWidth(height: number): number {
  if (!SCHEMA_LOGO) return Math.round(height * 6.2);
  return Math.round((SCHEMA_LOGO.crop.width / SCHEMA_LOGO.crop.height) * height);
}

/**
 * Logo Smashlog discret du schéma : le fichier est recadré sur son dessin
 * (overflow masqué) ; sans fichier, texte « SMASHLOG » en Syne ExtraBold.
 */
export function SchemaLogo({ height = 12, onLoad }: SchemaLogoProps) {
  if (!SCHEMA_LOGO) {
    return (
      <Text style={styles.fallback} accessibilityLabel="Smashlog">
        SMASHLOG
      </Text>
    );
  }
  const { crop, imageWidth, imageHeight, source } = SCHEMA_LOGO;
  const scale = height / crop.height;
  return (
    <View
      style={{ width: schemaLogoWidth(height), height, overflow: "hidden" }}
      accessibilityRole="image"
      accessibilityLabel="Smashlog"
    >
      <Image
        source={source}
        onLoad={onLoad}
        style={{
          width: imageWidth * scale,
          height: imageHeight * scale,
          marginLeft: -crop.x * scale,
          marginTop: -crop.y * scale,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 11,
    letterSpacing: 0.66,
    color: SCHEMA_SCREEN_COLORS.logoFallback,
  },
});
