import { describe, expect, it } from "vitest";

import type { InterviewBlueprint } from "@/lib/agents/job-posting/interview-blueprint";
import {
  buildEmployerJobInterviewBlueprintUpsert,
  buildEmployerJobInterviewQuestionInsert,
  createEmployerJobInterviewQuestion,
  getEmployerJobInterviewBlueprintByJob,
  listEmployerJobInterviewQuestionsByBlueprint,
  upsertEmployerJobInterviewBlueprint
} from "@/lib/agents/job-posting/interview-blueprint-persistence";

const blueprint: InterviewBlueprint = {
  status: "draft",
  title: "Platform Engineer Interview Plan",
  objective: "Assess architecture ownership, delivery judgment, and communication quality.",
  responseMode: "voice_agent",
  toneProfile: "high-precision",
  parsingStrategy: "hybrid",
  benchmarkSummary:
    "Advance candidates who show concrete ownership examples, clear tradeoff reasoning, and strong debugging communication.",
  approvalNotes: "Employer review required before candidate-facing activation.",
  stages: [
    {
      stageLabel: "Screen",
      stageOrder: 1,
      questions: [
        {
          questionText: "Tell me about a recent system you owned end to end.",
          questionOrder: 1,
          intent: "Establish ownership scope and delivery complexity.",
          evaluationFocus: "Ownership",
          strongSignal: "Names clear decisions, constraints, and results.",
          failureSignal: "Stays generic and cannot describe personal impact.",
          followUpPrompt: "What tradeoffs did you make and why?"
        }
      ]
    }
  ]
};

