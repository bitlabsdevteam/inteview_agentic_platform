import { describe, expect, it } from "vitest";

import {
  APP_ROUTES,
  AUTH_ROUTES,
  DEFAULT_ROLE_DESTINATION,
  PUBLIC_ROUTES,
  isProtectedRoute,
  isPublicRoute
} from "@/lib/routes";

describe("route configuration", () => {
  it("defines the expected public and protected entry points", () => {
    expect(PUBLIC_ROUTES).toEqual(["/", "/login", "/register", "/auth/callback", "/auth/complete-role"]);
    expect(AUTH_ROUTES).toEqual(["/login", "/register", "/auth/complete-role"]);
    expect(APP_ROUTES).toEqual(["/employer", "/job-seeker"]);
    expect(DEFAULT_ROLE_DESTINATION).toEqual({
      employer: "/employer",
      job_seeker: "/job-seeker"
    });
  });

  it("classifies routes consistently", () => {
    expect(isPublicRoute("/")).toBe(true);
    expect(isPublicRoute("/login")).toBe(true);
    expect(isPublicRoute("/auth/complete-role")).toBe(true);
    expect(isPublicRoute("/employer")).toBe(false);
    expect(isProtectedRoute("/employer")).toBe(true);
    expect(isProtectedRoute("/job-seeker")).toBe(true);
    expect(isProtectedRoute("/register")).toBe(false);
  });
});
