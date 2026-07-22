-- 0020_supabase_auth_identity.sql
-- Switch RLS identity from the Clerk JWT to Supabase Auth (auth.uid()).
--
-- Context: the app is moving off Clerk to Supabase Auth so spouses / partners /
-- planners / dreamers each own a profile. `public.users` now links to the Supabase
-- auth user via `auth_user_id = auth.uid()`. Workspaces stay modeled in Postgres
-- (`workspaces` + `workspace_members`) — no Clerk Orgs.
--
-- Every RLS identity helper is re-pointed to auth.uid(); the membership policies
-- themselves are unchanged (they call auth_workspace_ids()), so isolation is preserved.
-- search_path stays pinned (0017 hardening). Idempotent.

-- Link public.users -> auth.users. Nullable during transition; set at sign-up/link time.
alter table users add column if not exists auth_user_id uuid;
create unique index if not exists users_auth_user_id_key on users (auth_user_id) where auth_user_id is not null;

-- Supabase-created users have no Clerk id, so clerk_user_id can no longer be required.
alter table users alter column clerk_user_id drop not null;

-- The current signed-in user's public.users.id (the join key the policies use).
create or replace function auth_user_row_id() returns uuid
  language sql stable security definer set search_path = pg_catalog, public as $$
  select id from users where auth_user_id = auth.uid()
$$;

-- Workspaces the current user actively belongs to — now via auth.uid().
create or replace function auth_workspace_ids() returns setof uuid
  language sql stable security definer set search_path = pg_catalog, public as $$
  select wm.workspace_id
  from workspace_members wm
  where wm.user_id = (select auth_user_row_id())
    and wm.status = 'active'
$$;

-- Users visible to the current user (self + co-members) — via auth.uid().
create or replace function auth_visible_user_ids() returns setof uuid
  language sql stable security definer set search_path = pg_catalog, public as $$
  select (select auth_user_row_id())
  union
  select wm.user_id
  from workspace_members wm
  where wm.workspace_id in (select auth_workspace_ids())
$$;

-- Peace Notes: rewrite the stricter policy off the Clerk GUC and onto auth.uid().
-- Semantics preserved: visible to the author, to a partner when shared, or to a
-- granted/allowed planner. Locked bodies are still gated in the service layer.
drop policy if exists peace_notes_visibility on peace_notes;
create policy peace_notes_visibility on peace_notes
  using (
    workspace_id in (select auth_workspace_ids())
    and (
      author_id = (select auth_user_row_id())
      or (visibility = 'shared_with_partner'
          and exists (select 1 from workspace_members wm
                      where wm.workspace_id = peace_notes.workspace_id
                        and wm.user_id = (select auth_user_row_id())
                        and wm.role in ('owner','partner')))
      or (exists (select 1 from workspace_members wm
                  where wm.workspace_id = peace_notes.workspace_id
                    and wm.user_id = (select auth_user_row_id())
                    and wm.role = 'planner')
          and (planner_access
               or exists (select 1 from peace_note_type_grants g
                          where g.workspace_id = peace_notes.workspace_id
                            and g.type = peace_notes.type
                            and g.grantee_id = (select auth_user_row_id()))))
    )
  );

-- Test-only helper mirroring set_clerk_user: sets the auth.uid() the shim reads.
-- Never granted to client roles (see 0017 for the pattern); used by the proof.
create or replace function set_auth_user(uid uuid)
  returns void language sql security definer set search_path = pg_catalog, public as $$
  select set_config('request.jwt.claim.sub', uid::text, true)
$$;
revoke execute on function set_auth_user(uuid) from public, anon, authenticated;
