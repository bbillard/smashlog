import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";

interface WizardProgressProps {
  step: number;
  total: number;
}

export function WizardProgress({ step, total }: WizardProgressProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>Étape {step}/{total}</Text>
      <View style={styles.row}>
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              {
                backgroundColor: index < step ? theme.primary : theme.surfaceAlt,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
  },
  row: {
    flexDirection: "row",
    gap: 5,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
});
