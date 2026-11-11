import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SequenceBuilder } from "@/src/components/exercise/SequenceBuilder";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { WizardProgress } from "@/src/components/WizardProgress";
import { DEFAULT_LABELS } from "@/src/data/exerciseData";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { Exercise, ExerciseSequence } from "@/src/types/index";
import {
  createEmptySequence,
  isSequenceValid,
  normalizeRoles,
} from "@/src/utils/exerciseSequence";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExercisePayload = Omit<Exercise, "id" | "createdAt">;

type WizardStep = "infos" | "sequence" | "details";

interface ExerciseFormProps {
  mode: "create" | "edit";
  initialData?: Partial<Exercise>;
  customLabels: string[];
  onAddCustomLabel: (label: string) => Promise<void>;
  onSave: (data: ExercisePayload) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

// ─── Field card ──────────────────────────────────────────────────────────────

function FieldCard({
  label,
  focused = false,
  style,
  children,
}: {
  label: string;
  focused?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        fieldStyles.card,
        {
          backgroundColor: theme.surface,
          borderColor: focused ? "rgba(206,255,0,0.35)" : theme.border,
        },
        style,
      ]}
    >
      <Text
        style={[
          fieldStyles.label,
          { color: focused ? theme.primary : theme.secondaryText },
        ]}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});

