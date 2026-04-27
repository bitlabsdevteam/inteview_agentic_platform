create table if not exists public.candidate_intake_records (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  employer_job_id uuid not null references public.employer_jobs(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  resume_storage_path text not null,
  resume_file_name text not null,
  resume_mime_type text not null,
  resume_file_size_bytes bigint not null check (resume_file_size_bytes > 0),
  source_text text,
  status text not null check (status in ('received', 'processing', 'profile_ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  candidate_intake_id uuid not null unique references public.candidate_intake_records(id) on delete cascade,
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  employer_job_id uuid not null references public.employer_jobs(id) on delete cascade,
  summary text not null default '',
  skills jsonb not null default '[]'::jsonb,
  work_experience jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  confidence jsonb not null default '{}'::jsonb,
  model_id text,
  provider_response_id text,
  prompt_checksum text,
  extraction_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.candidate_intake_records enable row level security;
alter table public.candidate_profiles enable row level security;

create policy "Employers can read their own candidate intake records"
  on public.candidate_intake_records
  for select
  using (auth.uid() = employer_user_id);

create policy "Employers can create their own candidate intake records"
  on public.candidate_intake_records
  for insert
  with check (auth.uid() = employer_user_id);

create policy "Employers can update their own candidate intake records"
  on public.candidate_intake_records
  for update
  using (auth.uid() = employer_user_id)
  with check (auth.uid() = employer_user_id);

create policy "Employers can delete their own candidate intake records"
  on public.candidate_intake_records
  for delete
  using (auth.uid() = employer_user_id);

create policy "Employers can read their own candidate profiles"
  on public.candidate_profiles
  for select
  using (auth.uid() = employer_user_id);

create policy "Employers can create their own candidate profiles"
  on public.candidate_profiles
  for insert
  with check (auth.uid() = employer_user_id);

create policy "Employers can update their own candidate profiles"
  on public.candidate_profiles
  for update
  using (auth.uid() = employer_user_id)
  with check (auth.uid() = employer_user_id);

create policy "Employers can delete their own candidate profiles"
  on public.candidate_profiles
  for delete
  using (auth.uid() = employer_user_id);

create index if not exists candidate_intake_records_job_created_idx
  on public.candidate_intake_records (employer_job_id, created_at desc);

create index if not exists candidate_intake_records_employer_created_idx
  on public.candidate_intake_records (employer_user_id, created_at desc);

create index if not exists candidate_profiles_intake_idx
  on public.candidate_profiles (candidate_intake_id);

create index if not exists candidate_profiles_job_created_idx
  on public.candidate_profiles (employer_job_id, created_at desc);

create or replace function public.set_candidate_intake_records_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_candidate_intake_records_updated_at on public.candidate_intake_records;

create trigger set_candidate_intake_records_updated_at
before update on public.candidate_intake_records
for each row
execute function public.set_candidate_intake_records_updated_at();

create or replace function public.set_candidate_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_candidate_profiles_updated_at on public.candidate_profiles;

create trigger set_candidate_profiles_updated_at
before update on public.candidate_profiles
for each row
execute function public.set_candidate_profiles_updated_at();
