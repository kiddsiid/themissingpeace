-- The Missing Peace — core-loop schema (Build Plan v2 §4).
-- System of record = Postgres/Supabase. Liveblocks holds ephemeral board positions/presence.
-- Scope: identity, board, plan objects, Peace Notes, Dream/Compass, Peace Engine.
-- Remaining spec §20 tables (honeymoon detail, contracts, payment_milestones, rsvps, etc.)
-- ship as later migrations; FKs to them are added when those tables land.

create extension if not exists "pgcrypto";

-- ───────────────────────── enums ─────────────────────────
create type member_role        as enum ('owner','partner','planner','collaborator','contributor','viewer','admin');
create type member_status       as enum ('invited','active','removed');
create type date_status         as enum ('known','range','none');
create type planning_stage      as enum ('just_engaged','exploring_vision','venue_hunting','vendor_booking','guest_list_building','final_details','wedding_week','post_wedding');
create type budget_confidence   as enum ('firm','flexible','unknown');

create type board_type          as enum ('master_vision','venue','ceremony','reception','attire','food_beverage','florals_decor','photo_video','guest_experience','music_entertainment','stationery_signage','honeymoon','prewedding','custom');
create type board_item_type     as enum ('image','pdf','link','pinterest_pin','pinterest_board','tiktok','instagram','vendor_site','youtube','screenshot','note','color_swatch','file','checklist','decision_card','vendor_card','budget_card','guest_experience_card');
create type board_item_disposition as enum ('captured','organized','discussing','approved','rejected','poofed','archived');

create type link_target_type    as enum ('vendor','task','budget_item','decision','event','document','honeymoon_item');

create type decision_category   as enum ('budget','guest','vendor','design','attire','menu','venue','timeline','family','cultural_religious','honeymoon');
create type decision_status     as enum ('open','discussing','needs_vote','needs_planner_input','approved','deferred','rejected','changed');

create type task_category       as enum ('budget','venue','vendor','guest','design','attire','food','legal','travel','beauty','ceremony','reception','honeymoon','post_wedding');
create type task_status         as enum ('not_started','in_progress','waiting','needs_decision','done','skipped');
create type task_priority       as enum ('low','med','high');

create type vendor_category     as enum ('venue','planner','photographer','videographer','caterer','bar_service','cake_desserts','florist','decorator','rental_company','dj','band','ceremony_musicians','officiant','hair','makeup','attire','alterations','stationery','signage','transportation','hotel_room_block','travel_advisor','honeymoon_advisor','content_creator','photo_booth','childcare','pet_attendant','security','insurance','other');
create type vendor_status       as enum ('idea','shortlisted','inquired','responded','quote_received','comparing','selected','booked','paid_deposit','fully_paid','declined','unavailable','archived');

create type event_kind         as enum ('planning_task','run_of_show','guest_itinerary');
create type event_visibility   as enum ('private','shareable');
create type document_folder    as enum ('contracts','quotes','invoices','mood_sheets','attire','menu','guest_lists','legal','venue','floor_plans','seating_charts','honeymoon','insurance','misc');

-- Peace Notes (Build Plan v2 §6½)
create type peace_note_type     as enum ('letter','vow','gratitude','dedication','memory');
create type peace_note_visibility as enum ('private_to_author','shared_with_partner');
create type peace_note_lock_kind  as enum ('none','date','event');
create type peace_note_lock_event as enum ('wedding_day','anniversary');

-- Peace Engine (Build Plan v2 §4.6)
create type engine_trigger_type   as enum ('manual','onboarding','change_event','scheduled');
create type recommendation_type   as enum ('next_action','poof_suggestion','decision_prompt','budget_guidance','vendor_gap','guest_impact','compass_check');
create type recommendation_status as enum ('new','accepted','dismissed','deferred','completed');
create type risk_type             as enum ('budget','guest_count','timeline','vendor_booking','document','decision_bottleneck','dream_mismatch','planner_workload','family_pressure','weather','destination_travel');
create type risk_status           as enum ('open','acknowledged','resolved','dismissed');
create type feedback_type         as enum ('helpful','not_helpful','wrong','already_done','not_relevant','save_for_later');

-- ───────────────────────── identity & workspace ─────────────────────────
create table users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  name text, display_name text, avatar_url text,
  email text not null, phone text,
  created_at timestamptz not null default now()
);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text unique not null,
  name text not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role member_role not null default 'collaborator',
  partner_label text,
  invited_by uuid references users(id),
  status member_status not null default 'invited',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index on workspace_members (workspace_id);
create index on workspace_members (user_id);

