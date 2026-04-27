import { beforeEach, describe, expect, it, vi } from "vitest";

import { parseSseFrame } from "@/lib/agents/job-posting/streaming";

const createSupabaseServerClientMock = vi.fn();
const streamJobPostingInferenceMock = vi.fn();
const createPromptFirstEmployerJobDraftMock = vi.fn();
const getOpenAIClientConfigMock = vi.fn();
const createStaticJobCreatorPromptVersionMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock
}));

vi.mock("@/lib/agents/job-posting/inference", () => ({
  streamJobPostingInference: streamJobPostingInferenceMock
}));

vi.mock("@/lib/agents/job-posting/create-draft", () => ({
  createPromptFirstEmployerJobDraft: createPromptFirstEmployerJobDraftMock
}));

vi.mock("@/lib/agents/job-posting/openai-client", () => ({
  getOpenAIClientConfig: getOpenAIClientConfigMock
}));

vi.mock("@/lib/agents/job-posting/prompts", () => ({
  createStaticJobCreatorPromptVersion: createStaticJobCreatorPromptVersionMock
}));

function createEmployerSupabaseClient(userId = "employer-user-1") {
  return {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: userId,
            user_metadata: {
              role: "employer"
            }
          }
        }
      })
    }
  };
}

function parseFrames(raw: string) {
  return raw
    .split("\n\n")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => parseSseFrame(`${chunk}\n\n`))
    .filter((frame): frame is NonNullable<ReturnType<typeof parseSseFrame>> => frame !== null);
}

describe("POST /api/employer/jobs/agent-stream", () => {
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

  it("forwards provider tokens directly and completes with redirect", async () => {
    const streamedResult = {
      output: {
        title: { value: "Senior Engineer", source: "inferred", confidence: 0.9 },
        department: { value: "Engineering", source: "inferred", confidence: 0.9 },
        level: { value: "Senior", source: "inferred", confidence: 0.9 },
        location: { value: "Remote", source: "user_provided", confidence: 1 },
        employmentType: { value: "Full-time", source: "defaulted", confidence: 0.8 },
        compensationBand: { value: "TBD", source: "missing", confidence: 0 },
        hiringProblem: "Build reliable AI interview workflows.",
        outcomes: [],
        responsibilities: [],
        requirements: [],
        niceToHave: [],
        interviewLoop: [],
        draftDescription: "Draft",
        assumptions: [],
        missingCriticalFields: [],
        followUpQuestions: [],
        reasoningSummary: [],
        thinkingMessages: [],
        actionLog: []
      },
      providerResponseId: "resp_stream_1",
      model: "gpt-5.5",
      prompt: {
        promptKey: "job_creator_agent_system_prompt",
        version: "v1",
        checksum: "prompt-checksum"
      }
    };

    streamJobPostingInferenceMock.mockImplementation(async function* () {
      yield { type: "status", message: "Streaming inference started." };
      yield { type: "token", token: "Analyzing " };
      yield { type: "token", token: "prompt" };
      yield { type: "status", message: "Streaming inference completed." };
      yield { type: "result", result: streamedResult };
    });

    createPromptFirstEmployerJobDraftMock.mockImplementation(async ({ runInference }) => {
      const inference = await runInference({
        config: getOpenAIClientConfigMock(),
        promptVersion: createStaticJobCreatorPromptVersionMock(),
        employerPrompt: "Need senior engineer."
      });

      expect(inference).toEqual(streamedResult);

      return {
        job: { id: "job-123" },
        inference: {
          output: {
            thinkingMessages: []
          }
        }
      };
    });

    const { POST } = await import("@/app/api/employer/jobs/agent-stream/route");
    const response = await POST(
      new Request("http://localhost/api/employer/jobs/agent-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          employerPrompt: "Need senior engineer."
        })
      })
    );

    expect(response.status).toBe(200);
    const frames = parseFrames(await response.text());

    const tokenEvents = frames.filter((frame) => frame.event === "activity_token");
    expect(tokenEvents).toEqual([
      { event: "activity_token", data: { token: "Analyzing " } },
      { event: "activity_token", data: { token: "prompt" } }
    ]);
    expect(frames).toContainEqual({
      event: "complete",
      data: {
        redirectUrl: "/employer/jobs/job-123"
      }
    });
  });

  it("emits an error event when provider stream fails", async () => {
    streamJobPostingInferenceMock.mockImplementation(async function* () {
      throw new Error("Provider request failed.");
    });

    const { POST } = await import("@/app/api/employer/jobs/agent-stream/route");
    const response = await POST(
      new Request("http://localhost/api/employer/jobs/agent-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          employerPrompt: "Need senior engineer."
        })
      })
    );

    const frames = parseFrames(await response.text());
    expect(frames).toContainEqual({
      event: "error",
      data: {
        message: "Unable to generate a draft right now. Please try again."
      }
    });
    expect(frames.some((frame) => frame.event === "complete")).toBe(false);
    expect(createPromptFirstEmployerJobDraftMock).not.toHaveBeenCalled();
  });
});
