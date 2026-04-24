import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { readMockAuthSession } from "@/lib/auth/mock-session";
import { parseAccountRole } from "@/lib/auth/roles";
import { resolveRouteGuardRedirect } from "@/lib/auth/route-guard";
import { getPublicEnv } from "@/lib/env";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export function updateSession(request: NextRequest) {
  if (process.env.INTERVIEW_AGENT_MOCK_AUTH === "true") {
    const mockSession = readMockAuthSession(request);
    const mockRedirect = resolveRouteGuardRedirect({
      isAuthenticated: mockSession.isAuthenticated,
      pathname: request.nextUrl.pathname,
      role: mockSession.role
    });

    if (mockRedirect) {
      return NextResponse.redirect(new URL(mockRedirect, request.url));
    }

    return NextResponse.next({
      request
    });
  }

  const env = getPublicEnv();
  const cookiesToSet: CookieToSet[] = [];

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(nextCookiesToSet: CookieToSet[]) {
        nextCookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          cookiesToSet.push({
            name,
            options,
            value
          });
        });
      }
    }
  });

  return supabase.auth.getUser().then(({ data }) => {
    const redirectPath = resolveRouteGuardRedirect({
      isAuthenticated: Boolean(data.user),
      pathname: request.nextUrl.pathname,
      role: parseAccountRole(data.user?.user_metadata?.role)
    });

    const response = redirectPath
      ? NextResponse.redirect(new URL(redirectPath, request.url))
      : NextResponse.next({
          request
        });

    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as CookieOptions);
    });

    return response;
  });
}
