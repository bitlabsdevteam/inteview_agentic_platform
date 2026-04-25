import { describe, expect, it } from "vitest";

import {
  buildEmployerJobDraftInsert,
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
    expect(getNextEmployerJobStatus("draft", "publish")).toBeNull();
    expect(getNextEmployerJobStatus("published", "publish")).toBeNull();
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
  });
});
