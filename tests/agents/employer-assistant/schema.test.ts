import { describe, expect, it } from "vitest";

import {
  type EmployerAssistantRecommendation,
  validateEmployerAssistantRecommendation
} from "@/lib/agents/employer-assistant/schema";

const validRecommendation: EmployerAssistantRecommendation = {
  action: "screen_candidate",
  rationale:
    "Candidate profile has strong backend depth, but role-specific architecture signal is still missing.",
  evidenceReferences: [
    {
      sourceType: "candidate_score",
      referenceId: "candidate-profile-score:9b1deb4d",
      quote: "roleExperience=0.61 and domainContext=0.53 are below target.",
      relevance: 0.92
    },
    {
      sourceType: "job_requirement",
      referenceId: "job-requirement:architecture-depth",
      quote: "Own service boundaries and scaling strategy for agent orchestration.",
      relevance: 0.86
    }
  ],
  riskFlags: [
    {
      code: "missing_system_design_signal",
      severity: "medium",
      message: "No concrete distributed-system ownership evidence found."
    }
  ],
  screeningKit: {
    title: "Architecture Signal Follow-Up",
    objective: "Collect architecture-depth signal before interview progression.",
    questions: [
      {
        question: "Describe a distributed service decomposition you owned end-to-end.",
        competency: "system_design",
        intent: "Assess architecture ownership and tradeoff quality.",
        rubricDimension: "architecture_depth",
        uncertaintyFlag: true
      }
    ]
  }
};

describe("employer assistant schema", () => {
  it("accepts valid recommendation contracts with screening kit payload", () => {
    expect(validateEmployerAssistantRecommendation(validRecommendation)).toEqual({
      ok: true,
      data: validRecommendation,
      errors: []
    });
  });

  it("accepts valid recommendation contracts without screening kit payload", () => {
    const withoutScreeningKit = {
      ...validRecommendation,
      action: "review_candidate",
      screeningKit: undefined
    };

    expect(validateEmployerAssistantRecommendation(withoutScreeningKit)).toEqual({
      ok: true,
      data: withoutScreeningKit,
      errors: []
    });
  });

  it("rejects malformed recommendation deterministically", () => {
    const invalidRecommendation = {
      ...validRecommendation,
      action: "auto_reject",
      rationale: " ",
      evidenceReferences: [
        {
          sourceType: "made_up_source",
          referenceId: "",
          quote: " ",
          relevance: 1.2
        }
      ],
      riskFlags: [
        {
          code: "",
          severity: "critical",
          message: " ",
          mitigation: " "
        }
      ],
      screeningKit: {
        title: "",
        objective: " ",
        questions: [
          {
            question: " ",
            competency: "",
            intent: " ",
            rubricDimension: "",
            uncertaintyFlag: "yes"
          }
        ]
      }
    };

    expect(validateEmployerAssistantRecommendation(invalidRecommendation)).toEqual({
      ok: false,
      data: null,
      errors: [
        "action must be one of screen_candidate, request_more_signal, review_candidate, improve_job_requirements.",
        "rationale is required.",
        "evidenceReferences[0].sourceType must be one of candidate_score, candidate_profile, job_requirement, resume_excerpt.",
        "evidenceReferences[0].referenceId is required.",
        "evidenceReferences[0].quote is required.",
        "evidenceReferences[0].relevance must be a number between 0 and 1.",
        "riskFlags[0].code is required.",
        "riskFlags[0].severity must be one of low, medium, high.",
        "riskFlags[0].message is required.",
        "riskFlags[0].mitigation must be a non-empty string when provided.",
        "screeningKit.title is required.",
        "screeningKit.objective is required.",
        "screeningKit.questions[0].question is required.",
        "screeningKit.questions[0].competency is required.",
        "screeningKit.questions[0].intent is required.",
        "screeningKit.questions[0].rubricDimension is required.",
        "screeningKit.questions[0].uncertaintyFlag must be a boolean."
      ]
    });
  });
});
