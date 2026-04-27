import { describe, expect, it } from "vitest";

import {
  assembleCandidateExtractionPrompt,
  createStaticCandidateExtractionPromptVersion
} from "@/lib/agents/candidate-intake/prompts";
import { createCandidateExtractionRequest, runCandidateExtraction } from "@/lib/agents/candidate-intake/extraction";
import type { OpenAIClientConfig } from "@/lib/agents/job-posting/openai-client";
import type { CandidateIntakePayload } from "@/lib/agents/candidate-intake/schema";

const config: OpenAIClientConfig = {
  apiKey: "sk-test-key",
  model: "gpt-5.5",
  baseUrl: "https://api.openai.test/v1"
};

const intakePayload: CandidateIntakePayload = {
  employerUserId: "u-1",
  employerJobId: "job-1",
  fullName: "Jamie Rivera",
  email: "jamie.private@example.com",
  phone: "+1-555-0100",
  resume: {
    storagePath: "employers/u-1/jobs/job-1/candidates/jamie.pdf",
    fileName: "jamie.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 1024
  },
  sourceText:
    "Senior backend engineer with 8 years of experience. Built AI-enabled hiring workflows in regulated environments."
};

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

describe("candidate extraction prompts", () => {
  it("assembles scoped prompt context from allowed candidate content only", () => {
    const promptVersion = createStaticCandidateExtractionPromptVersion("candidate system prompt");
    const assembled = assembleCandidateExtractionPrompt({
      promptVersion,
      intake: intakePayload
    });

    expect(assembled.messages.map((message) => message.role)).toEqual([
      "system",
      "developer",
      "developer",
      "user"
    ]);

    const userContent = assembled.messages[3].content;

    expect(userContent).toContain("<untrusted_candidate_content>");
    expect(userContent).toContain("Candidate Name: Jamie Rivera");
    expect(userContent).toContain("Senior backend engineer");

    expect(userContent).not.toContain("jamie.private@example.com");
    expect(userContent).not.toContain("+1-555-0100");
    expect(userContent).not.toContain("employers/u-1/jobs/job-1/candidates/jamie.pdf");
    expect(userContent).not.toContain("u-1");
    expect(userContent).not.toContain("job-1");
  });
});

describe("candidate extraction inference", () => {
  it("keeps request payload free of candidate contact identifiers and storage paths", () => {
    const request = createCandidateExtractionRequest({
      config,
      intake: intakePayload,
      promptVersion: createStaticCandidateExtractionPromptVersion("candidate system prompt")
    });

    const payload = JSON.stringify(request.body.input);

    expect(payload).not.toContain("jamie.private@example.com");
    expect(payload).not.toContain("+1-555-0100");
    expect(payload).not.toContain("employers/u-1/jobs/job-1/candidates/jamie.pdf");
  });

  it("keeps request payload free of tenancy identifiers and scoring internals", () => {
    const request = createCandidateExtractionRequest({
      config,
      intake: intakePayload,
      promptVersion: createStaticCandidateExtractionPromptVersion("candidate system prompt")
    });

    const payload = JSON.stringify(request.body);

    expect(payload).not.toContain("employerUserId");
    expect(payload).not.toContain("employerJobId");
    expect(payload).not.toContain("\"u-1\"");
    expect(payload).not.toContain("\"job-1\"");
    expect(payload).not.toContain("scoreComputationChecksum");
    expect(payload).not.toContain("scorerModelId");
  });

  it("builds a Responses API request with candidate extraction schema", () => {
    const request = createCandidateExtractionRequest({
      config,
      intake: intakePayload,
      promptVersion: createStaticCandidateExtractionPromptVersion("candidate system prompt")
    });

    expect(request.url).toBe("https://api.openai.test/v1/responses");
    expect(request.init.method).toBe("POST");
    expect(request.body.text.format).toMatchObject({
      type: "json_schema",
      name: "candidate_extraction_output",
      strict: true
    });
    expect(request.body.tools).toEqual([]);
    expect(request.body.input.at(-1)?.content).toContain("<untrusted_candidate_content>");
  });

  it("returns validated normalized profile output and extraction metadata", async () => {
    const fetchResponse = async () =>
      response(200, {
        id: "resp_candidate_1",
        model: "gpt-5.5",
        output_text: JSON.stringify({
          summary: "  Senior backend engineer focused on hiring automation.  ",
          skills: ["TypeScript", " Postgres ", "TypeScript"],
          workExperience: [" Led AI hiring workflow rollout. ", "Led AI hiring workflow rollout."],
          education: ["B.S. Computer Science"],
          confidence: {
            summary: 0.92,
            skills: 0.89,
            workExperience: 0.86,
            education: 0.8,
            overall: 0.88
          }
        })
      });

    await expect(
      runCandidateExtraction({
        config,
        intake: intakePayload,
        promptVersion: createStaticCandidateExtractionPromptVersion("candidate system prompt")
      }, fetchResponse)
    ).resolves.toEqual({
      profile: {
        summary: "Senior backend engineer focused on hiring automation.",
        skills: ["TypeScript", "Postgres"],
        workExperience: ["Led AI hiring workflow rollout."],
        education: ["B.S. Computer Science"],
        confidence: {
          summary: 0.92,
          skills: 0.89,
          workExperience: 0.86,
          education: 0.8,
          overall: 0.88
        }
      },
      metadata: {
        providerResponseId: "resp_candidate_1",
        model: "gpt-5.5",
        prompt: {
          promptKey: "candidate_profile_extraction_system_prompt",
          version: "v1",
          checksum: expect.any(String)
        }
      }
    });
  });

  it("fails when structured output does not match candidate schema", async () => {
    const fetchResponse = async () =>
      response(200, {
        id: "resp_candidate_bad",
        model: "gpt-5.5",
        output_text: JSON.stringify({
          summary: "",
          skills: ["TypeScript"],
          workExperience: ["Built hiring workflow tooling."],
          education: ["BSCS"],
          confidence: {
            summary: 0.9,
            skills: 0.9,
            workExperience: 2,
            education: 0.8,
            overall: 0.7
          }
        })
      });

    await expect(
      runCandidateExtraction(
        {
          config,
          intake: intakePayload,
          promptVersion: createStaticCandidateExtractionPromptVersion("candidate system prompt")
        },
        fetchResponse
      )
    ).rejects.toThrow(
      "OpenAI candidate extraction returned invalid structured output: summary is required.; confidence.workExperience must be a number between 0 and 1."
    );
  });
});
