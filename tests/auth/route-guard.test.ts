import { describe, expect, it } from "vitest";

import { resolveRouteGuardRedirect } from "@/lib/auth/route-guard";

describe("resolveRouteGuardRedirect", () => {
  it("redirects anonymous users away from protected routes", () => {
    expect(
      resolveRouteGuardRedirect({
        isAuthenticated: false,
        pathname: "/employer",
        role: null
      })
    ).toBe("/login");
  });

  it("redirects anonymous users away from role completion without a session", () => {
    expect(
      resolveRouteGuardRedirect({
        isAuthenticated: false,
        pathname: "/auth/complete-role",
        role: null
      })
    ).toBe("/login");
  });

  it("bypasses auth entry pages for authenticated users with a saved role", () => {
    expect(
      resolveRouteGuardRedirect({
        isAuthenticated: true,
        pathname: "/login",
        role: "employer"
      })
    ).toBe("/employer");
  });

  it("redirects authenticated users away from the wrong protected workspace", () => {
    expect(
      resolveRouteGuardRedirect({
        isAuthenticated: true,
        pathname: "/employer",
        role: "job_seeker"
      })
    ).toBe("/job-seeker");
  });

  it("sends authenticated users without a saved role to role completion", () => {
    expect(
      resolveRouteGuardRedirect({
        isAuthenticated: true,
        pathname: "/register",
        role: null
      })
    ).toBe("/auth/complete-role?intent=login");
  });

  it("allows the role completion screen when the authenticated role is still missing", () => {
    expect(
      resolveRouteGuardRedirect({
        isAuthenticated: true,
        pathname: "/auth/complete-role",
        role: null
      })
    ).toBeNull();
  });

  it("allows the matching protected workspace for the saved role", () => {
    expect(
      resolveRouteGuardRedirect({
        isAuthenticated: true,
        pathname: "/job-seeker/interviews",
        role: "job_seeker"
      })
    ).toBeNull();
  });
});
