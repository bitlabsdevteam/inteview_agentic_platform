import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
const notFound = vi.fn(() => {
  throw new Error("NOT_FOUND");
});

const enforceRouteAccess = vi.fn();
const getAccountHeaderState = vi.fn(async () => ({
  email: "employer@example.com",
  identityLabel: "employer@example.com",
  isAuthenticated: true,
  role: "employer",
  roleLabel: "Employer"
}));
const getUser = vi.fn();
const getEmployerJob = vi.fn();
const listCandidateIntakeRecordsByJob = vi.fn();
const listCandidateProfilesByJob = vi.fn();
const getCandidateProfileById = vi.fn();
const getLatestEmployerAssistantRecommendationByCandidate = vi.fn();
const getEmployerAssistantScreeningKitByRecommendation = vi.fn();
const listEmployerAssistantScreeningQuestionsByKit = vi.fn();

vi.mock("next/navigation", () => ({
  redirect,
  notFound
}));

vi.mock("@/lib/auth/enforce-route-access", () => ({
  enforceRouteAccess
}));

vi.mock("@/components/account-header", async () => {
  const actual = await vi.importActual("@/components/account-header");

  return {
    ...actual,
    getAccountHeaderState
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser
    }
  }))
}));

vi.mock("@/lib/agents/candidate-intake/persistence", async () => {
  const actual = await vi.importActual("@/lib/agents/candidate-intake/persistence");

  return {
    ...actual,
    listCandidateIntakeRecordsByJob,
    listCandidateProfilesByJob,
    getCandidateProfileById
  };
});

vi.mock("@/lib/employer/jobs", async () => {
  const actual = await vi.importActual("@/lib/employer/jobs");

  return {
    ...actual,
    getEmployerJob
  };
});

vi.mock("@/lib/agents/employer-assistant/persistence", async () => {
  const actual = await vi.importActual("@/lib/agents/employer-assistant/persistence");

  return {
    ...actual,
    getLatestEmployerAssistantRecommendationByCandidate,
    getEmployerAssistantScreeningKitByRecommendation,
    listEmployerAssistantScreeningQuestionsByKit
  };
});

