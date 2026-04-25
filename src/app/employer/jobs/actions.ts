"use server";

import { notFound, redirect } from "next/navigation";

import {
  createPromptFirstEmployerJobDraft,
  getEmployerPromptFromFormData
} from "@/lib/agents/job-posting/create-draft";
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
