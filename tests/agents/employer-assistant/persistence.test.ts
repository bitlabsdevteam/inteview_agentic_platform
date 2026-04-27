import { describe, expect, it } from "vitest";

import {
  buildEmployerAssistantRecommendationInsert,
  buildEmployerAssistantScreeningKitInsert,
  buildEmployerAssistantScreeningQuestionInsert,
  createEmployerAssistantRecommendation,
  createEmployerAssistantScreeningKit,
  createEmployerAssistantScreeningQuestion,
  getEmployerAssistantScreeningKitByRecommendation,
  getLatestEmployerAssistantRecommendationByCandidate,
  listEmployerAssistantRecommendationsByCandidate,
  listEmployerAssistantScreeningKitsByCandidate,
  listEmployerAssistantScreeningQuestionsByKit,
  type EmployerAssistantRecommendationInput,
  type EmployerAssistantScreeningKitInput,
  type EmployerAssistantScreeningQuestionInput
} from "@/lib/agents/employer-assistant/persistence";

const recommendationInput: EmployerAssistantRecommendationInput = {
  employerUserId: "employer-user-1",
  employerJobId: "job-1",
  candidateProfileId: "candidate-1",
  action: "screen_candidate",
  rationale: "Candidate has good baseline fit but missing role-specific architecture depth evidence.",
  evidenceReferences: [
    {
      sourceType: "candidate_profile",
      referenceId: "profile-summary",
      quote: "Led backend platform modernization.",
      relevance: 0.78
    }
  ],
  riskFlags: [
    {
      code: "limited_system_design_signal",
      severity: "medium",
      message: "No direct evidence of distributed systems ownership.",
      mitigation: "Run architecture-focused screening."
    }
  ],
  promptKey: "employer_recruiting_assistant_system_prompt",
  promptVersion: "v1",
  promptChecksum: "sha256:prompt-1",
  provider: "openai",
  model: "gpt-5.5",
  providerResponseId: "resp_abc123",
  failureReason: null,
  metadata: {
    advisorMode: "model"
  }
};

const screeningKitInput: EmployerAssistantScreeningKitInput = {
  recommendationId: "recommendation-1",
  employerUserId: "employer-user-1",
  employerJobId: "job-1",
  candidateProfileId: "candidate-1",
  title: "System Design Signal Check",
  objective: "Validate candidate ownership of distributed systems decisions.",
  metadata: {
    generatedBy: "assistant"
  }
};

const screeningQuestionInput: EmployerAssistantScreeningQuestionInput = {
  screeningKitId: "kit-1",
  employerUserId: "employer-user-1",
  employerJobId: "job-1",
  candidateProfileId: "candidate-1",
  questionOrder: 1,
  questionText: "Describe a production scaling incident and the tradeoffs you made.",
  rubricDimension: "system_design",
  rubricGuidance: "Evaluate tradeoff reasoning and production constraints awareness.",
  isUncertaintyProbe: true,
  metadata: {
    competency: "architecture"
  }
};

