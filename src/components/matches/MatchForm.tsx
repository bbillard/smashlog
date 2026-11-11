import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import PlayerAutocomplete from "@/src/components/PlayerAutocomplete";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { getPlayers } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { Player } from "@/src/types/index";
import { Match } from "@/src/types/session";
import {
  deduceResultFromSets,
  MATCH_MODE_LABELS,
  MATCH_RESULT_BG,
  MATCH_RESULT_COLORS,
  MATCH_RESULTS,
  MATCH_RESULT_LABELS,
  MatchResult,
} from "@/src/utils/matchResult";
import { normalizeStr } from "@/src/utils/playerStats";

/**
 * Formulaire de saisie d'un match, utilisé :
 * - en création (accordéon du wizard / de l'édition de séance) ;
 * - en modification (même accordéon, écran « Modifier le match » ouvert depuis
 *   le détail de séance, la fiche joueur ou « Mes matchs »).
 *
 * Règles (v1.4.1) :
 * - le résultat est obligatoire, sans valeur par défaut ;
 * - dès que des sets complets sont saisis, le résultat est pré-sélectionné par
 *   déduction (victoire / défaite / nul) et reste modifiable à la main.
 */

export const MAX_SETS = 5;

// ── Types internes ────────────────────────────────────────────────────────────

interface SetDraft {
  scoreNous: string;
  scoreEux: string;
}

interface MatchDraft {
  mode: Match["mode"];
  resultat: MatchResult | null;
  // Adversaire principal (tous modes)
  adversaireId: string | null;
  adversaireDefaultText: string; // texte legacy (match sans id joueur)
  // 2e adversaire (double / mixte)
  adversaire2Id: string | null;
  adversaire2DefaultText: string;
  // Partenaire (double / mixte)
  partenaireId: string | null;
  partenaireDefaultText: string;
  // Reste
  sets: SetDraft[];
  manualSetsCount: number;
  commentaire: string;
}

function makeInitialSets(): SetDraft[] {
  return Array.from({ length: MAX_SETS }, () => ({ scoreNous: "", scoreEux: "" }));
}

function makeEmptyDraft(): MatchDraft {
  return {
    mode: "simple",
    resultat: null,
    adversaireId: null,
    adversaireDefaultText: "",
    adversaire2Id: null,
    adversaire2DefaultText: "",
    partenaireId: null,
    partenaireDefaultText: "",
    sets: makeInitialSets(),
    manualSetsCount: 2,
    commentaire: "",
  };
}

/** Résout un nom legacy (sans id) vers un joueur existant, comme playerStats. */
function findPlayerByName(players: Player[], name: string): Player | undefined {
  const norm = normalizeStr(name);
  if (!norm) return undefined;
  return players.find((p) => normalizeStr(p.name) === norm);
}

/** Pré-remplit le brouillon à partir d'un match existant. */
function matchToDraft(match: Match, players: Player[]): MatchDraft {
  const isDoubles = match.mode !== "simple";

  // Adversaires : ids en priorité, sinon noms legacy ("Nom1 / Nom2" en double)
  const legacyAdvNames = match.adversaire ? match.adversaire.split("/").map((n) => n.trim()) : [];
  const adv1Id = match.adversaireIds?.[0] ?? match.adversaireId ?? null;
  const adv2Id = isDoubles ? (match.adversaireIds?.[1] ?? null) : null;

  const resolveLegacy = (id: string | null, legacyName: string | undefined) => {
    if (id) return { id, text: "" };
    const found = legacyName ? findPlayerByName(players, legacyName) : undefined;
    return found ? { id: found.id, text: "" } : { id: null, text: legacyName ?? "" };
  };

  const adv1 = resolveLegacy(
    adv1Id,
    isDoubles ? legacyAdvNames[0] : match.adversaire || undefined,
  );
  const adv2 = isDoubles
    ? resolveLegacy(adv2Id, adv1Id ? undefined : legacyAdvNames[1])
    : { id: null, text: "" };
  const part = isDoubles
    ? resolveLegacy(match.partenaireId ?? null, match.partenaire)
    : { id: null, text: "" };

  const sets = makeInitialSets();
  match.sets.slice(0, MAX_SETS).forEach((s, i) => {
    sets[i] = { scoreNous: String(s.scoreNous), scoreEux: String(s.scoreEux) };
  });

  return {
    mode: match.mode,
    resultat: match.resultat,
    adversaireId: adv1.id,
    adversaireDefaultText: adv1.text,
    adversaire2Id: adv2.id,
    adversaire2DefaultText: adv2.text,
    partenaireId: part.id,
    partenaireDefaultText: part.text,
    sets,
    manualSetsCount: Math.max(2, Math.min(MAX_SETS, match.sets.length)),
    commentaire: match.commentaire ?? "",
  };
}

