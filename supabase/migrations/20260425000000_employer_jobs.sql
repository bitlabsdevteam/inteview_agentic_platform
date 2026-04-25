create table if not exists public.employer_jobs (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  department text not null,
  level text not null,
  location text not null,
  compensation_band text not null,
  status text not null check (status in ('draft', 'needs_review', 'published', 'closed')),
  brief jsonb not null,
  draft_description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.employer_jobs enable row level security;

create policy "Employers can read their own jobs"
  on public.employer_jobs
  for select
  using (auth.uid() = employer_user_id);

create policy "Employers can create their own jobs"
  on public.employer_jobs
  for insert
  with check (auth.uid() = employer_user_id);

create policy "Employers can update their own jobs"
  on public.employer_jobs
  for update
  using (auth.uid() = employer_user_id)
  with check (auth.uid() = employer_user_id);

create index if not exists employer_jobs_employer_updated_idx
  on public.employer_jobs (employer_user_id, updated_at desc);

create or replace function public.set_employer_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_employer_jobs_updated_at on public.employer_jobs;

create trigger set_employer_jobs_updated_at
before update on public.employer_jobs
for each row
execute function public.set_employer_jobs_updated_at();
