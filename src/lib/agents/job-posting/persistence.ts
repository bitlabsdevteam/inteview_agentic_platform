export const AGENT_JOB_SESSION_STATUSES = [
  "collecting_context",
  "needs_follow_up",
  "draft_created",
  "failed"
] as const;

export type AgentJobSessionStatus = (typeof AGENT_JOB_SESSION_STATUSES)[number];

export const AGENT_MESSAGE_ROLES = ["employer", "agent", "system"] as const;

export type AgentMessageRole = (typeof AGENT_MESSAGE_ROLES)[number];

export const AGENT_TRACE_STATUSES = ["succeeded", "failed"] as const;

export type AgentTraceStatus = (typeof AGENT_TRACE_STATUSES)[number];

export type AgentJobSessionInput = {
  employerUserId: string;
  employerJobId: string | null;
  status: AgentJobSessionStatus;
  latestEmployerPrompt: string;
  generatedFields: Record<string, unknown>;
  assumptions: string[];
  missingCriticalFields: string[];
  followUpQuestions: string[];
};

export type AgentJobSessionRecord = {
  id: string;
  employer_user_id: string;
  employer_job_id: string | null;
  status: AgentJobSessionStatus;
  latest_employer_prompt: string;
  generated_fields: Record<string, unknown>;
  assumptions: string[];
  missing_critical_fields: string[];
  follow_up_questions: string[];
  created_at: string;
  updated_at: string;
};

export type AgentJobSessionInsert = Omit<
  AgentJobSessionRecord,
  "id" | "created_at" | "updated_at"
>;

export type AgentJobSessionPatch = Partial<
  Pick<
    AgentJobSessionInsert,
    | "status"
    | "latest_employer_prompt"
    | "generated_fields"
    | "assumptions"
    | "missing_critical_fields"
    | "follow_up_questions"
  >
>;

export type AgentJobMessageInput = {
  sessionId: string;
  employerUserId: string;
  role: AgentMessageRole;
  content: string;
  metadata?: Record<string, unknown>;
};

