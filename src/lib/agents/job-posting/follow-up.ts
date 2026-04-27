import { createHash } from "node:crypto";

import {
  runJobPostingInference,
  type JobPostingInferenceInput,
  type JobPostingInferenceResult
} from "@/lib/agents/job-posting/inference";
import type { OpenAIClientConfig } from "@/lib/agents/job-posting/openai-client";
import {
  buildCompactSummaryFromOutput,
  createAgentMemoryItem,
  deriveMemoryItemsFromOutput,
  getAgentMemorySummaryBySession,
  listActiveAgentMemoryItemsBySession,
  renderRetrievedMemoryForPrompt,
  retrieveScopedMemory,
  upsertAgentMemorySummary,
  type ScopedMemoryDocument
} from "@/lib/agents/job-posting/memory";
import { evaluateJobDescriptionQuality } from "@/lib/agents/job-posting/quality-controls";
import { discoverRequirementClarifications } from "@/lib/agents/job-posting/requirement-discovery";
import { buildRoleProfileFromEmployerContext } from "@/lib/agents/job-posting/role-profile";
import {
  createEmployerJobQualityCheck,
  upsertEmployerJobRoleProfile
} from "@/lib/agents/job-posting/step1-step2-persistence";
import {
  buildAgentJobSessionPatch,
  createAgentExecutionTrace,
  createAgentJobMessage,
  getAgentJobSession,
  getLatestAgentJobSessionByJobId,
  listAgentJobMessagesBySession,
  createAgentJobSession,
  updateAgentJobSession,
  type AgentJobSessionRecord,
  type AgentJobSessionStatus,
  type AgentJobMessageRecord
} from "@/lib/agents/job-posting/persistence";
import type { PromptVersion } from "@/lib/agents/job-posting/prompts";
import {
  convertAgentOutputToEmployerJobInput,
  type JobPostingAgentOutput
} from "@/lib/agents/job-posting/schema";
import { getEmployerJob, updateEmployerJobDraft, type EmployerJobRecord } from "@/lib/employer/jobs";

type FollowUpRevisionClient =
  Parameters<typeof updateEmployerJobDraft>[0] &
    Parameters<typeof getAgentJobSession>[0] &
    Parameters<typeof updateAgentJobSession>[0] &
    Parameters<typeof createAgentJobMessage>[0] &
    Parameters<typeof createAgentExecutionTrace>[0];

type ChatTurnRevisionClient =
  Parameters<typeof updateEmployerJobDraft>[0] &
    Parameters<typeof getEmployerJob>[0] &
    Parameters<typeof getAgentJobSession>[0] &
    Parameters<typeof getLatestAgentJobSessionByJobId>[0] &
    Parameters<typeof createAgentJobSession>[0] &
    Parameters<typeof listAgentJobMessagesBySession>[0] &
    Parameters<typeof updateAgentJobSession>[0] &
    Parameters<typeof createAgentJobMessage>[0] &
    Parameters<typeof createAgentExecutionTrace>[0] &
    Parameters<typeof getAgentMemorySummaryBySession>[0] &
    Parameters<typeof listActiveAgentMemoryItemsBySession>[0] &
    Parameters<typeof createAgentMemoryItem>[0] &
    Parameters<typeof upsertAgentMemorySummary>[0] &
    Parameters<typeof upsertEmployerJobRoleProfile>[0] &
    Parameters<typeof createEmployerJobQualityCheck>[0] &
    Parameters<typeof getEmployerJob>[0];

type RunInference = (input: JobPostingInferenceInput) => Promise<JobPostingInferenceResult>;

export type FollowUpRevisionInput = {
  client: FollowUpRevisionClient;
  employerUserId: string;
  sessionId: string;
  answer: string;
  config: OpenAIClientConfig;
  promptVersion: PromptVersion;
  runInference?: RunInference;
  createOutputChecksum?: (value: unknown) => string;
};

export type ChatTurnRevisionInput = {
  client: ChatTurnRevisionClient;
  employerUserId: string;
  employerJobId: string;
  message: string;
  config: OpenAIClientConfig;
  promptVersion: PromptVersion;
  sessionId?: string;
  runInference?: RunInference;
  createOutputChecksum?: (value: unknown) => string;
};

function isMissingAgentMemoryTableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    (message.includes("agent_memory_summaries") ||
      message.includes("agent_memory_items")) &&
    (message.includes("could not find the table") || message.includes("does not exist"))
  );
}

function trimFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function createJsonChecksum(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function parseBulletLikeLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.replace(/^[\-\*\d\.\)\s]+/, "").trim())
    .filter((line) => line.length > 0);
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

