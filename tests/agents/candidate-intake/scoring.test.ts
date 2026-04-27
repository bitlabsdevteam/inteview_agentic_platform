import { describe, expect, it } from "vitest";

import type { CandidateExtractionOutput } from "@/lib/agents/candidate-intake/schema";
import { validateCandidateProfileScore } from "@/lib/agents/candidate-intake/schema";
import { calibrateCandidateRequirementFitScore } from "@/lib/agents/candidate-intake/scoring";

const requirementText = [
  "Required:",
  "- Strong TypeScript and Postgres experience.",
  "- Experience building AI interview or hiring workflows.",
  "- Production backend architecture ownership.",
  "- Bachelor's degree in Computer Science or equivalent."
].join("\n");

const baseProfile: CandidateExtractionOutput = {
  summary: "Senior backend engineer with ownership of AI interview workflow services.",
  skills: ["TypeScript", "Postgres", "Node.js"],
  workExperience: [
    "Led architecture for AI hiring workflow orchestration.",
    "Owned backend reliability and scaling across PostgreSQL services."
  ],
  education: ["B.S. Computer Science"],
  confidence: {
    summary: 0.92,
    skills: 0.9,
    workExperience: 0.88,
    education: 0.8,
    overall: 0.89
  }
};

describe("candidate scoring calibration service", () => {
  it("returns deterministic validated requirement-fit score output", () => {
    const first = calibrateCandidateRequirementFitScore({
      requirementText,
      profile: baseProfile
    });
    const second = calibrateCandidateRequirementFitScore({
      requirementText,
      profile: baseProfile
    });

    expect(first).toEqual(second);
    expect(first.scoreVersion).toBe("v1-requirement-fit");
    expect(first.evidenceSnippets.length).toBeGreaterThan(0);
    expect(first.evidenceSnippets.length).toBeLessThanOrEqual(3);

    expect(validateCandidateProfileScore(first)).toEqual({
      ok: true,
      data: first,
      errors: []
    });
  });

  it("applies confidence-aware weighting so lower confidence reduces aggregate score", () => {
    const highConfidence = calibrateCandidateRequirementFitScore({
      requirementText,
      profile: baseProfile
    });

    const lowConfidence = calibrateCandidateRequirementFitScore({
      requirementText,
      profile: {
        ...baseProfile,
        confidence: {
          summary: 0.3,
          skills: 0.3,
          workExperience: 0.3,
          education: 0.3,
          overall: 0.3
        }
      }
    });

    expect(lowConfidence.aggregateScore).toBeLessThan(highConfidence.aggregateScore);
    expect(lowConfidence.requirementFitScores.overall).toBeLessThan(
      highConfidence.requirementFitScores.overall
    );
  });

  it("rejects empty requirement text input", () => {
    expect(() =>
      calibrateCandidateRequirementFitScore({
        requirementText: "   ",
        profile: baseProfile
      })
    ).toThrow("Requirement text is required for candidate scoring.");
  });
});
