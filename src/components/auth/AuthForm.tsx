import * as AppleAuthentication from "expo-apple-authentication";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { LabeledInput } from "@/src/components/Form";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { useAuth } from "@/src/context/AuthContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";

type Mode = "signup" | "signin" | "forgot";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isAppleCancellation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ERR_REQUEST_CANCELED"
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

interface AuthFormProps {
  /** Appelé une fois qu'une session authentifiée est active (email confirmé non requis, Apple, Google). */
  onSuccess: () => void;
  /** Appelé pour quitter le formulaire sans avoir créé/rejoint de compte ("Continuer sans compte"). */
  onCancel: () => void;
  /** Mode initial du formulaire (par défaut "signin", comme l'écran /auth existant). */
  initialMode?: Mode;
  /** Libellé du lien de sortie, pour l'adapter au contexte (ex. onboarding). */
  cancelLabel?: string;
}

export function AuthForm({
  onSuccess,
  onCancel,
  initialMode = "signin",
  cancelLabel = "Continuer sans compte",
}: AuthFormProps) {
  const { theme } = useAppTheme();
  const { signUpWithEmail, signInWithEmail, signInWithApple, signInWithGoogle, sendPasswordReset, isAppleAuthAvailable } =
    useAuth();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [infoText, setInfoText] = useState("");

  function resetFeedback() {
    setErrorText("");
    setInfoText("");
  }

  function switchMode(nextMode: Mode) {
    resetFeedback();
    setMode(nextMode);
  }

  async function handleEmailSubmit() {
    resetFeedback();
    const trimmedEmail = email.trim();

    if (!isValidEmail(trimmedEmail)) {
      setErrorText("Adresse email invalide.");
      return;
    }
    if (mode !== "forgot" && password.length < 6) {
      setErrorText("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { needsEmailConfirmation } = await signUpWithEmail(trimmedEmail, password);
        if (needsEmailConfirmation) {
          setInfoText("Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse.");
        } else {
          onSuccess();
        }
      } else if (mode === "signin") {
        await signInWithEmail(trimmedEmail, password);
        onSuccess();
      } else {
        await sendPasswordReset(trimmedEmail);
        setInfoText("Email de réinitialisation envoyé si ce compte existe.");
      }
    } catch (error) {
      setErrorText(errorMessage(error, "Une erreur est survenue."));
    } finally {
      setLoading(false);
    }
  }

  async function handleApple() {
    resetFeedback();
    setLoading(true);
    try {
      await signInWithApple();
      onSuccess();
    } catch (error) {
      if (!isAppleCancellation(error)) {
        setErrorText(errorMessage(error, "Connexion avec Apple impossible."));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    resetFeedback();
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (error) {
      setErrorText(errorMessage(error, "Connexion avec Google impossible."));
    } finally {
      setLoading(false);
    }
  }

  const showPassword = mode !== "forgot";
  const submitLabel =
    mode === "signup" ? "Créer mon compte" : mode === "signin" ? "Se connecter" : "Envoyer le lien";

  return (
    <>
      {mode !== "forgot" ? (
        <View style={[styles.tabs, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Pressable
            onPress={() => switchMode("signup")}
            style={[styles.tab, mode === "signup" ? { backgroundColor: theme.primary } : null]}
          >
            <Text
              style={[
                styles.tabText,
                { color: mode === "signup" ? theme.buttonTextOnPrimary : theme.secondaryText },
              ]}
            >
              Créer un compte
            </Text>
          </Pressable>
          <Pressable
            onPress={() => switchMode("signin")}
            style={[styles.tab, mode === "signin" ? { backgroundColor: theme.primary } : null]}
          >
            <Text
              style={[
                styles.tabText,
                { color: mode === "signin" ? theme.buttonTextOnPrimary : theme.secondaryText },
              ]}
            >
              Se connecter
            </Text>
          </Pressable>
        </View>
      ) : (
        <Text style={[styles.title, { color: theme.text }]}>Mot de passe oublié</Text>
      )}

      <LabeledInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        placeholder="toi@exemple.com"
        textContentType="emailAddress"
        value={email}
      />

      {showPassword ? (
        <LabeledInput
          autoCapitalize="none"
          autoComplete={mode === "signup" ? "password-new" : "password"}
          label="Mot de passe"
          onChangeText={setPassword}
          placeholder="6 caractères minimum"
          secureTextEntry
          textContentType={mode === "signup" ? "newPassword" : "password"}
          value={password}
        />
      ) : null}

      {errorText ? <Text style={[styles.feedback, { color: theme.danger }]}>{errorText}</Text> : null}
      {infoText ? <Text style={[styles.feedback, { color: theme.primary }]}>{infoText}</Text> : null}

      <PrimaryButton disabled={loading} label={loading ? "..." : submitLabel} onPress={handleEmailSubmit} />

      {mode === "signin" ? (
        <Pressable onPress={() => switchMode("forgot")}>
          <Text style={[styles.link, { color: theme.secondaryText }]}>Mot de passe oublié ?</Text>
        </Pressable>
      ) : null}

      {mode === "forgot" ? (
        <Pressable onPress={() => switchMode("signin")}>
          <Text style={[styles.link, { color: theme.secondaryText }]}>Retour à la connexion</Text>
        </Pressable>
      ) : null}

      {mode !== "forgot" ? (
        <>
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.secondaryText }]}>ou</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          {Platform.OS === "ios" && isAppleAuthAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              cornerRadius={14}
              onPress={handleApple}
              style={styles.appleButton}
            />
          ) : null}

          <PrimaryButton disabled={loading} label="Continuer avec Google" onPress={handleGoogle} tone="secondary" />
        </>
      ) : null}

      <Pressable onPress={onCancel} style={styles.skipButton}>
        <Text style={[styles.link, { color: theme.secondaryText }]}>{cancelLabel}</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontFamily: fonts.displayBold,
  },
  tabs: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
  },
  feedback: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.bodyRegular,
  },
  link: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    textAlign: "center",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
  },
  appleButton: {
    height: 54,
    width: "100%",
  },
  skipButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
});
