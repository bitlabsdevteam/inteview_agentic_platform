import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { parseAccountRole, type AccountRole } from "@/lib/auth/roles";

const MOCK_AUTH_SESSION_COOKIE = "interview_agent_mock_session";
const MOCK_AUTH_ROLE_COOKIE = "interview_agent_mock_role";

const COOKIE_OPTIONS = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const
};

export type MockAuthSession = {
  isAuthenticated: boolean;
  role: AccountRole | null;
};

export function readMockAuthSession(request: NextRequest): MockAuthSession {
  const isAuthenticated =
    request.cookies.get(MOCK_AUTH_SESSION_COOKIE)?.value === "authenticated";

  return {
    isAuthenticated,
    role: isAuthenticated
      ? parseAccountRole(request.cookies.get(MOCK_AUTH_ROLE_COOKIE)?.value)
      : null
  };
}

export async function persistMockAuthSession(role: AccountRole | null) {
  const cookieStore = await cookies();

  cookieStore.set(MOCK_AUTH_SESSION_COOKIE, "authenticated", COOKIE_OPTIONS);

  if (role) {
    cookieStore.set(MOCK_AUTH_ROLE_COOKIE, role, COOKIE_OPTIONS);
    return;
  }

  cookieStore.delete(MOCK_AUTH_ROLE_COOKIE);
}

export function persistMockAuthSessionOnResponse(
  response: NextResponse,
  role: AccountRole | null
) {
  response.cookies.set(MOCK_AUTH_SESSION_COOKIE, "authenticated", COOKIE_OPTIONS);

  if (role) {
    response.cookies.set(MOCK_AUTH_ROLE_COOKIE, role, COOKIE_OPTIONS);
    return response;
  }

  response.cookies.delete(MOCK_AUTH_ROLE_COOKIE);
  return response;
}
