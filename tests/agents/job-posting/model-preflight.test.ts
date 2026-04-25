import { describe, expect, it } from "vitest";

import {
  checkOpenAIModelAvailability,
  type OpenAIClientConfig
} from "@/lib/agents/job-posting/openai-client";

const config: OpenAIClientConfig = {
  apiKey: "sk-test-key",
  model: "gpt-5.5",
  baseUrl: "https://api.openai.test/v1"
};

function response(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response;
}

describe("OpenAI model availability preflight", () => {
  it("checks the configured model against the OpenAI models endpoint", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchModels = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });

      return response(200, {
        object: "list",
        data: [
          { id: "gpt-5.2", object: "model" },
          { id: "gpt-5.5", object: "model" }
        ]
      });
    };

    await expect(checkOpenAIModelAvailability(config, fetchModels)).resolves.toEqual({
      available: true,
      model: "gpt-5.5"
    });

    expect(calls).toEqual([
      {
        url: "https://api.openai.test/v1/models",
        init: {
          method: "GET",
          headers: {
            Authorization: "Bearer sk-test-key",
            "Content-Type": "application/json"
          }
        }
      }
    ]);
  });

  it("returns a clear unavailable-model error without falling back", async () => {
    const fetchModels = async () =>
      response(200, {
        object: "list",
        data: [{ id: "gpt-5.2", object: "model" }]
      });

    await expect(checkOpenAIModelAvailability(config, fetchModels)).resolves.toEqual({
      available: false,
      model: "gpt-5.5",
      error: "Configured OpenAI model gpt-5.5 is not available to this account."
    });
  });

  it("reports provider errors without exposing the API key", async () => {
    const fetchModels = async () =>
      response(401, {
        error: {
          message: "Incorrect API key provided: sk-test-key"
        }
      });

    await expect(checkOpenAIModelAvailability(config, fetchModels)).resolves.toEqual({
      available: false,
      model: "gpt-5.5",
      error: "OpenAI model preflight failed with status 401."
    });
  });

  it("reports malformed model list responses", async () => {
    const fetchModels = async () =>
      response(200, {
        object: "list",
        data: [{ object: "model" }]
      });

    await expect(checkOpenAIModelAvailability(config, fetchModels)).resolves.toEqual({
      available: false,
      model: "gpt-5.5",
      error: "OpenAI model preflight returned an invalid model list."
    });
  });

  it("reports network failures clearly", async () => {
    const fetchModels = async () => {
      throw new Error("socket closed");
    };

    await expect(checkOpenAIModelAvailability(config, fetchModels)).resolves.toEqual({
      available: false,
      model: "gpt-5.5",
      error: "OpenAI model preflight request failed."
    });
  });
});
