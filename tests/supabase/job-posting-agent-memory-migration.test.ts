import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260428000000_job_posting_agent_memory.sql"
);

describe("job posting agent memory migration", () => {
  it("creates session-scoped memory summary and memory item tables", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.agent_memory_summaries");
    expect(sql).toContain("create table if not exists public.agent_memory_items");
    expect(sql).toContain("summary_text text not null default ''");
    expect(sql).toContain("memory_type text not null check");
    expect(sql).toContain("source_message_ids jsonb not null default '[]'::jsonb");
    expect(sql).toContain("importance smallint not null default 3 check (importance between 1 and 5)");
    expect(sql).toContain("unique (session_id)");
  });

  it("enforces owner-scoped RLS for read, create, and update", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("alter table public.agent_memory_summaries enable row level security;");
    expect(sql).toContain("alter table public.agent_memory_items enable row level security;");
    expect(sql).toContain('create policy "Employers can read their own agent memory summaries"');
    expect(sql).toContain('create policy "Employers can create their own agent memory summaries"');
    expect(sql).toContain('create policy "Employers can update their own agent memory summaries"');
    expect(sql).toContain('create policy "Employers can read their own agent memory items"');
    expect(sql).toContain('create policy "Employers can create their own agent memory items"');
    expect(sql).toContain('create policy "Employers can update their own agent memory items"');
    expect(sql).toContain("auth.uid() = employer_user_id");
  });

  it("defines query indexes and updated_at triggers for summary and item tables", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("agent_memory_summaries_scope_updated_idx");
    expect(sql).toContain("agent_memory_items_scope_importance_created_idx");
    expect(sql).toContain("agent_memory_items_unsuperseded_idx");
    expect(sql).toContain("set_agent_memory_summaries_updated_at");
    expect(sql).toContain("set_agent_memory_items_updated_at");
  });
});
