import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMigration } from "@/src/context/MigrationContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";

/**
 * Rendu global (monté une fois dans app/_layout.tsx, à l'intérieur de
 * <MigrationProvider>) : bannière non bloquante pendant la synchronisation
 * initiale, confirmation de succès, et modal bloquant uniquement pour le
 * conflit de pseudo (le seul cas où une décision utilisateur est requise).
 */
export function MigrationOverlay() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { status, profileConflict, resolveProfileConflict, dismiss } = useMigration();

  const showBanner = status === "syncing" || status === "done" || status === "error";

  return (
    <>
      {showBanner ? (
        <View pointerEvents="box-none" style={[styles.bannerWrap, { top: insets.top + 8 }]}>
          <Pressable
            onPress={dismiss}
            style={[
              styles.banner,
              {
                backgroundColor: theme.surface,
                borderColor: status === "error" ? theme.danger : theme.border,
              },
            ]}
          >
            {status === "syncing" ? (
              <>
                <ActivityIndicator color={theme.primary} size="small" />
                <Text style={[styles.bannerText, { color: theme.text }]}>Synchronisation en cours…</Text>
              </>
            ) : null}
            {status === "done" ? (
              <Text style={[styles.bannerText, { color: theme.text }]}>Vos données sont synchronisées ✓</Text>
            ) : null}
            {status === "error" ? (
              <Text style={[styles.bannerText, { color: theme.text }]}>
                Synchronisation impossible pour le moment. On réessaiera à la prochaine connexion.
              </Text>
            ) : null}
          </Pressable>
        </View>
      ) : null}

      <Modal animationType="fade" transparent visible={status === "profile_conflict"}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Quel pseudo veux-tu garder ?</Text>
            <Text style={[styles.modalText, { color: theme.secondaryText }]}>
              Tu as un pseudo différent sur cet appareil et dans ton compte. Tes séances, joueurs et exercices des
              deux appareils sont fusionnés automatiquement — il ne reste qu'à choisir le pseudo à conserver.
            </Text>

            {profileConflict ? (
              <View style={styles.choiceList}>
                <Pressable
                  onPress={() => resolveProfileConflict("local")}
                  style={[styles.choiceButton, { backgroundColor: theme.primary }]}
                >
                  <Text style={[styles.choiceLabel, { color: theme.buttonTextOnPrimary }]}>
                    Garder « {profileConflict.localUsername} »
                  </Text>
                  <Text style={[styles.choiceHint, { color: theme.buttonTextOnPrimary }]}>Sur cet appareil</Text>
                </Pressable>

                <Pressable
                  onPress={() => resolveProfileConflict("cloud")}
                  style={[styles.choiceButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, borderWidth: 1 }]}
                >
                  <Text style={[styles.choiceLabel, { color: theme.text }]}>
                    Garder « {profileConflict.cloudUsername} »
                  </Text>
                  <Text style={[styles.choiceHint, { color: theme.secondaryText }]}>Dans ton compte</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 50,
    alignItems: "center",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 480,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bannerText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.bodyMedium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: fonts.displayBold,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.bodyRegular,
  },
  choiceList: {
    gap: 10,
  },
  choiceButton: {
    minHeight: 54,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceLabel: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
  },
  choiceHint: {
    fontSize: 11,
    fontFamily: fonts.bodyRegular,
    marginTop: 2,
  },
});
