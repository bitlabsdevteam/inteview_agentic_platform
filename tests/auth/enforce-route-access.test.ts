import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn();
const getUser = vi.fn();
const createSupabaseServerClient = vi.fn(async () => ({
  auth: {
    getUser
  }
}));

vi.mock("next/navigation", () => ({
  redirect
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient
}));

describe("enforceRouteAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects anonymous access attempts for protected routes", async () => {
    getUser.mockResolvedValue({
      data: {
        user: null
      }
    });

    await import("@/lib/auth/enforce-route-access").then(async ({ enforceRouteAccess }) => {
      await enforceRouteAccess("/employer");
    });

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects anonymous access attempts for job seeker protected routes", async () => {
    getUser.mockResolvedValue({
      data: {
        user: null
      }
    });

    await import("@/lib/auth/enforce-route-access").then(async ({ enforceRouteAccess }) => {
      await enforceRouteAccess("/job-seeker");
    });

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("allows protected routes when the session role matches the workspace", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          user_metadata: {
            role: "employer"
          }
        }
      }
    });

    await import("@/lib/auth/enforce-route-access").then(async ({ enforceRouteAccess }) => {
      await enforceRouteAccess("/employer");
    });

    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects authenticated users away from /login to their saved role workspace", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          user_metadata: {
            role: "job_seeker"
          }
        }
      }
    });

    await import("@/lib/auth/enforce-route-access").then(async ({ enforceRouteAccess }) => {
      await enforceRouteAccess("/login");
    });

    expect(redirect).toHaveBeenCalledWith("/job-seeker");
  });

  it("redirects authenticated users away from /register to their saved role workspace", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          user_metadata: {
            role: "employer"
          }
        }
      }
    });

    await import("@/lib/auth/enforce-route-access").then(async ({ enforceRouteAccess }) => {
      await enforceRouteAccess("/register");
    });

    expect(redirect).toHaveBeenCalledWith("/employer");
  });
});
