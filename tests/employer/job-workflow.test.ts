import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildEmployerJobDraftInsert,
  getEmployerJobReviewGate,
  getEmployerJobPrimaryAction,
  getNextEmployerJobStatus,
  type EmployerJobInput
} from "@/lib/employer/jobs";

const input: EmployerJobInput = {
  title: "Senior Data Engineer",
  department: "Platform",
  level: "Senior",
  location: "Remote US",
  compensationBand: "$170k-$210k",
  hiringProblem: "Improve warehouse reliability for product analytics.",
  outcomes: "Reliable models, faster incident response, clearer ownership.",
  requirements: "Postgres, dbt, orchestration, cross-functional delivery.",
  interviewLoop: "Recruiter screen, hiring manager, technical panel, final review."
};

describe("employer job workflow", () => {
  it("builds a server-owned draft insert without publishing side effects", () => {
    expect(buildEmployerJobDraftInsert("employer-user-1", input)).toEqual({
      employer_user_id: "employer-user-1",
      title: "Senior Data Engineer",
      department: "Platform",
      level: "Senior",
      location: "Remote US",
      compensation_band: "$170k-$210k",
      status: "draft",
      brief: {
        hiringProblem: "Improve warehouse reliability for product analytics.",
        outcomes: "Reliable models, faster incident response, clearer ownership.",
        requirements: "Postgres, dbt, orchestration, cross-functional delivery.",
        interviewLoop: "Recruiter screen, hiring manager, technical panel, final review."
      },
      draft_description:
        "Senior Data Engineer\n\nDepartment: Platform\nLevel: Senior\nLocation: Remote US\nCompensation: $170k-$210k\n\nHiring problem\nImprove warehouse reliability for product analytics.\n\nFirst outcomes\nReliable models, faster incident response, clearer ownership.\n\nRequirements\nPostgres, dbt, orchestration, cross-functional delivery.\n\nInterview loop\nRecruiter screen, hiring manager, technical panel, final review.",
      published_at: null
    });
  });

  it("uses review as the required step before publishing", () => {
    expect(getNextEmployerJobStatus("draft", "submit_for_review")).toBe("needs_review");
    expect(getNextEmployerJobStatus("needs_review", "publish")).toBe("published");
    expect(getNextEmployerJobStatus("published", "archive")).toBe("archived");
    expect(getNextEmployerJobStatus("closed", "archive")).toBe("archived");
    expect(getNextEmployerJobStatus("draft", "publish")).toBeNull();
    expect(getNextEmployerJobStatus("published", "publish")).toBeNull();
    expect(getNextEmployerJobStatus("archived", "archive")).toBeNull();
  });

  it("returns status-aware primary actions for the employer job list", () => {
    expect(getEmployerJobPrimaryAction("draft")).toEqual({
      label: "Continue",
      intent: "continue"
    });
    expect(getEmployerJobPrimaryAction("needs_review")).toEqual({
      label: "Review",
      intent: "review"
    });
    expect(getEmployerJobPrimaryAction("published")).toEqual({
      label: "View",
      intent: "view"
    });
    expect(getEmployerJobPrimaryAction("closed")).toEqual({
      label: "View",
      intent: "view"
    });
    expect(getEmployerJobPrimaryAction("archived")).toEqual({
      label: "View",
      intent: "view"
    });
  });

  it("gates draft-to-review transition when critical quality failures exist", () => {
    expect(
      getEmployerJobReviewGate({
        status: "draft",
        qualityCheckStatuses: ["fail", "warn"]
      })
    ).toEqual({
      canSubmitForReview: false,
      blocksReview: true,
      requiresEmployerFix: true,
      warningMessage: "Critical quality failures must be fixed before this job can move to review."
    });

    expect(
      getEmployerJobReviewGate({
        status: "draft",
        qualityCheckStatuses: ["warn", "pass"]
      })
    ).toEqual({
      canSubmitForReview: true,
      blocksReview: false,
      requiresEmployerFix: true,
      warningMessage: "Quality warnings are present. Resolve them before review when possible."
    });

    expect(
      getEmployerJobReviewGate({
        status: "needs_review",
        qualityCheckStatuses: ["pass"]
      })
    ).toEqual({
      canSubmitForReview: false,
      blocksReview: false,
      requiresEmployerFix: false,
      warningMessage: null
    });
  });

  it("keeps review blocked when interview structure completeness gaps remain unresolved", () => {
    expect(
      getEmployerJobReviewGate({
        status: "draft",
        qualityCheckStatuses: ["pass"],
        interviewBlueprintCompletenessGaps: [
          "Add at least one benchmark summary for evaluator guidance."
        ]
      } as never)
    ).toEqual({
      canSubmitForReview: false,
      blocksReview: true,
      requiresEmployerFix: true,
      warningMessage:
        "Interview structure is incomplete. Resolve blueprint readiness gaps before this job can move to review."
    });

    expect(
      getEmployerJobReviewGate({
        status: "draft",
        qualityCheckStatuses: ["fail"],
        interviewBlueprintCompletenessGaps: [
          "Add at least one interview question to define the interview plan."
        ]
      } as never)
    ).toEqual({
      canSubmitForReview: false,
      blocksReview: true,
      requiresEmployerFix: true,
      warningMessage:
        "Critical quality failures and interview structure blockers must be fixed before this job can move to review."
    });
  });

  it("does not render persistent reasoning or thinking boxes in employer job detail rail", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "src/app/employer/jobs/[id]/page.tsx"),
      "utf8"
    );

    expect(pageSource).not.toContain("Agent Transparency");
    expect(pageSource).not.toContain("Reasoning Summary");
    expect(pageSource).not.toContain("Thinking Messages");
  });

  it("uses unframed right-side layout sections for employer new/detail job pages", () => {
    const newPageSource = readFileSync(
      join(process.cwd(), "src/app/employer/jobs/new/page.tsx"),
      "utf8"
    );
    const detailPageSource = readFileSync(
      join(process.cwd(), "src/app/employer/jobs/[id]/page.tsx"),
      "utf8"
    );

    expect(newPageSource).not.toContain("employer-job-agent__panel");
    expect(detailPageSource).not.toContain("employer-rail-card");
    expect(detailPageSource).toContain("getEmployerJobReviewGate");
    expect(detailPageSource).toContain("reviewGate.warningMessage");
    expect(detailPageSource).toContain("disabled={!canSubmitForReview}");
    expect(detailPageSource).toContain("interviewBlueprintCompletenessGaps");
  });
});
