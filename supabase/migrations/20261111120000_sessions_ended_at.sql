-- Heure de fin de séance (ticket v1.4.1 « Heure de fin de séance — champ
-- optionnel avec pré-remplissage »).
--
-- Nullable : les séances existantes n'ont pas d'heure de fin et restent
-- valides. Côté app : Session.endedAt (ISO, même jour que created_at), mappé
-- par src/services/supabaseMappers.ts (toSessionRow / fromSessionRow).
--
-- ⚠️ À coller dans le SQL Editor Supabase AVANT de publier une version de
-- l'app qui envoie ended_at : sans la colonne, les upserts de séances
-- échouent (PGRST204 « Could not find the 'ended_at' column »).
alter table public.sessions
  add column if not exists ended_at timestamptz;
