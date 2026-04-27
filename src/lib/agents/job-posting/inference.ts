import {
  createOpenAIRequestHeaders,
  type OpenAIClientConfig
} from "@/lib/agents/job-posting/openai-client";
import {
  assembleJobPostingPrompt,
  createStaticJobCreatorPromptVersion,
  type PromptVersion
} from "@/lib/agents/job-posting/prompts";
import {
  JOB_POSTING_FIELD_SOURCES,
  validateJobPostingAgentOutput,
  type JobPostingAgentOutput
} from "@/lib/agents/job-posting/schema";
import type { ProviderStreamEvent } from "@/lib/agents/job-posting/streaming";

type FetchResponse = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export type JobPostingInferenceInput = {
  config: OpenAIClientConfig;
  employerPrompt: string;
  promptVersion?: PromptVersion;
  locale?: string;
  tenantOverlay?: string;
};

export type JobPostingInferenceRequestBody = {
  model: string;
  input: Array<{
    role: "system" | "developer" | "user";
    content: string;
  }>;
  text: {
    format: {
      type: "json_schema";
      name: string;
      strict: true;
      schema: Record<string, unknown>;
    };
  };
  tools: [];
  stream?: boolean;
};

export type JobPostingInferenceRequest = {
  url: string;
  body: JobPostingInferenceRequestBody;
  init: RequestInit;
};

export type JobPostingInferenceResult = {
  output: JobPostingAgentOutput;
  providerResponseId: string;
  model: string;
  prompt: {
    promptKey: string;
    version: string;
    checksum: string;
  };
};

export type JobPostingInferenceStreamEvent =
  | Exclude<ProviderStreamEvent, { type: "complete" }>
  | { type: "result"; result: JobPostingInferenceResult };

function buildOpenAIUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function fieldSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["value", "source", "confidence"],
    properties: {
      value: { type: "string" },
      source: {
        type: "string",
        enum: [...JOB_POSTING_FIELD_SOURCES]
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1
      }
    }
  };
}

function stringArraySchema() {
  return {
    type: "array",
    items: { type: "string" }
  };
}

function jobPostingAgentOutputJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "department",
      "level",
      "location",
      "employmentType",
      "compensationBand",
      "hiringProblem",
      "outcomes",
      "responsibilities",
      "requirements",
      "niceToHave",
      "interviewLoop",
      "draftDescription",
      "assumptions",
      "missingCriticalFields",
      "followUpQuestions",
      "reasoningSummary",
      "thinkingMessages",
      "actionLog"
    ],
    properties: {
      title: fieldSchema(),
      department: fieldSchema(),
      level: fieldSchema(),
      location: fieldSchema(),
      employmentType: fieldSchema(),
      compensationBand: fieldSchema(),
      hiringProblem: { type: "string" },
      outcomes: stringArraySchema(),
      responsibilities: stringArraySchema(),
      requirements: stringArraySchema(),
      niceToHave: stringArraySchema(),
      interviewLoop: stringArraySchema(),
      draftDescription: { type: "string" },
      assumptions: stringArraySchema(),
      missingCriticalFields: stringArraySchema(),
      followUpQuestions: {
        type: "array",
        maxItems: 3,
        items: { type: "string" }
      },
      reasoningSummary: stringArraySchema(),
      thinkingMessages: stringArraySchema(),
      actionLog: stringArraySchema()
    }
  };
}