/**
 * Nombre de sets visibles :
 * - auto-3e set si set1 et set2 sont complets et split 1-1
 * - sinon, le nombre demandé manuellement
 */
function computeVisibleSetsCount(sets: SetDraft[], manualSetsCount: number): number {
  const s1 = sets[0];
  const s2 = sets[1];
  const s1Complete = s1.scoreNous !== "" && s1.scoreEux !== "";
  const s2Complete = s2.scoreNous !== "" && s2.scoreEux !== "";
  const autoThird =
    s1Complete &&
    s2Complete &&
    Number(s1.scoreNous) > Number(s1.scoreEux) !== (Number(s2.scoreNous) > Number(s2.scoreEux));
  return Math.max(manualSetsCount, autoThird ? 3 : 2);
}

function completeSetsOf(sets: SetDraft[], visibleCount: number): Match["sets"] {
  return sets
    .slice(0, visibleCount)
    .filter((s) => s.scoreNous !== "" && s.scoreEux !== "")
    .map((s) => ({ scoreNous: Number(s.scoreNous), scoreEux: Number(s.scoreEux) }));
}

// ── Composant ────────────────────────────────────────────────────────────────

export interface MatchFormProps {
  /** Match à modifier. Absent = création. */
  initialMatch?: Match;
  title: string;
  submitLabel: string;
  onSubmit: (match: Match) => void;
  onCancel?: () => void;
  /** Si fourni, affiche « Supprimer ce match » (avec confirmation). */
  onDelete?: () => void;
}

