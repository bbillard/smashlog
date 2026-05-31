# Rapport d'audit — projet `badlog`

Date : 2026-04-17
Périmètre : répertoires `app/` et `src/` (58 fichiers `.ts`/`.tsx`), `package.json`, racine projet.
Modèle : lecture seule — aucun fichier modifié.

Convention importante : le projet utilise **expo-router** (file-based routing).
Tous les fichiers de `app/` sont des routes automatiques et sont donc considérés comme « utilisés » par construction (pas d'import explicite).

---

## (1) Fichiers et composants non importés

### Fichier complètement mort

- **`src/hooks/useSessions.ts`** — le hook `useSessions()` n'est importé dans aucun fichier.
  Chaque écran (`app/(tabs)/index.tsx`, `app/(tabs)/stats.tsx`, `app/sessions.tsx`, `app/session/[id].tsx`, `app/_layout.tsx`) réimplémente sa propre logique de chargement via `getSessions()` + `useFocusEffect`.
  Fichier candidat à la suppression ou à une adoption réelle.

### Fichiers partiellement morts (exports non consommés)

- **`src/utils/format.ts`** — deux exports jamais référencés :
  - `formatEditableDateTime` (ligne 28)
  - `parseEditableDateTime` (ligne 37)
  Les autres exports (`formatDate`, `formatShortDate`, `truncate`) sont utilisés.

### Fichier `app/` à confirmer

- **`app/debug.tsx`** est une route valide expo-router, mais son accès est réservé à `__DEV__ && username === "admin"`. Ce n'est pas un fichier mort, mais c'est un écran de développement laissé dans le bundle de production (cf. section 5).

### Aucun autre composant orphelin détecté

Tous les composants de `src/components/**` sont importés au moins une fois. Tous les services, types, thèmes, hooks (hors `useSessions`) et constantes sont référencés.

---

## (2) Variables et fonctions déclarées mais jamais utilisées

### Styles morts dans les `StyleSheet.create(...)`

- **`app/settings.tsx`** (lignes 344-350)
  - `styles.row` — déclaré, jamais utilisé dans le JSX
  - `styles.half` — déclaré, jamais utilisé dans le JSX

### Constantes du thème jamais utilisées

- **`src/theme/colors.ts`** (ligne 13) — `palette.white: "#FFFFFF"` : déclaré mais jamais référencé, ni dans le fichier ni ailleurs (le `palette` n'est pas exporté publiquement, seul `lightTheme` / `darkTheme` le sont).

### Fonctions exportées utilisées uniquement localement

Ces fonctions ne sont pas mortes, mais leur `export` est inutile (consommation 100% interne au fichier). Purement cosmétique :

- **`src/components/planning/PlanningEditor.tsx`** (ligne 36) — `getFamilyTokens` : `export` inutile, utilisée uniquement dans le même fichier.
- **`src/services/settings.ts`** (lignes 46, 75) — `getUpcomingScheduledSlotDates` et `getNextScheduledSlotDate` : `export` inutile, utilisées uniquement en interne via `getUpcomingReminderEntries` / `applyPlanningToNotificationSettings`.

### Aucun bloc de code mort supplémentaire détecté

Toutes les `const`/`let`/`function` locales des autres fichiers sont effectivement lues ou appelées.

---

## (3) Imports inutilisés en tête de fichier

Après lecture exhaustive des 58 fichiers source, **aucun import inutilisé** n'a été détecté. Tous les symboles importés (`import { X, Y }` ou `import Foo`) apparaissent bien dans le corps du fichier.

### Point de vigilance (pas un bug mais à noter)

- **`app/_layout.tsx`** importe `@react-navigation/native` (ligne 12), mais cette dépendance **n'est pas déclarée** dans `package.json`. L'import fonctionne uniquement parce que `expo-router` la tire en transitive. C'est fragile (changement mineur dans expo-router → build cassé). Voir section (4).

---

## (4) Dépendances `package.json` non référencées dans les sources

### Jamais importées directement dans `app/` ni `src/`

Les dépendances suivantes n'apparaissent dans aucun `import` du code utilisateur. Elles peuvent toutefois être utilisées indirectement (peer deps, support web, chargement natif Expo) — à vérifier avant toute suppression.

| Dépendance | Statut probable |
|---|---|
| `expo-constants` | Aucun `import "expo-constants"` dans les sources. Souvent requis indirectement par SDK Expo — à tester en retirant. |
| `react-native-screens` | Aucun import direct. Peer/requis par `expo-router` et `@react-navigation/native`. **Ne pas retirer.** |
| `react-native-web` | Aucun import direct. Nécessaire uniquement si build web (`expo start --web`). Retirable si aucune cible web. |
| `react-native-worklets` | Aucun import direct. Peer de `react-native-reanimated`. **Ne pas retirer.** |
| `react-dom` | Aucun import direct. Nécessaire uniquement pour la cible web (via react-native-web). |

### Dépendances effectivement référencées

Les dépendances suivantes sont importées dans au moins un fichier et sont donc légitimement présentes :

`@expo-google-fonts/dm-sans`, `@expo-google-fonts/syne`, `@expo/vector-icons`, `@react-native-async-storage/async-storage`, `@react-native-community/datetimepicker`, `expo-font`, `expo-image-picker`, `expo-media-library`, `expo-notifications`, `expo-router`, `expo-sharing`, `expo-status-bar`, `react`, `react-native`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-svg`, `react-native-view-shot`.

### Dépendance importée mais absente de `package.json`

- **`@react-navigation/native`** : importée dans `app/_layout.tsx` (`DarkTheme`, `ThemeProvider`) mais **pas déclarée** dans `package.json`. À ajouter explicitement pour ne pas dépendre du hoisting transitif d'expo-router.

### devDependencies

`@babel/core`, `@types/react`, `typescript` — toutes légitimes, utilisées par Expo/Babel/TS.

---

## (5) Fichiers de debug / temporaires / console.log

### Fichiers de debug

- **`app/debug.tsx`** — 605 lignes. Écran de test pour injection de séances fictives, overrides de streak, prévisualisation des cartes de partage. Route protégée par `__DEV__ && username === "admin"` mais **livrée dans le bundle**. Impacts :
  - Ajoute ~20 ko (compressé) au binaire et plusieurs imports (`SpecialShareCard`, `AsyncStorage`, etc.) qui peuvent déjà l'être ailleurs.
  - Dans ce fichier, plusieurs constantes propres au debug persistent dans AsyncStorage : `DEBUG_SESSION_PREFIX`, `DEBUG_REAL_SESSIONS_BACKUP_KEY` (`"badlog_debug_real_sessions_backup"`).
  Recommandation : envelopper dans un conditionnel de build (`if (__DEV__)`) ou sortir du dossier `app/` pour ne pas polluer les routes en prod.

### Fichiers `test-*`, `old-*`, `backup-*`, `*.bak`, `*.old`, `*.tmp`

- Le scan `find` renvoie **uniquement `app/debug.tsx`** (matché à cause du préfixe `debug`).
- **Aucun fichier** `test-*`, `old-*`, `backup-*`, `*.bak`, `*.old`, `*.tmp` détecté.

### Fichiers mockups (HTML) non utilisés par l'app

Les fichiers suivants sont des maquettes HTML de travail. Ils ne sont pas consommés par le bundle React Native mais restent dans le repo :

- `mockups/smashlog-card-sessions-week-v2.html`
- `mockups/smashlog-cards-epiques.html`
- `mockups/smashlog-cards-generiques.html`
- `mockups/smashlog-mockups.html`
- `mockups/smashlog-onboarding.html`
- `mockups/smashlog-share.html`

Ne pollue pas le build, mais à vérifier si le dossier `mockups/` doit rester versionné.

### `console.log` / `console.warn` / `console.error`

**Zéro occurrence** dans le code utilisateur (`app/` + `src/`). Le projet est propre sur ce point.

### Autres artefacts repérés

- Fichiers `.DS_Store` présents (`/.DS_Store`, `src/.DS_Store`). Non suivis par Metro mais bruit Git si jamais ignorés.
- Dossiers versionnés : `.expo/`, `img/`, `assets/icons` — normaux pour un projet Expo.

---

## Récapitulatif exécutif

| Catégorie | Nb éléments | Impact |
|---|---:|---|
| Fichier complètement mort | 1 (`useSessions.ts`) | Faible — simple hook non adopté |
| Exports inutilisés (fonctions/styles) | 4 | Très faible — cleanup cosmétique |
| Imports inutilisés | 0 | — |
| Dépendances candidates à l'audit | 5 | À tester au cas par cas (web/transitives) |
| Dépendance manquante dans `package.json` | 1 (`@react-navigation/native`) | Moyen — fragilité du build |
| Fichiers debug laissés dans le bundle | 1 (`app/debug.tsx`) | Faible en taille, à cadrer |
| `console.*` dans les sources | 0 | Propre |
| Fichiers temporaires (`test-*`, `.bak`, etc.) | 0 | Propre |

Le codebase est globalement propre. Les trois actions à plus fort ROI (sans les exécuter ici) seraient :

1. Déclarer explicitement `@react-navigation/native` dans `package.json`.
2. Supprimer ou adopter `src/hooks/useSessions.ts`.
3. Retirer `formatEditableDateTime` / `parseEditableDateTime` de `src/utils/format.ts`.
