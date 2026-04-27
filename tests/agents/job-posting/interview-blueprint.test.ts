import { describe, expect, it } from "vitest";

import {
  deriveInterviewBlueprintCompletenessGaps,
  normalizeInterviewBlueprint,
  validateInterviewBlueprint,
  type InterviewBlueprint
} from "@/lib/agents/job-posting/interview-blueprint";
import { BASELINE_INTERVIEW_BLUEPRINT_FIXTURE } from "./pipeline-fixtures";

const validBlueprint: InterviewBlueprint = {
  status: "draft",
  title: BASELINE_INTERVIEW_BLUEPRINT_FIXTURE.title,
  objective: BASELINE_INTERVIEW_BLUEPRINT_FIXTURE.objective,
  responseMode: BASELINE_INTERVIEW_BLUEPRINT_FIXTURE.responseMode,
  toneProfile: BASELINE_INTERVIEW_BLUEPRINT_FIXTURE.toneProfile,
  parsingStrategy: BASELINE_INTERVIEW_BLUEPRINT_FIXTURE.parsingStrategy,
  benchmarkSummary: BASELINE_INTERVIEW_BLUEPRINT_FIXTURE.benchmarkSummary,
  approvalNotes: BASELINE_INTERVIEW_BLUEPRINT_FIXTURE.approvalNotes,
  stages: BASELINE_INTERVIEW_BLUEPRINT_FIXTURE.stages.map((stage, stageIndex) => ({
    stageLabel: stage.stageLabel,
    stageOrder: stageIndex + 1,
    questions: stage.questions.map((question, questionIndex) => ({
      questionText: question.questionText,
      questionOrder: questionIndex + 1,
      intent: question.intent,
      evaluationFocus: question.evaluationFocus,
      strongSignal: question.strongSignal,
      failureSignal: question.failureSignal,
      followUpPrompt: question.followUpPrompt
    }))
  }))
};

describe("interview blueprint schema", () => {
  it("accepts a valid interview blueprint with ordered stages and questions", () => {
    expect(validateInterviewBlueprint(validBlueprint)).toEqual({
      ok: true,
      data: validBlueprint,
      errors: []
    });
  });

  it("rejects invalid enums, empty benchmark fields, and missing question ordering deterministically", () => {
    const invalidBlueprint = {
      ...validBlueprint,
      responseMode: "phone_call",
      toneProfile: "friendly",
      parsingStrategy: "manual",
      benchmarkSummary: " ",
      stages: [
        {
          stageLabel: "",
          stageOrder: 0,
          questions: [
            {
              questionText: " ",
              questionOrder: 0,
              intent: "",
              evaluationFocus: " ",
              strongSignal: "",
              failureSignal: " ",
              followUpPrompt: ""
            }
          ]
        }
      ]
    };

    expect(validateInterviewBlueprint(invalidBlueprint)).toEqual({
      ok: false,
      data: null,
      errors: [
        "responseMode must be one of text, voice_agent.",
        "toneProfile must be one of direct, supportive, neutral, high-precision.",
        "parsingStrategy must be one of keyword_match, evidence_extraction, rubric_scoring, hybrid.",
        "benchmarkSummary is required.",
        "stages[0].stageLabel is required.",
        "stages[0].stageOrder must be a positive integer.",
        "stages[0].questions[0].questionText is required.",
        "stages[0].questions[0].questionOrder must be a positive integer.",
        "stages[0].questions[0].intent is required.",
        "stages[0].questions[0].evaluationFocus is required.",
        "stages[0].questions[0].strongSignal is required.",
        "stages[0].questions[0].failureSignal is required.",
        "stages[0].questions[0].followUpPrompt is required."
      ]
    });
  });
});

describe("interview blueprint normalization and completeness", () => {
  it("normalizes whitespace while preserving stable order", () => {
    expect(
      normalizeInterviewBlueprint({
        ...validBlueprint,
        title: "  Platform Engineer Interview Plan  ",
        objective: " Assess architecture ownership, delivery judgment, and communication quality. ",
        stages: [
          {
            ...validBlueprint.stages[0],
            stageLabel: "  Screen  ",
            questions: [
              {
                ...validBlueprint.stages[0].questions[0],
                questionText: "  Tell me about a recent system you owned end to end.  "
              }
            ]
          },
          validBlueprint.stages[1]
        ]
      })
    ).toEqual(validBlueprint);
  });

  it("returns explicit completeness gaps for missing response mode, parsing strategy, benchmark summary, and questions", () => {
    expect(
      deriveInterviewBlueprintCompletenessGaps({
        ...validBlueprint,
        responseMode: "" as never,
        parsingStrategy: "" as never,
        benchmarkSummary: " ",
        stages: [
          {
            stageLabel: "Screen",
            stageOrder: 1,
            questions: []
          }
        ]
      })
    ).toEqual([
      "Select response mode for the interview plan.",
      "Select parsing strategy for interview evaluation.",
      "Add at least one benchmark summary for evaluator guidance.",
      "Add at least one interview question to stage: Screen."
    ]);
  });
});
