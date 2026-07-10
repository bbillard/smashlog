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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/src/components/PrimaryButton";
import { DEFAULT_LABELS } from "@/src/data/exerciseData";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { Exercise } from "@/src/types/index";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExercisePayload = Omit<Exercise, "id" | "createdAt">;

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
  children,
}: {
  label: string;
  focused?: boolean;
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
  const hasOptionalData =
    mode === "edit" &&
    !!(
      initialData?.durationMinutes ||
      initialData?.level ||
      initialData?.orientation ||
      initialData?.attentionPoints ||
      initialData?.variantEasier ||
      initialData?.variantHarder ||
      initialData?.source ||
      (initialData?.photos && initialData.photos.length > 0)
    );
  const [accordionOpen, setAccordionOpen] = useState(hasOptionalData);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  const [newLabelInput, setNewLabelInput] = useState("");

  // ── Derived ──
  const allLabels = [...DEFAULT_LABELS, ...customLabels];
  const isValid =
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    playersCount !== null &&
    selectedLabels.length > 0;

  // ── Handlers ──
  function toggleLabel(label: string) {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission requise",
        "L'accès à la galerie est nécessaire pour ajouter des photos.",
      );
      return;
    }
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
    };

    await onSave(payload);
  }

  // ── Render ──
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={onCancel} style={styles.backRow} hitSlop={8}>
            <Ionicons name="chevron-back" size={16} color={theme.secondaryText} />
            <Text style={[styles.backText, { color: theme.secondaryText }]}>
              Mes exercices
            </Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>
            {mode === "create" ? "Nouvel exercice" : "Modifier l'exercice"}
          </Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            Les champs marqués * sont obligatoires
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
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
                  onPress={() => setPlayersCount(n)}
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

          {/* ── Accordion optionnel ── */}
          <Pressable
            onPress={() => setAccordionOpen((v) => !v)}
            style={[
              styles.accordionHead,
              {
                backgroundColor: accordionOpen ? theme.surface : theme.surfaceAlt,
                borderColor: accordionOpen
                  ? "rgba(0,229,255,0.2)"
                  : "rgba(255,255,255,0.1)",
                borderStyle: accordionOpen ? "solid" : "dashed",
              },
            ]}
          >
            <View
              style={[
                styles.accIcon,
                {
                  backgroundColor: "rgba(0,229,255,0.08)",
                  borderColor: "rgba(0,229,255,0.15)",
                },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={15}
                color={theme.accent3}
              />
            </View>
            <View style={styles.accLabelWrap}>
              <Text
                style={[
                  styles.accLabel,
                  { color: accordionOpen ? theme.accent3 : theme.tertiaryText },
                ]}
              >
                Détails optionnels
              </Text>
              {!accordionOpen ? (
                <Text style={[styles.accSub, { color: theme.secondaryText }]}>
                  Durée, niveau, variantes, photo...
                </Text>
              ) : null}
            </View>
            <Ionicons
              name={accordionOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color={accordionOpen ? theme.accent3 : theme.secondaryText}
            />
          </Pressable>

          {accordionOpen ? (
            <View
              style={[
                styles.accordionBody,
                {
                  backgroundColor: theme.surface,
                  borderColor: "rgba(0,229,255,0.2)",
                },
              ]}
            >
              {/* Durée + Niveau côte à côte */}
              <View style={styles.row}>
                <FieldCard
                  label="Durée (min)"
                  focused={focusedField === "duration"}
                  style={{ flex: 1 } as object}
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
            </View>
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
          <PrimaryButton
            label={isSaving ? "Enregistrement..." : "Enregistrer l'exercice"}
            onPress={handleSave}
            disabled={!isValid || isSaving}
          />
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
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
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
  accordionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
  },
  accIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  accLabelWrap: {
    flex: 1,
    gap: 2,
  },
  accLabel: {
    fontSize: 12,
    fontFamily: fonts.displayBold,
  },
  accSub: {
    fontSize: 10,
    fontFamily: fonts.bodyRegular,
  },
  accordionBody: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    gap: 10,
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
