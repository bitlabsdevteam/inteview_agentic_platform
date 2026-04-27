import { describe, expect, it } from "vitest";

import {
  createJobCreatorCapabilityCatalog,
  renderCapabilityInstructions
} from "@/lib/agents/job-posting/capabilities";

describe("job creator capabilities", () => {
  it("declares at least one skill and one tool for the agent", () => {
    const catalog = createJobCreatorCapabilityCatalog();

    expect(catalog.skills.length).toBeGreaterThan(0);
    expect(catalog.tools.length).toBeGreaterThan(0);
    expect(catalog.tools[0]?.name).toBe("web_search_tool");
  });

  it("renders capability instructions with transparency guardrails", () => {
    const instructions = renderCapabilityInstructions(createJobCreatorCapabilityCatalog());

    expect(instructions).toContain("Capability Catalog");
    expect(instructions).toContain("web_search_tool");
    expect(instructions).toContain("reasoning summaries");
    expect(instructions).toContain("Do not reveal hidden chain-of-thought");
  });
});
