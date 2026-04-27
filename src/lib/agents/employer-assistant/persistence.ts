import type {
  EmployerAssistantEvidenceReference,
  EmployerAssistantRecommendationAction,
  EmployerAssistantRiskFlag
} from "@/lib/agents/employer-assistant/schema";

export type EmployerAssistantRecommendationInput = {
  employerUserId: string;
  employerJobId: string;
  candidateProfileId: string;
  action: EmployerAssistantRecommendationAction;
  rationale: string;
  evidenceReferences: EmployerAssistantEvidenceReference[];
  riskFlags: EmployerAssistantRiskFlag[];
  promptKey: string;
  promptVersion: string;
  promptChecksum: string;
  provider: string;
  model?: string | null;
  providerResponseId?: string | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown>;
};

export type EmployerAssistantRecommendationRecord = {
  id: string;
  employer_user_id: string;
  employer_job_id: string;
  candidate_profile_id: string;
  action: EmployerAssistantRecommendationAction;
  rationale: string;
  evidence_references: EmployerAssistantEvidenceReference[];
  risk_flags: EmployerAssistantRiskFlag[];
  prompt_key: string;
  prompt_version: string;
  prompt_checksum: string;
  provider: string;
  model: string | null;
  provider_response_id: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EmployerAssistantRecommendationInsert = Omit<
  EmployerAssistantRecommendationRecord,
  "id" | "created_at" | "updated_at"
>;

export type EmployerAssistantScreeningKitInput = {
  recommendationId: string;
  employerUserId: string;
  employerJobId: string;
  candidateProfileId: string;
  title: string;
  objective: string;
  metadata?: Record<string, unknown>;
};

export type EmployerAssistantScreeningKitRecord = {
  id: string;
  recommendation_id: string;
  employer_user_id: string;
  employer_job_id: string;
  candidate_profile_id: string;
  title: string;
  objective: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EmployerAssistantScreeningKitInsert = Omit<
  EmployerAssistantScreeningKitRecord,
  "id" | "created_at" | "updated_at"
>;

export type EmployerAssistantScreeningQuestionInput = {
  screeningKitId: string;
  employerUserId: string;
  employerJobId: string;
  candidateProfileId: string;
  questionOrder: number;
  questionText: string;
  rubricDimension: string;
  rubricGuidance: string;
  isUncertaintyProbe: boolean;
  metadata?: Record<string, unknown>;
};

export type EmployerAssistantScreeningQuestionRecord = {
  id: string;
  screening_kit_id: string;
  employer_user_id: string;
  employer_job_id: string;
  candidate_profile_id: string;
  question_order: number;
  question_text: string;
  rubric_dimension: string;
  rubric_guidance: string;
  is_uncertainty_probe: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EmployerAssistantScreeningQuestionInsert = Omit<
  EmployerAssistantScreeningQuestionRecord,
  "id" | "created_at" | "updated_at"
>;

type QueryResult<T> = {
  data: T;
  error: { message?: string } | null;
};

type EmployerAssistantPersistenceClient = {
  from: (
    table:
      | "employer_assistant_recommendations"
      | "employer_assistant_screening_kits"
      | "employer_assistant_screening_questions"
  ) => {
    select: (columns: string) => unknown;
    insert: (
      values:
        | EmployerAssistantRecommendationInsert
        | EmployerAssistantScreeningKitInsert
        | EmployerAssistantScreeningQuestionInsert
    ) => unknown;
  };
};

function assertQueryResult<T>(result: QueryResult<T>, operation: string) {
  if (result.error) {
    throw new Error(result.error.message ?? `Unable to ${operation}.`);
  }

  return result.data;
}

function normalizeQuestionOrder(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

export function buildEmployerAssistantRecommendationInsert(
  input: EmployerAssistantRecommendationInput
): EmployerAssistantRecommendationInsert {
  return {
    employer_user_id: input.employerUserId,
    employer_job_id: input.employerJobId,
    candidate_profile_id: input.candidateProfileId,
    action: input.action,
    rationale: input.rationale,
    evidence_references: input.evidenceReferences,
    risk_flags: input.riskFlags,
    prompt_key: input.promptKey,
    prompt_version: input.promptVersion,
    prompt_checksum: input.promptChecksum,
    provider: input.provider,
    model: input.model ?? null,
    provider_response_id: input.providerResponseId ?? null,
    failure_reason: input.failureReason ?? null,
    metadata: input.metadata ?? {}
  };
}

export function buildEmployerAssistantScreeningKitInsert(
  input: EmployerAssistantScreeningKitInput
): EmployerAssistantScreeningKitInsert {
  return {
    recommendation_id: input.recommendationId,
    employer_user_id: input.employerUserId,
    employer_job_id: input.employerJobId,
    candidate_profile_id: input.candidateProfileId,
    title: input.title,
    objective: input.objective,
    metadata: input.metadata ?? {}
  };
}

export function buildEmployerAssistantScreeningQuestionInsert(
  input: EmployerAssistantScreeningQuestionInput
): EmployerAssistantScreeningQuestionInsert {
  return {
    screening_kit_id: input.screeningKitId,
    employer_user_id: input.employerUserId,
    employer_job_id: input.employerJobId,
    candidate_profile_id: input.candidateProfileId,
    question_order: normalizeQuestionOrder(input.questionOrder),
    question_text: input.questionText,
    rubric_dimension: input.rubricDimension,
    rubric_guidance: input.rubricGuidance,
    is_uncertainty_probe: input.isUncertaintyProbe,
    metadata: input.metadata ?? {}
  };
}

export async function createEmployerAssistantRecommendation(
  client: EmployerAssistantPersistenceClient,
  input: EmployerAssistantRecommendationInput
) {
  const query = client
    .from("employer_assistant_recommendations")
    .insert(buildEmployerAssistantRecommendationInsert(input)) as {
    select: (columns: string) => {
      single: () => Promise<QueryResult<EmployerAssistantRecommendationRecord>>;
    };
  };

  return assertQueryResult(await query.select("*").single(), "create employer assistant recommendation");
}

export async function createEmployerAssistantScreeningKit(
  client: EmployerAssistantPersistenceClient,
  input: EmployerAssistantScreeningKitInput
) {
  const query = client
    .from("employer_assistant_screening_kits")
    .insert(buildEmployerAssistantScreeningKitInsert(input)) as {
    select: (columns: string) => {
      single: () => Promise<QueryResult<EmployerAssistantScreeningKitRecord>>;
    };
  };

  return assertQueryResult(await query.select("*").single(), "create employer assistant screening kit");
}

export async function createEmployerAssistantScreeningQuestion(
  client: EmployerAssistantPersistenceClient,
  input: EmployerAssistantScreeningQuestionInput
) {
  const query = client
    .from("employer_assistant_screening_questions")
    .insert(buildEmployerAssistantScreeningQuestionInsert(input)) as {
    select: (columns: string) => {
      single: () => Promise<QueryResult<EmployerAssistantScreeningQuestionRecord>>;
    };
  };

  return assertQueryResult(
    await query.select("*").single(),
    "create employer assistant screening question"
  );
}

export async function listEmployerAssistantRecommendationsByCandidate(
  client: EmployerAssistantPersistenceClient,
  employerUserId: string,
  employerJobId: string,
  candidateProfileId: string
) {
  const query = client.from("employer_assistant_recommendations").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          order: (
            column: string,
            options: { ascending: boolean }
          ) => Promise<QueryResult<EmployerAssistantRecommendationRecord[]>>;
        };
      };
    };
  };

  return assertQueryResult(
    await query
      .eq("employer_user_id", employerUserId)
      .eq("employer_job_id", employerJobId)
      .eq("candidate_profile_id", candidateProfileId)
      .order("created_at", { ascending: false }),
    "list employer assistant recommendations by candidate"
  );
}

