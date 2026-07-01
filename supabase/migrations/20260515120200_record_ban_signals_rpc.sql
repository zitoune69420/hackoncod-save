-- Propagation idempotente des signaux ban (IP, fingerprint, discord_id) pour le middleware Edge.
-- Appelé uniquement avec la service_role : pas accessible aux clients anon (écriture sensible).
-- INSERT IF NOT EXISTS sur chaque table pour éviter de gonfler (ban tables sans contrainte unique
-- existante : doublons innocents tolérés, on garde la 1re occurrence).
--
-- Sanitization stricte : longueurs maxi, regex snowflake / fingerprint, IP non "unknown".

create or replace function public.record_ban_signals(
  p_ip text default null,
  p_fp text default null,
  p_did text default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip text := nullif(trim(coalesce(p_ip, '')), '');
  v_fp text := nullif(trim(coalesce(p_fp, '')), '');
  v_did text := nullif(trim(coalesce(p_did, '')), '');
  v_reason text := nullif(left(coalesce(p_reason, ''), 500), '');
begin
  if v_ip is not null and (v_ip = 'unknown' or char_length(v_ip) > 64) then
    v_ip := null;
  end if;
  if v_fp is not null and (char_length(v_fp) > 256 or v_fp !~ '^[A-Za-z0-9._:\-+/=]+$') then
    v_fp := null;
  end if;
  if v_did is not null and v_did !~ '^\d{5,24}$' then
    v_did := null;
  end if;

  if v_ip is null and v_fp is null then
    return;
  end if;

  if v_ip is not null
     and not exists (select 1 from public.banned_ips where ip = v_ip) then
    insert into public.banned_ips (ip, discord_id, reason)
    values (v_ip, v_did, v_reason);
  end if;

  if v_fp is not null
     and not exists (select 1 from public.banned_fingerprints where fingerprint = v_fp) then
    insert into public.banned_fingerprints (fingerprint, discord_id, reason)
    values (v_fp, v_did, v_reason);
  end if;
end;
$$;

revoke all on function public.record_ban_signals(text, text, text, text) from public;
revoke all on function public.record_ban_signals(text, text, text, text) from anon;
revoke all on function public.record_ban_signals(text, text, text, text) from authenticated;
grant execute on function public.record_ban_signals(text, text, text, text) to service_role;
