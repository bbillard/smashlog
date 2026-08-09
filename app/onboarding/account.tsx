import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Svg, Path } from "react-native-svg";

import { AuthForm } from "@/src/components/auth/AuthForm";
import { OnboardingButton, OnboardingScaffold } from "@/src/components/onboarding/OnboardingScaffold";
import { Screen } from "@/src/components/Screen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { completeOnboarding } from "@/src/services/onboarding";
import { fonts } from "@/src/theme/typography";

function ShieldIcon() {
  return (
    <Svg height={60} viewBox="0 0 24 24" width={60}>
      <Path
        d="M12 2.5 4.5 5.4v5.6c0 5 3.2 8.9 7.5 10.5 4.3-1.6 7.5-5.5 7.5-10.5V5.4L12 2.5Z"
        stroke="#CEFF00"
        strokeWidth={1.3}
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M8.7 12.2 11 14.5l4.6-4.8" stroke="#CEFF00" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3} fill="none" />
    </Svg>
  );
}

function AccountIllustration() {
  return (
    <View style={styles.illustrationWrap}>
      <View style={styles.illustrationRingOuter}>
        <View style={styles.illustrationRingInner}>
          <ShieldIcon />
        </View>
      </View>
      <Text style={styles.secondaryBody}>Sans compte, tes données restent uniquement sur ce téléphone.</Text>
    </View>
  );
}

export default function OnboardingAccountScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { username: usernameParam } = useLocalSearchParams<{ username?: string }>();
  const username = usernameParam ?? "";
  const [authModalVisible, setAuthModalVisible] = useState(false);

  async function finishOnboarding() {
    await completeOnboarding(username);
    // Passe par l'écran d'animation du logo (cf. app/splash-animation.tsx) au
    // lieu d'atterrir directement sur l'accueil, pour laisser le temps à
    // l'animation de se jouer avant d'afficher les onglets.
    router.replace("/splash-animation");
  }

  function handleCreateAccount() {
    setAuthModalVisible(true);
  }

  function closeAuthModal() {
    setAuthModalVisible(false);
  }

  async function handleAuthSuccess() {
    setAuthModalVisible(false);
    await finishOnboarding();
  }

  async function handleContinueWithoutAccount() {
    await finishOnboarding();
  }

  return (
    <>
      <OnboardingScaffold
        progress={4}
        title={
          <Text style={styles.title}>
            Tes données,{"\n"}
            <Text style={styles.titleAccent}>en sécurité</Text>
          </Text>
        }
        body="Crée un compte gratuit pour sauvegarder tes séances dans le cloud et y accéder depuis n'importe quel appareil."
        footer={
          <>
            <OnboardingButton label="Créer un compte" onPress={handleCreateAccount} />
            <Pressable onPress={handleContinueWithoutAccount} style={styles.skipWrap}>
              <Text style={styles.skipText}>Continuer sans compte</Text>
            </Pressable>
          </>
        }
      >
        <AccountIllustration />
      </OnboardingScaffold>

      <Modal
        animationType="slide"
        onDismiss={closeAuthModal}
        onRequestClose={closeAuthModal}
        presentationStyle="pageSheet"
        visible={authModalVisible}
      >
        <Screen scrollable>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Compte</Text>
            <Pressable hitSlop={12} onPress={closeAuthModal}>
              <Ionicons color={theme.secondaryText} name="close" size={22} />
            </Pressable>
          </View>
          <AuthForm cancelLabel="Continuer sans compte" onCancel={closeAuthModal} onSuccess={handleAuthSuccess} />
        </Screen>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    lineHeight: 24,
    color: "#f0f0f2",
    fontFamily: fonts.displayExtraBold,
    letterSpacing: -0.4,
  },
  titleAccent: {
    color: "#CEFF00",
  },
  illustrationWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  illustrationRingOuter: {
    width: 208,
    height: 208,
    borderRadius: 104,
    backgroundColor: "rgba(206,255,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  illustrationRingInner: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: "rgba(206,255,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(206,255,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBody: {
    maxWidth: 260,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    color: "#6b6b7a",
    fontFamily: fonts.bodyRegular,
  },
  skipWrap: {
    marginTop: 10,
    alignItems: "center",
  },
  skipText: {
    fontSize: 12,
    color: "#6b6b7a",
    textDecorationLine: "underline",
    opacity: 0.6,
    fontFamily: fonts.bodyRegular,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
  },
});
