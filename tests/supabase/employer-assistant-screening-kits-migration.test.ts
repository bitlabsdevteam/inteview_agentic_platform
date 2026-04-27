import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260427000003_employer_assistant_screening_kits.sql"
);

describe("employer assistant screening kits migration", () => {
  it("creates screening kit storage owned by assistant recommendations", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.employer_assistant_screening_kits");
    expect(sql).toContain(
      "recommendation_id uuid not null unique references public.employer_assistant_recommendations(id) on delete cascade"
    );
    expect(sql).toContain("employer_user_id uuid not null references auth.users(id) on delete cascade");
    expect(sql).toContain("employer_job_id uuid not null references public.employer_jobs(id) on delete cascade");
    expect(sql).toContain("candidate_profile_id uuid not null references public.candidate_profiles(id) on delete cascade");
    expect(sql).toContain("title text not null");
    expect(sql).toContain("objective text not null");
  });

  it("creates screening question records with rubric dimensions and uncertainty flags", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.employer_assistant_screening_questions");
    expect(sql).toContain(
      "screening_kit_id uuid not null references public.employer_assistant_screening_kits(id) on delete cascade"
    );
    expect(sql).toContain("question_order integer not null check (question_order > 0)");
    expect(sql).toContain("question_text text not null");
    expect(sql).toContain("rubric_dimension text not null");
    expect(sql).toContain("rubric_guidance text not null");
    expect(sql).toContain("is_uncertainty_probe boolean not null default false");
  });

  it("enables row-level security and owner-scoped policies with query indexes", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("alter table public.employer_assistant_screening_kits enable row level security;");
    expect(sql).toContain("alter table public.employer_assistant_screening_questions enable row level security;");
    expect(sql).toContain('create policy "Employers can read their own assistant screening kits"');
    expect(sql).toContain('create policy "Employers can create their own assistant screening kits"');
    expect(sql).toContain('create policy "Employers can update their own assistant screening kits"');
    expect(sql).toContain('create policy "Employers can read their own assistant screening questions"');
    expect(sql).toContain('create policy "Employers can create their own assistant screening questions"');
    expect(sql).toContain('create policy "Employers can update their own assistant screening questions"');
    expect(sql).toContain("using (auth.uid() = employer_user_id)");
    expect(sql).toContain("with check (auth.uid() = employer_user_id)");
    expect(sql).toContain("employer_assistant_screening_kits_scope_created_idx");
    expect(sql).toContain("employer_assistant_screening_questions_kit_order_idx");
  });
});
