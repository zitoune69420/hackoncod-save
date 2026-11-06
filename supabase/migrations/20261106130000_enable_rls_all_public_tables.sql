-- Active le RLS sur toutes les tables du schéma public, SANS policy :
-- les rôles anon / authenticated (clé publishable) ne peuvent plus rien lire ni écrire via PostgREST.
--
-- Sans risque pour l'app : tout le code serveur passe par service_role (bypass RLS),
-- les RPC appelées avec la clé publishable (is_*_banned) sont `security definer`,
-- et Better Auth ne stocke rien dans Postgres. Idempotent.

do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
