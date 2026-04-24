import { redirect } from "next/navigation";

import { readMockAuthSessionFromCookies } from "@/lib/auth/mock-session";
import { parseAccountRole } from "@/lib/auth/roles";
import { resolveRouteGuardRedirect } from "@/lib/auth/route-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function enforceRouteAccess(pathname: string) {
  if (process.env.INTERVIEW_AGENT_MOCK_AUTH === "true") {
    const mockSession = await readMockAuthSessionFromCookies();
    const redirectPath = resolveRouteGuardRedirect({
      isAuthenticated: mockSession.isAuthenticated,
      pathname,
      role: mockSession.role
    });

    if (redirectPath) {
      redirect(redirectPath);
    }

    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const redirectPath = resolveRouteGuardRedirect({
    isAuthenticated: Boolean(data.user),
    pathname,
    role: parseAccountRole(data.user?.user_metadata?.role)
  });

  if (redirectPath) {
    redirect(redirectPath);
  }
}
