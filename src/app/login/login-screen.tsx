"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import { startGoogleLogin, submitLogin, type LoginFormState } from "./actions";

const LOGIN_FORM_INITIAL_STATE: LoginFormState = {
  status: "idle"
};

type LoginScreenProps = {
  header: ReactNode;
};

export function LoginScreen({ header }: LoginScreenProps) {
  const searchParams = useSearchParams();
  const authError = searchParams.get("authError")?.trim();
  const [formState, formAction, isPending] = useActionState(submitLogin, LOGIN_FORM_INITIAL_STATE);
  const feedbackMessage = formState.message ?? authError;
  const feedbackStatus = formState.message ? formState.status : authError ? "error" : "idle";

  return (
    <main>
      <div className="register-shell">
        {header}

        <section className="register-hero">
          <div className="register-hero__copy">
            <p className="register-eyebrow">Public Auth Route</p>
            <h1>Sign back in and recover the right workspace</h1>
            <p className="register-summary">
              Returning employers and job seekers can now sign in with email/password or Google.
              The app resolves the saved role after authentication and routes each user into the
              correct protected workspace.
            </p>
          </div>

          <div className="register-hero__panel">
            <p className="register-section-label">Recovery State</p>
            <p className="register-role-status">
              If password access fails, use the recovery guidance below or continue with Google if
              that was the original sign-in method.
            </p>
          </div>
        </section>

        <form action={formAction} className="register-form">
          {feedbackMessage ? (
            <p
              aria-live="polite"
              className={`register-form-feedback register-form-feedback--${feedbackStatus}`}
              data-testid="login-form-feedback"
              role={feedbackStatus === "error" ? "alert" : "status"}
            >
              {feedbackMessage}
            </p>
          ) : null}

          <section aria-labelledby="login-account-title" className="register-form__section">
            <div className="register-form__section-header">
              <p className="register-section-label">Account Access</p>
              <h2 id="login-account-title" className="register-section-title">
                Use the same credentials you registered with.
              </h2>
            </div>

            <div className="register-field-grid register-field-grid--login">
              <label className="register-field">
                <span>Email Address</span>
                <input
                  autoComplete="email"
                  aria-invalid={formState.fieldErrors?.email ? "true" : "false"}
                  data-testid="login-email-input"
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
                  autoComplete="current-password"
                  aria-invalid={formState.fieldErrors?.password ? "true" : "false"}
                  data-testid="login-password-input"
                  name="password"
                  placeholder="Enter your password"
                  required
                  type="password"
                />
                {formState.fieldErrors?.password ? (
                  <span className="register-field__error">{formState.fieldErrors.password}</span>
                ) : null}
              </label>
            </div>

            <div className="login-recovery-row">
              <p className="register-footer-copy">
                Password reset flows are not wired yet. If you signed up with Google, use that path
                instead. Otherwise contact support for recovery assistance.
              </p>
              <a
                className="login-recovery-link"
                data-testid="login-recovery-link"
                href="mailto:support@interview-agent.local?subject=Login%20Recovery"
              >
                Need Recovery Help?
              </a>
            </div>

            <div className="register-oauth-actions">
              <button
                className="register-submit-button"
                data-testid="login-submit-button"
                disabled={isPending}
                type="submit"
              >
                {isPending ? "Signing In..." : "Sign In"}
              </button>
              <button
                className="register-submit-button register-submit-button--secondary"
                data-testid="login-google-submit-button"
                disabled={isPending}
                formAction={startGoogleLogin}
                formNoValidate
                type="submit"
              >
                Continue With Google
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
