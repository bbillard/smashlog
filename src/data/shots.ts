import { CourtZone, ShotDirection, ShotId } from "@/src/types/index";

/**
 * Référentiel statique des coups utilisables dans la « Saisie express »
 * (ticket v1.4.1 « Formulaire exercice — Saisie express (séquence de coups) »).
 *
 * L'ordre du tableau est l'ordre d'affichage de la grille du panneau
 * de saisie d'un coup : il ne doit jamais varier (l'utilisateur prend ses
 * repères, les coups indisponibles sont grisés mais restent à leur place).
 *
 * Libellés imposés partout dans l'app : « Dégagement » (jamais « Dégagé »),
 * « Centre » (jamais « Au centre »).
 *
 * - startZones : zones d'où le coup peut être joué.
 * - arrivalZones : zones où le volant arrive chez l'adversaire. Plusieurs
 *   zones possibles pour certains coups (Block) : le coup suivant peut partir
 *   de n'importe laquelle (cf. isShotAvailable dans src/utils/exerciseSequence.ts).
 * - Directions : possibles pour tous les coups, services compris (en exercice
 *   on peut imposer une zone de service non réglementaire), toujours optionnelles.
 * - Le Slice arrive à l'avant comme l'amorti mais est placé plus long sur le
 *   schéma terrain (cf. src/utils/courtDiagram.ts).
 * - « Au choix » : toutes les zones, jamais grisé.
 */
export interface ShotDefinition {
  id: ShotId;
  label: string;
  startZones: readonly CourtZone[];
  arrivalZones: readonly CourtZone[];
  isService: boolean;
}

const ALL_ZONES: readonly CourtZone[] = ["avant", "milieu", "fond"];

export const SHOTS: readonly ShotDefinition[] = [
  { id: "service_court", label: "Service court", startZones: ["avant"], arrivalZones: ["avant"], isService: true },
  { id: "service_long", label: "Service long", startZones: ["avant"], arrivalZones: ["fond"], isService: true },
  { id: "lob", label: "Lob", startZones: ["avant", "milieu"], arrivalZones: ["fond"], isService: false },
  { id: "contre_amorti", label: "Contre-amorti", startZones: ["avant"], arrivalZones: ["avant"], isService: false },
  { id: "drive", label: "Drive", startZones: ["avant", "milieu", "fond"], arrivalZones: ["milieu"], isService: false },
  { id: "degagement", label: "Dégagement", startZones: ["fond"], arrivalZones: ["fond"], isService: false },
  { id: "amorti", label: "Amorti", startZones: ["fond", "milieu"], arrivalZones: ["avant"], isService: false },
  { id: "slice", label: "Slice", startZones: ["fond", "milieu"], arrivalZones: ["avant"], isService: false },
  { id: "smash", label: "Smash", startZones: ["fond", "milieu"], arrivalZones: ["milieu"], isService: false },
  { id: "rush", label: "Rush", startZones: ["avant"], arrivalZones: ["milieu"], isService: false },
  { id: "block", label: "Block", startZones: ["avant", "milieu"], arrivalZones: ["avant", "milieu"], isService: false },
  { id: "au_choix", label: "Au choix", startZones: ALL_ZONES, arrivalZones: ALL_ZONES, isService: false },
];

export const SHOTS_BY_ID: Record<ShotId, ShotDefinition> = Object.fromEntries(
  SHOTS.map((shot) => [shot.id, shot]),
) as Record<ShotId, ShotDefinition>;

/** Libellés de toutes les directions (frise, aperçu texte). */
export const SHOT_DIRECTION_LABELS: Record<ShotDirection, string> = {
  droit: "Droit",
  croise: "Croisé",
  centre: "Centre",
  gauche: "Gauche",
  droite: "Droite",
};

/**
 * Les trois boutons de direction du panneau de saisie, toujours à la même
 * place : frappeur sur un côté → Droit / Croisé / Centre ; frappeur au
 * centre → les mêmes boutons affichent Gauche / Centre / Droite.
 */
export const DIRECTION_SLOTS: readonly { side: ShotDirection; center: ShotDirection }[] = [
  { side: "droit", center: "gauche" },
  { side: "croise", center: "centre" },
  { side: "centre", center: "droite" },
];

export const COURT_ZONE_LABELS: Record<CourtZone, string> = {
  avant: "Avant",
  milieu: "Milieu",
  fond: "Fond",
};
