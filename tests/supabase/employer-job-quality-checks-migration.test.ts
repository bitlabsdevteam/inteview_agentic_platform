import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260429000001_employer_job_quality_checks.sql"
);

describe("employer job quality checks migration", () => {
  it("creates employer/job/session scoped quality checks table with typed check fields", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.employer_job_quality_checks");
    expect(sql).toContain("employer_user_id uuid not null references auth.users(id) on delete cascade");
    expect(sql).toContain("employer_job_id uuid not null references public.employer_jobs(id) on delete cascade");
    expect(sql).toContain("session_id uuid not null references public.agent_job_sessions(id) on delete cascade");
    expect(sql).toContain("check_type text not null check");
    expect(sql).toContain("status text not null check");
    expect(sql).toContain("issues jsonb not null default '[]'::jsonb");
    expect(sql).toContain("suggested_rewrite text not null default ''");
    expect(sql).toContain("metadata jsonb not null default '{}'::jsonb");
  });

  it("enables RLS and owner-scoped read/create/update policies", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("alter table public.employer_job_quality_checks enable row level security;");
    expect(sql).toContain('create policy "Employers can read their own job quality checks"');
    expect(sql).toContain('create policy "Employers can create their own job quality checks"');
    expect(sql).toContain('create policy "Employers can update their own job quality checks"');
    expect(sql).toContain("auth.uid() = employer_user_id");
  });

  it("defines scoped query indexes and updated_at trigger", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("employer_job_quality_checks_scope_updated_idx");
    expect(sql).toContain("employer_job_quality_checks_session_check_type_idx");
    expect(sql).toContain("set_employer_job_quality_checks_updated_at");
  });
});
