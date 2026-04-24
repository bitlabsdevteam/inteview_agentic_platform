"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { RoleSelector } from "@/components/role-selector";
import { REGISTER_USER_INITIAL_STATE } from "@/lib/auth/register-user";
import { formatAccountRole, parseAccountRole, type AccountRole } from "@/lib/auth/roles";
import { startGoogleRegistration, submitRegistration } from "./actions";

type RegistrationScreenProps = {
  header: ReactNode;
};

export function RegistrationScreen({ header }: RegistrationScreenProps) {
  const searchParams = useSearchParams();
  const [selectedRole, setSelectedRole] = useState<AccountRole | null>(() =>
    parseAccountRole(searchParams.get("role"))
  );
  const [formState, formAction, isPending] = useActionState(
    submitRegistration,
    REGISTER_USER_INITIAL_STATE
  );
  const authError = searchParams.get("authError")?.trim();

  useEffect(() => {
    const searchRole = parseAccountRole(searchParams.get("role"));

    setSelectedRole(searchRole);
  }, [searchParams]);

  const selectedRoleLabel = formatAccountRole(selectedRole);
  const feedbackMessage = formState.message ?? authError;
  const feedbackStatus = formState.message ? formState.status : authError ? "error" : "idle";

  return (
    <main>
      <div className="register-shell">
        {header}

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

          {feedbackMessage ? (
            <p
              aria-live="polite"
              className={`register-form-feedback register-form-feedback--${feedbackStatus}`}
              data-testid="register-form-feedback"
              role={feedbackStatus === "error" ? "alert" : "status"}
            >
              {feedbackMessage}
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
            <div className="register-oauth-actions">
              <button
                className="register-submit-button"
                data-testid="register-submit-button"
                disabled={!selectedRole || isPending}
                type="submit"
              >
                {isPending ? "Creating Account..." : "Create Account"}
              </button>
              <button
                className="register-submit-button register-submit-button--secondary"
                data-testid="register-google-submit-button"
                disabled={!selectedRole || isPending}
                formAction={startGoogleRegistration}
                formNoValidate
                type="submit"
              >
                Continue With Google
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
