-- =====================================================================
-- RLS ISOLATION PROOF (Supabase Auth) — identity via auth.uid() (migration 0020).
-- Proves workspace isolation + Peace Note privacy hold after moving off Clerk.
-- Non-prod only (truncates seeded identities); transaction-wrapped (begin..rollback).
-- Run behind an auth.uid() shim, or on a Supabase branch with two auth users.
-- =====================================================================
begin;
grant execute on function set_auth_user(uuid) to authenticated;  -- tx-local, rolled back
truncate users, workspaces restart identity cascade;
-- users: auth_user_id set, clerk_user_id now nullable
insert into users(id,clerk_user_id,email,auth_user_id) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',null,'a@ex.com','a1111111-1111-1111-1111-111111111111'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',null,'b@ex.com','b2222222-2222-2222-2222-222222222222');
insert into workspaces(id,clerk_org_id,name,created_by) values
 ('11111111-1111-1111-1111-111111111111','orgA','A','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
 ('22222222-2222-2222-2222-222222222222','orgB','B','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
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
 ('11111111-1111-1111-1111-111111111111','A bud'),('22222222-2222-2222-2222-222222222222','B bud');
insert into decisions(workspace_id,title,category,status) values
 ('11111111-1111-1111-1111-111111111111','A dec','budget','open'),('22222222-2222-2222-2222-222222222222','B dec','budget','open');
insert into peace_notes(id,workspace_id,author_id,type,visibility,lock_kind,planner_access) values
 ('d1111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','letter','private_to_author','none',false),
 ('d2222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','letter','private_to_author','none',false);
insert into canvas_state(workspace_id,board_json) values
 ('11111111-1111-1111-1111-111111111111','{}'),('22222222-2222-2222-2222-222222222222','{}');
insert into ripple_events(workspace_id,source_type,change_kind) values
 ('11111111-1111-1111-1111-111111111111','decision','approved'),('22222222-2222-2222-2222-222222222222','decision','approved');

create temp table ck(name text, passed boolean, detail text) on commit drop;
grant all on ck to authenticated;
do $$ declare c int; begin
  set local role authenticated;
  perform set_auth_user('a1111111-1111-1111-1111-111111111111');
  select count(*) into c from board_items; insert into ck values('A reads only own board_items', c=1,'saw '||c);
  select count(*) into c from budget_items where workspace_id='22222222-2222-2222-2222-222222222222'; insert into ck values('A cannot read B budget_items', c=0,'saw '||c);
  select count(*) into c from decisions where workspace_id='22222222-2222-2222-2222-222222222222'; insert into ck values('A cannot read B decisions', c=0,'saw '||c);
  select count(*) into c from canvas_state; insert into ck values('A reads only own canvas_state', c=1,'saw '||c);
  select count(*) into c from ripple_events; insert into ck values('A reads only own ripple_events', c=1,'saw '||c);
  begin insert into decisions(workspace_id,title,category,status) values('22222222-2222-2222-2222-222222222222','hack','budget','open');
    insert into ck values('A INSERT into B is blocked', false,'LEAK'); exception when others then insert into ck values('A INSERT into B is blocked', true,'blocked ('||sqlstate||')'); end;
  select count(*) into c from peace_notes where id='d1111111-1111-1111-1111-111111111111'; insert into ck values('A sees own peace note', c=1,'saw '||c);
  select count(*) into c from peace_notes where id='d2222222-2222-2222-2222-222222222222'; insert into ck values('A cannot see B peace note', c=0,'saw '||c);
  select count(*) into c from workspaces; insert into ck values('workspaces RLS (auth) sees 1', c=1,'saw '||c);
  select count(*) into c from users; insert into ck values('users RLS (auth) sees 1', c=1,'saw '||c);
  perform set_auth_user('b2222222-2222-2222-2222-222222222222');
  select count(*) into c from board_items; insert into ck values('B reads only own board_items', c=1,'saw '||c);
  select count(*) into c from peace_notes where id='d1111111-1111-1111-1111-111111111111'; insert into ck values('B cannot see A peace note', c=0,'saw '||c);
  reset role;
end $$;
select case when passed then 'PASS' else 'FAIL' end as r, name, detail from ck order by name;
do $$ declare f int; begin select count(*) into f from ck where not passed;
  if f>0 then raise exception 'AUTH RLS PROOF FAILED: % checks', f; end if;
  raise notice 'AUTH RLS PROOF PASSED (identity via auth.uid())'; end $$;
rollback;
