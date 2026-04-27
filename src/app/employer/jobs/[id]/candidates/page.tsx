import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AccountHeader, getAccountHeaderState } from "@/components/account-header";
import { createEmployerCandidateIntakeAction } from "@/app/employer/jobs/actions";
import { enforceRouteAccess } from "@/lib/auth/enforce-route-access";
import { getEmployerJob } from "@/lib/employer/jobs";
import {
  listCandidateIntakeRecordsByJob,
  listCandidateProfilesByJob,
  type CandidateIntakeStatus,
  type CandidateProfileListSort
} from "@/lib/agents/candidate-intake/persistence";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EmployerJobCandidatesPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return undefined;
}

export default async function EmployerJobCandidatesPage({
  params,
  searchParams
}: EmployerJobCandidatesPageProps) {
  await enforceRouteAccess("/employer/jobs");
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const selectedStatus = readSearchParam(query.status);
  const selectedSkill = readSearchParam(query.skill);
  const selectedSort = readSearchParam(query.sortBy);
  const selectedMinConfidence = readSearchParam(query.minConfidence);
  const parsedMinConfidence = selectedMinConfidence ? Number(selectedMinConfidence) : null;

  const statusFilter: CandidateIntakeStatus[] | undefined =
    selectedStatus &&
    ["received", "processing", "profile_ready", "failed"].includes(selectedStatus)
      ? [selectedStatus as CandidateIntakeStatus]
      : undefined;

  const sortBy: CandidateProfileListSort =
    selectedSort &&
    [
      "aggregate_score_desc",
      "aggregate_score_asc",
      "created_at_desc",
      "created_at_asc"
    ].includes(selectedSort)
      ? (selectedSort as CandidateProfileListSort)
      : "aggregate_score_desc";

  const minimumOverallConfidence =
    typeof parsedMinConfidence === "number" && Number.isFinite(parsedMinConfidence)
      ? Math.max(0, Math.min(1, parsedMinConfidence))
      : undefined;

  const [accountHeaderState, job, candidates, profiles] = await Promise.all([
    getAccountHeaderState(),
    getEmployerJob(supabase, data.user.id, id),
    listCandidateIntakeRecordsByJob(supabase, data.user.id, id, {
      statuses: statusFilter
    }),
    listCandidateProfilesByJob(supabase, data.user.id, id, {
      skill: selectedSkill,
      minimumOverallConfidence,
      sortBy
    })
  ]);

  if (!job) {
    notFound();
  }

  return (
    <main className="app-page employer-page">
      <div className="product-shell employer-shell">
        <AccountHeader state={accountHeaderState} />

        <section className="employer-jobs-hero">
          <div>
            <p className="employer-section-label">Candidate Intake</p>
            <h1>{job.title}</h1>
            <p className="employer-summary">
              Add candidate details for this role, run structured extraction, and review confidence
              scores before downstream screening.
            </p>
          </div>
          <Link className="employer-composer__button employer-composer__button--secondary" href={`/employer/jobs/${job.id}`}>
            Back to Job
          </Link>
        </section>

        <section className="employer-job-detail">
          <form
            action={createEmployerCandidateIntakeAction}
            className="employer-job-form"
            data-testid="employer-candidate-intake-form"
          >
            <input name="jobId" type="hidden" value={job.id} />
            <div className="employer-job-form__grid">
              <label className="register-field">
                Candidate name
                <input name="candidateFullName" required />
              </label>
              <label className="register-field">
                Candidate email
                <input name="candidateEmail" type="email" />
              </label>
              <label className="register-field">
                Candidate phone
                <input name="candidatePhone" />
              </label>
              <label className="register-field">
                Resume file name
                <input name="resumeFileName" required />
              </label>
              <label className="register-field">
                Resume MIME type
                <input defaultValue="application/pdf" name="resumeMimeType" required />
              </label>
              <label className="register-field">
                Resume size bytes
                <input defaultValue="1" min={1} name="resumeFileSizeBytes" required type="number" />
              </label>
            </div>

            <label className="register-field">
              Resume/source text
              <textarea className="employer-composer__input" name="candidateSourceText" required rows={6} />
            </label>

            <div className="employer-composer__actions">
              <button className="employer-composer__button" type="submit">
                Add Candidate
              </button>
            </div>
          </form>

          <aside className="employer-rail">
            <section className="employer-rail-section employer-jobs-panel" data-testid="employer-candidates-list">
              <div className="employer-chat-panel__header">
                <div>
                  <p className="employer-section-label">Candidates</p>
                  <h2>Job candidate records</h2>
                </div>
                <span className="employer-chat-panel__status">{profiles.length} scored</span>
              </div>

              <form className="employer-candidate-filters" data-testid="employer-candidate-filters" method="get">
                <label className="register-field">
                  Status
                  <select defaultValue={selectedStatus ?? ""} name="status">
                    <option value="">All</option>
                    <option value="received">received</option>
                    <option value="processing">processing</option>
                    <option value="profile_ready">profile_ready</option>
                    <option value="failed">failed</option>
                  </select>
                </label>
                <label className="register-field">
                  Skill
                  <input defaultValue={selectedSkill ?? ""} name="skill" placeholder="TypeScript" />
                </label>
                <label className="register-field">
                  Min confidence
                  <input
                    defaultValue={minimumOverallConfidence?.toString() ?? ""}
                    max={1}
                    min={0}
                    name="minConfidence"
                    placeholder="0.8"
                    step="0.01"
                    type="number"
                  />
                </label>
                <label className="register-field">
                  Sort
                  <select defaultValue={sortBy} name="sortBy">
                    <option value="aggregate_score_desc">Score high to low</option>
                    <option value="aggregate_score_asc">Score low to high</option>
                    <option value="created_at_desc">Newest first</option>
                    <option value="created_at_asc">Oldest first</option>
                  </select>
                </label>
                <div className="employer-composer__actions">
                  <button className="employer-composer__button employer-composer__button--secondary" type="submit">
                    Apply
                  </button>
                </div>
              </form>

              {profiles.length ? (
                <div className="employer-job-list">
                  {profiles.map((profile) => (
                    <article className="employer-job-row" key={profile.id}>
                      <div>
                        <p className="employer-section-label">
                          {profile.score_version ?? "unscored"}
                        </p>
                        <h3>{profile.summary}</h3>
                        <p>
                          Score {(profile.aggregate_score ?? 0).toFixed(2)} · Overall confidence{" "}
                          {profile.confidence.overall.toFixed(2)}
                        </p>
                      </div>
                      <div className="employer-job-row__meta">
                        <span>Added {new Date(profile.created_at).toLocaleDateString("en-US")}</span>
                        <Link
                          className="employer-composer__button employer-composer__button--secondary"
                          href={`/employer/jobs/${job.id}/candidates/${profile.id}`}
                        >
                          Review Profile
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="employer-empty-state">
                  <strong>No scored candidates yet.</strong>
                  <p>
                    {candidates.length
                      ? "Adjust filters or complete scoring to populate this workspace."
                      : "Submit the first candidate intake record to generate a structured profile."}
                  </p>
                </div>
              )}
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
