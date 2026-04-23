import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/login", "/register", "/auth/callback", "/auth/complete-role", "/employer/:path*", "/job-seeker/:path*"]
};
