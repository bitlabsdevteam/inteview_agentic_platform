create table if not exists public.agent_memory_summaries (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  employer_job_id uuid not null references public.employer_jobs(id) on delete cascade,
  session_id uuid not null references public.agent_job_sessions(id) on delete cascade,
  summary_text text not null default '',
  unresolved_gaps jsonb not null default '[]'::jsonb,
  key_decisions jsonb not null default '[]'::jsonb,
  compacted_message_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id)
);

create table if not exists public.agent_memory_items (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  employer_job_id uuid not null references public.employer_jobs(id) on delete cascade,
  session_id uuid not null references public.agent_job_sessions(id) on delete cascade,
  memory_type text not null check (
    memory_type in (
      'constraint',
      'decision',
      'preference',
      'unresolved_gap',
      'summary_fragment',
      'publish_readiness'
    )
  ),
  content text not null,
  source_message_ids jsonb not null default '[]'::jsonb,
  importance smallint not null default 3 check (importance between 1 and 5),
  superseded_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agent_memory_summaries enable row level security;
alter table public.agent_memory_items enable row level security;

create policy "Employers can read their own agent memory summaries"
  on public.agent_memory_summaries
  for select
  using (auth.uid() = employer_user_id);

create policy "Employers can create their own agent memory summaries"
  on public.agent_memory_summaries
  for insert
  with check (auth.uid() = employer_user_id);

create policy "Employers can update their own agent memory summaries"
  on public.agent_memory_summaries
  for update
  using (auth.uid() = employer_user_id)
  with check (auth.uid() = employer_user_id);

create policy "Employers can read their own agent memory items"
  on public.agent_memory_items
  for select
  using (auth.uid() = employer_user_id);

create policy "Employers can create their own agent memory items"
  on public.agent_memory_items
  for insert
  with check (auth.uid() = employer_user_id);

create policy "Employers can update their own agent memory items"
  on public.agent_memory_items
  for update
  using (auth.uid() = employer_user_id)
  with check (auth.uid() = employer_user_id);

create index if not exists agent_memory_summaries_scope_updated_idx
  on public.agent_memory_summaries (employer_user_id, employer_job_id, updated_at desc);

create index if not exists agent_memory_items_scope_importance_created_idx
  on public.agent_memory_items (
    employer_user_id,
    employer_job_id,
    session_id,
    importance desc,
    created_at desc
  );

create index if not exists agent_memory_items_unsuperseded_idx
  on public.agent_memory_items (session_id, created_at desc)
  where superseded_at is null;

create or replace function public.set_agent_memory_summaries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_agent_memory_summaries_updated_at on public.agent_memory_summaries;

create trigger set_agent_memory_summaries_updated_at
before update on public.agent_memory_summaries
for each row
execute function public.set_agent_memory_summaries_updated_at();

create or replace function public.set_agent_memory_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_agent_memory_items_updated_at on public.agent_memory_items;

create trigger set_agent_memory_items_updated_at
before update on public.agent_memory_items
for each row
execute function public.set_agent_memory_items_updated_at();
