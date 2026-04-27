import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AccountHeader, getAccountHeaderState } from "@/components/account-header";
import { EmployerJobAgentChat } from "@/components/employer-job-agent-chat";
import {
  archiveEmployerJobAction,
  publishEmployerJobAction,
  removeEmployerJobAction,
  saveEmployerJobDraftAction,
  submitEmployerJobForReviewAction
} from "@/app/employer/jobs/actions";
import {
  getAgentMemorySummaryBySession,
  toMemorySummaryRecord
} from "@/lib/agents/job-posting/memory";
import {
  getEmployerJobRoleProfileBySession,
  listEmployerJobQualityChecksBySession
} from "@/lib/agents/job-posting/step1-step2-persistence";
import { QUALITY_CHECK_TYPES } from "@/lib/agents/job-posting/quality-controls";
import {
  getLatestAgentJobSessionByJobId,
  listAgentJobMessagesBySession
} from "@/lib/agents/job-posting/persistence";
import { enforceRouteAccess } from "@/lib/auth/enforce-route-access";
import { formatEmployerJobStatus, getEmployerJob, getEmployerJobReviewGate } from "@/lib/employer/jobs";
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

  const latestSession = await getLatestAgentJobSessionByJobId(supabase, data.user.id, job.id);
  const [sessionMessages, memorySummary, roleProfileSummary, qualityChecks] = latestSession
    ? await Promise.all([
        listAgentJobMessagesBySession(supabase, data.user.id, latestSession.id),
        getAgentMemorySummaryBySession(supabase, data.user.id, job.id, latestSession.id),
        getEmployerJobRoleProfileBySession(supabase, data.user.id, job.id, latestSession.id),
        listEmployerJobQualityChecksBySession(supabase, data.user.id, job.id, latestSession.id)
      ])
    : [[], null, null, []];
  const memoryState = toMemorySummaryRecord(memorySummary);
  const currentQualityChecks = qualityChecks.slice(-QUALITY_CHECK_TYPES.length);
  const reviewGate = getEmployerJobReviewGate({
    status: job.status,
    qualityCheckStatuses: currentQualityChecks.map((check) => check.status)
  });
  const canSubmitForReview = reviewGate.canSubmitForReview;
  const canPublish = job.status === "needs_review";
  const canArchive = job.status !== "archived";
  const readinessFlags = {
    blocksReview: currentQualityChecks.some((check) => check.status === "fail"),
    requiresEmployerFix: currentQualityChecks.some((check) => check.status !== "pass")
  };

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
            <section className="employer-rail-section">
              <EmployerJobAgentChat
                jobId={job.id}
                initialSession={
                  latestSession
                    ? {
                        id: latestSession.id,
                        status: latestSession.status,
                        assumptions: latestSession.assumptions,
                        missingCriticalFields: latestSession.missing_critical_fields,
                        followUpQuestions: latestSession.follow_up_questions,
                        updatedAt: latestSession.updated_at
                      }
                    : null
                }
                initialMessages={sessionMessages.map((message) => ({
                  id: message.id,
                  role: message.role,
                  content: message.content,
                  createdAt: message.created_at
                }))}
                initialMemory={{
                  summary: memoryState,
                  compacted: (memoryState?.compactedMessageCount ?? 0) > 0
                }}
                initialRoleProfileSummary={
                  roleProfileSummary
                    ? {
                        title: roleProfileSummary.normalized_profile.title,
                        department: roleProfileSummary.normalized_profile.department,
                        level: roleProfileSummary.normalized_profile.level,
                        locationPolicy: roleProfileSummary.normalized_profile.locationPolicy,
                        compensationRange: roleProfileSummary.normalized_profile.compensationRange,
                        unresolvedConstraints: roleProfileSummary.unresolved_constraints,
                        conflicts: roleProfileSummary.conflicts
                      }
                    : null
                }
                initialQualityChecks={currentQualityChecks.map((check) => ({
                  checkType: check.check_type,
                  status: check.status,
                  issues: check.issues,
                  suggestedRewrite: check.suggested_rewrite
                }))}
                initialReadinessFlags={readinessFlags}
              />
            </section>

            <section className="employer-rail-section">
              <p className="employer-section-label">Review Checklist</p>
              <ul className="employer-guardrail-list">
                <li>Required fields are complete.</li>
                <li>Compensation and location are visible.</li>
                <li>Interview loop is defined.</li>
                <li>Human approval happens before publishing.</li>
              </ul>
            </section>

            <section className="employer-rail-section">
              <p className="employer-section-label">Publish Controls</p>
              {reviewGate.warningMessage ? (
                <p className="employer-message__body" data-testid="employer-job-review-warning">
                  {reviewGate.warningMessage}
                </p>
              ) : null}
              <div className="employer-composer__actions">
                <form action={submitEmployerJobForReviewAction}>
                  <input name="jobId" type="hidden" value={job.id} />
                  <button
                    className="employer-composer__button"
                    data-testid="employer-job-review-button"
                    disabled={!canSubmitForReview}
                    type="submit"
                  >
                    Mark Ready For Review
                  </button>
                </form>
                <form action={publishEmployerJobAction}>
                  <input name="jobId" type="hidden" value={job.id} />
                  <button
                    className="employer-composer__button"
                    data-testid="employer-job-publish-button"
                    disabled={!canPublish}
                    type="submit"
                  >
                    Publish Job
                  </button>
                </form>
              </div>
            </section>

            <section className="employer-rail-section">
              <p className="employer-section-label">Archive And Remove</p>
              <div className="employer-composer__actions">
                <form action={archiveEmployerJobAction}>
                  <input name="jobId" type="hidden" value={job.id} />
                  <button className="employer-composer__button employer-composer__button--secondary" disabled={!canArchive} type="submit">
                    Archive Job
                  </button>
                </form>
                <form action={removeEmployerJobAction}>
                  <input name="jobId" type="hidden" value={job.id} />
                  <button className="employer-composer__button employer-composer__button--secondary" type="submit">
                    Remove Job
                  </button>
                </form>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
