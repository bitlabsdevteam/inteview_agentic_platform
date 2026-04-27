import { describe, expect, it } from "vitest";

import type { RoleProfile } from "@/lib/agents/job-posting/role-profile";
import {
  evaluateJobDescriptionQuality,
  type JobDescriptionQualityResult
} from "@/lib/agents/job-posting/quality-controls";

const profile: RoleProfile = {
  title: "Senior AI Product Engineer",
  department: "Engineering",
  level: "Senior",
  locationPolicy: "Remote US",
  compensationRange: "$180k-$220k",
  mustHaveRequirements: ["Next.js", "Postgres", "System design"],
  niceToHaveRequirements: ["Recruiting-tech experience"],
  businessOutcomes: ["Ship employer recruiting assistant roadmap"],
  interviewLoopIntent: ["Recruiter screen", "Technical architecture interview"],
  unresolvedConstraints: [],
  conflicts: [],
  confidence: {
    title: 0.95,
    department: 0.91,
    level: 0.9,
    locationPolicy: 0.95,
    compensationRange: 0.9
  }
};

function byType(result: JobDescriptionQualityResult) {
  return new Map(result.checks.map((item) => [item.checkType, item]));
}

describe("quality controls contract", () => {
  it("returns deterministic pass statuses for a complete, readable, and policy-safe JD", () => {
    const jd = [
      "About the role: We are hiring a Senior AI Product Engineer to build employer recruiting assistant features.",
      "Responsibilities: Own roadmap execution, implement backend and frontend features, and partner with hiring stakeholders.",
      "Requirements: 5+ years engineering, strong Next.js + Postgres experience, and production system design.",
      "Compensation: $180k-$220k plus benefits.",
      "Interview process: recruiter screen and technical architecture interview."
    ].join("\n\n");

    const result = evaluateJobDescriptionQuality({
      draftDescription: jd,
      profile
    });

    expect(result.overallStatus).toBe("pass");
    expect(result.checks).toHaveLength(4);

    const checks = byType(result);
    expect(checks.get("completeness")?.status).toBe("pass");
    expect(checks.get("readability")?.status).toBe("pass");
    expect(checks.get("discriminatory_phrasing")?.status).toBe("pass");
    expect(checks.get("requirement_contradiction")?.status).toBe("pass");
  });

  it("returns warn/fail findings with rewrite guidance for missing sections and unsafe phrasing", () => {
    const jd = [
      "Need a rockstar engineer under 30 years old and native English speaker to handle everything.",
      "Responsibilities: do all engineering tasks quickly while being always online.",
      "Compensation: around $95k."
    ].join("\n\n");

    const result = evaluateJobDescriptionQuality({
      draftDescription: jd,
      profile
    });

    expect(result.overallStatus).toBe("fail");

    const checks = byType(result);

    expect(checks.get("completeness")).toEqual({
      checkType: "completeness",
      status: "fail",
      issues: [
        "Missing required section: Requirements.",
        "Missing required section: Interview process."
      ],
      suggestedRewrite:
        "Add explicit Requirements and Interview process sections aligned to the normalized role profile."
    });

    expect(checks.get("discriminatory_phrasing")).toEqual({
      checkType: "discriminatory_phrasing",
      status: "fail",
      issues: [
        "Potentially discriminatory phrase detected: 'under 30 years old'.",
        "Potentially exclusionary phrase detected: 'native English speaker'.",
        "Potentially biased phrase detected: 'rockstar engineer'."
      ],
      suggestedRewrite:
        "Replace exclusionary or biased phrasing with skill-based, job-relevant language."
    });

    expect(checks.get("requirement_contradiction")).toEqual({
      checkType: "requirement_contradiction",
      status: "warn",
      issues: ["Draft compensation appears inconsistent with normalized profile compensation range."],
      suggestedRewrite:
        "Align compensation details with the approved profile range or request employer clarification."
    });

    expect(checks.get("readability")?.status).toBe("warn");
    expect(result.readinessFlags).toEqual({
      blocksReview: true,
      requiresEmployerFix: true
    });
  });

  it("flags contradiction failures when profile constraints are directly violated", () => {
    const contradictionProfile: RoleProfile = {
      ...profile,
      level: "Junior",
      compensationRange: "$180k-$220k"
    };

    const jd = [
      "About the role: We are hiring a junior engineer role.",
      "Responsibilities: contribute to product delivery.",
      "Requirements: 1-2 years experience.",
      "Compensation: $220k base.",
      "Interview process: recruiter screen and technical interview."
    ].join("\n\n");

    const result = evaluateJobDescriptionQuality({
      draftDescription: jd,
      profile: contradictionProfile
    });

    const contradiction = byType(result).get("requirement_contradiction");
    expect(contradiction).toEqual({
      checkType: "requirement_contradiction",
      status: "fail",
      issues: [
        "Profile contradiction detected: junior level with high compensation band requires explicit employer confirmation."
      ],
      suggestedRewrite:
        "Resolve level-versus-compensation contradiction before marking this draft ready for review."
    });
    expect(result.overallStatus).toBe("fail");
  });
});
