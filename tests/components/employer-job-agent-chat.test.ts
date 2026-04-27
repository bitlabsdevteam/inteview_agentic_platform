import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EmployerJobAgentChat } from "@/components/employer-job-agent-chat";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

describe("employer job agent chat ui", () => {
  it("renders role profile summary and quality warning guidance blocks", () => {
    const html = renderToStaticMarkup(
      React.createElement(EmployerJobAgentChat, {
        jobId: "job-1",
        initialSession: {
          id: "session-1",
          status: "needs_follow_up",
          assumptions: [],
          missingCriticalFields: [],
          followUpQuestions: [],
          updatedAt: "2026-04-28T00:00:00.000Z"
        },
        initialMessages: [],
        initialMemory: { summary: null, compacted: false },
        initialRoleProfileSummary: {
          title: "Senior AI Product Engineer",
          department: "Engineering",
          level: "Senior",
          locationPolicy: "Remote US",
          compensationRange: "$180k-$220k",
          unresolvedConstraints: ["Hiring manager not yet confirmed"],
          conflicts: []
        },
        initialQualityChecks: [
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
        initialReadinessFlags: { blocksReview: true, requiresEmployerFix: true }
      })
    );

    expect(html).toContain("Role Profile Summary");
    expect(html).toContain("Senior AI Product Engineer");
    expect(html).toContain("Hiring manager not yet confirmed");
    expect(html).toContain("Quality Warnings");
    expect(html).toContain("Missing required section: Interview process.");
    expect(html).toContain("Add explicit interview process section.");
    expect(html).toContain("Review is currently blocked");
  });
});