create table wedding_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references workspaces(id) on delete cascade,
  partner_one_label text not null default 'Partner One',
  partner_two_label text not null default 'Partner Two',
  date_status date_status not null default 'none',
  wedding_date date, date_range_start date, date_range_end date,
  planning_stage planning_stage not null default 'just_engaged',
  guest_estimate int, guest_max int,
  budget_total numeric, budget_confidence budget_confidence not null default 'unknown',
  honeymoon_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Dream & Wedding Compass (§4.5) ─────────────────────────
create table dreams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  responses_json jsonb not null default '{}',
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table wedding_compass (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references workspaces(id) on delete cascade,
  dream_id uuid references dreams(id),
  summary text,
  priorities_json jsonb, non_negotiables_json jsonb, avoid_json jsonb,
  cultural_values_json jsonb, traditions_json jsonb,
  tone text,
  version int not null default 1,
  updated_by uuid references users(id),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── board ─────────────────────────
create table boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type board_type not null,
  title text not null,
  is_optional boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index on boards (workspace_id);

create table board_collections (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  name text not null,
  sort int not null default 0
);

create table link_previews (
  id uuid primary key default gen_random_uuid(),
  canonical_url text not null,
  title text, description text, image_url text, favicon_url text, author text,
  source_domain text, raw_meta jsonb,
  fetched_at timestamptz not null default now()
);

create table uploads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  bucket text not null, path text not null,
  mime text, size bigint, width int, height int,
  uploaded_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table board_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,
  collection_id uuid references board_collections(id) on delete set null,
  type board_item_type not null,
  title text, body text, color_hex text,
  source_url text,
  link_preview_id uuid references link_previews(id),
  upload_id uuid references uploads(id),
  disposition board_item_disposition not null default 'captured',
  is_favorite boolean not null default false,
  approved_by uuid references users(id), approved_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on board_items (workspace_id);
create index on board_items (board_id);

create table board_item_positions (
  board_item_id uuid primary key references board_items(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,
  x double precision not null default 0, y double precision not null default 0,
  w double precision, h double precision, z int not null default 0,
  rotation double precision not null default 0,
  group_id uuid, pinned boolean not null default false,
  updated_at timestamptz not null default now()
);

create table board_comments (
  id uuid primary key default gen_random_uuid(),
  board_item_id uuid not null references board_items(id) on delete cascade,
  author_id uuid not null references users(id),
  body text not null,
  mentions uuid[] not null default '{}',
  parent_id uuid references board_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table board_votes (
  id uuid primary key default gen_random_uuid(),
  board_item_id uuid not null references board_items(id) on delete cascade,
  user_id uuid not null references users(id),
  value smallint not null default 1,
  created_at timestamptz not null default now(),
  unique (board_item_id, user_id)
);

create table board_tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  label text not null, color_hex text
);
create table board_item_tags (
  board_item_id uuid not null references board_items(id) on delete cascade,
  board_tag_id uuid not null references board_tags(id) on delete cascade,
  primary key (board_item_id, board_tag_id)
);

-- ───────────────────────── plan objects ─────────────────────────
create table vendors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null, category vendor_category not null default 'other',
  website text, social_json jsonb,
  contact_name text, email text, phone text, location text,
  status vendor_status not null default 'idea',
  quote_amount numeric, package_notes text, internal_notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index on vendors (workspace_id);

create table vendor_comparisons (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text, vendor_ids uuid[] not null default '{}',
  fields jsonb, final_recommendation text,
  created_at timestamptz not null default now()
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references workspaces(id) on delete cascade,
  total numeric, confidence budget_confidence not null default 'unknown',
  created_at timestamptz not null default now()
);
create table budget_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null, planned_amount numeric, sort int not null default 0
);
create table budget_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  category_id uuid references budget_categories(id) on delete set null,
  title text not null,
  estimated_cost numeric, quoted_cost numeric, committed_cost numeric, paid_amount numeric,
  deposit_due date, final_due date,
  vendor_id uuid references vendors(id) on delete set null,
  notes text, created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index on budget_items (workspace_id);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null, description text,
  category decision_category not null,
  status decision_status not null default 'open',
  due_date date, final_choice text, rationale text,
  created_by uuid references users(id),
  approved_by uuid references users(id), approved_at timestamptz,
  created_at timestamptz not null default now()
);
create index on decisions (workspace_id);
create table decision_options (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  label text not null, detail text,
  linked_board_item_id uuid references board_items(id) on delete set null,
  sort int not null default 0
);
create table decision_votes (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  option_id uuid references decision_options(id) on delete cascade,
  user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique (decision_id, user_id)
);
create table decision_approvals (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  required_user_id uuid not null references users(id),
  status text not null default 'pending',
  acted_at timestamptz
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null, description text,
  category task_category not null default 'venue',
  owner_id uuid references users(id),
  status task_status not null default 'not_started',
  due_date date, reminder_date date, priority task_priority not null default 'med',
  linked_decision_id uuid references decisions(id) on delete set null,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index on tasks (workspace_id);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null, target_date date, sort int not null default 0
);

