import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CourtIcon } from "@/src/components/exercise/CourtIcon";
import { ExpressFrame, OptionCard, SectionLabel, expressStyles } from "@/src/components/exercise/ExpressEntryParts";
import { FixedPostEditor } from "@/src/components/exercise/FixedPostEditor";
import { MultishuttleEditor } from "@/src/components/exercise/MultishuttleEditor";
import { ShotSequenceEditor } from "@/src/components/exercise/ShotSequenceEditor";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { ExerciseSequence, SequenceDistribution } from "@/src/types/index";
import {
  ExpressDraft,
  ExpressKind,
  createEmptyDraft,
  draftFromSequence,
  finalizeExpressDraft,
  generateExpressText,
  hasExpressData,
  isExpressDraftValid,
} from "@/src/utils/expressEntry";

interface ExpressEntryModalProps {
  visible: boolean;
  playersCount: number;
  /** Donnée existante à modifier ; absente = nouvelle saisie. */
  initialSequence?: ExerciseSequence;
  onValidate: (sequence: ExerciseSequence) => void;
  onClose: () => void;
}

/**
 * Modale « Saisie express » ouverte depuis le formulaire d'exercice :
 * distribution PUIS type d'exercice, puis l'éditeur du mode choisi :
 * - Volant continu + Séquence de coups (ShotSequenceEditor) ;
 * - Volant continu + Poste fixe (FixedPostEditor) ;
 * - Multivolant, toujours en poste fixe (MultishuttleEditor) : « Séquence de
 *   coups » est alors simplement grisée (pas de mention, pour que les cartes
 *   gardent la même taille).
 * Changer de distribution ou de type alors que des données sont saisies
 * demande confirmation avant de les effacer.
 *
 * Travaille sur une copie : rien n'est appliqué au formulaire avant
 * « Valider ». Le formulaire se charge ensuite d'ajouter le texte à la
 * description (applyGeneratedText).
 */
export function ExpressEntryModal({ visible, ...props }: ExpressEntryModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={props.onClose}>
      {/* Contenu remonté à chaque ouverture pour repartir de la donnée du formulaire. */}
      {visible ? <ExpressEntryContent {...props} /> : null}
    </Modal>
  );
}

function confirmClear(onConfirm: () => void) {
  const title = "Effacer la saisie ?";
  const body = "Changer de distribution ou de type d'exercice efface ce que tu as déjà saisi.";
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title} ${body}`)) onConfirm();
    return;
  }
  Alert.alert(title, body, [
    { text: "Annuler", style: "cancel" },
    { text: "Effacer", style: "destructive", onPress: onConfirm },
  ]);
}

function ExpressEntryContent({
  playersCount,
  initialSequence,
  onValidate,
  onClose,
}: Omit<ExpressEntryModalProps, "visible">) {
  const { theme } = useAppTheme();
  // Marges de sécurité lues via le contexte plutôt qu'avec un SafeAreaView
  // placé dans la Modal : celui-ci mesure ses marges pendant l'animation
  // d'ouverture (vue encore sous l'écran) et obtient parfois 0 en haut, ce
  // qui faisait passer l'en-tête sous l'encoche (même correctif que
  // CourtDiagramModal).
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<ExpressDraft>(() => draftFromSequence(initialSequence, playersCount));
  const multishuttle = draft.distribution === "multivolant";

  /** Change de mode : brouillon vide du nouveau mode, après confirmation si des données sont saisies. */
  function switchTo(distribution: SequenceDistribution, kind: ExpressKind) {
    // La séquence de coups n'existe qu'en volant continu.
    const nextKind: ExpressKind = distribution === "multivolant" ? "poste_fixe" : kind;
    if (distribution === draft.distribution && nextKind === draft.kind) return;
    const apply = () => setDraft(createEmptyDraft(distribution, nextKind, playersCount));
    if (hasExpressData(draft)) confirmClear(apply);
    else apply();
  }

  const choices = (
    <>
      <View style={styles.intro}>
        <Text style={[styles.title, { color: theme.text }]}>Schéma de jeu</Text>
        <Text style={[styles.introText, { color: theme.secondaryText }]}>
          Choisis la distribution, puis le type d'exercice.
        </Text>
      </View>

      {/* 1er choix — Distribution. */}
      <View style={expressStyles.section}>
        <SectionLabel>Distribution</SectionLabel>
        <View style={expressStyles.twoCols}>
          <OptionCard
            selected={!multishuttle}
            label="Volant continu"
            hint="Le volant reste en jeu"
            onPress={() => switchTo("volant_continu", "sequence")}
          />
          <OptionCard
            selected={multishuttle}
            label="Multivolant"
            hint="Distribution de piles de volants"
            onPress={() => switchTo("multivolant", "poste_fixe")}
          />
        </View>
      </View>

      {/* 2e choix — Type d'exercice. En multivolant, le poste fixe est imposé. */}
      <View style={expressStyles.section}>
        <SectionLabel>Type d'exercice</SectionLabel>
        <View style={expressStyles.twoCols}>
          <OptionCard
            selected={draft.kind === "sequence"}
            disabled={multishuttle}
            label="Séquence de coups"
            hint="Chaque coup, dans l'ordre"
            onPress={() => switchTo(draft.distribution, "sequence")}
          />
          <OptionCard
            selected={draft.kind === "poste_fixe"}
            label="Poste fixe"
            hint="Un ou plusieurs relanceurs fixes"
            onPress={() => switchTo(draft.distribution, "poste_fixe")}
          />
        </View>
      </View>
    </>
  );

  const frame: ExpressFrame = {
    choices,
    preview: generateExpressText(draft, playersCount),
    canValidate: isExpressDraftValid(draft, playersCount),
    onValidate: () => {
      const sequence = finalizeExpressDraft(draft, playersCount);
      if (sequence) onValidate(sequence);
    },
  };

  return (
    <View
      style={[
        styles.safe,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}
    >
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

      {draft.kind === "sequence" ? (
        <ShotSequenceEditor frame={frame} value={draft} onChange={setDraft} playersCount={playersCount} />
      ) : draft.distribution === "multivolant" ? (
        <MultishuttleEditor frame={frame} value={draft} onChange={setDraft} playersCount={playersCount} />
      ) : (
        <FixedPostEditor frame={frame} value={draft} onChange={setDraft} playersCount={playersCount} />
      )}
    </View>
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
});
