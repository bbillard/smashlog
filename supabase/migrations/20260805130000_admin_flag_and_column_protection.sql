-- Ajoute le flag admin (même mécanique que beta_access / premium_access :
-- une colonne boolean sur public.profiles, lue par l'app via AuthContext).
alter table public.profiles
  add column if not exists admin boolean not null default false;

-- Sécurise l'écriture de beta_access, premium_access et admin : la policy
-- RLS "Users can update own profile" (auth.uid() = id) autorise un
-- utilisateur à modifier sa propre ligne (nécessaire pour username /
-- photo_url), mais RLS ne restreint pas au niveau colonne. Sans ce trigger,
-- un utilisateur connecté pourrait s'auto-attribuer premium_access = true
-- (ou admin = true) via un appel direct à l'API REST avec son propre JWT.
--
-- Le Dashboard Supabase (Table Editor / SQL Editor) exécute les requêtes
-- sans JWT applicatif : auth.role() y renvoie NULL, donc ces modifications
-- passent normalement. Seules les requêtes authentifiées comme un
-- utilisateur "authenticated" (donc venant de l'app) voient ces 3 colonnes
-- verrouillées à leur valeur existante.
create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' then
      new.beta_access := false;
      new.premium_access := false;
      new.admin := false;
    elsif tg_op = 'UPDATE' then
      if new.beta_access is distinct from old.beta_access
         or new.premium_access is distinct from old.premium_access
         or new.admin is distinct from old.admin then
        new.beta_access := old.beta_access;
        new.premium_access := old.premium_access;
        new.admin := old.admin;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_privileged_profile_columns_trigger on public.profiles;

create trigger protect_privileged_profile_columns_trigger
  before insert or update on public.profiles
  for each row
  execute function public.protect_privileged_profile_columns();
