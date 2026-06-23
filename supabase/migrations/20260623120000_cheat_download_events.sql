-- Suivi des téléchargements de cheats (stats admin : cheats / jeux / modes les plus téléchargés).
-- Écrit uniquement côté serveur (service_role) depuis les routes de download.
-- On stocke des SNAPSHOTS (cheat_name, game_title, mode, platform) en plus des FK afin que
-- les statistiques restent exactes même après suppression/édition d'un cheat ou d'un jeu.

create table if not exists public.cheat_download_events (
  id          uuid primary key default gen_random_uuid(),
  cheat_id    uuid,
  channel     text not null check (channel in ('public', 'vip', 'semivip')),
  cheat_name  text,
  game_id     uuid,
  game_title  text,
  mode        text,
  platform    text,
  country_code text,
  device_type text,
  created_at  timestamptz not null default now()
);

create index if not exists cheat_download_events_created_at_idx
  on public.cheat_download_events (created_at desc);
create index if not exists cheat_download_events_cheat_id_idx
  on public.cheat_download_events (cheat_id);
create index if not exists cheat_download_events_game_id_idx
  on public.cheat_download_events (game_id);
create index if not exists cheat_download_events_mode_idx
  on public.cheat_download_events (mode);

-- Table sensible : aucune écriture/lecture publique. Seul service_role (qui bypass RLS) y accède.
alter table public.cheat_download_events enable row level security;

-- Agrégats pour le dashboard admin (page « Downloads »).
-- Retourne un JSON unique : résumé, répartition par canal, série journalière, tops cheats/jeux/modes/pays.
create or replace function public.cheat_download_stats(
  p_start timestamptz,
  p_end   timestamptz,
  p_limit int default 25
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 25), 100));
  v_total bigint;
  v_summary jsonb;
  v_by_channel jsonb;
  v_series jsonb;
  v_top_cheats jsonb;
  v_top_games jsonb;
  v_top_modes jsonb;
  v_countries jsonb;
begin
  select count(*) into v_total
  from public.cheat_download_events e
  where e.created_at >= p_start and e.created_at < p_end;

  select jsonb_build_object(
    'downloads', v_total,
    'uniqueCheats', (
      select count(distinct coalesce(e.cheat_id::text, e.cheat_name))
      from public.cheat_download_events e
      where e.created_at >= p_start and e.created_at < p_end
    ),
    'uniqueGames', (
      select count(distinct coalesce(e.game_id::text, e.game_title))
      from public.cheat_download_events e
      where e.created_at >= p_start and e.created_at < p_end
        and coalesce(e.game_id::text, e.game_title) is not null
    )
  ) into v_summary;

  select coalesce(jsonb_agg(row_to_json(t) order by t.downloads desc), '[]'::jsonb) into v_by_channel
  from (
    select
      e.channel,
      count(*)::int as downloads,
      case when v_total > 0
        then round((count(*)::numeric / v_total) * 100, 1)
        else 0 end as pct
    from public.cheat_download_events e
    where e.created_at >= p_start and e.created_at < p_end
    group by e.channel
    order by downloads desc
  ) t;

  select coalesce(jsonb_agg(row_to_json(t) order by t."sortKey"), '[]'::jsonb) into v_series
  from (
    select
      extract(epoch from d.day)::bigint as "sortKey",
      to_char(d.day, 'Mon DD') as label,
      coalesce(c.downloads, 0)::int as downloads
    from generate_series(
      date_trunc('day', p_start),
      date_trunc('day', p_end - interval '1 second'),
      interval '1 day'
    ) as d(day)
    left join (
      select date_trunc('day', e.created_at) as day, count(*) as downloads
      from public.cheat_download_events e
      where e.created_at >= p_start and e.created_at < p_end
      group by 1
    ) c on c.day = d.day
  ) t;

  select coalesce(jsonb_agg(row_to_json(t) order by t.downloads desc), '[]'::jsonb) into v_top_cheats
  from (
    select
      coalesce(max(e.cheat_id::text), '') as "cheatId",
      coalesce(max(e.cheat_name), 'Unknown') as name,
      coalesce(max(e.game_title), '') as "gameTitle",
      count(*)::int as downloads
    from public.cheat_download_events e
    where e.created_at >= p_start and e.created_at < p_end
    group by coalesce(e.cheat_id::text, e.cheat_name)
    order by downloads desc
    limit v_limit
  ) t;

  select coalesce(jsonb_agg(row_to_json(t) order by t.downloads desc), '[]'::jsonb) into v_top_games
  from (
    select
      coalesce(max(e.game_id::text), '') as "gameId",
      coalesce(max(e.game_title), 'Unknown') as title,
      count(*)::int as downloads
    from public.cheat_download_events e
    where e.created_at >= p_start and e.created_at < p_end
      and coalesce(e.game_id::text, e.game_title) is not null
    group by coalesce(e.game_id::text, e.game_title)
    order by downloads desc
    limit v_limit
  ) t;

  select coalesce(jsonb_agg(row_to_json(t) order by t.downloads desc), '[]'::jsonb) into v_top_modes
  from (
    select
      coalesce(nullif(trim(e.mode), ''), 'Unknown') as mode,
      count(*)::int as downloads
    from public.cheat_download_events e
    where e.created_at >= p_start and e.created_at < p_end
    group by coalesce(nullif(trim(e.mode), ''), 'Unknown')
    order by downloads desc
    limit v_limit
  ) t;

  select coalesce(jsonb_agg(row_to_json(t) order by t.downloads desc), '[]'::jsonb) into v_countries
  from (
    select
      coalesce(nullif(e.country_code, ''), 'XX') as code,
      count(*)::int as downloads,
      case when v_total > 0
        then round((count(*)::numeric / v_total) * 100, 1)
        else 0 end as pct
    from public.cheat_download_events e
    where e.created_at >= p_start and e.created_at < p_end
    group by coalesce(nullif(e.country_code, ''), 'XX')
    order by downloads desc
    limit v_limit
  ) t;

  return jsonb_build_object(
    'summary', v_summary,
    'byChannel', v_by_channel,
    'series', v_series,
    'topCheats', v_top_cheats,
    'topGames', v_top_games,
    'topModes', v_top_modes,
    'countries', v_countries
  );
end;
$$;

revoke all on function public.cheat_download_stats(timestamptz, timestamptz, int) from public;
grant execute on function public.cheat_download_stats(timestamptz, timestamptz, int) to service_role;
