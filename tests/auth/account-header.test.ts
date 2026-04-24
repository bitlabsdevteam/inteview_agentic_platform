import { describe, expect, it } from "vitest";

import {
  deriveAccountHeaderState,
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
});