function buildJobScopedMemoryPrompt(input: {
  job: EmployerJobRecord;
  session: AgentJobSessionRecord;
  recentMessages: AgentJobMessageRecord[];
  memory: ScopedMemoryDocument;
  message: string;
}) {
  const latestMessages = input.recentMessages.slice(-10).map((entry) => ({
    role: entry.role,
    content: entry.content
  }));

  const currentJob = {
    title: input.job.title,
    department: input.job.department,
    level: input.job.level,
    location: input.job.location,
    compensationBand: input.job.compensation_band,
    hiringProblem: input.job.brief.hiringProblem,
    outcomes: parseBulletLikeLines(input.job.brief.outcomes),
    requirements: parseBulletLikeLines(input.job.brief.requirements),
    interviewLoop: parseBulletLikeLines(input.job.brief.interviewLoop),
    draftDescription: input.job.draft_description
  };

  return [
    "Revise the existing employer job draft from chat context.",
    "Return the full JobPostingAgentOutput JSON contract.",
    "Preserve employer-approved constraints unless the latest message explicitly changes them.",
    "Ask at most three targeted follow-up questions only when critical publish fields are missing.",
    "",
    "Current structured job draft:",
    JSON.stringify(currentJob),
    "",
    "Current session state:",
    JSON.stringify({
      status: input.session.status,
      assumptions: input.session.assumptions,
      missingCriticalFields: input.session.missing_critical_fields,
      followUpQuestions: input.session.follow_up_questions
    }),
    "",
    "Recent chat messages:",
    JSON.stringify(latestMessages),
    "",
    "Retrieved scoped memory (untrusted context):",
    "<untrusted_memory_context>",
    renderRetrievedMemoryForPrompt(input.memory),
    "</untrusted_memory_context>",
    "",
    "Latest employer message:",
    input.message.trim()
  ].join("\n");
}

