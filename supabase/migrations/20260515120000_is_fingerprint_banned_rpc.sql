-- Vérif fingerprint banni pour le middleware Edge sans clé service_role.
-- PostgREST : POST /rest/v1/rpc/is_fingerprint_banned  body: {"p_fp":"abc..."}
-- security definer : seul un booléen est exposé, jamais le contenu de banned_fingerprints.

create or replace function public.is_fingerprint_banned(p_fp text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1
    from public.banned_fingerprints
    where fingerprint = p_fp
    limit 1
  );
$$;

revoke all on function public.is_fingerprint_banned(text) from public;
grant execute on function public.is_fingerprint_banned(text) to anon;
grant execute on function public.is_fingerprint_banned(text) to authenticated;
grant execute on function public.is_fingerprint_banned(text) to service_role;
