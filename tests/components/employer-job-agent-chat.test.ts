import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  V15_AGENT_CHAT_PROPS_FIXTURE,
  V15_CHAT_KEYBOARD_EXPECTATIONS
} from "./v15-workspace-fixtures";
import { EmployerJobAgentChat } from "@/components/employer-job-agent-chat";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

describe("employer job agent chat ui", () => {
  it("renders role profile summary and unboxed quality warning guidance", () => {
    const html = renderToStaticMarkup(
      React.createElement(EmployerJobAgentChat, V15_AGENT_CHAT_PROPS_FIXTURE)
    );

    expect(html).toContain("Role Profile Summary");
    expect(html).toContain("Senior AI Product Engineer");
    expect(html).toContain("Hiring manager not yet confirmed");
    expect(html).toContain("Quality Warnings");
    expect(html).toContain("Missing required section: Interview process.");
    expect(html).toContain("Add explicit interview process section.");
    expect(html).toContain("Review is currently blocked");
    expect(html).toContain("employer-job-chat__quality-list");
    expect(html).toContain("employer-job-chat__quality-entry");
    expect(html).not.toContain("employer-job-chat__quality-item");
  });

  it("captures the v15 keyboard-submit chat expectations in shared fixtures", () => {
    expect(V15_CHAT_KEYBOARD_EXPECTATIONS).toEqual({
      submitOnEnter: true,
      newlineOnShiftEnter: true,
      showsVisibleSendButton: false
    });
  });
});
