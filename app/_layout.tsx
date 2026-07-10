import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from "@expo-google-fonts/dm-sans";
import { Syne_700Bold, Syne_800ExtraBold } from "@expo-google-fonts/syne";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
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
  const [initialRouteQueued, setInitialRouteQueued] = useState(false);

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
  }, [fontsLoaded]);

  useEffect(() => {
    if (!bootstrapped || initialRouteQueued) {
      return;
    }

    const inOnboarding = segments[0] === "onboarding";
    const inSplashAnimation = segments[0] === "splash-animation";

    if (needsOnboarding && !inOnboarding) {
      router.replace("/onboarding/splash");
      setInitialRouteQueued(true);
      return;
    }

    if (!needsOnboarding && !inSplashAnimation) {
      router.replace({
        pathname: "/splash-animation",
        params: {
          target: "/(tabs)",
        },
      });
      setInitialRouteQueued(true);
      return;
    }

    setInitialRouteQueued(true);
  }, [bootstrapped, initialRouteQueued, needsOnboarding, router, segments]);

  if (!fontsLoaded || !bootstrapped || !initialRouteQueued) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar backgroundColor="#0d0d0f" style="light" translucent={false} />
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

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar
        backgroundColor={theme.background}
        style={colorScheme === "dark" ? "light" : "dark"}
        translucent={false}
      />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <Stack
          screenOptions={{
            animation: "fade",
            headerStyle: {
              backgroundColor: theme.surface,
            },
            headerTintColor: theme.headerText,
            headerShadowVisible: true,
            headerTitleAlign: "center",
            headerTransparent: false,
            headerBackButtonDisplayMode: "minimal",
            headerBackTitleVisible: false,
            statusBarTranslucent: false,
            ...(Platform.OS === "android"
              ? {
                  statusBarColor: theme.surface,
                }
              : null),
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
          <Stack.Screen
            name="splash-animation"
            options={{
              headerShown: false,
              presentation: "card",
              animation: "none",
              contentStyle: {
                backgroundColor: "#0d0d0f",
              },
            }}
          />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="session/new"
            options={{
              title: "Nouvelle séance",
              presentation: "card",
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
            }}
          />
          <Stack.Screen name="debug" options={{ title: "Debug partage" }} />
          <Stack.Screen name="planning" options={{ title: "Planning" }} />
          <Stack.Screen name="profile" options={{ title: "Profil" }} />
          <Stack.Screen name="sessions" options={{ title: "Séances" }} />
          <Stack.Screen name="settings" options={{ title: "Réglages notifications" }} />
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
};
