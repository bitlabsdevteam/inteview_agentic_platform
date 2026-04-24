import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = {
  getAll: vi.fn(() => []),
  set: vi.fn()
};

const createServerClient = vi.fn((_url: string, _key: string, options: unknown) => options);
const cookies = vi.fn(async () => cookieStore);

vi.mock("@supabase/ssr", () => ({
  createServerClient
}));

vi.mock("next/headers", () => ({
  cookies
}));

describe("createSupabaseServerClient", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    delete process.env.NEXT_PUBLIC_SITE_URL;

    cookieStore.getAll.mockReturnValue([]);
  });

  it("ignores cookie write failures in render-time contexts", async () => {
    cookieStore.set.mockImplementation(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler.");
    });

    await import("@/lib/supabase/server").then(async ({ createSupabaseServerClient }) => {
      await createSupabaseServerClient();
    });

    const options = createServerClient.mock.calls[0]?.[2] as {
      cookies: {
        getAll: () => unknown[];
        setAll: (cookiesToSet: Array<{ name: string; value: string; options?: unknown }>) => void;
      };
    };

    expect(options.cookies.getAll()).toEqual([]);
    expect(() =>
      options.cookies.setAll([
        {
          name: "sb-access-token",
          value: "token"
        }
      ])
    ).not.toThrow();
    expect(cookieStore.set).toHaveBeenCalledWith("sb-access-token", "token", undefined);
  });
});
