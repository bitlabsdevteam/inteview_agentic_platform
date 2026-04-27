import { describe, expect, it } from "vitest";

import {
  DEFAULT_PERPLEXITY_BASE_URL,
  DEFAULT_PERPLEXITY_MODEL,
  getPerplexityConfig,
  runWebSearch
} from "../../tools/web_search_tool";

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("web_search_tool", () => {
  it("reads server-side perplexity config with defaults", () => {
    const config = getPerplexityConfig({
      PERPLEXITY_API_KEY: "pplx-test-key"
    });

    expect(config).toEqual({
      apiKey: "pplx-test-key",
      baseUrl: DEFAULT_PERPLEXITY_BASE_URL,
      model: DEFAULT_PERPLEXITY_MODEL
    });
  });

  it("rejects missing perplexity api key", () => {
    expect(() => getPerplexityConfig({})).toThrow(/PERPLEXITY_API_KEY/);
  });

  it("runs a perplexity-backed web search and returns summary and citations", async () => {
    const result = await runWebSearch(
      { query: "Senior AI product engineer salary benchmark US remote" },
      {
        apiKey: "pplx-test-key",
        baseUrl: "https://api.perplexity.test",
        model: "sonar"
      },
      async () =>
        response(200, {
          model: "sonar",
          choices: [
            {
              message: {
                content: "Median base salary is in the high six-figure range for senior hires."
              }
            }
          ],
          citations: ["https://example.com/benchmark"]
        })
    );

    expect(result).toEqual({
      summary: "Median base salary is in the high six-figure range for senior hires.",
      citations: ["https://example.com/benchmark"],
      model: "sonar"
    });
  });

  it("returns clear provider status errors", async () => {
    await expect(
      runWebSearch(
        { query: "AI hiring trends" },
        {
          apiKey: "pplx-test-key",
          baseUrl: "https://api.perplexity.test",
          model: "sonar"
        },
        async () => response(429, { error: "rate limited" })
      )
    ).rejects.toThrow("Perplexity web search failed with status 429.");
  });
});