// ─── Chip ────────────────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onPress,
  accent = "cyan",
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accent?: "cyan" | "green";
  style?: object;
}) {
  const { theme } = useAppTheme();
  const borderColor =
    selected
      ? accent === "cyan"
        ? theme.accent3
        : theme.primary
      : theme.border;
  const bgColor =
    selected
      ? accent === "cyan"
        ? "rgba(0,229,255,0.08)"
        : theme.primaryMuted
      : theme.surfaceAlt;
  const textColor =
    selected
      ? accent === "cyan"
        ? theme.accent3
        : theme.primary
      : theme.secondaryText;

  return (
    <Pressable
      onPress={onPress}
      style={[
        chipStyles.chip,
        { backgroundColor: bgColor, borderColor },
        style,
      ]}
    >
      <Text style={[chipStyles.text, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 11,
    fontFamily: fonts.displayBold,
  },
});

// ─── Main form ───────────────────────────────────────────────────────────────

/**
 * Wizard de création / édition d'exercice (v1.4.1) :
 *   1. Infos — nom, description, nombre de joueurs, labels (obligatoires)
 *   2. Séquence de jeu — optionnelle, uniquement à partir de 2 joueurs
 *      (pas d'alternance possible en solo), « Passer » mène à l'étape 3
 *   3. Détails optionnels — durée, niveau, variantes, photos… puis enregistrement
 *
 * En édition, « Enregistrer » reste accessible dans l'en-tête à chaque étape
 * pour ne pas imposer tout le parcours pour une petite correction.
 */
export function ExerciseForm({
  mode,
  initialData,
  customLabels,
  onAddCustomLabel,
  onSave,
  onCancel,
  isSaving,
}: ExerciseFormProps) {
  const { theme } = useAppTheme();

  // ── Required fields ──
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [playersCount, setPlayersCount] = useState<1 | 2 | 3 | 4 | null>(
    initialData?.playersCount ?? null,
  );
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    initialData?.labels ?? [],
  );

  // ── Séquence de jeu ──
  const [sequence, setSequence] = useState<ExerciseSequence>(() =>
    initialData?.sequence
      ? {
          ...initialData.sequence,
          roles: normalizeRoles(initialData.sequence.roles, initialData.playersCount ?? 2),
        }
      : createEmptySequence(initialData?.playersCount ?? 2),
  );

  // ── Optional fields ──
  const [durationMinutes, setDurationMinutes] = useState(
    initialData?.durationMinutes?.toString() ?? "",
  );
  const [level, setLevel] = useState<Exercise["level"]>(initialData?.level);
  const [orientation, setOrientation] = useState<Exercise["orientation"]>(
    initialData?.orientation,
  );
  const [attentionPoints, setAttentionPoints] = useState(
    initialData?.attentionPoints ?? "",
  );
  const [variantEasier, setVariantEasier] = useState(
    initialData?.variantEasier ?? "",
  );
  const [variantHarder, setVariantHarder] = useState(
    initialData?.variantHarder ?? "",
  );
  const [source, setSource] = useState(initialData?.source ?? "");
  const [photos, setPhotos] = useState<string[]>(initialData?.photos ?? []);

  // ── UI state ──
  const [step, setStep] = useState<WizardStep>("infos");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  const [newLabelInput, setNewLabelInput] = useState("");

  // ── Derived ──
  const allLabels = [...DEFAULT_LABELS, ...customLabels];
  const isInfosValid =
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    playersCount !== null &&
    selectedLabels.length > 0;
  const hasSequenceStep = playersCount !== null && playersCount >= 2;
  const steps: WizardStep[] = hasSequenceStep
    ? ["infos", "sequence", "details"]
    : ["infos", "details"];
  const stepIndex = Math.max(0, steps.indexOf(step));
  const hasSequenceSteps = hasSequenceStep && sequence.steps.length > 0;
  // Une séquence vide équivaut à « pas de séquence » ; une séquence entamée
  // doit être cohérente (aucun coup impossible, nombre de répétitions valide).
  const isSequenceStepValid =
    !hasSequenceSteps || (playersCount !== null && isSequenceValid(sequence, playersCount));
  const isValid = isInfosValid && isSequenceStepValid;

  // ── Handlers ──
  function toggleLabel(label: string) {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  }

  function handlePlayersCount(n: 1 | 2 | 3 | 4) {
    setPlayersCount(n);
    // Les rôles suivent le nombre de joueurs ; les coups d'un joueur retiré
    // restent visibles et signalés comme à corriger (findInvalidStepIds).
    setSequence((prev) => ({ ...prev, roles: normalizeRoles(prev.roles, n) }));
  }

  function goTo(target: WizardStep) {
    setFocusedField(null);
    setStep(target);
  }

  function goBack() {
    if (stepIndex === 0) {
      onCancel();
      return;
    }
    goTo(steps[stepIndex - 1]);
  }

  function goNext() {
    const next = steps[stepIndex + 1];
    if (next) goTo(next);
  }

  async function handleAddCustomLabel() {
    const trimmed = newLabelInput.trim();
    if (!trimmed || allLabels.includes(trimmed)) {
      setLabelModalVisible(false);
      setNewLabelInput("");
      return;
    }
    await onAddCustomLabel(trimmed);
    setSelectedLabels((prev) => [...prev, trimmed]);
    setNewLabelInput("");
    setLabelModalVisible(false);
  }

  async function handleAddPhoto() {
    if (photos.length >= 3) return;
    // Le sélecteur système Android (Photo Picker) est utilisé directement :
    // aucune permission d'accès à la galerie n'est nécessaire pour cet usage.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }

  async function handleSave() {
    if (!isValid || isSaving || playersCount === null) return;

    const payload: ExercisePayload = {
      name: name.trim(),
      description: description.trim(),
      playersCount,
      labels: selectedLabels,
      ...(durationMinutes.trim()
        ? { durationMinutes: parseInt(durationMinutes, 10) }
        : {}),
      ...(level ? { level } : {}),
      ...(orientation ? { orientation } : {}),
      ...(attentionPoints.trim() ? { attentionPoints: attentionPoints.trim() } : {}),
      ...(variantEasier.trim() ? { variantEasier: variantEasier.trim() } : {}),
      ...(variantHarder.trim() ? { variantHarder: variantHarder.trim() } : {}),
      ...(source.trim() ? { source: source.trim() } : {}),
      ...(photos.length > 0 ? { photos } : {}),
      // Clé toujours présente : en édition, updateExercise fusionne les champs,
      // `undefined` explicite est donc nécessaire pour retirer une séquence.
      sequence: hasSequenceSteps
        ? { ...sequence, roles: normalizeRoles(sequence.roles, playersCount) }
        : undefined,
    };

    await onSave(payload);
  }

  // ── Render ──
  const stepSubtitle =
    step === "infos"
      ? "Les champs marqués * sont obligatoires"
      : step === "sequence"
        ? "Qui joue quoi, dans quel ordre"
        : "Durée, niveau, variantes, photos…";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerTopRow}>
            <Pressable onPress={goBack} style={styles.backRow} hitSlop={8}>
              <Ionicons name="chevron-back" size={16} color={theme.secondaryText} />
              <Text style={[styles.backText, { color: theme.secondaryText }]}>
                {stepIndex === 0 ? "Mes exercices" : "Retour"}
              </Text>
            </Pressable>
            {mode === "edit" && stepIndex < steps.length - 1 ? (
              <Pressable
                onPress={handleSave}
                disabled={!isValid || isSaving}
                hitSlop={8}
                style={styles.headerSave}
              >
                <Text
                  style={[
                    styles.headerSaveText,
                    { color: theme.primary, opacity: !isValid || isSaving ? 0.4 : 1 },
                  ]}
                >
                  Enregistrer
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={[styles.title, { color: theme.text }]}>
            {mode === "create" ? "Nouvel exercice" : "Modifier l'exercice"}
          </Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{stepSubtitle}</Text>
          <View style={styles.progress}>
            <WizardProgress step={stepIndex + 1} total={steps.length} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {step === "infos" ? (
            <>
              {/* ── Nom ── */}
              <FieldCard label="Nom *" focused={focusedField === "name"}>
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ex: Routine smash croisé + block"
                  placeholderTextColor={theme.secondaryText}
                  maxLength={60}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  returnKeyType="next"
                />
                <Text style={[styles.charCount, { color: theme.secondaryText }]}>
                  {name.length}/60
                </Text>
              </FieldCard>

              {/* ── Description ── */}
              <FieldCard label="Description *" focused={focusedField === "desc"}>
                <TextInput
                  style={[styles.textInput, styles.multilineInput, { color: theme.text }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Décris le déroulé de l'exercice..."
                  placeholderTextColor={theme.secondaryText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  onFocus={() => setFocusedField("desc")}
                  onBlur={() => setFocusedField(null)}
                />
              </FieldCard>

              {/* ── Nombre de joueurs ── */}
              <FieldCard label="Nombre de joueurs *">
                <View style={styles.chipsRow}>
                  {([1, 2, 3, 4] as const).map((n) => (
                    <Chip
                      key={n}
                      label={String(n)}
                      selected={playersCount === n}
                      onPress={() => handlePlayersCount(n)}
                      accent="cyan"
                    />
                  ))}
                </View>
              </FieldCard>

              {/* ── Labels ── */}
              <FieldCard label="Ce que ça travaille *">
                <View style={styles.tagsGrid}>
                  {allLabels.map((label) => (
                    <Chip
                      key={label}
                      label={label}
                      selected={selectedLabels.includes(label)}
                      onPress={() => toggleLabel(label)}
                      accent="green"
                    />
                  ))}
                  <Pressable
                    onPress={() => setLabelModalVisible(true)}
                    style={[
                      chipStyles.chip,
                      styles.addLabelChip,
                      { borderColor: theme.border, backgroundColor: theme.surfaceAlt },
                    ]}
                  >
                    <Ionicons name="add" size={13} color={theme.secondaryText} />
                    <Text style={[chipStyles.text, { color: theme.secondaryText }]}>
                      Ajouter
                    </Text>
                  </Pressable>
                </View>
              </FieldCard>
            </>
          ) : null}

          {step === "sequence" && playersCount !== null ? (
            <>
              <View style={styles.stepIntro}>
                <View style={styles.stepTitleRow}>
                  <Text style={[styles.stepTitle, { color: theme.text }]}>Séquence de jeu</Text>
                  <View style={[styles.optionalBadge, { backgroundColor: theme.surfaceAlt }]}>
                    <Text style={[styles.optionalBadgeText, { color: theme.tertiaryText }]}>
                      Optionnel
                    </Text>
                  </View>
                </View>
                <Text style={[styles.stepDescription, { color: theme.secondaryText }]}>
                  Décris l'enchaînement des coups entre les joueurs. Un schéma du terrain sera
                  généré sur la fiche de l'exercice.
                </Text>
              </View>
              <SequenceBuilder
                playersCount={playersCount}
                value={sequence}
                onChange={setSequence}
              />
            </>
          ) : null}

          {step === "details" ? (
            <>
              {/* Durée + Niveau côte à côte */}
              <View style={styles.row}>
                <FieldCard
                  label="Durée (min)"
                  focused={focusedField === "duration"}
                  style={styles.flex1}
                >
                  <TextInput
                    style={[styles.textInput, { color: theme.text }]}
                    value={durationMinutes}
                    onChangeText={(t) => setDurationMinutes(t.replace(/[^0-9]/g, ""))}
                    placeholder="10"
                    placeholderTextColor={theme.secondaryText}
                    keyboardType="numeric"
                    maxLength={3}
                    onFocus={() => setFocusedField("duration")}
                    onBlur={() => setFocusedField(null)}
                  />
                </FieldCard>

                <View style={[styles.flex1]}>
                  <FieldCard label="Niveau">
                    <View style={styles.chipsRow}>
                      {(
                        [
                          { value: "debutant" as const, label: "Déb." },
                          { value: "intermediaire" as const, label: "Inter." },
                          { value: "avance" as const, label: "Avancé" },
                        ] as const
                      ).map((opt) => (
                        <Chip
                          key={opt.value}
                          label={opt.label}
                          selected={level === opt.value}
                          onPress={() =>
                            setLevel((v) => (v === opt.value ? undefined : opt.value))
                          }
                          accent="cyan"
                          style={styles.smallChip}
                        />
                      ))}
                    </View>
                  </FieldCard>
                </View>
              </View>

              {/* Orientation */}
              <FieldCard label="Orientation">
                <View style={styles.chipsRow}>
                  {(
                    [
                      { value: "simple" as const, label: "Simple" },
                      { value: "double" as const, label: "Double" },
                      { value: "mixte" as const, label: "Mixte" },
                    ] as const
                  ).map((opt) => (
                    <Chip
                      key={opt.value}
                      label={opt.label}
                      selected={orientation === opt.value}
                      onPress={() =>
                        setOrientation((v) => (v === opt.value ? undefined : opt.value))
                      }
                      accent="cyan"
                    />
                  ))}
                </View>
              </FieldCard>

              {/* Points d'attention */}
              <FieldCard
                label="Points d'attention"
                focused={focusedField === "attention"}
              >
                <TextInput
                  style={[styles.textInput, styles.multilineInput, { color: theme.text }]}
                  value={attentionPoints}
                  onChangeText={setAttentionPoints}
                  placeholder="Erreurs fréquentes, clés techniques..."
                  placeholderTextColor={theme.secondaryText}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  onFocus={() => setFocusedField("attention")}
                  onBlur={() => setFocusedField(null)}
                />
              </FieldCard>

              {/* Variantes côte à côte */}
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <FieldCard label="+ Simple" focused={focusedField === "easier"}>
                    <TextInput
                      style={[styles.textInput, { color: theme.text }]}
                      value={variantEasier}
                      onChangeText={setVariantEasier}
                      placeholder="Variante..."
                      placeholderTextColor={theme.secondaryText}
                      onFocus={() => setFocusedField("easier")}
                      onBlur={() => setFocusedField(null)}
                    />
                  </FieldCard>
                </View>
                <View style={styles.flex1}>
                  <FieldCard label="+ Difficile" focused={focusedField === "harder"}>
                    <TextInput
                      style={[styles.textInput, { color: theme.text }]}
                      value={variantHarder}
                      onChangeText={setVariantHarder}
                      placeholder="Variante..."
                      placeholderTextColor={theme.secondaryText}
                      onFocus={() => setFocusedField("harder")}
                      onBlur={() => setFocusedField(null)}
                    />
                  </FieldCard>
                </View>
              </View>

              {/* Source */}
              <FieldCard label="Source" focused={focusedField === "source"}>
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  value={source}
                  onChangeText={setSource}
                  placeholder="Coach, YouTube, entraînement..."
                  placeholderTextColor={theme.secondaryText}
                  onFocus={() => setFocusedField("source")}
                  onBlur={() => setFocusedField(null)}
                />
              </FieldCard>

              {/* Photos */}
              <View style={styles.photosSection}>
                {photos.length > 0 ? (
                  <View style={styles.photosRow}>
                    {photos.map((uri, idx) => (
                      <View key={uri} style={styles.photoThumb}>
                        <Image source={{ uri }} style={styles.photoImg} />
                        <Pressable
                          onPress={() =>
                            setPhotos((prev) => prev.filter((_, i) => i !== idx))
                          }
                          style={[
                            styles.photoDelete,
                            { backgroundColor: theme.danger },
                          ]}
                          hitSlop={4}
                        >
                          <Ionicons name="close" size={10} color="#fff" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}

                {photos.length < 3 ? (
                  <Pressable
                    onPress={handleAddPhoto}
                    style={[
                      styles.photoAddBtn,
                      {
                        borderColor: "rgba(255,255,255,0.1)",
                        backgroundColor: theme.surfaceAlt,
                      },
                    ]}
                  >
                    <Ionicons name="camera-outline" size={16} color={theme.secondaryText} />
                    <Text style={[styles.photoAddText, { color: theme.secondaryText }]}>
                      {photos.length === 0
                        ? "Ajouter une photo"
                        : `Ajouter (${photos.length}/3)`}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}
        >
          {step === "infos" ? (
            <PrimaryButton label="Continuer →" onPress={goNext} disabled={!isInfosValid} />
          ) : null}
          {step === "sequence" ? (
            <View style={styles.footerRow}>
              {!hasSequenceSteps ? (
                <PrimaryButton label="Passer" tone="secondary" onPress={goNext} />
              ) : null}
              <View style={styles.flex1}>
                <PrimaryButton
                  label="Continuer →"
                  onPress={goNext}
                  disabled={!hasSequenceSteps || !isSequenceStepValid}
                />
              </View>
            </View>
          ) : null}
          {step === "details" ? (
            <PrimaryButton
              label={isSaving ? "Enregistrement..." : "Enregistrer l'exercice"}
              onPress={handleSave}
              disabled={!isValid || isSaving}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>

      {/* ── Custom label modal ── */}
      <Modal
        visible={labelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLabelModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setLabelModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Nouveau label
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={newLabelInput}
              onChangeText={setNewLabelInput}
              placeholder="Ex : Revers, Lob, Placement..."
              placeholderTextColor={theme.secondaryText}
              maxLength={30}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddCustomLabel}
            />
            <View style={styles.modalButtons}>
              <PrimaryButton
                label="Annuler"
                onPress={() => {
                  setNewLabelInput("");
                  setLabelModalVisible(false);
                }}
                tone="secondary"
              />
              <View style={styles.flex1}>
                <PrimaryButton
                  label="Ajouter"
                  onPress={handleAddCustomLabel}
                  disabled={newLabelInput.trim().length === 0}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 2,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerSave: {
    minHeight: 32,
    justifyContent: "center",
  },
  headerSaveText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
  },
  progress: {
    marginTop: 10,
  },
  stepIntro: {
    gap: 8,
    marginBottom: 6,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepTitle: {
    fontSize: 26,
    fontFamily: fonts.displayExtraBold,
    letterSpacing: -0.4,
  },
  optionalBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  optionalBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: fonts.bodyRegular,
  },
  footerRow: {
    flexDirection: "row",
    gap: 10,
  },
  backText: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.displayExtraBold,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: fonts.bodyRegular,
    marginTop: 2,
  },
  scroll: {
    padding: 16,
    gap: 10,
  },
  textInput: {
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
    padding: 0,
    margin: 0,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 10,
    fontFamily: fonts.bodyRegular,
    textAlign: "right",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  addLabelChip: {
    flexDirection: "row",
    gap: 3,
    borderStyle: "dashed",
  },
  smallChip: {
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  photosSection: {
    gap: 8,
  },
  photosRow: {
    flexDirection: "row",
    gap: 8,
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  photoImg: {
    width: "100%",
    height: "100%",
  },
  photoDelete: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  photoAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 10,
    height: 52,
  },
  photoAddText: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  bottomSpacer: {
    height: 8,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: fonts.displayBold,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
});
