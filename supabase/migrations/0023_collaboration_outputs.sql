-- 0023_collaboration_outputs.sql — Phase 4: decision ledger depth, object comments, output versions.
-- New tables define RLS in-migration (rls_auto_enable → policy-less = deny-all). Add drops to 0000_reset.

-- Decision ledger depth (additive; decisions already carries RLS from 0001).
alter table decisions
  add column if not exists linked_dream_ids jsonb not null default '[]'::jsonb,   -- Compass/Dream links
  add column if not exists affected_objects_json jsonb not null default '[]'::jsonb, -- [{type,id}] ripple targets
  add column if not exists version integer not null default 1;

-- Object comments — collaboration threads attached to any object (never Peace Notes).
create table if not exists object_comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  object_type text not null,               -- 'decision'|'board_item'|'vendor'|'dish'|'look'|'guest'...
  object_id uuid not null,
  body text not null,
  author_id uuid references users(id),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists object_comments_target_idx on object_comments (workspace_id, object_type, object_id, created_at);
alter table object_comments enable row level security;
drop policy if exists ws_member_all on object_comments;
create policy ws_member_all on object_comments
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));

-- Output versions — immutable versions of printables/briefs/exports with stale tracking.
create table if not exists output_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  output_kind text not null,               -- 'escort_cards'|'caterer_brief'|'menu_cards'|'seating_sign'...
  payload_json jsonb not null default '{}'::jsonb,
  source_hash text,                        -- hash of the source plan; drives "update available"
  is_stale boolean not null default false,
  version integer not null default 1,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists output_versions_kind_idx on output_versions (workspace_id, output_kind, version desc);
alter table output_versions enable row level security;
drop policy if exists ws_member_all on output_versions;
create policy ws_member_all on output_versions
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));

comment on table object_comments is 'Phase 4: collaboration comments on any object (never Peace Notes).';
comment on table output_versions is 'Phase 4: immutable output versions + stale tracking for printables/briefs/exports.';
