"use server";

import { notFound, redirect } from "next/navigation";

import {
  createPromptFirstEmployerJobDraft,
  getEmployerPromptFromFormData
} from "@/lib/agents/job-posting/create-draft";
import {
  extractCandidateExtractionFailureReason,
  isCandidateExtractionValidationFailure,
  runCandidateExtraction
} from "@/lib/agents/candidate-intake/extraction";
import { createCandidateExtractionMetricsRecord } from "@/lib/agents/candidate-intake/metrics";
import {
  createCandidateProfile,
  createCandidateIntakeRecord,
  getCandidateProfileById
} from "@/lib/agents/candidate-intake/persistence";
import { createStaticCandidateExtractionPromptVersion } from "@/lib/agents/candidate-intake/prompts";
import { validateCandidateIntakePayload } from "@/lib/agents/candidate-intake/schema";
import { prepareCandidateResumeUpload } from "@/lib/agents/candidate-intake/storage";
import {
  createEmployerAssistantRecommendation,
  createEmployerAssistantScreeningKit,
  createEmployerAssistantScreeningQuestion
} from "@/lib/agents/employer-assistant/persistence";
import { createStaticEmployerAssistantPromptVersion } from "@/lib/agents/employer-assistant/prompts";
import { runEmployerAssistantOrchestration } from "@/lib/agents/employer-assistant/orchestrator";
import {
  getFollowUpAnswerFromFormData,
  getFollowUpSessionIdFromFormData,
  reviseEmployerJobDraftFromFollowUp
} from "@/lib/agents/job-posting/follow-up";
import { getOpenAIClientConfig } from "@/lib/agents/job-posting/openai-client";
import { createStaticJobCreatorPromptVersion } from "@/lib/agents/job-posting/prompts";
import { parseAccountRole } from "@/lib/auth/roles";
import {
  createEmployerJobDraft,
  getEmployerJob,
  getEmployerJobInputFromFormData,
  removeEmployerJob,
  transitionEmployerJobStatus,
  updateEmployerJobDraft,
  validateEmployerJobInput
} from "@/lib/employer/jobs";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getEmployerContext() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const role = parseAccountRole(data.user?.user_metadata?.role);

  if (!data.user) {
    redirect("/login");
  }

  if (role !== "employer") {
    redirect(role === "job_seeker" ? "/job-seeker" : "/auth/complete-role?intent=login");
  }

  return {
    supabase,
    userId: data.user.id
  };
}

function requireValidJobInput(formData: FormData) {
  const input = getEmployerJobInputFromFormData(formData);
  const missingFields = validateEmployerJobInput(input);

  if (missingFields.length) {
    throw new Error(`Missing required job fields: ${missingFields.join(", ")}`);
  }

  return input;
}

function readRequiredField(formData: FormData, key: string, label: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function readOptionalField(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readResumeFileSizeBytes(formData: FormData) {
  const raw = readRequiredField(formData, "resumeFileSizeBytes", "Resume file size");
  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    throw new Error("Resume file size must be a valid number.");
  }

  return parsed;
}

function parseMultilineText(value: string | undefined) {
  if (!value) {
    return [];
  }

  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length > 0) {
    return lines;
  }

  const trimmed = value.trim();
  return trimmed ? [trimmed] : [];
}

