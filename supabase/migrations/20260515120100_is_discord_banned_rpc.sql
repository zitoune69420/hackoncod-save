-- Vérif ban via Discord snowflake pour le middleware Edge sans clé service_role.
-- PostgREST : POST /rest/v1/rpc/is_discord_banned  body: {"p_did":"123456789012345678"}
-- Combine : banned_ips.discord_id, retard.user_id, users.discord_user_id (WHERE site_banned).
-- security definer : seul un booléen est exposé, jamais le contenu des tables sources.

create or replace function public.is_discord_banned(p_did text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists(select 1 from public.banned_ips where discord_id = p_did limit 1)
    or exists(select 1 from public.retard where user_id = p_did limit 1)
    or exists(
      select 1 from public.users
      where discord_user_id = p_did and site_banned = true
      limit 1
    );
$$;

revoke all on function public.is_discord_banned(text) from public;
grant execute on function public.is_discord_banned(text) to anon;
grant execute on function public.is_discord_banned(text) to authenticated;
grant execute on function public.is_discord_banned(text) to service_role;
