import { describe, expect, it } from "vitest";

import { generateEmployerAssistantScreeningKit } from "@/lib/agents/employer-assistant/screening-kit";

describe("employer assistant screening kit generator", () => {
  it("generates bounded technical and behavioral questions mapped to rubric dimensions", () => {
    const kit = generateEmployerAssistantScreeningKit({
      action: "screen_candidate",
      jobRequirementsText:
        "- 5+ years backend TypeScript\n- Own distributed system design\n- Partner with product stakeholders",
      candidateSummary: "Backend engineer with API experience and delivery collaboration.",
      missingSignals: ["system_design_depth", "stakeholder_influence"],
      maxQuestions: 6
    });

    expect(kit.title).toContain("Candidate Screening");
    expect(kit.questions.length).toBeGreaterThanOrEqual(3);
    expect(kit.questions.length).toBeLessThanOrEqual(6);
    expect(kit.questions.some((question) => question.competency === "technical")).toBe(true);
    expect(kit.questions.some((question) => question.competency === "behavioral")).toBe(true);
    expect(kit.questions.some((question) => question.rubricDimension === "system_design")).toBe(true);
  });

  it("flags uncertainty probes for missing-signal questions", () => {
    const kit = generateEmployerAssistantScreeningKit({
      action: "request_more_signal",
      jobRequirementsText:
        "- Lead incident response\n- Own service reliability\n- Collaborate across engineering and product",
      candidateSummary: "Candidate shows strong execution but limited leadership evidence.",
      missingSignals: ["production_incident_handling", "ownership_scope"],
      maxQuestions: 5
    });

    expect(kit.questions.some((question) => question.uncertaintyFlag)).toBe(true);
    expect(
      kit.questions
        .filter((question) => question.uncertaintyFlag)
        .every((question) => question.intent.toLowerCase().includes("missing"))
    ).toBe(true);
  });

  it("uses deterministic fallback questions when missing signals are unavailable", () => {
    const kit = generateEmployerAssistantScreeningKit({
      action: "screen_candidate",
      jobRequirementsText: "- Backend API design\n- Database optimization\n- Team collaboration",
      candidateSummary: "Backend engineer with optimization and cross-functional delivery experience.",
      missingSignals: [],
      maxQuestions: 4
    });

    expect(kit.questions.length).toBeGreaterThanOrEqual(2);
    expect(kit.questions.every((question) => question.question.trim().length > 0)).toBe(true);
  });

  it("returns deterministic screening kits for the same input", () => {
    const input = {
      action: "screen_candidate" as const,
      jobRequirementsText:
        "- Build resilient APIs\n- Improve SQL performance\n- Communicate architecture tradeoffs",
      candidateSummary: "Engineer focused on API reliability and data-intensive backend services.",
      missingSignals: ["system_design_depth", "cross_functional_communication"],
      maxQuestions: 5
    };

    const first = generateEmployerAssistantScreeningKit(input);
    const second = generateEmployerAssistantScreeningKit(input);

    expect(second).toEqual(first);
  });
});
