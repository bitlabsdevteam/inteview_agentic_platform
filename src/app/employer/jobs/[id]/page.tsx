import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AccountHeader, getAccountHeaderState } from "@/components/account-header";
import { EmployerInterviewBlueprintPanel } from "@/components/employer-interview-blueprint-panel";
import { EmployerJobAgentChat } from "@/components/employer-job-agent-chat";
import {
  archiveEmployerJobAction,
  publishEmployerJobAction,
  removeEmployerJobAction,
  saveEmployerInterviewBlueprintAction,
  saveEmployerJobDraftAction,
  submitEmployerJobForReviewAction
} from "@/app/employer/jobs/actions";
import {
  getAgentMemorySummaryBySession,
  toMemorySummaryRecord
} from "@/lib/agents/job-posting/memory";
import {
  deriveInterviewBlueprintCompletenessGaps,
  type InterviewBlueprintQuestion,
  type InterviewBlueprintStage
} from "@/lib/agents/job-posting/interview-blueprint";
import {
  getEmployerJobInterviewBlueprintByJob,
  listEmployerJobInterviewQuestionsByBlueprint
} from "@/lib/agents/job-posting/interview-blueprint-persistence";
import {
  buildJobPostingPipelineStages,
  type JobPostingPipelineStage,
  type JobPostingPipelineStageKey
} from "@/lib/agents/job-posting/job-pipeline";
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

