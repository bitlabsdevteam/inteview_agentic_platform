import { describe, expect, it } from "vitest";

import {
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

    expect(
      getAccountHeaderNavLinks({
        email: "employer@example.com",
        identityLabel: "employer@example.com",
        isAuthenticated: true,
        role: "employer",
        roleLabel: "Employer"
      }).map((link) => link.label)
    ).toEqual(["Home", "Employer", "Job Seeker"]);
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
});
