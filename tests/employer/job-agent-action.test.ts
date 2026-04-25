import { describe, expect, it } from "vitest";

import {
  createPromptFirstEmployerJobDraft,
  getEmployerPromptFromFormData
} from "@/lib/agents/job-posting/create-draft";
import {
  buildAgentJobMessageInsert,
  buildAgentJobSessionInsert,
  buildAgentTraceInsert
} from "@/lib/agents/job-posting/persistence";
import type { JobPostingInferenceResult } from "@/lib/agents/job-posting/inference";
import type { OpenAIClientConfig } from "@/lib/agents/job-posting/openai-client";
import type { PromptVersion } from "@/lib/agents/job-posting/prompts";
import type { JobPostingAgentOutput } from "@/lib/agents/job-posting/schema";
import { buildEmployerJobDraftInsert } from "@/lib/employer/jobs";

const config: OpenAIClientConfig = {
  apiKey: "sk-test-key",
  model: "gpt-5.5",
  baseUrl: "https://api.openai.test/v1"
};

const promptVersion: PromptVersion = {
  promptKey: "job_creator_agent_system_prompt",
  version: "v1",
  channel: "system",
  status: "active",
  body: "system prompt body",
  checksum: "prompt-checksum"
};

const agentOutput: JobPostingAgentOutput = {
  title: {
    value: "Senior Full-Stack AI Product Engineer",
    source: "inferred",
    confidence: 0.93
  },
  department: {
    value: "Engineering",
    source: "inferred",
    confidence: 0.91
  },
  level: {
    value: "Senior",
    source: "inferred",
    confidence: 0.88
  },
  location: {
    value: "Remote",
    source: "user_provided",
    confidence: 1
  },
  employmentType: {
    value: "Full-time",
    source: "defaulted",
    confidence: 0.55
  },
  compensationBand: {
    value: "To be confirmed",
    source: "missing",
    confidence: 0
  },
  hiringProblem: "Build prompt-first AI hiring workflows for employers.",
  outcomes: ["Ship reliable AI job posting generation.", "Create auditable agent traces."],
  responsibilities: ["Own full-stack product features.", "Design LLM workflow boundaries."],
  requirements: ["Next.js, Supabase, Postgres, and LLM workflow experience."],
  niceToHave: ["Recruiting product experience."],
  interviewLoop: ["Recruiter screen", "Technical interview", "Final product review"],
  draftDescription: "Senior Full-Stack AI Product Engineer\n\nAbout the role\nBuild AI hiring workflows.",
  assumptions: ["Department inferred as Engineering from the technical scope."],
  missingCriticalFields: ["compensationBand"],
  followUpQuestions: ["What compensation range should appear on the posting?"]
};

const inferenceResult: JobPostingInferenceResult = {
  output: agentOutput,
  providerResponseId: "resp_123",
  model: "gpt-5.5",
  prompt: {
    promptKey: "job_creator_agent_system_prompt",
    version: "v1",
    checksum: "prompt-checksum"
  }
};

function createInsertClient() {
  const calls: Array<{ table: string; values: unknown }> = [];
  const returnedByTable: Record<string, unknown> = {
    employer_jobs: {
      id: "job-1",
      ...buildEmployerJobDraftInsert("employer-user-1", {
        title: "Senior Full-Stack AI Product Engineer",
        department: "Engineering",
        level: "Senior",
        location: "Remote",
        compensationBand: "To be confirmed",
        hiringProblem: "Build prompt-first AI hiring workflows for employers.",
        outcomes: "- Ship reliable AI job posting generation.\n- Create auditable agent traces.",
        requirements:
          "Required:\n- Next.js, Supabase, Postgres, and LLM workflow experience.\n\nNice to have:\n- Recruiting product experience.",
        interviewLoop: "- Recruiter screen\n- Technical interview\n- Final product review"
      }),
      created_at: "2026-04-25T00:00:00.000Z",
      updated_at: "2026-04-25T00:00:00.000Z"
    },
    agent_job_sessions: {
      id: "session-1",
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      status: "needs_follow_up",
      latest_employer_prompt: "We need someone to build our AI interview product. Remote is ok.",
      generated_fields: agentOutput,
      assumptions: agentOutput.assumptions,
      missing_critical_fields: agentOutput.missingCriticalFields,
      follow_up_questions: agentOutput.followUpQuestions,
      created_at: "2026-04-25T00:00:00.000Z",
      updated_at: "2026-04-25T00:00:00.000Z"
    },
    agent_job_messages: {
      id: "message-1",
      session_id: "session-1",
      employer_user_id: "employer-user-1",
      role: "employer",
      content: "We need someone to build our AI interview product. Remote is ok.",
      metadata: {},
      created_at: "2026-04-25T00:00:00.000Z"
    },
    agent_execution_traces: {
      id: "trace-1",
      session_id: "session-1",
      employer_user_id: "employer-user-1",
      provider: "openai",
      provider_response_id: "resp_123",
      model: "gpt-5.5",
      prompt_key: "job_creator_agent_system_prompt",
      prompt_version: "v1",
      prompt_checksum: "prompt-checksum",
      output_checksum: "output-checksum",
      status: "succeeded",
      error_message: null,
      created_at: "2026-04-25T00:00:00.000Z"
    }
  };

  const client = {
    from(table: string) {
      return {
        insert(values: unknown) {
          calls.push({ table, values });

          return {
            select: () => ({
              single: async () => ({
                data: returnedByTable[table],
                error: null
              })
            })
          };
        }
      };
    }
  };

  return { client, calls };
}

