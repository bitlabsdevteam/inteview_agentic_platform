import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260427000000_candidate_scoring.sql"
);

describe("candidate scoring migration", () => {
  it("adds requirement-fit dimension scores, aggregate score, score version, and evidence snippets", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("alter table public.candidate_profiles");
    expect(sql).toContain("add column if not exists requirement_fit_scores jsonb");
    expect(sql).toContain("add column if not exists aggregate_score double precision");
    expect(sql).toContain("add column if not exists score_version text");
    expect(sql).toContain("add column if not exists score_evidence_snippets jsonb");
  });

  it("keeps score fields scoped to employer/job query paths", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("candidate_profiles_employer_job_score_idx");
    expect(sql).toContain("on public.candidate_profiles (employer_user_id, employer_job_id, aggregate_score desc)");
  });
});
