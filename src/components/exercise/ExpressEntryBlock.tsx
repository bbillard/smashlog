import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CourtDiagramThumbnail } from "@/src/components/exercise/CourtDiagramThumbnail";
import { CourtIcon } from "@/src/components/exercise/CourtIcon";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { ShotSequence } from "@/src/types/index";
import { sequenceSummary } from "@/src/utils/exerciseSequence";

interface ExpressEntryBlockProps {
  playersCount: number | null;
  /** Séquence de coups (le mode Poste fixe sera affiché par son ticket). */
  sequence: ShotSequence | undefined;
  onOpen: () => void;
  onDelete: () => void;
}

/**
 * Bloc « Saisie express » du formulaire d'exercice, entre le nombre de
 * joueurs et la description :
 * - vide : bouton large en pointillés lime ;
 * - rempli : badge résumé, miniature du schéma, Modifier / Supprimer ;
 * - moins de 2 joueurs : grisé, non cliquable.
 */
export function ExpressEntryBlock({ playersCount, sequence, onOpen, onDelete }: ExpressEntryBlockProps) {
  const { theme } = useAppTheme();
  const available = playersCount !== null && playersCount >= 2;
  const unavailableHint =
    playersCount === null ? "Choisis d'abord le nombre de joueurs" : "Disponible à partir de 2 joueurs";

  if (sequence && sequence.steps.length > 0) {
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: "rgba(206,255,0,0.3)" }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <CourtIcon size={18} color={theme.primary} strokeWidth={1.8} />
            <Text style={[styles.cardTitle, { color: theme.primary }]}>Saisie express</Text>
          </View>
          <View style={styles.badge}>
            <Text style={[styles.badgeText, { color: theme.primary }]}>{sequenceSummary(sequence)}</Text>
          </View>
        </View>
        <CourtDiagramThumbnail sequence={sequence} />
        {!available ? (
          <Text style={[styles.hint, { color: theme.secondaryText }]}>{unavailableHint}</Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            onPress={onOpen}
            disabled={!available}
            style={[styles.action, { borderColor: theme.border, opacity: available ? 1 : 0.4 }]}
          >
            <Text style={[styles.actionText, { color: theme.text }]}>Modifier</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={[styles.action, { borderColor: "rgba(255,77,109,0.35)" }]}>
            <Text style={[styles.actionText, { color: theme.danger }]}>Supprimer</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onOpen}
      disabled={!available}
      accessibilityState={{ disabled: !available }}
      style={[
        styles.empty,
        {
          borderColor: available ? "rgba(206,255,0,0.45)" : theme.border,
          backgroundColor: available ? "rgba(206,255,0,0.04)" : "transparent",
          opacity: available ? 1 : 0.45,
        },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: available ? "rgba(206,255,0,0.14)" : theme.surfaceAlt },
        ]}
      >
        <CourtIcon size={28} color={available ? theme.primary : theme.secondaryText} />
      </View>
      <View style={styles.emptyText}>
        <Text style={[styles.emptyTitle, { color: available ? theme.primary : theme.secondaryText }]}>
          Saisie express
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.tertiaryText }]}>
          {available ? "Schéma et description prêts en 30 secondes" : unavailableHint}
        </Text>
      </View>
      {available ? <Ionicons name="chevron-forward" size={16} color={theme.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: {
    minHeight: 84,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    flex: 1,
    gap: 3,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: fonts.displayExtraBold,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.bodyRegular,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: fonts.displayExtraBold,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(206,255,0,0.1)",
    flexShrink: 1,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
  hint: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  action: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
});
