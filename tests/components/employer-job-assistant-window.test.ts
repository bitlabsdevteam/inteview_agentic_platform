import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_EMPLOYER_JOB_ASSISTANT_NAME,
  EMPLOYER_JOB_ASSISTANT_STORAGE_KEY,
  EmployerJobAssistantWindow
} from "@/components/employer-job-assistant-window";
import { EmployerJobsLayoutShell } from "@/components/employer-jobs-layout-shell";

const { usePathname, useRouter } = vi.hoisted(() => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({
    refresh: vi.fn(),
    push: vi.fn()
  }))
}));

vi.mock("next/navigation", () => ({
  usePathname,
  useRouter
}));

describe("employer job assistant window", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.React = React;
  });

  it("renders expanded and collapsed chrome states for the shared assistant window", () => {
    const expandedMarkup = renderToStaticMarkup(
      React.createElement(EmployerJobAssistantWindow, {
        mode: "create",
        initialCollapsed: false
      })
    );
    const collapsedMarkup = renderToStaticMarkup(
      React.createElement(EmployerJobAssistantWindow, {
        mode: "refine",
        jobId: "job-1",
        initialCollapsed: true
      })
    );

    expect(expandedMarkup).toContain('data-testid="employer-job-assistant-window"');
    expect(expandedMarkup).toContain('data-assistant-mode="create"');
    expect(expandedMarkup).toContain('data-collapsed="false"');
    expect(expandedMarkup).toContain(DEFAULT_EMPLOYER_JOB_ASSISTANT_NAME);
    expect(expandedMarkup).toContain("Rename");
    expect(collapsedMarkup).toContain('data-assistant-mode="refine"');
    expect(collapsedMarkup).toContain('data-collapsed="true"');
    expect(collapsedMarkup).toContain(DEFAULT_EMPLOYER_JOB_ASSISTANT_NAME);
    expect(EMPLOYER_JOB_ASSISTANT_STORAGE_KEY).toContain("collapsed");
  });

  it("selects create and refine modes from the shared jobs layout only on wizard routes", () => {
    usePathname.mockReturnValue("/employer/jobs/new");
    const createMarkup = renderToStaticMarkup(
      React.createElement(EmployerJobsLayoutShell, null, React.createElement("div", null, "stage"))
    );

    usePathname.mockReturnValue("/employer/jobs/job-1");
    const refineMarkup = renderToStaticMarkup(
      React.createElement(EmployerJobsLayoutShell, null, React.createElement("div", null, "stage"))
    );

    usePathname.mockReturnValue("/employer/jobs");
    const listMarkup = renderToStaticMarkup(
      React.createElement(EmployerJobsLayoutShell, null, React.createElement("div", null, "list"))
    );

    expect(createMarkup).toContain('data-testid="employer-job-wizard-layout"');
    expect(createMarkup).toContain('data-assistant-mode="create"');
    expect(refineMarkup).toContain('data-assistant-mode="refine"');
    expect(refineMarkup).toContain(DEFAULT_EMPLOYER_JOB_ASSISTANT_NAME);
    expect(listMarkup).not.toContain('data-testid="employer-job-assistant-window"');
  });
});
