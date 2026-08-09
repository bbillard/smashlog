import { useRouter } from "expo-router";

import { AuthForm } from "@/src/components/auth/AuthForm";
import { Screen } from "@/src/components/Screen";

export default function AuthScreen() {
  const router = useRouter();

  return (
    <Screen nativeHeader scrollable>
      <AuthForm onCancel={() => router.back()} onSuccess={() => router.back()} />
    </Screen>
  );
}
