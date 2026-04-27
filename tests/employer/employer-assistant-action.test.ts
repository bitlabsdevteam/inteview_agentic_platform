import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
const notFound = vi.fn(() => {
  throw new Error("NOT_FOUND");
});

const getUser = vi.fn();
const createSupabaseServerClient = vi.fn(async () => ({
  auth: {
    getUser
  }
}));

const getEmployerJob = vi.fn();
const getCandidateProfileById = vi.fn();
const runEmployerAssistantOrchestration = vi.fn();
const createEmployerAssistantRecommendation = vi.fn();
const createEmployerAssistantScreeningKit = vi.fn();
const createEmployerAssistantScreeningQuestion = vi.fn();
const getOpenAIClientConfig = vi.fn(() => ({
  apiKey: "sk-test-key",
  model: "gpt-5.5",
  baseUrl: "https://api.openai.test/v1"
}));
const createStaticEmployerAssistantPromptVersion = vi.fn(() => ({
  promptKey: "employer_recruiting_assistant_system_prompt",
  version: "v1",
  channel: "system",
  status: "active",
  body: "assistant system prompt",
  checksum: "assistant-checksum"
}));

vi.mock("next/navigation", () => ({
  redirect,
  notFound
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient
}));

vi.mock("@/lib/employer/jobs", async () => {
  const actual = await vi.importActual("@/lib/employer/jobs");
  return {
    ...actual,
    getEmployerJob
  };
});

vi.mock("@/lib/agents/candidate-intake/persistence", async () => {
  const actual = await vi.importActual("@/lib/agents/candidate-intake/persistence");
  return {
    ...actual,
    getCandidateProfileById
  };
});

vi.mock("@/lib/agents/employer-assistant/orchestrator", async () => {
  const actual = await vi.importActual("@/lib/agents/employer-assistant/orchestrator");
  return {
    ...actual,
    runEmployerAssistantOrchestration
  };
});

vi.mock("@/lib/agents/employer-assistant/persistence", async () => {
  const actual = await vi.importActual("@/lib/agents/employer-assistant/persistence");
  return {
    ...actual,
    createEmployerAssistantRecommendation,
    createEmployerAssistantScreeningKit,
    createEmployerAssistantScreeningQuestion
  };
});

vi.mock("@/lib/agents/job-posting/openai-client", async () => {
  const actual = await vi.importActual("@/lib/agents/job-posting/openai-client");
  return {
    ...actual,
    getOpenAIClientConfig
  };
});

vi.mock("@/lib/agents/employer-assistant/prompts", async () => {
  const actual = await vi.importActual("@/lib/agents/employer-assistant/prompts");
  return {
    ...actual,
    createStaticEmployerAssistantPromptVersion
  };
});

