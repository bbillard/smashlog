import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/src/hooks/useAppTheme";

export function RatingPicker({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (value: number) => void;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.ratingRow}>
      {Array.from({ length: 5 }, (_, index) => index + 1).map((value) => (
        <Pressable key={value} onPress={() => onChange(value)}>
          <Text style={[styles.star, { color: value <= rating ? theme.accent : theme.secondaryText }]}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ratingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  star: {
    fontSize: 24,
  },
});
