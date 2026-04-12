import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, View } from "react-native";

import { useAppTheme } from "@/src/hooks/useAppTheme";

export function ProfileAvatar({
  uri,
  size = 34,
}: {
  uri?: string | null;
  size?: number;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        styles.wrapper,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.surfaceAlt,
          borderColor: theme.border,
        },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Ionicons color={theme.text} name="person-outline" size={Math.round(size * 0.47)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
