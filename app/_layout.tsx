import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from "@expo-google-fonts/dm-sans";
import { Syne_700Bold, Syne_800ExtraBold } from "@expo-google-fonts/syne";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";

import { useAppTheme } from "@/src/hooks/useAppTheme";
import { DEFAULT_PROFILE, getProfile } from "@/src/services/profile";
import {
  getForceOnboarding,
  getOnboardingCompleted,
  getOnboardingUsername,
  setOnboardingCompleted,
  syncLegacyProfileIntoOnboarding,
} from "@/src/services/onboarding";
import { getSessions } from "@/src/services/storage";

const HEADER_BUTTON_COLOR = "#F0F0F2";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { colorScheme, theme } = useAppTheme();
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    Syne_700Bold,
    Syne_800ExtraBold,
  });
  const [bootstrapped, setBootstrapped] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    let active = true;

    async function bootstrap() {
      const [completed, onboardingUsername, profile, sessions, forceOnboarding] = await Promise.all([
        getOnboardingCompleted(),
        getOnboardingUsername(),
        getProfile(),
        getSessions(),
        getForceOnboarding(),
      ]);

      await syncLegacyProfileIntoOnboarding();

      const hasLegacyPseudo =
        profile.username.trim().length > 0 && profile.username.trim() !== DEFAULT_PROFILE.username;
      const hasAnyPseudo = Boolean(onboardingUsername) || hasLegacyPseudo;
      const hasExistingData = sessions.length > 0;
      const shouldSkipOnboarding = forceOnboarding ? false : completed || hasAnyPseudo || hasExistingData;

      if (!forceOnboarding && !completed && shouldSkipOnboarding) {
        await setOnboardingCompleted(true);
      }

      if (active) {
        setNeedsOnboarding(!shouldSkipOnboarding);
        setBootstrapped(true);
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, [fontsLoaded, segments]);

  useEffect(() => {
    if (!bootstrapped) {
      return;
    }

    const inOnboarding = segments[0] === "onboarding";

    if (needsOnboarding && !inOnboarding) {
      router.replace("/onboarding/splash");
      return;
    }

    if (!needsOnboarding && inOnboarding) {
      router.replace("/(tabs)");
    }
  }, [bootstrapped, needsOnboarding, router, segments]);

  if (!fontsLoaded || !bootstrapped) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="light" />
        <ActivityIndicator color="#CEFF00" size="small" />
      </View>
    );
  }

  const navigationTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: theme.background,
      card: theme.surface,
      border: theme.border,
      text: theme.text,
      primary: theme.primary,
      notification: theme.accent2,
    },
  };

  const headerBackToHome = () => (
    <Pressable onPress={() => router.replace("/")} style={styles.headerBackHome}>
      <Ionicons color={HEADER_BUTTON_COLOR} name="chevron-back" size={18} />
      <Text style={[styles.headerBackHomeText, { color: HEADER_BUTTON_COLOR }]}>Accueil</Text>
    </Pressable>
  );

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <Stack
          screenOptions={{
            animation: "fade",
            headerStyle: {
              backgroundColor: theme.surface,
            },
            headerTintColor: theme.headerText,
            headerShadowVisible: true,
            headerBackTitleVisible: false,
            headerTitleAlign: "center",
            headerTransparent: false,
            headerTitleStyle: {
              fontFamily: "Syne_700Bold",
              fontSize: 16,
            },
            headerBackgroundContainerStyle: {
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            },
            contentStyle: {
              backgroundColor: theme.background,
            },
          }}
        >
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="session/new"
            options={{
              title: "Nouvelle séance",
              presentation: "card",
              headerBackVisible: false,
              headerLeft: headerBackToHome,
            }}
          />
          <Stack.Screen
            name="session/[id]"
            options={{
              title: "Détail de séance",
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="session/share"
            options={{
              title: "Partager",
              presentation: "card",
              headerBackVisible: false,
              headerLeft: () => null,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="debug"
            options={{ title: "Debug partage", headerBackVisible: false, headerLeft: headerBackToHome }}
          />
          <Stack.Screen
            name="planning"
            options={{ title: "Planning", headerBackVisible: false, headerLeft: headerBackToHome }}
          />
          <Stack.Screen
            name="profile"
            options={{ title: "Profil", headerBackVisible: false, headerLeft: headerBackToHome }}
          />
          <Stack.Screen
            name="sessions"
            options={{ title: "Séances", headerBackVisible: false, headerLeft: headerBackToHome }}
          />
          <Stack.Screen
            name="settings"
            options={{ title: "Réglages", headerBackVisible: false, headerLeft: headerBackToHome }}
          />
        </Stack>
      </View>
    </ThemeProvider>
  );
}

const styles = {
  loadingScreen: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#0d0d0f",
  },
  headerBackHome: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    paddingRight: 6,
  },
  headerBackHomeText: {
    fontSize: 13,
  },
};
