import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";

import { useAuth } from "@/src/context/AuthContext";
import { isLocalDataEmpty, restoreFromCloud } from "@/src/services/cloudRestore";
import {
  resolveProfileConflict as resolveProfileConflictService,
  runMigration,
  type ProfileConflict,
} from "@/src/services/migration";
import { getSyncQueueLength } from "@/src/services/syncQueue";

export type MigrationStatus = "idle" | "syncing" | "profile_conflict" | "done" | "error";

interface MigrationContextValue {
  status: MigrationStatus;
  profileConflict: ProfileConflict | null;
  /** L'utilisateur tranche le conflit de pseudo (2e appareil). */
  resolveProfileConflict: (choice: "local" | "cloud") => Promise<void>;
  /** Referme manuellement une bannière "syncing"/"done"/"error". */
  dismiss: () => void;
}

const MigrationContext = createContext<MigrationContextValue | null>(null);

const DONE_BANNER_DURATION_MS = 2500;
const ERROR_BANNER_DURATION_MS = 4000;

/**
 * Déclenche automatiquement la migration AsyncStorage -> Supabase à chaque
 * connexion/reconnexion détectée (pas seulement la toute première : voir
 * le commentaire en tête de src/services/migration.ts — les upserts sont
 * idempotents, donc rejouer la migration à chaque login est volontaire et
 * sans danger, y compris pour des données créées localement pendant une
 * période où l'utilisateur n'était pas connecté).
 *
 * Doit être monté à l'intérieur d'<AuthProvider> (utilise useAuth()).
 */
export function MigrationProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [status, setStatus] = useState<MigrationStatus>("idle");
  const [profileConflict, setProfileConflict] = useState<ProfileConflict | null>(null);
  // Évite de relancer plusieurs fois la migration pour le même utilisateur
  // pendant la durée de vie du composant (re-renders, refresh de token...).
  const attemptedForUserId = useRef<string | null>(null);

  const startMigration = useCallback(async (userId: string) => {
    setStatus("syncing");

    // Stockage local vide (nouvel appareil, réinstallation, ou stockage
    // vidé après une suppression de compte) : on rapatrie ce qui existe déjà
    // côté Supabase pour CE compte avant de lancer runMigration() (qui, sur
    // un local vide, n'aurait de toute façon rien à pousser). Best-effort :
    // un échec ici ne doit jamais bloquer la connexion, juste laisser
    // l'appareil vide jusqu'à la prochaine tentative.
    if (await isLocalDataEmpty()) {
      try {
        await restoreFromCloud(userId);
      } catch (error) {
        console.warn("[MigrationContext] Restauration depuis le cloud impossible :", error);
      }
    }

    const outcome = await runMigration(userId);

    if (outcome.status === "error") {
      // Ne bloque jamais l'utilisateur : l'app reste utilisable en local,
      // la migration sera simplement retentée à la prochaine connexion
      // (les upserts déjà passés étant idempotents).
      setStatus("error");
      setTimeout(() => setStatus((current) => (current === "error" ? "idle" : current)), ERROR_BANNER_DURATION_MS);
      return;
    }

    if (outcome.profileConflict) {
      setProfileConflict(outcome.profileConflict);
      setStatus("profile_conflict");
      return;
    }

    // runMigration() ne concerne que la synchro initiale AsyncStorage ->
    // Supabase, un mécanisme distinct de la file d'attente des écritures en
    // direct (cf. src/services/syncQueue.ts) : le succès de la migration ne
    // garantit pas que celle-ci est vide. Annoncer "vos données sont
    // synchronisées ✓" alors qu'il reste des opérations en attente serait
    // trompeur — le badge de l'écran Profil (SyncStatusBadge) reflète déjà
    // fidèlement cet état, la bannière n'est donc affichée que si tout est
    // effectivement à jour.
    if ((await getSyncQueueLength()) > 0) {
      setStatus("idle");
      return;
    }

    setStatus("done");
    setTimeout(() => setStatus((current) => (current === "done" ? "idle" : current)), DONE_BANNER_DURATION_MS);
  }, []);

  useEffect(() => {
    if (!user) {
      attemptedForUserId.current = null;
      return;
    }

    if (attemptedForUserId.current === user.id) {
      return;
    }
    attemptedForUserId.current = user.id;
    void startMigration(user.id);
  }, [user, startMigration]);

  const resolveProfileConflict = useCallback(
    async (choice: "local" | "cloud") => {
      if (!user || !profileConflict) {
        return;
      }

      setStatus("syncing");
      try {
        await resolveProfileConflictService(user.id, choice, profileConflict);
        setProfileConflict(null);

        if ((await getSyncQueueLength()) > 0) {
          setStatus("idle");
          return;
        }

        setStatus("done");
        setTimeout(() => setStatus((current) => (current === "done" ? "idle" : current)), DONE_BANNER_DURATION_MS);
      } catch {
        // Le choix n'a pas pu être écrit (réseau) : on garde le conflit
        // affiché, l'utilisateur peut retenter.
        setStatus("profile_conflict");
      }
    },
    [user, profileConflict],
  );

  const dismiss = useCallback(() => {
    setStatus((current) => (current === "profile_conflict" ? current : "idle"));
  }, []);

  return (
    <MigrationContext.Provider value={{ status, profileConflict, resolveProfileConflict, dismiss }}>
      {children}
    </MigrationContext.Provider>
  );
}

export function useMigration() {
  const context = useContext(MigrationContext);
  if (!context) {
    throw new Error("useMigration doit être utilisé à l'intérieur d'un <MigrationProvider>.");
  }
  return context;
}
