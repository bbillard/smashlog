import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CourtZonePicker, ZoneCellState } from "@/src/components/exercise/CourtZonePicker";
import {
  ExpressFrame,
  ExpressLayout,
  OptionCard,
  PlayerChips,
  SectionLabel,
  expressStyles,
} from "@/src/components/exercise/ExpressEntryParts";
import { PlayerBadge } from "@/src/components/exercise/PlayerBadge";
import { SEQUENCE_PLAYER_COLORS } from "@/src/constants/sequenceColors";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { SequenceEnding } from "@/src/types/index";
import { sequencePlayers } from "@/src/utils/exerciseSequence";
import {
  FixedPostContinuousDraft,
  addFixedPost,
  canAddFixedPost,
  continuousWorkers,
  isFixedPostZoneTaken,
  joinPlayers,
  removeFixedPost,
  resetFixedPostOrder,
  sendNumber,
  setContinuousEnding,
  setFixedPostOrder,
  setFixedPostPlayer,
  setFixedPostZone,
  spotKey,
  toggleFixedPostTarget,
  unnumberedTargetCount,
  workersHint,
} from "@/src/utils/fixedPost";

interface FixedPostEditorProps {
  frame: ExpressFrame;
  value: FixedPostContinuousDraft;
  onChange: (next: FixedPostContinuousDraft) => void;
  playersCount: number;
}

const ORDER_OPTIONS = [
  { value: "aleatoire", label: "Aléatoire", hint: "Le relanceur choisit" },
  { value: "ordre", label: "Dans l'ordre", hint: "Envois numérotés" },
] as const;

const ENDING_OPTIONS: readonly { value: SequenceEnding; label: string; hint: string }[] = [
  { value: "boucle", label: "↻ En boucle", hint: "Les envois reprennent" },
  { value: "finir_point", label: "Finir le point", hint: "Jeu libre ensuite" },
];

/**
 * Éditeur « Volant continu + poste fixe » de la Saisie express. On ne saisit
 * que les envois des relanceurs (le joueur qui travaille renvoie toujours
 * vers eux) :
 * 1. un ou plusieurs postes fixes (joueur + position sur le demi-terrain de
 *    son camp), au plus playersCount − 1 ;
 * 2. pour chaque poste, « Envoie vers » : plusieurs zones du demi-terrain
 *    opposé, surlignées à la couleur du relanceur ;
 * 3. ordre des envois (aléatoire / dans l'ordre, numérotation globale) ;
 * 4. fin (en boucle / finir le point).
 * Toutes les règles sont dans src/utils/fixedPost.ts.
 */
