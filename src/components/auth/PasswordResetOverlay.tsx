import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { LabeledInput } from "@/src/components/Form";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { useAuth } from "@/src/context/AuthContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Affiché par-dessus toute l'app (rendu dans app/_layout.tsx, comme
 * MigrationOverlay) dès que AuthContext signale isPasswordRecovery=true,
 * c'est-à-dire dès que le lien "mot de passe oublié" a été cliqué et que le
 * deep link a été traité (cf. src/services/authDeepLink.ts). L'utilisateur
 * peut être n'importe où dans l'app à ce moment-là (onboarding, tabs...),
 * d'où le montage global plutôt que dans AuthForm.
 *
 * La session recovery établie par Supabase est déjà une session valide :
 * pas besoin de mot de passe actuel, updateUser() suffit à le remplacer.
 */
export function PasswordResetOverlay() {
  const { theme } = useAppTheme();
  const { isPasswordRecovery, completePasswordReset, dismissPasswordRecovery } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  async function handleSubmit() {
    setErrorText("");

    if (password.length < 6) {
      setErrorText("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorText("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await completePasswordReset(password);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorText(errorMessage(error, "Impossible de mettre à jour le mot de passe."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={isPasswordRecovery}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>Nouveau mot de passe</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          Choisis un nouveau mot de passe pour ton compte.
        </Text>

        <LabeledInput
          autoCapitalize="none"
          autoComplete="password-new"
          label="Nouveau mot de passe"
          onChangeText={setPassword}
          placeholder="6 caractères minimum"
          secureTextEntry
          textContentType="newPassword"
          value={password}
        />
        <LabeledInput
          autoCapitalize="none"
          autoComplete="password-new"
          label="Confirmer le mot de passe"
          onChangeText={setConfirmPassword}
          placeholder="6 caractères minimum"
          secureTextEntry
          textContentType="newPassword"
          value={confirmPassword}
        />

        {errorText ? <Text style={[styles.feedback, { color: theme.danger }]}>{errorText}</Text> : null}

        <PrimaryButton disabled={loading} label={loading ? "..." : "Valider"} onPress={handleSubmit} />

        <Pressable onPress={dismissPasswordRecovery} style={styles.skipButton}>
          <Text style={[styles.link, { color: theme.secondaryText }]}>Plus tard</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 48,
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.displayBold,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.bodyRegular,
    marginBottom: 8,
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
  skipButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
});
