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
      "followUpQuestions"
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
      }
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
