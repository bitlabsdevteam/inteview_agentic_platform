import { describe, expect, it } from "vitest";

import {
  buildRoleProfileFromEmployerContext,
  validateRoleProfile,
  type RoleProfile,
  type RoleProfileConflict
} from "@/lib/agents/job-posting/role-profile";

const validProfile: RoleProfile = {
  title: "Senior AI Product Engineer",
  department: "Engineering",
  level: "Senior",
  locationPolicy: "Remote US",
  compensationRange: "$180k-$220k",
  mustHaveRequirements: [
    "5+ years full-stack engineering experience",
    "Production experience with Next.js and Postgres"
  ],
  niceToHaveRequirements: [
    "Recruiting tech experience"
  ],
  businessOutcomes: [
    "Launch employer recruiting assistant features"
  ],
  interviewLoopIntent: [
    "Recruiter screen",
    "Technical architecture interview"
  ],
  unresolvedConstraints: [
    "Hiring manager not yet confirmed"
  ],
  conflicts: [],
  confidence: {
    title: 0.98,
    department: 0.91,
    level: 0.92,
    locationPolicy: 0.97,
    compensationRange: 0.9
  }
};

function createConflict(overrides?: Partial<RoleProfileConflict>): RoleProfileConflict {
  return {
    field: "compensationRange",
    issue: "Compensation conflicts with stated seniority.",
    severity: "high",
    suggestedResolution: "Confirm budget band for senior level.",
    ...overrides
  };
}

describe("role profile schema contract", () => {
  it("accepts a valid normalized role profile payload", () => {
    expect(validateRoleProfile(validProfile)).toEqual({
      ok: true,
      data: validProfile,
      errors: []
    });
  });

  it("rejects missing required fields, malformed unresolved constraints/conflicts, and invalid confidence bounds", () => {
    const invalid = {
      ...validProfile,
      title: "",
      unresolvedConstraints: [" ", 1],
      conflicts: [
        createConflict(),
        {
          field: "",
          issue: "",
          severity: "critical",
          suggestedResolution: ""
        }
      ],
      confidence: {
        ...validProfile.confidence,
        level: 1.2,
        compensationRange: -0.1
      }
    };

    expect(validateRoleProfile(invalid)).toEqual({
      ok: false,
      data: null,
      errors: [
        "title is required.",
        "unresolvedConstraints must contain non-empty strings.",
        "conflicts[1].field is required.",
        "conflicts[1].issue is required.",
        "conflicts[1].severity must be one of low, medium, high.",
        "conflicts[1].suggestedResolution is required.",
        "confidence.level must be a number between 0 and 1.",
        "confidence.compensationRange must be a number between 0 and 1."
      ]
    });
  });
});

describe("role profile normalization contract", () => {
  it("extracts deterministic role profile fields from untrusted employer context", () => {
    const result = buildRoleProfileFromEmployerContext({
      employerPrompt:
        "Need a senior product-minded AI engineer for remote US, comp around 180k-220k. Must have Next.js and Postgres.",
      latestMessage: "Add ownership of employer recruiting assistant roadmap.",
      currentProfile: null
    });

    expect(result.conflicts).toEqual([]);
    expect(result.unresolvedConstraints).toContain("Hiring manager not yet confirmed");
    expect(result.profile.title.length).toBeGreaterThan(0);
    expect(result.profile.mustHaveRequirements.length).toBeGreaterThan(0);
  });
});
