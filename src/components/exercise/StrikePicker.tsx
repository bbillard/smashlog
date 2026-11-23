import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CourtZonePicker } from "@/src/components/exercise/CourtZonePicker";
import { SectionLabel } from "@/src/components/exercise/ExpressEntryParts";
import { DIRECTION_SLOTS, SHOTS } from "@/src/data/shots";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { CourtSpot, CourtZone, MultishuttleStrike, SequencePlayer, ShotDirection, ShotId } from "@/src/types/index";
import { directionLabel, isDirectionAllowed } from "@/src/utils/exerciseSequence";
import { isStrikeShotAvailable, spotKey, strikeDirectionContext } from "@/src/utils/fixedPost";

export type StrikeDraft = Omit<MultishuttleStrike, "id">;

interface StrikePickerProps {
  mode: "add" | "edit";
  /** Position (0-based) de la frappe saisie ou modifiée. */
  index: number;
  worker: SequencePlayer;
  initial?: Partial<StrikeDraft>;
  canUndo?: boolean;
  /** Saisie — « Frappe suivante → ». */
  onNext?: (draft: StrikeDraft) => void;
  /** Saisie — « Valider la séquence » (draft null si la frappe en cours est incomplète). */
  onFinish?: (draft: StrikeDraft | null) => void;
  /** Saisie — « Annuler » : retire la dernière frappe saisie. */
  onUndo?: () => void;
  onSave?: (draft: StrikeDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const ZONE_PHRASES: Record<CourtZone, string> = {
  avant: "l'avant",
  milieu: "le milieu",
  fond: "le fond",
};

/**
 * Panneau « Ajouter une frappe » du multivolant (écran M2), par-dessus la
 * modale (overlay, comme ShotPicker) :
 * - « Depuis » : mini demi-terrain du joueur qui travaille, une zone ;
 * - « Coup » : la même grille de 12 coups, toujours à la même place ; un coup
 *   est disponible si ses zones de départ contiennent la profondeur de la
 *   zone « Depuis » ; services toujours grisés ; « Au choix » jamais ;
 * - « Direction » (optionnelle) : Droit / Croisé / Centre sur un côté,
 *   Gauche / Centre / Droite au centre.
 * Pas d'enchaînement entre les frappes : chacune a son propre point de départ.
 */
export function StrikePicker({
  mode,
  index,
  worker,
  initial,
  canUndo = false,
  onNext,
  onFinish,
  onUndo,
  onSave,
  onDelete,
  onClose,
}: StrikePickerProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [from, setFrom] = useState<CourtSpot | undefined>(initial?.from);
  const [shot, setShot] = useState<ShotId | undefined>(
    initial?.shot && isStrikeShotAvailable(initial.shot, initial.from) ? initial.shot : undefined,
  );
  const [direction, setDirection] = useState<ShotDirection | undefined>(initial?.direction);

  const context = from ? strikeDirectionContext(from) : "side";
  const effectiveDirection = direction && isDirectionAllowed(direction, context) ? direction : undefined;
  const complete = !!from && !!shot;

  function chooseFrom(spot: CourtSpot) {
    setFrom(spot);
    // Coup devenu impossible depuis la nouvelle zone : désélectionné.
    if (shot && !isStrikeShotAvailable(shot, spot)) setShot(undefined);
  }

  function draft(): StrikeDraft | null {
    if (!from || !shot) return null;
    return { from, shot, ...(effectiveDirection ? { direction: effectiveDirection } : {}) };
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <Text style={[styles.kicker, { color: theme.primary }]}>
              Frappe {index + 1} · Joueur {worker}
            </Text>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {mode === "add" ? "Ajouter une frappe" : "Modifier la frappe"}
            </Text>
          </View>
          <Pressable onPress={onClose} accessibilityLabel="Fermer" style={[styles.iconButton, { borderColor: theme.border }]}>
            <Ionicons name="close" size={18} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <SectionLabel hint={`demi-terrain de ${worker}, face au filet`}>Depuis</SectionLabel>
            <CourtZonePicker
              cells={from ? { [spotKey(from)]: { selected: true, player: worker } } : {}}
              accessibilityPrefix="Frappe depuis"
              onPress={chooseFrom}
              compact
              showLegend={false}
            />
          </View>

          <View style={styles.section}>
            <SectionLabel hint={from ? `possibles depuis ${ZONE_PHRASES[from.depth]}` : "choisis d'abord la zone"}>Coup</SectionLabel>
            <View style={styles.grid}>
              {SHOTS.map((def) => {
                const available = isStrikeShotAvailable(def.id, from);
                const selected = def.id === shot;
                return (
                  <Pressable
                    key={def.id}
                    disabled={!available}
                    onPress={() => setShot(def.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: !available }}
                    style={[
                      styles.gridCell,
                      {
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected ? "rgba(206,255,0,0.1)" : "transparent",
                        borderStyle: def.id === "au_choix" && !selected ? "dashed" : "solid",
                        opacity: available ? 1 : 0.3,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={[styles.cellText, { color: selected ? theme.primary : theme.text }]}
                    >
                      {def.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel hint={`optionnel${context === "center" ? " · frappe depuis le centre" : ""}`}>Direction</SectionLabel>
            <View style={styles.grid}>
              {DIRECTION_SLOTS.map((slot) => {
                const value = context === "side" ? slot.side : slot.center;
                const selected = value === effectiveDirection;
                return (
                  <Pressable
                    key={slot.side}
                    onPress={() => setDirection(selected ? undefined : value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.gridCell,
                      {
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected ? "rgba(206,255,0,0.1)" : "transparent",
                      },
                    ]}
                  >
                    <Text style={[styles.cellText, { color: selected ? theme.primary : theme.text }]}>
                      {directionLabel(value)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {mode === "add" ? (
            <>
              <Pressable
                onPress={onUndo}
                disabled={!canUndo}
                accessibilityLabel="Annuler la dernière frappe saisie"
                style={[styles.button, styles.undoButton, { borderColor: theme.border, opacity: canUndo ? 1 : 0.35 }]}
              >
                <Ionicons name="arrow-undo-outline" size={16} color={theme.text} />
                <Text style={[styles.buttonText, { color: theme.text }]}>Annuler</Text>
              </Pressable>
              <Pressable onPress={() => onFinish?.(draft())} style={[styles.button, styles.flex, { borderColor: theme.primary }]}>
                <Text style={[styles.buttonText, { color: theme.primary }]} numberOfLines={2}>
                  Valider la séquence
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const d = draft();
                  if (d) onNext?.(d);
                }}
                disabled={!complete}
                style={[
                  styles.button,
                  styles.flex,
                  { backgroundColor: theme.primary, borderColor: theme.primary, opacity: complete ? 1 : 0.45 },
                ]}
              >
                <Text style={[styles.buttonText, { color: theme.buttonTextOnPrimary }]}>Frappe suivante →</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable onPress={onDelete} style={[styles.button, styles.flex, { borderColor: "rgba(255,77,109,0.35)" }]}>
                <Text style={[styles.buttonText, { color: theme.danger }]}>Supprimer</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const d = draft();
                  if (d) onSave?.(d);
                }}
                disabled={!complete}
                style={[
                  styles.button,
                  styles.flex,
                  { backgroundColor: theme.primary, borderColor: theme.primary, opacity: complete ? 1 : 0.45 },
                ]}
              >
                <Text style={[styles.buttonText, { color: theme.buttonTextOnPrimary }]}>Enregistrer</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "97%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 10,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  kicker: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.displayExtraBold,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    gap: 14,
    paddingBottom: 4,
  },
  section: {
    gap: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  gridCell: {
    width: "30%",
    flexGrow: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  cellText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
  },
  footer: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  undoButton: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
  },
  buttonText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    textAlign: "center",
  },
});
