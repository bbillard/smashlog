import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { ExerciseForm, ExercisePayload } from "@/src/components/ExerciseForm";
import { LoadingView } from "@/src/components/LoadingView";
import {
  getCustomLabels,
  getExerciseById,
  saveCustomLabels,
  updateExercise,
} from "@/src/services/storage";
import { Exercise } from "@/src/types/index";

export default function EditExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [customLabels, setCustomLabels] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getExerciseById(id), getCustomLabels()]).then(
        ([ex, labels]) => {
          setExercise(ex);
          setCustomLabels(labels);
        },
      );
    }, [id]),
  );

  async function handleAddCustomLabel(label: string) {
    const updated = [...customLabels, label];
    setCustomLabels(updated);
    await saveCustomLabels(updated);
  }

  async function handleSave(data: ExercisePayload) {
    setIsSaving(true);
    try {
      await updateExercise(id, data);
      router.back();
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour l'exercice.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!exercise) {
    return <LoadingView />;
  }

  return (
    <ExerciseForm
      mode="edit"
      initialData={exercise}
      customLabels={customLabels}
      onAddCustomLabel={handleAddCustomLabel}
      onSave={handleSave}
      onCancel={() => router.back()}
      isSaving={isSaving}
    />
  );
}
