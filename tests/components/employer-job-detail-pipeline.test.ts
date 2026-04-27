import { describe, expect, it } from "vitest";

import {
  BASELINE_INTERVIEW_BLUEPRINT_FIXTURE,
  PIPELINE_STAGE_FIXTURES,
  PIPELINE_STAGE_STATES
} from "../agents/job-posting/pipeline-fixtures";

describe("employer job detail pipeline setup", () => {
  it("defines the three v14 pipeline stages in sprint order", () => {
    expect(PIPELINE_STAGE_FIXTURES).toEqual([
      {
        key: "job_posting",
        label: "Build Job Posting",
        description: "Create the role profile, clarify constraints, and refine the JD."
      },
      {
        key: "interview_structure",
        label: "Design Interview Structure",
        description: "Configure questions, mode, tone, parsing strategy, and benchmarks."
      },
      {
        key: "review",
        label: "Review And Approve",
        description: "Confirm readiness, resolve blockers, and submit for employer review."
      }
    ]);
  });

  it("defines the shared stage-state vocabulary for unit and ui tests", () => {
    expect(PIPELINE_STAGE_STATES).toEqual(["current", "complete", "blocked", "upcoming"]);
  });

  it("provides a baseline interview blueprint fixture with deterministic defaults", () => {
    expect(BASELINE_INTERVIEW_BLUEPRINT_FIXTURE).toEqual({
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
          questions: [
            {
              questionText: "Tell me about a recent system you owned end to end.",
              intent: "Establish ownership scope and delivery complexity.",
              evaluationFocus: "Ownership",
              strongSignal: "Names clear decisions, constraints, and results.",
              failureSignal: "Stays generic and cannot describe personal impact.",
              followUpPrompt: "What tradeoffs did you make and why?"
            }
          ]
        },
        {
          stageLabel: "Technical Deep Dive",
          questions: [
            {
              questionText: "How would you design a resilient pipeline for high-volume employer events?",
              intent: "Evaluate architecture depth and operational judgment.",
              evaluationFocus: "System design",
              strongSignal: "Explains scaling, failure modes, and monitoring choices.",
              failureSignal: "Focuses only on happy-path implementation details.",
              followUpPrompt: "Where would you expect the first bottleneck to appear?"
            }
          ]
        }
      ]
    });
  });
});
