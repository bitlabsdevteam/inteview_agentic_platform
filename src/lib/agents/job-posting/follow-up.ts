import { createHash } from "node:crypto";

import {
  runJobPostingInference,
  type JobPostingInferenceInput,
  type JobPostingInferenceResult
} from "@/lib/agents/job-posting/inference";
import type { OpenAIClientConfig } from "@/lib/agents/job-posting/openai-client";
import {
  buildAgentJobSessionPatch,
  createAgentExecutionTrace,
  createAgentJobMessage,
  getAgentJobSession,
  updateAgentJobSession,
  type AgentJobSessionRecord,
  type AgentJobSessionStatus
} from "@/lib/agents/job-posting/persistence";
import type { PromptVersion } from "@/lib/agents/job-posting/prompts";
import {
  convertAgentOutputToEmployerJobInput,
  type JobPostingAgentOutput
} from "@/lib/agents/job-posting/schema";
import { updateEmployerJobDraft } from "@/lib/employer/jobs";

type FollowUpClient =
  Parameters<typeof updateEmployerJobDraft>[0] &
    Parameters<typeof getAgentJobSession>[0] &
    Parameters<typeof updateAgentJobSession>[0] &
    Parameters<typeof createAgentJobMessage>[0] &
    Parameters<typeof createAgentExecutionTrace>[0];

type RunInference = (input: JobPostingInferenceInput) => Promise<JobPostingInferenceResult>;

export type FollowUpRevisionInput = {
  client: FollowUpClient;
  employerUserId: string;
  sessionId: string;
  answer: string;
  config: OpenAIClientConfig;
  promptVersion: PromptVersion;
  runInference?: RunInference;
  createOutputChecksum?: (value: unknown) => string;
};

function trimFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function createJsonChecksum(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function getFollowUpSessionIdFromFormData(formData: FormData) {
  const sessionId = trimFormValue(formData.get("sessionId"));

  if (!sessionId) {
    throw new Error("Agent session id is required before revising a job draft.");
  }

  return sessionId;
}

export function getFollowUpAnswerFromFormData(formData: FormData) {
  const answer = trimFormValue(formData.get("followUpAnswer"));

  if (!answer) {
    throw new Error("Follow-up answer is required before revising a job draft.");
  }

  return answer;
}

export function getTargetedFollowUpQuestions(output: JobPostingAgentOutput) {
  const explicitQuestions = output.followUpQuestions
    .map((question) => question.trim())
    .filter(Boolean);

  if (explicitQuestions.length) {
    return explicitQuestions.slice(0, 3);
  }

  return output.missingCriticalFields
    .map((field) => field.trim())
    .filter(Boolean)
    .map((field) => `Please provide the ${formatFieldName(field)}.`)
    .slice(0, 3);
}

export function shouldRequestFollowUp(output: JobPostingAgentOutput) {
  return output.missingCriticalFields.some((field) => field.trim()) &&
    getTargetedFollowUpQuestions(output).length > 0;
}

function getNextSessionStatus(output: JobPostingAgentOutput): AgentJobSessionStatus {
  return shouldRequestFollowUp(output) ? "needs_follow_up" : "draft_created";
}

function formatFieldName(field: string) {
  return field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
}

export function buildFollowUpRevisionPrompt({
  session,
  answer
}: {
  session: AgentJobSessionRecord;
  answer: string;
}) {
  return [
    "Revise the existing job draft using the employer follow-up answer.",
    "Keep the same employer job draft and return the full structured job posting output.",
    "Ask at most three targeted follow-up questions only if critical fields remain missing.",
    "",
    "Previous employer prompt:",
    session.latest_employer_prompt,
    "",
    "Missing critical fields:",
    session.missing_critical_fields.join(", ") || "None",
    "",
    "Previous follow-up questions:",
    session.follow_up_questions.slice(0, 3).join("\n") || "None",
    "",
    "Previous generated fields:",
    JSON.stringify(session.generated_fields),
    "",
    "Employer follow-up answer:",
    answer
  ].join("\n");
}

export async function reviseEmployerJobDraftFromFollowUp({
  client,
  employerUserId,
  sessionId,
  answer,
  config,
  promptVersion,
  runInference = runJobPostingInference,
  createOutputChecksum = createJsonChecksum
}: FollowUpRevisionInput) {
  const session = await getAgentJobSession(client, employerUserId, sessionId);

  if (!session) {
    throw new Error("Agent job session was not found for this employer.");
  }

  if (!session.employer_job_id) {
    throw new Error("Agent job session is not linked to an employer job draft.");
  }

  const inference = await runInference({
    config,
    promptVersion,
    employerPrompt: buildFollowUpRevisionPrompt({ session, answer })
  });
  const followUpQuestions = getTargetedFollowUpQuestions(inference.output);
  const job = await updateEmployerJobDraft(
    client,
    employerUserId,
    session.employer_job_id,
    convertAgentOutputToEmployerJobInput(inference.output)
  );
  const updatedSession = await updateAgentJobSession(
    client,
    employerUserId,
    session.id,
    buildAgentJobSessionPatch({
      status: getNextSessionStatus(inference.output),
      latestEmployerPrompt: answer,
      generatedFields: inference.output,
      assumptions: inference.output.assumptions,
      missingCriticalFields: inference.output.missingCriticalFields,
      followUpQuestions
    })
  );

  await createAgentJobMessage(client, {
    sessionId: session.id,
    employerUserId,
    role: "employer",
    content: answer,
    metadata: {
      source: "follow_up_answer"
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
    session: updatedSession,
    inference
  };
}
