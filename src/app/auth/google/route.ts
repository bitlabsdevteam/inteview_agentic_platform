import { NextRequest, NextResponse } from "next/server";

import { beginGoogleOAuth, buildAuthErrorRedirectPath, type GoogleOAuthIntent } from "@/lib/auth/google-oauth";
import { getPublicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function parseIntent(value: string | null): GoogleOAuthIntent {
  return value === "register" ? "register" : "login";
}

function createRedirectResponse(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

export async function GET(request: NextRequest) {
  const intent = parseIntent(request.nextUrl.searchParams.get("intent"));
  const supabase = await createSupabaseServerClient();
  const result = await beginGoogleOAuth({
    intent,
    role: "",
    requireRole: false,
    signInWithOAuth: (payload) => supabase.auth.signInWithOAuth(payload),
    siteUrl: getPublicEnv().siteUrl
  });

  if (result.status === "error") {
    return createRedirectResponse(
      request,
      buildAuthErrorRedirectPath({
        intent,
        message: result.message
      })
    );
  }

  return NextResponse.redirect(result.url);
}
