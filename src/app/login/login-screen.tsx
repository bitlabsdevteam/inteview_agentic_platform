"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { startGoogleLogin } from "./actions";

export function LoginScreen() {
  const searchParams = useSearchParams();
  const authError = searchParams.get("authError")?.trim();
  const mockRole = searchParams.get("mock-role")?.trim() ?? "";
  const mockMissingRole = searchParams.get("mock-missing-role") === "true" ? "true" : "";

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
            <h1>Return with Google and recover the right role flow</h1>
            <p className="register-summary">
              Google authentication is available for returning employers and job seekers now. The
              fuller email/password login form arrives in the next sprint task.
            </p>
          </div>

          <div className="register-hero__panel">
            <p className="register-section-label">Google Sign-In</p>
            <p className="register-role-status">
              Continue with Google to restore the saved role when it exists, or finish the role
              setup if the account still needs it.
            </p>
          </div>
        </section>

        <form action={startGoogleLogin} className="register-form">
          {authError ? (
            <p
              aria-live="polite"
              className="register-form-feedback register-form-feedback--error"
              data-testid="login-form-feedback"
              role="alert"
            >
              {authError}
            </p>
          ) : null}

          <section aria-labelledby="login-google-title" className="register-form__section">
            <div className="register-form__section-header">
              <p className="register-section-label">Google Access</p>
              <h2 id="login-google-title" className="register-section-title">
                Start with the same Google account you used before.
              </h2>
            </div>

            <p className="register-footer-copy">
              The callback route will read the saved role metadata and send you to the correct
              destination automatically.
            </p>

            <input name="mockRole" type="hidden" value={mockRole} />
            <input name="mockMissingRole" type="hidden" value={mockMissingRole} />

            <div className="register-oauth-actions">
              <button
                className="register-submit-button register-submit-button--secondary"
                data-testid="login-google-submit-button"
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
