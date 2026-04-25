export const DEFAULT_OPENAI_MODEL = "gpt-5.5";
export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

type EnvSource = Record<string, string | undefined>;

export type OpenAIClientConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

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
