import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const createSupabaseServerClient = vi.fn(async () => ({
  auth: {
    getUser
  }
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient
}));

const internalUiPattern = /Protected .* Route|Role Sync|session detected|debug|telemetry|routing/i;

describe("shared shell visual language", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses shared shell classes instead of inline route-shell styling", async () => {
    getUser.mockResolvedValue({
      data: {
        user: null
      }
    });

    const { RouteShell } = await import("@/components/route-shell");
    const markup = renderToStaticMarkup(
      await RouteShell({
        eyebrow: "Public Surface",
        title: "Shared route shell",
        description: "A concise public shell for account flows.",
        children: createElement("span", null, "Child content")
      })
    );

    expect(markup).toContain('class="app-page route-page"');
    expect(markup).toContain('class="product-shell route-shell"');
    expect(markup).toContain('class="route-shell__intro"');
    expect(markup).not.toContain("style=");
  });

  it("keeps public, employer, and job seeker shells on shared product surfaces without internal text", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          email: "employer@example.com",
          user_metadata: {
            role: "employer"
          }
        }
      }
    });

    const [{ default: HomePage }, { EmployerChatShell }, { JobSeekerShell }] = await Promise.all([
      import("@/app/page"),
      import("@/components/employer-chat-shell"),
      import("@/components/job-seeker-shell")
    ]);

    const publicMarkup = renderToStaticMarkup(await HomePage());
    const employerMarkup = renderToStaticMarkup(await EmployerChatShell());
    const jobSeekerMarkup = renderToStaticMarkup(await JobSeekerShell());
    const combinedMarkup = [publicMarkup, employerMarkup, jobSeekerMarkup].join("\n");

    expect(publicMarkup).toContain('class="app-page landing-page product-shell product-shell--public"');
    expect(employerMarkup).toContain('class="app-page employer-page"');
    expect(employerMarkup).toContain('class="product-shell employer-shell"');
    expect(jobSeekerMarkup).toContain('class="app-page job-seeker-page"');
    expect(jobSeekerMarkup).toContain('class="product-shell job-seeker-shell"');
    expect(combinedMarkup).not.toMatch(internalUiPattern);
  });
});
