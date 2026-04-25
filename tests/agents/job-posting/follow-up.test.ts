import { describe, expect, it } from "vitest";

import {
  buildFollowUpRevisionPrompt,
  getFollowUpAnswerFromFormData,
  getFollowUpSessionIdFromFormData,
  getTargetedFollowUpQuestions,
  reviseEmployerJobDraftFromFollowUp,
  shouldRequestFollowUp
} from "@/lib/agents/job-posting/follow-up";
import {
  buildAgentJobMessageInsert,
  buildAgentJobSessionPatch,
  buildAgentTraceInsert,
  type AgentJobSessionRecord
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

const initialOutput: JobPostingAgentOutput = {
  title: { value: "Senior AI Product Engineer", source: "inferred", confidence: 0.9 },
  department: { value: "Engineering", source: "inferred", confidence: 0.88 },
  level: { value: "Senior", source: "inferred", confidence: 0.86 },
  location: { value: "Remote US", source: "inferred", confidence: 0.72 },
  employmentType: { value: "Full-time", source: "defaulted", confidence: 0.6 },
  compensationBand: { value: "To be confirmed", source: "missing", confidence: 0 },
  hiringProblem: "Build reliable AI interview workflows.",
  outcomes: ["Ship prompt-first job creation."],
  responsibilities: ["Own full-stack agent workflows."],
  requirements: ["Next.js, Supabase, and LLM product experience."],
  niceToHave: [],
  interviewLoop: ["Recruiter screen", "Technical panel"],
  draftDescription: "Senior AI Product Engineer\n\nBuild reliable AI interview workflows.",
  assumptions: ["Level inferred as Senior from ownership scope."],
  missingCriticalFields: ["compensationBand", "hiringManager"],
  followUpQuestions: [
    "What compensation range should appear on the posting?",
    "Who is the hiring manager?",
    "Which timezone range should candidates overlap?",
    "What start date should candidates target?"
  ]
};

const revisedOutput: JobPostingAgentOutput = {
  ...initialOutput,
  compensationBand: { value: "$180k-$220k", source: "user_provided", confidence: 1 },
  draftDescription:
    "Senior AI Product Engineer\n\nBuild reliable AI interview workflows.\n\nCompensation: $180k-$220k",
  missingCriticalFields: [],
  followUpQuestions: []
};

const sessionRecord: AgentJobSessionRecord = {
  id: "session-1",
  employer_user_id: "employer-user-1",
  employer_job_id: "job-1",
  status: "needs_follow_up",
  latest_employer_prompt: "We need someone to own AI interview workflows.",
  generated_fields: initialOutput,
  assumptions: initialOutput.assumptions,
  missing_critical_fields: initialOutput.missingCriticalFields,
  follow_up_questions: initialOutput.followUpQuestions.slice(0, 3),
  created_at: "2026-04-25T00:00:00.000Z",
  updated_at: "2026-04-25T00:00:00.000Z"
};

const inferenceResult: JobPostingInferenceResult = {
  output: revisedOutput,
  providerResponseId: "resp_follow_up",
  model: "gpt-5.5",
  prompt: {
    promptKey: "job_creator_agent_system_prompt",
    version: "v1",
    checksum: "prompt-checksum"
  }
};

function createRevisionClient() {
  const calls: Array<Record<string, unknown>> = [];
  const jobRecord = {
    id: "job-1",
    ...buildEmployerJobDraftInsert("employer-user-1", {
      title: "Senior AI Product Engineer",
      department: "Engineering",
      level: "Senior",
      location: "Remote US",
      compensationBand: "$180k-$220k",
      hiringProblem: "Build reliable AI interview workflows.",
      outcomes: "- Ship prompt-first job creation.",
      requirements: "Required:\n- Next.js, Supabase, and LLM product experience.",
      interviewLoop: "- Recruiter screen\n- Technical panel"
    }),
    created_at: "2026-04-25T00:00:00.000Z",
    updated_at: "2026-04-25T00:00:00.000Z"
  };
  const updatedSession = {
    ...sessionRecord,
    status: "draft_created",
    latest_employer_prompt: "Compensation is $180k-$220k.",
    generated_fields: revisedOutput,
    assumptions: revisedOutput.assumptions,
    missing_critical_fields: [],
    follow_up_questions: []
  };

  const client = {
    from(table: string) {
      calls.push({ table });

      if (table === "agent_job_sessions") {
        return {
          select(columns: string) {
            calls.push({ select: columns });

            return {
              eq(column: string, value: string) {
                calls.push({ eq: [column, value] });

                return {
                  eq(secondColumn: string, secondValue: string) {
                    calls.push({ eq: [secondColumn, secondValue] });

                    return {
                      maybeSingle: async () => ({
                        data: sessionRecord,
                        error: null
                      })
                    };
                  }
                };
              }
            };
          },
          update(values: unknown) {
            calls.push({ update: values });

            return {
              eq(column: string, value: string) {
                calls.push({ eq: [column, value] });

                return {
                  eq(secondColumn: string, secondValue: string) {
                    calls.push({ eq: [secondColumn, secondValue] });

                    return {
                      select(columns: string) {
                        calls.push({ select: columns });

                        return {
                          single: async () => ({
                            data: updatedSession,
                            error: null
                          })
                        };
                      }
                    };
                  }
                };
              }
            };
          }
        };
      }

      if (table === "employer_jobs") {
        return {
          update(values: unknown) {
            calls.push({ update: values });

            return {
              eq(column: string, value: string) {
                calls.push({ eq: [column, value] });

                return {
                  eq(secondColumn: string, secondValue: string) {
                    calls.push({ eq: [secondColumn, secondValue] });

                    return {
                      select(columns: string) {
                        calls.push({ select: columns });

                        return {
                          single: async () => ({
                            data: jobRecord,
                            error: null
                          })
                        };
                      }
                    };
                  }
                };
              }
            };
          }
        };
      }

      return {
        insert(values: unknown) {
          calls.push({ insert: values });

          return {
            select(columns: string) {
              calls.push({ select: columns });

              return {
                single: async () => ({
                  data: { id: `${table}-1`, created_at: "2026-04-25T00:00:00.000Z" },
                  error: null
                })
              };
            }
          };
        }
      };
    }
  };

  return { client, calls, updatedSession, jobRecord };
}

describe("job posting follow-up handling", () => {
  it("keeps targeted follow-up questions to at most three non-empty items", () => {
    expect(getTargetedFollowUpQuestions(initialOutput)).toEqual([
      "What compensation range should appear on the posting?",
      "Who is the hiring manager?",
      "Which timezone range should candidates overlap?"
    ]);

    expect(getTargetedFollowUpQuestions({ ...initialOutput, followUpQuestions: [] })).toEqual([
      "Please provide the compensation band.",
      "Please provide the hiring manager."
    ]);
  });

  it("requires follow-up when critical fields remain missing", () => {
    expect(shouldRequestFollowUp(initialOutput)).toBe(true);
    expect(shouldRequestFollowUp(revisedOutput)).toBe(false);
  });

  it("reads follow-up form values and rejects empty answers", () => {
    const formData = new FormData();
    formData.set("sessionId", " session-1 ");
    formData.set("followUpAnswer", " Compensation is $180k-$220k. ");

    expect(getFollowUpSessionIdFromFormData(formData)).toBe("session-1");
    expect(getFollowUpAnswerFromFormData(formData)).toBe("Compensation is $180k-$220k.");

    const empty = new FormData();
    empty.set("followUpAnswer", " ");
    expect(() => getFollowUpAnswerFromFormData(empty)).toThrow(/Follow-up answer is required/);
  });

  it("builds a bounded revision prompt from the previous session and employer answer", () => {
    const prompt = buildFollowUpRevisionPrompt({
      session: sessionRecord,
      answer: "Compensation is $180k-$220k."
    });

    expect(prompt).toContain("Revise the existing job draft using the employer follow-up answer.");
    expect(prompt).toContain("Previous employer prompt:");
    expect(prompt).toContain("Missing critical fields:");
    expect(prompt).toContain("compensationBand");
    expect(prompt).toContain("Employer follow-up answer:");
    expect(prompt).toContain("Compensation is $180k-$220k.");
  });

  it("revises the same draft and records answer, agent response, updated session, and trace", async () => {
    const { client, calls, updatedSession, jobRecord } = createRevisionClient();
    const inferenceCalls: unknown[] = [];

    const result = await reviseEmployerJobDraftFromFollowUp({
      client,
      employerUserId: "employer-user-1",
      sessionId: "session-1",
      answer: "Compensation is $180k-$220k.",
      config,
      promptVersion,
      runInference: async (input) => {
        inferenceCalls.push(input);
        return inferenceResult;
      },
      createOutputChecksum: () => "output-checksum"
    });

    expect(result.job).toEqual(jobRecord);
    expect(result.session).toEqual(updatedSession);
    expect(inferenceCalls).toHaveLength(1);
    expect(inferenceCalls[0]).toMatchObject({
      config,
      promptVersion
    });
    expect(String((inferenceCalls[0] as { employerPrompt: string }).employerPrompt)).toContain(
      "Compensation is $180k-$220k."
    );
    expect(calls).toContainEqual({
      update: buildAgentJobSessionPatch({
        status: "draft_created",
        latestEmployerPrompt: "Compensation is $180k-$220k.",
        generatedFields: revisedOutput,
        assumptions: revisedOutput.assumptions,
        missingCriticalFields: [],
        followUpQuestions: []
      })
    });
    expect(calls).toContainEqual({
      insert: buildAgentJobMessageInsert({
        sessionId: "session-1",
        employerUserId: "employer-user-1",
        role: "employer",
        content: "Compensation is $180k-$220k.",
        metadata: {
          source: "follow_up_answer"
        }
      })
    });
    expect(calls).toContainEqual({
      insert: buildAgentTraceInsert({
        sessionId: "session-1",
        employerUserId: "employer-user-1",
        provider: "openai",
        providerResponseId: "resp_follow_up",
        model: "gpt-5.5",
        promptKey: "job_creator_agent_system_prompt",
        promptVersion: "v1",
        promptChecksum: "prompt-checksum",
        outputChecksum: "output-checksum",
        status: "succeeded"
      })
    });
  });
});