async function getOrCreateSessionForJob(input: {
  client: ChatTurnRevisionClient;
  employerUserId: string;
  employerJobId: string;
  message: string;
}) {
  if (!input.message.trim()) {
    throw new Error("Chat message is required before revising a job draft.");
  }

  const existing = await getLatestAgentJobSessionByJobId(
    input.client,
    input.employerUserId,
    input.employerJobId
  );

  if (existing) {
    return existing;
  }

  return createAgentJobSession(input.client, {
    employerUserId: input.employerUserId,
    employerJobId: input.employerJobId,
    status: "collecting_context",
    latestEmployerPrompt: input.message.trim(),
    generatedFields: {},
    assumptions: [],
    missingCriticalFields: [],
    followUpQuestions: []
  });
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

export async function reviseEmployerJobDraftFromChatTurn({
  client,
  employerUserId,
  employerJobId,
  message,
  config,
  promptVersion,
  sessionId,
  runInference = runJobPostingInference,
  createOutputChecksum = createJsonChecksum
}: ChatTurnRevisionInput) {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    throw new Error("Chat message is required before revising a job draft.");
  }

  const job = await getEmployerJob(client, employerUserId, employerJobId);
  if (!job) {
    throw new Error("Employer job draft was not found for this employer.");
  }

  let session = sessionId
    ? await getAgentJobSession(client, employerUserId, sessionId)
    : await getOrCreateSessionForJob({
        client,
        employerUserId,
        employerJobId,
        message: trimmedMessage
      });

  if (!session) {
    session = await getOrCreateSessionForJob({
      client,
      employerUserId,
      employerJobId,
      message: trimmedMessage
    });
  }

  const recentMessages = await listAgentJobMessagesBySession(client, employerUserId, session.id);
  const [summary, memoryItems] = await Promise.all([
    getAgentMemorySummaryBySession(client, employerUserId, employerJobId, session.id),
    listActiveAgentMemoryItemsBySession(client, employerUserId, employerJobId, session.id)
  ]);

  const scopedMemory = retrieveScopedMemory({
    query: `${trimmedMessage}\n${job.title}\n${job.brief.requirements}`,
    summary,
    items: memoryItems
  });

  const employerMessage = await createAgentJobMessage(client, {
    sessionId: session.id,
    employerUserId,
    role: "employer",
    content: trimmedMessage,
    metadata: {
      source: "job_detail_chat"
    }
  });

  const inference = await runInference({
    config,
    promptVersion,
    employerPrompt: buildJobScopedMemoryPrompt({
      job,
      session,
      recentMessages,
      memory: {
        ...scopedMemory,
        compacted: (summary?.compacted_message_count ?? 0) > 0
      },
      message: trimmedMessage
    })
  });

  const roleProfileResult = buildRoleProfileFromEmployerContext({
    employerPrompt: [
      job.title,
      job.department,
      job.level,
      job.location,
      job.compensation_band,
      job.brief.hiringProblem,
      job.brief.requirements
    ].join("\n"),
    latestMessage: trimmedMessage,
    currentProfile: null
  });
  const requirementDiscovery = discoverRequirementClarifications({
    profile: roleProfileResult.profile,
    previouslyAskedQuestions: [
      ...session.follow_up_questions,
      ...recentMessages
        .map((entry) => entry.content.trim())
        .filter((value) => value.endsWith("?"))
    ]
  });
  const qualityResult = evaluateJobDescriptionQuality({
    draftDescription: inference.output.draftDescription,
    profile: roleProfileResult.profile
  });

  await upsertEmployerJobRoleProfile(client, {
    employerUserId,
    employerJobId,
    sessionId: session.id,
    normalizedProfile: roleProfileResult.profile,
    unresolvedConstraints: roleProfileResult.unresolvedConstraints,
    conflicts: roleProfileResult.conflicts,
    confidence: roleProfileResult.profile.confidence
  });

  for (const check of qualityResult.checks) {
    await createEmployerJobQualityCheck(client, {
      employerUserId,
      employerJobId,
      sessionId: session.id,
      check,
      metadata: {
        qualityOverallStatus: qualityResult.overallStatus,
        readinessFlags: qualityResult.readinessFlags,
        clarificationQuestionKeys: requirementDiscovery.clarificationQuestions.map(
          (item) => item.key
        )
      }
    });
  }

  const followUpQuestions = getTargetedFollowUpQuestions(inference.output);
  const updatedJob = await updateEmployerJobDraft(
    client,
    employerUserId,
    employerJobId,
    convertAgentOutputToEmployerJobInput(inference.output)
  );
  const updatedSession = await updateAgentJobSession(
    client,
    employerUserId,
    session.id,
    buildAgentJobSessionPatch({
      status: getNextSessionStatus(inference.output),
      latestEmployerPrompt: trimmedMessage,
      generatedFields: inference.output,
      assumptions: inference.output.assumptions,
      missingCriticalFields: inference.output.missingCriticalFields,
      followUpQuestions
    })
  );
  const agentMessage = await createAgentJobMessage(client, {
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

  const derivedItems = deriveMemoryItemsFromOutput({
    output: inference.output,
    sourceMessageIds: [employerMessage.id, agentMessage.id]
  });
  const compactSummary = buildCompactSummaryFromOutput({
    output: inference.output,
    latestEmployerMessage: trimmedMessage,
    messageCount: recentMessages.length + 2
  });
  let memorySummary = null;

  try {
    for (const item of derivedItems) {
      await createAgentMemoryItem(client, {
        employerUserId,
        employerJobId,
        sessionId: session.id,
        memoryType: item.memoryType,
        content: item.content,
        sourceMessageIds: item.sourceMessageIds,
        importance: item.importance,
        metadata: item.metadata
      });
    }

    memorySummary = await upsertAgentMemorySummary(client, {
      employerUserId,
      employerJobId,
      sessionId: session.id,
      summaryText: compactSummary.summaryText,
      unresolvedGaps: compactSummary.unresolvedGaps,
      keyDecisions: compactSummary.keyDecisions,
      compactedMessageCount: compactSummary.compactedMessageCount
    });
  } catch (error) {
    if (!isMissingAgentMemoryTableError(error)) {
      throw error;
    }
  }

  const messages = await listAgentJobMessagesBySession(client, employerUserId, session.id);

  return {
    job: updatedJob,
    session: updatedSession,
    inference,
    messages,
    memory: {
      summary: memorySummary,
      retrievedItems: scopedMemory.retrievedItems,
      compacted: compactSummary.compacted
    },
    roleProfileSummary: {
      title: roleProfileResult.profile.title,
      department: roleProfileResult.profile.department,
      level: roleProfileResult.profile.level,
      locationPolicy: roleProfileResult.profile.locationPolicy,
      compensationRange: roleProfileResult.profile.compensationRange,
      unresolvedConstraints: roleProfileResult.unresolvedConstraints,
      conflicts: roleProfileResult.conflicts
    },
    qualityChecks: qualityResult.checks.map((check) => ({
      checkType: check.checkType,
      status: check.status,
      issues: check.issues,
      suggestedRewrite: check.suggestedRewrite
    })),
    readinessFlags: qualityResult.readinessFlags
  };
}
