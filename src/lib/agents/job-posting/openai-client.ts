export const DEFAULT_OPENAI_MODEL = "gpt-5.5";
export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

type EnvSource = Record<string, string | undefined>;

export type OpenAIClientConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

export type OpenAIModelAvailabilityResult =
  | {
      available: true;
      model: string;
    }
  | {
      available: false;
      model: string;
      error: string;
    };

type FetchModelList = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

function readServerEnv(env: EnvSource, key: "OPENAI_API_KEY") {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required server environment variable: ${key}`);
  }

  return value;
}

function readOptionalServerEnv(env: EnvSource, key: "OPENAI_MODEL" | "OPENAI_BASE_URL") {
  const value = env[key]?.trim();

  return value || null;
}

export function getOpenAIClientConfig(
  env: EnvSource = process.env as EnvSource
): OpenAIClientConfig {
  return {
    apiKey: readServerEnv(env, "OPENAI_API_KEY"),
    model: readOptionalServerEnv(env, "OPENAI_MODEL") ?? DEFAULT_OPENAI_MODEL,
    baseUrl: readOptionalServerEnv(env, "OPENAI_BASE_URL") ?? DEFAULT_OPENAI_BASE_URL
  };
}

export function createOpenAIRequestHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
}

function buildOpenAIUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function isModelListResponse(value: unknown): value is { data: Array<{ id: string }> } {
  if (typeof value !== "object" || value === null || !("data" in value)) {
    return false;
  }

  const data = (value as { data: unknown }).data;

  return Array.isArray(data) && data.every((item) => {
    return (
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      typeof (item as { id: unknown }).id === "string"
    );
  });
}

export async function checkOpenAIModelAvailability(
  config: OpenAIClientConfig,
  fetchModelList: FetchModelList = fetch
): Promise<OpenAIModelAvailabilityResult> {
  let response: Response;

  try {
    response = await fetchModelList(buildOpenAIUrl(config.baseUrl, "/models"), {
      method: "GET",
      headers: createOpenAIRequestHeaders(config.apiKey)
    });
  } catch {
    return {
      available: false,
      model: config.model,
      error: "OpenAI model preflight request failed."
    };
  }

  if (!response.ok) {
    return {
      available: false,
      model: config.model,
      error: `OpenAI model preflight failed with status ${response.status}.`
    };
  }

  const payload: unknown = await response.json();

  if (!isModelListResponse(payload)) {
    return {
      available: false,
      model: config.model,
      error: "OpenAI model preflight returned an invalid model list."
    };
  }

  if (!payload.data.some((model) => model.id === config.model)) {
    return {
      available: false,
      model: config.model,
      error: `Configured OpenAI model ${config.model} is not available to this account.`
    };
  }

  return {
    available: true,
    model: config.model
  };
}