describe("prompt-first employer job creation", () => {
  it("reads a single natural-language employer prompt from form data", () => {
    const formData = new FormData();
    formData.set("employerPrompt", "  We need an AI product engineer.  ");

    expect(getEmployerPromptFromFormData(formData)).toBe("We need an AI product engineer.");
  });

  it("rejects empty employer prompts before inference", () => {
    const formData = new FormData();
    formData.set("employerPrompt", " ");

    expect(() => getEmployerPromptFromFormData(formData)).toThrow(/Employer prompt is required/);
  });

  it("runs inference, creates a draft, and persists session, messages, and trace metadata", async () => {
    const { client, calls } = createInsertClient();
    const inferenceCalls: unknown[] = [];

    const result = await createPromptFirstEmployerJobDraft({
      client,
      employerUserId: "employer-user-1",
      employerPrompt: "We need someone to build our AI interview product. Remote is ok.",
      config,
      promptVersion,
      runInference: async (input) => {
        inferenceCalls.push(input);
        return inferenceResult;
      },
      createOutputChecksum: () => "output-checksum"
    });

    expect(inferenceCalls).toEqual([
      {
        config,
        promptVersion,
        employerPrompt: "We need someone to build our AI interview product. Remote is ok."
      }
    ]);
    expect(result.job.id).toBe("job-1");
    expect(result.session.id).toBe("session-1");
    expect(result.inference).toBe(inferenceResult);
    expect(calls).toEqual([
      {
        table: "employer_jobs",
        values: buildEmployerJobDraftInsert("employer-user-1", {
          title: "Senior Full-Stack AI Product Engineer",
          department: "Engineering",
          level: "Senior",
          location: "Remote",
          compensationBand: "To be confirmed",
          hiringProblem: "Build prompt-first AI hiring workflows for employers.",
          outcomes: "- Ship reliable AI job posting generation.\n- Create auditable agent traces.",
          requirements:
            "Required:\n- Next.js, Supabase, Postgres, and LLM workflow experience.\n\nNice to have:\n- Recruiting product experience.",
          interviewLoop: "- Recruiter screen\n- Technical interview\n- Final product review"
        })
      },
      {
        table: "agent_job_sessions",
        values: buildAgentJobSessionInsert({
          employerUserId: "employer-user-1",
          employerJobId: "job-1",
          status: "needs_follow_up",
          latestEmployerPrompt: "We need someone to build our AI interview product. Remote is ok.",
          generatedFields: agentOutput,
          assumptions: agentOutput.assumptions,
          missingCriticalFields: agentOutput.missingCriticalFields,
          followUpQuestions: agentOutput.followUpQuestions
        })
      },
      {
        table: "agent_job_messages",
        values: buildAgentJobMessageInsert({
          sessionId: "session-1",
          employerUserId: "employer-user-1",
          role: "employer",
          content: "We need someone to build our AI interview product. Remote is ok.",
          metadata: {
            source: "prompt_first_job_creation"
          }
        })
      },
      {
        table: "agent_job_messages",
        values: buildAgentJobMessageInsert({
          sessionId: "session-1",
          employerUserId: "employer-user-1",
          role: "agent",
          content: agentOutput.draftDescription,
          metadata: {
            providerResponseId: "resp_123",
            model: "gpt-5.5"
          }
        })
      },
      {
        table: "agent_execution_traces",
        values: buildAgentTraceInsert({
          sessionId: "session-1",
          employerUserId: "employer-user-1",
          provider: "openai",
          providerResponseId: "resp_123",
          model: "gpt-5.5",
          promptKey: "job_creator_agent_system_prompt",
          promptVersion: "v1",
          promptChecksum: "prompt-checksum",
          outputChecksum: "output-checksum",
          status: "succeeded"
        })
      }
    ]);
  });
});
