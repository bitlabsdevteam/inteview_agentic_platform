import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
const notFound = vi.fn(() => {
  throw new Error("NOT_FOUND");
});

const enforceRouteAccess = vi.fn();
const getUser = vi.fn();
const getEmployerJob = vi.fn();
const getEmployerJobAssistantState = vi.fn();
const getEmployerJobInterviewBlueprintByJob = vi.fn();
const listEmployerJobInterviewQuestionsByBlueprint = vi.fn();

vi.mock("next/navigation", () => ({
  redirect,
  notFound,
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

vi.mock("@/lib/auth/enforce-route-access", () => ({
  enforceRouteAccess
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser
    }
  }))
}));

vi.mock("@/lib/employer/job-assistant-state", () => ({
  getEmployerJobAssistantState
}));

vi.mock("@/lib/agents/job-posting/interview-blueprint-persistence", async () => {
  const actual = await vi.importActual("@/lib/agents/job-posting/interview-blueprint-persistence");

  return {
    ...actual,
    getEmployerJobInterviewBlueprintByJob,
    listEmployerJobInterviewQuestionsByBlueprint
  };
});

vi.mock("@/lib/employer/jobs", async () => {
  const actual = await vi.importActual("@/lib/employer/jobs");

  return {
    ...actual,
    getEmployerJob
  };
});

describe("employer job detail pipeline shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.React = React;

    getUser.mockResolvedValue({
      data: {
        user: {
          id: "employer-user-1",
          user_metadata: {
            role: "employer"
          }
        }
      }
    });

    getEmployerJob.mockResolvedValue({
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
        outcomes: "- Ship prompt-first job creation.",
        requirements: "- Next.js\n- Postgres\n- Hiring systems experience",
        interviewLoop: "- Recruiter screen\n- Technical panel"
      },
      draft_description: "Draft body",
      created_at: "2026-04-27T00:00:00.000Z",
      updated_at: "2026-04-27T00:00:00.000Z",
      published_at: null
    });

    getEmployerJobAssistantState.mockResolvedValue({
      session: {
        id: "session-1",
        status: "draft_created",
        assumptions: [],
        missingCriticalFields: [],
        followUpQuestions: [],
        updatedAt: "2026-04-27T00:00:00.000Z"
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
        unresolvedConstraints: [],
        conflicts: []
      },
      qualityChecks: [],
      readinessFlags: {
        blocksReview: false,
        requiresEmployerFix: false
      }
    });

    getEmployerJobInterviewBlueprintByJob.mockResolvedValue({
      id: "blueprint-1",
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      status: "draft",
      title: "Platform Engineer Interview Plan",
      objective: "Assess architecture ownership and communication quality.",
      response_mode: "voice_agent",
      tone_profile: "high-precision",
      parsing_strategy: "hybrid",
      benchmark_summary:
        "Advance candidates who show concrete ownership examples and clear tradeoff reasoning.",
      approval_notes: "Employer review required before candidate-facing activation.",
      created_at: "2026-04-27T00:00:00.000Z",
      updated_at: "2026-04-27T00:00:00.000Z"
    });

    listEmployerJobInterviewQuestionsByBlueprint.mockResolvedValue([
      {
        id: "question-1",
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
        follow_up_prompt: "What tradeoffs did you make and why?",
        created_at: "2026-04-27T00:00:00.000Z",
        updated_at: "2026-04-27T00:00:00.000Z"
      }
    ]);
  });

  it("renders a visible pipeline status bar and switches the main panel to the active stage", async () => {
    const { default: EmployerJobDetailPage } = await import("@/app/employer/jobs/[id]/page");
    const markup = renderToStaticMarkup(
      await EmployerJobDetailPage({
        params: Promise.resolve({ id: "job-1" })
      })
    );

    expect(enforceRouteAccess).toHaveBeenCalledWith("/employer/jobs");
    expect(markup).toContain('data-testid="employer-job-detail-pipeline"');
    expect(markup).toContain("Build Job Posting");
    expect(markup).toContain("Design Interview Structure");
    expect(markup).toContain("Review And Approve");
    expect(markup).toContain('data-stage-key="job_posting"');
    expect(markup).toContain('data-stage-key="interview_structure"');
    expect(markup).toContain('data-stage-key="review"');
    expect(markup).toContain('data-stage-state="complete"');
    expect(markup).toContain('data-stage-state="current"');
    expect(markup).toContain('data-testid="employer-job-stage-panel-interview_structure"');
    expect(markup).toContain("Interview Structure Design");
    expect(markup).toContain('data-testid="employer-job-review-button"');
    expect(markup).not.toContain('data-testid="employer-job-detail-form"');
  });

  it("lets the route select a completed stage panel without changing assistant-owned pipeline state", async () => {
    const { default: EmployerJobDetailPage } = await import("@/app/employer/jobs/[id]/page");
    const markup = renderToStaticMarkup(
      await EmployerJobDetailPage({
        params: Promise.resolve({ id: "job-1" }),
        searchParams: Promise.resolve({
          stage: "job_posting"
        })
      })
    );

    expect(markup).toContain('data-testid="employer-job-detail-form"');
    expect(markup).not.toContain('data-testid="employer-job-stage-panel-interview_structure"');
    expect(markup).toContain('href="/employer/jobs/job-1?stage=job_posting"');
  });

  it("shows review as blocked in the status bar when stage 1 or stage 2 is incomplete", async () => {
    getEmployerJobAssistantState.mockResolvedValue({
      session: {
        id: "session-1",
        status: "draft_created",
        assumptions: [],
        missingCriticalFields: [],
        followUpQuestions: [],
        updatedAt: "2026-04-27T00:00:00.000Z"
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
        unresolvedConstraints: [],
        conflicts: []
      },
      qualityChecks: [
        {
          checkType: "completeness",
          status: "fail",
          issues: ["Missing required section: Interview process."],
          suggestedRewrite: "Add explicit interview process section."
        }
      ],
      readinessFlags: {
        blocksReview: true,
        requiresEmployerFix: true
      }
    });
    listEmployerJobInterviewQuestionsByBlueprint.mockResolvedValue([]);

    const { default: EmployerJobDetailPage } = await import("@/app/employer/jobs/[id]/page");
    const markup = renderToStaticMarkup(
      await EmployerJobDetailPage({
        params: Promise.resolve({ id: "job-1" })
      })
    );

    expect(markup).toContain('data-stage-key="review"');
    expect(markup).toContain('data-stage-state="blocked"');
    expect(markup).toContain("Review is blocked until job posting and interview design are complete.");
    expect(markup).toContain("Resolve critical quality failures before moving to interview design.");
    expect(markup).toContain('data-testid="employer-job-review-button"');
    expect(markup).toContain("disabled");
  });
});