export async function getLatestEmployerAssistantRecommendationByCandidate(
  client: EmployerAssistantPersistenceClient,
  employerUserId: string,
  employerJobId: string,
  candidateProfileId: string
) {
  const query = client.from("employer_assistant_recommendations").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          order: (
            column: string,
            options: { ascending: boolean }
          ) => {
            limit: (value: number) => {
              maybeSingle: () => Promise<QueryResult<EmployerAssistantRecommendationRecord | null>>;
            };
          };
        };
      };
    };
  };

  return assertQueryResult(
    await query
      .eq("employer_user_id", employerUserId)
      .eq("employer_job_id", employerJobId)
      .eq("candidate_profile_id", candidateProfileId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "get latest employer assistant recommendation by candidate"
  );
}

export async function getEmployerAssistantScreeningKitByRecommendation(
  client: EmployerAssistantPersistenceClient,
  employerUserId: string,
  employerJobId: string,
  candidateProfileId: string,
  recommendationId: string
) {
  const query = client.from("employer_assistant_screening_kits").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {
            maybeSingle: () => Promise<QueryResult<EmployerAssistantScreeningKitRecord | null>>;
          };
        };
      };
    };
  };

  return assertQueryResult(
    await query
      .eq("recommendation_id", recommendationId)
      .eq("employer_user_id", employerUserId)
      .eq("employer_job_id", employerJobId)
      .eq("candidate_profile_id", candidateProfileId)
      .maybeSingle(),
    "get employer assistant screening kit by recommendation"
  );
}

export async function listEmployerAssistantScreeningKitsByCandidate(
  client: EmployerAssistantPersistenceClient,
  employerUserId: string,
  employerJobId: string,
  candidateProfileId: string
) {
  const query = client.from("employer_assistant_screening_kits").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          order: (
            column: string,
            options: { ascending: boolean }
          ) => Promise<QueryResult<EmployerAssistantScreeningKitRecord[]>>;
        };
      };
    };
  };

  return assertQueryResult(
    await query
      .eq("employer_user_id", employerUserId)
      .eq("employer_job_id", employerJobId)
      .eq("candidate_profile_id", candidateProfileId)
      .order("created_at", { ascending: false }),
    "list employer assistant screening kits by candidate"
  );
}

export async function listEmployerAssistantScreeningQuestionsByKit(
  client: EmployerAssistantPersistenceClient,
  employerUserId: string,
  employerJobId: string,
  candidateProfileId: string,
  screeningKitId: string
) {
  const query = client.from("employer_assistant_screening_questions").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {
            order: (
              column: string,
              options: { ascending: boolean }
            ) => Promise<QueryResult<EmployerAssistantScreeningQuestionRecord[]>>;
          };
        };
      };
    };
  };

  return assertQueryResult(
    await query
      .eq("screening_kit_id", screeningKitId)
      .eq("employer_user_id", employerUserId)
      .eq("employer_job_id", employerJobId)
      .eq("candidate_profile_id", candidateProfileId)
      .order("question_order", { ascending: true }),
    "list employer assistant screening questions by kit"
  );
}
