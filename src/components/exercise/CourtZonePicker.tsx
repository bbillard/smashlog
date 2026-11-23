import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  COURT_DIAGRAM_COLORS,
  SCHEMA_SCREEN_COLORS,
  SEQUENCE_PLAYER_COLORS,
  SEQUENCE_PLAYER_ON_COLOR,
  playerTint,
} from "@/src/constants/sequenceColors";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { CourtSpot, SequencePlayer } from "@/src/types/index";
import { COURT } from "@/src/utils/courtDiagram";
import { SPOT_DEPTHS, SPOT_SIDES, spotKey, spotLabel, spotShortLabel } from "@/src/utils/fixedPost";

export interface ZoneCellState {
  selected?: boolean;
  /** Joueur dont la couleur surligne la case sélectionnée. */
  player?: SequencePlayer;
  /** Numéro d'envoi affiché dans la case (« Dans l'ordre »). */
  number?: number;
  disabled?: boolean;
  /** Mention pour les lecteurs d'écran (ex. « occupée par A »). */
  note?: string;
}

interface CourtZonePickerProps {
  /** État de chaque case, par spotKey. Case absente : libre, non sélectionnée. */
  cells: Record<string, ZoneCellState>;
  onPress: (spot: CourtSpot) => void;
  /** Préfixe des libellés d'accessibilité (ex. « Position de B »). */
  accessibilityPrefix: string;
  /** Largeur maximale du demi-terrain (px). */
  maxWidth?: number;
  /**
   * Version compacte pour un panneau du bas (saisie d'une frappe) : toute la
   * largeur, lignes de 44 px, sans les proportions réelles, pour que le
   * panneau tienne sur un écran sans défiler (maquette M2).
   */
  compact?: boolean;
  /** Mentions « ↑ Filet » / « Gauche · Centre · Droite » sous la grille (masquables si le titre le dit déjà). */
  showLegend?: boolean;
}

/**
 * Profondeurs relatives des zones (Avant jusqu'à la ligne de service court,
 * Milieu jusqu'à 4,20 m, Fond jusqu'à la ligne de fond), identiques aux
 * zones du schéma (src/utils/diagramScene.ts).
 */
const ROW_DEPTHS = [COURT.shortServiceFromNet, 4.2 - COURT.shortServiceFromNet, COURT.halfLength - 4.2];
const HALF_ASPECT = COURT.halfLength / COURT.width;
const NET_HEIGHT = 4;

/**
 * « Mini demi-terrain » de la Saisie express (mode Poste fixe) : 3
 * profondeurs × 3 couloirs, filet en haut, côtés du point de vue du joueur
 * qui occupe ce demi-terrain, face au filet. Proportions réelles d'un
 * demi-terrain ; cases d'au moins 44 px. Sélection simple ou multiple selon
 * l'usage du parent (il décide de l'état de chaque case).
 */
export function CourtZonePicker({ cells, onPress, accessibilityPrefix, maxWidth = 252, compact = false, showLegend = true }: CourtZonePickerProps) {
  const { theme } = useAppTheme();
  const [available, setAvailable] = useState(0);
  const width = compact ? available : Math.min(available, maxWidth);
  const courtHeight = width * HALF_ASPECT;
  const totalDepth = ROW_DEPTHS.reduce((a, b) => a + b, 0);

  return (
    <View style={styles.wrap} onLayout={(e) => setAvailable(Math.floor(e.nativeEvent.layout.width))}>
      {width > 0 ? (
        <View style={{ width }}>
          <View style={[styles.court, { borderColor: "rgba(255,255,255,0.25)" }]}>
            <View style={[styles.net, { backgroundColor: COURT_DIAGRAM_COLORS.net }]} />
            {SPOT_DEPTHS.map((depth, row) => (
              <View
                key={depth}
                style={[
                  styles.row,
                  { height: compact ? 44 : Math.max(44, ((courtHeight - NET_HEIGHT) * ROW_DEPTHS[row]) / totalDepth) },
                ]}
              >
                {SPOT_SIDES.map((side) => {
                  const spot = { depth, side };
                  const cell = cells[spotKey(spot)] ?? {};
                  const color = cell.player ? SEQUENCE_PLAYER_COLORS[cell.player] : theme.primary;
                  return (
                    <Pressable
                      key={side}
                      onPress={() => onPress(spot)}
                      disabled={cell.disabled}
                      accessibilityRole="button"
                      accessibilityState={{ selected: !!cell.selected, disabled: !!cell.disabled }}
                      accessibilityLabel={`${accessibilityPrefix} : ${spotLabel(spot)}${cell.number !== undefined ? `, envoi ${cell.number}` : ""}${cell.note ? `, ${cell.note}` : ""}`}
                      style={[
                        styles.cell,
                        {
                          backgroundColor: cell.selected && cell.player ? playerTint(cell.player, 0.22) : COURT_DIAGRAM_COLORS.surface,
                          borderColor: cell.selected ? color : "transparent",
                          opacity: cell.disabled ? 0.35 : 1,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        style={[styles.cellText, { color: cell.selected ? color : SCHEMA_SCREEN_COLORS.listTitle }]}
                      >
                        {spotShortLabel(spot)}
                      </Text>
                      {cell.number !== undefined ? (
                        <View style={[styles.number, { backgroundColor: color }]}>
                          <Text style={styles.numberText}>{cell.number}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
          {showLegend ? (
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.tertiaryText }]}>↑ Filet</Text>
              <Text style={[styles.footerText, { color: theme.tertiaryText }]}>Gauche · Centre · Droite</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    alignSelf: "stretch",
  },
  court: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.18)",
    gap: 1,
  },
  net: {
    height: NET_HEIGHT,
  },
  row: {
    flexDirection: "row",
    gap: 1,
  },
  cell: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    paddingHorizontal: 2,
  },
  cellText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
  number: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    fontSize: 11,
    fontFamily: fonts.displayBold,
    color: SEQUENCE_PLAYER_ON_COLOR,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginTop: 4,
  },
  footerText: {
    fontSize: 11,
    fontFamily: fonts.bodyRegular,
  },
});
