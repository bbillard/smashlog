import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { LoadingView } from "@/src/components/LoadingView";
import { Screen } from "@/src/components/Screen";
import { SectionCard } from "@/src/components/SectionCard";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { deletePlayer, getPlayerById, getSessions, renamePlayerInSessions, updatePlayer } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { Player } from "@/src/types/index";
import { Session } from "@/src/types/session";
import { formatShortDate } from "@/src/utils/format";
import {
  avatarColors,
  computePlayerStats,
  formatMatchScore,
  MatchRecord,
  PlayerStats,
} from "@/src/utils/playerStats";

// ── Badges ────────────────────────────────────────────────────────────────────

function ResultBadge({ resultat }: { resultat: "victoire" | "defaite" }) {
  const isWin = resultat === "victoire";
  return (
    <View
      style={[
        badgeStyles.wrap,
        { backgroundColor: isWin ? "rgba(206,255,0,0.1)" : "rgba(255,77,109,0.1)" },
      ]}
    >
      <Text style={[badgeStyles.text, { color: isWin ? "#CEFF00" : "#FF4D6D" }]}>
        {isWin ? "Victoire" : "Défaite"}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 0,
  },
  text: {
    fontFamily: fonts.displayBold,
    fontSize: 9,
  },
});

// ── Ligne d'historique ────────────────────────────────────────────────────────

function HistoryRow({ record }: { record: MatchRecord }) {
  const { theme } = useAppTheme();
  const score = formatMatchScore(record.sets);
  const context = record.isAdversaire ? "vs." : "avec";

  return (
    <View
      style={[histStyles.row, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
    >
      <ResultBadge resultat={record.resultat} />
      <Text style={[histStyles.context, { color: theme.secondaryText }]}>{context}</Text>
      <Text style={[histStyles.date, { color: theme.secondaryText }]}>
        {formatShortDate(record.sessionDate)}
      </Text>
      {score ? (
        <Text style={[histStyles.score, { color: theme.text }]}>{score}</Text>
      ) : null}
    </View>
  );
}

const histStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  context: {
    fontSize: 10,
    fontFamily: fonts.bodyRegular,
    flexShrink: 0,
  },
  date: {
    fontSize: 10,
    fontFamily: fonts.bodyRegular,
    flex: 1,
  },
  score: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    flexShrink: 0,
  },
});

// ── Boîte stat ────────────────────────────────────────────────────────────────

function StatBox({ value, label, color }: { value: string; label: string; color: string }) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[statStyles.box, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
    >
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={[statStyles.label, { color: theme.secondaryText }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 2,
  },
  value: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 18,
    lineHeight: 22,
  },
  label: {
    fontSize: 9,
    fontFamily: fonts.displayBold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});

