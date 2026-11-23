import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  ExpressFrame,
  ExpressLayout,
  OptionCard,
  SectionLabel,
  expressStyles,
} from "@/src/components/exercise/ExpressEntryParts";
import { PlayerBadge } from "@/src/components/exercise/PlayerBadge";
import { ShotDraft, ShotPicker } from "@/src/components/exercise/ShotPicker";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { CourtSide, SequenceEnding, SequencePlayer, SequenceStep, ShotSequence } from "@/src/types/index";
import {
  directionLabel,
  findInvalidStepIds,
  nextPlayer,
  normalizeSteps,
  sequenceEnding,
  sequencePlayers,
  shotLabel,
} from "@/src/utils/exerciseSequence";
import { createId } from "@/src/utils/id";

interface ShotSequenceEditorProps {
  frame: ExpressFrame;
  value: ShotSequence;
  onChange: (next: ShotSequence) => void;
  playersCount: number;
}

type PanelState =
  | { open: false }
  | { open: true; mode: "add"; index: number; initial: Partial<ShotDraft> & { player: SequencePlayer }; key: string }
  | { open: true; mode: "edit"; index: number; key: string };

const FROM_SIDE_LABELS: Record<CourtSide, string> = {
  gauche: "Depuis la gauche",
  centre: "Depuis le centre",
  droite: "Depuis la droite",
};

export const ENDING_OPTIONS: readonly { value: SequenceEnding; label: string; hint: string }[] = [
  { value: "boucle", label: "↻ En boucle", hint: "On reprend au coup 1" },
  { value: "finir_point", label: "Finir le point", hint: "Jeu libre ensuite" },
];

/**
 * Éditeur « Séquence de coups » (volant continu) de la Saisie express :
 * liste de coups (panneau ShotPicker), fin de séquence. Extrait tel quel de
 * la modale lors de l'ajout du mode Poste fixe.
 */
