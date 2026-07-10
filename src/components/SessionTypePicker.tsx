import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SESSION_TYPE_OPTIONS } from "@/src/constants/sessionOptions";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { SessionType } from "@/src/types/session";

function renderIcon(type: SessionType, color: string) {
  switch (type) {
    case "match":
      return <Ionicons color={color} name="trophy-outline" size={18} />;
    case "entrainement":
      return <MaterialCommunityIcons color={color} name="tennis" size={18} />;
    case "jeu_libre":
      return <MaterialCommunityIcons color={color} name="badminton" size={18} />;
    case "renforcement":
      return <Ionicons color={color} name="barbell-outline" size={18} />;
    case "cardio":
      return <Ionicons color={color} name="fitness-outline" size={18} />;
    default:
      return <Ionicons color={color} name="ellipse-outline" size={18} />;
  }
}

function getIconBackground(type: SessionType, fallback: string) {
  switch (type) {
    case "match":
      return "rgba(255,77,109,0.15)";
    case "entrainement":
      return "rgba(0,229,255,0.12)";
    case "jeu_libre":
      return "rgba(206,255,0,0.10)";
    case "renforcement":
      return "rgba(255,165,0,0.12)";
    case "cardio":
      return "rgba(180,100,255,0.12)";
    default:
      return fallback;
  }
}

export function SessionTypePicker({
  value,
  onChange,
}: {
  value: SessionType | null;
  onChange: (type: SessionType) => void;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.grid}>
      {SESSION_TYPE_OPTIONS.map((option) => {
        const isSelected = value === option.value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.typeCard,
              {
                backgroundColor: theme.surface,
                borderColor: isSelected ? theme.primary : theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.typeIcon,
                { backgroundColor: getIconBackground(option.value, theme.surfaceAlt) },
              ]}
            >
              {renderIcon(option.value, theme.text)}
            </View>
            <Text style={[styles.typeLabel, { color: theme.text }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  typeCard: {
    width: "48%",
    borderWidth: 1.5,
    borderRadius: 16,
    minHeight: 108,
    paddingHorizontal: 12,
    paddingVertical: 16,
    justifyContent: "flex-start",
    gap: 8,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  typeLabel: {
    fontSize: 13,
    fontFamily: fonts.displayBold,
  },
});
