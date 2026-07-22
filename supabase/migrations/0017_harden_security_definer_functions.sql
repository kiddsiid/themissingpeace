-- 0017_harden_security_definer_functions.sql
--
-- Clears the Supabase Security Advisor WARN findings (2026-07-21) without changing
-- behavior:
--
-- 1) function_search_path_mutable — pin a fixed search_path on the SECURITY DEFINER /
--    identity helpers so a caller cannot influence name resolution inside them.
--    `pg_catalog, public` keeps resolution identical (built-ins first, then app tables)
--    while making the path immutable per-call.
-- 2) anon/authenticated_security_definer_function_executable — revoke EXECUTE on the
--    helpers that are NOT meant to be called by clients:
--      * set_clerk_user(text): the GUC identity fallback. The app authenticates via the
--        Clerk JWT (see src/lib/supabase/rls.ts -> supabaseForUser), never this RPC, so
--        no client role needs it. Exposing it to anon was a latent identity-spoof vector.
--      * rls_auto_enable(): an event-trigger function; only the DDL event mechanism should
--        invoke it — never a REST client.
--
--    NOTE: auth_workspace_ids() and auth_visible_user_ids() are intentionally left
--    client-executable: they are evaluated INSIDE RLS policies, so `authenticated` (and
--    `anon` on public routes) must retain EXECUTE or every policy check would fail with
--    "permission denied for function". They are self-scoped (they return only the caller's
--    own workspace/user ids via app_clerk_user_id()), so direct invocation leaks nothing.

alter function public.app_clerk_user_id() set search_path = pg_catalog, public;
alter function public.auth_workspace_ids() set search_path = pg_catalog, public;
alter function public.auth_visible_user_ids() set search_path = pg_catalog, public;
alter function public.set_clerk_user(text) set search_path = pg_catalog, public;
alter function public.peace_note_is_open(public.peace_notes, timestamptz, date) set search_path = pg_catalog, public;

-- Revoke from PUBLIC (the default grant the advisor flags) so the revoke is actually
-- effective; anon/authenticated are also named for explicitness.
revoke execute on function public.set_clerk_user(text) from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
