-- 0013 — Guest surfaces (North Star Wave A/B). The public wedding website, RSVP flow,
-- and guest photo album. One page per workspace, addressed by slug; all public access is
-- served server-side via the service role and gated on is_published + per-feature toggles.
-- No new enum types. Additive + idempotent.

create table if not exists guest_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references workspaces(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,60}[a-z0-9])?$'),
  is_published boolean not null default false,
  welcome text,
  rsvp_open boolean not null default true,
  photos_open boolean not null default true,
  show_mood boolean not null default true,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists guest_pages_slug_idx on guest_pages (slug);

create table if not exists guest_photos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  upload_id uuid not null references uploads(id) on delete cascade,
  uploader_name text,
  caption text,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists guest_photos_ws_idx on guest_photos (workspace_id);

-- RLS (couple/planner access; the public path never touches PostgREST directly).
alter table guest_pages enable row level security;
drop policy if exists ws_member_all on guest_pages;
create policy ws_member_all on guest_pages
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));

alter table guest_photos enable row level security;
drop policy if exists ws_member_all on guest_photos;
create policy ws_member_all on guest_photos
  using (workspace_id in (select auth_workspace_ids()))
  with check (workspace_id in (select auth_workspace_ids()));
