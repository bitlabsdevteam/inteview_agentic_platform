import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
const updateUser = vi.fn();

const createServerClient = vi.fn(() => ({
  auth: {
    exchangeCodeForSession,
    updateUser
  }
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient
}));

vi.mock("@/lib/env", () => ({
  getPublicEnv: () => ({
    siteUrl: "http://localhost:3000",
    supabaseAnonKey: "anon-key",
    supabaseUrl: "https://example.supabase.co"
  })
}));

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects register callbacks that do not include a valid role", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          user_metadata: {}
        }
      },
      error: null
    });

    const request = new NextRequest("http://localhost:3000/auth/callback?intent=register&code=test-code");
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/register?authError=Choose+Employer+or+Job+Seeker+before+continuing+with+Google."
    );
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("updates the session user role and redirects employer registrations to /employer", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          user_metadata: {}
        }
      },
      error: null
    });
    updateUser.mockResolvedValue({
      data: {
        user: {
          user_metadata: {
            role: "employer"
          }
        }
      },
      error: null
    });

    const request = new NextRequest(
      "http://localhost:3000/auth/callback?intent=register&role=employer&code=test-code"
    );
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(request);

    expect(updateUser).toHaveBeenCalledWith({
      data: {
        role: "employer"
      }
    });
    expect(response.headers.get("location")).toBe("http://localhost:3000/employer");
  });

  it("redirects directly to /employer when register callback session metadata already has employer role", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          user_metadata: {
            role: "employer"
          }
        }
      },
      error: null
    });

    const request = new NextRequest("http://localhost:3000/auth/callback?intent=register&code=test-code");
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(request);

    expect(updateUser).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/employer");
  });

  it("updates the session user role and redirects job seeker registrations to /job-seeker", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          user_metadata: {}
        }
      },
      error: null
    });
    updateUser.mockResolvedValue({
      data: {
        user: {
          user_metadata: {
            role: "job_seeker"
          }
        }
      },
      error: null
    });

    const request = new NextRequest(
      "http://localhost:3000/auth/callback?intent=register&role=job_seeker&code=test-code"
    );
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(request);

    expect(updateUser).toHaveBeenCalledWith({
      data: {
        role: "job_seeker"
      }
    });
    expect(response.headers.get("location")).toBe("http://localhost:3000/job-seeker");
  });

  it("redirects directly to /job-seeker when register callback metadata already has job seeker role", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          user_metadata: {
            role: "job_seeker"
          }
        }
      },
      error: null
    });

    const request = new NextRequest("http://localhost:3000/auth/callback?intent=register&code=test-code");
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(request);

    expect(updateUser).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/job-seeker");
  });
});
