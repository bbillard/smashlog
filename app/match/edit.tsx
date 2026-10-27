import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { LoadingView } from "@/src/components/LoadingView";
import { MatchForm } from "@/src/components/matches/MatchForm";
import { Screen } from "@/src/components/Screen";
import { SESSION_TYPE_LABELS } from "@/src/constants/sessionOptions";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { getSessionById, updateSession } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { Match, Session } from "@/src/types/session";
import { formatDate } from "@/src/utils/format";

/**
 * Écran « Modifier le match », ouvert depuis le détail de séance, la fiche
 * joueur ou « Mes matchs ».
 *
 * Un match n'a pas d'id propre : il est identifié par sa séance + sa position
 * dans session.matches (cf. schéma Supabase, id déterministe). L'écriture passe
 * par updateSession(), qui persiste en local et synchronise le cloud — y
 * compris la suppression des lignes en trop quand un match est retiré.
 */
export default function EditMatchScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { sessionId, index, from } = useLocalSearchParams<{
    sessionId: string;
    index: string;
    from?: string;
  }>();
  const matchIndex = Number(index);

  const [session, setSession] = useState<Session | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = sessionId ? await getSessionById(sessionId) : null;
      if (cancelled) return;
      setSession(loaded);
      setMatch(loaded?.matches?.[matchIndex] ?? null);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, matchIndex]);

  /** Relit la séance au moment d'écrire pour ne pas écraser une modif concurrente. */
  async function writeMatches(transform: (matches: Match[]) => Match[]): Promise<boolean> {
    const fresh = sessionId ? await getSessionById(sessionId) : null;
    const current = fresh?.matches ?? [];
    if (!fresh || matchIndex < 0 || matchIndex >= current.length) {
      Alert.alert("Match introuvable", "Ce match a été modifié ou supprimé entre-temps.");
      return false;
    }
    await updateSession(fresh.id, { matches: transform(current) });
    return true;
  }

  async function handleSubmit(updated: Match) {
    try {
      const ok = await writeMatches((matches) => matches.map((m, i) => (i === matchIndex ? updated : m)));
      if (ok) router.back();
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer le match.");
    }
  }

  async function handleDelete() {
    try {
      const ok = await writeMatches((matches) => matches.filter((_, i) => i !== matchIndex));
      if (ok) router.back();
    } catch {
      Alert.alert("Erreur", "Impossible de supprimer le match.");
    }
  }

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Modifier le match" }} />
        <LoadingView />
      </>
    );
  }

  if (!session || !match) {
    return (
      <>
        <Stack.Screen options={{ title: "Modifier le match" }} />
        <Screen nativeHeader>
          <Text style={[styles.missing, { color: theme.text }]}>Match introuvable.</Text>
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Modifier le match" }} />
      <Screen scrollable nativeHeader>
        {/* Contexte : séance parente (lien vers son détail, sauf si on en vient) */}
        <Pressable
          disabled={from === "session"}
          onPress={() => router.push({ pathname: "/session/[id]", params: { id: session.id } })}
          style={[styles.context, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
        >
          <View style={styles.contextText}>
            <Text style={[styles.contextLabel, { color: theme.secondaryText }]}>Séance</Text>
            <Text style={[styles.contextValue, { color: theme.text }]} numberOfLines={1}>
              {session.title?.trim() || SESSION_TYPE_LABELS[session.type]} · {formatDate(session.createdAt)}
            </Text>
          </View>
          {from === "session" ? null : (
            <Text style={[styles.contextLink, { color: theme.accent3 }]}>Voir</Text>
          )}
        </Pressable>

        <MatchForm
          initialMatch={match}
          title={`Match ${matchIndex + 1}`}
          submitLabel="Enregistrer les modifications"
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          onDelete={handleDelete}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  missing: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    textAlign: "center",
    marginTop: 40,
  },
  context: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  contextText: {
    flex: 1,
    gap: 2,
  },
  contextLabel: {
    fontSize: 9,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  contextValue: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
  },
  contextLink: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
  },
});