function createInsertClient(returned: unknown) {
  const calls: Array<{ table: string; values: unknown; columns?: string }> = [];
  const client = {
    from(table: string) {
      return {
        insert(values: unknown) {
          calls.push({ table, values });

          return {
            select(columns: string) {
              calls[calls.length - 1].columns = columns;

              return {
                single: async () => ({
                  data: returned,
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

describe("employer assistant persistence", () => {
  it("builds recommendation inserts with scoped ids and audit metadata", () => {
    expect(buildEmployerAssistantRecommendationInsert(recommendationInput)).toEqual({
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      candidate_profile_id: "candidate-1",
      action: "screen_candidate",
      rationale:
        "Candidate has good baseline fit but missing role-specific architecture depth evidence.",
      evidence_references: [
        {
          sourceType: "candidate_profile",
          referenceId: "profile-summary",
          quote: "Led backend platform modernization.",
          relevance: 0.78
        }
      ],
      risk_flags: [
        {
          code: "limited_system_design_signal",
          severity: "medium",
          message: "No direct evidence of distributed systems ownership.",
          mitigation: "Run architecture-focused screening."
        }
      ],
      prompt_key: "employer_recruiting_assistant_system_prompt",
      prompt_version: "v1",
      prompt_checksum: "sha256:prompt-1",
      provider: "openai",
      model: "gpt-5.5",
      provider_response_id: "resp_abc123",
      failure_reason: null,
      metadata: {
        advisorMode: "model"
      }
    });
  });

  it("builds screening kit and question inserts with recommendation and scope ownership", () => {
    expect(buildEmployerAssistantScreeningKitInsert(screeningKitInput)).toEqual({
      recommendation_id: "recommendation-1",
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      candidate_profile_id: "candidate-1",
      title: "System Design Signal Check",
      objective: "Validate candidate ownership of distributed systems decisions.",
      metadata: {
        generatedBy: "assistant"
      }
    });

    expect(buildEmployerAssistantScreeningQuestionInsert(screeningQuestionInput)).toEqual({
      screening_kit_id: "kit-1",
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      candidate_profile_id: "candidate-1",
      question_order: 1,
      question_text: "Describe a production scaling incident and the tradeoffs you made.",
      rubric_dimension: "system_design",
      rubric_guidance: "Evaluate tradeoff reasoning and production constraints awareness.",
      is_uncertainty_probe: true,
      metadata: {
        competency: "architecture"
      }
    });
  });

  it("creates recommendation records in employer_assistant_recommendations", async () => {
    const record = {
      id: "recommendation-1",
      ...buildEmployerAssistantRecommendationInsert(recommendationInput),
      created_at: "2026-04-27T00:00:00.000Z",
      updated_at: "2026-04-27T00:00:00.000Z"
    };
    const { client, calls } = createInsertClient(record);

    await expect(createEmployerAssistantRecommendation(client, recommendationInput)).resolves.toEqual(record);
    expect(calls).toEqual([
      {
        table: "employer_assistant_recommendations",
        values: buildEmployerAssistantRecommendationInsert(recommendationInput),
        columns: "*"
      }
    ]);
  });

  it("creates screening kits and questions in assistant screening tables", async () => {
    const kitRecord = {
      id: "kit-1",
      ...buildEmployerAssistantScreeningKitInsert(screeningKitInput),
      created_at: "2026-04-27T00:00:00.000Z",
      updated_at: "2026-04-27T00:00:00.000Z"
    };
    const questionRecord = {
      id: "question-1",
      ...buildEmployerAssistantScreeningQuestionInsert(screeningQuestionInput),
      created_at: "2026-04-27T00:00:00.000Z",
      updated_at: "2026-04-27T00:00:00.000Z"
    };
    const kitClient = createInsertClient(kitRecord);
    const questionClient = createInsertClient(questionRecord);

    await expect(createEmployerAssistantScreeningKit(kitClient.client, screeningKitInput)).resolves.toEqual(
      kitRecord
    );
    await expect(
      createEmployerAssistantScreeningQuestion(questionClient.client, screeningQuestionInput)
    ).resolves.toEqual(questionRecord);

    expect(kitClient.calls).toEqual([
      {
        table: "employer_assistant_screening_kits",
        values: buildEmployerAssistantScreeningKitInsert(screeningKitInput),
        columns: "*"
      }
    ]);
    expect(questionClient.calls).toEqual([
      {
        table: "employer_assistant_screening_questions",
        values: buildEmployerAssistantScreeningQuestionInsert(screeningQuestionInput),
        columns: "*"
      }
    ]);
  });

  it("lists recommendations by strict owner/job/candidate scope", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      from(table: string) {
        calls.push({ table });

        return {
          select(columns: string) {
            calls.push({ select: columns });

            return {
              eq(column: string, value: string) {
                calls.push({ eq: [column, value] });

                return {
                  eq(nextColumn: string, nextValue: string) {
                    calls.push({ eq: [nextColumn, nextValue] });

                    return {
                      eq(lastColumn: string, lastValue: string) {
                        calls.push({ eq: [lastColumn, lastValue] });

                        return {
                          order(orderColumn: string, options: { ascending: boolean }) {
                            calls.push({ order: [orderColumn, options] });
                            return Promise.resolve({ data: [], error: null });
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

    await expect(
      listEmployerAssistantRecommendationsByCandidate(
        client,
        "employer-user-1",
        "job-1",
        "candidate-1"
      )
    ).resolves.toEqual([]);
    expect(calls).toEqual([
      { table: "employer_assistant_recommendations" },
      { select: "*" },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] },
      { eq: ["candidate_profile_id", "candidate-1"] },
      { order: ["created_at", { ascending: false }] }
    ]);
  });

  it("gets latest recommendation by strict scope", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      from(table: string) {
        calls.push({ table });

        return {
          select(columns: string) {
            calls.push({ select: columns });

            return {
              eq(column: string, value: string) {
                calls.push({ eq: [column, value] });

                return {
                  eq(nextColumn: string, nextValue: string) {
                    calls.push({ eq: [nextColumn, nextValue] });

                    return {
                      eq(lastColumn: string, lastValue: string) {
                        calls.push({ eq: [lastColumn, lastValue] });

                        return {
                          order(orderColumn: string, options: { ascending: boolean }) {
                            calls.push({ order: [orderColumn, options] });

                            return {
                              limit(value: number) {
                                calls.push({ limit: value });
                                return {
                                  maybeSingle: async () => ({ data: null, error: null })
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
        };
      }
    };

    await expect(
      getLatestEmployerAssistantRecommendationByCandidate(
        client,
        "employer-user-1",
        "job-1",
        "candidate-1"
      )
    ).resolves.toBeNull();

    expect(calls).toEqual([
      { table: "employer_assistant_recommendations" },
      { select: "*" },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] },
      { eq: ["candidate_profile_id", "candidate-1"] },
      { order: ["created_at", { ascending: false }] },
      { limit: 1 }
    ]);
  });

  it("gets screening kit by recommendation with recommendation + owner + job + candidate scope", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      from(table: string) {
        calls.push({ table });

        return {
          select(columns: string) {
            calls.push({ select: columns });

            return {
              eq(column: string, value: string) {
                calls.push({ eq: [column, value] });

                return {
                  eq(nextColumn: string, nextValue: string) {
                    calls.push({ eq: [nextColumn, nextValue] });

                    return {
                      eq(lastColumn: string, lastValue: string) {
                        calls.push({ eq: [lastColumn, lastValue] });

                        return {
                          eq(fourthColumn: string, fourthValue: string) {
                            calls.push({ eq: [fourthColumn, fourthValue] });
                            return {
                              maybeSingle: async () => ({
                                data: null,
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
        };
      }
    };

    await expect(
      getEmployerAssistantScreeningKitByRecommendation(
        client,
        "employer-user-1",
        "job-1",
        "candidate-1",
        "recommendation-1"
      )
    ).resolves.toBeNull();

    expect(calls).toEqual([
      { table: "employer_assistant_screening_kits" },
      { select: "*" },
      { eq: ["recommendation_id", "recommendation-1"] },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] },
      { eq: ["candidate_profile_id", "candidate-1"] }
    ]);
  });

  it("gets and lists screening kits and questions with strict scope", async () => {
    const calls: Array<Record<string, unknown>> = [];
    let maybeSingleCounter = 0;
    const client = {
      from(table: string) {
        calls.push({ table });

        return {
          select(columns: string) {
            calls.push({ select: columns });

            return {
              eq(column: string, value: string) {
                calls.push({ eq: [column, value] });

                return {
                  eq(nextColumn: string, nextValue: string) {
                    calls.push({ eq: [nextColumn, nextValue] });

                    return {
                      eq(lastColumn: string, lastValue: string) {
                        calls.push({ eq: [lastColumn, lastValue] });

                        return {
                          eq(fourthColumn: string, fourthValue: string) {
                            calls.push({ eq: [fourthColumn, fourthValue] });
                            return {
                              maybeSingle: async () => {
                                maybeSingleCounter += 1;
                                return {
                                  data:
                                    maybeSingleCounter === 1
                                      ? null
                                      : {
                                          id: "kit-1"
                                        },
                                  error: null
                                };
                              },
                              order(orderColumn: string, options: { ascending: boolean }) {
                                calls.push({ order: [orderColumn, options] });
                                return Promise.resolve({ data: [], error: null });
                              }
                            };
                          },
                          order(orderColumn: string, options: { ascending: boolean }) {
                            calls.push({ order: [orderColumn, options] });
                            return Promise.resolve({ data: [], error: null });
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

    await expect(
      getEmployerAssistantScreeningKitByRecommendation(
        client,
        "employer-user-1",
        "job-1",
        "candidate-1",
        "recommendation-1"
      )
    ).resolves.toBeNull();

    await expect(
      listEmployerAssistantScreeningKitsByCandidate(client, "employer-user-1", "job-1", "candidate-1")
    ).resolves.toEqual([]);

    await expect(
      listEmployerAssistantScreeningQuestionsByKit(client, "employer-user-1", "job-1", "candidate-1", "kit-1")
    ).resolves.toEqual([]);

    expect(calls).toEqual([
      { table: "employer_assistant_screening_kits" },
      { select: "*" },
      { eq: ["recommendation_id", "recommendation-1"] },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] },
      { eq: ["candidate_profile_id", "candidate-1"] },
      { table: "employer_assistant_screening_kits" },
      { select: "*" },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] },
      { eq: ["candidate_profile_id", "candidate-1"] },
      { order: ["created_at", { ascending: false }] },
      { table: "employer_assistant_screening_questions" },
      { select: "*" },
      { eq: ["screening_kit_id", "kit-1"] },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] },
      { eq: ["candidate_profile_id", "candidate-1"] },
      { order: ["question_order", { ascending: true }] }
    ]);
  });
});
