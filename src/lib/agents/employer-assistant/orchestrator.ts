import {
  adviseEmployerNextStep,
  type EmployerAssistantAdvisorInput
} from "@/lib/agents/employer-assistant/advisor";
import {
  assembleEmployerAssistantPrompt,
  createStaticEmployerAssistantPromptVersion,
  type AssembleEmployerAssistantPromptInput,
  type PromptVersion
} from "@/lib/agents/employer-assistant/prompts";
import { generateEmployerAssistantScreeningKit } from "@/lib/agents/employer-assistant/screening-kit";
import {
  EMPLOYER_ASSISTANT_ACTIONS,
  EMPLOYER_ASSISTANT_EVIDENCE_SOURCES,
  EMPLOYER_ASSISTANT_RISK_SEVERITIES,
  validateEmployerAssistantRecommendation,
  type EmployerAssistantRecommendation
} from "@/lib/agents/employer-assistant/schema";
import {
  createOpenAIRequestHeaders,
  type OpenAIClientConfig
} from "@/lib/agents/job-posting/openai-client";

export type EmployerAssistantOrchestrationInput = {
  config: OpenAIClientConfig;
  context: AssembleEmployerAssistantPromptInput["context"];
  promptVersion?: PromptVersion;
  tenantOverlay?: string;
  maxModelAttempts?: number;
};

export type EmployerAssistantOrchestrationRequestBody = {
  model: string;
  input: Array<{
    role: "system" | "developer" | "user";
    content: string;
  }>;
  text: {
    format: {
      type: "json_schema";
      name: "employer_assistant_recommendation";
      strict: true;
      schema: Record<string, unknown>;
    };
  };
  tools: [];
};

export type EmployerAssistantOrchestrationRequest = {
  url: string;
  body: EmployerAssistantOrchestrationRequestBody;
  init: RequestInit;
};

type FetchResponse = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

type OrchestrationFailureReason =
  | "request_failed"
  | "http_error"
  | "invalid_response_payload"
  | "invalid_response_envelope"
  | "no_output_text"
  | "invalid_json"
  | "schema_validation_failed";

export type EmployerAssistantOrchestrationResult = {
  recommendation: EmployerAssistantRecommendation;
  metadata: {
    providerResponseId: string | null;
    model: string;
    prompt: {
      promptKey: string;
      version: string;
      checksum: string;
    };
    attempts: number;
    fallbackUsed: boolean;
    failureReason: string | null;
  };
};

function buildOpenAIUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function recommendationSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["action", "rationale", "evidenceReferences", "riskFlags"],
    properties: {
      action: {
        type: "string",
        enum: [...EMPLOYER_ASSISTANT_ACTIONS]
      },
      rationale: {
        type: "string"
      },
      evidenceReferences: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["sourceType", "referenceId", "quote", "relevance"],
          properties: {
            sourceType: {
              type: "string",
              enum: [...EMPLOYER_ASSISTANT_EVIDENCE_SOURCES]
            },
            referenceId: {
              type: "string"
            },
            quote: {
              type: "string"
            },
            relevance: {
              type: "number",
              minimum: 0,
              maximum: 1
            }
          }
        }
      },
      riskFlags: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["code", "severity", "message"],
          properties: {
            code: {
              type: "string"
            },
            severity: {
              type: "string",
              enum: [...EMPLOYER_ASSISTANT_RISK_SEVERITIES]
            },
            message: {
              type: "string"
            },
            mitigation: {
              type: "string"
            }
          }
        }
      },
      screeningKit: {
        type: "object",
        additionalProperties: false,
        required: ["title", "objective", "questions"],
        properties: {
          title: {
            type: "string"
          },
          objective: {
            type: "string"
          },
          questions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "question",
                "competency",
                "intent",
                "rubricDimension",
                "uncertaintyFlag"
              ],
              properties: {
                question: {
                  type: "string"
                },
                competency: {
                  type: "string"
                },
                intent: {
                  type: "string"
                },
                rubricDimension: {
                  type: "string"
                },
                uncertaintyFlag: {
                  type: "boolean"
                }
              }
            }
          }
        }
      }
    }
  };
}

