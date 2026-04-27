import type { JobPostingAgentOutput } from "@/lib/agents/job-posting/schema";

export const AGENT_MEMORY_TYPES = [
  "constraint",
  "decision",
  "preference",
  "unresolved_gap",
  "summary_fragment",
  "publish_readiness"
] as const;

export type AgentMemoryType = (typeof AGENT_MEMORY_TYPES)[number];

export type AgentMemoryItemRecord = {
  id: string;
  employer_user_id: string;
  employer_job_id: string;
  session_id: string;
  memory_type: AgentMemoryType;
  content: string;
  source_message_ids: string[];
  importance: number;
  superseded_at: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AgentMemorySummaryRecord = {
  id: string;
  employer_user_id: string;
  employer_job_id: string;
  session_id: string;
  summary_text: string;
  unresolved_gaps: string[];
  key_decisions: string[];
  compacted_message_count: number;
  created_at: string;
  updated_at: string;
};

type QueryResult<T> = {
  data: T;
  error: { message?: string } | null;
};

type AgentMemoryClient = {
  from: (table: "agent_memory_items" | "agent_memory_summaries") => {
    select: (columns: string) => unknown;
    insert: (values: Record<string, unknown>) => unknown;
    update: (values: Record<string, unknown>) => unknown;
    upsert?: (values: Record<string, unknown>) => unknown;
  };
};

export type ScopedMemoryDocument = {
  summary: AgentMemorySummaryRecord | null;
  retrievedItems: AgentMemoryItemRecord[];
  compacted: boolean;
};

const DEFAULT_MAX_RETRIEVED_ITEMS = 6;
const COMPACTION_MESSAGE_THRESHOLD = 12;

function assertQueryResult<T>(result: QueryResult<T>, operation: string) {
  if (result.error) {
    throw new Error(result.error.message ?? `Unable to ${operation}.`);
  }

  return result.data;
}

function isMissingTableError(error: { message?: string } | null, table: string) {
  const message = error?.message?.toLowerCase() ?? "";
  if (!message) {
    return false;
  }

  return (
    message.includes(`could not find the table 'public.${table.toLowerCase()}'`) ||
    message.includes(`relation "public.${table.toLowerCase()}" does not exist`) ||
    message.includes(`relation "${table.toLowerCase()}" does not exist`)
  );
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function countTokenOverlap(a: string, b: string) {
  const aTokens = new Set(tokenize(a));
  if (!aTokens.size) {
    return 0;
  }

  let score = 0;
  for (const token of tokenize(b)) {
    if (aTokens.has(token)) {
      score += 1;
    }
  }
  return score;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function clampImportance(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 3;
  }

  return Math.min(5, Math.max(1, Math.floor(value)));
}

export async function listActiveAgentMemoryItemsBySession(
  client: AgentMemoryClient,
  employerUserId: string,
  employerJobId: string,
  sessionId: string
) {
  const query = client.from("agent_memory_items").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          is: (column: string, value: null) => {
            order: (
              column: string,
              options: { ascending: boolean }
            ) => Promise<QueryResult<AgentMemoryItemRecord[]>>;
          };
        };
      };
    };
  };

  const result = await query
    .eq("employer_user_id", employerUserId)
    .eq("employer_job_id", employerJobId)
    .eq("session_id", sessionId)
    .is("superseded_at", null)
    .order("created_at", { ascending: false });

  if (isMissingTableError(result.error, "agent_memory_items")) {
    return [];
  }

  return assertQueryResult(result, "list active agent memory items by session");
}

export async function getAgentMemorySummaryBySession(
  client: AgentMemoryClient,
  employerUserId: string,
  employerJobId: string,
  sessionId: string
) {
  const query = client.from("agent_memory_summaries").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<QueryResult<AgentMemorySummaryRecord | null>>;
        };
      };
    };
  };

  const result = await query
    .eq("employer_user_id", employerUserId)
    .eq("employer_job_id", employerJobId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (isMissingTableError(result.error, "agent_memory_summaries")) {
    return null;
  }

  return assertQueryResult(result, "load agent memory summary by session");
}

export async function createAgentMemoryItem(
  client: AgentMemoryClient,
  input: {
    employerUserId: string;
    employerJobId: string;
    sessionId: string;
    memoryType: AgentMemoryType;
    content: string;
    sourceMessageIds?: string[];
    importance?: number;
    metadata?: Record<string, unknown>;
    expiresAt?: string | null;
  }
) {
  const query = client.from("agent_memory_items").insert({
    employer_user_id: input.employerUserId,
    employer_job_id: input.employerJobId,
    session_id: input.sessionId,
    memory_type: input.memoryType,
    content: input.content.trim(),
    source_message_ids: input.sourceMessageIds ?? [],
    importance: clampImportance(input.importance),
    metadata: input.metadata ?? {},
    expires_at: input.expiresAt ?? null
  }) as {
    select: (columns: string) => {
      single: () => Promise<QueryResult<AgentMemoryItemRecord>>;
    };
  };

  return assertQueryResult(await query.select("*").single(), "create agent memory item");
}