export function createJobPostingInferenceRequest({
  config,
  employerPrompt,
  promptVersion = createStaticJobCreatorPromptVersion(),
  locale,
  tenantOverlay
}: JobPostingInferenceInput): JobPostingInferenceRequest {
  const prompt = assembleJobPostingPrompt({
    promptVersion,
    employerPrompt,
    locale,
    tenantOverlay
  });
  const body: JobPostingInferenceRequestBody = {
    model: config.model,
    input: prompt.messages,
    text: {
      format: {
        type: "json_schema",
        name: "job_posting_agent_output",
        strict: true,
        schema: jobPostingAgentOutputJsonSchema()
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

function parseStructuredOutput(outputText: string) {
  try {
    return JSON.parse(outputText) as unknown;
  } catch {
    throw new Error("OpenAI job posting inference returned invalid JSON.");
  }
}

function parseInferencePayload(
  payload: unknown,
  input: JobPostingInferenceInput
): JobPostingInferenceResult {
  if (!isRecord(payload) || typeof payload.id !== "string") {
    throw new Error("OpenAI job posting inference returned an invalid response envelope.");
  }

  const outputText = extractOutputText(payload);

  if (!outputText) {
    throw new Error("OpenAI job posting inference returned no output text.");
  }

  const validation = validateJobPostingAgentOutput(parseStructuredOutput(outputText));

  if (!validation.ok) {
    throw new Error(
      `OpenAI job posting inference returned invalid structured output: ${validation.errors.join("; ")}`
    );
  }

  const promptVersion = input.promptVersion ?? createStaticJobCreatorPromptVersion();

  return {
    output: validation.data,
    providerResponseId: payload.id,
    model: typeof payload.model === "string" ? payload.model : input.config.model,
    prompt: {
      promptKey: promptVersion.promptKey,
      version: promptVersion.version,
      checksum: promptVersion.checksum
    }
  };
}

function parseSseDataLines(frame: string) {
  return frame
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice("data: ".length));
}

function extractCompletedResponseEnvelope(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  if (value.type !== "response.completed" || !isRecord(value.response)) {
    return null;
  }

  return value.response;
}

function extractDeltaToken(value: unknown) {
  if (!isRecord(value) || value.type !== "response.output_text.delta") {
    return null;
  }

  return typeof value.delta === "string" ? value.delta : null;
}

function extractErrorMessage(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  if (value.type === "error" && typeof value.message === "string") {
    return value.message;
  }

  if (
    value.type === "response.error" &&
    isRecord(value.error) &&
    typeof value.error.message === "string"
  ) {
    return value.error.message;
  }

  return null;
}

export async function runJobPostingInference(
  input: JobPostingInferenceInput,
  fetchResponse: FetchResponse = fetch
): Promise<JobPostingInferenceResult> {
  const request = createJobPostingInferenceRequest(input);
  let response: Response;

  try {
    response = await fetchResponse(request.url, request.init);
  } catch {
    throw new Error("OpenAI job posting inference request failed.");
  }

  if (!response.ok) {
    throw new Error(`OpenAI job posting inference failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();

  return parseInferencePayload(payload, input);
}

export function createJobPostingInferenceStreamRequest(
  input: JobPostingInferenceInput
): JobPostingInferenceRequest {
  const request = createJobPostingInferenceRequest(input);
  const body = {
    ...request.body,
    stream: true
  } satisfies JobPostingInferenceRequestBody;

  return {
    url: request.url,
    body,
    init: {
      ...request.init,
      body: JSON.stringify(body)
    }
  };
}

export async function* streamJobPostingInference(
  input: JobPostingInferenceInput,
  fetchResponse: FetchResponse = fetch
): AsyncGenerator<JobPostingInferenceStreamEvent> {
  const request = createJobPostingInferenceStreamRequest(input);
  let response: Response;

  try {
    response = await fetchResponse(request.url, request.init);
  } catch {
    throw new Error("OpenAI job posting inference request failed.");
  }

  if (!response.ok) {
    throw new Error(`OpenAI job posting inference failed with status ${response.status}.`);
  }

  if (!response.body) {
    throw new Error("OpenAI job posting inference stream is unavailable.");
  }

  yield {
    type: "status",
    message: "Streaming inference started."
  };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    while (buffer.includes("\n\n")) {
      const boundary = buffer.indexOf("\n\n");
      const frame = buffer.slice(0, boundary + 2);
      buffer = buffer.slice(boundary + 2);

      for (const dataLine of parseSseDataLines(frame)) {
        if (dataLine === "[DONE]") {
          continue;
        }

        let payload: unknown;

        try {
          payload = JSON.parse(dataLine) as unknown;
        } catch {
          continue;
        }

        const errorMessage = extractErrorMessage(payload);
        if (errorMessage) {
          throw new Error(`OpenAI job posting inference stream failed: ${errorMessage}`);
        }

        const token = extractDeltaToken(payload);
        if (token) {
          yield {
            type: "token",
            token
          };
          continue;
        }

        const completedEnvelope = extractCompletedResponseEnvelope(payload);
        if (completedEnvelope) {
          const result = parseInferencePayload(completedEnvelope, input);
          yield {
            type: "status",
            message: "Streaming inference completed."
          };
          yield {
            type: "result",
            result
          };
          completed = true;
          return;
        }
      }
    }
  }

  if (!completed) {
    throw new Error("OpenAI job posting inference stream ended before completion.");
  }
}

export function getThinkingMessagesForStreaming(output: Pick<JobPostingAgentOutput, "thinkingMessages">) {
  const sanitized = output.thinkingMessages
    .map((message) => message.trim())
    .filter((message) => message.length > 0);

  if (sanitized.length) {
    return sanitized;
  }

  return [
    "Analyzed the hiring prompt and inferred role structure.",
    "Drafted responsibilities, requirements, and interview loop.",
    "Prepared follow-up questions only for publishing-critical gaps."
  ];
}
