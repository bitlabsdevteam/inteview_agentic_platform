import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  it("requires the right rail to render only chat thread and composer content", () => {
    const html = renderToStaticMarkup(
      React.createElement(EmployerJobAgentChat, V15_AGENT_CHAT_PROPS_FIXTURE)
    );

    expect(html).toContain('data-testid="employer-job-detail-chat"');
    expect(html).toContain('data-testid="employer-job-chat-input"');
    expect(html).not.toContain('data-testid="employer-job-chat-memory"');
    expect(html).not.toContain('data-testid="employer-job-chat-role-profile"');
    expect(html).not.toContain('data-testid="employer-job-chat-quality"');
    expect(html).not.toContain("Session Memory");
    expect(html).not.toContain("Follow-up Questions");
    expect(html).not.toContain("Role Profile Summary");
    expect(html).not.toContain("Quality Warnings");
    expect(html).not.toContain("Send To Agent");
    expect(html).not.toContain('data-testid="employer-job-chat-submit"');
  });

  it("requires explicit Enter-submit and Shift+Enter-newline keyboard handling in the chat composer", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/employer-job-agent-chat.tsx"),
      "utf8"
    );

    expect(source).toContain("onKeyDown");
    expect(source).toContain('event.key === "Enter"');
    expect(source).toContain("event.shiftKey");
    expect(source).toContain("requestSubmit");
    expect(source).not.toContain("Send To Agent");
  });
});
