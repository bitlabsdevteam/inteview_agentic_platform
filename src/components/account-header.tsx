import Link from "next/link";

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

const baseNavLinks = [
  { href: "/", label: "Home" },
  { href: "/employer", label: "Employer" },
  { href: "/job-seeker", label: "Job Seeker" }
] as const;

const publicAuthLinks = [
  { href: buildGoogleAuthStartPath("login"), label: "Login" },
  { href: buildGoogleAuthStartPath("register"), label: "Register" }
] as const;

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
  return state.isAuthenticated
    ? [...baseNavLinks]
    : [baseNavLinks[0], ...publicAuthLinks, ...baseNavLinks.slice(1)];
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
  return (
    <header
      style={{
        display: "grid",
        gap: "16px"
      }}
    >
      <nav
        aria-label="Primary"
        style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.95rem" }}
      >
        {getAccountHeaderNavLinks(state).map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>

      <section
        aria-label="Account State"
        data-testid={state.isAuthenticated ? "account-header-profile" : "account-header-public-state"}
        style={{
          display: "grid",
          gap: "6px",
          padding: "16px",
          borderRadius: "18px",
          background: "rgba(244, 247, 251, 0.92)",
          border: "1px solid rgba(31, 41, 51, 0.12)"
        }}
      >
        <p
          style={{
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontSize: "0.76rem"
          }}
        >
          {state.isAuthenticated ? "Profile State" : "Public State"}
        </p>
        <strong>{state.identityLabel}</strong>
        <span style={{ lineHeight: 1.5 }}>
          {state.isAuthenticated
            ? state.roleLabel
              ? `${state.roleLabel} session detected.`
              : "Authenticated account with role setup still pending."
            : "Browse public routes or authenticate to enter a protected workspace."}
        </span>
      </section>
    </header>
  );
}
