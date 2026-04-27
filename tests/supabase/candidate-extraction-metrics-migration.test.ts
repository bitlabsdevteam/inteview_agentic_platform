import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260427000001_candidate_extraction_metrics.sql"
);

describe("candidate extraction metrics migration", () => {
  it("creates owner/job-scoped extraction metrics storage with quality counters", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.candidate_extraction_metrics");
    expect(sql).toContain("employer_user_id uuid not null references auth.users(id) on delete cascade");
    expect(sql).toContain("employer_job_id uuid not null references public.employer_jobs(id) on delete cascade");
    expect(sql).toContain("candidate_intake_id uuid references public.candidate_intake_records(id) on delete set null");
    expect(sql).toContain("validation_failure_count integer not null default 0");
    expect(sql).toContain("normalization_repair_count integer not null default 0");
    expect(sql).toContain("extraction_succeeded boolean not null default false");
    expect(sql).toContain("failure_reason text");
  });

  it("enables RLS and owner-scoped read/write policies", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("alter table public.candidate_extraction_metrics enable row level security;");
    expect(sql).toContain('create policy "Employers can read their own candidate extraction metrics"');
    expect(sql).toContain('create policy "Employers can create their own candidate extraction metrics"');
    expect(sql).toContain('create policy "Employers can update their own candidate extraction metrics"');
    expect(sql).toContain("using (auth.uid() = employer_user_id)");
    expect(sql).toContain("with check (auth.uid() = employer_user_id)");
    expect(sql).toContain("candidate_extraction_metrics_job_created_idx");
  });
});
