-- Guest CRM (Build Plan v2 §13 / spec). Households + guests + RSVP. Private in v1 (no portal).

create type rsvp_status as enum ('pending','accepted','declined');

create table households (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  address text,
  relationship_group text,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index on households (workspace_id);

create table guests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  relationship text,
  is_child boolean not null default false,
  plus_one_eligible boolean not null default false,
  plus_one_name text,
  invited_ceremony boolean not null default true,
  invited_reception boolean not null default true,
  rsvp_status rsvp_status not null default 'pending',
  meal_choice text,
  dietary text,
  accessibility text,
  traveling_from text,
  song_request text,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index on guests (workspace_id);
create index on guests (workspace_id, household_id);

-- RLS (direct workspace policy; consistent with 0001).
alter table households enable row level security;
create policy ws_member_all on households using (workspace_id in (select auth_workspace_ids())) with check (workspace_id in (select auth_workspace_ids()));
alter table guests enable row level security;
create policy ws_member_all on guests using (workspace_id in (select auth_workspace_ids())) with check (workspace_id in (select auth_workspace_ids()));
