-- Money Map: forecast, payment, contribution, scenario, and benchmark layer.

do $$
begin
  create type money_map_payment_status as enum ('planned','due','paid','late','waived','cancelled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type budget_alert_status as enum ('open','acknowledged','resolved','dismissed');
exception when duplicate_object then null;
end $$;

alter table wedding_profiles add column if not exists wedding_location text;
alter table wedding_profiles add column if not exists wedding_type text not null default 'local';

alter table budget_categories add column if not exists source text;
alter table budget_categories add column if not exists compass_value text;
alter table budget_categories add column if not exists is_priority boolean not null default false;

alter table budget_items add column if not exists quote_source text;
alter table budget_items add column if not exists linked_compass_value text;
alter table budget_items add column if not exists guest_count_assumption int;
alter table budget_items add column if not exists approval_status text not null default 'not_required';
alter table budget_items add column if not exists approved_by uuid references users(id);
alter table budget_items add column if not exists approved_at timestamptz;

create table if not exists cost_benchmarks (
  id uuid primary key default gen_random_uuid(),
  location_name text not null,
  country text,
  state text,
  region text,
  metro text,
  city text,
  level text not null check (level in ('country','state','region','metro','city')),
  source_name text not null,
  source_year int not null,
  average_cost numeric not null,
  average_guest_count int,
  cost_per_guest numeric,
  confidence_level text not null default 'medium',
  notes text,
  created_at timestamptz not null default now(),
  unique (source_name, source_year, location_name, level)
);

create table if not exists cost_estimate_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  location_text text,
  guest_count int,
  target_budget numeric,
  wedding_type text,
  budget_confidence budget_confidence,
  benchmark_id uuid references cost_benchmarks(id) on delete set null,
  input_json jsonb not null default '{}',
  output_json jsonb not null default '{}',
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists cost_estimate_runs_workspace_idx on cost_estimate_runs (workspace_id, created_at desc);

create table if not exists payment_milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  budget_item_id uuid references budget_items(id) on delete set null,
  vendor_id uuid references vendors(id) on delete set null,
  contract_document_id uuid references documents(id) on delete set null,
  title text not null,
  amount numeric,
  due_date date,
  reminder_date date,
  milestone_kind text not null default 'payment',
  status money_map_payment_status not null default 'planned',
  responsible_name text,
  notes text,
  created_by uuid references users(id),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists payment_milestones_workspace_idx on payment_milestones (workspace_id, due_date);

create table if not exists budget_contributors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  contributor_name text not null,
  relationship text,
  visibility text not null default 'private',
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists budget_contributors_workspace_idx on budget_contributors (workspace_id);

create table if not exists budget_contributions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  contributor_id uuid references budget_contributors(id) on delete set null,
  contributor_name text not null,
  promised_amount numeric,
  received_amount numeric,
  intended_for text,
  visibility text not null default 'private',
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists budget_contributions_workspace_idx on budget_contributions (workspace_id);

create table if not exists budget_scenarios (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  wedding_type text,
  guest_count int,
  target_budget numeric,
  projected_total numeric,
  budget_fit text,
  tradeoff_notes text,
  is_primary boolean not null default false,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists budget_scenarios_workspace_idx on budget_scenarios (workspace_id, created_at desc);

create table if not exists budget_scenario_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  scenario_id uuid not null references budget_scenarios(id) on delete cascade,
  category_name text not null,
  estimated_amount numeric,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists budget_scenario_items_scenario_idx on budget_scenario_items (scenario_id);

create table if not exists budget_alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  alert_type text not null,
  severity text not null default 'medium',
  title text not null,
  body text,
  status budget_alert_status not null default 'open',
  linked_entity_type text,
  linked_entity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists budget_alerts_workspace_idx on budget_alerts (workspace_id, status);

create table if not exists financial_activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_id uuid references users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);
create index if not exists financial_activity_logs_workspace_idx on financial_activity_logs (workspace_id, created_at desc);

insert into cost_benchmarks (location_name, country, state, city, level, source_name, source_year, average_cost, average_guest_count, cost_per_guest, confidence_level, notes)
values
  ('United States','US',null,null,'country','The Knot Real Weddings Study',2026,34200,117,292,'medium','National planning benchmark from the Money Map brief.'),
  ('Indiana','US','Indiana',null,'state','The Knot Real Weddings Study',2026,24000,117,205,'medium','State benchmark from the Money Map brief.'),
  ('Indianapolis','US','Indiana','Indianapolis','city','The Knot Real Weddings Study',2026,25000,117,214,'medium','City benchmark from the Money Map brief.'),
  ('North Carolina','US','North Carolina',null,'state','The Knot Real Weddings Study',2026,29000,117,248,'medium','State benchmark from the Money Map brief.'),
  ('Charlotte','US','North Carolina','Charlotte','city','The Knot Real Weddings Study',2026,32000,117,274,'medium','City benchmark from the Money Map brief.'),
  ('New Jersey','US','New Jersey',null,'state','The Knot Real Weddings Study',2026,57000,117,487,'medium','State benchmark from the Money Map brief.'),
  ('New York','US','New York',null,'state','The Knot Real Weddings Study',2026,49000,117,419,'medium','State benchmark from the Money Map brief.'),
  ('New York City','US','New York','New York City','city','The Knot Real Weddings Study',2026,88000,117,752,'medium','Major city benchmark from the Money Map brief.'),
  ('Chicago','US','Illinois','Chicago','city','The Knot Real Weddings Study',2026,54000,117,462,'medium','Major city benchmark from the Money Map brief.')
on conflict (source_name, source_year, location_name, level) do nothing;

alter table cost_benchmarks enable row level security;
drop policy if exists cost_benchmarks_read on cost_benchmarks;
create policy cost_benchmarks_read on cost_benchmarks for select using (true);

do $$
declare t text;
begin
  foreach t in array array[
    'cost_estimate_runs','payment_milestones','budget_contributors','budget_contributions',
    'budget_scenarios','budget_scenario_items','budget_alerts','financial_activity_logs'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists ws_member_all on %I;', t);
    execute format('create policy ws_member_all on %I using (workspace_id in (select auth_workspace_ids())) with check (workspace_id in (select auth_workspace_ids()));', t);
  end loop;
end $$;