function parseMissingSignals(value: unknown) {
  if (!value || typeof value !== "object" || !("missingSignals" in value)) {
    return [];
  }

  const raw = (value as { missingSignals?: unknown }).missingSignals;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export async function createEmployerJobAction(formData: FormData) {
  const { supabase, userId } = await getEmployerContext();
  const job = await createEmployerJobDraft(supabase, userId, requireValidJobInput(formData));

  redirect(`/employer/jobs/${job.id}`);
}

export async function createEmployerJobWithAgentAction(formData: FormData) {
  const { supabase, userId } = await getEmployerContext();
  const result = await createPromptFirstEmployerJobDraft({
    client: supabase,
    employerUserId: userId,
    employerPrompt: getEmployerPromptFromFormData(formData),
    config: getOpenAIClientConfig(),
    promptVersion: createStaticJobCreatorPromptVersion()
  });

  redirect(`/employer/jobs/${result.job.id}`);
}

export async function reviseEmployerJobWithAgentFollowUpAction(formData: FormData) {
  const { supabase, userId } = await getEmployerContext();
  const result = await reviseEmployerJobDraftFromFollowUp({
    client: supabase,
    employerUserId: userId,
    sessionId: getFollowUpSessionIdFromFormData(formData),
    answer: getFollowUpAnswerFromFormData(formData),
    config: getOpenAIClientConfig(),
    promptVersion: createStaticJobCreatorPromptVersion()
  });

  redirect(`/employer/jobs/${result.job.id}`);
}

export async function createEmployerCandidateIntakeAction(formData: FormData) {
  const { supabase, userId } = await getEmployerContext();
  const jobId = formData.get("jobId");

  if (typeof jobId !== "string" || !jobId.trim()) {
    notFound();
  }

  const job = await getEmployerJob(supabase, userId, jobId.trim());

  if (!job) {
    notFound();
  }

  const fullName = readRequiredField(formData, "candidateFullName", "Candidate name");
  const email = readOptionalField(formData, "candidateEmail");
  const phone = readOptionalField(formData, "candidatePhone");
  const sourceText = readOptionalField(formData, "candidateSourceText");
  const fileName = readRequiredField(formData, "resumeFileName", "Resume file name");
  const mimeType = readRequiredField(formData, "resumeMimeType", "Resume MIME type");
  const fileSizeBytes = readResumeFileSizeBytes(formData);

  const uploadPlan = prepareCandidateResumeUpload({
    actingUserId: userId,
    employerUserId: userId,
    employerJobId: job.id,
    candidateFullName: fullName,
    fileName,
    mimeType,
    fileSizeBytes
  });

  if (!uploadPlan.ok) {
    throw new Error(uploadPlan.errors.join("; "));
  }

  const intakePayload = {
    employerUserId: userId,
    employerJobId: job.id,
    fullName,
    email,
    phone,
    resume: {
      storagePath: uploadPlan.data.storagePath,
      fileName: uploadPlan.data.normalizedFileName,
      mimeType: uploadPlan.data.mimeType,
      fileSizeBytes: uploadPlan.data.fileSizeBytes
    },
    sourceText
  };

  const intakeValidation = validateCandidateIntakePayload(intakePayload);
  if (!intakeValidation.ok) {
    throw new Error(intakeValidation.errors.join("; "));
  }

  const intakeRecord = await createCandidateIntakeRecord(supabase, {
    ...intakeValidation.data,
    status: "processing"
  });

  const maxExtractionAttempts = 2;
  let attemptCount = 0;
  let validationFailureCount = 0;
  let normalizationRepairCount = 0;
  let extraction:
    | Awaited<ReturnType<typeof runCandidateExtraction>>
    | undefined;
  let lastExtractionError: unknown;

  while (attemptCount < maxExtractionAttempts) {
    attemptCount += 1;

    try {
      extraction = await runCandidateExtraction({
        config: getOpenAIClientConfig(),
        intake: intakeValidation.data,
        promptVersion: createStaticCandidateExtractionPromptVersion()
      });
      break;
    } catch (error) {
      lastExtractionError = error;
      if (attemptCount < maxExtractionAttempts) {
        normalizationRepairCount += 1;
      }
      if (isCandidateExtractionValidationFailure(error)) {
        validationFailureCount += 1;
      }
    }
  }

  if (!extraction) {
    const failureReason = extractCandidateExtractionFailureReason(lastExtractionError);

    await createCandidateExtractionMetricsRecord(supabase, {
      employerUserId: userId,
      employerJobId: job.id,
      candidateIntakeId: intakeRecord.id,
      validationFailureCount,
      normalizationRepairCount,
      extractionSucceeded: false,
      failureReason,
      metadata: {
        attemptCount
      }
    });

    throw new Error(
      `Candidate extraction failed after ${maxExtractionAttempts} attempts: ${failureReason}`
    );
  }

  const profile = await createCandidateProfile(supabase, {
    candidateIntakeId: intakeRecord.id,
    employerUserId: userId,
    employerJobId: job.id,
    profile: extraction.profile,
    audit: {
      modelId: extraction.metadata.model,
      providerResponseId: extraction.metadata.providerResponseId,
      promptChecksum: extraction.metadata.prompt.checksum
    }
  });

  await createCandidateExtractionMetricsRecord(supabase, {
    employerUserId: userId,
    employerJobId: job.id,
    candidateIntakeId: intakeRecord.id,
    validationFailureCount,
    normalizationRepairCount,
    extractionSucceeded: true,
    failureReason: null,
    metadata: {
      attemptCount
    }
  });

  redirect(`/employer/jobs/${job.id}/candidates/${profile.id}`);
}

export async function saveEmployerJobDraftAction(formData: FormData) {
  const { supabase, userId } = await getEmployerContext();
  const jobId = formData.get("jobId");

  if (typeof jobId !== "string" || !jobId.trim()) {
    notFound();
  }

  const job = await updateEmployerJobDraft(
    supabase,
    userId,
    jobId.trim(),
    requireValidJobInput(formData)
  );

  redirect(`/employer/jobs/${job.id}`);
}

export async function askEmployerAssistantForNextStepAction(formData: FormData) {
  const { supabase, userId } = await getEmployerContext();
  const jobId = formData.get("jobId");
  const candidateId = formData.get("candidateId");

  if (typeof jobId !== "string" || !jobId.trim()) {
    notFound();
  }

  if (typeof candidateId !== "string" || !candidateId.trim()) {
    notFound();
  }

  const job = await getEmployerJob(supabase, userId, jobId.trim());
  if (!job) {
    notFound();
  }

  const profile = await getCandidateProfileById(supabase, userId, job.id, candidateId.trim());
  if (!profile) {
    notFound();
  }

  const result = await runEmployerAssistantOrchestration({
    config: getOpenAIClientConfig(),
    promptVersion: createStaticEmployerAssistantPromptVersion(),
    context: {
      employerJobId: job.id,
      candidateProfileId: profile.id,
      job: {
        title: job.title,
        requirements: parseMultilineText(job.brief?.requirements),
        hiringProblem: job.brief?.hiringProblem,
        outcomes: parseMultilineText(job.brief?.outcomes)
      },
      candidate: {
        summary: profile.summary,
        skills: profile.skills,
        aggregateScore: profile.aggregate_score ?? undefined,
        evidenceSnippets: Array.isArray(profile.score_evidence_snippets)
          ? profile.score_evidence_snippets
          : [],
        missingSignals: parseMissingSignals(profile.extraction_metadata)
      }
    }
  });

  const recommendationRecord = await createEmployerAssistantRecommendation(supabase, {
    employerUserId: userId,
    employerJobId: job.id,
    candidateProfileId: profile.id,
    action: result.recommendation.action,
    rationale: result.recommendation.rationale,
    evidenceReferences: result.recommendation.evidenceReferences,
    riskFlags: result.recommendation.riskFlags,
    promptKey: result.metadata.prompt.promptKey,
    promptVersion: result.metadata.prompt.version,
    promptChecksum: result.metadata.prompt.checksum,
    provider: "openai",
    model: result.metadata.model,
    providerResponseId: result.metadata.providerResponseId,
    failureReason: result.metadata.failureReason,
    metadata: {
      attempts: result.metadata.attempts,
      fallbackUsed: result.metadata.fallbackUsed
    }
  });

  if (result.recommendation.screeningKit) {
    const kit = await createEmployerAssistantScreeningKit(supabase, {
      recommendationId: recommendationRecord.id,
      employerUserId: userId,
      employerJobId: job.id,
      candidateProfileId: profile.id,
      title: result.recommendation.screeningKit.title,
      objective: result.recommendation.screeningKit.objective,
      metadata: {}
    });

    for (const [index, question] of result.recommendation.screeningKit.questions.entries()) {
      await createEmployerAssistantScreeningQuestion(supabase, {
        screeningKitId: kit.id,
        employerUserId: userId,
        employerJobId: job.id,
        candidateProfileId: profile.id,
        questionOrder: index + 1,
        questionText: question.question,
        rubricDimension: question.rubricDimension,
        rubricGuidance: question.intent,
        isUncertaintyProbe: question.uncertaintyFlag,
        metadata: {
          competency: question.competency
        }
      });
    }
  }

  redirect(`/employer/jobs/${job.id}/candidates/${profile.id}`);
}

export async function submitEmployerJobForReviewAction(formData: FormData) {
  const { supabase, userId } = await getEmployerContext();
  const jobId = formData.get("jobId");

  if (typeof jobId !== "string" || !jobId.trim()) {
    notFound();
  }

  const job = await getEmployerJob(supabase, userId, jobId.trim());

  if (!job) {
    notFound();
  }

  const nextJob = await transitionEmployerJobStatus(
    supabase,
    userId,
    job.id,
    job.status,
    "submit_for_review"
  );

  redirect(`/employer/jobs/${nextJob.id}`);
}

export async function publishEmployerJobAction(formData: FormData) {
  const { supabase, userId } = await getEmployerContext();
  const jobId = formData.get("jobId");

  if (typeof jobId !== "string" || !jobId.trim()) {
    notFound();
  }

  const job = await getEmployerJob(supabase, userId, jobId.trim());

  if (!job) {
    notFound();
  }

  const nextJob = await transitionEmployerJobStatus(
    supabase,
    userId,
    job.id,
    job.status,
    "publish"
  );

  redirect(`/employer/jobs/${nextJob.id}`);
}

export async function archiveEmployerJobAction(formData: FormData) {
  const { supabase, userId } = await getEmployerContext();
  const jobId = formData.get("jobId");

  if (typeof jobId !== "string" || !jobId.trim()) {
    notFound();
  }

  const job = await getEmployerJob(supabase, userId, jobId.trim());

  if (!job) {
    notFound();
  }

  if (job.status !== "archived") {
    await transitionEmployerJobStatus(supabase, userId, job.id, job.status, "archive");
  }

  redirect(`/employer/jobs/${job.id}`);
}

export async function removeEmployerJobAction(formData: FormData) {
  const { supabase, userId } = await getEmployerContext();
  const jobId = formData.get("jobId");

  if (typeof jobId !== "string" || !jobId.trim()) {
    notFound();
  }

  const job = await getEmployerJob(supabase, userId, jobId.trim());

  if (!job) {
    notFound();
  }

  await removeEmployerJob(supabase, userId, job.id);
  redirect("/employer/jobs");
}
