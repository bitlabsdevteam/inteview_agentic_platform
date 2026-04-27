create table if not exists public.employer_assistant_recommendations (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  employer_job_id uuid not null references public.employer_jobs(id) on delete cascade,
  candidate_profile_id uuid not null references public.candidate_profiles(id) on delete cascade,
  action text not null
    check (action in ('screen_candidate', 'request_more_signal', 'review_candidate', 'improve_job_requirements')),
  rationale text not null,
  evidence_references jsonb not null default '[]'::jsonb,
  risk_flags jsonb not null default '[]'::jsonb,
  prompt_key text not null,
  prompt_version text not null,
  prompt_checksum text not null,
  provider text not null,
  model text,
  provider_response_id text,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.employer_assistant_recommendations enable row level security;

create policy "Employers can read their own assistant recommendations"
  on public.employer_assistant_recommendations
  for select
  using (auth.uid() = employer_user_id);

create policy "Employers can create their own assistant recommendations"
  on public.employer_assistant_recommendations
  for insert
  with check (auth.uid() = employer_user_id);

create policy "Employers can update their own assistant recommendations"
  on public.employer_assistant_recommendations
  for update
  using (auth.uid() = employer_user_id)
  with check (auth.uid() = employer_user_id);

create index if not exists employer_assistant_recommendations_scope_created_idx
  on public.employer_assistant_recommendations (
    employer_user_id,
    employer_job_id,
    candidate_profile_id,
    created_at desc
  );

create or replace function public.set_employer_assistant_recommendations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_employer_assistant_recommendations_updated_at on public.employer_assistant_recommendations;

create trigger set_employer_assistant_recommendations_updated_at
before update on public.employer_assistant_recommendations
for each row
execute function public.set_employer_assistant_recommendations_updated_at();
