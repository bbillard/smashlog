-- Complète les policies RLS sur `sessions`.
--
-- ⚠️ À exécuter manuellement dans Dashboard Supabase > SQL Editor.
--
-- Contexte : `sessions` avait déjà des policies RLS depuis le ticket "Setup
-- Supabase", validées uniquement via simulation SQL Editor (isolation en
-- lecture entre user A et user B). Elles ne couvraient apparemment pas
-- l'insertion depuis l'app : la migration cloud (src/services/migration.ts)
-- échoue avec "new row violates row-level security policy for table
-- sessions" (Postgres 42501) dès qu'elle tente d'upserter une vraie séance.
--
-- Même pattern que players/exercises/planning_slots/matches (cf.
-- 20260720180000_rls_policies_data_tables.sql) : `drop policy if exists`
-- avant chaque `create policy`, donc rejouable sans erreur même si une
-- ancienne policy du même nom existe déjà.

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own" on public.sessions
  for select using (auth.uid() = user_id);

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own" on public.sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own" on public.sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sessions_delete_own" on public.sessions;
create policy "sessions_delete_own" on public.sessions
  for delete using (auth.uid() = user_id);