// ── Écran principal ───────────────────────────────────────────────────────────

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();

  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let active = true;

      async function load() {
        setIsLoading(true);
        const [foundPlayer, sessions] = await Promise.all([
          getPlayerById(id),
          getSessions(),
        ]);
        if (active) {
          setPlayer(foundPlayer);
          setNotesDraft(foundPlayer?.notes ?? "");
          setStats(foundPlayer ? computePlayerStats(foundPlayer, sessions) : null);
          setIsLoading(false);
        }
      }

      load();
      return () => {
        active = false;
      };
    }, [id]),
  );

  async function handleSaveName() {
    if (!player || isSavingName) return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === player.name) {
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    try {
      // 1. Met à jour le joueur
      await updatePlayer(player.id, { name: trimmed });
      // 2. Propage le nouveau nom dans tous les matchs qui le référencent
      await renamePlayerInSessions(player.id, trimmed);
      setPlayer((prev) => (prev ? { ...prev, name: trimmed } : prev));
      setIsEditingName(false);
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleSaveNotes() {
    if (!player || isSavingNotes) return;
    setIsSavingNotes(true);
    try {
      await updatePlayer(player.id, { notes: notesDraft.trim() || undefined });
      setPlayer((prev) => (prev ? { ...prev, notes: notesDraft.trim() || undefined } : prev));
      setIsEditingNotes(false);
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function confirmDelete() {
    if (!player) return;
    await deletePlayer(player.id);
    router.back();
  }

  function handleDelete() {
    if (Platform.OS === "web") {
      const confirmed = globalThis.confirm?.(
        `Supprimer ${player?.name} ? Cette action est définitive.`,
      );
      if (confirmed) confirmDelete();
      return;
    }
    Alert.alert(
      "Supprimer ce joueur",
      `Supprimer ${player?.name} ? Les matchs existants ne seront pas modifiés.`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: confirmDelete },
      ],
    );
  }

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Joueur" }} />
        <Screen nativeHeader>
          <LoadingView />
        </Screen>
      </>
    );
  }

  if (!player || !stats) {
    return (
      <>
        <Stack.Screen options={{ title: "Joueur" }} />
        <Screen nativeHeader>
          <Text style={[styles.missing, { color: theme.text }]}>Joueur introuvable.</Text>
        </Screen>
      </>
    );
  }

  const av = avatarColors(player.name);

  // Win rates séparés par rôle (calculés à partir des records, sans toucher playerStats.ts)
  const advRecords = stats.records.filter((r) => r.isAdversaire);
  const partRecords = stats.records.filter((r) => r.isPartenaire);

  const advWins = advRecords.filter((r) => r.resultat === "victoire").length;
  const advWinRate = advRecords.length > 0 ? Math.round((advWins / advRecords.length) * 100) : 0;
  const advWrColor = advWinRate >= 50 ? "#CEFF00" : "#FF4D6D";

  const partWins = partRecords.filter((r) => r.resultat === "victoire").length;
  const partWinRate = partRecords.length > 0 ? Math.round((partWins / partRecords.length) * 100) : 0;
  const partWrColor = partWinRate >= 50 ? "#00E5FF" : "#FF4D6D";

  return (
    <>
      <Stack.Screen options={{ title: player.name }} />
      <Screen scrollable nativeHeader>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={[styles.heroAvatar, { backgroundColor: av.bg }]}>
            <Text style={[styles.heroAvatarText, { color: av.text }]}>
              {player.name[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.heroInfo}>
            {/* Nom — affichage ou édition inline */}
            {isEditingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={[styles.nameInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />
                <Pressable
                  onPress={handleSaveName}
                  disabled={isSavingName || !nameDraft.trim()}
                  hitSlop={8}
                  style={[styles.nameActionBtn, styles.nameActionBtnConfirm, { opacity: !nameDraft.trim() ? 0.4 : 1 }]}
                >
                  <Ionicons name="checkmark" size={16} color="#000" />
                </Pressable>
                <Pressable
                  onPress={() => setIsEditingName(false)}
                  hitSlop={8}
                  style={[styles.nameActionBtn, { borderColor: theme.border }]}
                >
                  <Ionicons name="close" size={14} color={theme.secondaryText} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.nameRow}>
                <Text style={[styles.heroName, { color: theme.text }]}>{player.name}</Text>
                <Pressable
                  onPress={() => { setNameDraft(player.name); setIsEditingName(true); }}
                  hitSlop={10}
                >
                  <Ionicons name="pencil-outline" size={14} color={theme.secondaryText} />
                </Pressable>
              </View>
            )}
            {stats.firstMatchDate ? (
              <Text style={[styles.heroMeta, { color: theme.secondaryText }]}>
                Depuis {formatShortDate(stats.firstMatchDate)}
              </Text>
            ) : (
              <Text style={[styles.heroMeta, { color: theme.secondaryText }]}>
                Aucun match enregistré
              </Text>
            )}
          </View>
        </View>

        {/* ── Stats — un bloc par rôle ──────────────────────────────────── */}
        {stats.isAdversaire ? (
          <View style={[styles.roleBlock, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <View style={styles.roleBlockHeader}>
              <Ionicons name="trophy-outline" size={12} color={theme.secondaryText} />
              <Text style={[styles.roleBlockLabel, { color: theme.secondaryText }]}>Adversaire</Text>
              <Text style={[styles.roleBlockCount, { color: theme.secondaryText }]}>
                {advRecords.length} match{advRecords.length > 1 ? "s" : ""}
              </Text>
            </View>
            <View style={styles.statsRow}>
              <StatBox value={String(advWins)} label="Victoires" color="#CEFF00" />
              <StatBox value={String(advRecords.length - advWins)} label="Défaites" color="#FF4D6D" />
              <View style={[statStyles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.wrValueRow}>
                  <Text style={[statStyles.value, styles.wrValueText, { color: advWrColor }]}>
                    {advWinRate}%
                  </Text>
                  <Ionicons name="trophy-outline" size={12} color={advWrColor} />
                </View>
                <Text style={[statStyles.label, { color: theme.secondaryText }]}>Win rate</Text>
              </View>
            </View>
          </View>
        ) : null}

        {stats.isPartenaire ? (
          <View style={[styles.roleBlock, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <View style={styles.roleBlockHeader}>
              <Ionicons name="people-outline" size={12} color={theme.secondaryText} />
              <Text style={[styles.roleBlockLabel, { color: theme.secondaryText }]}>Partenaire</Text>
              <Text style={[styles.roleBlockCount, { color: theme.secondaryText }]}>
                {partRecords.length} match{partRecords.length > 1 ? "s" : ""}
              </Text>
            </View>
            <View style={styles.statsRow}>
              <StatBox value={String(partWins)} label="Victoires" color="#CEFF00" />
              <StatBox value={String(partRecords.length - partWins)} label="Défaites" color="#FF4D6D" />
              <View style={[statStyles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.wrValueRow}>
                  <Text style={[statStyles.value, styles.wrValueText, { color: partWrColor }]}>
                    {partWinRate}%
                  </Text>
                  <Ionicons name="people-outline" size={12} color={partWrColor} />
                </View>
                <Text style={[statStyles.label, { color: theme.secondaryText }]}>Win rate</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* ── Historique ────────────────────────────────────────────────── */}
        {stats.records.length > 0 ? (
          <SectionCard>
            <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
              Historique des matchs
            </Text>
            <View style={styles.historyList}>
              {stats.records.map((record, idx) => (
                <HistoryRow key={idx} record={record} />
              ))}
            </View>
          </SectionCard>
        ) : null}

        {/* ── Notes ─────────────────────────────────────────────────────── */}
        <SectionCard>
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>Notes</Text>

          {isEditingNotes ? (
            <>
              <TextInput
                style={[
                  styles.notesInput,
                  {
                    backgroundColor: theme.surfaceAlt,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Ajoute des notes sur ce joueur..."
                placeholderTextColor={theme.secondaryText + "70"}
                value={notesDraft}
                onChangeText={setNotesDraft}
                multiline
                autoFocus
                textAlignVertical="top"
              />
              <View style={styles.notesActions}>
                <Pressable
                  onPress={() => {
                    setIsEditingNotes(false);
                    setNotesDraft(player.notes ?? "");
                  }}
                  style={[styles.notesBtn, { borderColor: theme.border }]}
                >
                  <Text style={[styles.notesBtnText, { color: theme.secondaryText }]}>
                    Annuler
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveNotes}
                  disabled={isSavingNotes}
                  style={[styles.notesBtn, styles.notesBtnPrimary]}
                >
                  <Text style={styles.notesBtnPrimaryText}>
                    {isSavingNotes ? "Enregistrement..." : "Enregistrer"}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : player.notes ? (
            <>
              <Text style={[styles.notesText, { color: theme.text }]}>{player.notes}</Text>
              <Pressable onPress={() => setIsEditingNotes(true)} style={styles.notesEditBtn}>
                <Ionicons name="pencil-outline" size={13} color={theme.secondaryText} />
                <Text style={[styles.notesEditBtnText, { color: theme.secondaryText }]}>
                  Modifier les notes
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={() => setIsEditingNotes(true)} style={styles.notesEditBtn}>
              <Ionicons name="add" size={14} color={theme.secondaryText} />
              <Text style={[styles.notesEditBtnText, { color: theme.secondaryText }]}>
                Ajouter des notes
              </Text>
            </Pressable>
          )}
        </SectionCard>

        {/* ── Supprimer ─────────────────────────────────────────────────── */}
        <Pressable
          onPress={handleDelete}
          style={[styles.deleteBtn, { borderColor: "rgba(255,77,109,0.3)" }]}
        >
          <Ionicons name="trash-outline" size={15} color="#FF4D6D" />
          <Text style={styles.deleteBtnText}>Supprimer ce joueur</Text>
        </Pressable>
      </Screen>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  missing: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
  },

  // ── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroAvatarText: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
  },
  heroInfo: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroName: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  nameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 18,
    fontFamily: fonts.displayExtraBold,
  },
  nameActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  nameActionBtnConfirm: {
    backgroundColor: "#CEFF00",
    borderColor: "#CEFF00",
  },
  heroMeta: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },

  // ── Stats ─────────────────────────────────────────────────────────────────────
  roleBlock: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  roleBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roleBlockLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    flex: 1,
  },
  roleBlockCount: {
    fontSize: 10,
    fontFamily: fonts.bodyRegular,
  },
  statsRow: {
    flexDirection: "row",
    gap: 7,
  },
  wrValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  wrValueText: {
    fontSize: 15,
    lineHeight: 19,
  },

  // ── Section title ────────────────────────────────────────────────────────────
  sectionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  // ── Historique ────────────────────────────────────────────────────────────────
  historyList: {
    gap: 6,
  },

  // ── Notes ────────────────────────────────────────────────────────────────────
  notesText: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
    lineHeight: 20,
    fontStyle: "italic",
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
    minHeight: 80,
    lineHeight: 20,
  },
  notesActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  notesBtn: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notesBtnText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
  },
  notesBtnPrimary: {
    backgroundColor: "#CEFF00",
    borderColor: "#CEFF00",
  },
  notesBtnPrimaryText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: "#000000",
  },
  notesEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  notesEditBtnText: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },

  // ── Supprimer ────────────────────────────────────────────────────────────────
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  deleteBtnText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: "#FF4D6D",
  },
});
