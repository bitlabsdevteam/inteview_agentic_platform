import { getAgentMemorySummaryBySession, toMemorySummaryRecord } from "@/lib/agents/job-posting/memory";
import {
  getLatestAgentJobSessionByJobId,
  listAgentJobMessagesBySession
} from "@/lib/agents/job-posting/persistence";
import {
  getEmployerJobRoleProfileBySession,
  listEmployerJobQualityChecksBySession
} from "@/lib/agents/job-posting/step1-step2-persistence";
import { QUALITY_CHECK_TYPES } from "@/lib/agents/job-posting/quality-controls";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type EmployerJobAssistantSessionState = {
  id: string;
  status: string;
  assumptions: string[];
  missingCriticalFields: string[];
  followUpQuestions: string[];
  updatedAt: string;
} | null;

export type EmployerJobAssistantMessageState = {
  id: string;
  role: "employer" | "agent" | "system";
  content: string;
  createdAt: string;
};

export type EmployerJobAssistantMemoryState = {
  summary: {
    summaryText: string;
    unresolvedGaps: string[];
    keyDecisions: string[];
    compactedMessageCount: number;
    updatedAt: string;
  } | null;
  compacted: boolean;
};

export type EmployerJobAssistantRoleProfileSummaryState = {
  title?: string;
  department?: string;
  level?: string;
  locationPolicy?: string;
  compensationRange?: string;
  unresolvedConstraints: string[];
  conflicts: Array<{
    field?: string;
    issue?: string;
    severity?: "low" | "medium" | "high" | string;
    suggestedResolution?: string;
  }>;
} | null;

export type EmployerJobAssistantQualityCheckState = {
  checkType: string;
  status: "pass" | "warn" | "fail";
  issues: string[];
  suggestedRewrite: string;
};

export type EmployerJobAssistantReadinessFlagsState = {
  blocksReview: boolean;
  requiresEmployerFix: boolean;
};

export type EmployerJobAssistantState = {
  session: EmployerJobAssistantSessionState;
  messages: EmployerJobAssistantMessageState[];
  memory: EmployerJobAssistantMemoryState;
  roleProfileSummary: EmployerJobAssistantRoleProfileSummaryState;
  qualityChecks: EmployerJobAssistantQualityCheckState[];
  readinessFlags: EmployerJobAssistantReadinessFlagsState;
};

export async function getEmployerJobAssistantState(
  supabase: SupabaseServerClient,
  employerUserId: string,
  jobId: string
): Promise<EmployerJobAssistantState> {
  const latestSession = await getLatestAgentJobSessionByJobId(supabase, employerUserId, jobId);

  if (!latestSession) {
    return {
      session: null,
      messages: [],
      memory: {
        summary: null,
        compacted: false
      },
      roleProfileSummary: null,
      qualityChecks: [],
      readinessFlags: {
        blocksReview: false,
        requiresEmployerFix: false
      }
    };
  }

  const [sessionMessages, memorySummary, roleProfileSummary, qualityChecks] = await Promise.all([
    listAgentJobMessagesBySession(supabase, employerUserId, latestSession.id),
    getAgentMemorySummaryBySession(supabase, employerUserId, jobId, latestSession.id),
    getEmployerJobRoleProfileBySession(supabase, employerUserId, jobId, latestSession.id),
    listEmployerJobQualityChecksBySession(supabase, employerUserId, jobId, latestSession.id)
  ]);

  const memoryState = toMemorySummaryRecord(memorySummary);
  const currentQualityChecks = qualityChecks.slice(-QUALITY_CHECK_TYPES.length);

  return {
    session: {
      id: latestSession.id,
      status: latestSession.status,
      assumptions: latestSession.assumptions,
      missingCriticalFields: latestSession.missing_critical_fields,
      followUpQuestions: latestSession.follow_up_questions,
      updatedAt: latestSession.updated_at
    },
    messages: sessionMessages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.created_at
    })),
    memory: {
      summary: memoryState,
      compacted: (memoryState?.compactedMessageCount ?? 0) > 0
    },
    roleProfileSummary: roleProfileSummary
      ? {
          title: roleProfileSummary.normalized_profile.title,
          department: roleProfileSummary.normalized_profile.department,
          level: roleProfileSummary.normalized_profile.level,
          locationPolicy: roleProfileSummary.normalized_profile.locationPolicy,
          compensationRange: roleProfileSummary.normalized_profile.compensationRange,
          unresolvedConstraints: roleProfileSummary.unresolved_constraints,
          conflicts: roleProfileSummary.conflicts
        }
      : null,
    qualityChecks: currentQualityChecks.map((check) => ({
      checkType: check.check_type,
      status: check.status,
      issues: check.issues,
      suggestedRewrite: check.suggested_rewrite
    })),
    readinessFlags: {
      blocksReview: currentQualityChecks.some((check) => check.status === "fail"),
      requiresEmployerFix: currentQualityChecks.some((check) => check.status !== "pass")
    }
  };
}
