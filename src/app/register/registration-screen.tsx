"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { RoleSelector } from "@/components/role-selector";

type AccountRole = "employer" | "job_seeker";

function getRoleFromSearchParam(value: string | null): AccountRole | null {
  if (value === "employer" || value === "job_seeker") {
    return value;
  }

  return null;
}

function formatRoleLabel(role: AccountRole | null) {
  if (role === "employer") {
    return "Employer";
  }

  if (role === "job_seeker") {
    return "Job Seeker";
  }

  return null;
}

export function RegistrationScreen() {
  const searchParams = useSearchParams();
  const [selectedRole, setSelectedRole] = useState<AccountRole | null>(null);

  useEffect(() => {
    const searchRole = getRoleFromSearchParam(searchParams.get("role"));

    setSelectedRole(searchRole);
  }, [searchParams]);

  const selectedRoleLabel = formatRoleLabel(selectedRole);

  return (
    <main>
      <div className="register-shell">
        <nav aria-label="Primary" className="register-shell__nav">
          <Link href="/">Home</Link>
          <Link href="/login">Login</Link>
          <Link href="/register">Register</Link>
          <Link href="/employer">Employer</Link>
          <Link href="/job-seeker">Job Seeker</Link>
        </nav>

        <section className="register-hero">
          <div className="register-hero__copy">
            <p className="register-eyebrow">Public Auth Route</p>
            <h1>Create your account with the right role context</h1>
            <p className="register-summary">
              Registration starts by identifying whether this account belongs to an employer or a
              job seeker. That choice drives the next onboarding step and the protected destination
              after authentication.
            </p>
          </div>

          <div className="register-hero__panel">
            <p className="register-section-label">Role Status</p>
            <p className="register-role-status" data-testid="register-role-summary">
              {selectedRoleLabel
                ? `Selected role: ${selectedRoleLabel}`
                : "Choose whether you are registering as an employer or a job seeker."}
            </p>
            <p className="register-helper-note">
              The sign-up action stays locked until a role is selected. Auth wiring and Supabase
              submission arrive in the next sprint task.
            </p>
          </div>
        </section>

        <form className="register-form">
          <RoleSelector selectedRole={selectedRole} onChange={setSelectedRole} />

          <section aria-labelledby="account-details-title" className="register-form__section">
            <div className="register-form__section-header">
              <p className="register-section-label">Account Details</p>
              <h2 id="account-details-title" className="register-section-title">
                Prepare the account details for the selected path.
              </h2>
            </div>

            <div className="register-field-grid">
              <label className="register-field">
                <span>Email Address</span>
                <input
                  autoComplete="email"
                  name="email"
                  placeholder="name@company.com"
                  type="email"
                />
              </label>

              <label className="register-field">
                <span>Password</span>
                <input
                  autoComplete="new-password"
                  name="password"
                  placeholder="Create a secure password"
                  type="password"
                />
              </label>

              <label className="register-field">
                <span>Confirm Password</span>
                <input
                  autoComplete="new-password"
                  name="confirmPassword"
                  placeholder="Repeat your password"
                  type="password"
                />
              </label>
            </div>
          </section>

          <div className="register-form__footer">
            <p className="register-footer-copy">
              Continue only becomes available after role selection so the next task can create the
              account with the correct role metadata.
            </p>
            <button
              className="register-submit-button"
              data-testid="register-submit-button"
              disabled={!selectedRole}
              type="button"
            >
              Continue To Account Creation
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