create table events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind event_kind not null,
  title text not null, date date, time text, location text,
  responsible_id uuid references users(id),
  notes text, visibility event_visibility not null default 'private'
);
create index on events (workspace_id);

create table documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  folder document_folder not null default 'misc',
  upload_id uuid references uploads(id),
  title text, created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create table document_links (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  target_type link_target_type not null, target_id uuid not null
);

create table honeymoon_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text, title text, status text, notes text,
  created_at timestamptz not null default now()
);

-- The conversion edge: a board item -> whatever it became (Build Plan v2 §4.2 / §5).
create table board_item_links (
  id uuid primary key default gen_random_uuid(),
  board_item_id uuid not null references board_items(id) on delete cascade,
  target_type link_target_type not null,
  target_id uuid not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index on board_item_links (board_item_id);

-- ───────────────────────── Peace Notes (§6½) ─────────────────────────
create table peace_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  author_id uuid not null references users(id),
  type peace_note_type not null,
  title text,
  body_encrypted bytea,         -- envelope-encrypted; never returned while locked
  body_preview text,            -- optional author-set teaser
  visibility peace_note_visibility not null default 'private_to_author',
  attach_to_type link_target_type, attach_to_id uuid,  -- for "why we chose this" memories
  lock_kind peace_note_lock_kind not null default 'none',
  lock_date date,
  lock_event peace_note_lock_event,
  lock_anniversary_index smallint,
  planner_access boolean not null default false,
  opened_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on peace_notes (workspace_id);
create index on peace_notes (author_id);

create table peace_note_type_grants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  grantee_id uuid not null references users(id),
  type peace_note_type not null,
  granted_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique (workspace_id, grantee_id, type)
);

-- ───────────────────────── Peace Engine (§4.6) ─────────────────────────
create table planning_engine_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  trigger_type engine_trigger_type not null,
  trigger_source_type text, trigger_source_id uuid,
  status text not null default 'completed',
  started_at timestamptz not null default now(), completed_at timestamptz,
  created_by uuid references users(id),
  summary text
);
create index on planning_engine_runs (workspace_id);

create table planning_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  engine_run_id uuid references planning_engine_runs(id) on delete set null,
  title text not null, description text,
  recommendation_type recommendation_type not null,
  priority task_priority not null default 'med',
  reason text,
  linked_entity_type text, linked_entity_id uuid,
  suggested_owner_id uuid references users(id), suggested_due_date date,
  status recommendation_status not null default 'new',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on planning_recommendations (workspace_id);

create table planning_risks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  engine_run_id uuid references planning_engine_runs(id) on delete set null,
  risk_type risk_type not null, severity text,
  title text not null, description text, suggested_resolution text,
  linked_entity_type text, linked_entity_id uuid,
  status risk_status not null default 'open',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on planning_risks (workspace_id);

create table planning_dependencies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_entity_type text not null, source_entity_id uuid not null,
  depends_on_entity_type text not null, depends_on_entity_id uuid not null,
  dependency_reason text, status text not null default 'open',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table planning_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  snapshot_type text, summary text,
  budget_snapshot_json jsonb, vendor_snapshot_json jsonb, guest_snapshot_json jsonb,
  decision_snapshot_json jsonb, timeline_snapshot_json jsonb, dream_alignment_json jsonb,
  created_at timestamptz not null default now()
);

create table recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  recommendation_id uuid not null references planning_recommendations(id) on delete cascade,
  user_id uuid not null references users(id),
  feedback_type feedback_type not null, feedback_note text,
  created_at timestamptz not null default now()
);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_id uuid references users(id),
  action text not null, entity_type text, entity_id uuid,
  meta jsonb, created_at timestamptz not null default now()
);
create index on audit_events (workspace_id);

