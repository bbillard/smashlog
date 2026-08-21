import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from "@expo-google-fonts/dm-sans";
import { Syne_700Bold, Syne_800ExtraBold } from "@expo-google-fonts/syne";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/src/context/AuthContext";
import { MigrationProvider } from "@/src/context/MigrationContext";
import { SyncProvider } from "@/src/context/SyncContext";
import { PasswordResetOverlay } from "@/src/components/auth/PasswordResetOverlay";
import { MigrationOverlay } from "@/src/components/MigrationOverlay";
import { SplashLogoAnimation } from "@/src/components/SplashLogoAnimation";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { handleAuthDeepLink } from "@/src/services/authDeepLink";
import { DEFAULT_PROFILE, getProfile } from "@/src/services/profile";
import {
  getForceOnboarding,
  getOnboardingCompleted,
  getOnboardingUsername,
  setOnboardingCompleted,
  syncLegacyProfileIntoOnboarding,
} from "@/src/services/onboarding";
import { getSessions, migratePlayersFromMatches } from "@/src/services/storage";

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
  // Rejoué à chaque démarrage à froid (process JS relancé) : reste à false
  // tant que l'animation n'a pas fini de se jouer, une fois par montage de
  // RootLayout — pas à chaque retour au premier plan depuis le background,
  // qui ne remonte pas ce composant.
  const [coldStartSplashDone, setColdStartSplashDone] = useState(false);

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
      await migratePlayersFromMatches();

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

  // Deep links entrants liés à l'auth (confirmation email, réinitialisation
  // de mot de passe — cf. src/services/authDeepLink.ts) : getInitialURL()
  // couvre le cas où l'app est ouverte à froid via ce lien (l'event "url" ne
  // se déclenche pas dans ce cas), l'event listener couvre le cas où l'app
  // tournait déjà en arrière-plan.
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) void handleAuthDeepLink(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleAuthDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!bootstrapped) {
      return;
    }

    const inOnboarding = segments[0] === "onboarding";
    // Écran transitoire (logo animé) emprunté en sortie d'onboarding avant
    // d'atterrir sur les onglets (cf. app/onboarding/account.tsx et
    // app/splash-animation.tsx). Il gère lui-même sa navigation vers sa
    // cible après son délai d'animation : le garde-fou ci-dessous ne doit
    // pas l'interrompre, sans quoi la re-lecture (async) de
    // getOnboardingCompleted() ci-dessus — encore en cours juste après le
    // router.replace("/splash-animation") — le fait rebondir vers
    // "/onboarding/splash" avant même que l'animation ait eu le temps de se
    // jouer.
    const inSplashAnimation = segments[0] === "splash-animation";

    if (needsOnboarding && !inOnboarding && !inSplashAnimation) {
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
    <Pressable
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      onPress={() => router.replace("/(tabs)")}
      style={styles.headerBackHome}
    >
      <Ionicons color={HEADER_BUTTON_COLOR} name="chevron-back" size={18} />
      <Text style={[styles.headerBackHomeText, { color: HEADER_BUTTON_COLOR }]}>Accueil</Text>
    </Pressable>
  );

  return (
    <AuthProvider>
      <MigrationProvider>
      <SyncProvider>
      <SafeAreaProvider>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <MigrationOverlay />
          <PasswordResetOverlay />
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
              headerTitleStyle: {
                fontFamily: "Syne_700Bold",
                fontSize: 16,
              },
              contentStyle: {
                backgroundColor: theme.background,
              },
            }}
          >
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="splash-animation"
              options={{ headerShown: false, gestureEnabled: false, animation: "fade" }}
            />
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
                headerBackVisible: false,
                headerLeft: headerBackToHome,
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
              name="auth"
              options={{
                title: "Compte",
                presentation: "modal",
                headerBackVisible: false,
                headerLeft: () => null,
              }}
            />
            <Stack.Screen
              name="sessions"
              options={{ title: "Séances", headerBackVisible: false, headerLeft: headerBackToHome }}
            />
            <Stack.Screen
              name="settings"
              options={{ title: "Réglages", headerBackVisible: false, headerLeft: headerBackToHome }}
            />
            <Stack.Screen
              name="intentions"
              options={{ title: "Mes intentions", headerBackVisible: false, headerLeft: headerBackToHome }}
            />
            <Stack.Screen
              name="players"
              options={{ title: "Mes joueurs", headerBackVisible: false, headerLeft: headerBackToHome }}
            />
            <Stack.Screen
              name="help"
              options={{ title: "Aide", headerBackVisible: false, headerLeft: headerBackToHome }}
            />
            <Stack.Screen
              name="about"
              options={{ title: "À propos", headerBackVisible: false, headerLeft: headerBackToHome }}
            />
            {/* players/* : pas de headerLeft override → back natif affiche "Mes joueurs" */}
            <Stack.Screen name="players/[id]" options={{ title: "Joueur" }} />
            <Stack.Screen name="players/adversaires" options={{ title: "Adversaires" }} />
            <Stack.Screen name="players/partenaires" options={{ title: "Partenaires" }} />
            {/* exercise/* : headerLeft géré inline dans chaque écran via router.back() */}
            <Stack.Screen
              name="exercise/new"
              options={{
                title: "Nouvel exercice",
                presentation: "card",
                headerBackVisible: false,
              }}
            />
            <Stack.Screen
              name="exercise/[id]"
              options={{
                title: "Détail de l'exercice",
                presentation: "card",
                headerBackVisible: false,
              }}
            />
            <Stack.Screen
              name="exercise/[id]/edit"
              options={{
                title: "Modifier l'exercice",
                presentation: "card",
                headerBackVisible: false,
              }}
            />
          </Stack>
          {!coldStartSplashDone ? (
            // Recouvre l'app le temps de l'animation à chaque démarrage à
            // froid. Le Stack ci-dessus reste monté et résout déjà
            // onboarding/onglets pendant ce temps (cf. l'effet de
            // redirection plus haut) : une fois l'overlay retiré, l'écran
            // du dessous est déjà le bon, sans flash de contenu erroné.
            <SplashLogoAnimation onFinished={() => setColdStartSplashDone(true)} />
          ) : null}
        </View>
      </ThemeProvider>
      </SafeAreaProvider>
      </SyncProvider>
      </MigrationProvider>
    </AuthProvider>
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
