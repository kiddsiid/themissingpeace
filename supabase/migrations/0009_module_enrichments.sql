-- Module enrichments (UI/Product Update): playlist approvals, richer documents,
-- decisions linked to a Dream value. Additive + idempotent.
-- Requires 0001..0008 already applied (creates playlist_tracks, documents,
-- vendors, decisions). After a 0000_reset, replay 0001 -> 0009 in order.

-- Playlist: per-song approval status
do $$ begin
  if not exists (select 1 from pg_type where typname = 'track_approval') then
    create type track_approval as enum ('proposed', 'approved', 'declined');
  end if;
end $$;
alter table playlist_tracks add column if not exists approval_status track_approval not null default 'proposed';

-- Documents: real planning records
alter table documents add column if not exists contract_status text;
alter table documents add column if not exists due_date date;
alter table documents add column if not exists notes text;
alter table documents add column if not exists linked_vendor_id uuid references vendors(id) on delete set null;
alter table documents add column if not exists linked_decision_id uuid references decisions(id) on delete set null;

-- Decisions: tie a decision back to a Dream value / Compass priority
alter table decisions add column if not exists linked_dream_value text;
