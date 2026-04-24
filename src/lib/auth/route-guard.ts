import { buildRoleCompletionPath } from "@/lib/auth/google-oauth";
import { getRoleDestination, type AccountRole } from "@/lib/auth/roles";
import { AUTH_ROUTES, isProtectedRoute } from "@/lib/routes";

type RouteGuardInput = {
  pathname: string;
  isAuthenticated: boolean;
  role: AccountRole | null;
};

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function resolveRouteGuardRedirect({
  pathname,
  isAuthenticated,
  role
}: RouteGuardInput): string | null {
  if (!isAuthenticated) {
    if (isProtectedRoute(pathname) || pathname === "/auth/complete-role") {
      return "/login";
    }

    return null;
  }

  if (!role) {
    if (pathname === "/auth/complete-role") {
      return null;
    }

    if (isAuthRoute(pathname) || isProtectedRoute(pathname)) {
      return buildRoleCompletionPath("login");
    }

    return null;
  }

  const roleDestination = getRoleDestination(role);

  if (isAuthRoute(pathname)) {
    return roleDestination;
  }

  if (isProtectedRoute(pathname) && !pathname.startsWith(`${roleDestination}/`) && pathname !== roleDestination) {
    return roleDestination;
  }

  return null;
}
