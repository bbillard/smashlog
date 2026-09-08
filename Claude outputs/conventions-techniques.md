# Conventions techniques — Smashlog (badlog)

> Généré par analyse du code réel du repo (pas de doc source préexistante). À relire en début de session pour respecter immédiatement les conventions en place, sans ré-explorer tout le repo.
> Stack : Expo (Router) + React Native + TypeScript + Supabase.

## 1. Arborescence et rôle des dossiers

| Dossier | Rôle |
|---|---|
| `app/` | Écrans, routing par fichiers (Expo Router). Un fichier = une route. `(tabs)/` = groupe de routes avec tab bar, ignoré dans l'URL. `[id]` = segment dynamique. |
| `src/components/` | Composants UI réutilisables. Sous-dossiers thématiques : `auth/`, `notifications/`, `onboarding/`, `planning/`, `players/`, `share/`. Fichiers racine = composants transverses (boutons, cards, form fields). |
| `src/services/` | Couche accès aux données + logique métier (persistance locale, synchro cloud, auth, notifications, partage). Aucune UI ici. Voir §3. |
| `src/data/` | Données statiques/référentiels embarqués dans l'app (contenu d'exercices par défaut, textes de notifications, contenus de partage) — pas de logique, pas d'accès réseau. |
| `src/context/` | Providers React Context globaux (`AuthContext`, `MigrationContext`, `SyncContext`), montés dans `app/_layout.tsx`. Chacun expose un hook `useXxx()`. |
| `src/hooks/` | Hooks custom réutilisables (`useSessions`, `useAppTheme`, `useNotificationPermission`, `useSidebarSwipe`). |
| `src/utils/` | Fonctions pures, sans effet de bord ni dépendance React/Expo (formatage, calcul de stats, génération d'id, calendrier). |
| `src/types/` | Types TypeScript. `index.ts`/`session.ts`/`profile.ts` = modèles métier locaux. `supabase.ts` = types générés depuis le schéma Supabase (ne pas éditer à la main, voir doc schéma). |
| `src/theme/` | Design tokens : `colors.ts` (thèmes clair/sombre), `typography.ts` (familles de police). |
| `src/constants/` | Constantes UI dérivées du domaine (couleurs par type de séance, options de formulaire, textes légaux). |
| `src/lib/` | Initialisation de clients externes. Un seul fichier aujourd'hui : `supabase.ts` (client Supabase singleton). |
| `supabase/migrations/` | Scripts SQL d'évolution du schéma, à exécuter manuellement dans le Dashboard Supabase (pas de CLI liée en CI). Voir doc schéma pour les limites de cet historique. |
| `supabase/functions/` | Edge Functions Deno (aujourd'hui : `delete-account`, seule opération nécessitant la clé `service_role`). |
| `assets/`, `img/` | Ressources statiques (icônes SVG, logos). |
| `mockups/` | Maquettes HTML statiques, hors build de l'app — matériel de conception, pas du code exécuté par l'app. |
| `legal/` | Textes légaux (CGU, politique de confidentialité) en Markdown. |

Racine notable : pas de dossier `__tests__/` ni de config ESLint/Prettier committée (voir §4).

## 2. Conventions de nommage

| Élément | Convention | Exemple observé |
|---|---|---|
| Fichiers composant | `PascalCase.tsx`, un composant principal par fichier, nom du fichier = nom du composant | `SessionCard.tsx`, `PrimaryButton.tsx` |
| Fichiers écran (`app/`) | `camelCase`/route Expo Router, export **default** (imposé par le framework) | `app/session/new.tsx`, `app/exercise/[id]/edit.tsx` |
| Fichiers service/util/hook | `camelCase.ts` | `storage.ts`, `entitySync.ts`, `useSessions.ts` |
| Composants React | Export **nommé** (`export function XxxComponent`), jamais `export default`, sauf les écrans `app/` | `export function SessionCard(...)` |
| Props d'un composant | Interface `<NomDuComposant>Props` | `interface PrimaryButtonProps` |
| Fonctions CRUD locales (storage.ts) | Verbe + entité : `getXxx`, `addXxx`, `updateXxx`, `deleteXxx`, `replaceXxx`, `getXxxById` | `getSessions`, `addExercise`, `replacePlayers` |
| Fonctions de synchro (entitySync.ts) | `syncXxxUpsert` / `syncXxxDelete` / `syncXxxReplace` | `syncSessionUpsert`, `syncPlayerDelete` |
| Mappers modèle ↔ ligne Supabase | `toXxxRow` (local → DB) / `fromXxxRow` (DB → local) | `toSessionRow`, `fromMatchRow` |
| Clés AsyncStorage | Constante exportée `SCREAMING_SNAKE` en majuscule TS, valeur string `smashlog_xxx` (préfixe legacy `badminton_journal_xxx` sur les sessions) | `export const PLAYERS_KEY = "smashlog_players"` |
| Colonnes DB | `snake_case` anglais (depuis la migration d'alignement de juillet 2026, voir doc schéma) | `went_well`, `opponent_id` |
| Champs des types métier locaux | Anglais `camelCase`, **sauf `Match`** resté en français (`adversaire`, `resultat`, `commentaire`) — dette de nommage assumée, pontée par les mappers | `wentWell`, `nextIntention` vs `match.adversaire` |
| Hooks de contexte | `useXxx()`, un par provider, exporté à la fin du fichier du contexte | `useAuth()`, `useSync()`, `useMigration()` |
| Constantes UI dérivées du domaine | `SCREAMING_SNAKE`, `Record<Type, ...>` | `SESSION_TYPE_LABELS`, `SESSION_COLORS_BG` |

## 3. Pattern d'architecture : la couche `storage.ts` / `src/services/`

### Pourquoi ce pattern existe

L'app est **local-first** : chaque écriture est appliquée immédiatement dans `AsyncStorage` (source de vérité locale, dispo hors-ligne), puis poussée vers Supabase **en fire-and-forget** (`void syncXxx(...)`, jamais `await`é par l'UI). Cela isole trois responsabilités qui ne doivent jamais se mélanger :

1. **UI (`app/`, `src/components/`, `src/hooks/`)** — n'appelle que les fonctions de `src/services/storage.ts` (ou les hooks qui les enveloppent, ex. `useSessions`). Ne connaît ni AsyncStorage, ni Supabase, ni la logique de synchro.
2. **`src/services/storage.ts`** — unique point d'écriture/lecture locale. Une section par entité (Sessions, Exercises, Players, Custom Labels), CRUD complet, retourne toujours les modèles métier locaux (`src/types/`). Après chaque mutation réussie, déclenche la synchro correspondante sans bloquer l'appelant.
3. **Chaîne de synchro (`entitySync.ts` → `supabaseMappers.ts` → `cloudSync.ts` → `syncQueue.ts`)** — traduit et pousse vers Supabase, gère le hors-ligne, ne remonte jamais d'erreur bloquante à l'UI.

Détail de la chaîne de synchro :

| Fichier | Rôle |
|---|---|
| `entitySync.ts` | Fonctions "haut niveau" par entité (`syncSessionUpsert`, etc.), appelées depuis `storage.ts`. Gère les cas particuliers (ex. suppression des matchs retirés d'une séance). No-op silencieux si personne n'est connecté. |
| `supabaseMappers.ts` | Fonctions pures `toXxxRow`/`fromXxxRow`, partagées entre la synchro temps réel, la migration initiale (`migration.ts`) et la restauration cloud (`cloudRestore.ts`) — **une seule source de vérité pour le mapping**, jamais dupliquée. |
| `cloudSync.ts` | Bas niveau, générique sur la table (union discriminée `SyncWriteInput`, pas de `any`). Vérifie la connectivité (`NetInfo`), écrit dans Supabase ou met en file si hors-ligne/erreur. |
| `syncQueue.ts` | File FIFO persistée en AsyncStorage pour les écritures en échec, avec pattern observable (`subscribeToSyncQueue`) consommé par l'UI (`SyncStatusBadge`, `SyncContext`). |
| `migration.ts` | Pousse **tout** le local vers Supabase à chaque connexion (pas seulement la 1ère), via upserts idempotents `ignoreDuplicates: true` sur l'id. |
| `cloudRestore.ts` | Sens inverse : réhydrate AsyncStorage depuis Supabase (nouvel appareil, stockage vidé). |

### Comment étendre ce pattern pour une nouvelle entité

1. Définir le modèle métier dans `src/types/` (anglais `camelCase`, cohérent avec le reste sauf raison de compat explicite).
2. Ajouter la table + policies RLS dans une nouvelle migration `supabase/migrations/` (pattern `auth.uid() = user_id`, voir doc schéma), puis régénérer `src/types/supabase.ts`.
3. Dans `storage.ts` : ajouter une section (clé AsyncStorage `smashlog_xxx`, `getXxx`/`addXxx`/`updateXxx`/`deleteXxx`), appeler la fonction de sync correspondante en `void` après chaque persistance réussie.
4. Dans `supabaseMappers.ts` : ajouter `toXxxRow`/`fromXxxRow`.
5. Dans `entitySync.ts` : ajouter `syncXxxUpsert`/`syncXxxDelete`, brancher sur `cloudSync.syncUpsert`/`syncDelete`.
6. Dans `syncQueue.ts` : ajouter le nom de table à l'union `SyncTable`, et dans `cloudSync.ts` à `SyncRowMap`.
7. Dans `migration.ts` : ajouter `upsertXxx` (batché via `chunk()`, `ignoreDuplicates: true`).
8. Dans `cloudRestore.ts` : ajouter la lecture + `replaceXxx` correspondant côté `storage.ts`.

## 4. Style de code observé

- **TypeScript strict** : `tsconfig.json` étend `expo/tsconfig.base` avec `"strict": true`. Pas de `any` toléré dans les couches critiques (ex. `cloudSync.ts` utilise une union discriminée plutôt qu'un générique pour éviter `any` sur `.from(table).upsert(...)`).
- **Pas de config ESLint/Prettier committée** dans le repo (script `lint` = `expo lint`, config par défaut d'Expo, non surchargée localement). Pas de dossier de tests automatisés.
- **Gestion des erreurs** :
  - Fonctions bas niveau (`writeRow`, `deleteRow` dans `cloudSync.ts`) : `throw` sur erreur Supabase (`if (error) throw error`), remonté à l'appelant.
  - Fonctions de synchro fire-and-forget : erreurs interceptées localement, loggées via `console.warn("[nomModule] ...")`, jamais propagées à l'UI — l'échec bascule l'opération dans `syncQueue`.
  - Fonctions d'orchestration exposées à l'UI (ex. `runMigration`) : retournent une **union discriminée** `{ status: "success", ... } | { status: "error", error }` plutôt que de laisser l'erreur remonter brute.
  - Erreurs Supabase Edge Function : converties en message lisible via un helper dédié (`extractFunctionErrorMessage`).
- **Commentaires** : convention forte et systématique — chaque module/fonction non triviale porte un bloc de commentaire en français expliquant le **pourquoi** (contexte ticket, contrainte métier, edge case, renvoi vers d'autres fichiers), pas seulement le quoi. À reproduire pour tout nouveau code non trivial.
- **Composants React Native/Expo** :
  - Function components, `export function NomDuComposant(props: NomDuComposantProps) { ... }`.
  - `StyleSheet.create({...})` déclaré en bas de fichier, valeurs statiques uniquement ; les couleurs dépendantes du thème sont injectées inline via `useAppTheme()` (`style={[styles.x, { color: theme.text }]}`), jamais codées en dur dans `StyleSheet.create` (sauf couleurs volontairement fixes comme `HEADER_BUTTON_COLOR`).
  - Police via les tokens `fonts.xxx` de `src/theme/typography.ts`, jamais de nom de police en dur dans un composant.
  - Écrans (`app/`) : import du wrapper `Screen` (gère `SafeAreaView`, clavier, scroll, footer) plutôt que de recomposer ces éléments à la main.
  - Import triés en deux blocs séparés par une ligne vide : libs externes d'abord, imports internes (`@/src/...`) ensuite ; alias `@/*` configuré dans `tsconfig.json`.
- **IDs** : `createId()` (`src/utils/id.ts`) pour tout nouvel enregistrement avec id local. `deterministicId()` (`src/utils/deterministicId.ts`, hash FNV-1a) uniquement pour dériver un id stable et idempotent quand l'entité n'a pas d'id local propre (ex. `Match`, imbriqué dans `Session`) — jamais pour un id "normal".

## 5. Règles implicites observées de façon cohérente

- **Aucun accès direct à AsyncStorage ou à Supabase en dehors de `src/services/` et `src/lib/supabase.ts`.** Les écrans et composants ne font jamais `AsyncStorage.getItem` ni `supabase.from(...)` directement.
- **Toute écriture de synchro vers Supabase est fire-and-forget** (`void syncXxx(...)`) — l'UI ne doit jamais attendre le réseau pour continuer.
- **Toute fonction d'écriture Supabase avalise l'absence d'utilisateur connecté en no-op silencieux** (`if (!userId) return`), jamais en erreur.
- **Les mappers (`supabaseMappers.ts`) sont la seule source de vérité pour la conversion local ↔ DB** ; migration, synchro temps réel et restauration cloud les réutilisent tous — ne jamais dupliquer un mapping ailleurs.
- **Les migrations SQL sont rejouables sans erreur** (`drop policy if exists` avant chaque `create policy`, `add column if not exists`).
- **Les listes dérivées d'un type union (ex. `SessionType`) sont toujours définies une seule fois** (`SESSION_TYPE_OPTIONS`) puis dérivées (`SESSION_TYPE_LABELS` via `Object.fromEntries`) — jamais deux `Record` maintenus en parallèle.
- **Pas de classes** : tout le code métier est fonctionnel (fonctions exportées depuis des modules), y compris pour ce qui ressemblerait à des "repositories" ailleurs.
