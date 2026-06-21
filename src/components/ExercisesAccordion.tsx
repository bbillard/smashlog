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
}

export function ExercisesAccordion({
  exerciseIds,
  allExercises,
  onAdd,
  onRemove,
  onCreateNew,
  onOpenLibrary,
  defaultOpen = false,
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

  const available = useMemo(
    () =>
      allExercises.filter(
        (e) =>
          !exerciseIds.includes(e.id) &&
          (search.trim() === "" ||
            e.name.toLowerCase().includes(search.trim().toLowerCase())),
      ),
    [allExercises, exerciseIds, search],
  );

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
        onRequestClose={() => setLibraryVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalKAV}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setLibraryVisible(false)}
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
              <Pressable onPress={() => setLibraryVisible(false)} hitSlop={10}>
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
              {available.length === 0 ? (
                <Text style={[styles.modalEmpty, { color: theme.secondaryText }]}>
                  {allExercises.length === 0
                    ? "Aucun exercice dans ta bibliothèque."
                    : "Tous les exercices sont déjà ajoutés."}
                </Text>
              ) : null}
              {available.map((ex) => (
                <Pressable
                  key={ex.id}
                  onPress={() => {
                    onAdd(ex.id);
                    setLibraryVisible(false);
                    setSearch("");
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
  modalListBottom: {
    height: 20,
  },
});
