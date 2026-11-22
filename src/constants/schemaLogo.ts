import { ImageSourcePropType } from "react-native";

/**
 * Logo Smashlog du schéma (vue plein écran et export PNG), version claire
 * sur fond transparent. Mettre `source` à null pour revenir au texte
 * « SMASHLOG » (un require vers un fichier absent fait échouer le build).
 *
 * Le PNG fourni a de larges marges transparentes autour du dessin : `crop`
 * décrit le rectangle utile (en pixels de l'image source) pour que le logo
 * s'affiche à la bonne taille. À mettre à jour si le fichier est remplacé.
 */
export const SCHEMA_LOGO: {
  source: ImageSourcePropType;
  imageWidth: number;
  imageHeight: number;
  crop: { x: number; y: number; width: number; height: number };
} | null = {
  source: require("../../assets/images/logo-smashlog-schema.png"),
  imageWidth: 3560,
  imageHeight: 1720,
  crop: { x: 331, y: 571, width: 2870, height: 579 },
};
