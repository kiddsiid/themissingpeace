-- Living Canvas: the creative board slice (Feast / Atmosphere / Atelier).
--
-- The three studios and the Living Canvas hub read/write a single JSON board
-- object per workspace (mirrors the prototype's `board` slice: food, palette,
-- attire, inspirations). Stored as JSONB so the studios can evolve the shape
-- without a migration per field, matching the design handoff's data model.

create table if not exists canvas_state (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  board_json jsonb not null default '{}'::jsonb,
  context_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table canvas_state is
  'Living Canvas board slice (food/palette/attire/inspirations) per workspace, one JSON row.';

-- RLS: canvas_state is workspace-scoped, so it takes the same membership policy as
-- every other workspace table from 0001. Server code reads/writes it through the
-- service role (see src/lib/canvas/store.ts), which bypasses RLS; this policy closes
-- direct anon/authenticated enumeration and keeps the table consistent with the
-- platform's isolation model (cf. 0015 hardening of the identity tables).
alter table canvas_state enable row level security;
drop policy if exists ws_member_all on canvas_state;
create policy ws_member_all on canvas_state
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));
