import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  V15_AGENT_CHAT_PROPS_FIXTURE,
  V15_READONLY_ARTIFACT_SECTION_FIXTURES,
  V15_WORKSPACE_LAYOUT_FIXTURES
} from "./v15-workspace-fixtures";

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

describe("v15 read-only workspace fixtures", () => {
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
      draft_description:
        "Lead the employer-side recruiting assistant experience from role intake to review-ready job creation.",
      created_at: "2026-04-27T00:00:00.000Z",
      updated_at: "2026-04-27T00:00:00.000Z",
      published_at: null
    });

    getEmployerJobAssistantState.mockResolvedValue({
      session: V15_AGENT_CHAT_PROPS_FIXTURE.initialSession,
      messages: V15_AGENT_CHAT_PROPS_FIXTURE.initialMessages,
      memory: V15_AGENT_CHAT_PROPS_FIXTURE.initialMemory,
      roleProfileSummary: V15_AGENT_CHAT_PROPS_FIXTURE.initialRoleProfileSummary,
      qualityChecks: V15_AGENT_CHAT_PROPS_FIXTURE.initialQualityChecks,
      readinessFlags: V15_AGENT_CHAT_PROPS_FIXTURE.initialReadinessFlags
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

  it("defines a two-panel workspace with a read-only artifact on the left and chat-only rail on the right", () => {
    expect(V15_WORKSPACE_LAYOUT_FIXTURES).toEqual([
      {
        key: "read_only_artifact",
        label: "Read-Only Generated Artifact",
        description: "Show the full created hiring artifact in display mode on the left."
      },
      {
        key: "agent_chat_only",
        label: "Agent Chat Only",
        description: "Keep the right panel limited to the agent thread and composer."
      }
    ]);
  });

  it("defines the read-only artifact sections that later page tests should render", () => {
    expect(V15_READONLY_ARTIFACT_SECTION_FIXTURES.map((section) => section.label)).toEqual([
      "Role Profile Summary",
      "Generated Job Posting",
      "Interview Structure Summary",
      "Review Notes"
    ]);
  });

  it("requires the employer job detail route to render a single read-only workspace instead of a stage pipeline", async () => {
    const { default: EmployerJobDetailPage } = await import("@/app/employer/jobs/[id]/page");
    const markup = renderToStaticMarkup(
      await EmployerJobDetailPage({
        params: Promise.resolve({ id: "job-1" })
      })
    );

    expect(enforceRouteAccess).toHaveBeenCalledWith("/employer/jobs");
    expect(markup).toContain('data-testid="employer-job-readonly-workspace"');
    expect(markup).toContain("Read-Only Generated Artifact");

    for (const section of V15_READONLY_ARTIFACT_SECTION_FIXTURES) {
      expect(markup).toContain(section.label);
    }

    expect(markup).not.toContain('data-testid="employer-job-detail-pipeline"');
    expect(markup).not.toContain("Build Job Posting");
    expect(markup).not.toContain("Design Interview Structure");
    expect(markup).not.toContain("Review And Approve");
    expect(markup).not.toContain('data-testid="employer-interview-blueprint-panel"');
    expect(markup).not.toContain('data-testid="employer-job-detail-form"');
    expect(markup).not.toContain('name="title"');
    expect(markup).not.toContain('name="responseMode"');
    expect(markup).not.toContain('name="benchmarkSummary"');
  });

  it("rejects stage query navigation and keeps the route on one read-only workspace surface", async () => {
    const { default: EmployerJobDetailPage } = await import("@/app/employer/jobs/[id]/page");
    const markup = renderToStaticMarkup(
      await EmployerJobDetailPage({
        params: Promise.resolve({ id: "job-1" }),
        searchParams: Promise.resolve({
          stage: "interview_structure"
        })
      })
    );

    expect(markup).toContain('data-testid="employer-job-readonly-workspace"');
    expect(markup).not.toContain("?stage=job_posting");
    expect(markup).not.toContain("?stage=interview_structure");
    expect(markup).not.toContain("?stage=review");
    expect(markup).not.toContain('data-testid="employer-job-stage-panel-job_posting"');
    expect(markup).not.toContain('data-testid="employer-job-stage-panel-interview_structure"');
    expect(markup).not.toContain('data-testid="employer-job-stage-panel-review"');
  });

  it("removes leftover stage-routing hooks from the employer job detail route source", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "src/app/employer/jobs/[id]/page.tsx"),
      "utf8"
    );

    expect(pageSource).not.toContain("activeStage");
    expect(pageSource).not.toContain("stageSummary");
    expect(pageSource).not.toContain("searchParams?");
    expect(pageSource).not.toContain("?stage=");
  });
});
