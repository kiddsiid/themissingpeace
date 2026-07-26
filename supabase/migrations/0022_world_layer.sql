-- 0022_world_layer.sql — Phase 3 World layer: Atmosphere + Atelier (Feast deferred).
--
-- RLS IS DEFINED IN THIS MIGRATION for every new table (the live rls_auto_enable event
-- trigger force-enables RLS on new public tables → policy-less = deny-all; canvas_state lesson).
-- Add the matching drops to 0000_reset.

-- Atmosphere plan — one per workspace. Palette + the surfaces it ripples onto.
create table if not exists atmosphere_plans (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  palette_json jsonb not null default '{}'::jsonb,    -- {primary, secondary, accent, neutrals[]}
  surfaces_json jsonb not null default '[]'::jsonb,   -- [{surface, applied, override, note}] invitation|tablescape|florals|cake|lighting|menu_card|attire_context|guest_experience
  updated_by uuid references users(id),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);
alter table atmosphere_plans enable row level security;
drop policy if exists ws_member_all on atmosphere_plans;
create policy ws_member_all on atmosphere_plans
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));

-- Atelier looks — attire per role, with approvers + harmony.
create table if not exists attire_looks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  role text not null,                                  -- 'partner_1'|'partner_2'|'party'|'guest_dress_code'
  label text,
  items_json jsonb not null default '[]'::jsonb,       -- [{kind, title, color, note, image_ref}]
  palette_ref jsonb,                                   -- optional link into atmosphere palette
  approver_ids jsonb not null default '[]'::jsonb,     -- [user_id]
  status text not null default 'draft',                -- 'draft'|'proposed'|'approved'
  created_by uuid references users(id),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);
create index if not exists attire_looks_workspace_idx on attire_looks (workspace_id, role);
alter table attire_looks enable row level security;
drop policy if exists ws_member_all on attire_looks;
create policy ws_member_all on attire_looks
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));

comment on table atmosphere_plans is 'Phase 3: palette + surface ripple state (Atmosphere Lab), per workspace.';
comment on table attire_looks is 'Phase 3: Atelier looks per role with approvers + harmony.';
