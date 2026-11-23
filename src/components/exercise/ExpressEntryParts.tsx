import { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PlayerBadge } from "@/src/components/exercise/PlayerBadge";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SEQUENCE_PLAYER_COLORS, SEQUENCE_PLAYER_COLORS_BG } from "@/src/constants/sequenceColors";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { SequencePlayer } from "@/src/types/index";

/**
 * Briques communes aux éditeurs de la modale « Saisie express » (séquence de
 * coups, poste fixe en volant continu, multivolant) : cadre défilant avec les
 * choix distribution / type en tête, aperçu du texte ajouté à la description,
 * bouton « Valider » en pied, panneau du bas éventuel par-dessus ; cartes
 * d'option et pastilles de joueurs.
 */

export interface ExpressFrame {
  /** Choix distribution puis type, rendus par la modale. */
  choices: ReactNode;
  /** Texte généré à la volée (« Ajouté à la description »). */
  preview: string;
  canValidate: boolean;
  onValidate: () => void;
}

interface ExpressLayoutProps extends ExpressFrame {
  children: ReactNode;
  /** Panneau du bas (saisie d'un coup, d'une frappe), par-dessus tout le reste. */
  overlay?: ReactNode;
}

export function ExpressLayout({ choices, preview, canValidate, onValidate, children, overlay }: ExpressLayoutProps) {
  const { theme } = useAppTheme();
  // Marge basse appliquée au pied seulement : les panneaux du bas
  // (ShotPicker, StrikePicker) descendent jusqu'au bord de l'écran et gèrent
  // eux-mêmes la leur.
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {choices}
        {children}
        {preview ? (
          <View style={styles.preview}>
            <Text style={[styles.previewLabel, { color: theme.primary }]}>Ajouté à la description</Text>
            <Text style={[styles.previewText, { color: theme.text }]}>{preview}</Text>
          </View>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: theme.border, paddingBottom: 12 + insets.bottom }]}>
        <PrimaryButton label="Valider" onPress={onValidate} disabled={!canValidate} />
      </View>
      {overlay}
    </View>
  );
}

export function SectionLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  const { theme } = useAppTheme();
  return (
    <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>
      {children}
      {hint ? <Text style={[styles.sectionHint, { color: theme.secondaryText }]}> · {hint}</Text> : null}
    </Text>
  );
}

export function OptionCard({
  label,
  hint,
  selected,
  onPress,
  compact = false,
  disabled = false,
  note,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
  disabled?: boolean;
  /** Mention sous l'indication (ex. « Indisponible en multivolant »). */
  note?: string;
}) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[
        styles.optionCard,
        compact ? styles.optionCardCompact : null,
        {
          borderColor: selected ? theme.primary : theme.border,
          backgroundColor: selected ? "rgba(206,255,0,0.08)" : theme.surface,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Text style={[styles.optionLabel, { color: selected ? theme.primary : theme.text }, compact ? styles.centerText : null]}>
        {label}
      </Text>
      <Text style={[styles.optionHint, { color: theme.secondaryText }, compact ? styles.centerText : null]}>{hint}</Text>
      {note ? (
        <Text style={[styles.optionNote, { color: theme.tertiaryText }, compact ? styles.centerText : null]}>{note}</Text>
      ) : null}
    </Pressable>
  );
}

/** Pastilles « Joueur A / B… » (choix d'un joueur), 2 par ligne. */
export function PlayerChips({
  players,
  selected,
  onSelect,
  isDisabled,
}: {
  players: readonly SequencePlayer[];
  selected: SequencePlayer | undefined;
  onSelect: (player: SequencePlayer) => void;
  isDisabled?: (player: SequencePlayer) => boolean;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.playersGrid}>
      {players.map((p) => {
        const active = p === selected;
        const disabled = !active && !!isDisabled?.(p);
        return (
          <Pressable
            key={p}
            onPress={() => onSelect(p)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
            accessibilityLabel={`Joueur ${p}`}
            style={[
              styles.playerChip,
              {
                borderColor: active ? SEQUENCE_PLAYER_COLORS[p] : theme.border,
                backgroundColor: active ? SEQUENCE_PLAYER_COLORS_BG[p] : "transparent",
                opacity: disabled ? 0.35 : 1,
              },
            ]}
          >
            <PlayerBadge player={p} size={22} weight="bold" />
            <Text style={[styles.chipText, { color: active ? SEQUENCE_PLAYER_COLORS[p] : theme.text }]}>Joueur {p}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const expressStyles = StyleSheet.create({
  section: {
    gap: 10,
  },
  twoCols: {
    flexDirection: "row",
    gap: 8,
  },
  addMore: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(206,255,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  addMoreText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.bodyRegular,
  },
  errorText: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
  },
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    gap: 22,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
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
  optionNote: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    marginTop: 2,
  },
  centerText: {
    textAlign: "center",
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
});
