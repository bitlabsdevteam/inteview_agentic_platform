import { describe, expect, it, vi } from "vitest";

import { loginUser } from "@/lib/auth/login-user";

describe("loginUser", () => {
  it("rejects login when the email is missing", async () => {
    const signInWithPassword = vi.fn();

    const result = await loginUser(
      {
        email: "",
        password: "securepass123"
      },
      {
        signInWithPassword
      }
    );

    expect(result).toEqual({
      fieldErrors: {
        email: "Enter your email address."
      },
      message: "Enter your email address.",
      status: "error"
    });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("maps invalid credential errors into user-facing copy", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        user: null
      },
      error: {
        message: "Invalid login credentials"
      }
    });

    const result = await loginUser(
      {
        email: "candidate@example.com",
        password: "wrong-password"
      },
      {
        signInWithPassword
      }
    );

    expect(result).toEqual({
      message: "The email or password is incorrect.",
      status: "error"
    });
  });

  it("routes users with a saved role to the matching workspace", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        user: {
          user_metadata: {
            role: "employer"
          }
        }
      },
      error: null
    });

    const result = await loginUser(
      {
        email: "employer@example.com",
        password: "securepass123"
      },
      {
        signInWithPassword
      }
    );

    expect(result).toEqual({
      redirectTo: "/employer",
      status: "success"
    });
  });

  it("routes users without a saved role to the role completion step", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        user: {
          user_metadata: {}
        }
      },
      error: null
    });

    const result = await loginUser(
      {
        email: "jobseeker@example.com",
        password: "securepass123"
      },
      {
        signInWithPassword
      }
    );

    expect(result).toEqual({
      redirectTo: "/auth/complete-role?intent=login",
      status: "success"
    });
  });
});
