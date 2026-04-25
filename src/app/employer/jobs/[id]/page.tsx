import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AccountHeader, getAccountHeaderState } from "@/components/account-header";
import {
  publishEmployerJobAction,
  saveEmployerJobDraftAction,
  submitEmployerJobForReviewAction
} from "@/app/employer/jobs/actions";
import { enforceRouteAccess } from "@/lib/auth/enforce-route-access";
import { formatEmployerJobStatus, getEmployerJob } from "@/lib/employer/jobs";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EmployerJobDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EmployerJobDetailPage({ params }: EmployerJobDetailPageProps) {
  await enforceRouteAccess("/employer/jobs");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const [accountHeaderState, job] = await Promise.all([
    getAccountHeaderState(),
    getEmployerJob(supabase, data.user.id, id)
  ]);

  if (!job) {
    notFound();
  }

  const canSubmitForReview = job.status === "draft";
  const canPublish = job.status === "needs_review";

  return (
    <main className="app-page employer-page">
      <div className="product-shell employer-shell">
        <AccountHeader state={accountHeaderState} />

        <section className="employer-jobs-hero">
          <div>
            <p className="employer-section-label">{formatEmployerJobStatus(job.status)}</p>
            <h1>{job.title}</h1>
            <p className="employer-summary">
              Review the structured brief and generated job draft before publishing.
            </p>
          </div>
          <Link className="employer-composer__button employer-composer__button--secondary" href="/employer/jobs">
            Back to Jobs
          </Link>
        </section>

        <section className="employer-job-detail">
          <form action={saveEmployerJobDraftAction} className="employer-job-form" data-testid="employer-job-detail-form">
            <input name="jobId" type="hidden" value={job.id} />
            <div className="employer-job-form__grid">
              <label className="register-field">
                Job title
                <input defaultValue={job.title} name="title" required />
              </label>
              <label className="register-field">
                Department
                <input defaultValue={job.department} name="department" required />
              </label>
              <label className="register-field">
                Level
                <input defaultValue={job.level} name="level" required />
              </label>
              <label className="register-field">
                Location
                <input defaultValue={job.location} name="location" required />
              </label>
              <label className="register-field">
                Compensation band
                <input defaultValue={job.compensation_band} name="compensationBand" required />
              </label>
            </div>
            <label className="register-field">
              Hiring problem
              <textarea className="employer-composer__input" defaultValue={job.brief.hiringProblem} name="hiringProblem" required rows={4} />
            </label>
            <label className="register-field">
              First outcomes
              <textarea className="employer-composer__input" defaultValue={job.brief.outcomes} name="outcomes" required rows={4} />
            </label>
            <label className="register-field">
              Requirements
              <textarea className="employer-composer__input" defaultValue={job.brief.requirements} name="requirements" required rows={4} />
            </label>
            <label className="register-field">
              Interview loop
              <textarea className="employer-composer__input" defaultValue={job.brief.interviewLoop} name="interviewLoop" required rows={4} />
            </label>
            <label className="register-field">
              Generated job draft
              <textarea className="employer-composer__input employer-job-form__draft" defaultValue={job.draft_description} readOnly rows={12} />
            </label>
            <div className="employer-composer__actions">
              <button className="employer-composer__button employer-composer__button--secondary" type="submit">
                Save Draft
              </button>
            </div>
          </form>

          <aside className="employer-rail">
            <article className="employer-rail-card">
              <p className="employer-section-label">Review Checklist</p>
              <ul className="employer-guardrail-list">
                <li>Required fields are complete.</li>
                <li>Compensation and location are visible.</li>
                <li>Interview loop is defined.</li>
                <li>Human approval happens before publishing.</li>
              </ul>
            </article>

            <article className="employer-rail-card">
              <p className="employer-section-label">Publish Controls</p>
              <div className="employer-composer__actions">
                <form action={submitEmployerJobForReviewAction}>
                  <input name="jobId" type="hidden" value={job.id} />
                  <button className="employer-composer__button" disabled={!canSubmitForReview} type="submit">
                    Mark Ready For Review
                  </button>
                </form>
                <form action={publishEmployerJobAction}>
                  <input name="jobId" type="hidden" value={job.id} />
                  <button className="employer-composer__button" disabled={!canPublish} type="submit">
                    Publish Job
                  </button>
                </form>
              </div>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
