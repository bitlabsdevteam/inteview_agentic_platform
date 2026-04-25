import { buildRoleCompletionPath } from "@/lib/auth/google-oauth";
import { getRoleDestination } from "@/lib/auth/roles";

import type { AccountHeaderState } from "./account-header";

export type HomePageAction = {
  href: string;
  label: string;
  testId: string;
  tone: "primary" | "secondary";
};

export function getHomePageActions(state: AccountHeaderState): HomePageAction[] {
  if (!state.isAuthenticated) {
    return [
      {
        href: "/auth/google?intent=login",
        label: "Log In",
        testId: "landing-login-link",
        tone: "secondary"
      },
      {
        href: "/register",
        label: "Create Account",
        testId: "landing-register-link",
        tone: "primary"
      }
    ];
  }

  return [
    {
      href: state.role ? getRoleDestination(state.role) : buildRoleCompletionPath("login"),
      label: state.role ? `Continue To ${state.roleLabel} Workspace` : "Complete Role Setup",
      testId: "landing-continue-link",
      tone: "primary"
    }
  ];
}
