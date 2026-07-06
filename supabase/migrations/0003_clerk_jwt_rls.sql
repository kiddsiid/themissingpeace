-- Switch RLS identity from a per-request GUC helper to the Clerk/Supabase JWT.
-- Clerk's native Supabase integration should issue a token whose `sub` is the
-- Clerk user id and whose role is usable by Supabase RLS.

create or replace function app_clerk_user_id()
returns text
language sql
stable
as $$
  select nullif(coalesce(
    auth.jwt() ->> 'clerk_user_id',
    auth.jwt() ->> 'user_id',
    auth.jwt() ->> 'sub',
    current_setting('app.clerk_user_id', true)
  ), '')
$$;

create or replace function auth_workspace_ids() returns setof uuid
language sql stable security definer as $$
  select wm.workspace_id
  from workspace_members wm
  join users u on u.id = wm.user_id
  where u.clerk_user_id = app_clerk_user_id()
    and wm.status = 'active'
$$;
