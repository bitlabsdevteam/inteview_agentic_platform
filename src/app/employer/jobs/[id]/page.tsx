import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  archiveEmployerJobAction,
  publishEmployerJobAction,
  removeEmployerJobAction,
  submitEmployerJobForReviewAction
} from "@/app/employer/jobs/actions";
import {
  deriveInterviewBlueprintCompletenessGaps,
  type InterviewBlueprintParsingStrategy,
  type InterviewBlueprintQuestion,
  type InterviewBlueprintResponseMode,
  type InterviewBlueprintStage,
  type InterviewBlueprintToneProfile
} from "@/lib/agents/job-posting/interview-blueprint";
import {
  getEmployerJobInterviewBlueprintByJob,
  listEmployerJobInterviewQuestionsByBlueprint
} from "@/lib/agents/job-posting/interview-blueprint-persistence";
import {
  buildEmployerJobReadonlyWorkspace
} from "@/lib/employer/job-readonly-workspace";
import { enforceRouteAccess } from "@/lib/auth/enforce-route-access";
import { getEmployerJobAssistantState } from "@/lib/employer/job-assistant-state";
import {
  getEmployerJob,
  getEmployerJobReviewGate
} from "@/lib/employer/jobs";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EmployerJobDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type InterviewBlueprintSummary = {
  id: string | null;
  title: string;
  objective: string;
  responseMode: InterviewBlueprintResponseMode | null;
  toneProfile: InterviewBlueprintToneProfile | null;
  parsingStrategy: InterviewBlueprintParsingStrategy | null;
  benchmarkSummary: string;
  questionCount: number;
  completenessGaps: string[];
  stages: InterviewBlueprintStage[];
};

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

export default async function EmployerJobDetailPage({
  params
}: EmployerJobDetailPageProps) {
  await enforceRouteAccess("/employer/jobs");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const job = await getEmployerJob(supabase, data.user.id, id);

  if (!job) {
    notFound();
  }

  const [assistantState, interviewBlueprintRecord] = await Promise.all([
    getEmployerJobAssistantState(supabase, data.user.id, job.id),
    getEmployerJobInterviewBlueprintByJob(supabase, data.user.id, job.id)
  ]);
  const interviewQuestions = interviewBlueprintRecord
    ? await listEmployerJobInterviewQuestionsByBlueprint(
        supabase,
        data.user.id,
        job.id,
        interviewBlueprintRecord.id
      )
    : [];
  const interviewBlueprintSummary = buildInterviewBlueprintSummary({
    blueprintRecord: interviewBlueprintRecord,
    questions: interviewQuestions
  });
  const reviewGate = getEmployerJobReviewGate({
    status: job.status,
    qualityCheckStatuses: assistantState.qualityChecks.map((check) => check.status),
    interviewBlueprintCompletenessGaps: interviewBlueprintSummary.completenessGaps
  });
  const canSubmitForReview = reviewGate.canSubmitForReview;
  const canPublish = job.status === "needs_review";
  const canArchive = job.status !== "archived";
  const workspace = buildEmployerJobReadonlyWorkspace({
    job,
    assistantState,
    interviewBlueprintSummary,
    reviewWarningMessage: reviewGate.warningMessage
  });

  return (
    <>
      <section className="employer-jobs-hero">
        <div>
          <p className="employer-section-label">{workspace.header.statusLabel}</p>
          <h1>{workspace.header.title}</h1>
          <p className="employer-summary">{workspace.header.summary}</p>
        </div>
        <Link
          className="employer-composer__button employer-composer__button--secondary"
          href="/employer/jobs"
        >
          Back to Jobs
        </Link>
      </section>

      <section className="employer-job-detail">
        <div className="employer-job-detail__main">
          <section
            className="employer-jobs-panel employer-job-readonly-workspace"
            data-testid="employer-job-readonly-workspace"
          >
            <div className="employer-chat-panel__header">
              <div>
                <p className="employer-section-label">Created Artifact</p>
                <h2>Read-Only Generated Artifact</h2>
              </div>
              <span className="employer-chat-panel__status">
                {assistantState.readinessFlags.blocksReview ? "Needs Revision" : "Review Ready"}
              </span>
            </div>
            <div className="employer-job-readonly-workspace__sections">
              {workspace.sections.map((section) => (
                <article
                  className="employer-job-stage-panel__card"
                  data-section-key={section.key}
                  key={section.key}
                >
                  <p className="employer-section-label">{section.label}</p>
                  <p className="employer-summary">{section.body}</p>
                  {section.items.length > 0 ? (
                    <dl className="employer-job-chat__kv">
                      {section.items.map((item) => (
                        <div key={`${section.key}-${item.label}`}>
                          <dt>{item.label}</dt>
                          <dd>{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {section.bullets.length > 0 ? (
                    <ul className="employer-guardrail-list">
                      {section.bullets.map((bullet) => (
                        <li key={`${section.key}-${bullet}`}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="employer-job-detail__supporting">
            <article className="employer-job-stage-panel__card">
              <div className="employer-chat-panel__header">
                <div>
                  <p className="employer-section-label">Employer Controls</p>
                  <h2>Review And Publish</h2>
                </div>
                <span className="employer-chat-panel__status">
                  {canSubmitForReview ? "Ready" : "Blocked"}
                </span>
              </div>
              <p className="employer-summary">
                High-impact actions stay approval-gated even though revisions now happen through the
                assistant.
              </p>
              <p className="employer-section-label">Review Checklist</p>
              <ul className="employer-guardrail-list">
                <li>Required fields are complete.</li>
                <li>Compensation and location are visible.</li>
                <li>Interview loop is defined.</li>
                <li>Human approval happens before publishing.</li>
              </ul>
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
            </article>
            <article className="employer-job-stage-panel__card">
              <p className="employer-section-label">Archive And Remove</p>
              <div className="employer-composer__actions">
                <form action={archiveEmployerJobAction}>
                  <input name="jobId" type="hidden" value={job.id} />
                  <button
                    className="employer-composer__button employer-composer__button--secondary"
                    disabled={!canArchive}
                    type="submit"
                  >
                    Archive Job
                  </button>
                </form>
                <form action={removeEmployerJobAction}>
                  <input name="jobId" type="hidden" value={job.id} />
                  <button
                    className="employer-composer__button employer-composer__button--secondary"
                    type="submit"
                  >
                    Remove Job
                  </button>
                </form>
              </div>
            </article>
          </section>
        </div>
      </section>
    </>
  );
}
