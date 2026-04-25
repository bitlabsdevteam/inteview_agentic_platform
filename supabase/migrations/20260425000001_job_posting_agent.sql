create table if not exists public.agent_job_sessions (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  employer_job_id uuid references public.employer_jobs(id) on delete set null,
  status text not null check (status in ('collecting_context', 'needs_follow_up', 'draft_created', 'failed')),
  latest_employer_prompt text not null,
  generated_fields jsonb not null default '{}'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  missing_critical_fields jsonb not null default '[]'::jsonb,
  follow_up_questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_job_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_job_sessions(id) on delete cascade,
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('employer', 'agent', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_execution_traces (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_job_sessions(id) on delete cascade,
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai')),
  provider_response_id text,
  model text not null,
  prompt_key text not null,
  prompt_version text not null,
  prompt_checksum text not null,
  output_checksum text,
  status text not null check (status in ('succeeded', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.agent_job_sessions enable row level security;
alter table public.agent_job_messages enable row level security;
alter table public.agent_execution_traces enable row level security;

create policy "Employers can read their own agent job sessions"
  on public.agent_job_sessions
  for select
  using (auth.uid() = employer_user_id);

create policy "Employers can create their own agent job sessions"
  on public.agent_job_sessions
  for insert
  with check (auth.uid() = employer_user_id);

create policy "Employers can update their own agent job sessions"
  on public.agent_job_sessions
  for update
  using (auth.uid() = employer_user_id)
  with check (auth.uid() = employer_user_id);

create policy "Employers can read their own agent job messages"
  on public.agent_job_messages
  for select
  using (auth.uid() = employer_user_id);

create policy "Employers can create their own agent job messages"
  on public.agent_job_messages
  for insert
  with check (auth.uid() = employer_user_id);

create policy "Employers can read their own agent execution traces"
  on public.agent_execution_traces
  for select
  using (auth.uid() = employer_user_id);

create policy "Employers can create their own agent execution traces"
  on public.agent_execution_traces
  for insert
  with check (auth.uid() = employer_user_id);

create index if not exists agent_job_sessions_employer_updated_idx
  on public.agent_job_sessions (employer_user_id, updated_at desc);

create index if not exists agent_job_messages_session_created_idx
  on public.agent_job_messages (session_id, created_at asc);

create index if not exists agent_execution_traces_session_created_idx
  on public.agent_execution_traces (session_id, created_at desc);

create or replace function public.set_agent_job_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_agent_job_sessions_updated_at on public.agent_job_sessions;

create trigger set_agent_job_sessions_updated_at
before update on public.agent_job_sessions
for each row
execute function public.set_agent_job_sessions_updated_at();
