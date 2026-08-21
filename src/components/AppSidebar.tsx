import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Modal, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/context/AuthContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { Profile } from "@/src/types/profile";
import { fonts } from "@/src/theme/typography";

import { ProfileAvatar } from "./ProfileAvatar";

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
}

export function AppSidebar({ open, onClose, profile }: AppSidebarProps) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  // Même logique que la tab bar (app/(tabs)/_layout.tsx) : on garantit au
  // moins 10 de marge, et on s'aligne sur la zone système (barre de gestes /
  // boutons Android) quand elle est plus grande, pour que le pied de page
  // (version + À propos) ne se retrouve pas caché derrière.
  const bottomInset = Math.max(insets.bottom, 10);
  const closeSwipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 48 && Math.abs(gestureState.dy) < 40) {
            onClose();
          }
        },
      }),
    [onClose],
  );

  function navigate(
    pathname:
      | "/profile"
      | "/sessions"
      | "/planning"
      | "/settings"
      | "/intentions"
      | "/players"
      | "/auth"
      | "/help"
      | "/about",
  ) {
    onClose();
    router.push(pathname);
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={open}>
      <View style={styles.menuOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          {...closeSwipe.panHandlers}
          style={[styles.menuPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.menuContent}>
            <View style={styles.menuHeader}>
              <View style={styles.menuIdentity}>
                <ProfileAvatar size={52} uri={profile.photoUri} />
                <View style={styles.menuIdentityText}>
                  <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.menuTitle, { color: theme.text }]}>
                    {profile.username}
                  </Text>
                  <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.menuSubtitle, { color: theme.secondaryText }]}>
                    {user ? user.email : "Compte local"}
                  </Text>
                </View>
              </View>
              <Pressable onPress={onClose}>
                <Ionicons color={theme.secondaryText} name="close-outline" size={24} />
              </Pressable>
            </View>

            {!user ? (
              <Pressable
                onPress={() => navigate("/auth")}
                style={[styles.menuItem, styles.menuItemAccent, { borderColor: theme.primary }]}
              >
                <Ionicons color={theme.primary} name="cloud-upload-outline" size={20} />
                <Text style={[styles.menuItemText, { color: theme.primary }]}>Créer un compte / Se connecter</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => navigate("/profile")}
              style={[styles.menuItem, { borderColor: theme.border }]}
            >
              <Ionicons color={theme.text} name="person-circle-outline" size={20} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Profil</Text>
            </Pressable>

            <Pressable
              onPress={() => navigate("/sessions")}
              style={[styles.menuItem, { borderColor: theme.border }]}
            >
              <Ionicons color={theme.text} name="albums-outline" size={20} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Séances</Text>
            </Pressable>

            <Pressable
              onPress={() => navigate("/planning")}
              style={[styles.menuItem, { borderColor: theme.border }]}
            >
              <Ionicons color={theme.text} name="calendar-outline" size={20} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Planning</Text>
            </Pressable>

            <Pressable
              onPress={() => navigate("/players")}
              style={[styles.menuItem, { borderColor: theme.border }]}
            >
              <Ionicons color={theme.text} name="people-outline" size={20} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Mes joueurs</Text>
            </Pressable>

            <Pressable
              onPress={() => navigate("/intentions")}
              style={[styles.menuItem, { borderColor: theme.border }]}
            >
              <Ionicons color={theme.text} name="flag-outline" size={20} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Mes intentions</Text>
            </Pressable>

            <Pressable
              onPress={() => navigate("/settings")}
              style={[styles.menuItem, { borderColor: theme.border }]}
            >
              <Ionicons color={theme.text} name="settings-outline" size={20} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Réglages</Text>
            </Pressable>

            <Pressable
              onPress={() => navigate("/help")}
              style={[styles.menuItem, { borderColor: theme.border }]}
            >
              <Ionicons color={theme.text} name="help-circle-outline" size={20} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Aide</Text>
            </Pressable>
          </View>

          <View style={styles.menuSwipeSpacer} />
          <View style={[styles.footerRow, { paddingBottom: 16 + bottomInset }]}>
            <Text style={[styles.versionLabel, { color: theme.secondaryText }]}>
              v{Constants.expoConfig?.version ?? "—"}
            </Text>
            <Text style={[styles.footerDot, { color: theme.secondaryText }]}>·</Text>
            <Pressable hitSlop={8} onPress={() => navigate("/about")}>
              <Text style={[styles.aboutLink, { color: theme.secondaryText }]}>À propos</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  menuOverlay: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  backdrop: {
    flex: 1,
  },
  menuPanel: {
    width: 280,
    height: "100%",
    borderLeftWidth: 1,
    paddingTop: 56,
    paddingHorizontal: 18,
  },
  menuContent: {
    gap: 10,
  },
  menuSwipeSpacer: {
    flex: 1,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  menuIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  menuIdentityText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: fonts.displayBold,
    flexShrink: 1,
  },
  menuSubtitle: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
    marginTop: 2,
  },
  menuItem: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  menuItemAccent: {
    borderWidth: 1.5,
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  versionLabel: {
    fontSize: 11,
    fontFamily: fonts.bodyRegular,
  },
  footerDot: {
    fontSize: 11,
    fontFamily: fonts.bodyRegular,
  },
  aboutLink: {
    fontSize: 11,
    fontFamily: fonts.bodyMedium,
    textDecorationLine: "underline",
  },
});
