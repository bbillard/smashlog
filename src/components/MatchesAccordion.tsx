import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import PlayerAutocomplete from "@/src/components/PlayerAutocomplete";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { getPlayers } from "@/src/services/storage";
import { Match } from "@/src/types/session";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatScore(sets: Match["sets"]): string {
  if (sets.length === 0) return "";
  return sets.map((s) => `${s.scoreNous}-${s.scoreEux}`).join(", ");
}

const MODE_LABELS: Record<Match["mode"], string> = {
  simple: "Simple",
  double: "Double",
  mixte: "Mixte",
};

const RESULT_LABELS: Record<Match["resultat"], string> = {
  victoire: "Victoire",
  defaite: "Défaite",
};

const MAX_SETS = 5;

// ── Types internes ────────────────────────────────────────────────────────────

interface SetDraft {
  scoreNous: string;
  scoreEux: string;
}

interface MatchDraft {
  mode: Match["mode"];
  resultat: Match["resultat"] | null;
  // Adversaire principal (tous modes)
  adversaireId: string | null;
  adversaireDefaultText: string; // pré-remplissage legacy (mode édition)
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

const INITIAL_MATCH_DRAFT: MatchDraft = {
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

// ── Carte match saisi ─────────────────────────────────────────────────────────

function MatchCard({
  match,
  index,
  onDelete,
}: {
  match: Match;
  index: number;
  onDelete: () => void;
}) {
  const { theme } = useAppTheme();
  const isWin = match.resultat === "victoire";
  const barColor = isWin ? "#CEFF00" : "#FF4D6D";

  return (
    <View style={[styles.matchCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
      <View style={[styles.matchCardBar, { backgroundColor: barColor }]} />
      <View style={styles.matchCardContent}>
        <View style={styles.matchCardTop}>
          <Text style={[styles.matchNum, { color: theme.secondaryText }]}>Match {index + 1}</Text>
          <View
            style={[
              styles.matchResultBadge,
              { backgroundColor: isWin ? "rgba(206,255,0,0.1)" : "rgba(255,77,109,0.1)" },
            ]}
          >
            <Text style={[styles.matchResultBadgeText, { color: isWin ? "#CEFF00" : "#FF4D6D" }]}>
              {RESULT_LABELS[match.resultat]}
            </Text>
          </View>
          <View style={[styles.matchModeBadge, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
            <Text style={[styles.matchModeBadgeText, { color: theme.secondaryText }]}>
              {MODE_LABELS[match.mode]}
            </Text>
          </View>
          <Pressable hitSlop={10} onPress={onDelete} style={styles.matchDelete}>
            <Ionicons color={theme.secondaryText} name="close" size={13} />
          </Pressable>
        </View>
        <View style={styles.matchCardBody}>
          <Text numberOfLines={1} style={[styles.matchVs, { color: theme.tertiaryText }]}>
            vs. <Text style={[styles.matchVsName, { color: theme.text }]}>{match.adversaire}</Text>
            {match.partenaire ? (
              <Text style={{ color: theme.tertiaryText }}> · avec {match.partenaire}</Text>
            ) : null}
          </Text>
          {match.sets.length > 0 ? (
            <Text style={[styles.matchScore, { color: theme.text }]}>{formatScore(match.sets)}</Text>
          ) : null}
        </View>
        {match.commentaire ? (
          <Text
            numberOfLines={2}
            style={[styles.matchComment, { color: theme.secondaryText, borderLeftColor: theme.border }]}
          >
            {match.commentaire}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function MatchesAccordion({
  matches,
  onChange,
  singleMatch = false,
}: {
  matches: Match[];
  onChange: (matches: Match[]) => void;
  singleMatch?: boolean;
}) {
  const { theme } = useAppTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<MatchDraft>(INITIAL_MATCH_DRAFT);

  // Nombre de sets visibles :
  // - auto-3e set si set1 et set2 sont complets et split 1-1
  // - sinon, le nombre demandé manuellement
  const visibleSetsCount = useMemo(() => {
    const s1 = draft.sets[0];
    const s2 = draft.sets[1];
    const s1Complete = s1.scoreNous !== "" && s1.scoreEux !== "";
    const s2Complete = s2.scoreNous !== "" && s2.scoreEux !== "";
    const autoThird =
      s1Complete &&
      s2Complete &&
      Number(s1.scoreNous) > Number(s1.scoreEux) !== (Number(s2.scoreNous) > Number(s2.scoreEux));
    return Math.max(draft.manualSetsCount, autoThird ? 3 : 2);
  }, [draft.sets, draft.manualSetsCount]);

  function updateSet(index: number, field: "scoreNous" | "scoreEux", value: string) {
    const sanitized = value.replace(/[^0-9]/g, "").slice(0, 2);
    setDraft((prev) => {
      const updated = prev.sets.map((s, i) =>
        i === index ? { ...s, [field]: sanitized } : s,
      );
      return { ...prev, sets: updated };
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

  // Actif dès qu'au moins un champ joueur ou score est rempli
  const canAddMatch =
    draft.resultat !== null ||
    draft.adversaireId !== null ||
    draft.adversaire2Id !== null ||
    draft.partenaireId !== null ||
    draft.commentaire.trim() !== "" ||
    draft.sets.slice(0, visibleSetsCount).some((s) => s.scoreNous !== "" || s.scoreEux !== "");

  async function handleAddMatch() {
    if (!canAddMatch) return;

    // Résolution fraîche des noms (couvre les joueurs créés à l'instant dans PlayerAutocomplete)
    const allPlayers = await getPlayers();
    const resolveName = (id: string | null): string =>
      id ? (allPlayers.find((p) => p.id === id)?.name ?? "") : "";

    // Chaîne adversaire pour rétrocompatibilité (affichage dans MatchCard + anciennes versions)
    const adversaireParts = [
      resolveName(draft.adversaireId),
      draft.mode !== "simple" ? resolveName(draft.adversaire2Id) : "",
    ].filter(Boolean);
    const adversaireValue = adversaireParts.join(" / ");

    const partenaireValue =
      draft.mode !== "simple" ? resolveName(draft.partenaireId) || undefined : undefined;

    const completeSets = draft.sets
      .slice(0, visibleSetsCount)
      .filter((s) => s.scoreNous !== "" && s.scoreEux !== "")
      .map((s) => ({ scoreNous: Number(s.scoreNous), scoreEux: Number(s.scoreEux) }));

    // IDs tous adversaires (double/mixte)
    const adversaireIds = ([draft.adversaireId, draft.mode !== "simple" ? draft.adversaire2Id : null] as const)
      .filter((id): id is string => id !== null);

    const newMatch: Match = {
      // Compat string
      adversaire: adversaireValue,
      partenaire: partenaireValue,
      // Champs Player
      adversaireId: draft.adversaireId ?? undefined,
      adversaireIds: adversaireIds.length > 0 ? adversaireIds : undefined,
      partenaireId: draft.partenaireId ?? undefined,
      // Reste
      resultat: draft.resultat ?? "victoire",
      mode: draft.mode,
      sets: completeSets,
      commentaire: draft.commentaire.trim() || undefined,
    };

    onChange([...matches, newMatch]);
    setDraft({ ...INITIAL_MATCH_DRAFT, sets: makeInitialSets() });
  }

  function handleDeleteMatch(index: number) {
    onChange(matches.filter((_, i) => i !== index));
  }

  // ── État fermé ───────────────────────────────────────────────────────────────

  if (!isOpen) {
    return (
      <Pressable
        onPress={() => setIsOpen(true)}
        style={[
          styles.accordionClosed,
          { backgroundColor: theme.surfaceAlt, borderColor: "rgba(255,255,255,0.1)" },
        ]}
      >
        <View style={styles.accordionIcon}>
          <Ionicons color="#00E5FF" name="information-circle-outline" size={14} />
        </View>
        <View style={styles.accordionTextBlock}>
          <Text style={[styles.accordionTitle, { color: theme.tertiaryText }]}>
            {singleMatch ? "Détail du match joué" : "Détail des matchs joués"}
            {matches.length > 0 ? (
              <Text style={{ color: "#00E5FF" }}> · {matches.length}</Text>
            ) : null}
          </Text>
          <Text style={[styles.accordionSub, { color: theme.secondaryText }]}>
            (optionnel) Résultat, adversaire, score...
          </Text>
        </View>
        <Ionicons color={theme.secondaryText} name="chevron-down" size={14} />
      </Pressable>
    );
  }

  // ── État ouvert ──────────────────────────────────────────────────────────────

  return (
    <View style={[styles.accordionOpen, { backgroundColor: theme.surface }]}>
      {/* Header */}
      <Pressable onPress={() => setIsOpen(false)} style={styles.accordionOpenHeader}>
        <View style={styles.aohIcon}>
          <Ionicons color="#00E5FF" name="information-circle-outline" size={13} />
        </View>
        <Text style={styles.accordionOpenTitle}>{singleMatch ? "Détail du match joué" : "Détail des matchs joués"}</Text>
        <Ionicons color="#00E5FF" name="chevron-up" size={13} />
      </Pressable>

      <View style={styles.accordionOpenBody}>
        {/* Matchs déjà saisis */}
        {matches.map((match, index) => (
          <MatchCard
            key={`match-${index}`}
            index={index}
            match={match}
            onDelete={() => handleDeleteMatch(index)}
          />
        ))}

        {/* Formulaire d'ajout */}
        {singleMatch && matches.length >= 1 ? null : (
          <View style={styles.addMatchForm}>
            <Text style={styles.addMatchFormTitle}>
              {singleMatch ? "Match joué" : `+ Match ${matches.length + 1}`}
            </Text>

            {/* 1. Mode */}
            <View style={styles.formRow}>
              <Text style={[styles.miniLabel, { color: theme.secondaryText }]}>Mode</Text>
              <View style={styles.chips}>
                {(["simple", "double", "mixte"] as const).map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        mode,
                        adversaire2Id: null,
                        adversaire2DefaultText: "",
                        partenaireId: null,
                        partenaireDefaultText: "",
                      }))
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
                      {MODE_LABELS[mode]}
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
                  onChange={(id) => setDraft((p) => ({ ...p, partenaireId: id }))}
                  placeholder="Prénom ou pseudo..."
                  defaultText={draft.partenaireDefaultText}
                />
              </View>
            ) : null}

            {/* 3. Résultat */}
            <View style={styles.formRow}>
              <Text style={[styles.miniLabel, { color: theme.secondaryText }]}>Résultat</Text>
              <View style={styles.chips}>
                {(["victoire", "defaite"] as const).map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setDraft((prev) => ({ ...prev, resultat: r }))}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                      draft.resultat === r &&
                        (r === "victoire" ? styles.chipSelectedWin : styles.chipSelectedLoss),
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: theme.secondaryText },
                        draft.resultat === r &&
                          (r === "victoire"
                            ? styles.chipTextSelectedWin
                            : styles.chipTextSelectedLoss),
                      ]}
                    >
                      {RESULT_LABELS[r]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* 4a. Adversaire principal
                zIndex intermédiaire : son dropdown passe au-dessus de l'adversaire 2 et du score */}
            <View style={[styles.formRow, { zIndex: 20 }]}>
              <PlayerAutocomplete
                label={draft.mode !== "simple" ? "Adversaire 1" : "Adversaire"}
                value={draft.adversaireId}
                onChange={(id) => setDraft((p) => ({ ...p, adversaireId: id }))}
                placeholder="Prénom ou pseudo..."
                defaultText={draft.adversaireDefaultText}
              />
            </View>

            {/* 4b. 2e adversaire — double / mixte uniquement */}
            {draft.mode !== "simple" ? (
              <View style={[styles.formRow, { zIndex: 10 }]}>
                <PlayerAutocomplete
                  label="Adversaire 2"
                  value={draft.adversaire2Id}
                  onChange={(id) => setDraft((p) => ({ ...p, adversaire2Id: id }))}
                  placeholder="2e adversaire..."
                  defaultText={draft.adversaire2DefaultText}
                />
              </View>
            ) : null}

            {/* 5. Score */}
            <View style={styles.formRow}>
              <Text style={[styles.miniLabel, { color: theme.secondaryText }]}>
                Score{"  "}
                <Text style={[styles.miniLabelNote, { color: theme.secondaryText }]}>· nous – eux</Text>
              </Text>
              {/* En-têtes colonnes */}
              <View style={styles.scoreHeaderRow}>
                <View style={styles.scoreSetLabelCell} />
                <Text style={[styles.scoreColHeader, { color: theme.secondaryText }]}>Nous</Text>
                <View style={styles.scoreDashSpacer} />
                <Text style={[styles.scoreColHeader, { color: theme.secondaryText }]}>Eux</Text>
              </View>
              {/* Lignes de sets */}
              {Array.from({ length: visibleSetsCount }, (_, i) => {
                const s = draft.sets[i];
                const { colorNous, colorEux } = getSetColors(s);
                return (
                  <View key={i} style={styles.scoreRow}>
                    <Text style={[styles.scoreSetLabelText, { color: theme.secondaryText }]}>
                      Set {i + 1}
                    </Text>
                    <TextInput
                      keyboardType="numeric"
                      maxLength={2}
                      onChangeText={(v) => updateSet(i, "scoreNous", v)}
                      placeholder="–"
                      placeholderTextColor={theme.secondaryText}
                      style={[
                        styles.scoreInput,
                        { backgroundColor: theme.surface, borderColor: colorNous, color: theme.text },
                      ]}
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
                      style={[
                        styles.scoreInput,
                        { backgroundColor: theme.surface, borderColor: colorEux, color: theme.text },
                      ]}
                      textAlign="center"
                      value={s.scoreEux}
                    />
                  </View>
                );
              })}
              {/* Bouton + Ajouter un set */}
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
                    <Text style={[styles.addSetBtnText, { color: theme.secondaryText }]}>
                      Ajouter un set
                    </Text>
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
                style={[
                  styles.miniInput,
                  { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
                ]}
                value={draft.commentaire}
              />
            </View>

            {/* Bouton Ajouter ce match */}
            <Pressable
              disabled={!canAddMatch}
              onPress={handleAddMatch}
              style={[styles.addMatchBtn, !canAddMatch && styles.addMatchBtnDisabled]}
            >
              <Ionicons
                color={canAddMatch ? "#000000" : "rgba(0,229,255,0.4)"}
                name="add"
                size={12}
              />
              <Text style={[styles.addMatchBtnText, !canAddMatch && styles.addMatchBtnTextDisabled]}>
                Ajouter ce match
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Accordéon fermé ─────────────────────────────────────────────────────────
  accordionClosed: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accordionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(0,229,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  accordionTextBlock: {
    flex: 1,
    gap: 2,
  },
  accordionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
  },
  accordionSub: {
    fontSize: 10,
  },

  // ── Accordéon ouvert ─────────────────────────────────────────────────────────
  // Note: overflow: "hidden" retiré volontairement pour permettre aux dropdowns
  // PlayerAutocomplete de dépasser les bords de l'accordéon.
  accordionOpen: {
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.2)",
    borderRadius: 14,
  },
  accordionOpenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,229,255,0.1)",
    backgroundColor: "rgba(0,229,255,0.04)",
    // Coins arrondis en haut pour compenser l'absence de overflow:hidden sur le parent
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },
  aohIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "rgba(0,229,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  accordionOpenTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    color: "#00E5FF",
    flex: 1,
  },
  accordionOpenBody: {
    padding: 12,
    gap: 10,
  },

  // ── Carte match saisi ────────────────────────────────────────────────────────
  matchCard: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  matchCardBar: {
    width: 3,
  },
  matchCardContent: {
    flex: 1,
    padding: 11,
    gap: 5,
  },
  matchCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  matchNum: {
    fontFamily: fonts.displayBold,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  matchResultBadge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  matchResultBadgeText: {
    fontFamily: fonts.displayBold,
    fontSize: 9,
  },
  matchModeBadge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  matchModeBadgeText: {
    fontSize: 9,
    fontFamily: fonts.bodySemiBold,
  },
  matchDelete: {
    marginLeft: "auto",
  },
  matchCardBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  matchVs: {
    fontSize: 11,
    flex: 1,
  },
  matchVsName: {
    fontFamily: fonts.bodySemiBold,
  },
  matchScore: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
  },
  matchComment: {
    fontSize: 11,
    fontStyle: "italic",
    borderLeftWidth: 2,
    paddingLeft: 8,
  },

  // ── Formulaire ajout ─────────────────────────────────────────────────────────
  addMatchForm: {
    backgroundColor: "rgba(0,229,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.2)",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    // Pas de overflow:hidden — nécessaire pour les dropdowns PlayerAutocomplete
  },
  addMatchFormTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#00E5FF",
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

  // ── Chips ────────────────────────────────────────────────────────────────────
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
  chipSelectedWin: {
    borderColor: "#CEFF00",
    backgroundColor: "rgba(206,255,0,0.08)",
  },
  chipTextSelectedWin: {
    color: "#CEFF00",
  },
  chipSelectedLoss: {
    borderColor: "#FF4D6D",
    backgroundColor: "rgba(255,77,109,0.08)",
  },
  chipTextSelectedLoss: {
    color: "#FF4D6D",
  },
  chipSelectedMode: {
    borderColor: "#00E5FF",
    backgroundColor: "rgba(0,229,255,0.08)",
  },
  chipTextSelectedMode: {
    color: "#00E5FF",
  },

  // ── Score grid ───────────────────────────────────────────────────────────────
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

  // ── Bouton + Ajouter un set ───────────────────────────────────────────────────
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

  // ── Bouton Ajouter ce match ──────────────────────────────────────────────────
  addMatchBtn: {
    height: 34,
    borderRadius: 9,
    backgroundColor: "#00E5FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addMatchBtnDisabled: {
    backgroundColor: "rgba(0,229,255,0.25)",
  },
  addMatchBtnText: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    color: "#000000",
  },
  addMatchBtnTextDisabled: {
    color: "rgba(255,255,255,0.3)",
  },
});
