import React from "react";
import Link from "next/link";

import { AccountProfileControls } from "@/components/account-profile-controls";
import { buildGoogleAuthStartPath } from "@/lib/auth/google-oauth";
import { formatAccountRole, parseAccountRole, type AccountRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SessionUserLike = {
  email?: string | null;
  user_metadata?: {
    role?: string | null;
  } | null;
} | null;

type AccountHeaderStateReader = {
  getUser: () => Promise<{
    data: {
      user: SessionUserLike;
    };
    error: {
      message?: string | null;
    } | null;
  }>;
};

export type AccountHeaderState = {
  email: string | null;
  identityLabel: string;
  isAuthenticated: boolean;
  role: AccountRole | null;
  roleLabel: string | null;
};

type AccountHeaderProps = {
  state: AccountHeaderState;
};

export type AccountHeaderAction = {
  id: "logout";
  label: "Logout";
  testId: "account-header-logout-button";
};

const baseNavLinks = [
  { href: "/", label: "Home" },
  { href: "/employer", label: "Employer" },
  { href: "/job-seeker", label: "Job Seeker" }
] as const;

const publicAuthLinks = [
  { href: buildGoogleAuthStartPath("login"), label: "Login" },
  { href: buildGoogleAuthStartPath("register"), label: "Register" }
] as const;

const roleNavLinks = {
  employer: baseNavLinks[1],
  job_seeker: baseNavLinks[2]
} as const satisfies Record<AccountRole, (typeof baseNavLinks)[number]>;

export function deriveAccountHeaderState(user: SessionUserLike): AccountHeaderState {
  const email = typeof user?.email === "string" && user.email.trim() ? user.email.trim() : null;
  const role = parseAccountRole(user?.user_metadata?.role);

  return {
    email,
    identityLabel: email ?? "Guest",
    isAuthenticated: Boolean(user),
    role,
    roleLabel: formatAccountRole(role)
  };
}

export function getAccountHeaderNavLinks(state: AccountHeaderState) {
  if (!state.isAuthenticated) {
    return [baseNavLinks[0], ...publicAuthLinks, ...baseNavLinks.slice(1)];
  }

  return state.role ? [baseNavLinks[0], roleNavLinks[state.role]] : [baseNavLinks[0]];
}

export function getAccountHeaderAccountActions(state: AccountHeaderState): AccountHeaderAction[] {
  if (!state.isAuthenticated) {
    return [];
  }

  return [
    {
      id: "logout",
      label: "Logout",
      testId: "account-header-logout-button"
    }
  ];
}

export async function getAccountHeaderState(
  reader?: Partial<AccountHeaderStateReader>
): Promise<AccountHeaderState> {
  if (reader?.getUser) {
    const result = await reader.getUser();

    return deriveAccountHeaderState(result.data.user);
  }

  const supabase = await createSupabaseServerClient();
  const result = await supabase.auth.getUser();

  return deriveAccountHeaderState(result.data.user);
}

export function AccountHeader({ state }: AccountHeaderProps) {
  const accountActions = getAccountHeaderAccountActions(state);
  const headerClassName = state.isAuthenticated
    ? "account-header account-header--authenticated"
    : "account-header account-header--public";

  return (
    <header className={headerClassName}>
      <div className="account-header__bar">
        <Link aria-label="Interview Agent home" className="account-header__brand" href="/">
          <span aria-hidden="true" className="account-header__brand-mark">
            IA
          </span>
          <span className="account-header__brand-copy">
            <strong>Interview Agent</strong>
            <span>Hiring OS</span>
          </span>
        </Link>

        <nav aria-label="Primary workspace navigation" className="account-header__nav">
          {getAccountHeaderNavLinks(state).map((link) => (
            <Link className="account-header__nav-link" key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <AccountProfileControls actions={accountActions} state={state} />
      </div>
    </header>
  );
}
