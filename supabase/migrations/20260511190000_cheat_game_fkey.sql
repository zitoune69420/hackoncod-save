-- FK manquante entre public.cheat.game_id et public.game.id.
-- Sans elle, PostgREST refuse les embeds `game(...)` dans les selects (PGRST200)
-- et les queries cheats renvoient [] silencieusement.
--
-- Pré-requis : public.game n'a pas de PRIMARY KEY déclarée (schéma incomplet),
-- on l'ajoute d'abord sinon la FK échoue avec SQLSTATE 42830.

alter table public.game
  add constraint game_pkey primary key (id);

alter table public.cheat
  add constraint cheat_game_id_fkey
  foreign key (game_id) references public.game(id) on delete set null;

create index if not exists cheat_game_id_idx on public.cheat (game_id);

notify pgrst, 'reload schema';
