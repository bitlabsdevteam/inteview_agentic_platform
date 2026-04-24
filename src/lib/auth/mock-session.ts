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

function parseMockAuthSession({
  sessionValue,
  roleValue
}: {
  sessionValue?: string;
  roleValue?: string;
}): MockAuthSession {
  const isAuthenticated = sessionValue === "authenticated";

  return {
    isAuthenticated,
    role: isAuthenticated ? parseAccountRole(roleValue) : null
  };
}

export function readMockAuthSession(request: NextRequest): MockAuthSession {
  return parseMockAuthSession({
    roleValue: request.cookies.get(MOCK_AUTH_ROLE_COOKIE)?.value,
    sessionValue: request.cookies.get(MOCK_AUTH_SESSION_COOKIE)?.value
  });
}

export async function readMockAuthSessionFromCookies(): Promise<MockAuthSession> {
  const cookieStore = await cookies();

  return parseMockAuthSession({
    roleValue: cookieStore.get(MOCK_AUTH_ROLE_COOKIE)?.value,
    sessionValue: cookieStore.get(MOCK_AUTH_SESSION_COOKIE)?.value
  });
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
