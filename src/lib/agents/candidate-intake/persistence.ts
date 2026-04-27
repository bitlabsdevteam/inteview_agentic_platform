import type {
  CandidateExtractionOutput,
  CandidateIntakePayload,
  CandidateProfilePersistenceInput
} from "@/lib/agents/candidate-intake/schema";

export const CANDIDATE_INTAKE_STATUSES = [
  "received",
  "processing",
  "profile_ready",
  "failed"
] as const;

export type CandidateIntakeStatus = (typeof CANDIDATE_INTAKE_STATUSES)[number];

export type CandidateIntakeRecordInput = CandidateIntakePayload & {
  status: CandidateIntakeStatus;
};

export type CandidateIntakeRecord = {
  id: string;
  employer_user_id: string;
  employer_job_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  resume_storage_path: string;
  resume_file_name: string;
  resume_mime_type: string;
  resume_file_size_bytes: number;
  source_text: string | null;
  status: CandidateIntakeStatus;
  created_at: string;
  updated_at: string;
};

export type CandidateIntakeRecordInsert = Omit<
  CandidateIntakeRecord,
  "id" | "created_at" | "updated_at"
>;

export type CandidateProfileInput = CandidateProfilePersistenceInput;

export type CandidateProfileRecord = {
  id: string;
  candidate_intake_id: string;
  employer_user_id: string;
  employer_job_id: string;
  summary: string;
  skills: string[];
  work_experience: string[];
  education: string[];
  confidence: CandidateExtractionOutput["confidence"];
  model_id: string | null;
  provider_response_id: string | null;
  prompt_checksum: string | null;
  requirement_fit_scores: Record<string, unknown>;
  aggregate_score: number | null;
  score_version: string | null;
  score_evidence_snippets: string[];
  extraction_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CandidateProfileInsert = Omit<
  CandidateProfileRecord,
  "id" | "created_at" | "updated_at"
>;

export type CandidateIntakeListFilters = {
  statuses?: CandidateIntakeStatus[];
};

export type CandidateProfileListSort =
  | "aggregate_score_desc"
  | "aggregate_score_asc"
  | "created_at_desc"
  | "created_at_asc";

export type CandidateProfileListFilters = {
  skill?: string;
  minimumOverallConfidence?: number;
  sortBy?: CandidateProfileListSort;
};

type QueryResult<T> = {
  data: T;
  error: { message?: string } | null;
};

type CandidatePersistenceClient = {
  from: (table: "candidate_intake_records" | "candidate_profiles") => {
    select: (columns: string) => unknown;
    insert: (values: CandidateIntakeRecordInsert | CandidateProfileInsert) => unknown;
  };
};

function assertQueryResult<T>(result: QueryResult<T>, operation: string) {
  if (result.error) {
    throw new Error(result.error.message ?? `Unable to ${operation}.`);
  }

  return result.data;
}

function toNullableText(value: string | undefined) {
  return value ?? null;
}

export function buildCandidateIntakeRecordInsert(
  input: CandidateIntakeRecordInput
): CandidateIntakeRecordInsert {
  return {
    employer_user_id: input.employerUserId,
    employer_job_id: input.employerJobId,
    full_name: input.fullName,
    email: toNullableText(input.email),
    phone: toNullableText(input.phone),
    resume_storage_path: input.resume.storagePath,
    resume_file_name: input.resume.fileName,
    resume_mime_type: input.resume.mimeType,
    resume_file_size_bytes: input.resume.fileSizeBytes,
    source_text: toNullableText(input.sourceText),
    status: input.status
  };
}

export function buildCandidateProfileInsert(input: CandidateProfileInput): CandidateProfileInsert {
  const score = input.candidateScore;

  return {
    candidate_intake_id: input.candidateIntakeId,
    employer_user_id: input.employerUserId,
    employer_job_id: input.employerJobId,
    summary: input.profile.summary,
    skills: input.profile.skills,
    work_experience: input.profile.workExperience,
    education: input.profile.education,
    confidence: input.profile.confidence,
    model_id: input.audit.modelId,
    provider_response_id: input.audit.providerResponseId ?? null,
    prompt_checksum: input.audit.promptChecksum,
    requirement_fit_scores: score?.requirementFitScores ?? {},
    aggregate_score: score?.aggregateScore ?? null,
    score_version: score?.scoreVersion ?? null,
    score_evidence_snippets: score?.evidenceSnippets ?? [],
    extraction_metadata: {
      modelId: input.audit.modelId,
      providerResponseId: input.audit.providerResponseId ?? null,
      promptChecksum: input.audit.promptChecksum,
      scoringAudit: input.scoreAudit
        ? {
            scorer: input.scoreAudit.scorer,
            scorerModelId: input.scoreAudit.scorerModelId ?? null,
            scoreComputationChecksum: input.scoreAudit.scoreComputationChecksum ?? null
          }
        : null
    }
  };
}

export async function createCandidateIntakeRecord(
  client: CandidatePersistenceClient,
  input: CandidateIntakeRecordInput
) {
  const query = client
    .from("candidate_intake_records")
    .insert(buildCandidateIntakeRecordInsert(input)) as {
    select: (columns: string) => {
      single: () => Promise<QueryResult<CandidateIntakeRecord>>;
    };
  };

  return assertQueryResult(await query.select("*").single(), "create candidate intake record");
}

export async function createCandidateProfile(
  client: CandidatePersistenceClient,
  input: CandidateProfileInput
) {
  const query = client.from("candidate_profiles").insert(buildCandidateProfileInsert(input)) as {
    select: (columns: string) => {
      single: () => Promise<QueryResult<CandidateProfileRecord>>;
    };
  };

  return assertQueryResult(await query.select("*").single(), "create candidate profile");
}

export async function listCandidateIntakeRecordsByJob(
  client: CandidatePersistenceClient,
  employerUserId: string,
  employerJobId: string,
  filters: CandidateIntakeListFilters = {}
) {
  const query = client.from("candidate_intake_records").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        in?: (column: string, values: CandidateIntakeStatus[]) => {
          order: (
            column: string,
            options: { ascending: boolean }
          ) => Promise<QueryResult<CandidateIntakeRecord[]>>;
        };
        order: (
          column: string,
          options: { ascending: boolean }
        ) => Promise<QueryResult<CandidateIntakeRecord[]>>;
      };
    };
  };

  const scopedQuery = query.eq("employer_user_id", employerUserId).eq("employer_job_id", employerJobId);
  const statusFilteredQuery =
    filters.statuses && filters.statuses.length && scopedQuery.in
      ? scopedQuery.in("status", filters.statuses)
      : scopedQuery;

  return assertQueryResult(
    await statusFilteredQuery.order("created_at", { ascending: false }),
    "list candidate intake records by job"
  );
}

