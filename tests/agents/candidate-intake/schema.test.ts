import { describe, expect, it } from "vitest";

import {
  type CandidateExtractionOutput,
  type CandidateIntakePayload,
  type CandidateProfilePersistenceInput,
  validateCandidateExtractionOutput,
  validateCandidateIntakePayload,
  validateCandidateProfilePersistenceInput
} from "@/lib/agents/candidate-intake/schema";

const validIntakePayload: CandidateIntakePayload = {
  employerUserId: "0f5539f8-c9f8-46ea-ae5b-97de132fdb03",
  employerJobId: "3bd86b90-e6f9-4456-87dc-8f40dd5b10b2",
  fullName: "Jamie Rivera",
  email: "jamie@example.com",
  phone: "+1-555-0100",
  resume: {
    storagePath: "employers/0f5539f8-c9f8-46ea-ae5b-97de132fdb03/jobs/3bd86b90-e6f9-4456-87dc-8f40dd5b10b2/candidates/resume.pdf",
    fileName: "jamie-rivera-resume.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 217381
  },
  sourceText: "Senior engineer with 9 years of experience across backend and applied AI systems."
};

const validExtractionOutput: CandidateExtractionOutput = {
  summary: "Senior engineer with strong backend and AI workflow implementation experience.",
  skills: ["TypeScript", "Postgres", "Prompt Engineering"],
  workExperience: ["Led migration from monolith to service-oriented architecture."],
  education: ["B.S. Computer Science"],
  confidence: {
    summary: 0.95,
    skills: 0.9,
    workExperience: 0.86,
    education: 0.8,
    overall: 0.88
  }
};

const validPersistenceInput: CandidateProfilePersistenceInput = {
  candidateIntakeId: "f9557da8-19ce-4bc8-b65e-c4ad5447e5f2",
  employerUserId: validIntakePayload.employerUserId,
  employerJobId: validIntakePayload.employerJobId,
  profile: validExtractionOutput,
  audit: {
    modelId: "gpt-5.1-mini",
    providerResponseId: "resp_123",
    promptChecksum: "sha256:abc123"
  }
};

describe("candidate intake schema", () => {
  it("accepts valid candidate intake payload", () => {
    expect(validateCandidateIntakePayload(validIntakePayload)).toEqual({
      ok: true,
      data: validIntakePayload,
      errors: []
    });
  });

  it("rejects malformed candidate intake payload deterministically", () => {
    const invalidPayload = {
      ...validIntakePayload,
      employerUserId: "",
      fullName: "   ",
      resume: {
        ...validIntakePayload.resume,
        mimeType: "",
        fileSizeBytes: 0
      }
    };

    expect(validateCandidateIntakePayload(invalidPayload)).toEqual({
      ok: false,
      data: null,
      errors: [
        "employerUserId is required.",
        "fullName is required.",
        "resume.mimeType is required.",
        "resume.fileSizeBytes must be greater than 0."
      ]
    });
  });
});

describe("candidate extraction schema", () => {
  it("accepts valid extraction output with profile confidence", () => {
    expect(validateCandidateExtractionOutput(validExtractionOutput)).toEqual({
      ok: true,
      data: validExtractionOutput,
      errors: []
    });
  });

  it("rejects malformed extraction output deterministically", () => {
    const invalidExtraction = {
      ...validExtractionOutput,
      summary: "",
      skills: ["TypeScript", ""],
      confidence: {
        ...validExtractionOutput.confidence,
        workExperience: 1.2
      }
    };

    expect(validateCandidateExtractionOutput(invalidExtraction)).toEqual({
      ok: false,
      data: null,
      errors: [
        "summary is required.",
        "skills must contain only non-empty strings.",
        "confidence.workExperience must be a number between 0 and 1."
      ]
    });
  });
});

describe("candidate profile persistence schema", () => {
  it("accepts valid persistence dto", () => {
    expect(validateCandidateProfilePersistenceInput(validPersistenceInput)).toEqual({
      ok: true,
      data: validPersistenceInput,
      errors: []
    });
  });

  it("rejects malformed persistence dto deterministically", () => {
    const invalidPersistence = {
      ...validPersistenceInput,
      candidateIntakeId: "",
      audit: {
        ...validPersistenceInput.audit,
        modelId: "",
        promptChecksum: ""
      },
      profile: {
        ...validPersistenceInput.profile,
        confidence: {
          ...validPersistenceInput.profile.confidence,
          overall: -0.1
        }
      }
    };

    expect(validateCandidateProfilePersistenceInput(invalidPersistence)).toEqual({
      ok: false,
      data: null,
      errors: [
        "candidateIntakeId is required.",
        "confidence.overall must be a number between 0 and 1.",
        "audit.modelId is required.",
        "audit.promptChecksum is required."
      ]
    });
  });
});

describe("candidate scoring schema", () => {
  it("accepts valid candidate profile score contract", async () => {
    const { validateCandidateProfileScore } = await import("@/lib/agents/candidate-intake/schema");

    const validScore = {
      requirementFitScores: {
        hardSkills: 0.9,
        roleExperience: 0.84,
        domainContext: 0.78,
        educationSignals: 0.65,
        overall: 0.81
      },
      aggregateScore: 0.82,
      scoreVersion: "v1-requirement-fit",
      evidenceSnippets: [
        "Strong TypeScript and Postgres depth from recent roles.",
        "Direct experience building AI hiring workflow tooling."
      ]
    };

    expect(validateCandidateProfileScore(validScore)).toEqual({
      ok: true,
      data: validScore,
      errors: []
    });
  });

  it("rejects malformed candidate profile score deterministically", async () => {
    const { validateCandidateProfileScore } = await import("@/lib/agents/candidate-intake/schema");

    const invalidScore = {
      requirementFitScores: {
        hardSkills: 1.2,
        roleExperience: 0.84,
        domainContext: 0.78,
        educationSignals: 0.65,
        overall: -0.1
      },
      aggregateScore: 1.2,
      scoreVersion: "",
      evidenceSnippets: ["", "Strong TypeScript depth."]
    };

    expect(validateCandidateProfileScore(invalidScore)).toEqual({
      ok: false,
      data: null,
      errors: [
        "requirementFitScores.hardSkills must be a number between 0 and 1.",
        "requirementFitScores.overall must be a number between 0 and 1.",
        "aggregateScore must be a number between 0 and 1.",
        "scoreVersion is required.",
        "evidenceSnippets must contain only non-empty strings."
      ]
    });
  });
});
