import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero__copy">
          <p className="landing-eyebrow">Interview Agentic Platform</p>
          <h1>Interview agents for both sides of the hiring loop</h1>
          <p className="landing-summary">
            Create roles, prepare candidates, and move from first visit to authenticated workflow
            without losing the context of who the user is.
          </p>
          <div className="landing-actions">
            <Link className="landing-action landing-action--secondary" href="/login" data-testid="landing-login-link">
              Log In
            </Link>
            <Link className="landing-action landing-action--primary" href="/register" data-testid="landing-register-link">
              Create Account
            </Link>
          </div>
        </div>

        <div className="landing-signal-board" aria-label="Platform highlights">
          <div className="landing-signal-card">
            <span>Employer track</span>
            <strong>Role intake, job-description drafting, and agent-guided publishing</strong>
          </div>
          <div className="landing-signal-card">
            <span>Job seeker track</span>
            <strong>Interview preparation, guided practice, and virtual interview readiness</strong>
          </div>
          <div className="landing-signal-card">
            <span>Shared foundation</span>
            <strong>Supabase auth, role-aware routing, and future employer-first onboarding</strong>
          </div>
        </div>
      </section>

      <section className="landing-paths" aria-labelledby="primary-paths-title">
        <div className="landing-paths__header">
          <p className="landing-section-label">Primary Paths</p>
          <h2 id="primary-paths-title">Choose the side of the platform that matches your next step.</h2>
        </div>

        <div className="landing-path-grid">
          <article className="landing-path-card">
            <p className="landing-path-card__label">For Employers</p>
            <h3>Shape a role before you publish it.</h3>
            <p>
              Start with structured intake, refine the job description with an agent, and prepare a
              role package that is ready for approval.
            </p>
            <Link
              className="landing-path-card__link"
              href="/register?role=employer"
              data-testid="landing-employer-entry-link"
            >
              Enter as Employer
            </Link>
          </article>

          <article className="landing-path-card">
            <p className="landing-path-card__label">For Job Seekers</p>
            <h3>Prepare for interviews with the right context.</h3>
            <p>
              Register as a candidate to access interview preparation, scheduling, and future
              virtual interview sessions tailored to your role goals.
            </p>
            <Link
              className="landing-path-card__link"
              href="/register?role=job_seeker"
              data-testid="landing-job-seeker-entry-link"
            >
              Enter as Job Seeker
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