export async function listCandidateProfilesByJob(
  client: CandidatePersistenceClient,
  employerUserId: string,
  employerJobId: string,
  filters: CandidateProfileListFilters = {}
) {
  const query = client.from("candidate_profiles").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        contains?: (column: string, value: unknown) => {
          filter?: (column: string, operator: string, value: string) => {
            order: (
              column: string,
              options: { ascending: boolean }
            ) => Promise<QueryResult<CandidateProfileRecord[]>>;
          };
          order: (
            column: string,
            options: { ascending: boolean }
          ) => Promise<QueryResult<CandidateProfileRecord[]>>;
        };
        filter?: (column: string, operator: string, value: string) => {
          order: (
            column: string,
            options: { ascending: boolean }
          ) => Promise<QueryResult<CandidateProfileRecord[]>>;
        };
        order: (
          column: string,
          options: { ascending: boolean }
        ) => Promise<QueryResult<CandidateProfileRecord[]>>;
      };
    };
  };

  let scopedQuery: {
    order: (
      column: string,
      options: { ascending: boolean }
    ) => Promise<QueryResult<CandidateProfileRecord[]>>;
  } = query.eq("employer_user_id", employerUserId).eq("employer_job_id", employerJobId);

  const normalizedSkill = filters.skill?.trim();
  if (normalizedSkill && "contains" in scopedQuery && typeof scopedQuery.contains === "function") {
    scopedQuery = scopedQuery.contains("skills", [normalizedSkill]);
  }

  if (
    typeof filters.minimumOverallConfidence === "number" &&
    Number.isFinite(filters.minimumOverallConfidence) &&
    "filter" in scopedQuery &&
    typeof scopedQuery.filter === "function"
  ) {
    const clamped = Math.max(0, Math.min(1, filters.minimumOverallConfidence));
    scopedQuery = scopedQuery.filter("confidence->>overall", "gte", String(clamped));
  }

  const sortBy = filters.sortBy ?? "aggregate_score_desc";
  const sortColumn = sortBy.startsWith("created_at") ? "created_at" : "aggregate_score";
  const ascending = sortBy.endsWith("_asc");

  return assertQueryResult(
    await scopedQuery.order(sortColumn, { ascending }),
    "list candidate profiles by job"
  );
}

export async function getCandidateProfileById(
  client: CandidatePersistenceClient,
  employerUserId: string,
  employerJobId: string,
  candidateId: string
) {
  const byProfileIdQuery = client.from("candidate_profiles").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<QueryResult<CandidateProfileRecord | null>>;
        };
      };
    };
  };

  const byProfileId = assertQueryResult(
    await byProfileIdQuery
      .eq("id", candidateId)
      .eq("employer_user_id", employerUserId)
      .eq("employer_job_id", employerJobId)
      .maybeSingle(),
    "load candidate profile by id"
  );

  if (byProfileId) {
    return byProfileId;
  }

  const byIntakeIdQuery = client.from("candidate_profiles").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<QueryResult<CandidateProfileRecord | null>>;
        };
      };
    };
  };

  return assertQueryResult(
    await byIntakeIdQuery
      .eq("candidate_intake_id", candidateId)
      .eq("employer_user_id", employerUserId)
      .eq("employer_job_id", employerJobId)
      .maybeSingle(),
    "load candidate profile by intake id"
  );
}
