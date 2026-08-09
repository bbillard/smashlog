import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { OnboardingButton, OnboardingScaffold } from "@/src/components/onboarding/OnboardingScaffold";
import { fonts } from "@/src/theme/typography";

function isValidUsername(value: string) {
  return /^[A-Za-z0-9]{1,20}$/.test(value);
}

export default function OnboardingPseudoScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const trimmed = username.trim();
  const isValid = isValidUsername(trimmed);
  const canContinue = trimmed.length > 0 && isValid;

  const errorText = useMemo(() => {
    if (trimmed.length === 0) {
      return "";
    }

    if (trimmed.length > 20) {
      return "20 caractères maximum.";
    }

    if (!isValid) {
      return "Utilise uniquement des lettres et des chiffres, sans espace.";
    }

    return "";
  }, [isValid, trimmed]);

  function handleContinue() {
    if (!canContinue) {
      return;
    }

    // La finalisation (sauvegarde du profil + flag onboarding terminé) est
    // désormais faite par l'écran suivant, une fois la décision "compte
    // cloud ou non" prise (cf. app/onboarding/account.tsx).
    router.push({ pathname: "/onboarding/account", params: { username: trimmed } });
  }

  return (
    <OnboardingScaffold
      progress={3}
      title={
        <Text style={styles.title}>
          Comment{"\n"}tu t'appelles{"\n"}
          <Text style={styles.titleAccent}>sur le terrain ?</Text>
        </Text>
      }
      body="Il apparaîtra sur tes cartes de partage."
      footer={<OnboardingButton disabled={!canContinue} label="Commencer →" onPress={handleContinue} />}
    >
      <View style={styles.previewWrap}>
        <View style={styles.previewCard}>
          <View style={styles.previewTop}>
            <Text style={styles.previewBadge}>Streak</Text>
            <Text style={styles.previewNum}>7</Text>
          </View>
          <View style={styles.previewDivider} />
          <View style={styles.previewFooter}>
            <Text style={styles.previewLogo}>
              Smash<Text style={styles.previewLogoDim}>log</Text>
            </Text>
            <Text style={[styles.previewUsername, trimmed ? styles.previewUsernameFilled : null]}>
              {trimmed ? `@${trimmed}` : "@..."}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>Ton pseudo</Text>
        <View style={[styles.field, trimmed.length > 0 && !isValid ? styles.fieldInvalid : null]}>
          <Text style={styles.fieldPrefix}>@</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            caretHidden={false}
            cursorColor="#CEFF00"
            maxLength={20}
            onChangeText={setUsername}
            placeholder=""
            selectionColor="#CEFF00"
            style={styles.input}
            value={username}
          />
        </View>
        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      </View>

      <Text style={styles.hintStrong}>Modifiable à tout moment dans les réglages.</Text>
    </OnboardingScaffold>
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
  previewWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  previewCard: {
    width: 220,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: "#0a1628",
    borderWidth: 1,
    borderColor: "rgba(206,255,0,0.15)",
  },
  previewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  previewBadge: {
    backgroundColor: "#CEFF00",
    color: "#000000",
    overflow: "hidden",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: fonts.displayBold,
  },
  previewNum: {
    fontSize: 18,
    color: "#CEFF00",
    fontFamily: fonts.displayExtraBold,
  },
  previewDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 8,
  },
  previewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewLogo: {
    fontSize: 11,
    color: "#CEFF00",
    fontFamily: fonts.displayExtraBold,
  },
  previewLogoDim: {
    color: "rgba(255,255,255,0.35)",
  },
  previewUsername: {
    fontSize: 10,
    color: "rgba(255,255,255,0.35)",
    fontStyle: "italic",
    fontFamily: fonts.bodyRegular,
  },
  previewUsernameFilled: {
    color: "rgba(206,255,0,0.6)",
    fontStyle: "normal",
  },
  fieldWrap: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#6b6b7a",
    fontFamily: fonts.bodySemiBold,
    marginBottom: 8,
  },
  field: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: "#16161a",
    borderWidth: 1.5,
    borderColor: "#CEFF00",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fieldInvalid: {
    borderColor: "#FF4D6D",
  },
  fieldPrefix: {
    fontSize: 16,
    color: "#6b6b7a",
    fontFamily: fonts.displayBold,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#f0f0f2",
    fontFamily: fonts.displayBold,
    paddingVertical: 0,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: "#FF4D6D",
    fontFamily: fonts.bodyRegular,
  },
  hintStrong: {
    fontSize: 12,
    lineHeight: 18,
    color: "#9999aa",
    fontFamily: fonts.bodyMedium,
  },
});
