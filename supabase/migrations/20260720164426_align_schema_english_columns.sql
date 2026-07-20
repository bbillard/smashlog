-- Migration : alignement du schéma sur des noms de colonnes anglais +
-- complément des colonnes manquantes vs les modèles TypeScript locaux
-- (src/types/index.ts, src/services/onboarding.ts).
--
-- ⚠️ À exécuter manuellement dans Dashboard Supabase > SQL Editor
-- (je n'ai pas d'accès direct à la base, seulement la clé anon côté app,
-- qui ne permet pas de DDL).
--
-- Tables vides à ce stade : script en une seule passe, colonnes
-- day_of_week/hour/minute directement NOT NULL, anciennes colonnes
-- jour/heure supprimées en fin de script.
--
-- RLS est déjà activé sur toutes les tables : ces ALTER ne touchent pas
-- aux policies existantes.

-- ============================================================
-- 1. profiles — déjà en anglais, ajout de la photo de profil
--    (correspond à Profile.photoUri côté app)
-- ============================================================
alter table public.profiles
  add column if not exists photo_url text;

-- ============================================================
-- 2. players — déjà en anglais, ajout des notes libres
--    (correspond à Player.notes côté app)
-- ============================================================
alter table public.players
  add column if not exists notes text;

-- ============================================================
-- 3. exercises — déjà en anglais, renommage tags -> labels et ajout
--    des champs manquants du modèle local Exercise
-- ============================================================
alter table public.exercises
  rename column tags to labels;

alter table public.exercises
  add column if not exists description text,
  add column if not exists players_count smallint,
  add column if not exists duration_minutes integer,
  add column if not exists level text,
  add column if not exists orientation text,
  add column if not exists attention_points text,
  add column if not exists variant_easier text,
  add column if not exists variant_harder text,
  add column if not exists source text,
  add column if not exists photos text[];

-- ============================================================
-- 4. sessions — traduction des colonnes françaises + champs manquants
--    (correspond au modèle local Session)
-- ============================================================
alter table public.sessions rename column bien to went_well;
alter table public.sessions rename column moins_bien to went_wrong;
alter table public.sessions rename column intention to next_intention;
alter table public.sessions rename column notes_libres to free_notes;
alter table public.sessions rename column note to rating;

alter table public.sessions
  add column if not exists title text,
  add column if not exists exercise_ids uuid[],
  add column if not exists notification_scheduled_at timestamptz,
  add column if not exists notification_ids text[];

-- ============================================================
-- 5. matches — traduction + colonnes adversaire/partenaire manquantes
--    (correspond au modèle local Match)
-- ============================================================
alter table public.matches rename column resultat to result;

alter table public.matches
  add column if not exists opponent text,
  add column if not exists opponent_id uuid references public.players(id),
  add column if not exists opponent_ids uuid[],
  add column if not exists partner text,
  add column if not exists partner_id uuid references public.players(id),
  add column if not exists partner_ids uuid[],
  add column if not exists comment text;

-- ============================================================
-- 6. planning_slots — traduction + typage aligné sur ScheduledSlot
--    (jour/heure étaient du texte libre, table vide : on retype
--    directement en NOT NULL et on supprime les anciennes colonnes)
--
--    Convention day_of_week (lundi=0 ... dimanche=6) reprise de
--    DAY_FULL_LABELS dans src/components/planning/PlanningEditor.tsx.
-- ============================================================
alter table public.planning_slots
  add column day_of_week smallint not null,
  add column hour smallint not null,
  add column minute smallint not null;

alter table public.planning_slots
  rename column type to family;

alter table public.planning_slots
  drop column jour,
  drop column heure;
