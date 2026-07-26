-- 0024_feast.sql — Phase 5: Feast Studio (the Living Canvas Feast room, un-deferred).
--
-- The Feast Studio is a projection of one Feast Plan + the Guest + Requirement models
-- (Feast-Studio-Redesign-Plan.md §12/§13). Every new workspace table defines its RLS
-- policy in THIS migration (the live rls_auto_enable trigger makes a policy-less table
-- deny-all — the canvas_state lesson). Add the drops to 0000_reset.

-- One Feast Plan per workspace.
create table if not exists feast_plans (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  intention text,
  meal_shape text,
  service_feeling text,
  emotional_root text,
  hospitality_standard text,
  guest_count integer,
  advisory_budget_total_cents integer,
  advisory_budget_per_guest_cents integer,
  currency text not null default 'USD',
  status text not null default 'draft',              -- draft|in_progress|ready_for_brief|confirmed
  version integer not null default 1,
  updated_by uuid references users(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table feast_plans enable row level security;
drop policy if exists ws_member_all on feast_plans;
create policy ws_member_all on feast_plans
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));

-- Meal scenes (the nine-scene flow) — ordered per plan.
create table if not exists meal_scenes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text,
  title text not null,
  purpose text,
  ordinal integer not null default 0,
  planned_at text,
  duration_minutes integer,
  service_style text,
  mood text,
  notes text,
  status text not null default 'empty',              -- empty|in_progress|needs_review|ready
  version integer not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists meal_scenes_ws_idx on meal_scenes (workspace_id, ordinal);
alter table meal_scenes enable row level security;
drop policy if exists ws_member_all on meal_scenes;
create policy ws_member_all on meal_scenes
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));

-- Dishes within a scene.
create table if not exists dishes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  scene_id uuid not null references meal_scenes(id) on delete cascade,
  name text not null,
  role text,
  ingredients_json jsonb not null default '[]'::jsonb,
  story text,
  presentation text,
  execution_notes text,
  service_style text,
  mood text,
  advisory_cost_min_cents integer,
  advisory_cost_max_cents integer,
  status text not null default 'draft',               -- draft|needs_confirmation|confirmed
  source text not null default 'manual',              -- manual|suggested|imported
  version integer not null default 1,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists dishes_scene_idx on dishes (workspace_id, scene_id);
alter table dishes enable row level security;
drop policy if exists ws_member_all on dishes;
create policy ws_member_all on dishes
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));

-- Guest requirements (religious/dietary/allergy/preparation/preference).
create table if not exists guest_requirements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  guest_id uuid references guests(id) on delete cascade,
  category text not null,                             -- religious|dietary|allergy|preparation|preference
  code text not null,
  severity text not null default 'required',          -- preference|required|safety_critical
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists guest_requirements_ws_idx on guest_requirements (workspace_id, category);
alter table guest_requirements enable row level security;
drop policy if exists ws_member_all on guest_requirements;
create policy ws_member_all on guest_requirements
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));

-- Confirmation evidence (source of a vendor/certification confirmation).
create table if not exists confirmation_evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  vendor_record_id uuid references vendors(id) on delete set null,
  source_type text not null,                          -- conversation|email_note|menu|certificate|contract|other
  source_name text not null,
  confirmed_by uuid references users(id),
  confirmed_at timestamptz not null default now(),
  expires_at timestamptz,
  notes text,
  attachment_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists confirmation_evidence_ws_idx on confirmation_evidence (workspace_id);
alter table confirmation_evidence enable row level security;
drop policy if exists ws_member_all on confirmation_evidence;
create policy ws_member_all on confirmation_evidence
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));

-- Dish × requirement assessments (the coverage engine's persisted output).
create table if not exists dish_assessments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  dish_id uuid not null references dishes(id) on delete cascade,
  requirement_code text not null,
  state text not null default 'unknown',              -- unknown|ingredient_compatible|vendor_confirmed|certification_documented|conflict
  reasoning text,
  evidence_id uuid references confirmation_evidence(id) on delete set null,
  assessed_by text not null default 'system',         -- system|planner|partner|vendor_record
  assessed_at timestamptz not null default now(),
  unique (dish_id, requirement_code)
);
create index if not exists dish_assessments_ws_idx on dish_assessments (workspace_id, dish_id);
alter table dish_assessments enable row level security;
drop policy if exists ws_member_all on dish_assessments;
create policy ws_member_all on dish_assessments
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));

-- Immutable caterer brief versions (private; changed-section tracking).
create table if not exists caterer_brief_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  version integer not null default 1,
  status text not null default 'draft',               -- draft|finalized|superseded
  snapshot_json jsonb not null default '{}'::jsonb,
  changed_sections jsonb not null default '[]'::jsonb,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists caterer_brief_versions_idx on caterer_brief_versions (workspace_id, version desc);
alter table caterer_brief_versions enable row level security;
drop policy if exists ws_member_all on caterer_brief_versions;
create policy ws_member_all on caterer_brief_versions
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));

comment on table feast_plans is 'Phase 5: one Feast Plan per workspace (Feast Studio = Living Canvas Feast room).';
comment on table dish_assessments is 'Phase 5: dish×requirement coverage states; ingredient_compatible never means allergy-safe or certified.';
