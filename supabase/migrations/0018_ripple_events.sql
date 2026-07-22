-- 0018_ripple_events.sql — Phase 2 ripple layer.
--
-- A ripple is a recorded consequence: when something changes (a decision is approved, a
-- budget item moves, a vendor is booked, the guest count or Compass changes), we log which
-- areas it affects so the UI can show "this rippled to: budget, seating, timeline" and the
-- `ripple_viewed` analytics event has something to point at.
--
-- RLS IS DEFINED HERE IN THE SAME MIGRATION. The live `rls_auto_enable` event trigger
-- force-enables RLS on every new public table; without a policy the table is instantly
-- deny-all (the canvas_state gap from Phase 1). This migration ships create + policy together.

create table if not exists ripple_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_type text not null,            -- 'decision' | 'budget_item' | 'vendor' | 'guest_count' | 'compass' | 'task' | 'board_item'
  source_id uuid,                       -- the entity that changed (null for aggregate changes like guest_count)
  change_kind text not null,            -- 'created' | 'updated' | 'status_changed' | 'approved' | 'removed'
  summary text,                         -- human phrase, e.g. "Venue decision approved"
  impact_json jsonb not null default '[]'::jsonb,  -- [{area, note, severity?}] affected areas
  origin_run_id uuid references planning_engine_runs(id) on delete set null, -- if engine-detected
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists ripple_events_workspace_idx on ripple_events (workspace_id, created_at desc);

comment on table ripple_events is
  'Phase 2 ripple layer: recorded consequences of a change and the areas it affects, per workspace.';

alter table ripple_events enable row level security;
drop policy if exists ws_member_all on ripple_events;
create policy ws_member_all on ripple_events
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));