describe("interview blueprint persistence", () => {
  it("builds blueprint upsert payload with strict employer/job scope", () => {
    expect(
      buildEmployerJobInterviewBlueprintUpsert({
        employerUserId: "employer-user-1",
        employerJobId: "job-1",
        blueprint
      })
    ).toEqual({
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      status: "draft",
      title: "Platform Engineer Interview Plan",
      objective: "Assess architecture ownership, delivery judgment, and communication quality.",
      response_mode: "voice_agent",
      tone_profile: "high-precision",
      parsing_strategy: "hybrid",
      benchmark_summary:
        "Advance candidates who show concrete ownership examples, clear tradeoff reasoning, and strong debugging communication.",
      approval_notes: "Employer review required before candidate-facing activation."
    });
  });

  it("builds question insert payload with strict employer/job/blueprint scope", () => {
    expect(
      buildEmployerJobInterviewQuestionInsert({
        employerUserId: "employer-user-1",
        employerJobId: "job-1",
        interviewBlueprintId: "blueprint-1",
        stageLabel: "Screen",
        stageOrder: 1,
        question: blueprint.stages[0].questions[0]
      })
    ).toEqual({
      interview_blueprint_id: "blueprint-1",
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      stage_label: "Screen",
      stage_order: 1,
      question_order: 1,
      question_text: "Tell me about a recent system you owned end to end.",
      intent: "Establish ownership scope and delivery complexity.",
      evaluation_focus: "Ownership",
      strong_signal: "Names clear decisions, constraints, and results.",
      failure_signal: "Stays generic and cannot describe personal impact.",
      follow_up_prompt: "What tradeoffs did you make and why?"
    });
  });

  it("upserts interview blueprint records by strict employer/job scope", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      from(table: string) {
        calls.push({ table });

        return {
          upsert(values: unknown) {
            calls.push({ upsert: values });

            return {
              select(columns: string) {
                calls.push({ select: columns });

                return {
                  single: async () => ({
                    data: { id: "blueprint-1" },
                    error: null
                  })
                };
              }
            };
          }
        };
      }
    };

    await expect(
      upsertEmployerJobInterviewBlueprint(client, {
        employerUserId: "employer-user-1",
        employerJobId: "job-1",
        blueprint
      })
    ).resolves.toEqual({ id: "blueprint-1" });

    expect(calls).toEqual([
      { table: "employer_job_interview_blueprints" },
      {
        upsert: {
          employer_user_id: "employer-user-1",
          employer_job_id: "job-1",
          status: "draft",
          title: "Platform Engineer Interview Plan",
          objective: "Assess architecture ownership, delivery judgment, and communication quality.",
          response_mode: "voice_agent",
          tone_profile: "high-precision",
          parsing_strategy: "hybrid",
          benchmark_summary:
            "Advance candidates who show concrete ownership examples, clear tradeoff reasoning, and strong debugging communication.",
          approval_notes: "Employer review required before candidate-facing activation."
        }
      },
      { select: "*" }
    ]);
  });

  it("loads interview blueprint by strict employer/job scope", async () => {
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

    await expect(
      getEmployerJobInterviewBlueprintByJob(client, "employer-user-1", "job-1")
    ).resolves.toBeNull();

    expect(calls).toEqual([
      { table: "employer_job_interview_blueprints" },
      { select: "*" },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] }
    ]);
  });

  it("creates and lists interview questions in strict employer/job/blueprint scope with stable ordering", async () => {
    const insertCalls: Array<Record<string, unknown>> = [];
    const insertClient = {
      from(table: string) {
        insertCalls.push({ table });

        return {
          insert(values: unknown) {
            insertCalls.push({ insert: values });

            return {
              select(columns: string) {
                insertCalls.push({ select: columns });

                return {
                  single: async () => ({ data: { id: "question-1" }, error: null })
                };
              }
            };
          }
        };
      }
    };

    await expect(
      createEmployerJobInterviewQuestion(insertClient, {
        employerUserId: "employer-user-1",
        employerJobId: "job-1",
        interviewBlueprintId: "blueprint-1",
        stageLabel: "Screen",
        stageOrder: 1,
        question: blueprint.stages[0].questions[0]
      })
    ).resolves.toEqual({ id: "question-1" });

    expect(insertCalls).toEqual([
      { table: "employer_job_interview_questions" },
      {
        insert: {
          interview_blueprint_id: "blueprint-1",
          employer_user_id: "employer-user-1",
          employer_job_id: "job-1",
          stage_label: "Screen",
          stage_order: 1,
          question_order: 1,
          question_text: "Tell me about a recent system you owned end to end.",
          intent: "Establish ownership scope and delivery complexity.",
          evaluation_focus: "Ownership",
          strong_signal: "Names clear decisions, constraints, and results.",
          failure_signal: "Stays generic and cannot describe personal impact.",
          follow_up_prompt: "What tradeoffs did you make and why?"
        }
      },
      { select: "*" }
    ]);

    const listCalls: Array<Record<string, unknown>> = [];
    const listClient = {
      from(table: string) {
        listCalls.push({ table });

        return {
          select(columns: string) {
            listCalls.push({ select: columns });

            return {
              eq(column: string, value: string) {
                listCalls.push({ eq: [column, value] });

                return {
                  eq(nextColumn: string, nextValue: string) {
                    listCalls.push({ eq: [nextColumn, nextValue] });

                    return {
                      eq(lastColumn: string, lastValue: string) {
                        listCalls.push({ eq: [lastColumn, lastValue] });

                        return {
                          order(orderColumn: string, options: { ascending: boolean }) {
                            listCalls.push({ order: [orderColumn, options] });

                            return {
                              order(nextOrderColumn: string, nextOptions: { ascending: boolean }) {
                                listCalls.push({ order: [nextOrderColumn, nextOptions] });
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
      }
    };

    await expect(
      listEmployerJobInterviewQuestionsByBlueprint(
        listClient,
        "employer-user-1",
        "job-1",
        "blueprint-1"
      )
    ).resolves.toEqual([]);

    expect(listCalls).toEqual([
      { table: "employer_job_interview_questions" },
      { select: "*" },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] },
      { eq: ["interview_blueprint_id", "blueprint-1"] },
      { order: ["stage_order", { ascending: true }] },
      { order: ["question_order", { ascending: true }] }
    ]);
  });
});
