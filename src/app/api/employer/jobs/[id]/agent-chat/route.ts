import { NextResponse } from "next/server";

import { createJobPostingE2EStubInferenceResult, isJobPostingE2EStubMode } from "@/lib/agents/job-posting/e2e-stub";
import { buildJobPostingPipelineStages } from "@/lib/agents/job-posting/job-pipeline";
import { reviseEmployerJobDraftFromChatTurn } from "@/lib/agents/job-posting/follow-up";
import { getOpenAIClientConfig } from "@/lib/agents/job-posting/openai-client";
import { createStaticJobCreatorPromptVersion } from "@/lib/agents/job-posting/prompts";
import { parseAccountRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ChatPayload = {
  message?: unknown;
  sessionId?: unknown;
};

function readMessage(payload: ChatPayload) {
  const value = typeof payload.message === "string" ? payload.message.trim() : "";

  if (!value) {
    throw new Error("Chat message is required.");
  }

  return value;
}

function readSessionId(payload: ChatPayload) {
  const value = typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
  return value.length > 0 ? value : undefined;
}

function sanitizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    if (error.message.includes("required")) {
      return error.message;
    }
  }

  return "Unable to revise this job draft right now. Please try again.";
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildDefaultInterviewBlueprintSummary() {
  return {
    id: null,
    status: "draft" as const,
    responseMode: null,
    toneProfile: null,
    parsingStrategy: null,
    benchmarkSummary: "",
    questionCount: 0,
    completenessGaps: [
      "Select response mode for the interview plan.",
      "Select parsing strategy for interview evaluation.",
      "Add at least one benchmark summary for evaluator guidance."
    ]
  };
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const role = parseAccountRole(data.user?.user_metadata?.role);

  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (role !== "employer") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id: jobId } = await context.params;
  if (!jobId?.trim()) {
    return NextResponse.json({ error: "Job id is required." }, { status: 400 });
  }

  let payload: ChatPayload;
  try {
    payload = (await request.json()) as ChatPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    const message = readMessage(payload);
    const promptVersion = createStaticJobCreatorPromptVersion();
    const isE2EStub = isJobPostingE2EStubMode();
    const result = await reviseEmployerJobDraftFromChatTurn({
      client: supabase,
      employerUserId: data.user.id,
      employerJobId: jobId.trim(),
      message,
      sessionId: readSessionId(payload),
      config: isE2EStub
        ? {
            apiKey: "e2e-stub",
            model: "gpt-5.5-e2e-stub",
            baseUrl: "https://stub.local/v1"
          }
        : getOpenAIClientConfig(),
      promptVersion,
      runInference: isE2EStub
        ? async (input) => createJobPostingE2EStubInferenceResult(input)
        : undefined
    });
    const qualityChecks = Array.isArray(result.qualityChecks) ? result.qualityChecks : [];
    const readinessFlags = result.readinessFlags ?? {
      blocksReview: qualityChecks.some((check) => check.status === "fail"),
      requiresEmployerFix: qualityChecks.some((check) => check.status !== "pass")
    };
    const interviewBlueprintSummary =
      result.interviewBlueprintSummary ?? buildDefaultInterviewBlueprintSummary();
    const fallbackStageSummary = buildJobPostingPipelineStages({
      jobStatus: result.job.status,
      hasRoleProfile: hasText(result.roleProfileSummary?.title),
      qualityCheckStatuses: qualityChecks.map((check) => check.status),
      interviewBlueprint: interviewBlueprintSummary.id
        ? {
            hasBlueprint: true,
            completenessGaps: interviewBlueprintSummary.completenessGaps
          }
        : null
    });
    const stageSummary = result.stageSummary ?? fallbackStageSummary;
    const activeStage = result.activeStage ?? stageSummary.activeStageKey;

    return NextResponse.json({
      session: {
        id: result.session.id,
        status: result.session.status,
        assumptions: result.session.assumptions,
        missingCriticalFields: result.session.missing_critical_fields,
        followUpQuestions: result.session.follow_up_questions,
        updatedAt: result.session.updated_at
      },
      job: {
        id: result.job.id,
        draftDescription: result.job.draft_description,
        status: result.job.status,
        updatedAt: result.job.updated_at
      },
      memory: {
        summary: result.memory.summary
          ? {
              summaryText: result.memory.summary.summary_text,
              unresolvedGaps: result.memory.summary.unresolved_gaps,
              keyDecisions: result.memory.summary.key_decisions,
              compactedMessageCount: result.memory.summary.compacted_message_count,
              updatedAt: result.memory.summary.updated_at
            }
          : null,
        compacted: result.memory.compacted
      },
      roleProfileSummary: result.roleProfileSummary ?? null,
      qualityChecks,
      readinessFlags,
      activeStage,
      stageSummary,
      interviewBlueprintSummary,
      messages: result.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.created_at
      }))
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: sanitizeErrorMessage(error)
      },
      { status: 500 }
    );
  }
}
