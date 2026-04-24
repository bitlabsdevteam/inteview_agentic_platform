import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import {
  buildAuthErrorRedirectPath,
  resolveOAuthDestination,
  type GoogleOAuthIntent
} from "@/lib/auth/google-oauth";
import { parseAccountRole } from "@/lib/auth/roles";
import { getPublicEnv } from "@/lib/env";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

function parseIntent(value: string | null): GoogleOAuthIntent {
  return value === "login" ? "login" : "register";
}

function createRedirectResponse(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

function createSupabaseRouteClient(request: NextRequest) {
  const env = getPublicEnv();
  const cookiesToSet: CookieToSet[] = [];

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(nextCookies: CookieToSet[]) {
        nextCookies.forEach((cookie) => {
          request.cookies.set(cookie.name, cookie.value);
          cookiesToSet.push(cookie);
        });
      }
    }
  });

  function applyCookies(response: NextResponse) {
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    return response;
  }

  return {
    applyCookies,
    supabase
  };
}

export async function GET(request: NextRequest) {
  const intent = parseIntent(request.nextUrl.searchParams.get("intent"));

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return createRedirectResponse(
      request,
      buildAuthErrorRedirectPath({
        intent,
        message: "Google sign-in did not return an authorization code.",
        role: request.nextUrl.searchParams.get("role") ?? undefined
      })
    );
  }

  const { supabase, applyCookies } = createSupabaseRouteClient(request);
  const sessionResult = await supabase.auth.exchangeCodeForSession(code);

  if (sessionResult.error || !sessionResult.data.user) {
    return applyCookies(
      createRedirectResponse(
        request,
        buildAuthErrorRedirectPath({
          intent,
          message: sessionResult.error?.message ?? "We could not complete Google sign-in.",
          role: request.nextUrl.searchParams.get("role") ?? undefined
        })
      )
    );
  }

  let resolvedRole = parseAccountRole(sessionResult.data.user.user_metadata?.role);
  const requestedRole = parseAccountRole(request.nextUrl.searchParams.get("role"));

  if (intent === "register" && !resolvedRole && !requestedRole) {
    return applyCookies(
      createRedirectResponse(
        request,
        buildAuthErrorRedirectPath({
          intent,
          message: "Choose Employer or Job Seeker before continuing with Google."
        })
      )
    );
  }

  if (!resolvedRole && requestedRole) {
    const updateResult = await supabase.auth.updateUser({
      data: {
        role: requestedRole
      }
    });

    if (updateResult.error) {
      return applyCookies(
        createRedirectResponse(
          request,
          buildAuthErrorRedirectPath({
            intent,
            message: updateResult.error.message,
            role: requestedRole
          })
        )
      );
    }

    resolvedRole = requestedRole;
  }

  return applyCookies(createRedirectResponse(request, resolveOAuthDestination(resolvedRole, intent)));
}
