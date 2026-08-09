import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/src/components/Screen";
import { SectionCard } from "@/src/components/SectionCard";
import { CONTACT_EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL, PRIVACY_POLICY_URL, TERMS_URL } from "@/src/constants/legal";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";

async function openExternalLink(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    Alert.alert("Erreur", "Impossible d'ouvrir ce lien.");
  }
}

async function openContactEmail(email: string) {
  const mailUrl = `mailto:${email}`;
  try {
    const canOpen = await Linking.canOpenURL(mailUrl);
    if (!canOpen) {
      Alert.alert("Erreur", "Aucune application mail n'est configurée sur cet appareil.");
      return;
    }

    await Linking.openURL(mailUrl);
  } catch {
    Alert.alert("Erreur", "Impossible d'ouvrir l'application mail.");
  }
}

interface AboutRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  showDivider?: boolean;
}

function AboutRow({ icon, label, value, onPress, showDivider = true }: AboutRowProps) {
  const { theme } = useAppTheme();

  const row = (
    <View
      style={[
        styles.aboutRow,
        showDivider ? { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth } : null,
      ]}
    >
      <Ionicons color={onPress ? theme.primary : theme.secondaryText} name={icon} size={18} />
      <Text style={[styles.aboutRowLabel, { color: theme.text }]}>{label}</Text>
      {value ? (
        <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.aboutRowValue, { color: theme.secondaryText }]}>
          {value}
        </Text>
      ) : null}
      {onPress ? <Ionicons color={theme.secondaryText} name="chevron-forward" size={16} /> : null}
    </View>
  );

  if (!onPress) {
    return row;
  }

  return <Pressable onPress={onPress}>{row}</Pressable>;
}

interface AboutGroupProps {
  title: string;
}

function AboutGroupTitle({ title }: AboutGroupProps) {
  const { theme } = useAppTheme();
  return <Text style={[styles.groupTitle, { color: theme.secondaryText }]}>{title}</Text>;
}

export default function AboutScreen() {
  const { theme } = useAppTheme();

  return (
    <Screen nativeHeader scrollable>
      <Text style={[styles.title, { color: theme.text }]}>À propos</Text>

      <SectionCard>
        <AboutRow icon="information-circle-outline" label="Version" value={Constants.expoConfig?.version ?? "—"} />
      </SectionCard>

      <SectionCard>
        <AboutGroupTitle title="Nous contacter" />
        <AboutRow
          icon="logo-instagram"
          label="Instagram"
          onPress={() => openExternalLink(INSTAGRAM_URL)}
          value={INSTAGRAM_HANDLE}
        />
        <AboutRow
          icon="mail-outline"
          label="Email"
          onPress={() => openContactEmail(CONTACT_EMAIL)}
          showDivider={false}
          value={CONTACT_EMAIL}
        />
      </SectionCard>

      <SectionCard>
        <AboutGroupTitle title="Légal" />
        <AboutRow
          icon="document-text-outline"
          label="Politique de confidentialité"
          onPress={() => openExternalLink(PRIVACY_POLICY_URL)}
        />
        <AboutRow
          icon="shield-checkmark-outline"
          label="CGU"
          onPress={() => openExternalLink(TERMS_URL)}
          showDivider={false}
        />
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontFamily: fonts.displayExtraBold,
  },
  groupTitle: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontFamily: fonts.bodySemiBold,
    marginBottom: 4,
  },
  aboutRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  aboutRowLabel: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    flex: 1,
  },
  aboutRowValue: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
    maxWidth: 150,
    textAlign: "right",
  },
});
