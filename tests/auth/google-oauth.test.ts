import { describe, expect, it, vi } from "vitest";

import {
  beginGoogleOAuth,
  buildAuthErrorRedirectPath,
  buildGoogleOAuthCallbackUrl,
  resolveOAuthDestination
} from "@/lib/auth/google-oauth";

describe("google oauth helpers", () => {
  it("builds a callback url that preserves the register role", () => {
    expect(
      buildGoogleOAuthCallbackUrl({
        intent: "register",
        role: "employer",
        siteUrl: "http://localhost:3000"
      })
    ).toBe("http://localhost:3000/auth/callback?intent=register&role=employer");
  });

  it("routes users without a saved role to role completion", () => {
    expect(resolveOAuthDestination(null, "login")).toBe("/auth/complete-role?intent=login");
    expect(resolveOAuthDestination("job_seeker", "login")).toBe("/job-seeker");
  });

  it("returns a register error when Google signup starts without a selected role", async () => {
    const signInWithOAuth = vi.fn();

    const result = await beginGoogleOAuth({
      intent: "register",
      role: "",
      signInWithOAuth,
      siteUrl: "http://localhost:3000"
    });

    expect(result).toEqual({
      message: "Choose Employer or Job Seeker before continuing with Google.",
      status: "error"
    });
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("returns the provider redirect url when Google auth starts successfully", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: {
        url: "https://accounts.google.com/mock"
      },
      error: null
    });

    const result = await beginGoogleOAuth({
      intent: "login",
      role: "",
      signInWithOAuth,
      siteUrl: "http://localhost:3000"
    });

    expect(signInWithOAuth).toHaveBeenCalled();
    expect(result).toEqual({
      status: "success",
      url: "https://accounts.google.com/mock"
    });
  });

  it("builds auth error redirects back to the relevant entry page", () => {
    expect(
      buildAuthErrorRedirectPath({
        intent: "register",
        message: "Google sign-in failed",
        role: "job_seeker"
      })
    ).toBe("/register?authError=Google+sign-in+failed&role=job_seeker");
  });
});
