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
const prepareCandidateResumeUpload = vi.fn();
const createCandidateIntakeRecord = vi.fn();
const runCandidateExtraction = vi.fn();
const createCandidateProfile = vi.fn();
const createCandidateExtractionMetricsRecord = vi.fn();
const extractCandidateExtractionFailureReason = vi.fn((error: unknown) =>
  error instanceof Error ? error.message : "unknown_error"
);
const isCandidateExtractionValidationFailure = vi.fn((error: unknown) =>
  error instanceof Error && /invalid structured output/i.test(error.message)
);
const getOpenAIClientConfig = vi.fn(() => ({
  apiKey: "sk-test-key",
  model: "gpt-5.5",
  baseUrl: "https://api.openai.test/v1"
}));
const createStaticCandidateExtractionPromptVersion = vi.fn(() => ({
  promptKey: "candidate_profile_extraction_system_prompt",
  version: "v1",
  channel: "system",
  status: "active",
  body: "candidate system prompt",
  checksum: "candidate-prompt-checksum"
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

vi.mock("@/lib/agents/candidate-intake/storage", () => ({
  prepareCandidateResumeUpload
}));

vi.mock("@/lib/agents/candidate-intake/persistence", () => ({
  createCandidateIntakeRecord,
  createCandidateProfile
}));

vi.mock("@/lib/agents/candidate-intake/extraction", () => ({
  runCandidateExtraction,
  extractCandidateExtractionFailureReason,
  isCandidateExtractionValidationFailure
}));

vi.mock("@/lib/agents/candidate-intake/metrics", () => ({
  createCandidateExtractionMetricsRecord
}));

vi.mock("@/lib/agents/job-posting/openai-client", async () => {
  const actual = await vi.importActual("@/lib/agents/job-posting/openai-client");

  return {
    ...actual,
    getOpenAIClientConfig
  };
});

vi.mock("@/lib/agents/candidate-intake/prompts", async () => {
  const actual = await vi.importActual("@/lib/agents/candidate-intake/prompts");

  return {
    ...actual,
    createStaticCandidateExtractionPromptVersion
  };
});

describe("employer candidate intake action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runCandidateExtraction.mockReset();
    createCandidateProfile.mockReset();
    createCandidateIntakeRecord.mockReset();
    createCandidateExtractionMetricsRecord.mockReset();
  });

  it("creates candidate intake, runs extraction, persists profile, and redirects to candidate review", async () => {
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

    getEmployerJob.mockResolvedValue({ id: "job-1", status: "draft" });
    prepareCandidateResumeUpload.mockReturnValue({
      ok: true,
      data: {
        storagePath: "employers/employer-user-1/jobs/job-1/candidates/jamie-1234abcd00.pdf",
        normalizedFileName: "jamie.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 1200
      },
      errors: []
    });
    createCandidateIntakeRecord.mockResolvedValue({ id: "intake-1" });
    runCandidateExtraction.mockResolvedValue({
      profile: {
        summary: "Senior engineer.",
        skills: ["TypeScript"],
        workExperience: ["Built hiring workflows."],
        education: ["BSCS"],
        confidence: {
          summary: 0.9,
          skills: 0.8,
          workExperience: 0.85,
          education: 0.7,
          overall: 0.82
        }
      },
      metadata: {
        providerResponseId: "resp_123",
        model: "gpt-5.5",
        prompt: {
          promptKey: "candidate_profile_extraction_system_prompt",
          version: "v1",
          checksum: "candidate-prompt-checksum"
        }
      }
    });
    createCandidateProfile.mockResolvedValue({ id: "profile-1" });
    createCandidateExtractionMetricsRecord.mockResolvedValue({ id: "metric-1" });

    const formData = new FormData();
    formData.set("jobId", "job-1");
    formData.set("candidateFullName", "Jamie Rivera");
    formData.set("candidateEmail", "jamie@example.com");
    formData.set("candidatePhone", "+1-555-0100");
    formData.set("resumeFileName", "jamie.pdf");
    formData.set("resumeMimeType", "application/pdf");
    formData.set("resumeFileSizeBytes", "1200");
    formData.set("candidateSourceText", "Senior engineer with AI hiring workflow experience.");

    const { createEmployerCandidateIntakeAction } = await import("@/app/employer/jobs/actions");
    await expect(createEmployerCandidateIntakeAction(formData)).rejects.toThrow(
      "REDIRECT:/employer/jobs/job-1/candidates/profile-1"
    );

    expect(getEmployerJob).toHaveBeenCalledWith(expect.any(Object), "employer-user-1", "job-1");
    expect(prepareCandidateResumeUpload).toHaveBeenCalledWith({
      actingUserId: "employer-user-1",
      employerUserId: "employer-user-1",
      employerJobId: "job-1",
      candidateFullName: "Jamie Rivera",
      fileName: "jamie.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 1200
    });
    expect(createCandidateIntakeRecord).toHaveBeenCalledWith(expect.any(Object), {
      employerUserId: "employer-user-1",
      employerJobId: "job-1",
      fullName: "Jamie Rivera",
      email: "jamie@example.com",
      phone: "+1-555-0100",
      resume: {
        storagePath: "employers/employer-user-1/jobs/job-1/candidates/jamie-1234abcd00.pdf",
        fileName: "jamie.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 1200
      },
      sourceText: "Senior engineer with AI hiring workflow experience.",
      status: "processing"
    });
    expect(runCandidateExtraction).toHaveBeenCalledWith({
      config: {
        apiKey: "sk-test-key",
        model: "gpt-5.5",
        baseUrl: "https://api.openai.test/v1"
      },
      intake: {
        employerUserId: "employer-user-1",
        employerJobId: "job-1",
        fullName: "Jamie Rivera",
        email: "jamie@example.com",
        phone: "+1-555-0100",
        resume: {
          storagePath: "employers/employer-user-1/jobs/job-1/candidates/jamie-1234abcd00.pdf",
          fileName: "jamie.pdf",
          mimeType: "application/pdf",
          fileSizeBytes: 1200
        },
        sourceText: "Senior engineer with AI hiring workflow experience."
      },
      promptVersion: {
        promptKey: "candidate_profile_extraction_system_prompt",
        version: "v1",
        channel: "system",
        status: "active",
        body: "candidate system prompt",
        checksum: "candidate-prompt-checksum"
      }
    });
    expect(createCandidateProfile).toHaveBeenCalledWith(expect.any(Object), {
      candidateIntakeId: "intake-1",
      employerUserId: "employer-user-1",
      employerJobId: "job-1",
      profile: {
        summary: "Senior engineer.",
        skills: ["TypeScript"],
        workExperience: ["Built hiring workflows."],
        education: ["BSCS"],
        confidence: {
          summary: 0.9,
          skills: 0.8,
          workExperience: 0.85,
          education: 0.7,
          overall: 0.82
        }
      },
      audit: {
        modelId: "gpt-5.5",
        providerResponseId: "resp_123",
        promptChecksum: "candidate-prompt-checksum"
      }
    });
    expect(createCandidateExtractionMetricsRecord).toHaveBeenCalledWith(expect.any(Object), {
      employerUserId: "employer-user-1",
      employerJobId: "job-1",
      candidateIntakeId: "intake-1",
      validationFailureCount: 0,
      normalizationRepairCount: 0,
      extractionSucceeded: true,
      failureReason: null,
      metadata: {
        attemptCount: 1
      }
    });
    expect(redirect).toHaveBeenCalledWith("/employer/jobs/job-1/candidates/profile-1");
  });

  it("retries extraction with bounded attempts and succeeds before hitting the limit", async () => {
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

    getEmployerJob.mockResolvedValue({ id: "job-1", status: "draft" });
    prepareCandidateResumeUpload.mockReturnValue({
      ok: true,
      data: {
        storagePath: "employers/employer-user-1/jobs/job-1/candidates/jamie-1234abcd00.pdf",
        normalizedFileName: "jamie.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 1200
      },
      errors: []
    });
    createCandidateIntakeRecord.mockResolvedValue({ id: "intake-1" });
    runCandidateExtraction
      .mockRejectedValueOnce(new Error("OpenAI candidate extraction failed with status 429."))
      .mockResolvedValueOnce({
        profile: {
          summary: "Senior engineer.",
          skills: ["TypeScript"],
          workExperience: ["Built hiring workflows."],
          education: ["BSCS"],
          confidence: {
            summary: 0.9,
            skills: 0.8,
            workExperience: 0.85,
            education: 0.7,
            overall: 0.82
          }
        },
        metadata: {
          providerResponseId: "resp_123",
          model: "gpt-5.5",
          prompt: {
            promptKey: "candidate_profile_extraction_system_prompt",
            version: "v1",
            checksum: "candidate-prompt-checksum"
          }
        }
      });
    createCandidateProfile.mockResolvedValue({ id: "profile-1" });
    createCandidateExtractionMetricsRecord.mockResolvedValue({ id: "metric-1" });

    const formData = new FormData();
    formData.set("jobId", "job-1");
    formData.set("candidateFullName", "Jamie Rivera");
    formData.set("candidateEmail", "jamie@example.com");
    formData.set("candidatePhone", "+1-555-0100");
    formData.set("resumeFileName", "jamie.pdf");
    formData.set("resumeMimeType", "application/pdf");
    formData.set("resumeFileSizeBytes", "1200");
    formData.set("candidateSourceText", "Senior engineer with AI hiring workflow experience.");

    const { createEmployerCandidateIntakeAction } = await import("@/app/employer/jobs/actions");
    await expect(createEmployerCandidateIntakeAction(formData)).rejects.toThrow(
      "REDIRECT:/employer/jobs/job-1/candidates/profile-1"
    );

    expect(runCandidateExtraction).toHaveBeenCalledTimes(2);
    expect(createCandidateExtractionMetricsRecord).toHaveBeenCalledWith(expect.any(Object), {
      employerUserId: "employer-user-1",
      employerJobId: "job-1",
      candidateIntakeId: "intake-1",
      validationFailureCount: 0,
      normalizationRepairCount: 1,
      extractionSucceeded: true,
      failureReason: null,
      metadata: {
        attemptCount: 2
      }
    });
  });

  it("fails with explicit failure reason when retry attempts are exhausted", async () => {
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

    getEmployerJob.mockResolvedValue({ id: "job-1", status: "draft" });
    prepareCandidateResumeUpload.mockReturnValue({
      ok: true,
      data: {
        storagePath: "employers/employer-user-1/jobs/job-1/candidates/jamie-1234abcd00.pdf",
        normalizedFileName: "jamie.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 1200
      },
      errors: []
    });
    createCandidateIntakeRecord.mockResolvedValue({ id: "intake-1" });
    runCandidateExtraction.mockRejectedValue(
      new Error("OpenAI candidate extraction failed with status 500.")
    );
    createCandidateExtractionMetricsRecord.mockResolvedValue({ id: "metric-1" });

    const formData = new FormData();
    formData.set("jobId", "job-1");
    formData.set("candidateFullName", "Jamie Rivera");
    formData.set("candidateEmail", "jamie@example.com");
    formData.set("candidatePhone", "+1-555-0100");
    formData.set("resumeFileName", "jamie.pdf");
    formData.set("resumeMimeType", "application/pdf");
    formData.set("resumeFileSizeBytes", "1200");
    formData.set("candidateSourceText", "Senior engineer with AI hiring workflow experience.");

    const { createEmployerCandidateIntakeAction } = await import("@/app/employer/jobs/actions");
    await expect(createEmployerCandidateIntakeAction(formData)).rejects.toThrow(
      "Candidate extraction failed after 2 attempts: OpenAI candidate extraction failed with status 500."
    );

    expect(runCandidateExtraction).toHaveBeenCalledTimes(2);
    expect(createCandidateProfile).not.toHaveBeenCalled();
    expect(createCandidateExtractionMetricsRecord).toHaveBeenCalledWith(expect.any(Object), {
      employerUserId: "employer-user-1",
      employerJobId: "job-1",
      candidateIntakeId: "intake-1",
      validationFailureCount: 0,
      normalizationRepairCount: 1,
      extractionSucceeded: false,
      failureReason: "OpenAI candidate extraction failed with status 500.",
      metadata: {
        attemptCount: 2
      }
    });
  });

  it("blocks unauthorized non-employer sessions", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "job-seeker-1",
          user_metadata: {
            role: "job_seeker"
          }
        }
      }
    });

    const formData = new FormData();
    formData.set("jobId", "job-1");

    const { createEmployerCandidateIntakeAction } = await import("@/app/employer/jobs/actions");
    await expect(createEmployerCandidateIntakeAction(formData)).rejects.toThrow(
      "REDIRECT:/job-seeker"
    );

    expect(redirect).toHaveBeenCalledWith("/job-seeker");
    expect(getEmployerJob).not.toHaveBeenCalled();
    expect(createCandidateIntakeRecord).not.toHaveBeenCalled();
    expect(runCandidateExtraction).not.toHaveBeenCalled();
    expect(createCandidateProfile).not.toHaveBeenCalled();
  });
});
