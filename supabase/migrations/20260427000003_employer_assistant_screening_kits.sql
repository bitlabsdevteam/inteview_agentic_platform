create table if not exists public.employer_assistant_screening_kits (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null unique references public.employer_assistant_recommendations(id) on delete cascade,
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  employer_job_id uuid not null references public.employer_jobs(id) on delete cascade,
  candidate_profile_id uuid not null references public.candidate_profiles(id) on delete cascade,
  title text not null,
  objective text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employer_assistant_screening_questions (
  id uuid primary key default gen_random_uuid(),
  screening_kit_id uuid not null references public.employer_assistant_screening_kits(id) on delete cascade,
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  employer_job_id uuid not null references public.employer_jobs(id) on delete cascade,
  candidate_profile_id uuid not null references public.candidate_profiles(id) on delete cascade,
  question_order integer not null check (question_order > 0),
  question_text text not null,
  rubric_dimension text not null,
  rubric_guidance text not null,
  is_uncertainty_probe boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (screening_kit_id, question_order)
);

alter table public.employer_assistant_screening_kits enable row level security;
alter table public.employer_assistant_screening_questions enable row level security;

create policy "Employers can read their own assistant screening kits"
  on public.employer_assistant_screening_kits
  for select
  using (auth.uid() = employer_user_id);

create policy "Employers can create their own assistant screening kits"
  on public.employer_assistant_screening_kits
  for insert
  with check (auth.uid() = employer_user_id);

create policy "Employers can update their own assistant screening kits"
  on public.employer_assistant_screening_kits
  for update
  using (auth.uid() = employer_user_id)
  with check (auth.uid() = employer_user_id);

create policy "Employers can read their own assistant screening questions"
  on public.employer_assistant_screening_questions
  for select
  using (auth.uid() = employer_user_id);

create policy "Employers can create their own assistant screening questions"
  on public.employer_assistant_screening_questions
  for insert
  with check (auth.uid() = employer_user_id);

create policy "Employers can update their own assistant screening questions"
  on public.employer_assistant_screening_questions
  for update
  using (auth.uid() = employer_user_id)
  with check (auth.uid() = employer_user_id);

create index if not exists employer_assistant_screening_kits_scope_created_idx
  on public.employer_assistant_screening_kits (
    employer_user_id,
    employer_job_id,
    candidate_profile_id,
    created_at desc
  );

create index if not exists employer_assistant_screening_questions_kit_order_idx
  on public.employer_assistant_screening_questions (screening_kit_id, question_order);

create or replace function public.set_employer_assistant_screening_kits_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_employer_assistant_screening_kits_updated_at on public.employer_assistant_screening_kits;

create trigger set_employer_assistant_screening_kits_updated_at
before update on public.employer_assistant_screening_kits
for each row
execute function public.set_employer_assistant_screening_kits_updated_at();

create or replace function public.set_employer_assistant_screening_questions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_employer_assistant_screening_questions_updated_at on public.employer_assistant_screening_questions;

create trigger set_employer_assistant_screening_questions_updated_at
before update on public.employer_assistant_screening_questions
for each row
execute function public.set_employer_assistant_screening_questions_updated_at();
