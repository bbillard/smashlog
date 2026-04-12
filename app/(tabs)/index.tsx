import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppSidebar } from "@/src/components/AppSidebar";
import { EmptyState } from "@/src/components/EmptyState";
import { LoadingView } from "@/src/components/LoadingView";
import { ProfileAvatar } from "@/src/components/ProfileAvatar";
import { Screen } from "@/src/components/Screen";
import { SessionCard } from "@/src/components/SessionCard";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useSidebarSwipe } from "@/src/hooks/useSidebarSwipe";
import { getProfile } from "@/src/services/profile";
import { getSessions } from "@/src/services/storage";
import { fonts } from "@/src/theme/typography";
import { Profile } from "@/src/types/profile";
import { Session } from "@/src/types/session";

const HOME_SESSIONS_LIMIT = 10;

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profile, setProfile] = useState<Profile>({ username: "Joueur Badlog", photoUri: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const visibleSessions = sessions.slice(0, HOME_SESSIONS_LIMIT);
  const hasMoreSessions = sessions.length > HOME_SESSIONS_LIMIT;
  const sidebarSwipe = useSidebarSwipe(() => setIsMenuOpen(true));

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    const [nextSessions, nextProfile] = await Promise.all([getSessions(), getProfile()]);
    setSessions(nextSessions);
    setProfile(nextProfile);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} {...sidebarSwipe.panHandlers}>
        <View style={styles.header}>
          <Text style={[styles.logo, { color: theme.primary }]}>
            Smash<Text style={[styles.logo, { color: theme.text }]}>log</Text>
          </Text>
          <Pressable
            onPress={() => setIsMenuOpen(true)}
          >
            <ProfileAvatar uri={profile.photoUri} />
          </Pressable>
        </View>

        <View style={[styles.streakCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.streakIcon, { backgroundColor: theme.primary }]}>
            <Ionicons color={theme.buttonTextOnPrimary} name="flash-outline" size={18} />
          </View>
          <View style={styles.streakText}>
            <Text style={[styles.streakTitle, { color: theme.text }]}>Série active</Text>
            <Text style={[styles.streakSub, { color: theme.secondaryText }]}>Continue à logger tes séances</Text>
          </View>
          <Text style={[styles.streakNum, { color: theme.primary }]}>{sessions.length}</Text>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>Dernières séances</Text>

        {isLoading ? <LoadingView /> : null}

        {!isLoading && sessions.length === 0 ? (
          <EmptyState
            title="Aucune séance pour le moment"
            description="Ajoute ta première séance pour démarrer ton journal de badminton."
          />
        ) : null}

        {!isLoading
          ? visibleSessions.map((session) => (
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

        {!isLoading && hasMoreSessions ? (
          <Pressable
            onPress={() => router.push("/sessions")}
            style={[styles.moreButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[styles.moreButtonText, { color: theme.text }]}>
              Afficher les {sessions.length} séances
            </Text>
            <Ionicons color={theme.secondaryText} name="arrow-forward" size={16} />
          </Pressable>
        ) : null}
      </ScrollView>

      <Link href="/session/new" asChild>
        <Pressable
          style={StyleSheet.flatten([
            styles.fab,
            {
              backgroundColor: theme.primary,
              shadowColor: theme.shadow,
              bottom: 4,
            },
          ])}
        >
          <Ionicons color={theme.buttonTextOnPrimary} name="add" size={18} />
          <Text style={[styles.fabText, { color: theme.buttonTextOnPrimary }]}>Nouvelle séance</Text>
        </Pressable>
      </Link>

      <AppSidebar onClose={() => setIsMenuOpen(false)} open={isMenuOpen} profile={profile} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 120,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  logo: {
    fontSize: 22,
    fontFamily: fonts.displayExtraBold,
    letterSpacing: -0.5,
  },
  streakCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  streakIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  streakText: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
  },
  streakSub: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
    marginTop: 2,
  },
  streakNum: {
    fontSize: 26,
    fontFamily: fonts.displayExtraBold,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 2,
  },
  moreButton: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  moreButtonText: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
  },
  fab: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 0,
  },
  fabText: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
  },
});
