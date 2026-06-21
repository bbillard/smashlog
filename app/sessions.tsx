import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/src/components/EmptyState";
import { LoadingView } from "@/src/components/LoadingView";
import { Screen } from "@/src/components/Screen";
import { SessionCard } from "@/src/components/SessionCard";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { getSessions } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { Session } from "@/src/types/session";

export default function SessionsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    const nextSessions = await getSessions();
    setSessions(nextSessions);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

  return (
    <Screen scrollable nativeHeader>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Séances</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          {sessions.length} séance{sessions.length > 1 ? "s" : ""} enregistrée{sessions.length > 1 ? "s" : ""}
        </Text>
      </View>

      {isLoading ? <LoadingView /> : null}

      {!isLoading && sessions.length === 0 ? (
        <EmptyState
          title="Aucune séance enregistrée"
          description="Tes séances apparaîtront ici dès que tu commenceras à les logger."
        />
      ) : null}

      {!isLoading
        ? sessions.map((session) => (
            <SessionCard
              key={session.id}
              onPress={() =>
                router.push({
                  pathname: "/session/[id]",
                  params: { id: session.id },
                })
              }
              session={session}
            />
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.displayExtraBold,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
  },
});
