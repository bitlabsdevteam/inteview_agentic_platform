import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn();
const signOut = vi.fn();
const createSupabaseServerClient = vi.fn(async () => ({
  auth: {
    signOut
  }
}));

vi.mock("next/navigation", () => ({
  redirect
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient
}));

describe("submitLogout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs out through Supabase and redirects to the public home route", async () => {
    signOut.mockResolvedValue({
      error: null
    });

    await import("@/app/logout/actions").then(async ({ submitLogout }) => {
      await submitLogout();
    });

    expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("redirects to login with an auth error when Supabase sign out fails", async () => {
    signOut.mockResolvedValue({
      error: {
        message: "network timeout"
      }
    });

    await import("@/app/logout/actions").then(async ({ submitLogout }) => {
      await submitLogout();
    });

    expect(redirect).toHaveBeenCalledWith(
      "/login?authError=We%20could%20not%20log%20you%20out%20right%20now.%20Try%20again."
    );
  });
});
