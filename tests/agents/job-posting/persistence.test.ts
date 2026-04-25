import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildAgentJobSessionInsert,
  buildAgentTraceInsert,
  createAgentJobSession,
  listAgentJobSessions,
  type AgentJobSessionInput,
  type AgentTraceInput
} from "@/lib/agents/job-posting/persistence";

const sessionInput: AgentJobSessionInput = {
  employerUserId: "employer-user-1",
  employerJobId: "job-1",
  status: "draft_created",
  latestEmployerPrompt: "We need a senior AI product engineer.",
  generatedFields: {
    title: "Senior Full-Stack AI Product Engineer",
    department: "Engineering"
  },
  assumptions: ["Department inferred as Engineering."],
  missingCriticalFields: ["compensationBand"],
  followUpQuestions: ["What compensation range should appear on the posting?"]
};

const traceInput: AgentTraceInput = {
  sessionId: "session-1",
  employerUserId: "employer-user-1",
  provider: "openai",
  providerResponseId: "resp_123",
  model: "gpt-5.5",
  promptKey: "job_creator_agent_system_prompt",
  promptVersion: "v1",
  promptChecksum: "abc123",
  outputChecksum: "def456",
  status: "succeeded"
};

function createInsertClient(returned: unknown) {
  const calls: Array<{ table: string; values: unknown; columns?: string }> = [];
  const client = {
    from(table: string) {
      return {
        insert(values: unknown) {
          calls.push({ table, values });

          return {
            select(columns: string) {
              calls[calls.length - 1].columns = columns;

              return {
                single: async () => ({
                  data: returned,
                  error: null
                })
              };
            }
          };
        }
      };
    }
  };

  return { client, calls };
}

describe("job posting agent persistence", () => {
  it("builds owner-scoped session inserts without prompt bodies or secrets", () => {
    expect(buildAgentJobSessionInsert(sessionInput)).toEqual({
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      status: "draft_created",
      latest_employer_prompt: "We need a senior AI product engineer.",
      generated_fields: {
        title: "Senior Full-Stack AI Product Engineer",
        department: "Engineering"
      },
      assumptions: ["Department inferred as Engineering."],
      missing_critical_fields: ["compensationBand"],
      follow_up_questions: ["What compensation range should appear on the posting?"]
    });
  });

  it("builds trace inserts with model and prompt audit metadata but no full prompt body", () => {
    expect(buildAgentTraceInsert(traceInput)).toEqual({
      session_id: "session-1",
      employer_user_id: "employer-user-1",
      provider: "openai",
      provider_response_id: "resp_123",
      model: "gpt-5.5",
      prompt_key: "job_creator_agent_system_prompt",
      prompt_version: "v1",
      prompt_checksum: "abc123",
      output_checksum: "def456",
      status: "succeeded",
      error_message: null
    });
  });

  it("creates an employer-owned agent job session", async () => {
    const record = {
      id: "session-1",
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      status: "draft_created",
      latest_employer_prompt: "We need a senior AI product engineer.",
      generated_fields: {},
      assumptions: [],
      missing_critical_fields: [],
      follow_up_questions: [],
      created_at: "2026-04-25T00:00:00.000Z",
      updated_at: "2026-04-25T00:00:00.000Z"
    };
    const { client, calls } = createInsertClient(record);

    await expect(createAgentJobSession(client, sessionInput)).resolves.toEqual(record);
    expect(calls).toEqual([
      {
        table: "agent_job_sessions",
        values: buildAgentJobSessionInsert(sessionInput),
        columns: "*"
      }
    ]);
  });

  it("lists only sessions for the supplied employer owner", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      from(table: string) {
        calls.push({ table });

        return {
          select(columns: string) {
            calls.push({ select: columns });

            return {
              eq(column: string, value: string) {
                calls.push({ eq: [column, value] });

                return {
                  order(orderColumn: string, options: { ascending: boolean }) {
                    calls.push({ order: [orderColumn, options] });

                    return Promise.resolve({
                      data: [],
                      error: null
                    });
                  }
                };
              }
            };
          }
        };
      }
    };

    await expect(listAgentJobSessions(client, "employer-user-1")).resolves.toEqual([]);
    expect(calls).toEqual([
      { table: "agent_job_sessions" },
      { select: "*" },
      { eq: ["employer_user_id", "employer-user-1"] },
      { order: ["updated_at", { ascending: false }] }
    ]);
  });

  it("defines owner-scoped tables, indexes, traces, and RLS policies in the migration", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260425000001_job_posting_agent.sql"),
      "utf8"
    );

    expect(sql).toContain("create table if not exists public.agent_job_sessions");
    expect(sql).toContain("create table if not exists public.agent_job_messages");
    expect(sql).toContain("create table if not exists public.agent_execution_traces");
    expect(sql).toContain("employer_user_id uuid not null references auth.users(id) on delete cascade");
    expect(sql).toContain("alter table public.agent_job_sessions enable row level security");
    expect(sql).toContain("alter table public.agent_job_messages enable row level security");
    expect(sql).toContain("alter table public.agent_execution_traces enable row level security");
    expect(sql).toContain("auth.uid() = employer_user_id");
    expect(sql).toContain("provider_response_id text");
    expect(sql).toContain("prompt_checksum text not null");
    expect(sql).toContain("output_checksum text");
    expect(sql).toContain("agent_job_sessions_employer_updated_idx");
  });
});
