-- Helper used by src/lib/supabase/rls.ts to drive auth_workspace_ids() under RLS.
-- Sets the per-transaction GUC the policies in 0001_init.sql read.
create or replace function set_clerk_user(uid text)
returns void language sql security definer as $$
  select set_config('app.clerk_user_id', uid, true);
$$;
