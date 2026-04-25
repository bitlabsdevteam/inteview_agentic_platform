import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountHeader, getAccountHeaderState } from "@/components/account-header";
import { enforceRouteAccess } from "@/lib/auth/enforce-route-access";
import { getEmployerJobPrimaryAction, formatEmployerJobStatus, listEmployerJobs } from "@/lib/employer/jobs";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EmployerJobsPage() {
  await enforceRouteAccess("/employer/jobs");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const [accountHeaderState, jobs] = await Promise.all([
    getAccountHeaderState(),
    listEmployerJobs(supabase, data.user.id)
  ]);

  return (
    <main className="app-page employer-page">
      <div className="product-shell employer-shell">
        <AccountHeader state={accountHeaderState} />

        <section className="employer-jobs-hero">
          <div>
            <p className="employer-section-label">Employer Jobs</p>
            <h1>Job creation pipeline</h1>
            <p className="employer-summary">
              Create job drafts with the employer agent, review the role package, and publish only
              after the non-negotiables are complete.
            </p>
          </div>
          <Link className="employer-composer__button employer-link-button" href="/employer/jobs/new">
            Create Job
          </Link>
        </section>

        <section className="employer-jobs-panel" data-testid="employer-jobs-list">
          <div className="employer-chat-panel__header">
            <div>
              <p className="employer-section-label">Job List</p>
              <h2>Open roles</h2>
            </div>
            <span className="employer-chat-panel__status">{jobs.length} total</span>
          </div>

          {jobs.length ? (
            <div className="employer-job-list">
              {jobs.map((job) => {
                const primaryAction = getEmployerJobPrimaryAction(job.status);

                return (
                  <article className="employer-job-row" data-testid="employer-job-row" key={job.id}>
                    <div>
                      <p className="employer-section-label">{formatEmployerJobStatus(job.status)}</p>
                      <h3>{job.title}</h3>
                      <p>
                        {job.department} · {job.level} · {job.location}
                      </p>
                    </div>
                    <div className="employer-job-row__meta">
                      <span>Updated {new Date(job.updated_at).toLocaleDateString("en-US")}</span>
                      <Link
                        className="employer-composer__button employer-composer__button--secondary"
                        data-testid={`employer-job-action-${primaryAction.intent}`}
                        href={`/employer/jobs/${job.id}`}
                      >
                        {primaryAction.label}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="employer-empty-state">
              <strong>No jobs yet.</strong>
              <p>Create the first job draft before publishing anything to candidates.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
