import {
  createOpenAIRequestHeaders,
  type OpenAIClientConfig
} from "@/lib/agents/job-posting/openai-client";
import {
  assembleCandidateExtractionPrompt,
  createStaticCandidateExtractionPromptVersion,
  type PromptVersion
} from "@/lib/agents/candidate-intake/prompts";
import {
  validateCandidateExtractionOutput,
  type CandidateExtractionOutput,
  type CandidateIntakePayload
} from "@/lib/agents/candidate-intake/schema";

type FetchResponse = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export type CandidateExtractionInput = {
  config: OpenAIClientConfig;
  intake: CandidateIntakePayload;
  promptVersion?: PromptVersion;
};

export type CandidateExtractionRequestBody = {
  model: string;
  input: Array<{
    role: "system" | "developer" | "user";
    content: string;
  }>;
  text: {
    format: {
      type: "json_schema";
      name: "candidate_extraction_output";
      strict: true;
      schema: Record<string, unknown>;
    };
  };
  tools: [];
};

export type CandidateExtractionRequest = {
  url: string;
  body: CandidateExtractionRequestBody;
  init: RequestInit;
};

export type CandidateExtractionResult = {
  profile: CandidateExtractionOutput;
  metadata: {
    providerResponseId: string;
    model: string;
    prompt: {
      promptKey: string;
      version: string;
      checksum: string;
    };
  };
};

const CANDIDATE_EXTRACTION_VALIDATION_ERROR_PREFIX =
  "OpenAI candidate extraction returned invalid structured output:";

function buildOpenAIUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function stringArraySchema() {
  return {
    type: "array",
    items: { type: "string" }
  };
}

function candidateExtractionJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["summary", "skills", "workExperience", "education", "confidence"],
    properties: {
      summary: { type: "string" },
      skills: stringArraySchema(),
      workExperience: stringArraySchema(),
      education: stringArraySchema(),
      confidence: {
        type: "object",
        additionalProperties: false,
        required: ["summary", "skills", "workExperience", "education", "overall"],
        properties: {
          summary: { type: "number", minimum: 0, maximum: 1 },
          skills: { type: "number", minimum: 0, maximum: 1 },
          workExperience: { type: "number", minimum: 0, maximum: 1 },
          education: { type: "number", minimum: 0, maximum: 1 },
          overall: { type: "number", minimum: 0, maximum: 1 }
        }
      }
    }
  };
}

export function createCandidateExtractionRequest({
  config,
  intake,
  promptVersion = createStaticCandidateExtractionPromptVersion()
}: CandidateExtractionInput): CandidateExtractionRequest {
  const prompt = assembleCandidateExtractionPrompt({
    promptVersion,
    intake
  });

  const body: CandidateExtractionRequestBody = {
    model: config.model,
    input: prompt.messages,
    text: {
      format: {
        type: "json_schema",
        name: "candidate_extraction_output",
        strict: true,
        schema: candidateExtractionJsonSchema()
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
    throw new Error("OpenAI candidate extraction returned invalid JSON.");
  }
}

export function isCandidateExtractionValidationFailure(error: unknown) {
  return (
    error instanceof Error &&
    error.message.startsWith(CANDIDATE_EXTRACTION_VALIDATION_ERROR_PREFIX)
  );
}

export function extractCandidateExtractionFailureReason(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "unknown_extraction_error";
}

function normalizeStringArray(values: string[]) {
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || normalized.includes(trimmed)) {
      continue;
    }
    normalized.push(trimmed);
  }

  return normalized;
}

function normalizeExtractionOutput(output: CandidateExtractionOutput): CandidateExtractionOutput {
  return {
    summary: output.summary.trim(),
    skills: normalizeStringArray(output.skills),
    workExperience: normalizeStringArray(output.workExperience),
    education: normalizeStringArray(output.education),
    confidence: output.confidence
  };
}

function parseExtractionResponse(
  payload: unknown,
  input: CandidateExtractionInput
): CandidateExtractionResult {
  if (!isRecord(payload) || typeof payload.id !== "string") {
    throw new Error("OpenAI candidate extraction returned an invalid response envelope.");
  }

  const outputText = extractOutputText(payload);

  if (!outputText) {
    throw new Error("OpenAI candidate extraction returned no output text.");
  }

  const validation = validateCandidateExtractionOutput(parseStructuredOutput(outputText));

  if (!validation.ok) {
    throw new Error(
      `OpenAI candidate extraction returned invalid structured output: ${validation.errors.join("; ")}`
    );
  }

  const promptVersion = input.promptVersion ?? createStaticCandidateExtractionPromptVersion();

  return {
    profile: normalizeExtractionOutput(validation.data),
    metadata: {
      providerResponseId: payload.id,
      model: typeof payload.model === "string" ? payload.model : input.config.model,
      prompt: {
        promptKey: promptVersion.promptKey,
        version: promptVersion.version,
        checksum: promptVersion.checksum
      }
    }
  };
}

export async function runCandidateExtraction(
  input: CandidateExtractionInput,
  fetchResponse: FetchResponse = fetch
): Promise<CandidateExtractionResult> {
  const request = createCandidateExtractionRequest(input);
  let response: Response;

  try {
    response = await fetchResponse(request.url, request.init);
  } catch {
    throw new Error("OpenAI candidate extraction request failed.");
  }

  if (!response.ok) {
    throw new Error(`OpenAI candidate extraction failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();

  return parseExtractionResponse(payload, input);
}