function clampAttempts(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 2;
  }

  return Math.max(1, Math.min(4, Math.floor(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractOutputText(payload: unknown) {
  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) {
    return null;
  }

  for (const item of payload.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (
        isRecord(content) &&
        content.type === "output_text" &&
        typeof content.text === "string"
      ) {
        return content.text;
      }
    }
  }

  return null;
}

function buildFallbackRecommendation(context: AssembleEmployerAssistantPromptInput["context"]) {
  const advisorInput: EmployerAssistantAdvisorInput = {
    jobRequirementsText: context.job.requirements.join("\n"),
    candidateSummary: context.candidate.summary,
    aggregateScore:
      typeof context.candidate.aggregateScore === "number"
        ? context.candidate.aggregateScore
        : null,
    overallConfidence:
      typeof context.candidate.aggregateScore === "number"
        ? context.candidate.aggregateScore
        : null,
    scoreEvidenceSnippets: context.candidate.evidenceSnippets ?? [],
    missingSignals: context.candidate.missingSignals ?? []
  };

  const recommendation = adviseEmployerNextStep(advisorInput);

  if (
    recommendation.action === "screen_candidate" ||
    recommendation.action === "request_more_signal"
  ) {
    return {
      ...recommendation,
      screeningKit: generateEmployerAssistantScreeningKit({
        action: recommendation.action,
        jobRequirementsText: advisorInput.jobRequirementsText,
        candidateSummary: advisorInput.candidateSummary,
        missingSignals: advisorInput.missingSignals
      })
    } satisfies EmployerAssistantRecommendation;
  }

  return recommendation;
}

function mapRetryExhaustedReason(reason: OrchestrationFailureReason | null) {
  if (!reason) {
    return "model_attempts_exhausted";
  }

  return `${reason}_after_retries`;
}

export function createEmployerAssistantOrchestrationRequest({
  config,
  context,
  promptVersion = createStaticEmployerAssistantPromptVersion(),
  tenantOverlay
}: EmployerAssistantOrchestrationInput): EmployerAssistantOrchestrationRequest {
  const prompt = assembleEmployerAssistantPrompt({
    promptVersion,
    context,
    tenantOverlay
  });

  const body: EmployerAssistantOrchestrationRequestBody = {
    model: config.model,
    input: prompt.messages,
    text: {
      format: {
        type: "json_schema",
        name: "employer_assistant_recommendation",
        strict: true,
        schema: recommendationSchema()
      }
    },
    tools: []
  };

  return {
    url: buildOpenAIUrl(config.baseUrl, "/responses"),
    body,
    init: {
      method: "POST",
      headers: createOpenAIRequestHeaders(config.apiKey),
      body: JSON.stringify(body)
    }
  };
}

export async function runEmployerAssistantOrchestration(
  input: EmployerAssistantOrchestrationInput,
  fetchResponse: FetchResponse = fetch
): Promise<EmployerAssistantOrchestrationResult> {
  const promptVersion = input.promptVersion ?? createStaticEmployerAssistantPromptVersion();
  const maxModelAttempts = clampAttempts(input.maxModelAttempts);
  let attempts = 0;
  let lastFailureReason: OrchestrationFailureReason | null = null;

  while (attempts < maxModelAttempts) {
    attempts += 1;
    const request = createEmployerAssistantOrchestrationRequest({
      ...input,
      promptVersion
    });

    let response: Response;

    try {
      response = await fetchResponse(request.url, request.init);
    } catch {
      lastFailureReason = "request_failed";
      continue;
    }

    if (!response.ok) {
      lastFailureReason = "http_error";
      continue;
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      lastFailureReason = "invalid_response_payload";
      continue;
    }

    if (!isRecord(payload) || typeof payload.id !== "string") {
      lastFailureReason = "invalid_response_envelope";
      continue;
    }

    const outputText = extractOutputText(payload);

    if (!outputText) {
      lastFailureReason = "no_output_text";
      continue;
    }

    let structuredOutput: unknown;
    try {
      structuredOutput = JSON.parse(outputText) as unknown;
    } catch {
      lastFailureReason = "invalid_json";
      continue;
    }

    const validation = validateEmployerAssistantRecommendation(structuredOutput);
    if (!validation.ok) {
      lastFailureReason = "schema_validation_failed";
      continue;
    }

    return {
      recommendation: validation.data,
      metadata: {
        providerResponseId: payload.id,
        model: typeof payload.model === "string" ? payload.model : input.config.model,
        prompt: {
          promptKey: promptVersion.promptKey,
          version: promptVersion.version,
          checksum: promptVersion.checksum
        },
        attempts,
        fallbackUsed: false,
        failureReason: null
      }
    };
  }

  return {
    recommendation: buildFallbackRecommendation(input.context),
    metadata: {
      providerResponseId: null,
      model: input.config.model,
      prompt: {
        promptKey: promptVersion.promptKey,
        version: promptVersion.version,
        checksum: promptVersion.checksum
      },
      attempts,
      fallbackUsed: true,
      failureReason: mapRetryExhaustedReason(lastFailureReason)
    }
  };
}
