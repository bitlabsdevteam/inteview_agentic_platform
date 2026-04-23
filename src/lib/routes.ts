export const PUBLIC_ROUTES = ["/", "/login", "/register", "/auth/callback", "/auth/complete-role"] as const;
export const AUTH_ROUTES = ["/login", "/register", "/auth/complete-role"] as const;
export const APP_ROUTES = ["/employer", "/job-seeker"] as const;

export const DEFAULT_ROLE_DESTINATION = {
  employer: "/employer",
  job_seeker: "/job-seeker"
} as const;

function matchesRoute(pathname: string, routes: readonly string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isPublicRoute(pathname: string) {
  return matchesRoute(pathname, PUBLIC_ROUTES);
}

export function isProtectedRoute(pathname: string) {
  return matchesRoute(pathname, APP_ROUTES);
}
