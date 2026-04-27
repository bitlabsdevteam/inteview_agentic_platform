import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260430000000_employer_job_interview_blueprints.sql"
);

describe("employer job interview blueprints migration", () => {
  it("creates employer/job scoped interview blueprint storage with typed workflow fields", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.employer_job_interview_blueprints");
    expect(sql).toContain("employer_user_id uuid not null references auth.users(id) on delete cascade");
    expect(sql).toContain("employer_job_id uuid not null references public.employer_jobs(id) on delete cascade");
    expect(sql).toContain("status text not null default 'draft'");
    expect(sql).toContain("title text not null");
    expect(sql).toContain("objective text not null");
    expect(sql).toContain("response_mode text not null check");
    expect(sql).toContain("tone_profile text not null check");
    expect(sql).toContain("parsing_strategy text not null check");
    expect(sql).toContain("benchmark_summary text not null default ''");
    expect(sql).toContain("approval_notes text not null default ''");
    expect(sql).toContain("unique (employer_job_id)");
  });

  it("creates ordered interview question storage linked to the blueprint", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.employer_job_interview_questions");
    expect(sql).toContain(
      "interview_blueprint_id uuid not null references public.employer_job_interview_blueprints(id) on delete cascade"
    );
    expect(sql).toContain("employer_user_id uuid not null references auth.users(id) on delete cascade");
    expect(sql).toContain("employer_job_id uuid not null references public.employer_jobs(id) on delete cascade");
    expect(sql).toContain("stage_label text not null");
    expect(sql).toContain("stage_order integer not null check (stage_order > 0)");
    expect(sql).toContain("question_order integer not null check (question_order > 0)");
    expect(sql).toContain("question_text text not null");
    expect(sql).toContain("intent text not null");
    expect(sql).toContain("evaluation_focus text not null");
    expect(sql).toContain("strong_signal text not null");
    expect(sql).toContain("failure_signal text not null");
    expect(sql).toContain("follow_up_prompt text not null");
    expect(sql).toContain("unique (interview_blueprint_id, stage_order, question_order)");
  });

  it("enables row-level security and owner-scoped policies for both tables", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("alter table public.employer_job_interview_blueprints enable row level security;");
    expect(sql).toContain("alter table public.employer_job_interview_questions enable row level security;");
    expect(sql).toContain('create policy "Employers can read their own interview blueprints"');
    expect(sql).toContain('create policy "Employers can create their own interview blueprints"');
    expect(sql).toContain('create policy "Employers can update their own interview blueprints"');
    expect(sql).toContain('create policy "Employers can read their own interview questions"');
    expect(sql).toContain('create policy "Employers can create their own interview questions"');
    expect(sql).toContain('create policy "Employers can update their own interview questions"');
    expect(sql).toContain("using (auth.uid() = employer_user_id)");
    expect(sql).toContain("with check (auth.uid() = employer_user_id)");
  });

  it("defines scoped indexes and updated_at triggers for blueprint and question queries", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("employer_job_interview_blueprints_scope_updated_idx");
    expect(sql).toContain("employer_job_interview_questions_blueprint_stage_order_idx");
    expect(sql).toContain("set_employer_job_interview_blueprints_updated_at");
    expect(sql).toContain("set_employer_job_interview_questions_updated_at");
  });
});