describe("employer candidate pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
      title: "Senior AI Product Engineer"
    });
    getLatestEmployerAssistantRecommendationByCandidate.mockResolvedValue(null);
    getEmployerAssistantScreeningKitByRecommendation.mockResolvedValue(null);
    listEmployerAssistantScreeningQuestionsByKit.mockResolvedValue([]);
  });

  it("renders job-scoped candidate intake/list route", async () => {
    listCandidateIntakeRecordsByJob.mockResolvedValue([
      {
        id: "intake-1",
        employer_user_id: "employer-user-1",
        employer_job_id: "job-1",
        full_name: "Jamie Rivera",
        email: "jamie@example.com",
        phone: "+1-555-0100",
        resume_storage_path: "employers/employer-user-1/jobs/job-1/candidates/jamie.pdf",
        resume_file_name: "jamie.pdf",
        resume_mime_type: "application/pdf",
        resume_file_size_bytes: 1234,
        source_text: "Senior engineer",
        status: "profile_ready",
        created_at: "2026-04-26T00:00:00.000Z",
        updated_at: "2026-04-26T00:00:00.000Z"
      }
    ]);
    listCandidateProfilesByJob.mockResolvedValue([
      {
        id: "intake-1",
        employer_user_id: "employer-user-1",
        employer_job_id: "job-1",
        candidate_intake_id: "intake-1",
        summary: "Senior engineer focused on AI workflow delivery.",
        skills: ["TypeScript", "Postgres"],
        work_experience: ["Built hiring workflow tooling."],
        education: ["B.S. Computer Science"],
        confidence: {
          summary: 0.9,
          skills: 0.8,
          workExperience: 0.85,
          education: 0.75,
          overall: 0.83
        },
        aggregate_score: 0.88,
        score_version: "v1-requirement-fit",
        score_evidence_snippets: [],
        model_id: "gpt-5.5",
        provider_response_id: "resp_123",
        prompt_checksum: "sha256:abc",
        extraction_metadata: {},
        created_at: "2026-04-26T00:00:00.000Z",
        updated_at: "2026-04-26T00:00:00.000Z"
      }
    ]);

    const { default: CandidateListPage } = await import("@/app/employer/jobs/[id]/candidates/page");
    const markup = renderToStaticMarkup(
      await CandidateListPage({
        params: Promise.resolve({ id: "job-1" }),
        searchParams: Promise.resolve({
          status: "profile_ready",
          skill: "TypeScript",
          minConfidence: "0.8",
          sortBy: "aggregate_score_desc"
        })
      })
    );

    expect(enforceRouteAccess).toHaveBeenCalledWith("/employer/jobs");
    expect(listCandidateIntakeRecordsByJob).toHaveBeenCalledWith(
      expect.any(Object),
      "employer-user-1",
      "job-1",
      {
        statuses: ["profile_ready"]
      }
    );
    expect(listCandidateProfilesByJob).toHaveBeenCalledWith(
      expect.any(Object),
      "employer-user-1",
      "job-1",
      {
        skill: "TypeScript",
        minimumOverallConfidence: 0.8,
        sortBy: "aggregate_score_desc"
      }
    );
    expect(markup).toContain('data-testid="employer-candidate-filters"');
    expect(markup).toContain('name="status"');
    expect(markup).toContain('name="skill"');
    expect(markup).toContain('name="minConfidence"');
    expect(markup).toContain('name="sortBy"');
    expect(markup).toContain('data-testid="employer-candidate-intake-form"');
    expect(markup).toContain('data-testid="employer-candidates-list"');
    expect(markup).toContain("Senior engineer focused on AI workflow delivery.");
    expect(markup).toContain("Score 0.88");
    expect(markup).toContain("Overall confidence 0.83");
    expect(markup).toContain('/employer/jobs/job-1/candidates/intake-1');
    expect(markup).not.toContain("jamie@example.com");
    expect(markup).not.toContain("+1-555-0100");
    expect(markup).not.toContain("employers/employer-user-1/jobs/job-1/candidates/jamie.pdf");
  });

  it("does not leak scoring audit internals in employer candidate list markup", async () => {
    listCandidateIntakeRecordsByJob.mockResolvedValue([]);
    listCandidateProfilesByJob.mockResolvedValue([
      {
        id: "profile-1",
        employer_user_id: "employer-user-1",
        employer_job_id: "job-1",
        candidate_intake_id: "intake-1",
        summary: "Senior engineer focused on AI workflow delivery.",
        skills: ["TypeScript", "Postgres"],
        work_experience: ["Built hiring workflow tooling."],
        education: ["B.S. Computer Science"],
        confidence: {
          summary: 0.9,
          skills: 0.8,
          workExperience: 0.85,
          education: 0.75,
          overall: 0.83
        },
        aggregate_score: 0.88,
        score_version: "v1-requirement-fit",
        score_evidence_snippets: ["Matched TypeScript requirement from profile skills."],
        model_id: "gpt-5.5",
        provider_response_id: "resp_123",
        prompt_checksum: "sha256:abc",
        extraction_metadata: {
          scoringAudit: {
            scorer: "deterministic_requirement_fit",
            scorerModelId: "gpt-5.5-internal",
            scoreComputationChecksum: "sha256:score-secret"
          },
          internalReasoningTraceId: "trace-123"
        },
        created_at: "2026-04-26T00:00:00.000Z",
        updated_at: "2026-04-26T00:00:00.000Z"
      }
    ]);

    const { default: CandidateListPage } = await import("@/app/employer/jobs/[id]/candidates/page");
    const markup = renderToStaticMarkup(
      await CandidateListPage({
        params: Promise.resolve({ id: "job-1" }),
        searchParams: Promise.resolve({})
      })
    );

    expect(markup).toContain("Score 0.88");
    expect(markup).not.toContain("deterministic_requirement_fit");
    expect(markup).not.toContain("gpt-5.5-internal");
    expect(markup).not.toContain("sha256:score-secret");
    expect(markup).not.toContain("trace-123");
    expect(markup).not.toContain("Matched TypeScript requirement from profile skills.");
  });

  it("renders candidate structured profile review route", async () => {
    getCandidateProfileById.mockResolvedValue({
      id: "intake-1",
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      summary: "Senior engineer with AI workflow experience.",
      skills: ["TypeScript", "Postgres"],
      work_experience: ["Built hiring workflow tooling."],
      education: ["B.S. Computer Science"],
      confidence: {
        summary: 0.9,
        skills: 0.8,
        workExperience: 0.85,
        education: 0.75,
        overall: 0.83
      },
      model_id: "gpt-5.5",
      provider_response_id: "resp_123",
      prompt_checksum: "sha256:abc",
      extraction_metadata: {},
      created_at: "2026-04-26T00:00:00.000Z",
      updated_at: "2026-04-26T00:00:00.000Z"
    });

    const { default: CandidateProfilePage } = await import(
      "@/app/employer/jobs/[id]/candidates/[candidateId]/page"
    );
    const markup = renderToStaticMarkup(
      await CandidateProfilePage({
        params: Promise.resolve({ id: "job-1", candidateId: "intake-1" })
      })
    );

    expect(getCandidateProfileById).toHaveBeenCalledWith(
      expect.any(Object),
      "employer-user-1",
      "job-1",
      "intake-1"
    );
    expect(markup).toContain('data-testid="employer-candidate-profile"');
    expect(markup).toContain("Senior engineer with AI workflow experience.");
    expect(markup).toContain("TypeScript");
    expect(markup).toContain("confidence.overall");
    expect(markup).toContain("0.83");
    expect(markup).toContain('data-testid="employer-assistant-panel"');
    expect(markup).toContain("Ask Assistant for Next Step");
    expect(markup).not.toContain("resp_123");
    expect(markup).not.toContain("sha256:abc");
  });

  it("renders assistant recommendation panel with evidence, risks, and screening kit without hidden metadata", async () => {
    getCandidateProfileById.mockResolvedValue({
      id: "profile-1",
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      summary: "Strong backend profile with partial system-design depth evidence.",
      skills: ["TypeScript", "Postgres"],
      work_experience: ["Built hiring workflow tooling."],
      education: ["B.S. Computer Science"],
      confidence: {
        summary: 0.9,
        skills: 0.8,
        workExperience: 0.85,
        education: 0.75,
        overall: 0.83
      },
      model_id: "gpt-5.5",
      provider_response_id: "resp_profile_123",
      prompt_checksum: "sha256:profile",
      extraction_metadata: {},
      created_at: "2026-04-26T00:00:00.000Z",
      updated_at: "2026-04-26T00:00:00.000Z"
    });
    getLatestEmployerAssistantRecommendationByCandidate.mockResolvedValue({
      id: "recommendation-1",
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      candidate_profile_id: "profile-1",
      action: "screen_candidate",
      rationale: "Run a targeted system-design screen before review.",
      evidence_references: [
        {
          sourceType: "candidate_score",
          referenceId: "aggregate_score",
          quote: "Deterministic aggregate score 0.74.",
          relevance: 0.9
        }
      ],
      risk_flags: [
        {
          code: "moderate_signal_uncertainty",
          severity: "low",
          message: "Candidate needs structured screening to close evidence gaps."
        }
      ],
      prompt_key: "employer_recruiting_assistant_system_prompt",
      prompt_version: "v1",
      prompt_checksum: "sha256:assistant-secret",
      provider: "openai",
      model: "gpt-5.5",
      provider_response_id: "resp_assistant_123",
      failure_reason: null,
      metadata: {},
      created_at: "2026-04-27T00:00:00.000Z",
      updated_at: "2026-04-27T00:00:00.000Z"
    });
    getEmployerAssistantScreeningKitByRecommendation.mockResolvedValue({
      id: "kit-1",
      recommendation_id: "recommendation-1",
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      candidate_profile_id: "profile-1",
      title: "Architecture Signal Check",
      objective: "Validate architecture ownership before employer review.",
      metadata: {},
      created_at: "2026-04-27T00:00:00.000Z",
      updated_at: "2026-04-27T00:00:00.000Z"
    });
    listEmployerAssistantScreeningQuestionsByKit.mockResolvedValue([
      {
        id: "question-1",
        screening_kit_id: "kit-1",
        employer_user_id: "employer-user-1",
        employer_job_id: "job-1",
        candidate_profile_id: "profile-1",
        question_order: 1,
        question_text: "Design a service for 10x traffic and explain tradeoffs.",
        rubric_dimension: "system_design",
        rubric_guidance: "Probe missing system-design ownership.",
        is_uncertainty_probe: true,
        metadata: {},
        created_at: "2026-04-27T00:00:00.000Z",
        updated_at: "2026-04-27T00:00:00.000Z"
      }
    ]);

    const { default: CandidateProfilePage } = await import(
      "@/app/employer/jobs/[id]/candidates/[candidateId]/page"
    );
    const markup = renderToStaticMarkup(
      await CandidateProfilePage({
        params: Promise.resolve({ id: "job-1", candidateId: "profile-1" })
      })
    );

    expect(markup).toContain("Assistant Recommendation");
    expect(markup).toContain("screen_candidate");
    expect(markup).toContain("Run a targeted system-design screen before review.");
    expect(markup).toContain("Deterministic aggregate score 0.74.");
    expect(markup).toContain("moderate_signal_uncertainty");
    expect(markup).toContain("Architecture Signal Check");
    expect(markup).toContain("Design a service for 10x traffic and explain tradeoffs.");
    expect(markup).toContain("uncertainty probe");
    expect(markup).toContain("Ask Assistant for Next Step");

    expect(markup).not.toContain("resp_assistant_123");
    expect(markup).not.toContain("sha256:assistant-secret");
    expect(markup).not.toContain("employer_recruiting_assistant_system_prompt");
  });

  it("does not leak assistant hidden metadata, tool traces, or candidate PII in profile review panel", async () => {
    getCandidateProfileById.mockResolvedValue({
      id: "profile-1",
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      summary: "Backend profile with architecture uncertainty.",
      skills: ["TypeScript", "Postgres"],
      work_experience: ["Built hiring workflow tooling."],
      education: ["B.S. Computer Science"],
      confidence: {
        summary: 0.9,
        skills: 0.8,
        workExperience: 0.85,
        education: 0.75,
        overall: 0.83
      },
      model_id: "gpt-5.5",
      provider_response_id: "resp_profile_hidden",
      prompt_checksum: "sha256:profile-hidden",
      extraction_metadata: {
        candidateEmail: "private-candidate@example.com",
        candidatePhone: "+1-555-0100",
        resumeStoragePath: "employers/employer-user-1/jobs/job-1/candidates/private.pdf"
      },
      created_at: "2026-04-26T00:00:00.000Z",
      updated_at: "2026-04-26T00:00:00.000Z"
    });
    getLatestEmployerAssistantRecommendationByCandidate.mockResolvedValue({
      id: "recommendation-privacy-1",
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      candidate_profile_id: "profile-1",
      action: "request_more_signal",
      rationale: "Collect missing evidence before deciding next step.",
      evidence_references: [
        {
          sourceType: "candidate_profile",
          referenceId: "candidate-summary",
          quote: "Architecture depth still unclear.",
          relevance: 0.8
        }
      ],
      risk_flags: [
        {
          code: "missing_critical_evidence",
          severity: "medium",
          message: "Missing design ownership evidence."
        }
      ],
      prompt_key: "employer_recruiting_assistant_system_prompt",
      prompt_version: "v1",
      prompt_checksum: "sha256:assistant-hidden",
      provider: "openai",
      model: "gpt-5.5",
      provider_response_id: "resp_assistant_hidden",
      failure_reason: null,
      metadata: {
        promptBody: "system prompt secret",
        toolCalls: ["db.select(secret_table)"],
        chainOfThought: "hidden reasoning"
      },
      created_at: "2026-04-27T00:00:00.000Z",
      updated_at: "2026-04-27T00:00:00.000Z"
    });

    const { default: CandidateProfilePage } = await import(
      "@/app/employer/jobs/[id]/candidates/[candidateId]/page"
    );
    const markup = renderToStaticMarkup(
      await CandidateProfilePage({
        params: Promise.resolve({ id: "job-1", candidateId: "profile-1" })
      })
    );

    expect(markup).toContain("Collect missing evidence before deciding next step.");
    expect(markup).not.toContain("private-candidate@example.com");
    expect(markup).not.toContain("+1-555-0100");
    expect(markup).not.toContain("private.pdf");
    expect(markup).not.toContain("resp_assistant_hidden");
    expect(markup).not.toContain("sha256:assistant-hidden");
    expect(markup).not.toContain("system prompt secret");
    expect(markup).not.toContain("db.select(secret_table)");
    expect(markup).not.toContain("hidden reasoning");
  });

  it("calls notFound when candidate profile is outside job scope", async () => {
    getCandidateProfileById.mockResolvedValue(null);

    const { default: CandidateProfilePage } = await import(
      "@/app/employer/jobs/[id]/candidates/[candidateId]/page"
    );

    await expect(
      CandidateProfilePage({
        params: Promise.resolve({ id: "job-1", candidateId: "candidate-outside-scope" })
      })
    ).rejects.toThrow("NOT_FOUND");

    expect(getCandidateProfileById).toHaveBeenCalledWith(
      expect.any(Object),
      "employer-user-1",
      "job-1",
      "candidate-outside-scope"
    );
  });
});
