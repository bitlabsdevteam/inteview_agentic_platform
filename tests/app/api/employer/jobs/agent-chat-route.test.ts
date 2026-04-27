import { beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseServerClientMock = vi.fn();
const reviseEmployerJobDraftFromChatTurnMock = vi.fn();
const getOpenAIClientConfigMock = vi.fn();
const createStaticJobCreatorPromptVersionMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock
}));

vi.mock("@/lib/agents/job-posting/follow-up", () => ({
  reviseEmployerJobDraftFromChatTurn: reviseEmployerJobDraftFromChatTurnMock
}));

vi.mock("@/lib/agents/job-posting/openai-client", () => ({
  getOpenAIClientConfig: getOpenAIClientConfigMock
}));

vi.mock("@/lib/agents/job-posting/prompts", () => ({
  createStaticJobCreatorPromptVersion: createStaticJobCreatorPromptVersionMock
}));

function createEmployerSupabaseClient(userId = "employer-user-1", role = "employer") {
  return {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: userId,
            user_metadata: {
              role
            }
          }
        }
      })
    }
  };
}

describe("POST /api/employer/jobs/[id]/agent-chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSupabaseServerClientMock.mockResolvedValue(createEmployerSupabaseClient());
    getOpenAIClientConfigMock.mockReturnValue({
      apiKey: "sk-test",
      model: "gpt-5.5",
      baseUrl: "https://api.openai.test/v1"
    });
    createStaticJobCreatorPromptVersionMock.mockReturnValue({
      promptKey: "job_creator_agent_system_prompt",
      version: "v1",
      checksum: "prompt-checksum"
    });
  });

  it("returns updated session, job, memory, and messages for employer-scoped chat revision without stage metadata", async () => {
    reviseEmployerJobDraftFromChatTurnMock.mockResolvedValue({
      session: {
        id: "session-1",
        status: "needs_follow_up",
        assumptions: [],
        missing_critical_fields: ["hiringManager"],
        follow_up_questions: ["Who is the hiring manager?"],
        updated_at: "2026-04-28T00:00:00.000Z"
      },
      job: {
        id: "job-1",
        draft_description: "Draft body",
        status: "draft",
        updated_at: "2026-04-28T00:00:00.000Z"
      },
      memory: {
        summary: {
          summary_text: "Summary text",
          unresolved_gaps: ["hiringManager"],
          key_decisions: ["Compensation: $180k-$220k"],
          compacted_message_count: 12,
          updated_at: "2026-04-28T00:00:00.000Z"
        },
        compacted: true
      },
      roleProfileSummary: {
        title: "Senior AI Product Engineer",
        level: "Senior",
        locationPolicy: "Remote US",
        unresolvedConstraints: ["Hiring manager not yet confirmed"],
        conflicts: []
      },
      qualityChecks: [
        {
          checkType: "completeness",
          status: "warn",
          issues: ["Missing required section: Interview process."],
          suggestedRewrite: "Add explicit interview process section."
        }
      ],
      readinessFlags: {
        blocksReview: false,
        requiresEmployerFix: true
      },
      interviewBlueprintSummary: {
        id: "blueprint-1",
        status: "draft",
        responseMode: "voice_agent",
        toneProfile: "high-precision",
        parsingStrategy: "hybrid",
        benchmarkSummary:
          "Advance candidates who show concrete ownership examples, clear tradeoff reasoning, and strong debugging communication.",
        completenessGaps: [
          "Add at least one interview question to stage: Technical Deep Dive."
        ]
      },
      messages: [
        {
          id: "m-1",
          role: "employer",
          content: "Update compensation.",
          created_at: "2026-04-28T00:00:00.000Z"
        },
        {
          id: "m-2",
          role: "agent",
          content: "Updated draft.",
          created_at: "2026-04-28T00:00:01.000Z"
        }
      ]
    });

    const { POST } = await import("@/app/api/employer/jobs/[id]/agent-chat/route");
    const response = await POST(
      new Request("http://localhost/api/employer/jobs/job-1/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Update compensation.",
          sessionId: "session-1"
        })
      }),
      { params: Promise.resolve({ id: "job-1" }) }
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload).toMatchObject({
      session: {
        id: "session-1",
        status: "needs_follow_up"
      },
      job: {
        id: "job-1"
      },
      memory: {
        compacted: true
      },
      roleProfileSummary: {
        title: "Senior AI Product Engineer",
        level: "Senior",
        unresolvedConstraints: ["Hiring manager not yet confirmed"]
      },
      qualityChecks: [
        {
          checkType: "completeness",
          status: "warn"
        }
      ],
      readinessFlags: {
        blocksReview: false,
        requiresEmployerFix: true
      },
      interviewBlueprintSummary: {
        id: "blueprint-1",
        responseMode: "voice_agent",
        toneProfile: "high-precision",
        completenessGaps: ["Add at least one interview question to stage: Technical Deep Dive."]
      }
    });
    expect(payload).not.toHaveProperty("activeStage");
    expect(payload).not.toHaveProperty("stageSummary");
    expect(Array.isArray(payload.messages)).toBe(true);
    expect(reviseEmployerJobDraftFromChatTurnMock).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for missing message", async () => {
    const { POST } = await import("@/app/api/employer/jobs/[id]/agent-chat/route");
    const response = await POST(
      new Request("http://localhost/api/employer/jobs/job-1/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: " "
        })
      }),
      { params: Promise.resolve({ id: "job-1" }) }
    );

    expect(response.status).toBe(500);
    const payload = await response.json();
    expect(payload.error).toContain("Chat message is required");
  });

  it("returns 403 for non-employer role", async () => {
    createSupabaseServerClientMock.mockResolvedValue(createEmployerSupabaseClient("u-1", "job_seeker"));

    const { POST } = await import("@/app/api/employer/jobs/[id]/agent-chat/route");
    const response = await POST(
      new Request("http://localhost/api/employer/jobs/job-1/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Update compensation."
        })
      }),
      { params: Promise.resolve({ id: "job-1" }) }
    );

    expect(response.status).toBe(403);
  });
});
