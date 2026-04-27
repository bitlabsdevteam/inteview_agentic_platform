create table if not exists public.employer_job_interview_blueprints (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  employer_job_id uuid not null references public.employer_jobs(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft')),
  title text not null,
  objective text not null,
  response_mode text not null check (response_mode in ('text', 'voice_agent')),
  tone_profile text not null check (tone_profile in ('direct', 'supportive', 'neutral', 'high-precision')),
  parsing_strategy text not null check (parsing_strategy in ('keyword_match', 'evidence_extraction', 'rubric_scoring', 'hybrid')),
  benchmark_summary text not null default '',
  approval_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employer_job_id)
);

create table if not exists public.employer_job_interview_questions (
  id uuid primary key default gen_random_uuid(),
  interview_blueprint_id uuid not null references public.employer_job_interview_blueprints(id) on delete cascade,
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  employer_job_id uuid not null references public.employer_jobs(id) on delete cascade,
  stage_label text not null,
  stage_order integer not null check (stage_order > 0),
  question_order integer not null check (question_order > 0),
  question_text text not null,
  intent text not null,
  evaluation_focus text not null,
  strong_signal text not null,
  failure_signal text not null,
  follow_up_prompt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (interview_blueprint_id, stage_order, question_order)
);

alter table public.employer_job_interview_blueprints enable row level security;
alter table public.employer_job_interview_questions enable row level security;

create policy "Employers can read their own interview blueprints"
  on public.employer_job_interview_blueprints
  for select
  using (auth.uid() = employer_user_id);

create policy "Employers can create their own interview blueprints"
  on public.employer_job_interview_blueprints
  for insert
  with check (auth.uid() = employer_user_id);

create policy "Employers can update their own interview blueprints"
  on public.employer_job_interview_blueprints
  for update
  using (auth.uid() = employer_user_id)
  with check (auth.uid() = employer_user_id);

create policy "Employers can read their own interview questions"
  on public.employer_job_interview_questions
  for select
  using (auth.uid() = employer_user_id);

create policy "Employers can create their own interview questions"
  on public.employer_job_interview_questions
  for insert
  with check (auth.uid() = employer_user_id);

create policy "Employers can update their own interview questions"
  on public.employer_job_interview_questions
  for update
  using (auth.uid() = employer_user_id)
  with check (auth.uid() = employer_user_id);

create index if not exists employer_job_interview_blueprints_scope_updated_idx
  on public.employer_job_interview_blueprints (employer_user_id, employer_job_id, updated_at desc);

create index if not exists employer_job_interview_questions_blueprint_stage_order_idx
  on public.employer_job_interview_questions (interview_blueprint_id, stage_order, question_order);

create or replace function public.set_employer_job_interview_blueprints_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_employer_job_interview_blueprints_updated_at on public.employer_job_interview_blueprints;

create trigger set_employer_job_interview_blueprints_updated_at
before update on public.employer_job_interview_blueprints
for each row
execute function public.set_employer_job_interview_blueprints_updated_at();

create or replace function public.set_employer_job_interview_questions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_employer_job_interview_questions_updated_at on public.employer_job_interview_questions;

create trigger set_employer_job_interview_questions_updated_at
before update on public.employer_job_interview_questions
for each row
execute function public.set_employer_job_interview_questions_updated_at();
