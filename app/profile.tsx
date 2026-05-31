import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { LabeledInput } from "@/src/components/Form";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { ProfileAvatar } from "@/src/components/ProfileAvatar";
import { Screen } from "@/src/components/Screen";
import { SectionCard } from "@/src/components/SectionCard";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { setOnboardingUsername } from "@/src/services/onboarding";
import { getProfile, saveProfile } from "@/src/services/profile";
import { fonts } from "@/src/theme/typography";
import { Profile } from "@/src/types/profile";

const USERNAME_MAX_LENGTH = 20;

export default function ProfileScreen() {
  const { theme } = useAppTheme();
  const [profile, setProfile] = useState<Profile>({ username: "Joueur Badlog", photoUri: null });
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);

  const loadProfile = useCallback(async () => {
    const nextProfile = await getProfile();
    setProfile(nextProfile);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission requise", "Autorise l'acces a la phototheque pour choisir une photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfile((current) => ({
        ...current,
        photoUri: result.assets[0].uri,
      }));
    }
  }

  async function handleSave() {
    setIsSaving(true);

    try {
      const nextUsername = profile.username.trim().slice(0, USERNAME_MAX_LENGTH) || "Joueur Badlog";

      await saveProfile({
        username: nextUsername,
        photoUri: profile.photoUri,
      });
      await setOnboardingUsername(nextUsername);
      setProfile((current) => ({
        ...current,
        username: nextUsername,
      }));
      setShowSavedModal(true);
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'enregistrer le profil.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen
      scrollable
      footer={<PrimaryButton label={isSaving ? "Enregistrement..." : "Enregistrer"} onPress={handleSave} />}
    >
      <Text style={[styles.title, { color: theme.text }]}>Profil</Text>
      <SectionCard>
        <View style={styles.avatarBlock}>
          <ProfileAvatar size={96} uri={profile.photoUri} />
          <Pressable
            onPress={handlePickImage}
            style={[styles.photoButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
          >
            <Text style={[styles.photoButtonText, { color: theme.text }]}>Changer la photo</Text>
          </Pressable>
          {profile.photoUri ? (
            <Pressable onPress={() => setProfile((current) => ({ ...current, photoUri: null }))}>
              <Text style={[styles.removePhoto, { color: theme.secondaryText }]}>Supprimer la photo</Text>
            </Pressable>
          ) : null}
        </View>
      </SectionCard>
      <LabeledInput
        label="Username"
        maxLength={USERNAME_MAX_LENGTH}
        onChangeText={(username) => setProfile((current) => ({ ...current, username }))}
        placeholder="Ex : smash.baptiste"
        value={profile.username}
      />
      <SectionCard>
        <Text style={[styles.placeholder, { color: theme.secondaryText }]}>
          Ce profil est stocke localement sur cet appareil. Le username et la photo apparaissent sur l'accueil et dans le menu lateral.
        </Text>
      </SectionCard>

      <Modal
        animationType="fade"
        onRequestClose={() => setShowSavedModal(false)}
        transparent
        visible={showSavedModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Profil enregistré</Text>
            <Text style={[styles.modalText, { color: theme.secondaryText }]}>
              Tes changements ont bien été pris en compte.
            </Text>
            <Pressable
              onPress={() => setShowSavedModal(false)}
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
            >
              <Text style={[styles.modalButtonText, { color: theme.buttonTextOnPrimary }]}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontFamily: fonts.displayExtraBold,
  },
  avatarBlock: {
    alignItems: "center",
    gap: 12,
  },
  photoButton: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  photoButtonText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
  },
  removePhoto: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
  },
  placeholder: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.bodyRegular,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: fonts.displayBold,
  },
  modalText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.bodyRegular,
  },
  modalButton: {
    marginTop: 4,
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    fontSize: 14,
    fontFamily: fonts.displayBold,
  },
});
