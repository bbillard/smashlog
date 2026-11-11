import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PlayerBadge } from "@/src/components/exercise/PlayerBadge";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SEQUENCE_PLAYER_COLORS, SEQUENCE_PLAYER_COLORS_BG } from "@/src/constants/sequenceColors";
import { COURT_ZONE_LABELS, SHOT_DIRECTION_OPTIONS, SHOTS } from "@/src/data/shots";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import {
  SequencePlayer,
  SequenceRole,
  SequenceStep,
  ShotDirection,
  ShotId,
} from "@/src/types/index";
import { isShotAvailable, requiredStartZones } from "@/src/utils/exerciseSequence";

export type ShotDraft = Omit<SequenceStep, "id">;

interface ShotPickerSheetProps {
  visible: boolean;
  /** Change à chaque ouverture (et à chaque « Ajouter + suivant ») pour réinitialiser le contenu. */
  contentKey: string;
  mode: "add" | "edit";
  /** Position (0-based) du coup ajouté ou modifié dans la séquence. */
  index: number;
  previousShot: ShotId | undefined;
  players: SequencePlayer[];
  roles: Partial<Record<SequencePlayer, SequenceRole>>;
  initial: Partial<ShotDraft> & { player: SequencePlayer };
  onSubmit: (draft: ShotDraft, options: { next: boolean }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/**
 * Panneau du bas « Ajouter un coup » du constructeur de séquence.
 *
 * La grille affiche TOUJOURS les 12 coups du référentiel, dans le même ordre
 * et à la même place : les coups impossibles après le coup précédent sont
 * grisés et non sélectionnables, mais ne disparaissent jamais (l'utilisateur
 * garde ses repères). Règles de grisage : isShotAvailable (src/utils/).
 */
export function ShotPickerSheet({
  visible,
  contentKey,
  onClose,
  ...contentProps
}: ShotPickerSheetProps) {
  const { theme } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
        <SafeAreaView
          edges={["bottom"]}
          style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <ShotPickerContent key={contentKey} onClose={onClose} {...contentProps} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function ShotPickerContent({
  mode,
  index,
  previousShot,
  players,
  roles,
  initial,
  onSubmit,
  onDelete,
  onClose,
}: Omit<ShotPickerSheetProps, "visible" | "contentKey">) {
  const { theme } = useAppTheme();
  // Joueur absent (nombre de joueurs réduit après coup) : on retombe sur le premier présent.
  const [player, setPlayer] = useState<SequencePlayer>(
    players.includes(initial.player) ? initial.player : players[0] ?? "A",
  );
  const [shot, setShot] = useState<ShotId | undefined>(
    initial.shot && isShotAvailable(initial.shot, previousShot, index) ? initial.shot : undefined,
  );
  const [direction, setDirection] = useState<ShotDirection | undefined>(initial.direction);

  const zones = requiredStartZones(previousShot);
  const zonesHint =
    index > 0 && zones
      ? `· joué depuis ${zones.map((z) => zonePhrase(z)).join(" ou ")}`
      : null;

  function submit(next: boolean) {
    if (!shot) return;
    onSubmit({ player, shot, ...(direction ? { direction } : {}) }, { next });
  }

  return (
    <View style={styles.content}>
      <View style={[styles.handle, { backgroundColor: theme.border }]} />

      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text style={[styles.kicker, { color: theme.primary }]}>Coup {index + 1}</Text>
          <Text style={[styles.title, { color: theme.text }]}>
            {mode === "add" ? "Ajouter un coup" : "Modifier le coup"}
          </Text>
        </View>
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
                    style={[
                      styles.chipText,
                      { color: selected ? SEQUENCE_PLAYER_COLORS[p] : theme.text },
                    ]}
                  >
                    {roles[p] === "travaille" ? "Travaille" : "Relance"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

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
            <Text style={[styles.sectionHint, { color: theme.secondaryText }]}>· optionnel</Text>
          </Text>
          <View style={styles.grid}>
            {SHOT_DIRECTION_OPTIONS.map((option) => {
              const selected = option.value === direction;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setDirection(selected ? undefined : option.value)}
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
                    {option.label}
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
            <View style={styles.flex}>
              <PrimaryButton
                label="Ajouter + suivant"
                tone="secondary"
                disabled={!shot}
                onPress={() => submit(true)}
              />
            </View>
            <View style={styles.flex}>
              <PrimaryButton label="Ajouter" disabled={!shot} onPress={() => submit(false)} />
            </View>
          </>
        ) : (
          <>
            {onDelete ? (
              <View style={styles.flex}>
                <PrimaryButton label="Supprimer" tone="danger" onPress={onDelete} />
              </View>
            ) : null}
            <View style={styles.flex}>
              <PrimaryButton label="Enregistrer" disabled={!shot} onPress={() => submit(false)} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function zonePhrase(zone: keyof typeof COURT_ZONE_LABELS): string {
  if (zone === "avant") return "l'avant";
  if (zone === "milieu") return "le milieu";
  return "le fond";
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 14,
    flexShrink: 1,
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
    // 3 colonnes : base 30 % + flexGrow pour absorber les gouttières, même sur petit écran
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
    gap: 10,
  },
});
