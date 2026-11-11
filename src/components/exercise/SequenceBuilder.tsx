import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PlayerBadge } from "@/src/components/exercise/PlayerBadge";
import { ShotDraft, ShotPickerSheet } from "@/src/components/exercise/ShotPickerSheet";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { ExerciseSequence, SequenceEnding, SequencePlayer, SequenceRole } from "@/src/types/index";
import {
  MAX_SEQUENCE_REPETITIONS,
  directionLabel,
  findInvalidStepIds,
  nextPlayer,
  sequencePlayers,
  sequencePreview,
  shotLabel,
} from "@/src/utils/exerciseSequence";
import { createId } from "@/src/utils/id";

interface SequenceBuilderProps {
  playersCount: number;
  value: ExerciseSequence;
  onChange: (next: ExerciseSequence) => void;
}

type SheetState =
  | { open: false }
  | { open: true; mode: "add"; index: number; player: SequencePlayer; key: string }
  | { open: true; mode: "edit"; index: number; key: string };

const ENDING_OPTIONS: readonly { value: SequenceEnding; label: string }[] = [
  { value: "boucle", label: "↻ En boucle" },
  { value: "repetitions", label: "× N fois" },
  { value: "jeu_libre", label: "Puis jeu libre" },
];

const DEFAULT_REPETITIONS = 3;

/**
 * Contenu de l'étape « Séquence de jeu » du wizard d'exercice : rôles,
 * distribution, liste des coups (ajout / modification / suppression via le
 * panneau ShotPickerSheet), fin de séquence et aperçu texte.
 *
 * Composant contrôlé : la séquence vit dans ExerciseForm, qui décide de
 * l'enregistrer ou non. L'aperçu texte est recalculé à chaque rendu et n'est
 * jamais écrit dans la description de l'exercice.
 */
