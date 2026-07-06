-- 0012 — Seating Studio (North Star Wave A, flagship; supersedes Build Plan v2 §26).
-- Charts (reception / ceremony / custom), draggable tables, and per-seat guest assignments
-- on top of the 0005 guest CRM. No new enum types (text + check constraints) so 0000_reset
-- only gains table drops. Additive + idempotent.

create table if not exists seating_charts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null default 'Reception',
  kind text not null default 'reception' check (kind in ('reception','ceremony','custom')),
  canvas_w int not null default 1600,
  canvas_h int not null default 1000,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists seating_charts_ws_idx on seating_charts (workspace_id);

create table if not exists seating_tables (
  id uuid primary key default gen_random_uuid(),
  chart_id uuid not null references seating_charts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  label text not null default 'Table',
  shape text not null default 'round' check (shape in ('round','rect','square','head','row')),
  capacity int not null default 8 check (capacity between 1 and 40),
  x double precision not null default 60,
  y double precision not null default 60,
  w double precision not null default 140,
  h double precision not null default 140,
  rotation double precision not null default 0,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists seating_tables_chart_idx on seating_tables (chart_id);

create table if not exists seat_assignments (
  id uuid primary key default gen_random_uuid(),
  chart_id uuid not null references seating_charts(id) on delete cascade,
  table_id uuid not null references seating_tables(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  seat_index int not null default 0 check (seat_index >= 0),
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique (table_id, seat_index),
  unique (chart_id, guest_id)
);
create index if not exists seat_assignments_chart_idx on seat_assignments (chart_id);

-- RLS (consistent with 0001/0005; service layer also scopes by workspace).
alter table seating_charts enable row level security;
drop policy if exists ws_member_all on seating_charts;
create policy ws_member_all on seating_charts
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));

alter table seating_tables enable row level security;
drop policy if exists ws_member_all on seating_tables;
create policy ws_member_all on seating_tables
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));

alter table seat_assignments enable row level security;
drop policy if exists ws_member_all on seat_assignments;
create policy ws_member_all on seat_assignments
  using (exists (select 1 from seating_charts c where c.id = seat_assignments.chart_id and c.workspace_id in (select auth_workspace_ids())))
  with check (exists (select 1 from seating_charts c where c.id = seat_assignments.chart_id and c.workspace_id in (select auth_workspace_ids())));
