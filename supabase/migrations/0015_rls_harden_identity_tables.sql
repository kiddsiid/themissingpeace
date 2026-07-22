-- 0015_rls_harden_identity_tables.sql
-- Defense-in-depth: 0001 enabled RLS on every workspace-scoped DATA table but left
-- `workspaces` and `users` open. Server code uses the service role (bypasses RLS), so
-- this does not change existing app behavior; it closes direct enumeration via the
-- anon/authenticated key. Security-definer helper avoids RLS recursion inside policies.

create or replace function auth_visible_user_ids() returns setof uuid
language sql stable security definer as $$
  select u.id from users u where u.clerk_user_id = app_clerk_user_id()
  union
  select wm.user_id from workspace_members wm
   where wm.workspace_id in (select auth_workspace_ids())
$$;

alter table workspaces enable row level security;
drop policy if exists ws_select_member on workspaces;
create policy ws_select_member on workspaces
  for select using (id in (select auth_workspace_ids()));
-- writes stay service-role only (no write policy => denied for authenticated)

alter table users enable row level security;
drop policy if exists users_select_visible on users;
create policy users_select_visible on users
  for select using (id in (select auth_visible_user_ids()));
