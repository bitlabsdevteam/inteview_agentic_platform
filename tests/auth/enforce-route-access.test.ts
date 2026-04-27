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

  it("redirects employer sessions away from job seeker routes before rendering", async () => {
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
      await enforceRouteAccess("/job-seeker");
    });

    expect(redirect).toHaveBeenCalledWith("/employer");
  });

  it("redirects job seeker sessions away from employer routes before rendering", async () => {
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
      await enforceRouteAccess("/employer");
    });

    expect(redirect).toHaveBeenCalledWith("/job-seeker");
  });

  it("redirects authenticated sessions without roles away from protected routes", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          user_metadata: {}
        }
      }
    });

    await import("@/lib/auth/enforce-route-access").then(async ({ enforceRouteAccess }) => {
      await enforceRouteAccess("/employer");
    });

    expect(redirect).toHaveBeenCalledWith("/auth/complete-role?intent=login");
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

  it("redirects job seeker sessions away from nested employer candidate routes", async () => {
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
      await enforceRouteAccess("/employer/jobs/job-1/candidates/intake-1");
    });

    expect(redirect).toHaveBeenCalledWith("/job-seeker");
  });

  it("redirects job seeker sessions away from employer candidate workspace routes with scoring filters", async () => {
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
      await enforceRouteAccess(
        "/employer/jobs/job-1/candidates?skill=TypeScript&minConfidence=0.8&sortBy=aggregate_score_desc"
      );
    });

    expect(redirect).toHaveBeenCalledWith("/job-seeker");
  });

  it("redirects job seeker sessions away from employer assistant candidate review routes", async () => {
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
      await enforceRouteAccess(
        "/employer/jobs/job-1/candidates/profile-1?assistant=1&panel=recommendation"
      );
    });

    expect(redirect).toHaveBeenCalledWith("/job-seeker");
  });
});
