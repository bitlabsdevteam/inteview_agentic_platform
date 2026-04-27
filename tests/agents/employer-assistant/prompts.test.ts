import { describe, expect, it } from "vitest";

import {
  EMPLOYER_RECRUITING_ASSISTANT_PROMPT_KEY,
  assembleEmployerAssistantPrompt,
  createEmployerAssistantPromptChecksum,
  createStaticEmployerAssistantPromptVersion
} from "@/lib/agents/employer-assistant/prompts";

describe("employer assistant prompt assembly", () => {
  it("creates active prompt version metadata with a stable checksum", () => {
    const version = createStaticEmployerAssistantPromptVersion("system policy body");

    expect(version).toEqual({
      promptKey: EMPLOYER_RECRUITING_ASSISTANT_PROMPT_KEY,
      version: "v1",
      channel: "system",
      status: "active",
      body: "system policy body",
      checksum: createEmployerAssistantPromptChecksum("system policy body")
    });
    expect(version.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("separates assistant instructions from untrusted candidate and job context", () => {
    const assembled = assembleEmployerAssistantPrompt({
      promptVersion: createStaticEmployerAssistantPromptVersion("system policy body"),
      context: {
        employerJobId: "job_123",
        candidateProfileId: "cp_456",
        job: {
          title: "Senior AI Product Engineer",
          requirements: [
            "Own agent orchestration architecture and system design quality.",
            "Deliver reliable TypeScript + Postgres services."
          ],
          hiringProblem: "Need deeper architecture ownership."
        },
        candidate: {
          summary: "Strong backend profile with missing distributed systems examples.",
          skills: ["TypeScript", "Postgres", "LLM orchestration"],
          aggregateScore: 0.73,
          evidenceSnippets: ["Led API design for hiring workflow platform."],
          missingSignals: ["Architecture depth evidence"]
        },
        employerUserId: "should_not_be_in_prompt",
        candidateEmail: "private@example.com",
        resumeStoragePath: "private/s3/path.pdf"
      } as unknown as Parameters<typeof assembleEmployerAssistantPrompt>[0]["context"]
    });

    expect(assembled.prompt).toEqual({
      promptKey: EMPLOYER_RECRUITING_ASSISTANT_PROMPT_KEY,
      version: "v1",
      checksum: createEmployerAssistantPromptChecksum("system policy body")
    });
    expect(assembled.messages.map((message) => message.role)).toEqual([
      "system",
      "developer",
      "developer",
      "user"
    ]);
    expect(assembled.messages[1].content).toContain("employer-only recruiting assistant");
    expect(assembled.messages[2].content).toContain("Return only valid JSON");
    expect(assembled.messages[3].content).toContain("<untrusted_recruiting_context>");
    expect(assembled.messages[3].content).toContain("\"employerJobId\": \"job_123\"");
    expect(assembled.messages[3].content).toContain("\"candidateProfileId\": \"cp_456\"");

    const privilegedContent = assembled.messages
      .filter((message) => message.role !== "user")
      .map((message) => message.content)
      .join("\n");

    expect(privilegedContent).not.toContain("private@example.com");
    expect(assembled.messages[3].content).not.toContain("private@example.com");
    expect(assembled.messages[3].content).not.toContain("private/s3/path.pdf");
    expect(assembled.messages[3].content).not.toContain("should_not_be_in_prompt");
  });

  it("rejects missing scope identifiers before assembly", () => {
    expect(() =>
      assembleEmployerAssistantPrompt({
        promptVersion: createStaticEmployerAssistantPromptVersion("system policy body"),
        context: {
          employerJobId: " ",
          candidateProfileId: "cp_456",
          job: {
            title: "Senior AI Product Engineer",
            requirements: ["Own architecture decisions."]
          },
          candidate: {
            summary: "Strong profile.",
            skills: ["TypeScript"]
          }
        }
      })
    ).toThrow(/employerJobId is required/);
  });
});