export function MatchForm({
  initialMatch,
  title,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
}: MatchFormProps) {
  const { theme } = useAppTheme();
  const isEdit = initialMatch !== undefined;
  const [draft, setDraft] = useState<MatchDraft>(makeEmptyDraft);
  // En édition, on attend la résolution des joueurs legacy avant d'afficher les
  // champs : PlayerAutocomplete ne lit son texte par défaut qu'au montage.
  const [isReady, setIsReady] = useState(!isEdit);

  // Initialisation unique au montage : le parent remonte le formulaire (prop
  // `key`) pour éditer un autre match.
  useEffect(() => {
    if (!initialMatch) return;
    let cancelled = false;
    getPlayers().then((players) => {
      if (cancelled) return;
      setDraft(matchToDraft(initialMatch, players));
      setIsReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleSetsCount = useMemo(
    () => computeVisibleSetsCount(draft.sets, draft.manualSetsCount),
    [draft.sets, draft.manualSetsCount],
  );

  function updateSet(index: number, field: "scoreNous" | "scoreEux", value: string) {
    const sanitized = value.replace(/[^0-9]/g, "").slice(0, 2);
    setDraft((prev) => {
      const sets = prev.sets.map((s, i) => (i === index ? { ...s, [field]: sanitized } : s));
      // Déduction automatique : uniquement quand le score change, pour ne pas
      // écraser un choix manuel fait après coup.
      const visible = computeVisibleSetsCount(sets, prev.manualSetsCount);
      const deduced = deduceResultFromSets(completeSetsOf(sets, visible));
      return { ...prev, sets, resultat: deduced ?? prev.resultat };
    });
  }

  function getSetColors(s: SetDraft): { colorNous: string; colorEux: string } {
    if (s.scoreNous === "" || s.scoreEux === "")
      return { colorNous: theme.border, colorEux: theme.border };
    const n = Number(s.scoreNous);
    const e = Number(s.scoreEux);
    if (n > e) return { colorNous: "rgba(206,255,0,0.35)", colorEux: "rgba(255,77,109,0.35)" };
    if (e > n) return { colorNous: "rgba(255,77,109,0.35)", colorEux: "rgba(206,255,0,0.35)" };
    return { colorNous: theme.border, colorEux: theme.border };
  }

  // Un joueur ne peut occuper qu'une place dans le match : chaque champ exclut
  // les joueurs sélectionnés dans les autres champs actifs
  const isDoubles = draft.mode !== "simple";
  const slotIds = {
    partenaire: isDoubles ? draft.partenaireId : null,
    adversaire1: draft.adversaireId,
    adversaire2: isDoubles ? draft.adversaire2Id : null,
  };
  const othersThan = (slot: keyof typeof slotIds): string[] =>
    (Object.keys(slotIds) as (keyof typeof slotIds)[])
      .filter((k) => k !== slot)
      .map((k) => slotIds[k])
      .filter((id): id is string => id !== null);
  const selectedIds = Object.values(slotIds).filter((id): id is string => id !== null);
  // Possible uniquement avec un ancien match enregistré avant cette règle
  const hasDuplicatePlayer = new Set(selectedIds).size !== selectedIds.length;

  // Le résultat est le seul champ obligatoire ; un doublon de joueur bloque aussi
  const canSubmit = isReady && draft.resultat !== null && !hasDuplicatePlayer;

  async function handleSubmit() {
    if (!canSubmit || draft.resultat === null) return;
    const resultat = draft.resultat;

    // Résolution fraîche des noms (couvre les joueurs créés à l'instant dans PlayerAutocomplete)
    const allPlayers = await getPlayers();
    const resolveName = (id: string | null, legacyText: string): string =>
      id ? (allPlayers.find((p) => p.id === id)?.name ?? "") : legacyText.trim();

    // Chaîne adversaire pour rétrocompatibilité (affichage + anciennes versions)
    const adversaireValue = [
      resolveName(draft.adversaireId, draft.adversaireDefaultText),
      isDoubles ? resolveName(draft.adversaire2Id, draft.adversaire2DefaultText) : "",
    ]
      .filter(Boolean)
      .join(" / ");

    const partenaireValue = isDoubles
      ? resolveName(draft.partenaireId, draft.partenaireDefaultText) || undefined
      : undefined;

    const adversaireIds = [draft.adversaireId, isDoubles ? draft.adversaire2Id : null].filter(
      (id): id is string => id !== null,
    );

    const match: Match = {
      // Compat string
      adversaire: adversaireValue,
      partenaire: partenaireValue,
      // Champs Player
      adversaireId: draft.adversaireId ?? undefined,
      adversaireIds: adversaireIds.length > 0 ? adversaireIds : undefined,
      partenaireId: isDoubles ? (draft.partenaireId ?? undefined) : undefined,
      // partenaireIds : champ legacy, conservé tel quel en double/mixte
      partenaireIds: isDoubles ? initialMatch?.partenaireIds : undefined,
      // Reste
      resultat,
      mode: draft.mode,
      sets: completeSetsOf(draft.sets, visibleSetsCount),
      commentaire: draft.commentaire.trim() || undefined,
    };

    onSubmit(match);
    if (!isEdit) setDraft(makeEmptyDraft());
  }

  function handleDelete() {
    if (!onDelete) return;
    if (Platform.OS === "web") {
      if (globalThis.confirm?.("Supprimer ce match ? Cette action est définitive.")) onDelete();
      return;
    }
    Alert.alert("Supprimer ce match", "Ce match sera retiré de la séance. Cette action est définitive.", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: onDelete },
    ]);
  }

  if (!isReady) {
    return (
      <View style={styles.form}>
        <Text style={styles.formTitle}>{title}</Text>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>{title}</Text>
        {onCancel ? (
          <Pressable hitSlop={10} onPress={onCancel}>
            <Text style={[styles.cancelText, { color: theme.secondaryText }]}>Annuler</Text>
          </Pressable>
        ) : null}
      </View>

      {/* 1. Mode */}
      <View style={styles.formRow}>
        <Text style={[styles.miniLabel, { color: theme.secondaryText }]}>Mode</Text>
        <View style={styles.chips}>
          {(["simple", "double", "mixte"] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() =>
                setDraft((prev) =>
                  // Passer de double à mixte (ou inverse) garde les joueurs saisis
                  (prev.mode === "simple") === (mode === "simple")
                    ? { ...prev, mode }
                    : {
                        ...prev,
                        mode,
                        adversaire2Id: null,
                        adversaire2DefaultText: "",
                        partenaireId: null,
                        partenaireDefaultText: "",
                      },
                )
              }
              style={[
                styles.chip,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                draft.mode === mode && styles.chipSelectedMode,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: theme.secondaryText },
                  draft.mode === mode && styles.chipTextSelectedMode,
                ]}
              >
                {MATCH_MODE_LABELS[mode]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 2. Partenaire — double / mixte uniquement
          zIndex élevé : son dropdown doit passer au-dessus des champs ci-dessous */}
      {draft.mode !== "simple" ? (
        <View style={[styles.formRow, { zIndex: 30 }]}>
          <PlayerAutocomplete
            label="Partenaire"
            value={draft.partenaireId}
            onChange={(id) => setDraft((p) => ({ ...p, partenaireId: id, partenaireDefaultText: "" }))}
            placeholder="Prénom ou pseudo..."
            defaultText={draft.partenaireDefaultText}
            excludedPlayerIds={othersThan("partenaire")}
          />
        </View>
      ) : null}

      {/* 3. Résultat (obligatoire) */}
      <View style={styles.formRow}>
        <Text style={[styles.miniLabel, { color: theme.secondaryText }]}>
          Résultat{"  "}
          <Text style={[styles.miniLabelNote, { color: theme.secondaryText }]}>· obligatoire</Text>
        </Text>
        <View style={styles.chips}>
          {MATCH_RESULTS.map((r) => {
            const selected = draft.resultat === r;
            return (
              <Pressable
                key={r}
                onPress={() => setDraft((prev) => ({ ...prev, resultat: r }))}
                style={[
                  styles.chip,
                  { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                  selected && { borderColor: MATCH_RESULT_COLORS[r], backgroundColor: MATCH_RESULT_BG[r] },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: theme.secondaryText },
                    selected && { color: MATCH_RESULT_COLORS[r] },
                  ]}
                >
                  {MATCH_RESULT_LABELS[r]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 4a. Adversaire principal
          zIndex intermédiaire : son dropdown passe au-dessus de l'adversaire 2 et du score */}
      <View style={[styles.formRow, { zIndex: 20 }]}>
        <PlayerAutocomplete
          label={draft.mode !== "simple" ? "Adversaire 1" : "Adversaire"}
          value={draft.adversaireId}
          onChange={(id) => setDraft((p) => ({ ...p, adversaireId: id, adversaireDefaultText: "" }))}
          placeholder="Prénom ou pseudo..."
          defaultText={draft.adversaireDefaultText}
          excludedPlayerIds={othersThan("adversaire1")}
        />
      </View>

      {/* 4b. 2e adversaire — double / mixte uniquement */}
      {draft.mode !== "simple" ? (
        <View style={[styles.formRow, { zIndex: 10 }]}>
          <PlayerAutocomplete
            label="Adversaire 2"
            value={draft.adversaire2Id}
            onChange={(id) => setDraft((p) => ({ ...p, adversaire2Id: id, adversaire2DefaultText: "" }))}
            placeholder="2e adversaire..."
            defaultText={draft.adversaire2DefaultText}
            excludedPlayerIds={othersThan("adversaire2")}
          />
        </View>
      ) : null}

      {/* 5. Score */}
      <View style={styles.formRow}>
        <Text style={[styles.miniLabel, { color: theme.secondaryText }]}>
          Score{"  "}
          <Text style={[styles.miniLabelNote, { color: theme.secondaryText }]}>· nous – eux</Text>
        </Text>
        <View style={styles.scoreHeaderRow}>
          <View style={styles.scoreSetLabelCell} />
          <Text style={[styles.scoreColHeader, { color: theme.secondaryText }]}>Nous</Text>
          <View style={styles.scoreDashSpacer} />
          <Text style={[styles.scoreColHeader, { color: theme.secondaryText }]}>Eux</Text>
        </View>
        {Array.from({ length: visibleSetsCount }, (_, i) => {
          const s = draft.sets[i];
          const { colorNous, colorEux } = getSetColors(s);
          return (
            <View key={i} style={styles.scoreRow}>
              <Text style={[styles.scoreSetLabelText, { color: theme.secondaryText }]}>Set {i + 1}</Text>
              <TextInput
                keyboardType="numeric"
                maxLength={2}
                onChangeText={(v) => updateSet(i, "scoreNous", v)}
                placeholder="–"
                placeholderTextColor={theme.secondaryText}
                style={[styles.scoreInput, { backgroundColor: theme.surface, borderColor: colorNous, color: theme.text }]}
                textAlign="center"
                value={s.scoreNous}
              />
              <Text style={[styles.scoreDash, { color: theme.secondaryText }]}>–</Text>
              <TextInput
                keyboardType="numeric"
                maxLength={2}
                onChangeText={(v) => updateSet(i, "scoreEux", v)}
                placeholder="–"
                placeholderTextColor={theme.secondaryText}
                style={[styles.scoreInput, { backgroundColor: theme.surface, borderColor: colorEux, color: theme.text }]}
                textAlign="center"
                value={s.scoreEux}
              />
            </View>
          );
        })}
        {visibleSetsCount < MAX_SETS ? (
          <View style={styles.scoreRow}>
            <View style={styles.scoreSetLabelCell} />
            <Pressable
              onPress={() =>
                setDraft((prev) => ({
                  ...prev,
                  manualSetsCount: Math.max(prev.manualSetsCount, visibleSetsCount) + 1,
                }))
              }
              style={[styles.addSetBtn, { borderColor: "rgba(255,255,255,0.1)" }]}
            >
              <Ionicons color={theme.secondaryText} name="add" size={10} />
              <Text style={[styles.addSetBtnText, { color: theme.secondaryText }]}>Ajouter un set</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* 6. Commentaire */}
      <View style={styles.formRow}>
        <Text style={[styles.miniLabel, { color: theme.secondaryText }]}>Commentaire</Text>
        <TextInput
          onChangeText={(v) => setDraft((p) => ({ ...p, commentaire: v }))}
          placeholder="Notes sur ce match..."
          placeholderTextColor={theme.secondaryText}
          style={[styles.miniInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          value={draft.commentaire}
        />
      </View>

      {/* Validation */}
      <Pressable
        disabled={!canSubmit}
        onPress={handleSubmit}
        style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
      >
        <Ionicons
          color={canSubmit ? "#000000" : "rgba(0,229,255,0.4)"}
          name={isEdit ? "checkmark" : "add"}
          size={12}
        />
        <Text style={[styles.submitBtnText, !canSubmit && styles.submitBtnTextDisabled]}>{submitLabel}</Text>
      </Pressable>
      {hasDuplicatePlayer ? (
        <Text style={[styles.hint, styles.hintError]}>
          Un même joueur est sélectionné à deux places : corrige le partenaire ou les adversaires.
        </Text>
      ) : null}
      {draft.resultat === null ? (
        <Text style={[styles.hint, { color: theme.secondaryText }]}>
          Choisis un résultat (ou saisis le score) pour enregistrer le match.
        </Text>
      ) : null}

      {onDelete ? (
        <Pressable hitSlop={6} onPress={handleDelete} style={styles.deleteBtn}>
          <Ionicons color="#FF4D6D" name="trash-outline" size={12} />
          <Text style={styles.deleteBtnText}>Supprimer ce match</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  form: {
    backgroundColor: "rgba(0,229,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.2)",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    // Pas de overflow:hidden — nécessaire pour les dropdowns PlayerAutocomplete
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  formTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#00E5FF",
  },
  cancelText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
  },
  formRow: {
    gap: 5,
  },
  miniLabel: {
    fontSize: 9,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  miniLabelNote: {
    fontFamily: fonts.bodyRegular,
    letterSpacing: 0,
    textTransform: "none",
    fontSize: 9,
  },
  miniInput: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },
  chips: {
    flexDirection: "row",
    gap: 5,
  },
  chip: {
    height: 26,
    paddingHorizontal: 9,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontFamily: fonts.displayBold,
    fontSize: 10,
  },
  chipSelectedMode: {
    borderColor: "#00E5FF",
    backgroundColor: "rgba(0,229,255,0.08)",
  },
  chipTextSelectedMode: {
    color: "#00E5FF",
  },
  scoreHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  scoreSetLabelCell: {
    minWidth: 36,
  },
  scoreColHeader: {
    flex: 1,
    fontSize: 9,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    textAlign: "center",
  },
  scoreDashSpacer: {
    width: 14,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  scoreSetLabelText: {
    fontSize: 10,
    fontFamily: fonts.displayBold,
    minWidth: 36,
  },
  scoreInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    fontSize: 13,
    fontFamily: fonts.displayBold,
  },
  scoreDash: {
    fontSize: 12,
    width: 14,
    textAlign: "center",
  },
  addSetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 5,
  },
  addSetBtnText: {
    fontFamily: fonts.displayBold,
    fontSize: 10,
  },
  submitBtn: {
    height: 34,
    borderRadius: 9,
    backgroundColor: "#00E5FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  submitBtnDisabled: {
    backgroundColor: "rgba(0,229,255,0.25)",
  },
  submitBtnText: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    color: "#000000",
  },
  submitBtnTextDisabled: {
    color: "rgba(255,255,255,0.3)",
  },
  hint: {
    fontSize: 10,
    fontFamily: fonts.bodyRegular,
    textAlign: "center",
  },
  hintError: {
    color: "#FF4D6D",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  deleteBtnText: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    color: "#FF4D6D",
  },
});
