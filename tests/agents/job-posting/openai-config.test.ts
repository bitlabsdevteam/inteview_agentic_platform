import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_OPENAI_MODEL,
  createOpenAIRequestHeaders,
  getOpenAIClientConfig
} from "@/lib/agents/job-posting/openai-client";

describe("OpenAI server client configuration", () => {
  it("reads the server-only API key and defaults to GPT 5.5", () => {
    expect(
      getOpenAIClientConfig({
        OPENAI_API_KEY: " sk-test-key "
      })
    ).toEqual({
      apiKey: "sk-test-key",
      model: "gpt-5.5",
      baseUrl: "https://api.openai.com/v1"
    });
  });

  it("allows the model and base URL to be overridden through server env", () => {
    expect(
      getOpenAIClientConfig({
        OPENAI_API_KEY: "sk-test-key",
        OPENAI_MODEL: " gpt-5.5-custom ",
        OPENAI_BASE_URL: " https://api.example.test/v1 "
      })
    ).toEqual({
      apiKey: "sk-test-key",
      model: "gpt-5.5-custom",
      baseUrl: "https://api.example.test/v1"
    });
  });

  it("rejects missing server API keys and ignores public key names", () => {
    expect(() =>
      getOpenAIClientConfig({
        NEXT_PUBLIC_OPENAI_API_KEY: "public-key-must-not-be-used"
      })
    ).toThrow(/OPENAI_API_KEY/);
  });

  it("builds authorization headers without leaking the key into unrelated fields", () => {
    expect(createOpenAIRequestHeaders("sk-test-key")).toEqual({
      Authorization: "Bearer sk-test-key",
      "Content-Type": "application/json"
    });
  });

  it("keeps the example env aligned with the default model and server-only key", () => {
    const exampleEnv = readFileSync(join(process.cwd(), ".env.example"), "utf8");

    expect(DEFAULT_OPENAI_MODEL).toBe("gpt-5.5");
    expect(exampleEnv).toContain("OPENAI_API_KEY=");
    expect(exampleEnv).toContain("OPENAI_MODEL=gpt-5.5");
    expect(exampleEnv).not.toContain("NEXT_PUBLIC_OPENAI_API_KEY");
  });
});
