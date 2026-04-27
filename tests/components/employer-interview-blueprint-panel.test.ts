import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BASELINE_INTERVIEW_BLUEPRINT_FIXTURE } from "../agents/job-posting/pipeline-fixtures";
import { EmployerInterviewBlueprintPanel } from "@/components/employer-interview-blueprint-panel";

const blueprint = {
  ...BASELINE_INTERVIEW_BLUEPRINT_FIXTURE,
  stages: BASELINE_INTERVIEW_BLUEPRINT_FIXTURE.stages.map((stage, stageIndex) => ({
    stageLabel: stage.stageLabel,
    stageOrder: stageIndex + 1,
    questions: stage.questions.map((question, questionIndex) => ({
      ...question,
      questionOrder: questionIndex + 1
    }))
  }))
};

describe("employer interview blueprint panel", () => {
  it("renders ordered question rows plus response mode, tone, parsing strategy, and benchmark controls", () => {
    const markup = renderToStaticMarkup(
      React.createElement(EmployerInterviewBlueprintPanel, {
        jobId: "job-1",
        stageState: "current",
        blueprint,
        completenessGaps: []
      })
    );

    expect(markup).toContain('data-testid="employer-interview-blueprint-panel"');
    expect(markup).toContain("Interview Structure Design");
    expect(markup).toContain('name="responseMode"');
    expect(markup).toContain('name="toneProfile"');
    expect(markup).toContain('name="parsingStrategy"');
    expect(markup).toContain('name="benchmarkSummary"');
    expect(markup).toContain('data-testid="employer-interview-question-row"');
    expect(markup).toContain("Tell me about a recent system you owned end to end.");
    expect(markup).toContain("How would you design a resilient pipeline for high-volume employer events?");
  });

  it("renders readiness hints when the interview plan is blocked by missing configuration", () => {
    const markup = renderToStaticMarkup(
      React.createElement(EmployerInterviewBlueprintPanel, {
        jobId: "job-1",
        stageState: "blocked",
        blueprint: {
          ...blueprint,
          responseMode: "voice_agent",
          parsingStrategy: "hybrid",
          benchmarkSummary: "",
          stages: [
            {
              stageLabel: "Technical Deep Dive",
              stageOrder: 1,
              questions: []
            }
          ]
        },
        completenessGaps: [
          "Add at least one benchmark summary for evaluator guidance.",
          "Add at least one interview question to stage: Technical Deep Dive."
        ]
      })
    );

    expect(markup).toContain('data-stage-state="blocked"');
    expect(markup).toContain("Readiness Hints");
    expect(markup).toContain("Add at least one benchmark summary for evaluator guidance.");
    expect(markup).toContain(
      "Add at least one interview question to stage: Technical Deep Dive."
    );
  });
});
