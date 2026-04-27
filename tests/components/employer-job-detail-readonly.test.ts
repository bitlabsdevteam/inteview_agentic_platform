import { describe, expect, it } from "vitest";

import {
  V15_READONLY_ARTIFACT_SECTION_FIXTURES,
  V15_WORKSPACE_LAYOUT_FIXTURES
} from "./v15-workspace-fixtures";

describe("v15 read-only workspace fixtures", () => {
  it("defines a two-panel workspace with a read-only artifact on the left and chat-only rail on the right", () => {
    expect(V15_WORKSPACE_LAYOUT_FIXTURES).toEqual([
      {
        key: "read_only_artifact",
        label: "Read-Only Generated Artifact",
        description: "Show the full created hiring artifact in display mode on the left."
      },
      {
        key: "agent_chat_only",
        label: "Agent Chat Only",
        description: "Keep the right panel limited to the agent thread and composer."
      }
    ]);
  });

  it("defines the read-only artifact sections that later page tests should render", () => {
    expect(V15_READONLY_ARTIFACT_SECTION_FIXTURES.map((section) => section.label)).toEqual([
      "Role Profile Summary",
      "Generated Job Posting",
      "Interview Structure Summary",
      "Review Notes"
    ]);
  });
});