describe("employer assistant action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runEmployerAssistantOrchestration.mockReset();
    createEmployerAssistantRecommendation.mockReset();
    createEmployerAssistantScreeningKit.mockReset();
    createEmployerAssistantScreeningQuestion.mockReset();
  });

  it("generates recommendation, persists assistant records, and redirects to candidate review", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "employer-user-1",
          user_metadata: {
            role: "employer"
          }
        }
      }
    });
    getEmployerJob.mockResolvedValue({
      id: "job-1",
      title: "Senior AI Product Engineer",
      brief: {
        requirements:
          "Own distributed system architecture decisions.\nDeliver reliable TypeScript + Postgres services.",
        hiringProblem: "Need stronger architecture ownership signal.",
        outcomes: "Ship reliable AI hiring workflows."
      }
    });
    getCandidateProfileById.mockResolvedValue({
      id: "profile-1",
      summary: "Backend engineer with partial architecture evidence.",
      skills: ["TypeScript", "Postgres"],
      aggregate_score: 0.74,
      score_evidence_snippets: ["Led API design for hiring workflow platform."],
      extraction_metadata: {
        missingSignals: ["system_design_depth", "ownership_scope"]
      }
    });
    runEmployerAssistantOrchestration.mockResolvedValue({
      recommendation: {
        action: "screen_candidate",
        rationale: "Run targeted screening for missing architecture signal.",
        evidenceReferences: [
          {
            sourceType: "candidate_score",
            referenceId: "aggregate_score",
            quote: "Deterministic aggregate score 74%.",
            relevance: 0.9
          }
        ],
        riskFlags: [
          {
            code: "moderate_signal_uncertainty",
            severity: "low",
            message: "Candidate appears promising but requires structured screening."
          }
        ],
        screeningKit: {
          title: "Architecture Signal Check",
          objective: "Validate system design ownership before employer review.",
          questions: [
            {
              question: "Design a service for 10x traffic growth and explain tradeoffs.",
              competency: "technical",
              intent: "Probe missing system design signal.",
              rubricDimension: "system_design",
              uncertaintyFlag: true
            }
          ]
        }
      },
      metadata: {
        providerResponseId: "resp_assistant_1",
        model: "gpt-5.5",
        prompt: {
          promptKey: "employer_recruiting_assistant_system_prompt",
          version: "v1",
          checksum: "assistant-checksum"
        },
        attempts: 1,
        fallbackUsed: false,
        failureReason: null
      }
    });
    createEmployerAssistantRecommendation.mockResolvedValue({ id: "recommendation-1" });
    createEmployerAssistantScreeningKit.mockResolvedValue({ id: "kit-1" });
    createEmployerAssistantScreeningQuestion.mockResolvedValue({ id: "question-1" });

    const formData = new FormData();
    formData.set("jobId", "job-1");
    formData.set("candidateId", "profile-1");

    const { askEmployerAssistantForNextStepAction } = await import("@/app/employer/jobs/actions");
    await expect(askEmployerAssistantForNextStepAction(formData)).rejects.toThrow(
      "REDIRECT:/employer/jobs/job-1/candidates/profile-1"
    );

    expect(getEmployerJob).toHaveBeenCalledWith(expect.any(Object), "employer-user-1", "job-1");
    expect(getCandidateProfileById).toHaveBeenCalledWith(
      expect.any(Object),
      "employer-user-1",
      "job-1",
      "profile-1"
    );
    expect(runEmployerAssistantOrchestration).toHaveBeenCalledWith({
      config: {
        apiKey: "sk-test-key",
        model: "gpt-5.5",
        baseUrl: "https://api.openai.test/v1"
      },
      promptVersion: {
        promptKey: "employer_recruiting_assistant_system_prompt",
        version: "v1",
        channel: "system",
        status: "active",
        body: "assistant system prompt",
        checksum: "assistant-checksum"
      },
      context: {
        employerJobId: "job-1",
        candidateProfileId: "profile-1",
        job: {
          title: "Senior AI Product Engineer",
          requirements: [
            "Own distributed system architecture decisions.",
            "Deliver reliable TypeScript + Postgres services."
          ],
          hiringProblem: "Need stronger architecture ownership signal.",
          outcomes: ["Ship reliable AI hiring workflows."]
        },
        candidate: {
          summary: "Backend engineer with partial architecture evidence.",
          skills: ["TypeScript", "Postgres"],
          aggregateScore: 0.74,
          evidenceSnippets: ["Led API design for hiring workflow platform."],
          missingSignals: ["system_design_depth", "ownership_scope"]
        }
      }
    });
    expect(createEmployerAssistantRecommendation).toHaveBeenCalledWith(expect.any(Object), {
      employerUserId: "employer-user-1",
      employerJobId: "job-1",
      candidateProfileId: "profile-1",
      action: "screen_candidate",
      rationale: "Run targeted screening for missing architecture signal.",
      evidenceReferences: [
        {
          sourceType: "candidate_score",
          referenceId: "aggregate_score",
          quote: "Deterministic aggregate score 74%.",
          relevance: 0.9
        }
      ],
      riskFlags: [
        {
          code: "moderate_signal_uncertainty",
          severity: "low",
          message: "Candidate appears promising but requires structured screening."
        }
      ],
      promptKey: "employer_recruiting_assistant_system_prompt",
      promptVersion: "v1",
      promptChecksum: "assistant-checksum",
      provider: "openai",
      model: "gpt-5.5",
      providerResponseId: "resp_assistant_1",
      failureReason: null,
      metadata: {
        attempts: 1,
        fallbackUsed: false
      }
    });
    expect(createEmployerAssistantScreeningKit).toHaveBeenCalledWith(expect.any(Object), {
      recommendationId: "recommendation-1",
      employerUserId: "employer-user-1",
      employerJobId: "job-1",
      candidateProfileId: "profile-1",
      title: "Architecture Signal Check",
      objective: "Validate system design ownership before employer review.",
      metadata: {}
    });
    expect(createEmployerAssistantScreeningQuestion).toHaveBeenCalledWith(expect.any(Object), {
      screeningKitId: "kit-1",
      employerUserId: "employer-user-1",
      employerJobId: "job-1",
      candidateProfileId: "profile-1",
      questionOrder: 1,
      questionText: "Design a service for 10x traffic growth and explain tradeoffs.",
      rubricDimension: "system_design",
      rubricGuidance: "Probe missing system design signal.",
      isUncertaintyProbe: true,
      metadata: {
        competency: "technical"
      }
    });
    expect(redirect).toHaveBeenCalledWith("/employer/jobs/job-1/candidates/profile-1");
  });

  it("calls notFound when job is outside owner scope", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "employer-user-1",
          user_metadata: {
            role: "employer"
          }
        }
      }
    });
    getEmployerJob.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("jobId", "job-1");
    formData.set("candidateId", "profile-1");

    const { askEmployerAssistantForNextStepAction } = await import("@/app/employer/jobs/actions");
    await expect(askEmployerAssistantForNextStepAction(formData)).rejects.toThrow("NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
    expect(getCandidateProfileById).not.toHaveBeenCalled();
    expect(runEmployerAssistantOrchestration).not.toHaveBeenCalled();
  });

  it("calls notFound when candidate profile is outside owner/job scope", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "employer-user-1",
          user_metadata: {
            role: "employer"
          }
        }
      }
    });
    getEmployerJob.mockResolvedValue({
      id: "job-1",
      title: "Senior AI Product Engineer",
      brief: {
        requirements: "Own architecture quality.",
        hiringProblem: "Need architecture signal.",
        outcomes: "Ship reliable workflows."
      }
    });
    getCandidateProfileById.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("jobId", "job-1");
    formData.set("candidateId", "profile-1");

    const { askEmployerAssistantForNextStepAction } = await import("@/app/employer/jobs/actions");
    await expect(askEmployerAssistantForNextStepAction(formData)).rejects.toThrow("NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
    expect(runEmployerAssistantOrchestration).not.toHaveBeenCalled();
  });
});
