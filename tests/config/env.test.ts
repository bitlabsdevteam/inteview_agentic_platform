import { describe, expect, it } from "vitest";

import { getPublicEnv, getPublicSiteUrl } from "@/lib/env";

describe("getPublicEnv", () => {
  it("returns the required public auth configuration", () => {
    const env = getPublicEnv({
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key"
    });

    expect(env).toEqual({
      siteUrl: "http://localhost:3000",
      supabaseAnonKey: "anon-key",
      supabaseUrl: "https://example.supabase.co"
    });
  });

  it("throws when a required key is missing", () => {
    expect(() =>
      getPublicEnv({
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key"
      })
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("falls back to localhost for the public site url outside production", () => {
    expect(
      getPublicSiteUrl({
        NODE_ENV: "development"
      })
    ).toBe("http://localhost:3000");
  });

  it("throws when the public site url is missing in production", () => {
    expect(() =>
      getPublicSiteUrl({
        NODE_ENV: "production"
      })
    ).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });
});
