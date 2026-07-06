-- Honeymoon module (Build Plan v2 §16) — the "forever trip". honeymoon_items already exists
-- (0001); this adds trip-level details + status.

create type honeymoon_status as enum ('dreaming','shortlisting','planning','booked','ready','completed');

create table honeymoon_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references workspaces(id) on delete cascade,
  destination text,
  start_date date,
  end_date date,
  budget numeric,
  status honeymoon_status not null default 'dreaming',
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table honeymoon_profiles enable row level security;
create policy ws_member_all on honeymoon_profiles
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));
