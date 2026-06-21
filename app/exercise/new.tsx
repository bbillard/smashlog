import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { ExerciseForm, ExercisePayload } from "@/src/components/ExerciseForm";
import { addExercise, getCustomLabels, saveCustomLabels } from "@/src/services/storage";
import { Exercise } from "@/src/types/index";
import { createId } from "@/src/utils/id";

export default function NewExerciseScreen() {
  const { fromWizard } = useLocalSearchParams<{ fromWizard?: string }>();
  const [customLabels, setCustomLabels] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getCustomLabels().then(setCustomLabels);
    }, []),
  );

  async function handleAddCustomLabel(label: string) {
    const updated = [...customLabels, label];
    setCustomLabels(updated);
    await saveCustomLabels(updated);
  }

  async function handleSave(data: ExercisePayload) {
    setIsSaving(true);
    try {
      const exercise: Exercise = {
        id: createId(),
        createdAt: new Date().toISOString(),
        ...data,
      };
      await addExercise(exercise);
      if (fromWizard === "true") {
        router.back();
      } else {
        router.replace("/(tabs)/exercises");
      }
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer l'exercice.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ExerciseForm
        mode="create"
      customLabels={customLabels}
      onAddCustomLabel={handleAddCustomLabel}
      onSave={handleSave}
      onCancel={() => router.back()}
      isSaving={isSaving}
    />
    </>
  );
}
