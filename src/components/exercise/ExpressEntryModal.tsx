import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CourtIcon } from "@/src/components/exercise/CourtIcon";
import { PlayerBadge } from "@/src/components/exercise/PlayerBadge";
import { ShotDraft, ShotPicker } from "@/src/components/exercise/ShotPicker";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { ExerciseSequence, SequenceEnding, SequencePlayer } from "@/src/types/index";
import {
  MAX_SHUTTLES_PER_ROUND,
  MIN_SHUTTLES_PER_ROUND,
  clampShuttles,
  createEmptySequence,
  directionLabel,
  findInvalidStepIds,
  generateSequenceText,
  isSequenceValid,
  nextPlayer,
  sequenceEnding,
  sequencePlayers,
  shotLabel,
  shuttlesPerRound,
  withDistribution,
} from "@/src/utils/exerciseSequence";
import { createId } from "@/src/utils/id";

interface ExpressEntryModalProps {
  visible: boolean;
  playersCount: number;
  /** Séquence existante à modifier ; absente = nouvelle saisie. */
  initialSequence?: ExerciseSequence;
  onValidate: (sequence: ExerciseSequence) => void;
  onClose: () => void;
}

/**
 * Modale « Saisie express » ouverte depuis le formulaire d'exercice : type
 * d'exercice, distribution, liste de coups (panneau ShotPicker), fin de
 * séquence ou volants par passage, aperçu du texte ajouté à la description.
 *
 * Travaille sur une copie : rien n'est appliqué au formulaire avant
 * « Valider ». Le formulaire se charge ensuite d'ajouter le texte à la
 * description (applyGeneratedText).
 */
export function ExpressEntryModal({ visible, ...props }: ExpressEntryModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={props.onClose}>
      {/* Contenu remonté à chaque ouverture pour repartir de la séquence du formulaire. */}
      {visible ? <ExpressEntryContent {...props} /> : null}
    </Modal>
  );
}

type PanelState =
  | { open: false }
  | { open: true; mode: "add"; index: number; initial: Partial<ShotDraft> & { player: SequencePlayer }; key: string }
  | { open: true; mode: "edit"; index: number; key: string };

const ENDING_OPTIONS: readonly { value: SequenceEnding; label: string; hint: string }[] = [
  { value: "boucle", label: "↻ En boucle", hint: "On reprend au coup 1" },
  { value: "finir_point", label: "Finir le point", hint: "Jeu libre ensuite" },
];

