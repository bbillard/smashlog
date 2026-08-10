import { Href, useLocalSearchParams, useRouter } from "expo-router";

import { SplashLogoAnimation } from "@/src/components/SplashLogoAnimation";

export default function SplashAnimationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ target?: string }>();
  const target = typeof params.target === "string" ? params.target : "/(tabs)";

  return <SplashLogoAnimation onFinished={() => router.replace(target as Href)} />;
}
