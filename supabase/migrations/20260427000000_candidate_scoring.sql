alter table public.candidate_profiles
  add column if not exists requirement_fit_scores jsonb not null default '{}'::jsonb,
  add column if not exists aggregate_score double precision,
  add column if not exists score_version text,
  add column if not exists score_evidence_snippets jsonb not null default '[]'::jsonb;

alter table public.candidate_profiles
  drop constraint if exists candidate_profiles_aggregate_score_range;

alter table public.candidate_profiles
  add constraint candidate_profiles_aggregate_score_range
  check (aggregate_score is null or (aggregate_score >= 0 and aggregate_score <= 1));

create index if not exists candidate_profiles_employer_job_score_idx
  on public.candidate_profiles (employer_user_id, employer_job_id, aggregate_score desc);
