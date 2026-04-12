import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: "none",
      }}
    >
      <Stack.Screen name="splash" />
      <Stack.Screen name="concept" />
      <Stack.Screen name="planning" />
      <Stack.Screen name="pseudo" />
    </Stack>
  );
}
