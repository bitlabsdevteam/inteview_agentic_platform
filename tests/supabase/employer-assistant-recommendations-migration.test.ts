import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260427000002_employer_assistant_recommendations.sql"
);

describe("employer assistant recommendations migration", () => {
  it("creates owner/job/candidate-scoped recommendation storage with action and rationale contracts", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.employer_assistant_recommendations");
    expect(sql).toContain("employer_user_id uuid not null references auth.users(id) on delete cascade");
    expect(sql).toContain("employer_job_id uuid not null references public.employer_jobs(id) on delete cascade");
    expect(sql).toContain("candidate_profile_id uuid not null references public.candidate_profiles(id) on delete cascade");
    expect(sql).toContain("action text not null");
    expect(sql).toContain(
      "check (action in ('screen_candidate', 'request_more_signal', 'review_candidate', 'improve_job_requirements'))"
    );
    expect(sql).toContain("rationale text not null");
    expect(sql).toContain("evidence_references jsonb not null default '[]'::jsonb");
    expect(sql).toContain("risk_flags jsonb not null default '[]'::jsonb");
  });

  it("stores prompt/model audit metadata without prompt-body storage", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("prompt_key text not null");
    expect(sql).toContain("prompt_version text not null");
    expect(sql).toContain("prompt_checksum text not null");
    expect(sql).toContain("provider text not null");
    expect(sql).toContain("model text");
    expect(sql).toContain("provider_response_id text");
    expect(sql).toContain("failure_reason text");
    expect(sql).not.toContain("prompt_body");
  });

  it("enables RLS and owner-scoped read/write policies with query indexes", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("alter table public.employer_assistant_recommendations enable row level security;");
    expect(sql).toContain('create policy "Employers can read their own assistant recommendations"');
    expect(sql).toContain('create policy "Employers can create their own assistant recommendations"');
    expect(sql).toContain('create policy "Employers can update their own assistant recommendations"');
    expect(sql).toContain("using (auth.uid() = employer_user_id)");
    expect(sql).toContain("with check (auth.uid() = employer_user_id)");
    expect(sql).toContain("employer_assistant_recommendations_scope_created_idx");
  });
});
