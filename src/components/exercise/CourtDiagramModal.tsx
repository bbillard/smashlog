import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { courtDiagramAspect } from "@/src/components/exercise/CourtDiagram";
import { SchemaExportView } from "@/src/components/exercise/SchemaExportView";
import {
  CARD_HORIZONTAL_RESERVE,
  CARD_VERTICAL_RESERVE,
  SchemaCourtCard,
  SchemaHeader,
} from "@/src/components/exercise/SchemaParts";
import { LIST_SIDE_PADDING, SequenceShotList } from "@/src/components/exercise/SequenceShotList";
import { SCHEMA_SCREEN_COLORS } from "@/src/constants/sequenceColors";
import { shareImageAsync } from "@/src/services/sharing";
import { fonts } from "@/src/theme/typography";
import { ShotSequence } from "@/src/types/index";
import {
  exportCaptureSize,
  exportFileName,
  fitCourtWidth,
  sequenceListTitle,
} from "@/src/utils/diagramLayout";

interface CourtDiagramModalProps {
  visible: boolean;
  exerciseName: string;
  sequence: ShotSequence;
  onClose: () => void;
}

function ensureFileUri(uri: string) {
  return uri.startsWith("file://") ? uri : `file://${uri}`;
}

/**
 * Vue plein écran du schéma (écran 5 bis) : en-tête, carte du terrain qui
 * absorbe la hauteur restante (terrain dimensionné par la hauteur, dans ses
 * proportions réglementaires, légendes réservées), puis la liste des coups
 * sur 3 lignes.
 *
 * Export PNG : une vue dédiée (SchemaExportView) est rendue hors écran,
 * capturée à 1080 px de large puis renommée
 * smashlog-schema-[slug].png et proposée via la feuille de partage native.
 */
export function CourtDiagramModal({ visible, exerciseName, sequence, onClose }: CourtDiagramModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  // Marges de sécurité lues dans l'écran parent (hors de la Modal) : un
  // SafeAreaView placé dans la Modal mesure ses marges pendant l'animation
  // d'ouverture (vue encore sous l'écran) et obtient parfois 0 en haut, ce
  // qui faisait passer l'en-tête sous l'encoche / la caméra frontale.
  const insets = useSafeAreaInsets();
  const [cardSize, setCardSize] = useState<{ width: number; height: number } | null>(null);
  const exportRef = useRef<View | null>(null);
  const [exportSize, setExportSize] = useState<{ width: number; height: number } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const courtWidth = cardSize
    ? fitCourtWidth({
        availableWidth: cardSize.width - CARD_HORIZONTAL_RESERVE,
        availableHeight: cardSize.height - CARD_VERTICAL_RESERVE,
        aspect: courtDiagramAspect("portrait"),
      })
    : 0;

  async function handleExport() {
    if (isExporting) return;
    if (Platform.OS === "web") {
      Alert.alert(
        "Export non disponible sur le web",
        "L'export PNG du schéma est réservé à l'application mobile pour l'instant.",
      );
      return;
    }
    setIsExporting(true);
    try {
      if (!exportRef.current || !exportSize) throw new Error("export_view_not_ready");
      const captured = await captureRef(exportRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        ...exportCaptureSize(exportSize),
      });
      let uri = ensureFileUri(captured);
      if (FileSystem.cacheDirectory) {
        // Nom de fichier lisible dans la feuille de partage.
        const target = `${FileSystem.cacheDirectory}${exportFileName(exerciseName)}`;
        await FileSystem.deleteAsync(target, { idempotent: true });
        await FileSystem.copyAsync({ from: uri, to: target });
        uri = target;
      }
      await shareImageAsync(uri, "Partager le schéma de l'exercice");
    } catch {
      Alert.alert("Export indisponible", "Impossible d'exporter le schéma pour le moment.");
    } finally {
      setIsExporting(false);
    }
  }

  const actions = (
    <>
      <Pressable
        onPress={handleExport}
        disabled={isExporting}
        accessibilityRole="button"
        accessibilityLabel="Télécharger le schéma en PNG"
        style={styles.pngButton}
      >
        {isExporting ? (
          <ActivityIndicator size="small" color={SCHEMA_SCREEN_COLORS.accent} />
        ) : (
          <Ionicons name="download-outline" size={16} color={SCHEMA_SCREEN_COLORS.accent} />
        )}
        <Text style={styles.pngText}>PNG</Text>
      </Pressable>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer le schéma" style={styles.closeButton}>
        <Ionicons name="close" size={18} color={SCHEMA_SCREEN_COLORS.title} />
      </Pressable>
    </>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <StatusBar style="light" />
      <View style={styles.root}>
        {/* Vue d'export hors écran : jamais visible ni lue par les lecteurs d'écran. */}
        <View
          style={styles.offscreen}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <SchemaExportView
            ref={exportRef}
            sequence={sequence}
            exerciseName={exerciseName}
            onLayout={setExportSize}
          />
        </View>

        <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.headerWrap}>
            <SchemaHeader sequence={sequence} exerciseName={exerciseName} actions={actions} />
          </View>

          <SchemaCourtCard
            sequence={sequence}
            courtWidth={courtWidth}
            style={styles.card}
            onLayout={(size) =>
              setCardSize((prev) =>
                prev && prev.width === size.width && prev.height === size.height ? prev : size,
              )
            }
          />

          <Text style={styles.listTitle}>{sequenceListTitle(sequence)}</Text>
          <View style={styles.list}>
            <SequenceShotList sequence={sequence} mode="screen" width={windowWidth} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCHEMA_SCREEN_COLORS.background,
  },
  safe: {
    flex: 1,
  },
  offscreen: {
    position: "absolute",
    top: 0,
    left: -10000,
  },
  headerWrap: {
    paddingTop: 8,
  },
  pngButton: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SCHEMA_SCREEN_COLORS.accentBorder,
    backgroundColor: SCHEMA_SCREEN_COLORS.accentBg,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pngText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: SCHEMA_SCREEN_COLORS.accent,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SCHEMA_SCREEN_COLORS.buttonBorder,
    backgroundColor: SCHEMA_SCREEN_COLORS.buttonBg,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    flex: 1,
    marginTop: 14,
    marginHorizontal: 12,
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
  list: {
    paddingBottom: 12,
  },
});
