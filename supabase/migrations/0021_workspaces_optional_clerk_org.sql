-- 0021_workspaces_optional_clerk_org.sql
-- Supabase-native workspaces have no Clerk organization, so clerk_org_id can no
-- longer be required. Strictly relaxing: existing rows and queries are unaffected.
-- The unique index on clerk_org_id stays; Postgres treats NULLs as distinct, so
-- many native workspaces can coexist with a null clerk_org_id.

alter table workspaces alter column clerk_org_id drop not null;
