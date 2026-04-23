"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { RoleSelector } from "@/components/role-selector";
import { REGISTER_USER_INITIAL_STATE } from "@/lib/auth/register-user";
import { submitRegistration } from "./actions";

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
  const [selectedRole, setSelectedRole] = useState<AccountRole | null>(() =>
    getRoleFromSearchParam(searchParams.get("role"))
  );
  const [formState, formAction, isPending] = useActionState(
    submitRegistration,
    REGISTER_USER_INITIAL_STATE
  );

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
              Email signup stores the selected role in auth metadata so downstream routing can use
              the correct protected destination.
            </p>
          </div>
        </section>

        <form action={formAction} className="register-form">
          <RoleSelector selectedRole={selectedRole} onChange={setSelectedRole} />

          {formState.message ? (
            <p
              aria-live="polite"
              className={`register-form-feedback register-form-feedback--${formState.status}`}
              data-testid="register-form-feedback"
              role={formState.status === "error" ? "alert" : "status"}
            >
              {formState.message}
            </p>
          ) : null}

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
                  aria-invalid={formState.fieldErrors?.email ? "true" : "false"}
                  data-testid="register-email-input"
                  name="email"
                  placeholder="name@company.com"
                  required
                  type="email"
                />
                {formState.fieldErrors?.email ? (
                  <span className="register-field__error">{formState.fieldErrors.email}</span>
                ) : null}
              </label>

              <label className="register-field">
                <span>Password</span>
                <input
                  autoComplete="new-password"
                  aria-invalid={formState.fieldErrors?.password ? "true" : "false"}
                  data-testid="register-password-input"
                  minLength={8}
                  name="password"
                  placeholder="Create a secure password"
                  required
                  type="password"
                />
                {formState.fieldErrors?.password ? (
                  <span className="register-field__error">{formState.fieldErrors.password}</span>
                ) : null}
              </label>

              <label className="register-field">
                <span>Confirm Password</span>
                <input
                  autoComplete="new-password"
                  aria-invalid={formState.fieldErrors?.confirmPassword ? "true" : "false"}
                  data-testid="register-confirm-password-input"
                  minLength={8}
                  name="confirmPassword"
                  placeholder="Repeat your password"
                  required
                  type="password"
                />
                {formState.fieldErrors?.confirmPassword ? (
                  <span className="register-field__error">
                    {formState.fieldErrors.confirmPassword}
                  </span>
                ) : null}
              </label>
            </div>
          </section>

          <div className="register-form__footer">
            <p className="register-footer-copy">
              Create the account with email/password and keep the selected role attached to the
              auth record from the first request.
            </p>
            <button
              className="register-submit-button"
              data-testid="register-submit-button"
              disabled={!selectedRole || isPending}
              type="submit"
            >
              {isPending ? "Creating Account..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