export async function upsertAgentMemorySummary(
  client: AgentMemoryClient,
  input: {
    employerUserId: string;
    employerJobId: string;
    sessionId: string;
    summaryText: string;
    unresolvedGaps: string[];
    keyDecisions: string[];
    compactedMessageCount: number;
  }
) {
  const query = (client.from("agent_memory_summaries") as unknown as {
    upsert: (values: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<QueryResult<AgentMemorySummaryRecord>>;
      };
    };
  }).upsert({
    employer_user_id: input.employerUserId,
    employer_job_id: input.employerJobId,
    session_id: input.sessionId,
    summary_text: input.summaryText,
    unresolved_gaps: input.unresolvedGaps,
    key_decisions: input.keyDecisions,
    compacted_message_count: input.compactedMessageCount
  });

  return assertQueryResult(await query.select("*").single(), "upsert agent memory summary");
}

export function buildCompactSummaryFromOutput(input: {
  output: JobPostingAgentOutput;
  latestEmployerMessage: string;
  messageCount: number;
}) {
  const title = input.output.title.value.trim() || "Untitled role";
  const location = input.output.location.value.trim() || "Unspecified location";
  const compensation = input.output.compensationBand.value.trim() || "Unspecified compensation";
  const unresolved = input.output.missingCriticalFields.filter((item) => item.trim().length > 0);
  const decisions = [
    `Role: ${title}`,
    `Location: ${location}`,
    `Compensation: ${compensation}`,
    `Level: ${input.output.level.value.trim() || "Unspecified level"}`
  ];
  const summaryText = [
    `Latest employer instruction: ${input.latestEmployerMessage.trim()}`,
    `Current draft focus: ${input.output.hiringProblem.trim()}`,
    `Readiness: ${unresolved.length ? "Missing publish-critical fields remain." : "No critical fields missing."}`
  ].join("\n");

  return {
    summaryText,
    unresolvedGaps: unresolved,
    keyDecisions: decisions,
    compactedMessageCount:
      input.messageCount >= COMPACTION_MESSAGE_THRESHOLD ? input.messageCount : 0,
    compacted: input.messageCount >= COMPACTION_MESSAGE_THRESHOLD
  };
}

export function deriveMemoryItemsFromOutput(input: {
  output: JobPostingAgentOutput;
  sourceMessageIds: string[];
}) {
  const items: Array<{
    memoryType: AgentMemoryType;
    content: string;
    importance: number;
    metadata?: Record<string, unknown>;
  }> = [];

  const constraints = [
    `Title=${input.output.title.value}`,
    `Department=${input.output.department.value}`,
    `Level=${input.output.level.value}`,
    `Location=${input.output.location.value}`,
    `Compensation=${input.output.compensationBand.value}`
  ];

  for (const constraint of constraints) {
    items.push({
      memoryType: "constraint",
      content: constraint,
      importance: 4
    });
  }

  for (const assumption of input.output.assumptions.slice(0, 3)) {
    items.push({
      memoryType: "summary_fragment",
      content: assumption,
      importance: 2
    });
  }

  for (const field of input.output.missingCriticalFields.slice(0, 3)) {
    items.push({
      memoryType: "unresolved_gap",
      content: `Missing critical field: ${field}`,
      importance: 5
    });
  }

  items.push({
    memoryType: "publish_readiness",
    content: input.output.missingCriticalFields.length
      ? "Draft is not publish-ready. Missing critical fields remain."
      : "Draft is publish-ready for employer review.",
    importance: 5,
    metadata: {
      followUpQuestions: input.output.followUpQuestions.slice(0, 3)
    }
  });

  return items.map((item) => ({
    ...item,
    sourceMessageIds: input.sourceMessageIds
  }));
}

export function retrieveScopedMemory(input: {
  query: string;
  summary: AgentMemorySummaryRecord | null;
  items: AgentMemoryItemRecord[];
  maxItems?: number;
}) {
  const ranked = input.items
    .map((item) => {
      const overlap = countTokenOverlap(input.query, item.content);
      const recencyBoost = Date.parse(item.created_at) / 1_000_000_000_000;
      const score = overlap * 3 + item.importance + recencyBoost;
      return {
        item,
        score
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, input.maxItems ?? DEFAULT_MAX_RETRIEVED_ITEMS)
    .map((entry) => entry.item);

  return {
    summary: input.summary,
    retrievedItems: ranked
  };
}

export function renderRetrievedMemoryForPrompt(memory: ScopedMemoryDocument) {
  const sections: string[] = [];

  if (memory.summary?.summary_text.trim()) {
    sections.push(["Session memory summary:", memory.summary.summary_text.trim()].join("\n"));
  }

  if (memory.summary?.key_decisions.length) {
    sections.push(
      ["Key decisions:", ...memory.summary.key_decisions.map((item) => `- ${item}`)].join("\n")
    );
  }

  if (memory.summary?.unresolved_gaps.length) {
    sections.push(
      ["Unresolved gaps:", ...memory.summary.unresolved_gaps.map((item) => `- ${item}`)].join("\n")
    );
  }

  if (memory.retrievedItems.length) {
    sections.push(
      [
        "Retrieved memory items:",
        ...memory.retrievedItems.map(
          (item) => `- [${item.memory_type}] ${item.content} (importance=${item.importance})`
        )
      ].join("\n")
    );
  }

  if (!sections.length) {
    return "No prior memory available.";
  }

  return sections.join("\n\n");
}

export function toMemorySummaryRecord(value: AgentMemorySummaryRecord | null) {
  return value
    ? {
        id: value.id,
        summaryText: value.summary_text,
        unresolvedGaps: toStringArray(value.unresolved_gaps),
        keyDecisions: toStringArray(value.key_decisions),
        compactedMessageCount: value.compacted_message_count,
        updatedAt: value.updated_at
      }
    : null;
}
