import { describe, expect, it } from "vitest";

import {
  buildEmployerJobReadonlyWorkspace,
  type EmployerJobInterviewBlueprintSummary
} from "@/lib/employer/job-readonly-workspace";
import type { EmployerJobAssistantState } from "@/lib/employer/job-assistant-state";
import type { EmployerJobRecord } from "@/lib/employer/jobs";

const job: EmployerJobRecord = {
  id: "job-1",
  employer_user_id: "employer-user-1",
  title: "Senior AI Product Engineer",
  department: "Engineering",
  level: "Senior",
  location: "Remote US",
  compensation_band: "$180k-$220k",
  status: "draft",
  brief: {
    hiringProblem: "Build reliable AI interview workflows.",
    outcomes: "Ship prompt-first employer job creation and stronger review readiness.",
    requirements: "Next.js, Postgres, hiring systems experience.",
    interviewLoop: "Recruiter screen, technical panel, hiring manager review."
  },
  draft_description:
    "Lead the employer-side recruiting assistant experience from role intake to review-ready job creation.",
  created_at: "2026-04-27T00:00:00.000Z",
  updated_at: "2026-04-27T00:00:00.000Z",
  published_at: null
};

const assistantState: EmployerJobAssistantState = {
  session: {
    id: "session-1",
    status: "needs_follow_up",
    assumptions: [],
    missingCriticalFields: [],
    followUpQuestions: [],
    updatedAt: "2026-04-28T00:00:00.000Z"
  },
  messages: [],
  memory: {
    summary: null,
    compacted: false
  },
  roleProfileSummary: {
    title: "Senior AI Product Engineer",
    department: "Engineering",
    level: "Senior",
    locationPolicy: "Remote US",
    compensationRange: "$180k-$220k",
    unresolvedConstraints: ["Hiring manager not yet confirmed"],
    conflicts: []
  },
  qualityChecks: [
    {
      checkType: "completeness",
      status: "warn",
      issues: ["Missing required section: Interview process."],
      suggestedRewrite: "Add explicit interview process section."
    },
    {
      checkType: "discriminatory_phrasing",
      status: "fail",
      issues: ["Potentially biased phrase detected: 'rockstar engineer'."],
      suggestedRewrite: "Use skill-based language."
    }
  ],
  readinessFlags: {
    blocksReview: true,
    requiresEmployerFix: true
  }
};

const interviewBlueprintSummary: EmployerJobInterviewBlueprintSummary = {
  id: "blueprint-1",
  title: "Platform Engineer Interview Plan",
  objective: "Assess architecture ownership and communication quality.",
  responseMode: "voice_agent",
  toneProfile: "high-precision",
  parsingStrategy: "hybrid",
  benchmarkSummary:
    "Advance candidates who show concrete ownership examples and clear tradeoff reasoning.",
  questionCount: 2,
  completenessGaps: [],
  stages: [
    {
      stageLabel: "Screen",
      stageOrder: 1,
      questions: [
        {
          questionOrder: 1,
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
      stageOrder: 2,
      questions: [
        {
          questionOrder: 1,
          questionText: "How would you design a resilient employer-event pipeline?",
          intent: "Evaluate architecture depth and operational judgment.",
          evaluationFocus: "System design",
          strongSignal: "Explains scaling, failure modes, and monitoring choices.",
          failureSignal: "Focuses only on happy-path implementation details.",
          followUpPrompt: "Where would you expect the first bottleneck to appear?"
        }
      ]
    }
  ]
};

describe("employer job readonly workspace", () => {
  it("assembles the four read-only workspace sections from persisted job and assistant context", () => {
    const workspace = buildEmployerJobReadonlyWorkspace({
      job,
      assistantState,
      interviewBlueprintSummary,
      reviewWarningMessage:
        "Critical quality failures must be fixed before this job can move to review."
    });

    expect(workspace.header.statusLabel).toBe("Draft");
    expect(workspace.header.title).toBe("Senior AI Product Engineer");
    expect(workspace.sections.map((section) => section.label)).toEqual([
      "Role Profile Summary",
      "Generated Job Posting",
      "Interview Structure Summary",
      "Review Notes"
    ]);

    expect(workspace.sections[0]?.items).toContainEqual({
      label: "Title",
      value: "Senior AI Product Engineer"
    });
    expect(workspace.sections[1]?.body).toContain(
      "Lead the employer-side recruiting assistant experience from role intake to review-ready job creation."
    );
    expect(workspace.sections[2]?.items).toContainEqual({
      label: "Response mode",
      value: "Voice Agent"
    });
    expect(workspace.sections[3]?.bullets).toContain(
      "Critical quality failures must be fixed before this job can move to review."
    );
  });

  it("surfaces unresolved constraints, question coverage, and quality rewrites in reviewable text", () => {
    const workspace = buildEmployerJobReadonlyWorkspace({
      job,
      assistantState,
      interviewBlueprintSummary,
      reviewWarningMessage:
        "Critical quality failures and interview structure blockers must be fixed before this job can move to review."
    });

    expect(workspace.sections[0]?.bullets).toContain("Hiring manager not yet confirmed");
    expect(workspace.sections[2]?.bullets).toContain("Screen: Tell me about a recent system you owned end to end.");
    expect(workspace.sections[2]?.bullets).toContain(
      "Technical Deep Dive: How would you design a resilient employer-event pipeline?"
    );
    expect(workspace.sections[3]?.bullets).toContain(
      "Completeness: Missing required section: Interview process."
    );
    expect(workspace.sections[3]?.bullets).toContain(
      "Discriminatory Phrasing: Use skill-based language."
    );
  });

  it("falls back gracefully when role profile or interview structure are not ready yet", () => {
    const workspace = buildEmployerJobReadonlyWorkspace({
      job,
      assistantState: {
        ...assistantState,
        roleProfileSummary: null,
        qualityChecks: [],
        readinessFlags: {
          blocksReview: false,
          requiresEmployerFix: false
        }
      },
      interviewBlueprintSummary: {
        ...interviewBlueprintSummary,
        id: null,
        title: "Interview plan not started",
        objective: "Define the interview structure after the job posting is ready.",
        responseMode: null,
        toneProfile: null,
        parsingStrategy: null,
        benchmarkSummary: "",
        questionCount: 0,
        completenessGaps: [
          "Select response mode for the interview plan.",
          "Add at least one benchmark summary for evaluator guidance."
        ],
        stages: []
      },
      reviewWarningMessage: null
    });

    expect(workspace.sections[0]?.body).toContain("Role profile will populate after refinement turns.");
    expect(workspace.sections[2]?.body).toContain(
      "Define the interview structure after the job posting is ready."
    );
    expect(workspace.sections[2]?.bullets).toContain(
      "Select response mode for the interview plan."
    );
    expect(workspace.sections[3]?.bullets).toContain(
      "No blocking review warnings remain. Employer approval is still required before publishing."
    );
  });
});
