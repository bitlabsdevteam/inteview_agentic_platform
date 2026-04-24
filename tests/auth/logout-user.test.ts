import { describe, expect, it, vi } from "vitest";

import { logoutUser } from "@/lib/auth/logout-user";

describe("logoutUser", () => {
  it("returns the public redirect destination when Supabase sign out succeeds", async () => {
    const signOut = vi.fn().mockResolvedValue({
      error: null
    });

    const result = await logoutUser({
      signOut
    });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      redirectTo: "/",
      status: "success"
    });
  });

  it("maps Supabase sign out failures into a user-facing error", async () => {
    const signOut = vi.fn().mockResolvedValue({
      error: {
        message: "network timeout"
      }
    });

    const result = await logoutUser({
      signOut
    });

    expect(result).toEqual({
      message: "We could not log you out right now. Try again.",
      status: "error"
    });
  });
});
