import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  AccountHeader,
  deriveAccountHeaderState,
  getAccountHeaderAccountActions,
  getAccountHeaderNavLinks,
  getAccountHeaderState
} from "@/components/account-header";

describe("account header state", () => {
  it("returns an anonymous header state when no session user exists", () => {
    expect(deriveAccountHeaderState(null)).toEqual({
      email: null,
      identityLabel: "Guest",
      isAuthenticated: false,
      role: null,
      roleLabel: null
    });
  });

  it("derives the authenticated identity and role from Supabase user metadata", () => {
    expect(
      deriveAccountHeaderState({
        email: "employer@example.com",
        user_metadata: {
          role: "employer"
        }
      })
    ).toEqual({
      email: "employer@example.com",
      identityLabel: "employer@example.com",
      isAuthenticated: true,
      role: "employer",
      roleLabel: "Employer"
    });
  });

  it("reads the current session state through the shared server-side contract", async () => {
    const result = await getAccountHeaderState({
      getUser: async () => ({
        data: {
          user: {
            email: "jobseeker@example.com",
            user_metadata: {
              role: "job_seeker"
            }
          }
        },
        error: null
      })
    });

    expect(result).toEqual({
      email: "jobseeker@example.com",
      identityLabel: "jobseeker@example.com",
      isAuthenticated: true,
      role: "job_seeker",
      roleLabel: "Job Seeker"
    });
  });

  it("keeps public login and registration links only for anonymous navigation state", () => {
    expect(
      getAccountHeaderNavLinks({
        email: null,
        identityLabel: "Guest",
        isAuthenticated: false,
        role: null,
        roleLabel: null
      }).map((link) => link.label)
    ).toEqual(["Home", "Login", "Register", "Employer", "Job Seeker"]);
  });

  it("scopes authenticated employer navigation to employer-only links and logout", () => {
    const employerState = {
      email: "employer@example.com",
      identityLabel: "employer@example.com",
      isAuthenticated: true,
      role: "employer" as const,
      roleLabel: "Employer"
    };
    const navLabels = getAccountHeaderNavLinks(employerState).map((link) => link.label);
    const accountActions = getAccountHeaderAccountActions(employerState).map(
      (action) => action.label
    );

    expect(navLabels).toEqual(["Home", "Employer", "Jobs"]);
    expect(navLabels).not.toContain("Job Seeker");
    expect(accountActions).toEqual(["Logout"]);
  });

  it("scopes authenticated job seeker navigation to job-seeker-only links", () => {
    const navLabels = getAccountHeaderNavLinks({
      email: "jobseeker@example.com",
      identityLabel: "jobseeker@example.com",
      isAuthenticated: true,
      role: "job_seeker",
      roleLabel: "Job Seeker"
    }).map((link) => link.label);

    expect(navLabels).toEqual(["Home", "Job Seeker"]);
    expect(navLabels).not.toContain("Employer");
  });

  it("never exposes Login or Register nav links for authenticated users", () => {
    const authenticatedLabels = getAccountHeaderNavLinks({
      email: "jobseeker@example.com",
      identityLabel: "jobseeker@example.com",
      isAuthenticated: true,
      role: "job_seeker",
      roleLabel: "Job Seeker"
    }).map((link) => link.label);

    expect(authenticatedLabels).not.toContain("Login");
    expect(authenticatedLabels).not.toContain("Register");
  });

  it("exposes a logout-only account action for authenticated users", () => {
    expect(
      getAccountHeaderAccountActions({
        email: "employer@example.com",
        identityLabel: "employer@example.com",
        isAuthenticated: true,
        role: "employer",
        roleLabel: "Employer"
      }).map((action) => action.label)
    ).toEqual(["Logout"]);
  });

  it("does not expose account actions for anonymous users", () => {
    expect(
      getAccountHeaderAccountActions({
        email: null,
        identityLabel: "Guest",
        isAuthenticated: false,
        role: null,
        roleLabel: null
      })
    ).toEqual([]);
  });

  it("renders authenticated sessions as a branded role-scoped top menu", () => {
    const markup = renderToStaticMarkup(
      createElement(AccountHeader, {
        state: {
          email: "employer@example.com",
          identityLabel: "employer@example.com",
          isAuthenticated: true,
          role: "employer",
          roleLabel: "Employer"
        }
      })
    );

    expect(markup).toContain('class="account-header account-header--authenticated"');
    expect(markup).toContain('class="account-header__brand"');
    expect(markup).toContain('aria-label="Interview Agent home"');
    expect(markup).toContain('aria-label="Primary workspace navigation"');
    expect(markup).toContain('data-testid="account-header-profile"');
    expect(markup).toContain('data-testid="account-header-logout-button"');
    expect(markup).toContain(">Employer</a>");
    expect(markup).toContain(">Jobs</a>");
    expect(markup).not.toContain(">Job Seeker</a>");
    expect(markup).not.toContain(">Login</a>");
    expect(markup).not.toContain(">Register</a>");
  });
});