function ExpressEntryContent({
  playersCount,
  initialSequence,
  onValidate,
  onClose,
}: Omit<ExpressEntryModalProps, "visible">) {
  const { theme } = useAppTheme();
  const [sequence, setSequence] = useState<ExerciseSequence>(initialSequence ?? createEmptySequence());
  const [panel, setPanel] = useState<PanelState>({ open: false });

  const steps = sequence.steps;
  const players = sequencePlayers(playersCount);
  const invalidIds = new Set(findInvalidStepIds(steps, playersCount));
  const preview = generateSequenceText(sequence);
  const canValidate = isSequenceValid(sequence, playersCount);

  function setSteps(next: typeof steps) {
    setSequence((prev) => ({ ...prev, steps: next }));
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
    const next = [...steps, { id: createId(), ...draft }];
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

  function setEnding(ending: SequenceEnding) {
    setSequence((prev) => ({ ...prev, ending }));
  }

  function changeShuttles(delta: number) {
    setSequence((prev) => ({ ...prev, shuttlesPerRound: clampShuttles(shuttlesPerRound(prev) + delta) }));
  }

  const shuttles = shuttlesPerRound(sequence);
  const editedStep = panel.open && panel.mode === "edit" ? steps[panel.index] : undefined;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          accessibilityLabel="Fermer la saisie express"
          style={[styles.iconButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <Ionicons name="close" size={18} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitle}>
          <CourtIcon size={18} color={theme.primary} strokeWidth={1.8} />
          <Text style={[styles.headerText, { color: theme.text }]}>Saisie express</Text>
        </View>
        <View style={styles.iconButtonSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={[styles.title, { color: theme.text }]}>Schéma de jeu</Text>
          <Text style={[styles.introText, { color: theme.secondaryText }]}>
            Choisis le type d'exercice puis les coups. Le schéma et la description sont générés pour toi.
          </Text>
        </View>

        {/* Type d'exercice — « Poste fixe » arrivera avec son ticket dédié. */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>Type d'exercice</Text>
          <OptionCard selected label="Séquence de coups" hint="Chaque coup, dans l'ordre" onPress={() => {}} />
        </View>

        {/* Distribution */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>Distribution</Text>
          <View style={styles.twoCols}>
            <OptionCard
              selected={sequence.distribution === "volant_continu"}
              label="Volant continu"
              hint="Le volant reste en jeu"
              onPress={() => setSequence((prev) => withDistribution(prev, "volant_continu"))}
            />
            <OptionCard
              selected={sequence.distribution === "multivolant"}
              label="Multivolant"
              hint="Distribution de piles de volants"
              onPress={() => setSequence((prev) => withDistribution(prev, "multivolant"))}
            />
          </View>
        </View>

        {/* Coups */}
        {steps.length === 0 ? (
          <Pressable
            onPress={() => openAdd()}
            style={[styles.emptyAdd, { borderColor: "rgba(206,255,0,0.35)" }]}
          >
            <View style={[styles.emptyAddIcon, { backgroundColor: theme.primary }]}>
              <Ionicons name="add" size={20} color={theme.buttonTextOnPrimary} />
            </View>
            <Text style={[styles.emptyAddTitle, { color: theme.text }]}>Ajouter la liste de coups</Text>
          </Pressable>
        ) : (
          <View style={styles.section}>
            <View style={styles.listHeader}>
              <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>Coups</Text>
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
                  style={[
                    styles.stepRow,
                    { backgroundColor: theme.surface, borderColor: invalid ? theme.danger : theme.border },
                  ]}
                >
                  <Text style={[styles.stepNumber, { color: theme.secondaryText }]}>{index + 1}</Text>
                  <PlayerBadge player={step.player} size={30} />
                  <View style={styles.flex}>
                    <Text style={[styles.stepShot, { color: theme.text }]}>{shotLabel(step.shot)}</Text>
                    <Text style={[styles.stepMeta, { color: invalid ? theme.danger : theme.secondaryText }]}>
                      {invalid
                        ? "À corriger · touche pour modifier"
                        : step.direction
                          ? directionLabel(step.direction)
                          : "Sans direction"}
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
            <Pressable onPress={() => openAdd()} style={[styles.addMore, { borderColor: "rgba(206,255,0,0.35)" }]}>
              <Text style={[styles.addMoreText, { color: theme.primary }]}>+ Ajouter un coup</Text>
            </Pressable>
            {invalidIds.size > 0 ? (
              <Text style={[styles.errorText, { color: theme.danger }]}>
                Certains coups ne peuvent plus suivre le coup précédent : corrige-les pour valider.
              </Text>
            ) : null}
          </View>
        )}

        {/* Fin de séquence / volants par passage */}
        {steps.length > 0 && sequence.distribution === "volant_continu" ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>À la fin de la séquence</Text>
            <View style={styles.twoCols}>
              {ENDING_OPTIONS.map((option) => (
                <OptionCard
                  key={option.value}
                  compact
                  selected={sequenceEnding(sequence) === option.value}
                  label={option.label}
                  hint={option.hint}
                  onPress={() => setEnding(option.value)}
                />
              ))}
            </View>
          </View>
        ) : null}
        {steps.length > 0 && sequence.distribution === "multivolant" ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>Volants par passage</Text>
            <View style={[styles.counterRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Pressable
                onPress={() => changeShuttles(-1)}
                disabled={shuttles <= MIN_SHUTTLES_PER_ROUND}
                accessibilityLabel="Un volant de moins"
                style={[styles.counterButton, { borderColor: theme.border, opacity: shuttles <= MIN_SHUTTLES_PER_ROUND ? 0.35 : 1 }]}
              >
                <Ionicons name="remove" size={20} color={theme.text} />
              </Pressable>
              <Text style={[styles.counterValue, { color: theme.text }]}>{shuttles}</Text>
              <Pressable
                onPress={() => changeShuttles(1)}
                disabled={shuttles >= MAX_SHUTTLES_PER_ROUND}
                accessibilityLabel="Un volant de plus"
                style={[styles.counterButton, { borderColor: theme.border, opacity: shuttles >= MAX_SHUTTLES_PER_ROUND ? 0.35 : 1 }]}
              >
                <Ionicons name="add" size={20} color={theme.text} />
              </Pressable>
            </View>
            <Text style={[styles.introText, { color: theme.secondaryText }]}>
              La séquence se répète jusqu'à épuisement de la pile.
            </Text>
          </View>
        ) : null}

        {/* Aperçu */}
        {preview ? (
          <View style={styles.preview}>
            <Text style={[styles.previewLabel, { color: theme.primary }]}>Ajouté à la description</Text>
            <Text style={[styles.previewText, { color: theme.text }]}>{preview}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <PrimaryButton label="Valider" onPress={() => onValidate(sequence)} disabled={!canValidate} />
      </View>

      {panel.open ? (
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
      ) : null}
    </SafeAreaView>
  );
}

function OptionCard({
  label,
  hint,
  selected,
  onPress,
  compact = false,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityState={{ selected }}
      style={[
        styles.optionCard,
        compact ? styles.optionCardCompact : null,
        {
          borderColor: selected ? theme.primary : theme.border,
          backgroundColor: selected ? "rgba(206,255,0,0.08)" : theme.surface,
        },
      ]}
    >
      <Text style={[styles.optionLabel, { color: selected ? theme.primary : theme.text }, compact ? styles.centerText : null]}>
        {label}
      </Text>
      <Text style={[styles.optionHint, { color: theme.secondaryText }, compact ? styles.centerText : null]}>
        {hint}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerText: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonSpacer: {
    width: 44,
  },
  scroll: {
    padding: 20,
    gap: 22,
  },
  intro: {
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.displayExtraBold,
    letterSpacing: -0.4,
  },
  introText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: fonts.bodyRegular,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  twoCols: {
    flexDirection: "row",
    gap: 8,
  },
  optionCard: {
    flex: 1,
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
    gap: 2,
  },
  optionCardCompact: {
    minHeight: 52,
    alignItems: "center",
  },
  optionLabel: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  optionHint: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },
  centerText: {
    textAlign: "center",
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
  flex: {
    flex: 1,
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
  addMore: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addMoreText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  errorText: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  counterValue: {
    fontSize: 22,
    fontFamily: fonts.displayExtraBold,
  },
  preview: {
    borderWidth: 1,
    borderColor: "rgba(206,255,0,0.2)",
    backgroundColor: "rgba(206,255,0,0.05)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  previewLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  previewText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: fonts.bodyRegular,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
});
