create table if not exists public.employer_job_role_profiles (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  employer_job_id uuid not null references public.employer_jobs(id) on delete cascade,
  session_id uuid not null references public.agent_job_sessions(id) on delete cascade,
  normalized_profile jsonb not null default '{}'::jsonb,
  unresolved_constraints jsonb not null default '[]'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  confidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id)
);

alter table public.employer_job_role_profiles enable row level security;

create policy "Employers can read their own job role profiles"
  on public.employer_job_role_profiles
  for select
  using (auth.uid() = employer_user_id);

create policy "Employers can create their own job role profiles"
  on public.employer_job_role_profiles
  for insert
  with check (auth.uid() = employer_user_id);

create policy "Employers can update their own job role profiles"
  on public.employer_job_role_profiles
  for update
  using (auth.uid() = employer_user_id)
  with check (auth.uid() = employer_user_id);

create index if not exists employer_job_role_profiles_scope_updated_idx
  on public.employer_job_role_profiles (employer_user_id, employer_job_id, updated_at desc);

create or replace function public.set_employer_job_role_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_employer_job_role_profiles_updated_at on public.employer_job_role_profiles;

create trigger set_employer_job_role_profiles_updated_at
before update on public.employer_job_role_profiles
for each row
execute function public.set_employer_job_role_profiles_updated_at();
