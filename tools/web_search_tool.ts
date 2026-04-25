export const DEFAULT_PERPLEXITY_BASE_URL = "https://api.perplexity.ai";
export const DEFAULT_PERPLEXITY_MODEL = "sonar";
export const WEB_SEARCH_TOOL_NAME = "web_search_tool";

type EnvSource = Record<string, string | undefined>;

export type PerplexityConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type WebSearchInput = {
  query: string;
};

export type WebSearchResult = {
  summary: string;
  citations: string[];
  model: string;
};

type FetchCompletion = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

type PerplexityResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  citations?: string[];
};

function readRequired(env: EnvSource, key: "PERPLEXITY_API_KEY") {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required server environment variable: ${key}`);
  }

  return value;
}

function readOptional(env: EnvSource, key: "PERPLEXITY_BASE_URL" | "PERPLEXITY_MODEL") {
  const value = env[key]?.trim();

  return value || null;
}

function buildPerplexityUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function createPerplexityHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
}

function isPerplexityResponse(payload: unknown): payload is PerplexityResponse {
  return typeof payload === "object" && payload !== null;
}

export function getPerplexityConfig(env: EnvSource = process.env as EnvSource): PerplexityConfig {
  return {
    apiKey: readRequired(env, "PERPLEXITY_API_KEY"),
    baseUrl: readOptional(env, "PERPLEXITY_BASE_URL") ?? DEFAULT_PERPLEXITY_BASE_URL,
    model: readOptional(env, "PERPLEXITY_MODEL") ?? DEFAULT_PERPLEXITY_MODEL
  };
}

export async function runWebSearch(
  input: WebSearchInput,
  config: PerplexityConfig,
  fetchCompletion: FetchCompletion = fetch
): Promise<WebSearchResult> {
  const query = input.query.trim();

  if (!query) {
    throw new Error("Web search query is required.");
  }

  const response = await fetchCompletion(
    buildPerplexityUrl(config.baseUrl, "/chat/completions"),
    {
      method: "POST",
      headers: createPerplexityHeaders(config.apiKey),
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content:
              "You are a concise research assistant. Provide factual summaries and include citations."
          },
          {
            role: "user",
            content: query
          }
        ]
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Perplexity web search failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();

  if (!isPerplexityResponse(payload)) {
    throw new Error("Perplexity web search returned an invalid response.");
  }

  const summary = payload.choices?.[0]?.message?.content?.trim();

  if (!summary) {
    throw new Error("Perplexity web search returned no summary content.");
  }

  return {
    summary,
    citations: Array.isArray(payload.citations) ? payload.citations : [],
    model: typeof payload.model === "string" ? payload.model : config.model
  };
}
