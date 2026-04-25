import { createHash } from "node:crypto";

import {
  runJobPostingInference,
  type JobPostingInferenceInput,
  type JobPostingInferenceResult
} from "@/lib/agents/job-posting/inference";
import type { OpenAIClientConfig } from "@/lib/agents/job-posting/openai-client";
import {
  createAgentExecutionTrace,
  createAgentJobMessage,
  createAgentJobSession
} from "@/lib/agents/job-posting/persistence";
import {
  getTargetedFollowUpQuestions,
  shouldRequestFollowUp
} from "@/lib/agents/job-posting/follow-up";
import type { PromptVersion } from "@/lib/agents/job-posting/prompts";
import { convertAgentOutputToEmployerJobInput } from "@/lib/agents/job-posting/schema";
import { createEmployerJobDraft } from "@/lib/employer/jobs";

type PromptFirstJobCreationClient =
  Parameters<typeof createEmployerJobDraft>[0] &
    Parameters<typeof createAgentJobSession>[0] &
    Parameters<typeof createAgentJobMessage>[0] &
    Parameters<typeof createAgentExecutionTrace>[0];

type RunInference = (input: JobPostingInferenceInput) => Promise<JobPostingInferenceResult>;

export type PromptFirstEmployerJobDraftInput = {
  client: PromptFirstJobCreationClient;
  employerUserId: string;
  employerPrompt: string;
  config: OpenAIClientConfig;
  promptVersion: PromptVersion;
  runInference?: RunInference;
  createOutputChecksum?: (value: unknown) => string;
};

export function getEmployerPromptFromFormData(formData: FormData) {
  const value = formData.get("employerPrompt");
  const prompt = typeof value === "string" ? value.trim() : "";

  if (!prompt) {
    throw new Error("Employer prompt is required before creating a job draft.");
  }

  return prompt;
}

function createJsonChecksum(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function createPromptFirstEmployerJobDraft({
  client,
  employerUserId,
  employerPrompt,
  config,
  promptVersion,
  runInference = runJobPostingInference,
  createOutputChecksum = createJsonChecksum
}: PromptFirstEmployerJobDraftInput) {
  const inference = await runInference({
    config,
    promptVersion,
    employerPrompt
  });
  const jobInput = convertAgentOutputToEmployerJobInput(inference.output);
  const job = await createEmployerJobDraft(client, employerUserId, jobInput);
  const followUpQuestions = getTargetedFollowUpQuestions(inference.output);
  const session = await createAgentJobSession(client, {
    employerUserId,
    employerJobId: job.id,
    status: shouldRequestFollowUp(inference.output) ? "needs_follow_up" : "draft_created",
    latestEmployerPrompt: employerPrompt,
    generatedFields: inference.output,
    assumptions: inference.output.assumptions,
    missingCriticalFields: inference.output.missingCriticalFields,
    followUpQuestions
  });

  await createAgentJobMessage(client, {
    sessionId: session.id,
    employerUserId,
    role: "employer",
    content: employerPrompt,
    metadata: {
      source: "prompt_first_job_creation"
    }
  });

  await createAgentJobMessage(client, {
    sessionId: session.id,
    employerUserId,
    role: "agent",
    content: inference.output.draftDescription,
    metadata: {
      providerResponseId: inference.providerResponseId,
      model: inference.model
    }
  });

  await createAgentExecutionTrace(client, {
    sessionId: session.id,
    employerUserId,
    provider: "openai",
    providerResponseId: inference.providerResponseId,
    model: inference.model,
    promptKey: inference.prompt.promptKey,
    promptVersion: inference.prompt.version,
    promptChecksum: inference.prompt.checksum,
    outputChecksum: createOutputChecksum(inference.output),
    status: "succeeded"
  });

  return {
    job,
    session,
    inference
  };
}
