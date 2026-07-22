-- 0019_weaver_maturity.sql — Phase 2 Weaver maturity: citations, states, audit.
--
-- Makes every engine insight explainable and reproducible. All additive + idempotent
-- (`add column if not exists`); these tables already carry RLS from 0001, so no policy work.

-- Citations + provenance on the two insight tables.
alter table planning_recommendations
  add column if not exists citations_json jsonb not null default '[]'::jsonb,  -- [{type, id, label}]
  add column if not exists source text not null default 'ai',                  -- 'deterministic' | 'ai'
  add column if not exists confidence text,                                    -- 'low' | 'med' | 'high'
  add column if not exists acted_by uuid references users(id),
  add column if not exists acted_at timestamptz;

alter table planning_risks
  add column if not exists citations_json jsonb not null default '[]'::jsonb,
  add column if not exists source text not null default 'ai';

-- Run-level audit: what produced this batch of insights (reproducibility).
alter table planning_engine_runs
  add column if not exists model text,
  add column if not exists prompt_version text,
  add column if not exists input_hash text,          -- hash of the context handed to the model
  add column if not exists output_json jsonb,         -- the raw structured model output
  add column if not exists usage_json jsonb,          -- token usage / timing
  add column if not exists citation_coverage numeric; -- share of AI insights carrying >=1 citation (0..1)

comment on column planning_recommendations.citations_json is
  'Phase 2: entities/facts grounding this insight — [{type,id,label}]. AI insights with none are dropped or down-ranked in run.ts.';
comment on column planning_engine_runs.citation_coverage is
  'Phase 2: fraction of AI insights in this run that carry at least one citation (0..1).';
