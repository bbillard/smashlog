import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";

import { CourtDiagram, courtDiagramAspect } from "@/src/components/exercise/CourtDiagram";
import { DiagramLegend } from "@/src/components/exercise/DiagramLegend";
import { COURT_DIAGRAM_COLORS } from "@/src/constants/sequenceColors";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { shareImageAsync } from "@/src/services/sharing";
import { fonts } from "@/src/theme/typography";
import { ShotSequence } from "@/src/types/index";
import { diagramLegend } from "@/src/utils/courtDiagram";
import { endingLabel } from "@/src/utils/exerciseSequence";

const logoSource = require("../../../img/smashlog-logo.png");

interface CourtDiagramModalProps {
  visible: boolean;
  exerciseName: string;
  sequence: ShotSequence;
  onClose: () => void;
}

/** Hauteur réservée hors schéma (en-tête, légendes, marges) pour dimensionner le terrain. */
const RESERVED_HEIGHT = 250;

/**
 * Vue plein écran du schéma (terrain en portrait) avec export PNG.
 *
 * La zone capturée (ViewShot) est exactement celle affichée : nom de
 * l'exercice, légendes, terrain et petit logo Smashlog dans un coin. L'image
 * est proposée via la feuille de partage native (expo-sharing), qui offre
 * aussi « Enregistrer l'image » sur iOS / Android : pas de permission
 * photothèque à demander ici.
 */
export function CourtDiagramModal({
  visible,
  exerciseName,
  sequence,
  onClose,
}: CourtDiagramModalProps) {
  const { theme } = useAppTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const captureRef = useRef<ViewShot | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const aspect = courtDiagramAspect("portrait");
  const diagramWidth = Math.max(
    160,
    Math.min(windowWidth - 48, (windowHeight - RESERVED_HEIGHT) / aspect),
  );
  const legend = diagramLegend(sequence);
  const kicker = `Schéma · ${sequence.steps.length} coup${sequence.steps.length > 1 ? "s" : ""} · ${endingLabel(sequence)}`;

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
      const uri = await captureRef.current?.capture?.();
      if (!uri) throw new Error("capture_failed");
      await shareImageAsync(uri, "Partager le schéma de l'exercice");
    } catch {
      Alert.alert("Export indisponible", "Impossible d'exporter le schéma pour le moment.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: COURT_DIAGRAM_COLORS.background }]}>
        <View style={styles.toolbar}>
          <Text style={[styles.kicker, { color: theme.primary }]}>{kicker}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={handleExport}
              disabled={isExporting}
              accessibilityLabel="Télécharger le schéma en PNG"
              style={[styles.pngButton, { borderColor: "rgba(206,255,0,0.4)" }]}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons name="download-outline" size={16} color={theme.primary} />
              )}
              <Text style={[styles.pngText, { color: theme.primary }]}>PNG</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Fermer le schéma"
              style={[styles.closeButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
            >
              <Ionicons name="close" size={18} color={theme.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <ViewShot
            ref={captureRef}
            options={{ format: "png", quality: 1, result: "tmpfile" }}
            style={[styles.capture, { backgroundColor: COURT_DIAGRAM_COLORS.background }]}
          >
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {exerciseName}
            </Text>
            <DiagramLegend players={legend.top} color={theme.tertiaryText} />
            <CourtDiagram
              sequence={sequence}
              orientation="portrait"
              width={diagramWidth}
            />
            <DiagramLegend players={legend.bottom} color={theme.tertiaryText} />
            <View style={styles.brand}>
              <Image source={logoSource} style={styles.logo} />
              <Text style={[styles.brandText, { color: theme.secondaryText }]}>Smashlog</Text>
            </View>
          </ViewShot>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  kicker: {
    flex: 1,
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  pngButton: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(206,255,0,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pngText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  capture: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.displayExtraBold,
    textAlign: "center",
  },
  brand: {
    position: "absolute",
    right: 12,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    opacity: 0.8,
  },
  logo: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  brandText: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
  },
});
