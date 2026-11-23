import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Line, Rect, Svg } from "react-native-svg";

import {
  ExpressFrame,
  ExpressLayout,
  OptionCard,
  PlayerChips,
  SectionLabel,
  expressStyles,
} from "@/src/components/exercise/ExpressEntryParts";
import { ShotNumberBadge } from "@/src/components/exercise/ShotNumberBadge";
import { StrikeDraft, StrikePicker } from "@/src/components/exercise/StrikePicker";
import { SEQUENCE_PLAYER_COLORS } from "@/src/constants/sequenceColors";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { CourtSpot, FixedPostMultishuttle, SequencePlayer } from "@/src/types/index";
import { sequencePlayers } from "@/src/utils/exerciseSequence";
import {
  MAX_SHUTTLES_PER_ROUND,
  MIN_SHUTTLES_PER_ROUND,
  SPOT_DEPTHS,
  SPOT_SIDES,
  clampShuttles,
  feedersHint,
  findInvalidStrikeIds,
  isMultishuttleOrdered,
  moveStrike,
  setMultishuttleWorker,
  strikeFromText,
  strikeShotText,
} from "@/src/utils/fixedPost";
import { createId } from "@/src/utils/id";

interface MultishuttleEditorProps {
  frame: ExpressFrame;
  value: FixedPostMultishuttle;
  onChange: (next: FixedPostMultishuttle) => void;
  playersCount: number;
}

const ORDER_OPTIONS = [
  { value: "ordre", label: "Dans l'ordre", hint: "Frappes numérotées" },
  { value: "aleatoire", label: "Aléatoire", hint: "Le distributeur choisit" },
] as const;

type PanelState =
  | { open: false }
  | { open: true; mode: "add"; index: number; initial?: Partial<StrikeDraft>; key: string }
  | { open: true; mode: "edit"; index: number; key: string };

/**
 * Éditeur « Multivolant » (toujours en poste fixe) de la Saisie express
 * (écrans M1 et M2) : qui travaille (les autres distribuent, sans position ni
 * envois à saisir), ordre des frappes (dans l'ordre, numérotées et
 * réordonnables, ou aléatoire : le distributeur choisit, sans numéros),
 * liste des frappes du joueur qui travaille, volants par passage. Toutes les règles sont dans src/utils/fixedPost.ts.
 */
