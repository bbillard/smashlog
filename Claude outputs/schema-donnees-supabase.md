# Schéma de données Supabase — Smashlog (badlog)

> Source : pas d'accès direct à la base (aucun outil DB connecté dans cette session). Document construit à partir de :
> - `src/types/supabase.ts` (types générés par la CLI Supabase — source la plus fiable pour la forme actuelle des tables) ;
> - `supabase/migrations/*.sql` (4 migrations présentes, toutes des `ALTER`/policies — voir §5, la création initiale des tables n'est **pas** dans le repo) ;
> - les commentaires métier dans `src/services/supabaseMappers.ts`, `migration.ts`, `cloudRestore.ts`, `accountDeletion.ts`.
> Toute affirmation non vérifiable directement dans ces sources est marquée **[hypothèse]**.

## 1. Vue d'ensemble

6 tables, toutes dans le schéma `public`, toutes avec RLS activé. Pas de vues, fonctions RPC exposées côté client, enums Postgres ni types composites (le fichier généré les liste tous vides).

```
auth.users (Supabase Auth, hors schéma applicatif)
      │ [hypothèse] profiles.id → auth.users.id
      ▼
  profiles (1) ──< players (N)
      │                │
      │                ├──< matches.opponent_id / partner_id
      │                │
      ├──< exercises (N)
      ├──< planning_slots (N)
      └──< sessions (N) ──< matches (N)   [matches.session_id]
```

## 2. Tables

### `profiles`

| Colonne | Type | Contrainte | Notes |
|---|---|---|---|
| `id` | uuid | PK, NOT NULL | **[hypothèse]** référence `auth.users.id` (pattern Supabase standard ; confirmé indirectement par `accountDeletion` qui supprime `profiles` avant `auth.admin.deleteUser`, et par les policies `auth.uid() = id`). |
| `username` | text | nullable | |
| `photo_url` | text | nullable | Ajoutée par migration `20260720164426`. Jamais relue par l'app (`cloudRestore.ts` ne restaure que `username` — la photo reste un fichier local par appareil). Colonne write-mostly aujourd'hui. |
| `beta_access` | boolean | nullable | Pas d'origine tracée dans les migrations du repo (préexistante). Verrouillée en écriture côté utilisateur, voir §4. |
| `premium_access` | boolean | nullable | Idem. |
| `admin` | boolean | NOT NULL, défaut `false` | Ajoutée par migration `20260805130000`. Verrouillée en écriture côté utilisateur, voir §4. |
| `created_at` | timestamptz | nullable | |
| `updated_at` | timestamptz | nullable | |

### `players`

| Colonne | Type | Contrainte | Notes |
|---|---|---|---|
| `id` | uuid | PK, NOT NULL | Généré côté app (`createId()`), pas côté DB. |
| `user_id` | uuid | nullable, FK → `profiles.id` | Nullable en base bien que toujours renseigné par l'app — voir §5. |
| `name` | text | NOT NULL | |
| `role` | text | nullable | Existe côté DB mais absent du modèle local `Player` (`src/types/index.ts`) et des mappers — colonne non lue/écrite par l'app actuellement. |
| `avatar_color` | text | nullable | Idem : présent en DB, absent du modèle local et des mappers. |
| `notes` | text | nullable | Ajoutée par migration `20260720164426`. |
| `created_at` | timestamptz | nullable | |

### `exercises`

| Colonne | Type | Contrainte | Notes |
|---|---|---|---|
| `id` | uuid | PK, NOT NULL | |
| `user_id` | uuid | nullable, FK → `profiles.id` | |
| `name` | text | NOT NULL | |
| `category` | text | nullable | Présent en DB, absent du modèle local `Exercise` et des mappers — colonne orpheline, ni lue ni écrite par l'app. |
| `labels` | jsonb (`Json`) | nullable | Renommée depuis `tags` (migration `20260720164426`). Stocke un `string[]` (cast explicite `as unknown as Json` dans `toExerciseRow`). |
| `description` | text | nullable | |
| `players_count` | smallint | nullable | Modèle local : `1 \| 2 \| 3 \| 4`. |
| `duration_minutes` | integer | nullable | |
| `level` | text | nullable | Modèle local : `"debutant" \| "intermediaire" \| "avance"` — pas de contrainte `check`/enum côté DB. |
| `orientation` | text | nullable | Modèle local : `"simple" \| "double" \| "mixte"` — idem, pas de contrainte DB visible. |
| `attention_points` | text | nullable | |
| `variant_easier` | text | nullable | |
| `variant_harder` | text | nullable | |
| `source` | text | nullable | |
| `photos` | text[] | nullable | |
| `created_at` | timestamptz | nullable | |

### `sessions`

| Colonne | Type | Contrainte | Notes |
|---|---|---|---|
| `id` | uuid | PK, NOT NULL | |
| `user_id` | uuid | nullable, FK → `profiles.id` | |
| `date` | date/timestamptz (`string`) | NOT NULL | Pas de champ distinct côté modèle local : dupliquée depuis `session.createdAt` à l'écriture (commentaire explicite dans `toSessionRow`). |
| `title` | text | nullable | |
| `type` | text | NOT NULL | Modèle local `SessionType` : `"match" \| "entrainement" \| "jeu_libre" \| "renforcement" \| "cardio" \| "autre"` — pas d'enum/`check` côté DB. |
| `rating` | smallint/integer (`number`) | nullable | |
| `went_well` | text | nullable | Renommée depuis `bien` (migration `20260720164426`). |
| `went_wrong` | text | nullable | Renommée depuis `moins_bien`. |
| `next_intention` | text | nullable | Renommée depuis `intention`. |
| `free_notes` | text | nullable | Renommée depuis `notes_libres`. |
| `exercise_ids` | uuid[] | nullable | Pas de FK déclarée sur les éléments du tableau (impossible nativement en Postgres sur un array) — intégrité référentielle non garantie par la DB. |
| `notification_scheduled_at` | timestamptz | nullable | Jamais restaurée depuis le cloud (identifiants de notif OS locaux à l'appareil d'origine). |
| `notification_ids` | text[] | nullable | Idem. |
| `created_at` | timestamptz | nullable | |
| `updated_at` | timestamptz | nullable | |

### `matches`

| Colonne | Type | Contrainte | Notes |
|---|---|---|---|
| `id` | uuid | PK, NOT NULL | **Pas d'id local propre côté app** : dérivé de façon déterministe (`deterministicId`) à partir de `session.id` + index de position dans `session.matches`. L'identité d'un match est donc **positionnelle**, pas intrinsèque. |
| `session_id` | uuid | nullable, FK → `sessions.id` | |
| `user_id` | uuid | nullable, FK → `profiles.id` | |
| `opponent` | text | nullable | Provient du modèle local `match.adversaire` (pas de renommage DB, colonne déjà anglaise à l'origine). |
| `opponent_id` | uuid | nullable, FK → `players.id` | |
| `opponent_ids` | uuid[] | nullable | Double/mixte ; pas de FK sur les éléments (limite Postgres sur array). |
| `partner` | text | nullable | |
| `partner_id` | uuid | nullable, FK → `players.id` | |
| `partner_ids` | uuid[] | nullable | Conservé pour rétrocompatibilité (commentaire dans `src/types/session.ts`). |
| `result` | text | nullable | Renommée depuis `resultat`. Modèle local : `"victoire" \| "defaite"`. |
| `mode` | text | nullable | Modèle local : `"simple" \| "double" \| "mixte"`. |
| `sets` | jsonb (`Json`) | nullable | Tableau `{ scoreNous: number; scoreEux: number }[]`. |
| `comment` | text | nullable | Renommée depuis `commentaire`. |
| `created_at` | timestamptz | nullable | Sert à reconstruire l'ordre des matchs d'une séance à la restauration (`cloudRestore.ts`), l'id ne le permettant pas. |

⚠️ Asymétrie de nommage : les colonnes DB sont en anglais, mais le type local `Match` (`src/types/session.ts`) est resté en français (`adversaire`, `resultat`, `commentaire`, `partenaire`) — pont assuré explicitement par `supabaseMappers.ts`. C'est la seule entité dans ce cas (Session/Player/Exercise sont déjà en anglais côté local).

### `planning_slots`

| Colonne | Type | Contrainte | Notes |
|---|---|---|---|
| `id` | uuid | PK, NOT NULL | Généré côté app ; certains ids locaux historiques ne sont pas au format uuid (format legacy `slot-<timestamp>-<random>`) — voir §5. |
| `user_id` | uuid | nullable, FK → `profiles.id` | |
| `day_of_week` | smallint | NOT NULL | Convention `lundi=0 ... dimanche=6`. |
| `hour` | smallint | NOT NULL | |
| `minute` | smallint | NOT NULL | |
| `family` | text | NOT NULL | Renommée depuis `type` (migration `20260720164426`). Modèle local : `"badminton" \| "renforcement" \| "cardio" \| "autre"`. |
| `created_at` | timestamptz | nullable | |

Colonnes historiques `jour`/`heure` (texte libre) supprimées par la même migration, remplacées par `day_of_week`/`hour`/`minute` typés.

## 3. Relations entre les tables

| Table source | Colonne | Référence | Cardinalité |
|---|---|---|---|
| `players` | `user_id` | `profiles.id` | N players → 1 profile |
| `exercises` | `user_id` | `profiles.id` | N exercises → 1 profile |
| `planning_slots` | `user_id` | `profiles.id` | N slots → 1 profile |
| `sessions` | `user_id` | `profiles.id` | N sessions → 1 profile |
| `matches` | `user_id` | `profiles.id` | N matches → 1 profile |
| `matches` | `session_id` | `sessions.id` | N matches → 1 session |
| `matches` | `opponent_id` | `players.id` | N matches → 1 player (optionnel) |
| `matches` | `partner_id` | `players.id` | N matches → 1 player (optionnel) |
| `profiles` | `id` | `auth.users.id` | **[hypothèse]** 1↔1 |

Relation métier **Session ↔ Joueur** : indirecte, uniquement via `matches` (une séance n'a pas de lien direct vers un joueur ; les joueurs apparaissent comme adversaire/partenaire d'un match rattaché à la séance). Une séance peut aussi référencer des exercices via `sessions.exercise_ids` (tableau d'uuid, sans FK déclarative).

## 4. Politiques RLS

RLS activé sur les 6 tables. Pattern uniforme "chacun ne voit/modifie que ses propres lignes" :

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `players` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` (using + check) | `auth.uid() = user_id` |
| `exercises` | idem | idem | idem | idem |
| `planning_slots` | idem | idem | idem | idem |
| `matches` | idem | idem | idem | idem |
| `sessions` | idem | idem | idem | idem |
| `profiles` | `auth.uid() = id` | `auth.uid() = id` | `auth.uid() = id` (using + check) | **aucune policy DELETE** — suppression uniquement via l'Edge Function `delete-account` (clé `service_role`, bypass RLS) |

Protection **colonne par colonne** sur `profiles` (migration `20260805130000`) : un trigger `protect_privileged_profile_columns` verrouille `beta_access`, `premium_access` et `admin` pour toute requête effectuée avec `auth.role() = 'authenticated'` (donc depuis l'app avec le JWT utilisateur) — ces colonnes sont forcées à `false` à l'insert et remises à leur valeur précédente si modifiées à l'update. Objectif explicite : empêcher un utilisateur de s'auto-attribuer le premium/admin via un appel REST direct avec son propre JWT (RLS seul ne bloque pas au niveau colonne). Les requêtes via Dashboard Supabase (`service_role`/`auth.role()` NULL) ne sont pas concernées.

## 5. Points d'attention et dette technique

- **Historique de migrations incomplet.** Les 4 fichiers dans `supabase/migrations/` sont tous des `ALTER TABLE`/policies écrits *a posteriori* ; la création initiale des tables (colonnes de base, PK, FK) n'est **pas** versionnée dans le repo — elle a été faite directement dans le Dashboard Supabase. Impossible de reconstruire le schéma actuel depuis zéro avec uniquement `supabase/migrations/`. Les migrations existantes précisent explicitement qu'elles doivent être collées à la main dans le SQL Editor (pas de CLI/`db push` en usage).
- **`user_id` nullable sur toutes les tables métier**, alors qu'il est toujours renseigné côté app. Pas de `NOT NULL`, pas de comportement `ON DELETE CASCADE`/`SET NULL` visible sur les FK vers `profiles` — cohérent avec le fait que l'Edge Function `delete-account` supprime manuellement chaque table dans l'ordre des dépendances plutôt que de s'appuyer sur une cascade DB.
- **Suppression d'un joueur non propagée aux matchs qui le référencent.** `deletePlayer()` (`src/services/storage.ts`) supprime la ligne `players` (locale + Supabase) mais ne touche pas aux `matches.opponent_id`/`partner_id`/`opponent_ids`/`partner_ids` qui pointent vers cet id — risque de références pendantes (le renommage, lui, est bien propagé via `renamePlayerInSessions`, mais pas la suppression).
- **Colonnes orphelines côté DB** : `players.role`, `players.avatar_color`, `exercises.category` existent dans le schéma généré mais ne sont référencées par aucun mapper ni type local — ni lues, ni écrites par l'app actuellement.
- **`profiles.photo_url` write-mostly** : jamais relue par `cloudRestore.ts` (choix assumé, commenté dans le code — la photo reste un fichier local par appareil), donc peu utile en l'état côté DB au-delà d'un stockage passif.
- **Ids non strictement uuid historiquement sur `planning_slots`.** D'anciens ids locaux au format `slot-<timestamp>-<random>` (générés sur des runtimes JS sans `crypto.randomUUID`) ne respectent pas le type `uuid` de la colonne ; un helper dérive un uuid déterministe à la volée (`planningSlotRowId`) pour l'upsert **et** le delete, sous peine d'erreur Postgres `22P02`. Dette latente si de nouveaux points d'écriture oublient de passer par ce helper.
- **Intégrité référentielle des tableaux d'uuid non garantie.** `sessions.exercise_ids`, `matches.opponent_ids`, `matches.partner_ids` sont des `uuid[]` sans FK (Postgres ne supporte pas nativement une FK sur les éléments d'un array) : rien n'empêche un id orphelin de rester dans ces tableaux.
- **Pas de contrainte `check`/enum côté DB** sur les colonnes qui sont pourtant des unions fermées côté TypeScript (`sessions.type`, `exercises.level`, `exercises.orientation`, `matches.result`, `matches.mode`, `planning_slots.family`) — la validité des valeurs n'est garantie que côté app.
- **`src/types/supabase.ts` généré manuellement**, sans script dans `package.json` pour automatiser la régénération (pas de `supabase gen types` référencé). **[hypothèse]** généré via la CLI Supabase contre le projet lié (`supabase/.temp/linked-project.json`, ref `wzhzkexmlbueedxhjnzs`) — risque de dérive si une migration est appliquée dans le Dashboard sans regénération immédiate des types.
- **Policies RLS validées manuellement, pas par des tests automatisés.** Les commentaires des migrations `20260720180000` et `20260728120000` indiquent une validation "par simulation dans le SQL Editor" (`set role authenticated` + JWT simulé), et la seconde migration existe précisément parce qu'un oubli de policy `INSERT` sur `sessions` a cassé la migration cloud en silence (erreur Postgres `42501`) avant d'être détecté.