-- ───────────────────────── RLS scaffolding ─────────────────────────
-- Helper: the set of workspace ids the current Clerk user belongs to (active).
-- NOTE (Codex): adapt to how you expose the Clerk user id to Postgres
-- (JWT claim -> users.clerk_user_id). This stub assumes a GUC 'app.clerk_user_id'.
create or replace function auth_workspace_ids() returns setof uuid
language sql stable security definer as $$
  select wm.workspace_id
  from workspace_members wm
  join users u on u.id = wm.user_id
  where u.clerk_user_id = current_setting('app.clerk_user_id', true)
    and wm.status = 'active'
$$;

-- Enable RLS. Tables with a direct workspace_id get the simple membership policy;
-- child tables resolve their workspace through a parent (board / decision / document).
do $$
declare t text;
begin
  foreach t in array array[
    'workspace_members','wedding_profiles','dreams','wedding_compass','boards','uploads',
    'board_items','board_tags','vendors','vendor_comparisons','budgets','budget_categories',
    'budget_items','decisions','tasks','milestones','events','documents','honeymoon_items',
    'planning_engine_runs','planning_recommendations','planning_risks','planning_dependencies',
    'planning_snapshots','recommendation_feedback','audit_events'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('create policy ws_member_all on %I using (workspace_id in (select auth_workspace_ids())) with check (workspace_id in (select auth_workspace_ids()));', t);
  end loop;
end $$;

-- Child tables: workspace is resolved via the parent row (no direct workspace_id column).
do $$
declare r record;
begin
  for r in select * from (values
    ('board_collections','boards','board_id'),
    ('board_item_positions','boards','board_id'),
    ('board_comments','board_items','board_item_id'),
    ('board_votes','board_items','board_item_id'),
    ('board_item_tags','board_items','board_item_id'),
    ('board_item_links','board_items','board_item_id'),
    ('decision_options','decisions','decision_id'),
    ('decision_votes','decisions','decision_id'),
    ('decision_approvals','decisions','decision_id'),
    ('document_links','documents','document_id')
  ) as t(child, parent, fk)
  loop
    execute format('alter table %I enable row level security;', r.child);
    execute format(
      'create policy ws_member_all on %I using (exists (select 1 from %I p where p.id = %I.%I and p.workspace_id in (select auth_workspace_ids()))) with check (exists (select 1 from %I p where p.id = %I.%I and p.workspace_id in (select auth_workspace_ids())));',
      r.child, r.parent, r.child, r.fk, r.parent, r.child, r.fk
    );
  end loop;
end $$;

-- Peace Notes: stricter than the rest (Build Plan v2 §4.4).
-- Visible only to author, or to partner when shared, or to a granted planner.
-- The LOCKED-body rule + decryption gate is enforced in the service layer:
-- never SELECT body_encrypted into a response until peace_note_is_open(...) passes.
alter table peace_notes enable row level security;
create policy peace_notes_visibility on peace_notes
  using (
    workspace_id in (select auth_workspace_ids())
    and (
      author_id = (select id from users where clerk_user_id = current_setting('app.clerk_user_id', true))
      or (visibility = 'shared_with_partner'
          and exists (select 1 from workspace_members wm
                      join users u on u.id = wm.user_id
                      where wm.workspace_id = peace_notes.workspace_id
                        and u.clerk_user_id = current_setting('app.clerk_user_id', true)
                        and wm.role in ('owner','partner')))
      or (exists (select 1 from workspace_members wm
                  join users u on u.id = wm.user_id
                  where wm.workspace_id = peace_notes.workspace_id
                    and u.clerk_user_id = current_setting('app.clerk_user_id', true)
                    and wm.role = 'planner')
          and (planner_access
               or exists (select 1 from peace_note_type_grants g
                          join users gu on gu.id = g.grantee_id
                          where g.workspace_id = peace_notes.workspace_id
                            and g.type = peace_notes.type
                            and gu.clerk_user_id = current_setting('app.clerk_user_id', true))))
    )
  );
alter table peace_note_type_grants enable row level security;
create policy grants_ws on peace_note_type_grants
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));

-- Lock resolver (Build Plan v2 §4.3a). True when the note is openable now.
create or replace function peace_note_is_open(n peace_notes, now_ts timestamptz, wedding date)
returns boolean language plpgsql immutable as $$
begin
  if n.lock_kind = 'none' then return true; end if;
  if n.lock_kind = 'date' then return n.lock_date is not null and now_ts::date >= n.lock_date; end if;
  if n.lock_kind = 'event' then
    if wedding is null then return false; end if;
    if n.lock_event = 'wedding_day' then return now_ts::date >= wedding; end if;
    if n.lock_event = 'anniversary' then
      return now_ts::date >= (wedding + (coalesce(n.lock_anniversary_index,1) || ' years')::interval)::date;
    end if;
  end if;
  return false;
end $$;
