-- 0016_rls_backfill_missing_policies.sql
--
-- Backfill: reconcile the LIVE database with the migration source.
--
-- Root cause (found via Supabase Security Advisor on 2026-07-21): an event trigger
-- `rls_auto_enable()` enables RLS on every new public table at CREATE time, but it
-- does NOT create policies. On the live DB the policy statements from 0004/0005/0006
-- (and canvas_state's policy) never landed, leaving these tables RLS-ENABLED with NO
-- POLICY = deny-all. That is safe (no leak; the app reaches them via the service role,
-- which bypasses RLS) but WRONG: the RLS client (supabaseForUser) would see zero rows,
-- and it diverges from the intended design. This migration restores the intended
-- membership policies, matching the exact patterns in 0001/0004/0005/0006/0014.
--
-- Idempotent: `enable` is a no-op when already on; every policy is drop-if-exists then
-- create. Safe to run repeatedly and safe whether or not the amended 0014 has been applied.

-- Direct workspace_id tables → standard membership policy (mirrors 0001 ws_member_all).
do $$
declare t text;
begin
  foreach t in array array['canvas_state','households','guests','honeymoon_profiles','playlist_tracks']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists ws_member_all on %I;', t);
    execute format(
      'create policy ws_member_all on %I using (workspace_id in (select auth_workspace_ids())) with check (workspace_id in (select auth_workspace_ids()));',
      t
    );
  end loop;
end $$;

-- Child table: workspace resolved through the parent playlist_tracks (mirrors 0004).
alter table playlist_track_hearts enable row level security;
drop policy if exists ws_member_all on playlist_track_hearts;
create policy ws_member_all on playlist_track_hearts
  using (exists (select 1 from playlist_tracks t where t.id = playlist_track_hearts.track_id and t.workspace_id in (select auth_workspace_ids())))
  with check (exists (select 1 from playlist_tracks t where t.id = playlist_track_hearts.track_id and t.workspace_id in (select auth_workspace_ids())));

-- NOTE on `link_previews`: it is a GLOBAL, cross-workspace URL-metadata cache with no
-- workspace_id. 0001 intentionally leaves it un-RLS'd; the event trigger force-enabled
-- RLS, so it is now deny-all. That is the SAFEST posture for a shared cache (clients
-- cannot enumerate which URLs were previewed platform-wide), and the app reaches it via
-- the service role. It is deliberately left client-inaccessible here; the resulting
-- "RLS enabled, no policy" advisor notice for link_previews is expected and accepted.
