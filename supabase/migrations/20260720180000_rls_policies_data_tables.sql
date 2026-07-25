-- RLS policies pour players / exercises / planning_slots / matches / profiles.
--
-- ⚠️ À exécuter manuellement dans Dashboard Supabase > SQL Editor (même
-- contrainte que la migration précédente : pas d'accès CLI/DDL direct).
--
-- Contexte : RLS est activé sur toutes les tables (ticket "Setup Supabase"),
-- et le pattern `auth.uid() = user_id` a été validé sur `sessions` via
-- simulation SQL Editor (set role authenticated + request.jwt.claims).
-- Les autres tables n'ont pas encore de policies vérifiées — sans elles, la
-- migration automatique (src/services/migration.ts) échouera silencieusement
-- avec des erreurs RLS (42501) sur tout insert/upsert.
--
-- `drop policy if exists` avant chaque `create policy` : script rejouable
-- sans erreur si une policy partielle existe déjà.

-- ============================================================
-- players
-- ============================================================
drop policy if exists "players_select_own" on public.players;
create policy "players_select_own" on public.players
  for select using (auth.uid() = user_id);

drop policy if exists "players_insert_own" on public.players;
create policy "players_insert_own" on public.players
  for insert with check (auth.uid() = user_id);

drop policy if exists "players_update_own" on public.players;
create policy "players_update_own" on public.players
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "players_delete_own" on public.players;
create policy "players_delete_own" on public.players
  for delete using (auth.uid() = user_id);

-- ============================================================
-- exercises
-- ============================================================
drop policy if exists "exercises_select_own" on public.exercises;
create policy "exercises_select_own" on public.exercises
  for select using (auth.uid() = user_id);

drop policy if exists "exercises_insert_own" on public.exercises;
create policy "exercises_insert_own" on public.exercises
  for insert with check (auth.uid() = user_id);

drop policy if exists "exercises_update_own" on public.exercises;
create policy "exercises_update_own" on public.exercises
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "exercises_delete_own" on public.exercises;
create policy "exercises_delete_own" on public.exercises
  for delete using (auth.uid() = user_id);

-- ============================================================
-- planning_slots
-- ============================================================
drop policy if exists "planning_slots_select_own" on public.planning_slots;
create policy "planning_slots_select_own" on public.planning_slots
  for select using (auth.uid() = user_id);

drop policy if exists "planning_slots_insert_own" on public.planning_slots;
create policy "planning_slots_insert_own" on public.planning_slots
  for insert with check (auth.uid() = user_id);

drop policy if exists "planning_slots_update_own" on public.planning_slots;
create policy "planning_slots_update_own" on public.planning_slots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "planning_slots_delete_own" on public.planning_slots;
create policy "planning_slots_delete_own" on public.planning_slots
  for delete using (auth.uid() = user_id);

-- ============================================================
-- matches
-- ============================================================
drop policy if exists "matches_select_own" on public.matches;
create policy "matches_select_own" on public.matches
  for select using (auth.uid() = user_id);

drop policy if exists "matches_insert_own" on public.matches;
create policy "matches_insert_own" on public.matches
  for insert with check (auth.uid() = user_id);

drop policy if exists "matches_update_own" on public.matches;
create policy "matches_update_own" on public.matches
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "matches_delete_own" on public.matches;
create policy "matches_delete_own" on public.matches
  for delete using (auth.uid() = user_id);

-- ============================================================
-- profiles — select/update de sa propre ligne uniquement.
-- Pas de policy insert : la ligne est créée par ensureAuthProfile()
-- (src/services/authProfile.ts) avec id = auth.uid(), couverte par
-- "with check (auth.uid() = id)".
-- ============================================================
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
