create table if not exists public.candidate_extraction_metrics (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  employer_job_id uuid not null references public.employer_jobs(id) on delete cascade,
  candidate_intake_id uuid references public.candidate_intake_records(id) on delete set null,
  validation_failure_count integer not null default 0,
  normalization_repair_count integer not null default 0,
  extraction_succeeded boolean not null default false,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.candidate_extraction_metrics enable row level security;

create policy "Employers can read their own candidate extraction metrics"
  on public.candidate_extraction_metrics
  for select
  using (auth.uid() = employer_user_id);

create policy "Employers can create their own candidate extraction metrics"
  on public.candidate_extraction_metrics
  for insert
  with check (auth.uid() = employer_user_id);

create policy "Employers can update their own candidate extraction metrics"
  on public.candidate_extraction_metrics
  for update
  using (auth.uid() = employer_user_id)
  with check (auth.uid() = employer_user_id);

create index if not exists candidate_extraction_metrics_job_created_idx
  on public.candidate_extraction_metrics (employer_user_id, employer_job_id, created_at desc);

create or replace function public.set_candidate_extraction_metrics_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_candidate_extraction_metrics_updated_at on public.candidate_extraction_metrics;

create trigger set_candidate_extraction_metrics_updated_at
before update on public.candidate_extraction_metrics
for each row
execute function public.set_candidate_extraction_metrics_updated_at();
