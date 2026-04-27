create table if not exists public.employer_job_quality_checks (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  employer_job_id uuid not null references public.employer_jobs(id) on delete cascade,
  session_id uuid not null references public.agent_job_sessions(id) on delete cascade,
  check_type text not null check (
    check_type in (
      'completeness',
      'readability',
      'discriminatory_phrasing',
      'requirement_contradiction'
    )
  ),
  status text not null check (status in ('pass', 'warn', 'fail')),
  issues jsonb not null default '[]'::jsonb,
  suggested_rewrite text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.employer_job_quality_checks enable row level security;

create policy "Employers can read their own job quality checks"
  on public.employer_job_quality_checks
  for select
  using (auth.uid() = employer_user_id);

create policy "Employers can create their own job quality checks"
  on public.employer_job_quality_checks
  for insert
  with check (auth.uid() = employer_user_id);

create policy "Employers can update their own job quality checks"
  on public.employer_job_quality_checks
  for update
  using (auth.uid() = employer_user_id)
  with check (auth.uid() = employer_user_id);

create index if not exists employer_job_quality_checks_scope_updated_idx
  on public.employer_job_quality_checks (employer_user_id, employer_job_id, updated_at desc);

create index if not exists employer_job_quality_checks_session_check_type_idx
  on public.employer_job_quality_checks (session_id, check_type, created_at desc);

create or replace function public.set_employer_job_quality_checks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_employer_job_quality_checks_updated_at on public.employer_job_quality_checks;

create trigger set_employer_job_quality_checks_updated_at
before update on public.employer_job_quality_checks
for each row
execute function public.set_employer_job_quality_checks_updated_at();
