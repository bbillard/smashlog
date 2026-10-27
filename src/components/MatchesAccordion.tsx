import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MatchForm } from "@/src/components/matches/MatchForm";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { Match } from "@/src/types/session";
import {
  MATCH_MODE_LABELS,
  MATCH_RESULT_BG,
  MATCH_RESULT_COLORS,
  MATCH_RESULT_LABELS,
} from "@/src/utils/matchResult";
import { formatMatchScore } from "@/src/utils/playerStats";

// ── Carte match saisi ─────────────────────────────────────────────────────────

function MatchCard({
  match,
  index,
  onEdit,
  onDelete,
}: {
  match: Match;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { theme } = useAppTheme();
  const barColor = MATCH_RESULT_COLORS[match.resultat];
  const score = formatMatchScore(match.sets);

  return (
    <Pressable
      accessibilityLabel={`Modifier le match ${index + 1}`}
      onPress={onEdit}
      style={[
        styles.matchCard,
        { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
      ]}
    >
      <View style={[styles.matchCardBar, { backgroundColor: barColor }]} />
      <View style={styles.matchCardContent}>
        <View style={styles.matchCardTop}>
          <Text style={[styles.matchNum, { color: theme.secondaryText }]}>Match {index + 1}</Text>
          <View style={[styles.matchResultBadge, { backgroundColor: MATCH_RESULT_BG[match.resultat] }]}>
            <Text style={[styles.matchResultBadgeText, { color: MATCH_RESULT_COLORS[match.resultat] }]}>
              {MATCH_RESULT_LABELS[match.resultat]}
            </Text>
          </View>
          <View style={[styles.matchModeBadge, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
            <Text style={[styles.matchModeBadgeText, { color: theme.secondaryText }]}>
              {MATCH_MODE_LABELS[match.mode]}
            </Text>
          </View>
          <View style={styles.matchActions}>
            <Pressable accessibilityLabel="Modifier ce match" hitSlop={10} onPress={onEdit}>
              <Ionicons color={theme.secondaryText} name="pencil-outline" size={13} />
            </Pressable>
            <Pressable accessibilityLabel="Retirer ce match" hitSlop={10} onPress={onDelete}>
              <Ionicons color={theme.secondaryText} name="close" size={13} />
            </Pressable>
          </View>
        </View>
        <View style={styles.matchCardBody}>
          <Text numberOfLines={1} style={[styles.matchVs, { color: theme.tertiaryText }]}>
            vs. <Text style={[styles.matchVsName, { color: theme.text }]}>{match.adversaire}</Text>
            {match.partenaire ? (
              <Text style={{ color: theme.tertiaryText }}> · avec {match.partenaire}</Text>
            ) : null}
          </Text>
          {score ? <Text style={[styles.matchScore, { color: theme.text }]}>{score}</Text> : null}
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
    </Pressable>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

/**
 * Accordéon de saisie des matchs d'une séance (wizard de création et mode
 * édition du détail de séance). Les matchs sont gérés en mémoire par le parent
 * via `onChange` — la persistance (locale + cloud) reste faite par l'écran
 * appelant au moment de l'enregistrement de la séance.
 */
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
  // Index du match en cours de modification (null = aucun)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  // Change à chaque ajout pour remonter un formulaire vierge
  const [addFormKey, setAddFormKey] = useState(0);

  function handleAddMatch(match: Match) {
    onChange([...matches, match]);
    setAddFormKey((k) => k + 1);
  }

  function handleUpdateMatch(index: number, match: Match) {
    // Écrase le match à la même position : pas de doublon, identité positionnelle conservée
    onChange(matches.map((m, i) => (i === index ? match : m)));
    setEditingIndex(null);
  }

  function handleDeleteMatch(index: number) {
    onChange(matches.filter((_, i) => i !== index));
    setEditingIndex((current) => {
      if (current === null || current === index) return null;
      return current > index ? current - 1 : current;
    });
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

  const showAddForm = editingIndex === null && !(singleMatch && matches.length >= 1);

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
        {/* Matchs déjà saisis — le match en cours d'édition est remplacé par son formulaire */}
        {matches.map((match, index) =>
          editingIndex === index ? (
            <MatchForm
              key={`edit-${index}`}
              initialMatch={match}
              title={`Modifier le match ${index + 1}`}
              submitLabel="Enregistrer les modifications"
              onSubmit={(updated) => handleUpdateMatch(index, updated)}
              onCancel={() => setEditingIndex(null)}
              onDelete={() => handleDeleteMatch(index)}
            />
          ) : (
            <MatchCard
              key={`match-${index}`}
              index={index}
              match={match}
              onEdit={() => setEditingIndex(index)}
              onDelete={() => handleDeleteMatch(index)}
            />
          ),
        )}

        {/* Formulaire d'ajout (masqué pendant une modification) */}
        {showAddForm ? (
          <MatchForm
            key={`add-${addFormKey}`}
            title={singleMatch ? "Match joué" : `+ Match ${matches.length + 1}`}
            submitLabel="Ajouter ce match"
            onSubmit={handleAddMatch}
          />
        ) : null}
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
  matchActions: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
