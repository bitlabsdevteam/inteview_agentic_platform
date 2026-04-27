import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AccountHeader, getAccountHeaderState } from "@/components/account-header";
import { askEmployerAssistantForNextStepAction } from "@/app/employer/jobs/actions";
import { enforceRouteAccess } from "@/lib/auth/enforce-route-access";
import { getEmployerJob } from "@/lib/employer/jobs";
import { getCandidateProfileById } from "@/lib/agents/candidate-intake/persistence";
import {
  getEmployerAssistantScreeningKitByRecommendation,
  getLatestEmployerAssistantRecommendationByCandidate,
  listEmployerAssistantScreeningQuestionsByKit
} from "@/lib/agents/employer-assistant/persistence";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EmployerCandidateProfilePageProps = {
  params: Promise<{
    id: string;
    candidateId: string;
  }>;
};

export default async function EmployerCandidateProfilePage({
  params
}: EmployerCandidateProfilePageProps) {
  await enforceRouteAccess("/employer/jobs");
  const { id, candidateId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const [accountHeaderState, job, profile] = await Promise.all([
    getAccountHeaderState(),
    getEmployerJob(supabase, data.user.id, id),
    getCandidateProfileById(supabase, data.user.id, id, candidateId)
  ]);

  if (!job || !profile) {
    notFound();
  }

  const recommendation = await getLatestEmployerAssistantRecommendationByCandidate(
    supabase,
    data.user.id,
    job.id,
    profile.id
  );

  const screeningKit = recommendation
    ? await getEmployerAssistantScreeningKitByRecommendation(
        supabase,
        data.user.id,
        job.id,
        profile.id,
        recommendation.id
      )
    : null;

  const screeningQuestions = screeningKit
    ? await listEmployerAssistantScreeningQuestionsByKit(
        supabase,
        data.user.id,
        job.id,
        profile.id,
        screeningKit.id
      )
    : [];

  return (
    <main className="app-page employer-page">
      <div className="product-shell employer-shell">
        <AccountHeader state={accountHeaderState} />

        <section className="employer-jobs-hero">
          <div>
            <p className="employer-section-label">Candidate Profile</p>
            <h1>{job.title}</h1>
            <p className="employer-summary">
              Structured extraction output and confidence values for review before candidate
              progression decisions.
            </p>
          </div>
          <Link className="employer-composer__button employer-composer__button--secondary" href={`/employer/jobs/${job.id}/candidates`}>
            Back to Candidates
          </Link>
        </section>

        <section className="employer-job-detail" data-testid="employer-candidate-profile">
          <section className="employer-jobs-panel employer-candidate-profile-panel">
            <p className="employer-section-label">Summary</p>
            <p>{profile.summary}</p>

            <p className="employer-section-label">Skills</p>
            <ul>
              {profile.skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>

            <p className="employer-section-label">Work Experience</p>
            <ul>
              {profile.work_experience.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <p className="employer-section-label">Education</p>
            <ul>
              {profile.education.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <aside className="employer-rail">
            <section className="employer-rail-section employer-jobs-panel employer-candidate-confidence">
              <p className="employer-section-label">Confidence Fields</p>
              <ul>
                {Object.entries(profile.confidence).map(([key, value]) => (
                  <li key={key}>
                    <span>{`confidence.${key}`}</span>
                    <strong>{value.toFixed(2)}</strong>
                  </li>
                ))}
              </ul>
            </section>

            <section className="employer-rail-section employer-jobs-panel">
              <p className="employer-section-label">Extraction Audit</p>
              <ul>
                <li>Model: {profile.model_id ?? "unknown"}</li>
                <li>Response id: hidden</li>
                <li>Prompt checksum: hidden</li>
              </ul>
            </section>

            <section className="employer-rail-section employer-jobs-panel employer-assistant-panel" data-testid="employer-assistant-panel">
              <p className="employer-section-label">Assistant Recommendation</p>

              <form action={askEmployerAssistantForNextStepAction}>
                <input name="jobId" type="hidden" value={job.id} />
                <input name="candidateId" type="hidden" value={profile.id} />
                <button className="employer-composer__button employer-composer__button--secondary" type="submit">
                  Ask Assistant for Next Step
                </button>
              </form>

              {recommendation ? (
                <div className="employer-assistant-panel__content">
                  <p className="employer-assistant-panel__action">
                    <strong>Recommended action:</strong> {recommendation.action}
                  </p>
                  <p>{recommendation.rationale}</p>

                  <div>
                    <p className="employer-section-label">Evidence References</p>
                    <ul>
                      {recommendation.evidence_references.map((reference) => (
                        <li key={`${reference.sourceType}:${reference.referenceId}`}>
                          <strong>{reference.sourceType}</strong>: {reference.quote}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="employer-section-label">Risk Flags</p>
                    <ul>
                      {recommendation.risk_flags.map((flag) => (
                        <li key={flag.code}>
                          <strong>{flag.code}</strong> ({flag.severity}) - {flag.message}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {screeningKit ? (
                    <div>
                      <p className="employer-section-label">Screening Kit</p>
                      <p>
                        <strong>{screeningKit.title}</strong>
                      </p>
                      <p>{screeningKit.objective}</p>
                      <ul>
                        {screeningQuestions.map((question) => (
                          <li key={question.id}>
                            <strong>{question.question_text}</strong> - {question.rubric_guidance}
                            {question.is_uncertainty_probe ? " (uncertainty probe)" : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p>
                  No assistant recommendation yet. Ask the assistant to generate a recruiting next
                  step for this candidate.
                </p>
              )}
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
