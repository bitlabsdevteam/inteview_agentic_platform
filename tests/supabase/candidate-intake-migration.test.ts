import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260426000002_candidate_intake_profiles.sql'
);

describe('candidate intake/profile migration', () => {
  it('creates owner-scoped candidate intake/profile tables linked to employer jobs', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('create table if not exists public.candidate_intake_records');
    expect(sql).toContain('create table if not exists public.candidate_profiles');
    expect(sql).toContain('employer_job_id uuid not null references public.employer_jobs(id) on delete cascade');
    expect(sql).toContain('candidate_intake_id uuid not null unique references public.candidate_intake_records(id) on delete cascade');
  });

  it('enables RLS and enforces auth.uid() owner checks for read/write policies', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('alter table public.candidate_intake_records enable row level security;');
    expect(sql).toContain('alter table public.candidate_profiles enable row level security;');

    const requiredPolicySnippets = [
      'create policy "Employers can read their own candidate intake records"',
      'create policy "Employers can create their own candidate intake records"',
      'create policy "Employers can update their own candidate intake records"',
      'create policy "Employers can read their own candidate profiles"',
      'create policy "Employers can create their own candidate profiles"',
      'create policy "Employers can update their own candidate profiles"',
      'using (auth.uid() = employer_user_id)',
      'with check (auth.uid() = employer_user_id)',
    ];

    for (const snippet of requiredPolicySnippets) {
      expect(sql).toContain(snippet);
    }
  });
});
