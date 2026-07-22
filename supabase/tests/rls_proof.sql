-- =====================================================================
-- RLS ISOLATION PROOF — The Missing Peace   (portable: psql OR Supabase SQL editor)
-- Proves workspace isolation: a member of A cannot read/write B's rows,
-- and Peace Notes stay private. Assertions run as role `authenticated`
-- (so RLS applies) using the set_clerk_user() identity fallback (0002/0003).
-- Safe to run repeatedly on a NON-PRODUCTION database: it truncates the
-- seeded identities. DO NOT run against a database with real couples' data.
-- Exits with an error if any core (MUST) isolation check fails.
-- =====================================================================
begin;

-- Keep this proof runnable even after 0017 revokes set_clerk_user from PUBLIC: the
-- grant is transaction-local and rolled back with everything else, so it never
-- weakens a real database. (No-op on a DB where the grant already exists.)
grant execute on function set_clerk_user(text) to authenticated;

truncate users, workspaces restart identity cascade;

insert into users(id,clerk_user_id,email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','clerkA','a@example.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','clerkB','b@example.com');
insert into workspaces(id,clerk_org_id,name,created_by) values
  ('11111111-1111-1111-1111-111111111111','orgA','A Wedding','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222','orgB','B Wedding','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
insert into workspace_members(workspace_id,user_id,role,status) values
  ('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','owner','active'),
  ('22222222-2222-2222-2222-222222222222','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','owner','active');
insert into boards(id,workspace_id,type,title) values
  ('c1111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','master_vision','A'),
  ('c2222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222','master_vision','B');
insert into board_items(workspace_id,board_id,type,title) values
  ('11111111-1111-1111-1111-111111111111','c1111111-1111-1111-1111-111111111111','note','A item'),
  ('22222222-2222-2222-2222-222222222222','c2222222-2222-2222-2222-222222222222','note','B item');
insert into budget_items(workspace_id,title) values
  ('11111111-1111-1111-1111-111111111111','A budget'),
  ('22222222-2222-2222-2222-222222222222','B budget');
insert into decisions(workspace_id,title,category,status) values
  ('11111111-1111-1111-1111-111111111111','A dec','budget','open'),
  ('22222222-2222-2222-2222-222222222222','B dec','budget','open');
insert into guests(workspace_id,first_name,is_child,plus_one_eligible,invited_ceremony,invited_reception,rsvp_status) values
  ('11111111-1111-1111-1111-111111111111','Anna',false,false,true,true,'pending'),
  ('22222222-2222-2222-2222-222222222222','Bob',false,false,true,true,'pending');
insert into peace_notes(id,workspace_id,author_id,type,visibility,lock_kind,planner_access) values
  ('d1111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','letter','private_to_author','none',false),
  ('d2222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','letter','private_to_author','none',false);
insert into canvas_state(workspace_id,board_json) values
  ('11111111-1111-1111-1111-111111111111','{"palette":{"name":"A canvas"}}'),
  ('22222222-2222-2222-2222-222222222222','{"palette":{"name":"B canvas"}}');
insert into ripple_events(workspace_id,source_type,change_kind,summary) values
  ('11111111-1111-1111-1111-111111111111','decision','approved','A ripple'),
  ('22222222-2222-2222-2222-222222222222','decision','approved','B ripple');

create temp table rls_checks(kind text, name text, passed boolean, detail text) on commit drop;
grant all on rls_checks to authenticated;

do $$
declare c int; leak int;
begin
  set local role authenticated;
  perform set_clerk_user('clerkA');
  select count(*) into c from board_items;
    insert into rls_checks values('MUST','A reads only own board_items (expect 1)', c=1,'saw '||c);
  select count(*) into c from budget_items where workspace_id='22222222-2222-2222-2222-222222222222';
    insert into rls_checks values('MUST','A cannot read B budget_items (expect 0)', c=0,'saw '||c);
  select count(*) into c from decisions;
    insert into rls_checks values('MUST','A reads only own decisions (expect 1)', c=1,'saw '||c);
  select count(*) into c from guests where workspace_id='22222222-2222-2222-2222-222222222222';
    insert into rls_checks values('MUST','A cannot read B guests (expect 0)', c=0,'saw '||c);
  begin
    insert into decisions(workspace_id,title,category,status)
      values ('22222222-2222-2222-2222-222222222222','injected by A','budget','open');
    insert into rls_checks values('MUST','A INSERT into B is blocked', false,'INSERT SUCCEEDED — LEAK');
  exception when others then
    insert into rls_checks values('MUST','A INSERT into B is blocked', true,'blocked ('||sqlstate||')');
  end;
  select count(*) into c from peace_notes where id='d1111111-1111-1111-1111-111111111111';
    insert into rls_checks values('MUST','A sees own peace note (expect 1)', c=1,'saw '||c);
  select count(*) into c from canvas_state;
    insert into rls_checks values('MUST','A reads only own canvas_state (expect 1)', c=1,'saw '||c);
  select count(*) into c from canvas_state where workspace_id='22222222-2222-2222-2222-222222222222';
    insert into rls_checks values('MUST','A cannot read B canvas_state (expect 0)', c=0,'saw '||c);
  begin
    insert into canvas_state(workspace_id,board_json)
      values ('22222222-2222-2222-2222-222222222222','{"hacked":true}');
    insert into rls_checks values('MUST','A INSERT into B canvas_state is blocked', false,'INSERT SUCCEEDED — LEAK');
  exception when others then
    insert into rls_checks values('MUST','A INSERT into B canvas_state is blocked', true,'blocked ('||sqlstate||')');
  end;
  select count(*) into c from ripple_events;
    insert into rls_checks values('MUST','A reads only own ripple_events (expect 1)', c=1,'saw '||c);
  select count(*) into c from ripple_events where workspace_id='22222222-2222-2222-2222-222222222222';
    insert into rls_checks values('MUST','A cannot read B ripple_events (expect 0)', c=0,'saw '||c);
  begin
    insert into ripple_events(workspace_id,source_type,change_kind)
      values ('22222222-2222-2222-2222-222222222222','decision','approved');
    insert into rls_checks values('MUST','A INSERT into B ripple_events is blocked', false,'INSERT SUCCEEDED — LEAK');
  exception when others then
    insert into rls_checks values('MUST','A INSERT into B ripple_events is blocked', true,'blocked ('||sqlstate||')');
  end;

  perform set_clerk_user('clerkB');
  select count(*) into c from board_items;
    insert into rls_checks values('MUST','B reads only own board_items (expect 1)', c=1,'saw '||c);
  select count(*) into c from decisions where workspace_id='11111111-1111-1111-1111-111111111111';
    insert into rls_checks values('MUST','B cannot read A decisions (expect 0)', c=0,'saw '||c);
  select count(*) into c from peace_notes where id='d1111111-1111-1111-1111-111111111111';
    insert into rls_checks values('MUST','B cannot see A private peace note (expect 0)', c=0,'saw '||c);

  select count(*) into leak from workspaces;
    insert into rls_checks values('ADVISORY','workspaces enforces RLS (0015)', (leak<=1),'authenticated saw '||leak||' (want 1)');
  select count(*) into leak from users;
    insert into rls_checks values('ADVISORY','users enforces RLS (0015)', (leak<=1),'authenticated saw '||leak||' (want 1)');
  reset role;
end $$;

select kind, case when passed then 'PASS' else 'FAIL' end as result, name, detail
from rls_checks order by kind desc, name;

do $$
declare f int;
begin
  select count(*) into f from rls_checks where kind='MUST' and not passed;
  if f>0 then raise exception 'RLS PROOF FAILED: % core isolation check(s) failed', f; end if;
  raise notice 'RLS PROOF PASSED: all core isolation checks green';
end $$;

rollback;  -- leave the database as we found it
