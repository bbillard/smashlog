import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { getExercises } from "@/src/services/storage";
import { Exercise } from "@/src/types/index";

/**
 * Bibliothèque d'exercices des écrans de séance (création et édition) :
 * relue depuis storage.ts à chaque focus de l'écran et à l'ouverture du
 * sélecteur (`reload`), jamais seulement au montage.
 *
 * Création d'exercice depuis la séance : appeler `markBeforeCreate()` juste
 * avant de naviguer vers /exercise/new ; au retour, `onCreated` reçoit les
 * ids des exercices apparus entre-temps (pour les lier à la séance).
 */
export function useExerciseLibrary(onCreated?: (newIds: string[]) => void) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const snapshotRef = useRef<Set<string> | null>(null);
  const exercisesRef = useRef<Exercise[]>([]);
  const onCreatedRef = useRef(onCreated);
  onCreatedRef.current = onCreated;

  const reload = useCallback(async () => {
    const next = await getExercises();
    exercisesRef.current = next;
    setExercises(next);
    const snapshot = snapshotRef.current;
    if (snapshot !== null) {
      snapshotRef.current = null;
      const newIds = next.filter((e) => !snapshot.has(e.id)).map((e) => e.id);
      if (newIds.length > 0) onCreatedRef.current?.(newIds);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const markBeforeCreate = useCallback(() => {
    snapshotRef.current = new Set(exercisesRef.current.map((e) => e.id));
  }, []);

  return { exercises, reload, markBeforeCreate };
}
