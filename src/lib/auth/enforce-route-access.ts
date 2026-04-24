import { redirect } from "next/navigation";

import { parseAccountRole } from "@/lib/auth/roles";
import { resolveRouteGuardRedirect } from "@/lib/auth/route-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function enforceRouteAccess(pathname: string) {
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
