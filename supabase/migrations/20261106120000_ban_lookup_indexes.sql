-- Index pour les RPC appelées par le middleware à CHAQUE requête
-- (is_ip_banned, is_fingerprint_banned, is_discord_banned) et pour les purges au déban
-- (delete ... where discord_id = ...). Sans eux : scan complet de la table à chaque hit.
-- Idempotent (if not exists) : peut être rejoué sans risque.

create index if not exists banned_ips_ip_idx
  on public.banned_ips (ip);
create index if not exists banned_ips_discord_id_idx
  on public.banned_ips (discord_id);

create index if not exists banned_fingerprints_fingerprint_idx
  on public.banned_fingerprints (fingerprint);
create index if not exists banned_fingerprints_discord_id_idx
  on public.banned_fingerprints (discord_id);

create index if not exists retard_user_id_idx
  on public.retard (user_id);

create index if not exists users_discord_user_id_site_banned_idx
  on public.users (discord_user_id)
  where site_banned = true;