type InterviewBlueprintSummary = {
  id: string | null;
  title: string;
  objective: string;
  responseMode: string | null;
  toneProfile: string | null;
  parsingStrategy: string | null;
  benchmarkSummary: string;
  questionCount: number;
  completenessGaps: string[];
  stages: InterviewBlueprintStage[];
};

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function dedupe(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function buildInterviewStages(
  questions: Array<{
    stage_label: string;
    stage_order: number;
    question_order: number;
    question_text: string;
    intent: string;
    evaluation_focus: string;
    strong_signal: string;
    failure_signal: string;
    follow_up_prompt: string;
  }>
) {
  const stages = new Map<number, InterviewBlueprintStage>();

  questions.forEach((question) => {
    const stage = stages.get(question.stage_order) ?? {
      stageLabel: question.stage_label,
      stageOrder: question.stage_order,
      questions: []
    };

    stage.questions.push({
      questionOrder: question.question_order,
      questionText: question.question_text,
      intent: question.intent,
      evaluationFocus: question.evaluation_focus,
      strongSignal: question.strong_signal,
      failureSignal: question.failure_signal,
      followUpPrompt: question.follow_up_prompt
    });

    stages.set(question.stage_order, stage);
  });

  return [...stages.values()]
    .sort((left, right) => left.stageOrder - right.stageOrder)
    .map((stage) => ({
      ...stage,
      questions: stage.questions.sort(
        (left: InterviewBlueprintQuestion, right: InterviewBlueprintQuestion) =>
          left.questionOrder - right.questionOrder
      )
    }));
}

function buildInterviewBlueprintSummary(input: {
  blueprintRecord: Awaited<ReturnType<typeof getEmployerJobInterviewBlueprintByJob>>;
  questions: Awaited<ReturnType<typeof listEmployerJobInterviewQuestionsByBlueprint>>;
}): InterviewBlueprintSummary {
  if (!input.blueprintRecord) {
    return {
      id: null,
      title: "Interview plan not started",
      objective: "Define the interview structure after the job posting is ready.",
      responseMode: null,
      toneProfile: null,
      parsingStrategy: null,
      benchmarkSummary: "",
      questionCount: 0,
      completenessGaps: [
        "Select response mode for the interview plan.",
        "Select parsing strategy for interview evaluation.",
        "Add at least one benchmark summary for evaluator guidance."
      ],
      stages: []
    };
  }

  const stages = buildInterviewStages(input.questions);
  const completenessGaps = dedupe([
    ...deriveInterviewBlueprintCompletenessGaps({
      status: input.blueprintRecord.status,
      title: input.blueprintRecord.title,
      objective: input.blueprintRecord.objective,
      responseMode: input.blueprintRecord.response_mode,
      toneProfile: input.blueprintRecord.tone_profile,
      parsingStrategy: input.blueprintRecord.parsing_strategy,
      benchmarkSummary: input.blueprintRecord.benchmark_summary,
      approvalNotes: input.blueprintRecord.approval_notes,
      stages
    }),
    ...(input.questions.length === 0
      ? ["Add at least one interview question to define the interview plan."]
      : [])
  ]);

  return {
    id: input.blueprintRecord.id,
    title: input.blueprintRecord.title,
    objective: input.blueprintRecord.objective,
    responseMode: input.blueprintRecord.response_mode,
    toneProfile: input.blueprintRecord.tone_profile,
    parsingStrategy: input.blueprintRecord.parsing_strategy,
    benchmarkSummary: input.blueprintRecord.benchmark_summary,
    questionCount: input.questions.length,
    completenessGaps,
    stages
  };
}

function buildDisplayPipelineStages(input: {
  jobStatus: string;
  stages: JobPostingPipelineStage[];
  activeStageKey: JobPostingPipelineStageKey;
}) {
  const prerequisiteBlockers = input.stages
    .filter((stage) => stage.key !== "review" && stage.state !== "complete")
    .flatMap((stage) => stage.blockers);
  const reviewBlockers = prerequisiteBlockers.length
    ? dedupe([
        "Review is blocked until job posting and interview design are complete.",
        ...prerequisiteBlockers
      ])
    : [];

  if (input.jobStatus !== "draft") {
    return {
      selectedStageKey: input.activeStageKey,
      stages: input.stages
    };
  }

  if (input.activeStageKey === "review" && reviewBlockers.length === 0) {
    return {
      selectedStageKey: "interview_structure" as const,
      stages: input.stages.map((stage) => {
        if (stage.key === "interview_structure") {
          return { ...stage, state: "current" as const };
        }

        if (stage.key === "review") {
          return { ...stage, state: "upcoming" as const };
        }

        return stage;
      })
    };
  }

  return {
    selectedStageKey: input.activeStageKey,
    stages: input.stages.map((stage) => {
      if (stage.key !== "review") {
        return stage;
      }

      return reviewBlockers.length > 0
        ? {
            ...stage,
            state: "blocked" as const,
            blockers: reviewBlockers
          }
        : stage;
    })
  };
}

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
  const [sessionMessages, memorySummary, roleProfileSummary, qualityChecks, interviewBlueprintRecord] = latestSession
    ? await Promise.all([
        listAgentJobMessagesBySession(supabase, data.user.id, latestSession.id),
        getAgentMemorySummaryBySession(supabase, data.user.id, job.id, latestSession.id),
        getEmployerJobRoleProfileBySession(supabase, data.user.id, job.id, latestSession.id),
        listEmployerJobQualityChecksBySession(supabase, data.user.id, job.id, latestSession.id),
        getEmployerJobInterviewBlueprintByJob(supabase, data.user.id, job.id)
      ])
    : [[], null, null, [], null];
  const interviewQuestions =
    interviewBlueprintRecord && latestSession
      ? await listEmployerJobInterviewQuestionsByBlueprint(
          supabase,
          data.user.id,
          job.id,
          interviewBlueprintRecord.id
        )
      : [];
  const memoryState = toMemorySummaryRecord(memorySummary);
  const currentQualityChecks = qualityChecks.slice(-QUALITY_CHECK_TYPES.length);
  const interviewBlueprintSummary = buildInterviewBlueprintSummary({
    blueprintRecord: interviewBlueprintRecord,
    questions: interviewQuestions
  });
  const pipelineSummary = buildJobPostingPipelineStages({
    jobStatus: job.status,
    hasRoleProfile: hasText(roleProfileSummary?.normalized_profile.title),
    qualityCheckStatuses: currentQualityChecks.map((check) => check.status),
    interviewBlueprint: interviewBlueprintSummary.id
      ? {
          hasBlueprint: true,
          completenessGaps: interviewBlueprintSummary.completenessGaps
        }
      : null
  });
  const pipelineDisplay = buildDisplayPipelineStages({
    jobStatus: job.status,
    stages: pipelineSummary.stages,
    activeStageKey: pipelineSummary.activeStageKey
  });
  const reviewGate = getEmployerJobReviewGate({
    status: job.status,
    qualityCheckStatuses: currentQualityChecks.map((check) => check.status),
    interviewBlueprintCompletenessGaps: interviewBlueprintSummary.completenessGaps
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

        <section className="employer-job-detail-pipeline" data-testid="employer-job-detail-pipeline">
          {pipelineDisplay.stages.map((stage) => (
            <article
              className={`employer-job-detail-pipeline__stage employer-job-detail-pipeline__stage--${stage.state}`}
              data-stage-key={stage.key}
              data-stage-state={stage.state}
              key={stage.key}
            >
              <p className="employer-section-label">Stage</p>
              <h2>{stage.label}</h2>
              <p className="employer-job-detail-pipeline__state">
                {stage.state === "current"
                  ? "In progress"
                  : stage.state === "complete"
                    ? "Complete"
                    : stage.state === "blocked"
                      ? "Blocked"
                      : "Upcoming"}
              </p>
              {stage.blockers.length > 0 ? (
                <ul className="employer-guardrail-list employer-job-detail-pipeline__blockers">
                  {stage.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              ) : (
                <p className="employer-job-detail-pipeline__hint">
                  {stage.key === "job_posting"
                    ? "Clarify role scope, constraints, and quality issues first."
                    : stage.key === "interview_structure"
                      ? "Configure questions, mode, tone, and evaluation strategy."
                      : "Submit only after both earlier stages are complete."}
                </p>
              )}
            </article>
          ))}
        </section>

        <section className="employer-job-detail">
          {pipelineDisplay.selectedStageKey === "job_posting" ? (
            <form
              action={saveEmployerJobDraftAction}
              className="employer-job-form"
              data-testid="employer-job-detail-form"
            >
              <input name="jobId" type="hidden" value={job.id} />
              <div className="employer-chat-panel__header">
                <div>
                  <p className="employer-section-label">Stage 1</p>
                  <h2>Build Job Posting</h2>
                </div>
                <span className="employer-chat-panel__status">
                  {currentQualityChecks.some((check) => check.status === "fail")
                    ? "Blocked"
                    : "Editable"}
                </span>
              </div>
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
                <textarea
                  className="employer-composer__input"
                  defaultValue={job.brief.hiringProblem}
                  name="hiringProblem"
                  required
                  rows={4}
                />
              </label>
              <label className="register-field">
                First outcomes
                <textarea
                  className="employer-composer__input"
                  defaultValue={job.brief.outcomes}
                  name="outcomes"
                  required
                  rows={4}
                />
              </label>
              <label className="register-field">
                Requirements
                <textarea
                  className="employer-composer__input"
                  defaultValue={job.brief.requirements}
                  name="requirements"
                  required
                  rows={4}
                />
              </label>
              <label className="register-field">
                Interview loop
                <textarea
                  className="employer-composer__input"
                  defaultValue={job.brief.interviewLoop}
                  name="interviewLoop"
                  required
                  rows={4}
                />
              </label>
              <label className="register-field">
                Generated job draft
                <textarea
                  className="employer-composer__input employer-job-form__draft"
                  defaultValue={job.draft_description}
                  readOnly
                  rows={12}
                />
              </label>
              <div className="employer-composer__actions">
                <button
                  className="employer-composer__button employer-composer__button--secondary"
                  type="submit"
                >
                  Save Draft
                </button>
              </div>
            </form>
          ) : pipelineDisplay.selectedStageKey === "interview_structure" ? (
            <div
              data-testid="employer-job-stage-panel-interview_structure"
            >
              <EmployerInterviewBlueprintPanel
                action={saveEmployerInterviewBlueprintAction}
                blueprint={{
                  title: interviewBlueprintSummary.title,
                  objective: interviewBlueprintSummary.objective,
                  responseMode: interviewBlueprintSummary.responseMode as InterviewBlueprintSummary["responseMode"],
                  toneProfile: interviewBlueprintSummary.toneProfile as InterviewBlueprintSummary["toneProfile"],
                  parsingStrategy: interviewBlueprintSummary.parsingStrategy as InterviewBlueprintSummary["parsingStrategy"],
                  benchmarkSummary: interviewBlueprintSummary.benchmarkSummary,
                  approvalNotes: interviewBlueprintRecord?.approval_notes ?? "",
                  stages: interviewBlueprintSummary.stages
                }}
                completenessGaps={interviewBlueprintSummary.completenessGaps}
                jobId={job.id}
                stageState={
                  pipelineDisplay.stages.find((stage) => stage.key === "interview_structure")?.state ??
                  "current"
                }
              />
            </div>
          ) : (
            <section
              className="employer-jobs-panel employer-job-stage-panel"
              data-testid="employer-job-stage-panel-review"
            >
              <div className="employer-chat-panel__header">
                <div>
                  <p className="employer-section-label">Stage 3</p>
                  <h2>Review And Approve</h2>
                </div>
                <span className="employer-chat-panel__status">
                  {canSubmitForReview ? "Ready" : "Blocked"}
                </span>
              </div>
              <p className="employer-summary">
                Confirm that the job posting and interview structure are aligned before submitting
                for review.
              </p>
              <article className="employer-job-stage-panel__card">
                <p className="employer-section-label">Review Gate</p>
                <p>
                  {reviewGate.warningMessage ??
                    "No blocking warnings remain. Submit for review when the employer is ready."}
                </p>
              </article>
            </section>
          )}

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
