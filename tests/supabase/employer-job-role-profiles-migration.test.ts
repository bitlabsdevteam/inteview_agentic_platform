import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260429000000_employer_job_role_profiles.sql"
);

describe("employer job role profiles migration", () => {
  it("creates employer/job/session scoped role profile table with typed JSON artifacts", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.employer_job_role_profiles");
    expect(sql).toContain("employer_user_id uuid not null references auth.users(id) on delete cascade");
    expect(sql).toContain("employer_job_id uuid not null references public.employer_jobs(id) on delete cascade");
    expect(sql).toContain("session_id uuid not null references public.agent_job_sessions(id) on delete cascade");
    expect(sql).toContain("normalized_profile jsonb not null default '{}'::jsonb");
    expect(sql).toContain("unresolved_constraints jsonb not null default '[]'::jsonb");
    expect(sql).toContain("conflicts jsonb not null default '[]'::jsonb");
    expect(sql).toContain("confidence jsonb not null default '{}'::jsonb");
    expect(sql).toContain("unique (session_id)");
  });

  it("enables RLS and owner-scoped read/create/update policies", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("alter table public.employer_job_role_profiles enable row level security;");
    expect(sql).toContain('create policy "Employers can read their own job role profiles"');
    expect(sql).toContain('create policy "Employers can create their own job role profiles"');
    expect(sql).toContain('create policy "Employers can update their own job role profiles"');
    expect(sql).toContain("auth.uid() = employer_user_id");
  });

  it("defines scope index and updated_at trigger", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("employer_job_role_profiles_scope_updated_idx");
    expect(sql).toContain("set_employer_job_role_profiles_updated_at");
  });
});
