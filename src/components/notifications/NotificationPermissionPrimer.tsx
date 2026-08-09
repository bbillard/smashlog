import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/src/components/PrimaryButton";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";

interface NotificationPermissionPrimerProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Écran intermédiaire affiché avant la popup système de demande de
 * permission notifications. Explique le bénéfice concret pour
 * l'utilisateur avant de le confronter à la demande iOS/Android.
 */
export function NotificationPermissionPrimer({
  visible,
  onConfirm,
  onCancel,
}: NotificationPermissionPrimerProps) {
  const { theme } = useAppTheme();

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.emoji}>🔔</Text>
          <Text style={[styles.title, { color: theme.text }]}>Reste dans ton objectif</Text>
          <Text style={[styles.body, { color: theme.secondaryText }]}>
            Pour te rappeler ton intention avant chaque séance, Smashlog a besoin de t&apos;envoyer des
            notifications. Tu pourras les configurer à tout moment dans les réglages.
          </Text>

          <View style={styles.actions}>
            <PrimaryButton label="Activer les notifications" onPress={onConfirm} />
            <Pressable onPress={onCancel} style={styles.laterWrap}>
              <Text style={[styles.laterText, { color: theme.secondaryText }]}>Plus tard</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  emoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.displayBold,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.bodyRegular,
  },
  actions: {
    marginTop: 6,
    gap: 4,
  },
  laterWrap: {
    alignItems: "center",
    paddingVertical: 10,
  },
  laterText: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
    textDecorationLine: "underline",
  },
});
