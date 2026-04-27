import { describe, expect, it } from "vitest";

import {
  createEmployerAssistantOrchestrationRequest,
  runEmployerAssistantOrchestration
} from "@/lib/agents/employer-assistant/orchestrator";
import { createStaticEmployerAssistantPromptVersion } from "@/lib/agents/employer-assistant/prompts";
import type { OpenAIClientConfig } from "@/lib/agents/job-posting/openai-client";

const config: OpenAIClientConfig = {
  apiKey: "sk-test-key",
  model: "gpt-5.5",
  baseUrl: "https://api.openai.test/v1"
};

const context = {
  employerJobId: "job_123",
  candidateProfileId: "cp_456",
  job: {
    title: "Senior AI Product Engineer",
    requirements: [
      "Own distributed system architecture decisions.",
      "Deliver reliable TypeScript + Postgres services.",
      "Lead incident response with product communication."
    ]
  },
  candidate: {
    summary: "Strong backend profile with missing architecture depth examples.",
    skills: ["TypeScript", "Postgres"],
    aggregateScore: 0.74,
    evidenceSnippets: ["Led API design for hiring workflow platform."],
    missingSignals: ["system_design_depth"]
  }
} as const;

const validRecommendation = {
  action: "screen_candidate",
  rationale: "Candidate has moderate fit and should be screened for missing architecture evidence.",
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
      message: "Candidate appears promising but requires structured screening for confirmation."
    }
  ]
} as const;

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

describe("employer assistant orchestrator request builder", () => {
  it("builds a Responses API request with strict recommendation schema", () => {
    const request = createEmployerAssistantOrchestrationRequest({
      config,
      promptVersion: createStaticEmployerAssistantPromptVersion("system policy body"),
      context
    });

    expect(request.url).toBe("https://api.openai.test/v1/responses");
    expect(request.init.method).toBe("POST");
    expect(request.init.headers).toEqual({
      Authorization: "Bearer sk-test-key",
      "Content-Type": "application/json"
    });
    expect(request.body.model).toBe("gpt-5.5");
    expect(request.body.tools).toEqual([]);
    expect(request.body.input.map((message) => message.role)).toEqual([
      "system",
      "developer",
      "developer",
      "user"
    ]);
    expect(request.body.input.at(-1)?.content).toContain("<untrusted_recruiting_context>");

    expect(request.body.text.format).toMatchObject({
      type: "json_schema",
      name: "employer_assistant_recommendation",
      strict: true
    });

    const schema = request.body.text.format.schema as Record<string, unknown>;
    expect(schema.required).toEqual(["action", "rationale", "evidenceReferences", "riskFlags"]);
    expect((schema.properties as Record<string, unknown>).screeningKit).toBeDefined();
  });

  it("includes bounded action enum and optional screening kit question contracts", () => {
    const request = createEmployerAssistantOrchestrationRequest({
      config,
      promptVersion: createStaticEmployerAssistantPromptVersion("system policy body"),
      context
    });

    const schema = request.body.text.format.schema as {
      properties: Record<string, unknown>;
    };

    const action = (schema.properties.action as { enum: string[] }).enum;
    expect(action).toEqual([
      "screen_candidate",
      "request_more_signal",
      "review_candidate",
      "improve_job_requirements"
    ]);

    const screeningKit = schema.properties.screeningKit as {
      required: string[];
      properties: Record<string, unknown>;
    };
    expect(screeningKit.required).toEqual(["title", "objective", "questions"]);

    const questions = screeningKit.properties.questions as {
      items: { required: string[] };
    };
    expect(questions.items.required).toEqual([
      "question",
      "competency",
      "intent",
      "rubricDimension",
      "uncertaintyFlag"
    ]);
  });

  it("returns validated model recommendation without fallback when first attempt succeeds", async () => {
    const fetchResponse = async () =>
      response(200, {
        id: "resp_ok_1",
        model: "gpt-5.5",
        output_text: JSON.stringify(validRecommendation)
      });

    await expect(
      runEmployerAssistantOrchestration(
        {
          config,
          promptVersion: createStaticEmployerAssistantPromptVersion("system policy body"),
          context
        },
        fetchResponse
      )
    ).resolves.toEqual({
      recommendation: validRecommendation,
      metadata: {
        providerResponseId: "resp_ok_1",
        model: "gpt-5.5",
        prompt: {
          promptKey: "employer_recruiting_assistant_system_prompt",
          version: "v1",
          checksum: expect.any(String)
        },
        attempts: 1,
        fallbackUsed: false,
        failureReason: null
      }
    });
  });

  it("retries malformed model output and succeeds within bounded attempts", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchResponse = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });

      if (calls.length === 1) {
        return response(200, {
          id: "resp_bad_1",
          model: "gpt-5.5",
          output_text: JSON.stringify({
            action: "invalid_action",
            rationale: "bad payload",
            evidenceReferences: [],
            riskFlags: []
          })
        });
      }

      return response(200, {
        id: "resp_ok_2",
        model: "gpt-5.5",
        output_text: JSON.stringify(validRecommendation)
      });
    };

    const result = await runEmployerAssistantOrchestration(
      {
        config,
        promptVersion: createStaticEmployerAssistantPromptVersion("system policy body"),
        context,
        maxModelAttempts: 2
      },
      fetchResponse
    );

    expect(calls).toHaveLength(2);
    expect(result.metadata.attempts).toBe(2);
    expect(result.metadata.fallbackUsed).toBe(false);
    expect(result.metadata.failureReason).toBeNull();
    expect(result.metadata.providerResponseId).toBe("resp_ok_2");
  });

  it("falls back to deterministic advisor with explicit failure reason after retry exhaustion", async () => {
    const fetchResponse = async () =>
      response(200, {
        id: "resp_bad_schema",
        model: "gpt-5.5",
        output_text: JSON.stringify({
          action: "invalid_action",
          rationale: "",
          evidenceReferences: "bad",
          riskFlags: []
        })
      });

    const result = await runEmployerAssistantOrchestration(
      {
        config,
        promptVersion: createStaticEmployerAssistantPromptVersion("system policy body"),
        context,
        maxModelAttempts: 2
      },
      fetchResponse
    );

    expect(result.metadata.attempts).toBe(2);
    expect(result.metadata.fallbackUsed).toBe(true);
    expect(result.metadata.failureReason).toBe("schema_validation_failed_after_retries");
    expect(result.metadata.providerResponseId).toBeNull();
    expect(["screen_candidate", "request_more_signal", "review_candidate", "improve_job_requirements"]).toContain(
      result.recommendation.action
    );
  });
});
