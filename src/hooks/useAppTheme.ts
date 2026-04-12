import { useColorScheme } from "react-native";

import { darkTheme, lightTheme } from "@/src/theme/colors";

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

  return {
    colorScheme,
    theme,
  };
}
