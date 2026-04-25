import { describe, expect, it } from "vitest";

import {
  createJobPostingInferenceRequest,
  runJobPostingInference
} from "@/lib/agents/job-posting/inference";
import type { OpenAIClientConfig } from "@/lib/agents/job-posting/openai-client";
import {
  createPromptChecksum,
  createStaticJobCreatorPromptVersion
} from "@/lib/agents/job-posting/prompts";
import type { JobPostingAgentOutput } from "@/lib/agents/job-posting/schema";

const config: OpenAIClientConfig = {
  apiKey: "sk-test-key",
  model: "gpt-5.5",
  baseUrl: "https://api.openai.test/v1"
};

const promptVersion = createStaticJobCreatorPromptVersion("system policy body");

const validOutput: JobPostingAgentOutput = {
  title: {
    value: "Senior Full-Stack AI Product Engineer",
    source: "inferred",
    confidence: 0.93
  },
  department: {
    value: "Engineering",
    source: "inferred",
    confidence: 0.91
  },
  level: {
    value: "Senior",
    source: "inferred",
    confidence: 0.88
  },
  location: {
    value: "Remote",
    source: "user_provided",
    confidence: 1
  },
  employmentType: {
    value: "Full-time",
    source: "defaulted",
    confidence: 0.55
  },
  compensationBand: {
    value: "To be confirmed",
    source: "missing",
    confidence: 0
  },
  hiringProblem: "Build a prompt-first AI hiring workflow for employers.",
  outcomes: ["Ship reliable job posting generation.", "Create auditable agent traces."],
  responsibilities: ["Own full-stack product features.", "Design LLM workflow boundaries."],
  requirements: ["Next.js, Supabase, Postgres, and LLM workflow experience."],
  niceToHave: ["Recruiting product experience."],
  interviewLoop: ["Recruiter screen", "Technical interview", "Final product review"],
  draftDescription: "Senior Full-Stack AI Product Engineer\n\nAbout the role\nBuild AI hiring workflows.",
  assumptions: ["Department inferred as Engineering from the technical scope."],
  missingCriticalFields: ["compensationBand"],
  followUpQuestions: ["What compensation range should appear on the posting?"]
};

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

describe("job posting inference", () => {
  it("builds a Responses API request with structured JSON schema output", () => {
    const request = createJobPostingInferenceRequest({
      config,
      promptVersion,
      employerPrompt: "We need a senior engineer for our AI interview product."
    });

    expect(request.url).toBe("https://api.openai.test/v1/responses");
    expect(request.init.method).toBe("POST");
    expect(request.init.headers).toEqual({
      Authorization: "Bearer sk-test-key",
      "Content-Type": "application/json"
    });
    expect(request.body.model).toBe("gpt-5.5");
    expect(request.body.input.map((message) => message.role)).toEqual([
      "system",
      "developer",
      "developer",
      "user"
    ]);
    expect(request.body.input[3].content).toContain("<untrusted_employer_prompt>");
    expect(request.body.text.format).toMatchObject({
      type: "json_schema",
      name: "job_posting_agent_output",
      strict: true
    });
    expect(request.body.text.format.schema.required).toContain("title");
    expect(request.body.tools).toEqual([]);
  });

  it("calls the real Responses API path and returns validated agent output with audit metadata", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchResponse = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });

      return response(200, {
        id: "resp_123",
        model: "gpt-5.5",
        output_text: JSON.stringify(validOutput)
      });
    };

    await expect(
      runJobPostingInference(
        {
          config,
          promptVersion,
          employerPrompt: "We need a senior engineer for our AI interview product."
        },
        fetchResponse
      )
    ).resolves.toEqual({
      output: validOutput,
      providerResponseId: "resp_123",
      model: "gpt-5.5",
      prompt: {
        promptKey: "job_creator_agent_system_prompt",
        version: "v1",
        checksum: createPromptChecksum("system policy body")
      }
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.openai.test/v1/responses");
  });

  it("rejects provider errors without exposing the API key or raw provider body", async () => {
    const fetchResponse = async () =>
      response(429, {
        error: {
          message: "Rate limited for key sk-test-key"
        }
      });

    await expect(
      runJobPostingInference(
        {
          config,
          promptVersion,
          employerPrompt: "We need a senior engineer."
        },
        fetchResponse
      )
    ).rejects.toThrow("OpenAI job posting inference failed with status 429.");
  });

  it("rejects invalid JSON response text", async () => {
    const fetchResponse = async () =>
      response(200, {
        id: "resp_bad_json",
        model: "gpt-5.5",
        output_text: "{not-json"
      });

    await expect(
      runJobPostingInference(
        {
          config,
          promptVersion,
          employerPrompt: "We need a senior engineer."
        },
        fetchResponse
      )
    ).rejects.toThrow("OpenAI job posting inference returned invalid JSON.");
  });

  it("rejects structured output that fails the job posting schema", async () => {
    const fetchResponse = async () =>
      response(200, {
        id: "resp_invalid_schema",
        model: "gpt-5.5",
        output_text: JSON.stringify({
          ...validOutput,
          title: {
            value: "",
            source: "guessed",
            confidence: 2
          }
        })
      });

    await expect(
      runJobPostingInference(
        {
          config,
          promptVersion,
          employerPrompt: "We need a senior engineer."
        },
        fetchResponse
      )
    ).rejects.toThrow(
      "OpenAI job posting inference returned invalid structured output: title.value is required.; title.source must be one of user_provided, inferred, defaulted, missing.; title.confidence must be a number between 0 and 1."
    );
  });
});
