import { describe, expect, it } from "vitest";

import {
  buildFollowUpRevisionPrompt,
  getFollowUpAnswerFromFormData,
  getFollowUpSessionIdFromFormData,
  getTargetedFollowUpQuestions,
  reviseEmployerJobDraftFromChatTurn,
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
  ],
  reasoningSummary: ["Derived seniority from ownership language in the employer prompt."],
  thinkingMessages: ["Detected compensation and hiring manager as unresolved gaps."],
  actionLog: ["draft_generated", "follow_up_requested:compensationBand,hiringManager"]
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

function createChatTurnClient(options?: {
  missingMemoryTables?: boolean;
  interviewBlueprintRecord?: {
    id: string;
    employer_user_id: string;
    employer_job_id: string;
    status: "draft";
    title: string;
    objective: string;
    response_mode: "text" | "voice_agent";
    tone_profile: "direct" | "supportive" | "neutral" | "high-precision";
    parsing_strategy: "keyword_match" | "evidence_extraction" | "rubric_scoring" | "hybrid";
    benchmark_summary: string;
    approval_notes: string;
    created_at: string;
    updated_at: string;
  } | null;
  interviewQuestions?: Array<{
    id: string;
    interview_blueprint_id: string;
    employer_user_id: string;
    employer_job_id: string;
    stage_label: string;
    stage_order: number;
    question_order: number;
    question_text: string;
    intent: string;
    evaluation_focus: string;
    strong_signal: string;
    failure_signal: string;
    follow_up_prompt: string;
    created_at: string;
    updated_at: string;
  }>;
}) {
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
  const session = {
    ...sessionRecord,
    status: "draft_created",
    latest_employer_prompt: "Need stronger backend ownership in the JD."
  };

  let messageInsertCount = 0;
  let messageListCount = 0;

  const client = {
    from(table: string) {
      calls.push({ table });

      if (table === "employer_jobs") {
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
                      maybeSingle: async () => ({ data: jobRecord, error: null })
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
                            data: { ...jobRecord, updated_at: "2026-04-26T00:00:00.000Z" },
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
                      maybeSingle: async () => ({ data: session, error: null })
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
                            data: {
                              ...session,
                              latest_employer_prompt: "Need stronger backend ownership in the JD.",
                              generated_fields: revisedOutput
                            },
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

      if (table === "agent_job_messages") {
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
                      order(orderColumn: string, options: { ascending: boolean }) {
                        calls.push({ order: [orderColumn, options] });
                        messageListCount += 1;
                        if (messageListCount === 1) {
                          return Promise.resolve({ data: [], error: null });
                        }
                        return Promise.resolve({
                          data: [
                            {
                              id: "msg-employer",
                              session_id: session.id,
                              employer_user_id: "employer-user-1",
                              role: "employer",
                              content: "Need stronger backend ownership in the JD.",
                              metadata: {},
                              created_at: "2026-04-26T00:00:00.000Z"
                            },
                            {
                              id: "msg-agent",
                              session_id: session.id,
                              employer_user_id: "employer-user-1",
                              role: "agent",
                              content: revisedOutput.draftDescription,
                              metadata: {},
                              created_at: "2026-04-26T00:00:01.000Z"
                            }
                          ],
                          error: null
                        });
                      }
                    };
                  }
                };
              }
            };
          },
          insert(values: unknown) {
            calls.push({ insert: values });
            return {
              select(columns: string) {
                calls.push({ select: columns });
                return {
                  single: async () => {
                    messageInsertCount += 1;
                    return {
                      data: {
                        id: messageInsertCount === 1 ? "msg-employer" : "msg-agent",
                        created_at: "2026-04-26T00:00:00.000Z"
                      },
                      error: null
                    };
                  }
                };
              }
            };
          }
        };
      }

      if (table === "agent_memory_summaries") {
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
                      eq(thirdColumn: string, thirdValue: string) {
                    calls.push({ eq: [thirdColumn, thirdValue] });
                    return {
                          maybeSingle: async () =>
                            options?.missingMemoryTables
                              ? {
                                  data: null,
                                  error: {
                                    message:
                                      "Could not find the table 'public.agent_memory_summaries' in the schema cache"
                                  }
                                }
                              : { data: null, error: null }
                        };
                      }
                    };
                  }
                };
              }
            };
          },
          upsert(values: unknown) {
            calls.push({ upsert: values });
            return {
              select(columns: string) {
                calls.push({ select: columns });
                return {
                  single: async () =>
                    options?.missingMemoryTables
                      ? {
                          data: null,
                          error: {
                            message:
                              'relation "public.agent_memory_summaries" does not exist'
                          }
                        }
                      : {
                          data: {
                            id: "mem-sum-1",
                            employer_user_id: "employer-user-1",
                            employer_job_id: "job-1",
                            session_id: "session-1",
                            summary_text: "summary",
                            unresolved_gaps: [],
                            key_decisions: [],
                            compacted_message_count: 0,
                            created_at: "2026-04-26T00:00:00.000Z",
                            updated_at: "2026-04-26T00:00:00.000Z"
                          },
                          error: null
                        }
                };
              }
            };
          }
        };
      }

      if (table === "agent_memory_items") {
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
                      eq(thirdColumn: string, thirdValue: string) {
                        calls.push({ eq: [thirdColumn, thirdValue] });
                        return {
                          is(isColumn: string, isValue: null) {
                            calls.push({ is: [isColumn, isValue] });
                            return {
                              order(orderColumn: string, options: { ascending: boolean }) {
                                calls.push({ order: [orderColumn, options] });
                                return Promise.resolve(
                                  options?.missingMemoryTables
                                    ? {
                                        data: [],
                                        error: {
                                          message:
                                            "Could not find the table 'public.agent_memory_items' in the schema cache"
                                        }
                                      }
                                    : { data: [], error: null }
                                );
                              }
                            };
                          }
                        };
                      }
                    };
                  }
                };
              }
            };
          },
          insert(values: unknown) {
            calls.push({ insert: values });
            return {
              select(columns: string) {
                calls.push({ select: columns });
                return {
                  single: async () =>
                    options?.missingMemoryTables
                      ? {
                          data: null,
                          error: {
                            message: 'relation "public.agent_memory_items" does not exist'
                          }
                        }
                      : {
                          data: { id: "mem-item-1", created_at: "2026-04-26T00:00:00.000Z" },
                          error: null
                        }
                };
              }
            };
          }
        };
      }

      if (table === "employer_job_role_profiles") {
        return {
          upsert(values: unknown) {
            calls.push({ upsert: values });
            return {
              select(columns: string) {
                calls.push({ select: columns });
                return {
                  single: async () => ({
                    data: { id: "role-profile-1", created_at: "2026-04-26T00:00:00.000Z" },
                    error: null
                  })
                };
              }
            };
          }
        };
      }

      if (table === "employer_job_interview_blueprints") {
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
                        data: options?.interviewBlueprintRecord ?? null,
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

      if (table === "employer_job_interview_questions") {
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
                      eq(thirdColumn: string, thirdValue: string) {
                        calls.push({ eq: [thirdColumn, thirdValue] });
                        return {
                          order(orderColumn: string, orderOptions: { ascending: boolean }) {
                            calls.push({ order: [orderColumn, orderOptions] });
                            return {
                              order(
                                nextOrderColumn: string,
                                nextOrderOptions: { ascending: boolean }
                              ) {
                                calls.push({ order: [nextOrderColumn, nextOrderOptions] });
                                return Promise.resolve({
                                  data: options?.interviewQuestions ?? [],
                                  error: null
                                });
                              }
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
                  data: { id: `${table}-1`, created_at: "2026-04-26T00:00:00.000Z" },
                  error: null
                })
              };
            }
          };
        }
      };
    }
  };

  return { client, calls };
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

  it("runs Step 1+2 orchestration in chat-turn flow and persists role-profile + quality artifacts", async () => {
    const { client, calls } = createChatTurnClient();
    const inferenceCalls: unknown[] = [];

    const result = await reviseEmployerJobDraftFromChatTurn({
      client,
      employerUserId: "employer-user-1",
      employerJobId: "job-1",
      sessionId: "session-1",
      message: "Need stronger backend ownership in the JD.",
      config,
      promptVersion,
      runInference: async (input) => {
        inferenceCalls.push(input);
        return inferenceResult;
      },
      createOutputChecksum: () => "output-checksum"
    });

    expect(inferenceCalls).toHaveLength(1);
    expect(
      String((inferenceCalls[0] as { employerPrompt: string }).employerPrompt)
    ).toContain("Current structured job draft:");

    expect(calls).toContainEqual({ table: "employer_job_role_profiles" });
    expect(calls).toContainEqual({ table: "employer_job_quality_checks" });
    expect(result.roleProfileSummary).toMatchObject({
      title: "Senior Role",
      department: "Engineering"
    });
    expect(result.qualityChecks.length).toBeGreaterThan(0);
    expect(result.activeStage).toBe("job_posting");
    expect(result.stageSummary).toMatchObject({
      activeStageKey: "job_posting",
      stages: [
        {
          key: "job_posting",
          state: "current"
        },
        {
          key: "interview_structure",
          state: "upcoming"
        },
        {
          key: "review",
          state: "upcoming"
        }
      ]
    });
    expect(result.interviewBlueprintSummary).toEqual({
      id: null,
      status: "draft",
      responseMode: null,
      toneProfile: null,
      parsingStrategy: null,
      benchmarkSummary: "",
      questionCount: 0,
      completenessGaps: [
        "Select response mode for the interview plan.",
        "Select parsing strategy for interview evaluation.",
        "Add at least one benchmark summary for evaluator guidance."
      ]
    });
    expect(result.readinessFlags).toEqual({
      blocksReview: true,
      requiresEmployerFix: true
    });
  });

  it("returns blocked interview-structure metadata when a saved blueprint is incomplete", async () => {
    const readyForStageTwoOutput: JobPostingAgentOutput = {
      ...revisedOutput,
      draftDescription: [
        "Senior AI Product Engineer",
        "",
        "Hiring problem:",
        "Build reliable AI interview workflows that help employers create stronger job postings and structured interview plans.",
        "",
        "Requirements:",
        "Next.js, Supabase, Postgres, and agent orchestration experience. Strong written communication, backend ownership, and production incident debugging are required.",
        "",
        "Interview process:",
        "Recruiter screen, technical architecture interview, and employer review focused on evidence-backed hiring judgment."
      ].join("\n")
    };
    const { client } = createChatTurnClient({
      interviewBlueprintRecord: {
        id: "blueprint-1",
        employer_user_id: "employer-user-1",
        employer_job_id: "job-1",
        status: "draft",
        title: "Backend Ownership Interview",
        objective: "Measure architectural ownership and debugging depth.",
        response_mode: "voice_agent",
        tone_profile: "high-precision",
        parsing_strategy: "hybrid",
        benchmark_summary:
          "Advance candidates who show clear production debugging evidence and strong architectural tradeoff reasoning.",
        approval_notes: "Employer review required before rollout.",
        created_at: "2026-04-26T00:00:00.000Z",
        updated_at: "2026-04-26T00:00:00.000Z"
      },
      interviewQuestions: []
    });

    const result = await reviseEmployerJobDraftFromChatTurn({
      client,
      employerUserId: "employer-user-1",
      employerJobId: "job-1",
      sessionId: "session-1",
      message: "Tighten the job posting for technical ownership.",
      config,
      promptVersion,
      runInference: async () => ({
        ...inferenceResult,
        output: readyForStageTwoOutput
      }),
      createOutputChecksum: () => "output-checksum"
    });

    expect(result.activeStage).toBe("interview_structure");
    expect(result.stageSummary).toMatchObject({
      activeStageKey: "interview_structure",
      stages: [
        {
          key: "job_posting",
          state: "complete"
        },
        {
          key: "interview_structure",
          state: "blocked",
          blockers: ["Add at least one interview question to define the interview plan."]
        },
        {
          key: "review",
          state: "upcoming"
        }
      ]
    });
    expect(result.interviewBlueprintSummary).toMatchObject({
      id: "blueprint-1",
      responseMode: "voice_agent",
      toneProfile: "high-precision",
      parsingStrategy: "hybrid",
      questionCount: 0,
      completenessGaps: ["Add at least one interview question to define the interview plan."]
    });
  });

  it("keeps chat-turn refinement working when agent memory tables are not migrated yet", async () => {
    const { client } = createChatTurnClient({ missingMemoryTables: true });

    const result = await reviseEmployerJobDraftFromChatTurn({
      client,
      employerUserId: "employer-user-1",
      employerJobId: "job-1",
      sessionId: "session-1",
      message: "Need stronger backend ownership in the JD.",
      config,
      promptVersion,
      runInference: async () => inferenceResult,
      createOutputChecksum: () => "output-checksum"
    });

    expect(result.job.id).toBe("job-1");
    expect(result.memory.summary).toBeNull();
    expect(result.memory.retrievedItems).toEqual([]);
    expect(result.roleProfileSummary).toMatchObject({
      title: "Senior Role",
      department: "Engineering"
    });
    expect(result.qualityChecks.length).toBeGreaterThan(0);
  });
});