export type AgentJobMessageRecord = {
  id: string;
  session_id: string;
  employer_user_id: string;
  role: AgentMessageRole;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AgentJobMessageInsert = Omit<AgentJobMessageRecord, "id" | "created_at">;

export type AgentTraceInput = {
  sessionId: string;
  employerUserId: string;
  provider: "openai";
  providerResponseId: string | null;
  model: string;
  promptKey: string;
  promptVersion: string;
  promptChecksum: string;
  outputChecksum: string | null;
  status: AgentTraceStatus;
  errorMessage?: string | null;
};

export type AgentTraceRecord = {
  id: string;
  session_id: string;
  employer_user_id: string;
  provider: "openai";
  provider_response_id: string | null;
  model: string;
  prompt_key: string;
  prompt_version: string;
  prompt_checksum: string;
  output_checksum: string | null;
  status: AgentTraceStatus;
  error_message: string | null;
  created_at: string;
};

export type AgentTraceInsert = Omit<AgentTraceRecord, "id" | "created_at">;

type QueryResult<T> = {
  data: T;
  error: { message?: string } | null;
};

type AgentPersistenceClient = {
  from: (
    table: "agent_job_sessions" | "agent_job_messages" | "agent_execution_traces"
  ) => {
    select: (columns: string) => unknown;
    insert: (
      values: AgentJobSessionInsert | AgentJobMessageInsert | AgentTraceInsert
    ) => unknown;
  };
};

function assertQueryResult<T>(result: QueryResult<T>, operation: string) {
  if (result.error) {
    throw new Error(result.error.message ?? `Unable to ${operation}.`);
  }

  return result.data;
}

export function buildAgentJobSessionInsert(
  input: AgentJobSessionInput
): AgentJobSessionInsert {
  return {
    employer_user_id: input.employerUserId,
    employer_job_id: input.employerJobId,
    status: input.status,
    latest_employer_prompt: input.latestEmployerPrompt,
    generated_fields: input.generatedFields,
    assumptions: input.assumptions,
    missing_critical_fields: input.missingCriticalFields,
    follow_up_questions: input.followUpQuestions
  };
}

export function buildAgentJobSessionPatch(input: {
  status: AgentJobSessionStatus;
  latestEmployerPrompt: string;
  generatedFields: Record<string, unknown>;
  assumptions: string[];
  missingCriticalFields: string[];
  followUpQuestions: string[];
}): AgentJobSessionPatch {
  return {
    status: input.status,
    latest_employer_prompt: input.latestEmployerPrompt,
    generated_fields: input.generatedFields,
    assumptions: input.assumptions,
    missing_critical_fields: input.missingCriticalFields,
    follow_up_questions: input.followUpQuestions
  };
}

export function buildAgentJobMessageInsert(
  input: AgentJobMessageInput
): AgentJobMessageInsert {
  return {
    session_id: input.sessionId,
    employer_user_id: input.employerUserId,
    role: input.role,
    content: input.content,
    metadata: input.metadata ?? {}
  };
}

export function buildAgentTraceInsert(input: AgentTraceInput): AgentTraceInsert {
  return {
    session_id: input.sessionId,
    employer_user_id: input.employerUserId,
    provider: input.provider,
    provider_response_id: input.providerResponseId,
    model: input.model,
    prompt_key: input.promptKey,
    prompt_version: input.promptVersion,
    prompt_checksum: input.promptChecksum,
    output_checksum: input.outputChecksum,
    status: input.status,
    error_message: input.errorMessage ?? null
  };
}

export async function createAgentJobSession(
  client: AgentPersistenceClient,
  input: AgentJobSessionInput
) {
  const query = client.from("agent_job_sessions").insert(buildAgentJobSessionInsert(input)) as {
    select: (columns: string) => {
      single: () => Promise<QueryResult<AgentJobSessionRecord>>;
    };
  };

  return assertQueryResult(await query.select("*").single(), "create agent job session");
}

export async function createAgentJobMessage(
  client: AgentPersistenceClient,
  input: AgentJobMessageInput
) {
  const query = client.from("agent_job_messages").insert(buildAgentJobMessageInsert(input)) as {
    select: (columns: string) => {
      single: () => Promise<QueryResult<AgentJobMessageRecord>>;
    };
  };

  return assertQueryResult(await query.select("*").single(), "create agent job message");
}

export async function createAgentExecutionTrace(
  client: AgentPersistenceClient,
  input: AgentTraceInput
) {
  const query = client.from("agent_execution_traces").insert(buildAgentTraceInsert(input)) as {
    select: (columns: string) => {
      single: () => Promise<QueryResult<AgentTraceRecord>>;
    };
  };

  return assertQueryResult(await query.select("*").single(), "create agent execution trace");
}

export async function listAgentJobSessions(
  client: AgentPersistenceClient,
  employerUserId: string
) {
  const query = client.from("agent_job_sessions").select("*") as {
    eq: (column: string, value: string) => {
      order: (
        column: string,
        options: { ascending: boolean }
      ) => Promise<QueryResult<AgentJobSessionRecord[]>>;
    };
  };

  return assertQueryResult(
    await query.eq("employer_user_id", employerUserId).order("updated_at", { ascending: false }),
    "list agent job sessions"
  );
}

export async function getAgentJobSession(
  client: AgentPersistenceClient,
  employerUserId: string,
  sessionId: string
) {
  const query = client.from("agent_job_sessions").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<QueryResult<AgentJobSessionRecord | null>>;
      };
    };
  };

  return assertQueryResult(
    await query.eq("id", sessionId).eq("employer_user_id", employerUserId).maybeSingle(),
    "load agent job session"
  );
}

export async function getLatestAgentJobSessionByJobId(
  client: AgentPersistenceClient,
  employerUserId: string,
  employerJobId: string
) {
  const query = client.from("agent_job_sessions").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          options: { ascending: boolean }
        ) => {
          limit: (value: number) => {
            maybeSingle: () => Promise<QueryResult<AgentJobSessionRecord | null>>;
          };
        };
      };
    };
  };

  return assertQueryResult(
    await query
      .eq("employer_user_id", employerUserId)
      .eq("employer_job_id", employerJobId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "load latest agent job session by job id"
  );
}

export async function updateAgentJobSession(
  client: AgentPersistenceClient,
  employerUserId: string,
  sessionId: string,
  patch: AgentJobSessionPatch
) {
  const query = (client.from("agent_job_sessions") as unknown as {
    update: (values: AgentJobSessionPatch) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          select: (columns: string) => {
            single: () => Promise<QueryResult<AgentJobSessionRecord>>;
          };
        };
      };
    };
  }).update(patch);

  return assertQueryResult(
    await query.eq("id", sessionId).eq("employer_user_id", employerUserId).select("*").single(),
    "update agent job session"
  );
}

export async function listAgentJobMessagesBySession(
  client: AgentPersistenceClient,
  employerUserId: string,
  sessionId: string
) {
  const query = client.from("agent_job_messages").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          options: { ascending: boolean }
        ) => Promise<QueryResult<AgentJobMessageRecord[]>>;
      };
    };
  };

  return assertQueryResult(
    await query
      .eq("employer_user_id", employerUserId)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    "list agent job messages by session"
  );
}
