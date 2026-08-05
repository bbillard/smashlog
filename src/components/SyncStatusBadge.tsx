import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { useSync } from "@/src/context/SyncContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { formatDate } from "@/src/utils/format";

/**
 * Indicateur de statut de synchro cloud, affiché dans app/profile.tsx
 * uniquement quand un compte est connecté (status "disabled" -> rien à
 * afficher, cf. useSync()).
 */
export function SyncStatusBadge() {
  const { theme } = useAppTheme();
  const { status, pendingCount, lastSyncedAt } = useSync();

  if (status === "disabled") {
    return null;
  }

  const { icon, label, color } = (() => {
    switch (status) {
      case "offline":
        return { icon: "cloud-offline-outline" as const, label: "Hors ligne", color: theme.secondaryText };
      case "pending":
        return {
          icon: "cloud-upload-outline" as const,
          label: `En attente de synchronisation (${pendingCount})`,
          color: theme.primary,
        };
      case "synced":
      default:
        return {
          icon: "cloud-done-outline" as const,
          label: lastSyncedAt ? `Synchronisé · ${formatDate(lastSyncedAt)}` : "Synchronisé",
          color: theme.secondaryText,
        };
    }
  })();

  return (
    <View style={styles.row}>
      <Ionicons color={color} name={icon} size={16} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  text: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
  },
});