export function SequenceBuilder({ playersCount, value, onChange }: SequenceBuilderProps) {
  const { theme } = useAppTheme();
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const [repetitionsInput, setRepetitionsInput] = useState(
    value.repetitions ? String(value.repetitions) : String(DEFAULT_REPETITIONS),
  );

  const players = sequencePlayers(playersCount);
  const invalidIds = new Set(findInvalidStepIds(value.steps, playersCount));
  const preview = sequencePreview(value);

  function setRole(player: SequencePlayer, role: SequenceRole) {
    onChange({ ...value, roles: { ...value.roles, [player]: role } });
  }

  function openAdd() {
    const index = value.steps.length;
    setSheet({
      open: true,
      mode: "add",
      index,
      player: nextPlayer(value.steps, value.roles, playersCount, index),
      key: createId(),
    });
  }

  function handleSubmit(draft: ShotDraft, { next }: { next: boolean }) {
    if (!sheet.open) return;
    if (sheet.mode === "add") {
      const steps = [...value.steps, { id: createId(), ...draft }];
      onChange({ ...value, steps });
      if (next) {
        // Le panneau reste ouvert, réinitialisé pour le coup suivant avec le
        // joueur alterné (calculé sur la séquence qui inclut le coup ajouté).
        setSheet({
          open: true,
          mode: "add",
          index: steps.length,
          player: nextPlayer(steps, value.roles, playersCount, steps.length),
          key: createId(),
        });
      } else {
        setSheet({ open: false });
      }
      return;
    }
    const steps = value.steps.map((step, i) =>
      i === sheet.index ? { id: step.id, ...draft } : step,
    );
    onChange({ ...value, steps });
    setSheet({ open: false });
  }

  function deleteStep(index: number) {
    onChange({ ...value, steps: value.steps.filter((_, i) => i !== index) });
    setSheet({ open: false });
  }

  function setEnding(ending: SequenceEnding) {
    if (ending === "repetitions") {
      const n = parseInt(repetitionsInput, 10);
      onChange({ ...value, ending, repetitions: Number.isFinite(n) && n > 0 ? n : DEFAULT_REPETITIONS });
      if (!(Number.isFinite(n) && n > 0)) setRepetitionsInput(String(DEFAULT_REPETITIONS));
      return;
    }
    const { repetitions: _omit, ...rest } = value;
    onChange({ ...rest, ending });
  }

  function handleRepetitionsChange(text: string) {
    const digits = text.replace(/[^0-9]/g, "").slice(0, 2);
    setRepetitionsInput(digits);
    const n = parseInt(digits, 10);
    onChange({
      ...value,
      ending: "repetitions",
      repetitions: Number.isFinite(n) ? Math.min(n, MAX_SEQUENCE_REPETITIONS) : 0,
    });
  }

  const editedStep = sheet.open && sheet.mode === "edit" ? value.steps[sheet.index] : undefined;

  return (
    <View style={styles.wrapper}>
      {/* ── Rôles ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>
          Rôles · {players.length} joueurs
        </Text>
        {players.map((p) => (
          <View
            key={p}
            style={[styles.roleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.roleName}>
              <PlayerBadge player={p} size={32} />
              <Text style={[styles.roleText, { color: theme.text }]}>Joueur {p}</Text>
            </View>
            <View style={styles.inlineChoices}>
              {(["travaille", "relance"] as const).map((role) => (
                <Choice
                  key={role}
                  label={role === "travaille" ? "Travaille" : "Relance"}
                  selected={(value.roles[p] ?? "relance") === role}
                  onPress={() => setRole(p, role)}
                />
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* ── Distribution ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>Distribution</Text>
        <View style={styles.twoCols}>
          {(
            [
              { value: "echange", label: "Échange", hint: "Le volant reste en jeu" },
              { value: "multivolant", label: "Multivolant", hint: "Distribution au panier" },
            ] as const
          ).map((option) => {
            const selected = value.distribution === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onChange({ ...value, distribution: option.value })}
                accessibilityState={{ selected }}
                style={[
                  styles.distributionCard,
                  {
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: selected ? "rgba(206,255,0,0.08)" : theme.surface,
                  },
                ]}
              >
                <Text
                  style={[styles.distributionTitle, { color: selected ? theme.primary : theme.text }]}
                >
                  {option.label}
                </Text>
                <Text style={[styles.distributionHint, { color: theme.secondaryText }]}>
                  {option.hint}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Coups ── */}
      <View style={styles.section}>
        {value.steps.length === 0 ? (
          <Pressable
            onPress={openAdd}
            style={[styles.emptyAdd, { borderColor: "rgba(206,255,0,0.35)" }]}
          >
            <View style={[styles.emptyAddIcon, { backgroundColor: theme.primary }]}>
              <Ionicons name="add" size={20} color={theme.buttonTextOnPrimary} />
            </View>
            <Text style={[styles.emptyAddTitle, { color: theme.text }]}>Ajouter le premier coup</Text>
            <Text style={[styles.distributionHint, { color: theme.secondaryText }]}>
              Ex. : B sert long, A dégage…
            </Text>
          </Pressable>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>Coups</Text>
            {value.steps.map((step, index) => {
              const invalid = invalidIds.has(step.id);
              return (
                <Pressable
                  key={step.id}
                  onPress={() => setSheet({ open: true, mode: "edit", index, key: createId() })}
                  accessibilityLabel={`Modifier le coup ${index + 1}`}
                  style={[
                    styles.stepRow,
                    {
                      backgroundColor: theme.surface,
                      borderColor: invalid ? theme.danger : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.stepNumber, { color: theme.secondaryText }]}>{index + 1}</Text>
                  <PlayerBadge player={step.player} size={30} />
                  <View style={styles.flex}>
                    <Text style={[styles.stepShot, { color: theme.text }]}>{shotLabel(step.shot)}</Text>
                    <Text
                      style={[
                        styles.stepMeta,
                        { color: invalid ? theme.danger : theme.secondaryText },
                      ]}
                    >
                      {invalid
                        ? "Enchaînement impossible · touche pour corriger"
                        : step.direction
                          ? directionLabel(step.direction)
                          : "Sans direction"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => deleteStep(index)}
                    accessibilityLabel={`Supprimer le coup ${index + 1}`}
                    hitSlop={4}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={17} color={theme.secondaryText} />
                  </Pressable>
                </Pressable>
              );
            })}
            <Pressable
              onPress={openAdd}
              style={[styles.addMore, { borderColor: "rgba(206,255,0,0.35)" }]}
            >
              <Text style={[styles.addMoreText, { color: theme.primary }]}>+ Ajouter un coup</Text>
            </Pressable>
            {invalidIds.size > 0 ? (
              <Text style={[styles.errorText, { color: theme.danger }]}>
                Certains coups ne peuvent plus suivre le coup précédent : corrige-les pour continuer.
              </Text>
            ) : null}
          </>
        )}
      </View>

      {/* ── Ensuite ── */}
      {value.steps.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>Ensuite</Text>
          <View style={styles.threeCols}>
            {ENDING_OPTIONS.map((option) => (
              <View key={option.value} style={styles.flex}>
                <Choice
                  label={option.label}
                  selected={value.ending === option.value}
                  onPress={() => setEnding(option.value)}
                  fill
                />
              </View>
            ))}
          </View>
          {value.ending === "repetitions" ? (
            <View
              style={[styles.repetitionsRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Text style={[styles.roleText, { color: theme.text }]}>Nombre de répétitions</Text>
              <TextInput
                value={repetitionsInput}
                onChangeText={handleRepetitionsChange}
                keyboardType="number-pad"
                maxLength={2}
                placeholder={String(DEFAULT_REPETITIONS)}
                placeholderTextColor={theme.secondaryText}
                style={[
                  styles.repetitionsInput,
                  {
                    color: theme.text,
                    borderColor: (value.repetitions ?? 0) >= 1 ? theme.border : theme.danger,
                    backgroundColor: theme.surfaceAlt,
                  },
                ]}
                accessibilityLabel="Nombre de répétitions"
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ── Aperçu ── */}
      {preview ? (
        <View style={styles.preview}>
          <Text style={[styles.previewLabel, { color: theme.primary }]}>Aperçu</Text>
          <Text style={[styles.previewText, { color: theme.text }]}>{preview}</Text>
        </View>
      ) : null}

      <ShotPickerSheet
        visible={sheet.open}
        contentKey={sheet.open ? sheet.key : "closed"}
        mode={sheet.open ? sheet.mode : "add"}
        index={sheet.open ? sheet.index : 0}
        previousShot={sheet.open && sheet.index > 0 ? value.steps[sheet.index - 1]?.shot : undefined}
        players={players}
        roles={value.roles}
        initial={
          editedStep
            ? editedStep
            : { player: sheet.open && sheet.mode === "add" ? sheet.player : "A" }
        }
        onSubmit={handleSubmit}
        onDelete={sheet.open && sheet.mode === "edit" ? () => deleteStep(sheet.index) : undefined}
        onClose={() => setSheet({ open: false })}
      />
    </View>
  );
}

function Choice({
  label,
  selected,
  onPress,
  fill = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  fill?: boolean;
}) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityState={{ selected }}
      style={[
        styles.choice,
        fill ? styles.choiceFill : null,
        {
          borderColor: selected ? theme.primary : theme.border,
          backgroundColor: selected ? "rgba(206,255,0,0.1)" : "transparent",
        },
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.choiceText, { color: selected ? theme.primary : theme.tertiaryText }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 22,
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
  flex: {
    flex: 1,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  roleName: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  roleText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  inlineChoices: {
    flexDirection: "row",
    gap: 6,
  },
  choice: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceFill: {
    paddingHorizontal: 6,
  },
  choiceText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
  },
  twoCols: {
    flexDirection: "row",
    gap: 8,
  },
  threeCols: {
    flexDirection: "row",
    gap: 8,
  },
  distributionCard: {
    flex: 1,
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
    gap: 2,
  },
  distributionTitle: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  distributionHint: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },
  emptyAdd: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    backgroundColor: "rgba(206,255,0,0.03)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
  repetitionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  repetitionsInput: {
    width: 64,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
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
});
