import { describe, expect, it } from "vitest";

import {
  buildCompactSummaryFromOutput,
  deriveMemoryItemsFromOutput,
  getAgentMemorySummaryBySession,
  listActiveAgentMemoryItemsBySession,
  renderRetrievedMemoryForPrompt,
  retrieveScopedMemory
} from "@/lib/agents/job-posting/memory";
import type { JobPostingAgentOutput } from "@/lib/agents/job-posting/schema";

const output: JobPostingAgentOutput = {
  title: { value: "Senior AI Product Engineer", source: "user_provided", confidence: 1 },
  department: { value: "Engineering", source: "inferred", confidence: 0.9 },
  level: { value: "Senior", source: "inferred", confidence: 0.9 },
  location: { value: "Remote US", source: "user_provided", confidence: 1 },
  employmentType: { value: "Full-time", source: "defaulted", confidence: 0.8 },
  compensationBand: { value: "$180k-$220k", source: "user_provided", confidence: 1 },
  hiringProblem: "Build a reliable employer recruiting assistant product.",
  outcomes: ["Own roadmap and launch."],
  responsibilities: ["Lead implementation."],
  requirements: ["Next.js", "Supabase"],
  niceToHave: ["Recruiting domain"],
  interviewLoop: ["Recruiter screen", "Panel"],
  draftDescription: "Draft body",
  assumptions: ["Department inferred."],
  missingCriticalFields: ["hiringManager"],
  followUpQuestions: ["Who is the hiring manager?"],
  reasoningSummary: [],
  thinkingMessages: [],
  actionLog: []
};

describe("job posting memory", () => {
  it("builds compact summaries and flags compaction when threshold is exceeded", () => {
    const compact = buildCompactSummaryFromOutput({
      output,
      latestEmployerMessage: "Raise bar for backend ownership.",
      messageCount: 14
    });

    expect(compact.summaryText).toContain("Latest employer instruction");
    expect(compact.unresolvedGaps).toEqual(["hiringManager"]);
    expect(compact.keyDecisions).toContain("Role: Senior AI Product Engineer");
    expect(compact.compacted).toBe(true);
    expect(compact.compactedMessageCount).toBe(14);
  });

  it("derives persistent memory items from structured output", () => {
    const items = deriveMemoryItemsFromOutput({
      output,
      sourceMessageIds: ["msg-1", "msg-2"]
    });

    expect(items.some((item) => item.memoryType === "constraint")).toBe(true);
    expect(items.some((item) => item.memoryType === "unresolved_gap")).toBe(true);
    expect(items.some((item) => item.memoryType === "publish_readiness")).toBe(true);
    expect(items.every((item) => item.sourceMessageIds.length === 2)).toBe(true);
  });

  it("retrieves memory using lexical overlap and renders prompt-safe blocks", () => {
    const result = retrieveScopedMemory({
      query: "update compensation for senior remote role",
      summary: {
        id: "sum-1",
        employer_user_id: "u-1",
        employer_job_id: "job-1",
        session_id: "s-1",
        summary_text: "Compensation and level are confirmed.",
        unresolved_gaps: ["hiringManager"],
        key_decisions: ["Compensation: $180k-$220k"],
        compacted_message_count: 12,
        created_at: "2026-04-28T00:00:00.000Z",
        updated_at: "2026-04-28T00:00:00.000Z"
      },
      items: [
        {
          id: "m-1",
          employer_user_id: "u-1",
          employer_job_id: "job-1",
          session_id: "s-1",
          memory_type: "constraint",
          content: "Compensation=$180k-$220k",
          source_message_ids: [],
          importance: 5,
          superseded_at: null,
          expires_at: null,
          metadata: {},
          created_at: "2026-04-28T00:00:00.000Z",
          updated_at: "2026-04-28T00:00:00.000Z"
        },
        {
          id: "m-2",
          employer_user_id: "u-1",
          employer_job_id: "job-1",
          session_id: "s-1",
          memory_type: "summary_fragment",
          content: "Use concise tone.",
          source_message_ids: [],
          importance: 1,
          superseded_at: null,
          expires_at: null,
          metadata: {},
          created_at: "2026-04-20T00:00:00.000Z",
          updated_at: "2026-04-20T00:00:00.000Z"
        }
      ]
    });

    expect(result.retrievedItems[0]?.id).toBe("m-1");
    const promptMemory = renderRetrievedMemoryForPrompt({
      ...result,
      compacted: true
    });
    expect(promptMemory).toContain("Session memory summary:");
    expect(promptMemory).toContain("Retrieved memory items:");
    expect(promptMemory).toContain("Compensation=$180k-$220k");
  });

  it("returns null when the memory summary table is not yet migrated", async () => {
    const client = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          maybeSingle: async () => ({
                            data: null,
                            error: {
                              message:
                                "Could not find the table 'public.agent_memory_summaries' in the schema cache"
                            }
                          })
                        };
                      }
                    };
                  }
                };
              }
            };
          }
        };
      }
    };

    await expect(
      getAgentMemorySummaryBySession(client, "user-1", "job-1", "session-1")
    ).resolves.toBeNull();
  });

  it("returns an empty list when the memory item table is not yet migrated", async () => {
    const client = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          is() {
                            return {
                              order: async () => ({
                                data: [],
                                error: {
                                  message:
                                    "Could not find the table 'public.agent_memory_items' in the schema cache"
                                }
                              })
                            };
                          }
                        };
                      }
                    };
                  }
                };
              }
            };
          }
        };
      }
    };

    await expect(
      listActiveAgentMemoryItemsBySession(client, "user-1", "job-1", "session-1")
    ).resolves.toEqual([]);
  });
});
