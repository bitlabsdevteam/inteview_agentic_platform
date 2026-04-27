import { describe, expect, it } from "vitest";

import { adviseEmployerNextStep } from "@/lib/agents/employer-assistant/advisor";

describe("employer assistant deterministic advisor", () => {
  it("recommends improve_job_requirements when requirements are underdefined", () => {
    const recommendation = adviseEmployerNextStep({
      jobRequirementsText: "Need a good engineer.",
      candidateSummary: "Built internal tooling and delivery workflows.",
      aggregateScore: 0.81,
      overallConfidence: 0.84,
      requirementFitScores: {
        hardSkills: 0.8,
        roleExperience: 0.79,
        domainContext: 0.74,
        educationSignals: 0.83,
        overall: 0.79
      },
      scoreEvidenceSnippets: ["Strong delivery signal from profile summary."],
      missingSignals: []
    });

    expect(recommendation.action).toBe("improve_job_requirements");
    expect(recommendation.riskFlags.map((flag) => flag.code)).toContain("job_requirements_underdefined");
    expect(recommendation.evidenceReferences.map((item) => item.sourceType)).toContain("job_requirement");
  });

  it("recommends request_more_signal when confidence and evidence are weak", () => {
    const recommendation = adviseEmployerNextStep({
      jobRequirementsText:
        "- 5+ years backend TypeScript\n- Own distributed systems design\n- Drive incident response communication",
      candidateSummary: "Worked on internal APIs.",
      aggregateScore: 0.67,
      overallConfidence: 0.49,
      requirementFitScores: {
        hardSkills: 0.7,
        roleExperience: 0.58,
        domainContext: 0.51,
        educationSignals: 0.64,
        overall: 0.61
      },
      scoreEvidenceSnippets: ["Some TypeScript mention, but role ownership is unclear."],
      missingSignals: ["system_design_depth", "ownership_scope", "production_incident_handling"]
    });

    expect(recommendation.action).toBe("request_more_signal");
    expect(recommendation.riskFlags.map((flag) => flag.code)).toContain("low_confidence_signal");
    expect(recommendation.riskFlags.map((flag) => flag.code)).toContain("missing_critical_evidence");
  });

  it("recommends review_candidate when score and confidence are high with limited uncertainty", () => {
    const recommendation = adviseEmployerNextStep({
      jobRequirementsText:
        "- 6+ years backend engineering with TypeScript\n- Lead distributed systems decisions\n- Own production incident response",
      candidateSummary: "Led distributed systems architecture and production reliability projects.",
      aggregateScore: 0.89,
      overallConfidence: 0.87,
      requirementFitScores: {
        hardSkills: 0.9,
        roleExperience: 0.88,
        domainContext: 0.86,
        educationSignals: 0.79,
        overall: 0.86
      },
      scoreEvidenceSnippets: ["Strong overlap with architecture and incident ownership requirements."],
      missingSignals: ["team_size_scope"]
    });

    expect(recommendation.action).toBe("review_candidate");
    expect(recommendation.riskFlags.map((flag) => flag.code)).not.toContain("low_confidence_signal");
  });

  it("recommends screen_candidate for medium-fit candidates with manageable gaps", () => {
    const recommendation = adviseEmployerNextStep({
      jobRequirementsText:
        "- 4+ years backend TypeScript\n- Build APIs at scale\n- Partner with product and design",
      candidateSummary: "Solid backend API development experience with cross-functional collaboration.",
      aggregateScore: 0.71,
      overallConfidence: 0.72,
      requirementFitScores: {
        hardSkills: 0.76,
        roleExperience: 0.71,
        domainContext: 0.68,
        educationSignals: 0.66,
        overall: 0.7
      },
      scoreEvidenceSnippets: ["Good API and collaboration signal, but scale ownership depth is partial."],
      missingSignals: ["large_scale_migration_depth"]
    });

    expect(recommendation.action).toBe("screen_candidate");
  });

  it("returns deterministic recommendation output for the same input", () => {
    const input = {
      jobRequirementsText:
        "- 5+ years backend engineering\n- Own service reliability\n- Strong SQL and system design",
      candidateSummary: "Backend engineer focused on API reliability and database performance.",
      aggregateScore: 0.74,
      overallConfidence: 0.69,
      requirementFitScores: {
        hardSkills: 0.75,
        roleExperience: 0.72,
        domainContext: 0.69,
        educationSignals: 0.62,
        overall: 0.69
      },
      scoreEvidenceSnippets: ["Role experience and SQL overlap present, but depth is moderate."],
      missingSignals: ["stakeholder_influence"]
    } as const;

    const first = adviseEmployerNextStep(input);
    const second = adviseEmployerNextStep(input);

    expect(second).toEqual(first);
  });
});
