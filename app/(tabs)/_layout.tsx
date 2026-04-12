import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";

export default function TabLayout() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          paddingTop: 12,
          paddingBottom: bottomInset + 12,
          height: 56 + bottomInset + 12,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarLabelStyle: {
          fontFamily: fonts.bodyRegular,
          fontSize: 11,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="home-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="bar-chart-outline" size={size} />,
        }}
      />
    </Tabs>
  );
}
