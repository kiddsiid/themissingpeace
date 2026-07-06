-- 0011 — Honeymoon activity voting (carry-over from session 8/11 Next lists).
-- Per-user hearts on honeymoon items, mirroring playlist_track_hearts (0004).
-- Additive + idempotent; no new enum types (0000_reset unchanged except the drop).

create table if not exists honeymoon_item_hearts (
  honeymoon_item_id uuid not null references honeymoon_items(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (honeymoon_item_id, user_id)
);

-- RLS (consistent with 0004; service layer also scopes by workspace).
alter table honeymoon_item_hearts enable row level security;
drop policy if exists ws_member_all on honeymoon_item_hearts;
create policy ws_member_all on honeymoon_item_hearts
  using (exists (select 1 from honeymoon_items i where i.id = honeymoon_item_hearts.honeymoon_item_id and i.workspace_id in (select auth_workspace_ids())))
  with check (exists (select 1 from honeymoon_items i where i.id = honeymoon_item_hearts.honeymoon_item_id and i.workspace_id in (select auth_workspace_ids())));
