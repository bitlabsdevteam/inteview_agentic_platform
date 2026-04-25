import { describe, expect, it } from "vitest";

import { getHomePageActions } from "@/components/home-page-actions";

describe("home page actions", () => {
  it("keeps public login and registration actions for anonymous visitors", () => {
    expect(
      getHomePageActions({
        email: null,
        identityLabel: "Guest",
        isAuthenticated: false,
        role: null,
        roleLabel: null
      })
    ).toEqual([
      {
        href: "/auth/google?intent=login",
        label: "Log In",
        testId: "landing-login-link",
        tone: "secondary"
      },
      {
        href: "/register",
        label: "Create Account",
        testId: "landing-register-link",
        tone: "primary"
      }
    ]);
  });

  it("replaces public auth actions with a workspace continuation action for authenticated users", () => {
    expect(
      getHomePageActions({
        email: "employer@example.com",
        identityLabel: "employer@example.com",
        isAuthenticated: true,
        role: "employer",
        roleLabel: "Employer"
      })
    ).toEqual([
      {
        href: "/employer",
        label: "Continue To Employer Workspace",
        testId: "landing-continue-link",
        tone: "primary"
      }
    ]);
  });

  it("removes public auth actions once a user is authenticated", () => {
    const labels = getHomePageActions({
      email: "jobseeker@example.com",
      identityLabel: "jobseeker@example.com",
      isAuthenticated: true,
      role: "job_seeker",
      roleLabel: "Job Seeker"
    }).map((action) => action.label);

    expect(labels).not.toContain("Log In");
    expect(labels).not.toContain("Create Account");
  });

  it("routes authenticated users without a role to role completion instead of public auth", () => {
    expect(
      getHomePageActions({
        email: "pending@example.com",
        identityLabel: "pending@example.com",
        isAuthenticated: true,
        role: null,
        roleLabel: null
      })
    ).toEqual([
      {
        href: "/auth/complete-role?intent=login",
        label: "Complete Role Setup",
        testId: "landing-continue-link",
        tone: "primary"
      }
    ]);
  });
});
