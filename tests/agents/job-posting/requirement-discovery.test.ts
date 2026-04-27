import { describe, expect, it } from "vitest";

import type { RoleProfile } from "@/lib/agents/job-posting/role-profile";
import {
  discoverRequirementClarifications,
  type RequirementDiscoveryResult
} from "@/lib/agents/job-posting/requirement-discovery";

const baseProfile: RoleProfile = {
  title: "AI Product Engineer",
  department: "Engineering",
  level: "Senior",
  locationPolicy: "Remote US",
  compensationRange: "$180k-$220k",
  mustHaveRequirements: ["Next.js", "Postgres"],
  niceToHaveRequirements: ["Recruiting-tech background"],
  businessOutcomes: ["Ship employer recruiting assistant roadmap"],
  interviewLoopIntent: ["Recruiter screen", "Technical architecture interview"],
  unresolvedConstraints: [],
  conflicts: [],
  confidence: {
    title: 0.92,
    department: 0.9,
    level: 0.9,
    locationPolicy: 0.95,
    compensationRange: 0.88
  }
};

function expectQuestionOrder(result: RequirementDiscoveryResult, expectedKeys: string[]) {
  expect(result.clarificationQuestions.map((item) => item.key)).toEqual(expectedKeys);
}

describe("requirement discovery contract", () => {
  it("prioritizes critical gaps and enforces max 3 clarification questions", () => {
    const result = discoverRequirementClarifications({
      profile: {
        ...baseProfile,
        unresolvedConstraints: [
          "Compensation range not approved by finance",
          "Location policy not finalized",
          "Hiring manager not yet confirmed",
          "Interview loop stages are incomplete"
        ],
        conflicts: [
          {
            field: "compensationRange",
            issue: "Compensation conflicts with seniority expectations.",
            severity: "high",
            suggestedResolution: "Confirm whether budget or level should be adjusted."
          }
        ]
      },
      previouslyAskedQuestions: []
    });

    expect(result.clarificationQuestions).toHaveLength(3);
    expectQuestionOrder(result, [
      "conflict:compensationRange",
      "constraint:compensation",
      "constraint:location"
    ]);
    expect(result.clarificationQuestions.every((item) => item.priority !== "medium")).toBe(true);
    expect(result.updateInstructions).toContain(
      "Apply employer clarification answers to role profile fields before drafting the next JD revision."
    );
  });

  it("suppresses redundant clarification questions already asked in this session", () => {
    const result = discoverRequirementClarifications({
      profile: {
        ...baseProfile,
        unresolvedConstraints: [
          "Compensation range not approved by finance",
          "Location policy not finalized",
          "Hiring manager not yet confirmed"
        ],
        conflicts: [
          {
            field: "compensationRange",
            issue: "Compensation conflicts with seniority expectations.",
            severity: "high",
            suggestedResolution: "Confirm whether budget or level should be adjusted."
          }
        ]
      },
      previouslyAskedQuestions: [
        "Should we align seniority expectations or the compensation range for this role?",
        "What location policy should this role use (remote, hybrid, or on-site)?"
      ]
    });

    expect(result.clarificationQuestions.map((item) => item.question)).not.toContain(
      "Should we align seniority expectations or the compensation range for this role?"
    );
    expect(result.clarificationQuestions.map((item) => item.question)).not.toContain(
      "What location policy should this role use (remote, hybrid, or on-site)?"
    );
    expect(result.suppressedQuestions).toEqual([
      "Should we align seniority expectations or the compensation range for this role?",
      "What location policy should this role use (remote, hybrid, or on-site)?"
    ]);
    expect(result.clarificationQuestions).toHaveLength(2);
    expectQuestionOrder(result, ["constraint:compensation", "constraint:hiring_manager"]);
  });

  it("returns no clarification questions when no unresolved constraints or conflicts remain", () => {
    const result = discoverRequirementClarifications({
      profile: baseProfile,
      previouslyAskedQuestions: []
    });

    expect(result).toEqual({
      clarificationQuestions: [],
      updateInstructions: [
        "No additional clarification required. Continue refining draft wording using the normalized role profile."
      ],
      suppressedQuestions: []
    });
  });
});