export function ShotSequenceEditor({ frame, value: sequence, onChange, playersCount }: ShotSequenceEditorProps) {
  const { theme } = useAppTheme();
  const [panel, setPanel] = useState<PanelState>({ open: false });

  const steps = sequence.steps;
  const players = sequencePlayers(playersCount);
  const invalidIds = new Set(findInvalidStepIds(steps, playersCount));

  /** Toute modification de la liste repasse par normalizeSteps (fromSide). */
  function setSteps(next: SequenceStep[]) {
    onChange({ ...sequence, steps: normalizeSteps(next) });
  }

  function openAdd(fromSteps = steps) {
    const index = fromSteps.length;
    setPanel({
      open: true,
      mode: "add",
      index,
      initial: { player: nextPlayer(fromSteps, playersCount, index) },
      key: createId(),
    });
  }

  function handleNext(draft: ShotDraft) {
    const next = normalizeSteps([...steps, { id: createId(), ...draft }]);
    setSteps(next);
    openAdd(next);
  }

  function handleFinish(draft: ShotDraft | null) {
    if (draft) setSteps([...steps, { id: createId(), ...draft }]);
    setPanel({ open: false });
  }

  function handleUndo() {
    const last = steps[steps.length - 1];
    if (!last) return;
    const next = steps.slice(0, -1);
    setSteps(next);
    const { id: _id, ...draft } = last;
    // Réaffiche la saisie du coup retiré, pré-remplie avec ses valeurs.
    setPanel({ open: true, mode: "add", index: next.length, initial: draft, key: createId() });
  }

  function handleSave(index: number, draft: ShotDraft) {
    setSteps(steps.map((s, i) => (i === index ? { id: s.id, ...draft } : s)));
    setPanel({ open: false });
  }

  function handleDelete(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
    setPanel({ open: false });
  }

  const editedStep = panel.open && panel.mode === "edit" ? steps[panel.index] : undefined;

  const overlay = panel.open ? (
    <ShotPicker
      key={panel.key}
      mode={panel.mode}
      index={panel.index}
      previousSteps={steps.slice(0, panel.index)}
      playersCount={playersCount}
      initial={panel.mode === "add" ? panel.initial : (editedStep ?? { player: "A" })}
      canUndo={steps.length > 0}
      onNext={handleNext}
      onFinish={handleFinish}
      onUndo={handleUndo}
      onSave={(draft) => handleSave(panel.index, draft)}
      onDelete={() => handleDelete(panel.index)}
      onClose={() => setPanel({ open: false })}
    />
  ) : null;

  return (
    <ExpressLayout {...frame} overlay={overlay}>
      {steps.length === 0 ? (
        <Pressable onPress={() => openAdd()} style={[styles.emptyAdd, { borderColor: "rgba(206,255,0,0.35)" }]}>
          <View style={[styles.emptyAddIcon, { backgroundColor: theme.primary }]}>
            <Ionicons name="add" size={20} color={theme.buttonTextOnPrimary} />
          </View>
          <Text style={[styles.emptyAddTitle, { color: theme.text }]}>Ajouter la liste de coups</Text>
        </Pressable>
      ) : (
        <View style={expressStyles.section}>
          <View style={styles.listHeader}>
            <SectionLabel>Coups</SectionLabel>
            <View style={styles.legend}>
              {players.map((p) => (
                <View key={p} style={styles.legendItem}>
                  <PlayerBadge player={p} size={12} />
                  <Text style={[styles.legendText, { color: theme.secondaryText }]}>Joueur {p}</Text>
                </View>
              ))}
            </View>
          </View>
          {steps.map((step, index) => {
            const invalid = invalidIds.has(step.id);
            return (
              <Pressable
                key={step.id}
                onPress={() => setPanel({ open: true, mode: "edit", index, key: createId() })}
                accessibilityLabel={`Modifier le coup ${index + 1}`}
                style={[styles.stepRow, { backgroundColor: theme.surface, borderColor: invalid ? theme.danger : theme.border }]}
              >
                <Text style={[styles.stepNumber, { color: theme.secondaryText }]}>{index + 1}</Text>
                <PlayerBadge player={step.player} size={30} />
                <View style={styles.flex}>
                  <Text style={[styles.stepShot, { color: theme.text }]}>{shotLabel(step.shot)}</Text>
                  <Text style={[styles.stepMeta, { color: invalid ? theme.danger : theme.secondaryText }]}>
                    {invalid
                      ? "À corriger · touche pour modifier"
                      : [
                          step.fromSide ? FROM_SIDE_LABELS[step.fromSide] : null,
                          step.direction ? directionLabel(step.direction) : "Sans direction",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDelete(index)}
                  accessibilityLabel={`Supprimer le coup ${index + 1}`}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={17} color={theme.secondaryText} />
                </Pressable>
              </Pressable>
            );
          })}
          <Pressable onPress={() => openAdd()} style={expressStyles.addMore}>
            <Text style={[expressStyles.addMoreText, { color: theme.primary }]}>+ Ajouter un coup</Text>
          </Pressable>
          {invalidIds.size > 0 ? (
            <Text style={[expressStyles.errorText, { color: theme.danger }]}>
              Certains coups ne peuvent plus suivre le coup précédent : corrige-les pour valider.
            </Text>
          ) : null}
        </View>
      )}

      {steps.length > 0 ? (
        <View style={expressStyles.section}>
          <SectionLabel>À la fin de la séquence</SectionLabel>
          <View style={expressStyles.twoCols}>
            {ENDING_OPTIONS.map((option) => (
              <OptionCard
                key={option.value}
                compact
                selected={sequenceEnding(sequence) === option.value}
                label={option.label}
                hint={option.hint}
                onPress={() => onChange({ ...sequence, ending: option.value })}
              />
            ))}
          </View>
        </View>
      ) : null}
    </ExpressLayout>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  emptyAdd: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    backgroundColor: "rgba(206,255,0,0.03)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
  },
  emptyAddIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyAddTitle: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendText: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 2,
  },
  stepNumber: {
    width: 18,
    textAlign: "center",
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
  stepShot: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
  },
  stepMeta: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