export function MultishuttleEditor({ frame, value: draft, onChange, playersCount }: MultishuttleEditorProps) {
  const { theme } = useAppTheme();
  const [panel, setPanel] = useState<PanelState>({ open: false });
  const players = sequencePlayers(playersCount);
  const strikes = draft.strikes;
  const invalidIds = new Set(findInvalidStrikeIds(strikes));
  const ordered = isMultishuttleOrdered(draft);

  function setStrikes(next: FixedPostMultishuttle["strikes"]) {
    onChange({ ...draft, strikes: next });
  }

  function openAdd(count = strikes.length, initial?: Partial<StrikeDraft>) {
    setPanel({ open: true, mode: "add", index: count, initial, key: createId() });
  }

  function handleNext(strike: StrikeDraft) {
    const next = [...strikes, { id: createId(), ...strike }];
    setStrikes(next);
    openAdd(next.length);
  }

  function handleFinish(strike: StrikeDraft | null) {
    if (strike) setStrikes([...strikes, { id: createId(), ...strike }]);
    setPanel({ open: false });
  }

  function handleUndo() {
    const last = strikes[strikes.length - 1];
    if (!last) return;
    const next = strikes.slice(0, -1);
    setStrikes(next);
    const { id: _id, ...strike } = last;
    // Réaffiche la saisie de la frappe retirée, pré-remplie.
    openAdd(next.length, strike);
  }

  function handleSave(index: number, strike: StrikeDraft) {
    setStrikes(strikes.map((s, i) => (i === index ? { id: s.id, ...strike } : s)));
    setPanel({ open: false });
  }

  function handleDelete(index: number) {
    setStrikes(strikes.filter((_, i) => i !== index));
    setPanel({ open: false });
  }

  const overlay = panel.open ? (
    <StrikePicker
      key={panel.key}
      mode={panel.mode}
      index={panel.index}
      worker={draft.worker}
      initial={panel.mode === "add" ? panel.initial : strikes[panel.index]}
      canUndo={strikes.length > 0}
      onNext={handleNext}
      onFinish={handleFinish}
      onUndo={handleUndo}
      onSave={(strike) => handleSave(panel.index, strike)}
      onDelete={() => handleDelete(panel.index)}
      onClose={() => setPanel({ open: false })}
    />
  ) : null;

  return (
    <ExpressLayout {...frame} overlay={overlay}>
      <View style={expressStyles.section}>
        <SectionLabel>Qui travaille ?</SectionLabel>
        <PlayerChips
          players={players}
          selected={draft.worker}
          onSelect={(p) => onChange(setMultishuttleWorker(draft, p, playersCount))}
        />
        <Text style={[expressStyles.hint, { color: theme.secondaryText }]}>{feedersHint(draft.feeders)}</Text>
      </View>

      <View style={expressStyles.section}>
        <SectionLabel>Ordre des frappes</SectionLabel>
        <View style={expressStyles.twoCols}>
          {ORDER_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              compact
              selected={(draft.order ?? "ordre") === option.value}
              label={option.label}
              hint={option.hint}
              onPress={() => onChange({ ...draft, order: option.value })}
            />
          ))}
        </View>
      </View>

      <View style={expressStyles.section}>
        <SectionLabel hint="d'où il frappe, quel coup">Frappes de {draft.worker}</SectionLabel>
        {strikes.map((strike, index) => {
          const invalid = invalidIds.has(strike.id);
          return (
            <Pressable
              key={strike.id}
              onPress={() => setPanel({ open: true, mode: "edit", index, key: createId() })}
              accessibilityLabel={`Modifier la frappe ${index + 1}`}
              style={[styles.strikeRow, { backgroundColor: theme.surface, borderColor: invalid ? theme.danger : theme.border }]}
            >
              {ordered ? (
                <ShotNumberBadge kind="shot" number={index + 1} player={draft.worker} size={26} />
              ) : (
                <ShotNumberBadge kind="send" player={draft.worker} size={26} />
              )}
              <View style={styles.flex}>
                <Text style={[styles.strikeShot, { color: theme.text }]} numberOfLines={1}>
                  {strikeShotText(strike)}
                </Text>
                <Text style={[styles.strikeMeta, { color: invalid ? theme.danger : theme.secondaryText }]} numberOfLines={1}>
                  {invalid ? "À corriger · touche pour modifier" : strikeFromText(strike)}
                </Text>
              </View>
              <MiniZoneIcon spot={strike.from} player={draft.worker} />
              {/* Réordonner n'a de sens que si l'ordre compte. */}
              {ordered ? (
                <View style={styles.moveButtons}>
                  <Pressable
                    onPress={() => setStrikes(moveStrike(strikes, index, -1))}
                    disabled={index === 0}
                    accessibilityLabel={`Monter la frappe ${index + 1}`}
                    style={[styles.moveButton, { opacity: index === 0 ? 0.25 : 1 }]}
                  >
                    <Ionicons name="chevron-up" size={18} color={theme.secondaryText} />
                  </Pressable>
                  <Pressable
                    onPress={() => setStrikes(moveStrike(strikes, index, 1))}
                    disabled={index === strikes.length - 1}
                    accessibilityLabel={`Descendre la frappe ${index + 1}`}
                    style={[styles.moveButton, { opacity: index === strikes.length - 1 ? 0.25 : 1 }]}
                  >
                    <Ionicons name="chevron-down" size={18} color={theme.secondaryText} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.moveSpacer} />
              )}
            </Pressable>
          );
        })}
        <Pressable onPress={() => openAdd()} accessibilityRole="button" style={expressStyles.addMore}>
          <Text style={[expressStyles.addMoreText, { color: theme.primary }]}>+ Ajouter une frappe</Text>
        </Pressable>
        {invalidIds.size > 0 ? (
          <Text style={[expressStyles.errorText, { color: theme.danger }]}>
            Certaines frappes sont impossibles depuis leur zone : corrige-les pour valider.
          </Text>
        ) : null}
      </View>

      <View style={expressStyles.section}>
        <SectionLabel>Volants par passage</SectionLabel>
        <View style={[styles.counter, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.counterHint, { color: theme.secondaryText }]}>
            La séquence se répète jusqu'à la fin de la pile
          </Text>
          <View style={styles.counterControls}>
            <Pressable
              onPress={() => onChange({ ...draft, shuttlesPerRound: clampShuttles(draft.shuttlesPerRound - 1) })}
              disabled={draft.shuttlesPerRound <= MIN_SHUTTLES_PER_ROUND}
              accessibilityLabel="Retirer un volant"
              style={[styles.counterButton, { borderColor: theme.border, opacity: draft.shuttlesPerRound <= MIN_SHUTTLES_PER_ROUND ? 0.35 : 1 }]}
            >
              <Text style={[styles.counterSign, { color: theme.text }]}>−</Text>
            </Pressable>
            <Text style={[styles.counterValue, { color: theme.primary }]} accessibilityLabel={`${draft.shuttlesPerRound} volants`}>
              {draft.shuttlesPerRound}
            </Text>
            <Pressable
              onPress={() => onChange({ ...draft, shuttlesPerRound: clampShuttles(draft.shuttlesPerRound + 1) })}
              disabled={draft.shuttlesPerRound >= MAX_SHUTTLES_PER_ROUND}
              accessibilityLabel="Ajouter un volant"
              style={[styles.counterButton, { borderColor: theme.border, opacity: draft.shuttlesPerRound >= MAX_SHUTTLES_PER_ROUND ? 0.35 : 1 }]}
            >
              <Text style={[styles.counterSign, { color: theme.text }]}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ExpressLayout>
  );
}

/** Mini-grille 3×3 (filet en haut) avec la zone « Depuis » surlignée. */
function MiniZoneIcon({ spot, player }: { spot: CourtSpot; player: SequencePlayer }) {
  return (
    <Svg width={20} height={22} viewBox="0 0 20 22" accessibilityElementsHidden importantForAccessibility="no">
      <Line x1={0} y1={1} x2={20} y2={1} stroke="#F2F2F5" strokeWidth={1.5} />
      {SPOT_DEPTHS.map((depth, row) =>
        SPOT_SIDES.map((side, col) => (
          <Rect
            key={`${depth}-${side}`}
            x={1 + col * 6}
            y={3 + row * 6}
            width={5}
            height={5}
            rx={1}
            fill={depth === spot.depth && side === spot.side ? SEQUENCE_PLAYER_COLORS[player] : "rgba(255,255,255,0.14)"}
          />
        )),
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
  strikeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 4,
    paddingLeft: 10,
    paddingRight: 2,
  },
  strikeShot: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
  },
  strikeMeta: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },
  moveButtons: {
    flexDirection: "row",
  },
  moveSpacer: {
    width: 8,
  },
  moveButton: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingLeft: 14,
    paddingRight: 6,
  },
  counterHint: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
  },
  counterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  counterSign: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
  },
  counterValue: {
    minWidth: 34,
    textAlign: "center",
    fontSize: 18,
    fontFamily: fonts.displayExtraBold,
  },
});
