import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PlayerBadge } from "@/src/components/exercise/PlayerBadge";
import { SEQUENCE_PLAYER_COLORS, SEQUENCE_PLAYER_COLORS_BG } from "@/src/constants/sequenceColors";
import { DIRECTION_SLOTS, SHOTS } from "@/src/data/shots";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { CourtSide, CourtZone, SequencePlayer, SequenceStep, ShotDirection, ShotId } from "@/src/types/index";
import {
  defaultFromSide,
  directionContextAt,
  directionLabel,
  isDirectionAllowed,
  isShotAvailable,
  needsFromSide,
  requiredStartZones,
  sequencePlayers,
} from "@/src/utils/exerciseSequence";

export type ShotDraft = Omit<SequenceStep, "id">;

interface ShotPickerProps {
  mode: "add" | "edit";
  /** Position (0-based) du coup saisi ou modifié. */
  index: number;
  /** Coups qui précèdent ce coup (contexte : grisage, position latérale). */
  previousSteps: SequenceStep[];
  playersCount: number;
  initial: Partial<ShotDraft> & { player: SequencePlayer };
  /** Saisie : un coup a déjà été saisi et peut être annulé. */
  canUndo?: boolean;
  /** Saisie — « Coup suivant → ». */
  onNext?: (draft: ShotDraft) => void;
  /** Saisie — « Valider la séquence » (draft null si aucun coup sélectionné). */
  onFinish?: (draft: ShotDraft | null) => void;
  /** Saisie — « Annuler » : retire le dernier coup saisi. */
  onUndo?: () => void;
  /** Modification d'un coup existant. */
  onSave?: (draft: ShotDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/** Boutons « Depuis », du point de vue du frappeur face au filet. */
const FROM_SIDE_OPTIONS: readonly { value: CourtSide; label: string }[] = [
  { value: "gauche", label: "Gauche" },
  { value: "centre", label: "Centre" },
  { value: "droite", label: "Droite" },
];

const ZONE_PHRASES: Record<CourtZone, string> = {
  avant: "l'avant",
  milieu: "le milieu",
  fond: "le fond",
};

/**
 * Panneau du bas de saisie d'un coup, affiché par-dessus la modale « Saisie
 * express » (overlay plutôt que Modal imbriquée, plus fiable sur iOS).
 *
 * - « Depuis » (coup n°1 et coup qui suit un « Au choix ») : côté de départ
 *   du frappeur, obligatoire ; défaut Droite pour un service, Centre sinon.
 *   Il ancre tout le schéma (sinon une routine peut être dessinée en miroir).
 * - Grille : TOUJOURS les 12 coups, même ordre, même place ; les coups
 *   impossibles sont grisés (isShotAvailable).
 * - Direction : trois boutons fixes dont les libellés suivent la position du
 *   frappeur (côté → Droit / Croisé / Centre, centre → Gauche / Centre /
 *   Droite), cf. directionContextAt.
 * - Le parent remonte ce composant (prop `key`) à chaque nouveau coup pour
 *   réinitialiser la sélection.
 */
export function ShotPicker({
  mode,
  index,
  previousSteps,
  playersCount,
  initial,
  canUndo = false,
  onNext,
  onFinish,
  onUndo,
  onSave,
  onDelete,
  onClose,
}: ShotPickerProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const players = sequencePlayers(playersCount);
  const previousShot = previousSteps[index - 1]?.shot;

  // Joueur absent (nombre de joueurs réduit après coup) : premier joueur présent.
  const [player, setPlayer] = useState<SequencePlayer>(
    players.includes(initial.player) ? initial.player : players[0] ?? "A",
  );
  const [shot, setShot] = useState<ShotId | undefined>(
    initial.shot && isShotAvailable(initial.shot, previousShot, index) ? initial.shot : undefined,
  );
  const [direction, setDirection] = useState<ShotDirection | undefined>(initial.direction);
  // Côté choisi explicitement ; sinon valeur par défaut, qui suit le coup choisi.
  const [fromSideChoice, setFromSideChoice] = useState<CourtSide | undefined>(initial.fromSide);

  const asksFromSide = needsFromSide(previousSteps, index);
  const fromSide = asksFromSide ? (fromSideChoice ?? defaultFromSide(shot)) : undefined;
  const context = directionContextAt(previousSteps, index, fromSide);
  // Une direction devenue hors contexte (ex. on passe de « Depuis : Droite »
  // à « Depuis : Centre ») est ignorée plutôt que conservée en silence.
  const effectiveDirection =
    direction && isDirectionAllowed(direction, context) ? direction : undefined;

  const zones = requiredStartZones(previousShot);
  const zonesHint = index > 0 && zones ? `· joué depuis ${zones.map((z) => ZONE_PHRASES[z]).join(" ou ")}` : null;

  function draft(): ShotDraft | null {
    if (!shot) return null;
    return {
      player,
      shot,
      ...(effectiveDirection ? { direction: effectiveDirection } : {}),
      ...(fromSide ? { fromSide } : {}),
    };
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.border }]} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>Coup {index + 1}</Text>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Fermer"
            style={[styles.iconButton, { borderColor: theme.border }]}
          >
            <Ionicons name="close" size={18} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Qui joue */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>
              Qui joue ?{" "}
              <Text style={[styles.sectionHint, { color: theme.secondaryText }]}>
                · alterné automatiquement
              </Text>
            </Text>
            <View style={styles.playersGrid}>
              {players.map((p) => {
                const selected = p === player;
                return (
                  <Pressable
                    key={p}
                    onPress={() => setPlayer(p)}
                    accessibilityState={{ selected }}
                    style={[
                      styles.playerChip,
                      {
                        borderColor: selected ? SEQUENCE_PLAYER_COLORS[p] : theme.border,
                        backgroundColor: selected ? SEQUENCE_PLAYER_COLORS_BG[p] : "transparent",
                      },
                    ]}
                  >
                    <PlayerBadge player={p} size={22} />
                    <Text
                      style={[styles.chipText, { color: selected ? SEQUENCE_PLAYER_COLORS[p] : theme.text }]}
                    >
                      Joueur {p}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Depuis — coup n°1 et coup qui suit un « Au choix » */}
          {asksFromSide ? (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>
                Depuis{" "}
                <Text style={[styles.sectionHint, { color: theme.secondaryText }]}>
                  · vu par le frappeur, face au filet
                </Text>
              </Text>
              <View style={styles.grid}>
                {FROM_SIDE_OPTIONS.map((option) => {
                  const selected = option.value === fromSide;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setFromSideChoice(option.value)}
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Depuis : ${option.label}`}
                      style={[
                        styles.gridCell,
                        {
                          borderColor: selected ? theme.primary : theme.border,
                          backgroundColor: selected ? "rgba(206,255,0,0.1)" : "transparent",
                        },
                      ]}
                    >
                      <Text style={[styles.cellText, { color: selected ? theme.primary : theme.text }]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Coup */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>
              Coup{" "}
              {zonesHint ? (
                <Text style={[styles.sectionHint, { color: theme.secondaryText }]}>{zonesHint}</Text>
              ) : null}
            </Text>
            <View style={styles.grid}>
              {SHOTS.map((def) => {
                const available = isShotAvailable(def.id, previousShot, index);
                const selected = def.id === shot;
                return (
                  <Pressable
                    key={def.id}
                    disabled={!available}
                    onPress={() => setShot(def.id)}
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

          {/* Direction */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>
              Direction{" "}
              <Text style={[styles.sectionHint, { color: theme.secondaryText }]}>
                · optionnel{context === "center" ? " · frappe depuis le centre" : ""}
              </Text>
            </Text>
            <View style={styles.grid}>
              {DIRECTION_SLOTS.map((slot) => {
                const value = context === "side" ? slot.side : slot.center;
                const selected = value === effectiveDirection;
                return (
                  <Pressable
                    key={slot.side}
                    onPress={() => setDirection(selected ? undefined : value)}
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
                accessibilityLabel="Annuler le dernier coup saisi"
                style={[styles.button, styles.undoButton, { borderColor: theme.border, opacity: canUndo ? 1 : 0.35 }]}
              >
                <Ionicons name="arrow-undo-outline" size={16} color={theme.text} />
                <Text style={[styles.buttonText, { color: theme.text }]}>Annuler</Text>
              </Pressable>
              <Pressable
                onPress={() => onFinish?.(draft())}
                style={[styles.button, styles.flex, { borderColor: theme.primary }]}
              >
                <Text style={[styles.buttonText, { color: theme.primary }]} numberOfLines={2}>
                  Valider la séquence
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const d = draft();
                  if (d) onNext?.(d);
                }}
                disabled={!shot}
                style={[
                  styles.button,
                  styles.flex,
                  { backgroundColor: theme.primary, borderColor: theme.primary, opacity: shot ? 1 : 0.45 },
                ]}
              >
                <Text style={[styles.buttonText, { color: theme.buttonTextOnPrimary }]}>Coup suivant →</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={onDelete}
                style={[styles.button, styles.flex, { borderColor: "rgba(255,77,109,0.35)" }]}
              >
                <Text style={[styles.buttonText, { color: theme.danger }]}>Supprimer</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const d = draft();
                  if (d) onSave?.(d);
                }}
                disabled={!shot}
                style={[
                  styles.button,
                  styles.flex,
                  { backgroundColor: theme.primary, borderColor: theme.primary, opacity: shot ? 1 : 0.45 },
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
    maxHeight: "90%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 14,
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
  },
  title: {
    fontSize: 22,
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
    gap: 18,
    paddingBottom: 4,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
    letterSpacing: 0,
    textTransform: "none",
  },
  playersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  playerChip: {
    flexGrow: 1,
    flexBasis: "45%",
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chipText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridCell: {
    // 3 colonnes : base 30 % + flexGrow pour absorber les gouttières, même sur petit écran.
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
  flex: {
    flex: 1,
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
    // Même police pour les trois boutons (cf. ticket).
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    textAlign: "center",
  },
});
