import Link from "next/link";

import { enforceRouteAccess } from "@/lib/auth/enforce-route-access";

export const dynamic = "force-dynamic";

export default async function NewEmployerJobPage() {
  await enforceRouteAccess("/employer/jobs/new");

  return (
    <>
      <section className="employer-jobs-hero">
        <div>
          <p className="employer-section-label">Job Creation Agent</p>
          <h1>Create a job with the agent</h1>
          <p className="employer-summary">
            Start with the hiring need. The assistant stays available while the wizard moves from
            draft creation into interview design and review.
          </p>
        </div>
        <Link
          className="employer-composer__button employer-composer__button--secondary"
          href="/employer/jobs"
        >
          Back to Jobs
        </Link>
      </section>

      <section className="employer-job-detail-pipeline" data-testid="employer-job-detail-pipeline">
        <article
          className="employer-job-detail-pipeline__stage employer-job-detail-pipeline__stage--current"
          data-stage-key="job_posting"
          data-stage-state="current"
        >
          <div className="employer-job-detail-pipeline__stage-content">
            <p className="employer-section-label">Stage</p>
            <h2>Build Job Posting</h2>
            <p className="employer-job-detail-pipeline__state">In progress</p>
            <p className="employer-job-detail-pipeline__hint">
              Use the assistant rail to create the first draft from the hiring brief.
            </p>
          </div>
        </article>

        <article
          className="employer-job-detail-pipeline__stage"
          data-stage-key="interview_structure"
          data-stage-state="upcoming"
        >
          <div className="employer-job-detail-pipeline__stage-content">
            <p className="employer-section-label">Stage</p>
            <h2>Design Interview Structure</h2>
            <p className="employer-job-detail-pipeline__state">Upcoming</p>
            <p className="employer-job-detail-pipeline__hint">
              After draft generation, define interview mode, structure, and evaluator guidance.
            </p>
          </div>
        </article>

        <article
          className="employer-job-detail-pipeline__stage"
          data-stage-key="review"
          data-stage-state="upcoming"
        >
          <div className="employer-job-detail-pipeline__stage-content">
            <p className="employer-section-label">Stage</p>
            <h2>Review And Approve</h2>
            <p className="employer-job-detail-pipeline__state">Upcoming</p>
            <p className="employer-job-detail-pipeline__hint">
              Review stays gated until the draft and interview plan are complete.
            </p>
          </div>
        </article>
      </section>

      <section className="employer-job-detail">
        <div className="employer-job-detail__main">
          <section
            className="employer-jobs-panel employer-job-stage-panel"
            data-testid="employer-job-stage-panel-create"
          >
            <div className="employer-chat-panel__header">
              <div>
                <p className="employer-section-label">Stage 1</p>
                <h2>Build Job Posting</h2>
              </div>
              <span className="employer-chat-panel__status">Assistant-led</span>
            </div>
            <p className="employer-summary">
              The right-side assistant stays open for drafting. Once the initial job is generated,
              the wizard route moves to the saved job detail screen without replacing the assistant
              shell.
            </p>
          </section>

          <section className="employer-job-detail__supporting">
            <article
              className="employer-job-stage-panel__card"
              data-testid="employer-job-generated-state"
            >
              <p className="employer-section-label">Generated Draft State</p>
              <h3>Draft queued after generation</h3>
              <p>
                Title, role scope, outcomes, requirements, compensation notes, and interview loop
                will appear on the draft review page.
              </p>
            </article>

            <article
              className="employer-job-stage-panel__card"
              data-testid="employer-job-assumptions"
            >
              <p className="employer-section-label">Assumptions</p>
              <ul className="employer-guardrail-list">
                <li>Inferred fields are labeled for employer review.</li>
                <li>Defaulted values stay editable before publication.</li>
              </ul>
            </article>

            <article
              className="employer-job-stage-panel__card"
              data-testid="employer-job-missing-fields"
            >
              <p className="employer-section-label">Missing Critical Fields</p>
              <p>Targeted follow-up questions appear only when a gap blocks a useful draft.</p>
            </article>
          </section>
        </div>
      </section>
    </>
  );
}
