import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
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

import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { Exercise } from "@/src/types/index";
import { buildLibraryView } from "@/src/utils/exerciseLibrary";

interface ExercisesAccordionProps {
  /** IDs des exercices liés à la séance en cours */
  exerciseIds: string[];
  /** Tous les exercices de la bibliothèque (chargés par le parent) */
  allExercises: Exercise[];
  /** Ajouter un exercice par ID */
  onAdd: (id: string) => void;
  /** Retirer un exercice par ID */
  onRemove: (id: string) => void;
  /** Naviguer vers la création d'un nouvel exercice */
  onCreateNew: () => void;
  /** Appelé juste avant l'ouverture de la modale — permet au parent de recharger les exercices */
  onOpenLibrary?: () => Promise<void>;
  /** Ouvre l'accordéon par défaut (utile en mode édition quand des exercices existent déjà) */
  defaultOpen?: boolean;
  /**
   * Label mis en avant dans la modale (ex: « Renfo » pour une séance de
   * renforcement) : ses exercices sont listés en premier. Aucun exercice
   * n'est masqué — cf. buildLibraryView.
   */
  preferredLabel?: string;
}

export function ExercisesAccordion({
  exerciseIds,
  allExercises,
  onAdd,
  onRemove,
  onCreateNew,
  onOpenLibrary,
  defaultOpen = false,
  preferredLabel,
}: ExercisesAccordionProps) {
  const { theme } = useAppTheme();
  const [open, setOpen] = useState(defaultOpen);
  const [libraryVisible, setLibraryVisible] = useState(false);
  const [search, setSearch] = useState("");

  const linked = useMemo(
    () =>
      exerciseIds
        .map((id) => allExercises.find((e) => e.id === id))
        .filter((e): e is Exercise => e !== undefined),
    [exerciseIds, allExercises],
  );

  const library = useMemo(
    () => buildLibraryView(allExercises, { excludeIds: exerciseIds, search, preferredLabel }),
    [allExercises, exerciseIds, search, preferredLabel],
  );

  function closeLibrary() {
    setLibraryVisible(false);
    setSearch("");
  }

  const headerLabel =
    exerciseIds.length === 0
      ? "Ajouter des exercices"
      : `${exerciseIds.length} exercice${exerciseIds.length > 1 ? "s" : ""} ajouté${exerciseIds.length > 1 ? "s" : ""}`;

  return (
    <>
      {/* ── Accordion header ── */}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[
          styles.head,
          {
            backgroundColor: open ? theme.surface : "rgba(0,229,255,0.04)",
            borderColor: open ? "rgba(0,229,255,0.2)" : "rgba(0,229,255,0.15)",
          },
        ]}
      >
        <View style={[styles.headIcon, { backgroundColor: "rgba(0,229,255,0.1)" }]}>
          <Ionicons name="newspaper-outline" size={15} color={theme.accent3} />
        </View>
        <View style={styles.headText}>
          <Text style={[styles.headTitle, { color: theme.accent3 }]}>
            Exercices travaillés
          </Text>
          <Text style={[styles.headSub, { color: theme.secondaryText }]}>
            (optionnel) · {headerLabel}
          </Text>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.accent3}
        />
      </Pressable>

      {/* ── Accordion body ── */}
      {open ? (
        <View
          style={[
            styles.body,
            {
              backgroundColor: theme.surface,
              borderColor: "rgba(0,229,255,0.15)",
            },
          ]}
        >
          {/* Exercices liés */}
          {linked.map((ex, idx) => (
            <View
              key={ex.id}
              style={[
                styles.exerciseRow,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              ]}
            >
              <View style={[styles.badge, { backgroundColor: "rgba(0,229,255,0.1)" }]}>
                <Text style={[styles.badgeText, { color: theme.accent3 }]}>
                  {idx + 1}
                </Text>
              </View>
              <Text style={[styles.exerciseName, { color: theme.text }]} numberOfLines={1}>
                {ex.name}
              </Text>
              {ex.durationMinutes ? (
                <Text style={[styles.exerciseDur, { color: theme.secondaryText }]}>
                  {ex.durationMinutes}′
                </Text>
              ) : null}
              <Pressable onPress={() => onRemove(ex.id)} hitSlop={8}>
                <Ionicons name="close" size={14} color={theme.secondaryText} />
              </Pressable>
            </View>
          ))}

          {linked.length === 0 ? (
            <Text style={[styles.emptyHint, { color: theme.secondaryText }]}>
              Aucun exercice ajouté pour le moment.
            </Text>
          ) : null}

          {/* Boutons d'action */}
          <View style={styles.actions}>
            <Pressable
              onPress={async () => {
                await onOpenLibrary?.();
                setLibraryVisible(true);
              }}
              style={[
                styles.actionBtn,
                styles.libraryActionBtn,
                {
                  backgroundColor: "rgba(0,229,255,0.08)",
                  borderColor: "rgba(0,229,255,0.2)",
                },
              ]}
            >
              <Ionicons name="library-outline" size={13} color={theme.accent3} />
              <Text
                numberOfLines={1}
                style={[styles.actionText, { color: theme.accent3 }]}
              >
                Bibliothèque
              </Text>
            </Pressable>

            <Pressable
              onPress={onCreateNew}
              style={[
                styles.actionBtn,
                styles.createActionBtn,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.border,
                  borderStyle: "dashed",
                },
              ]}
            >
              <Ionicons name="add" size={13} color={theme.secondaryText} />
              <Text
                numberOfLines={1}
                style={[styles.actionText, { color: theme.secondaryText }]}
              >
                Créer nouveau
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* ── Library modal ── */}
      <Modal
        visible={libraryVisible}
        transparent
        animationType="slide"
        onRequestClose={closeLibrary}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalKAV}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={closeLibrary}
          >
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Ma bibliothèque
              </Text>
              <Pressable onPress={closeLibrary} hitSlop={10}>
                <Ionicons name="close" size={20} color={theme.secondaryText} />
              </Pressable>
            </View>

            {/* Search */}
            <View
              style={[
                styles.modalSearch,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Ionicons name="search-outline" size={14} color={theme.secondaryText} />
              <TextInput
                style={[styles.modalSearchInput, { color: theme.text }]}
                placeholder="Rechercher..."
                placeholderTextColor={theme.secondaryText}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {/* Exercise list */}
            <ScrollView
              style={styles.modalList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {library.emptyReason === "library_empty" ? (
                <View style={styles.modalEmptyBlock}>
                  <Text style={[styles.modalEmptyTitle, { color: theme.text }]}>
                    Ta bibliothèque est vide
                  </Text>
                  <Text style={[styles.modalEmpty, styles.modalEmptyInBlock, { color: theme.secondaryText }]}>
                    Crée ton premier exercice pour l'ajouter à cette séance.
                  </Text>
                  <Pressable
                    onPress={() => {
                      closeLibrary();
                      onCreateNew();
                    }}
                    style={[
                      styles.modalEmptyButton,
                      { backgroundColor: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.2)" },
                    ]}
                  >
                    <Ionicons name="add" size={15} color={theme.accent3} />
                    <Text style={[styles.actionText, { color: theme.accent3 }]}>Créer un exercice</Text>
                  </Pressable>
                </View>
              ) : null}
              {library.emptyReason === "all_added" ? (
                <Text style={[styles.modalEmpty, { color: theme.secondaryText }]}>
                  Tous les exercices sont déjà ajoutés.
                </Text>
              ) : null}
              {library.emptyReason === "no_match" ? (
                <Text style={[styles.modalEmpty, { color: theme.secondaryText }]}>
                  Aucun exercice correspondant dans ta bibliothèque.
                </Text>
              ) : null}
              {library.sections.map((section) => (
                <View key={section.title ?? "all"}>
                  {section.title ? (
                    <Text style={[styles.modalSectionTitle, { color: theme.secondaryText }]}>
                      {section.title}
                    </Text>
                  ) : null}
                  {section.exercises.map((ex) => (
                    <Pressable
                      key={ex.id}
                      onPress={() => {
                        onAdd(ex.id);
                        closeLibrary();
                      }}
                      style={[
                        styles.modalItem,
                        { borderBottomColor: theme.border },
                      ]}
                    >
                      <View style={styles.modalItemContent}>
                        <Text style={[styles.modalItemName, { color: theme.text }]} numberOfLines={1}>
                          {ex.name}
                        </Text>
                        <View style={styles.modalItemMeta}>
                          {ex.labels.slice(0, 2).map((l) => (
                            <View
                              key={l}
                              style={[
                                styles.modalItemTag,
                                { backgroundColor: theme.primaryMuted },
                              ]}
                            >
                              <Text style={[styles.modalItemTagText, { color: theme.primary }]}>
                                {l}
                              </Text>
                            </View>
                          ))}
                          {ex.durationMinutes ? (
                            <Text style={[styles.modalItemDur, { color: theme.secondaryText }]}>
                              {ex.durationMinutes}′
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <Ionicons name="add-circle-outline" size={20} color={theme.accent3} />
                    </Pressable>
                  ))}
                </View>
              ))}
              <View style={styles.modalListBottom} />
            </ScrollView>
          </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  headIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headText: {
    flex: 1,
    gap: 2,
  },
  headTitle: {
    fontSize: 13,
    fontFamily: fonts.displayBold,
  },
  headSub: {
    fontSize: 10,
    fontFamily: fonts.bodyRegular,
  },
  body: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderRadius: 10,
    padding: 9,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.displayBold,
  },
  exerciseName: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
  },
  exerciseDur: {
    fontSize: 11,
    fontFamily: fonts.bodyRegular,
    flexShrink: 0,
  },
  emptyHint: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
    textAlign: "center",
    paddingVertical: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 7,
    marginTop: 2,
  },
  actionBtn: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 12,
    minWidth: 0,
  },
  libraryActionBtn: {
    flex: 1.25,
  },
  createActionBtn: {
    flex: 0.95,
  },
  actionText: {
    fontSize: 11,
    fontFamily: fonts.displayBold,
    flexShrink: 1,
    textAlign: "center",
  },
  // Modal
  modalKAV: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: fonts.displayBold,
  },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
    padding: 0,
  },
  modalList: {
    maxHeight: 380,
  },
  modalEmpty: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
    paddingVertical: 24,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  modalItemContent: {
    flex: 1,
    gap: 5,
  },
  modalItemName: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  modalItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  modalItemTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  modalItemTagText: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
  },
  modalItemDur: {
    fontSize: 11,
    fontFamily: fonts.bodyRegular,
  },
  modalSectionTitle: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingTop: 12,
    paddingBottom: 4,
  },
  modalEmptyBlock: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  modalEmptyInBlock: {
    paddingVertical: 0,
  },
  modalEmptyTitle: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
  },
  modalEmptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  modalListBottom: {
    height: 20,
  },
});
