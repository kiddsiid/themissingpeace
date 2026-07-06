-- Collaborative wedding playlist (Build Plan v2 — Music & Entertainment; spec guest song requests).
-- Partners + planner (and later guests) gather songs by moment; hearts = collaborative voting.

create type playlist_moment as enum ('ceremony','cocktail','dinner','first_dance','party','do_not_play','other');
create type track_source    as enum ('spotify','apple_music','youtube','soundcloud','other');

create table playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  moment playlist_moment not null default 'party',
  title text not null,
  artist text,
  source track_source not null default 'other',
  source_url text,
  image_url text,
  note text,                       -- e.g. "our first date song"
  added_by uuid references users(id),
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index on playlist_tracks (workspace_id);
create index on playlist_tracks (workspace_id, moment);

create table playlist_track_hearts (
  track_id uuid not null references playlist_tracks(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (track_id, user_id)
);

-- RLS (consistent with 0001; service layer also scopes by workspace).
alter table playlist_tracks enable row level security;
create policy ws_member_all on playlist_tracks
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));

alter table playlist_track_hearts enable row level security;
create policy ws_member_all on playlist_track_hearts
  using (exists (select 1 from playlist_tracks t where t.id = playlist_track_hearts.track_id and t.workspace_id in (select auth_workspace_ids())))
  with check (exists (select 1 from playlist_tracks t where t.id = playlist_track_hearts.track_id and t.workspace_id in (select auth_workspace_ids())));
