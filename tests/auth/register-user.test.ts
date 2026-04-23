import { describe, expect, it, vi } from "vitest";

import { registerUser } from "@/lib/auth/register-user";

describe("registerUser", () => {
  it("rejects signup when the role is missing", async () => {
    const signUp = vi.fn();

    const result = await registerUser(
      {
        email: "person@example.com",
        password: "securepass123",
        confirmPassword: "securepass123",
        role: ""
      },
      {
        signUp,
        siteUrl: "http://localhost:3000"
      }
    );

    expect(result).toEqual({
      fieldErrors: {
        role: "Choose Employer or Job Seeker before creating the account."
      },
      message: "Choose Employer or Job Seeker before creating the account.",
      status: "error"
    });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("rejects signup when the passwords do not match", async () => {
    const signUp = vi.fn();

    const result = await registerUser(
      {
        email: "person@example.com",
        password: "securepass123",
        confirmPassword: "differentpass123",
        role: "employer"
      },
      {
        signUp,
        siteUrl: "http://localhost:3000"
      }
    );

    expect(result).toEqual({
      fieldErrors: {
        confirmPassword: "Passwords must match."
      },
      message: "Passwords must match.",
      status: "error"
    });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("persists the selected role in Supabase user metadata", async () => {
    const signUp = vi.fn().mockResolvedValue({ error: null });

    const result = await registerUser(
      {
        email: "person@example.com",
        password: "securepass123",
        confirmPassword: "securepass123",
        role: "job_seeker"
      },
      {
        signUp,
        siteUrl: "http://localhost:3000"
      }
    );

    expect(signUp).toHaveBeenCalledWith({
      email: "person@example.com",
      options: {
        data: {
          role: "job_seeker"
        },
        emailRedirectTo: "http://localhost:3000/job-seeker"
      },
      password: "securepass123"
    });
    expect(result).toEqual({
      message: "Account created for Job Seeker. Check your email to continue.",
      status: "success"
    });
  });

  it("surfaces Supabase signup errors clearly", async () => {
    const signUp = vi.fn().mockResolvedValue({
      error: {
        message: "User already registered"
      }
    });

    const result = await registerUser(
      {
        email: "person@example.com",
        password: "securepass123",
        confirmPassword: "securepass123",
        role: "employer"
      },
      {
        signUp,
        siteUrl: "http://localhost:3000"
      }
    );

    expect(result).toEqual({
      message: "An account with this email already exists.",
      status: "error"
    });
  });
});
