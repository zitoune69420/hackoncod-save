-- Vérif IP bannie pour le middleware Edge sans clé service_role.
-- PostgREST : POST /rest/v1/rpc/is_ip_banned  body: {"p_ip":"1.2.3.4"}
-- La fonction s’exécute avec les droits du propriétaire (security definer) ;
-- seul un booléen est exposé, pas le contenu de banned_ips.

create or replace function public.is_ip_banned(p_ip text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1
    from public.banned_ips
    where ip = p_ip
    limit 1
  );
$$;

revoke all on function public.is_ip_banned(text) from public;
grant execute on function public.is_ip_banned(text) to anon;
grant execute on function public.is_ip_banned(text) to authenticated;
grant execute on function public.is_ip_banned(text) to service_role;