export function FixedPostEditor({ frame, value: draft, onChange, playersCount }: FixedPostEditorProps) {
  const { theme } = useAppTheme();
  const players = sequencePlayers(playersCount);
  const workers = continuousWorkers(draft.fixedPosts, playersCount);
  const ordered = draft.order === "ordre";
  const unnumbered = unnumberedTargetCount(draft);
  const workersName = workers.length > 0 ? joinPlayers(workers) : "du joueur qui travaille";

  return (
    <ExpressLayout {...frame}>
      <View style={expressStyles.section}>
        <SectionLabel hint="relanceurs qui ne bougent pas">Postes fixes</SectionLabel>
        {draft.fixedPosts.map((post, index) => {
          const positionCells: Record<string, ZoneCellState> = {};
          draft.fixedPosts.forEach((other, i) => {
            if (!other.zone) return;
            positionCells[spotKey(other.zone)] =
              i === index
                ? { selected: true, player: post.player }
                : { disabled: true, note: `occupée par ${other.player}` };
          });
          const targetCells: Record<string, ZoneCellState> = {};
          post.targets.forEach((t) => {
            targetCells[spotKey(t)] = { selected: true, player: post.player, number: sendNumber(draft, post.player, t) };
          });
          return (
            <View key={index} style={[styles.postCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.postHeader}>
                <View style={styles.postTitleRow}>
                  <PlayerBadge player={post.player} size={22} weight="bold" />
                  <Text style={[styles.postTitle, { color: SEQUENCE_PLAYER_COLORS[post.player] }]}>
                    Poste fixe · Joueur {post.player}
                  </Text>
                </View>
                {draft.fixedPosts.length > 1 ? (
                  <Pressable
                    onPress={() => onChange(removeFixedPost(draft, index))}
                    accessibilityRole="button"
                    accessibilityLabel={`Retirer le poste fixe de ${post.player}`}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash-outline" size={17} color={theme.secondaryText} />
                  </Pressable>
                ) : null}
              </View>

              <View style={expressStyles.section}>
                <SectionLabel>Joueur</SectionLabel>
                <PlayerChips
                  players={players}
                  selected={post.player}
                  onSelect={(p) => onChange(setFixedPostPlayer(draft, index, p))}
                  isDisabled={(p) => draft.fixedPosts.some((other, i) => i !== index && other.player === p)}
                />
              </View>

              <View style={expressStyles.section}>
                <SectionLabel hint={`demi-terrain de ${post.player}, face au filet`}>Position</SectionLabel>
                <CourtZonePicker
                  cells={positionCells}
                  accessibilityPrefix={`Position de ${post.player}`}
                  onPress={(spot) => {
                    if (!isFixedPostZoneTaken(draft, index, spot)) onChange(setFixedPostZone(draft, index, spot));
                  }}
                />
              </View>

              <View style={expressStyles.section}>
                <SectionLabel hint={`demi-terrain ${workers.length > 0 ? `de ${workersName}` : "opposé"}, face au filet`}>
                  Envoie vers
                </SectionLabel>
                <CourtZonePicker
                  cells={targetCells}
                  accessibilityPrefix={`Envoi de ${post.player}`}
                  onPress={(spot) => onChange(toggleFixedPostTarget(draft, index, spot))}
                />
              </View>
            </View>
          );
        })}

        {canAddFixedPost(draft, playersCount) ? (
          <Pressable
            onPress={() => onChange(addFixedPost(draft, playersCount))}
            accessibilityRole="button"
            style={expressStyles.addMore}
          >
            <Text style={[expressStyles.addMoreText, { color: theme.primary }]}>+ Ajouter un poste fixe</Text>
          </Pressable>
        ) : null}
        <Text style={[expressStyles.hint, { color: theme.secondaryText }]}>{workersHint(workers)}</Text>
      </View>

      <View style={expressStyles.section}>
        <SectionLabel>Ordre des envois</SectionLabel>
        <View style={expressStyles.twoCols}>
          {ORDER_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              compact
              selected={draft.order === option.value}
              label={option.label}
              hint={option.hint}
              onPress={() => onChange(setFixedPostOrder(draft, option.value))}
            />
          ))}
        </View>
        {ordered ? (
          <View style={styles.orderRow}>
            <Text style={[expressStyles.hint, styles.flex, { color: unnumbered > 0 ? theme.danger : theme.secondaryText }]}>
              {unnumbered > 0
                ? `Touche les zones dans l'ordre des envois (${unnumbered} sans numéro).`
                : "Touche une zone numérotée pour la retirer."}
            </Text>
            <Pressable
              onPress={() => onChange(resetFixedPostOrder(draft))}
              accessibilityRole="button"
              style={[styles.resetButton, { borderColor: theme.border }]}
            >
              <Ionicons name="refresh" size={15} color={theme.text} />
              <Text style={[styles.resetText, { color: theme.text }]}>Réinitialiser l'ordre</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={expressStyles.section}>
        <SectionLabel>À la fin</SectionLabel>
        <View style={expressStyles.twoCols}>
          {ENDING_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              compact
              selected={draft.ending === option.value}
              label={option.label}
              hint={option.hint}
              onPress={() => onChange(setContinuousEnding(draft, option.value))}
            />
          ))}
        </View>
      </View>
    </ExpressLayout>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  postCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 16,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  postTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  postTitle: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
  },
  removeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  resetButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resetText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
  },
});
