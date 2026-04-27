export type CandidateExtractionMetricsInput = {
  employerUserId: string;
  employerJobId: string;
  candidateIntakeId: string | null;
  validationFailureCount: number;
  normalizationRepairCount: number;
  extractionSucceeded: boolean;
  failureReason: string | null;
  metadata?: Record<string, unknown>;
};

export type CandidateExtractionMetricsRecord = {
  id: string;
  employer_user_id: string;
  employer_job_id: string;
  candidate_intake_id: string | null;
  validation_failure_count: number;
  normalization_repair_count: number;
  extraction_succeeded: boolean;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CandidateExtractionMetricsInsert = Omit<
  CandidateExtractionMetricsRecord,
  "id" | "created_at" | "updated_at"
>;

export type CandidateExtractionQualitySummary = {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  validationFailureCount: number;
  normalizationRepairCount: number;
};

type QueryResult<T> = {
  data: T;
  error: { message?: string } | null;
};

type CandidateMetricsClient = {
  from: (table: "candidate_extraction_metrics") => {
    select: (columns: string) => unknown;
    insert: (values: CandidateExtractionMetricsInsert) => unknown;
  };
};

function assertQueryResult<T>(result: QueryResult<T>, operation: string) {
  if (result.error) {
    throw new Error(result.error.message ?? `Unable to ${operation}.`);
  }

  return result.data;
}

function clampCount(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export function buildCandidateExtractionMetricsInsert(
  input: CandidateExtractionMetricsInput
): CandidateExtractionMetricsInsert {
  return {
    employer_user_id: input.employerUserId,
    employer_job_id: input.employerJobId,
    candidate_intake_id: input.candidateIntakeId,
    validation_failure_count: clampCount(input.validationFailureCount),
    normalization_repair_count: clampCount(input.normalizationRepairCount),
    extraction_succeeded: input.extractionSucceeded,
    failure_reason: input.failureReason,
    metadata: input.metadata ?? {}
  };
}

export async function createCandidateExtractionMetricsRecord(
  client: CandidateMetricsClient,
  input: CandidateExtractionMetricsInput
) {
  const query = client
    .from("candidate_extraction_metrics")
    .insert(buildCandidateExtractionMetricsInsert(input)) as {
    select: (columns: string) => {
      single: () => Promise<QueryResult<CandidateExtractionMetricsRecord>>;
    };
  };

  return assertQueryResult(
    await query.select("*").single(),
    "create candidate extraction metrics record"
  );
}

export async function listCandidateExtractionMetricsByJob(
  client: CandidateMetricsClient,
  employerUserId: string,
  employerJobId: string
) {
  const query = client.from("candidate_extraction_metrics").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          options: { ascending: boolean }
        ) => Promise<QueryResult<CandidateExtractionMetricsRecord[]>>;
      };
    };
  };

  return assertQueryResult(
    await query
      .eq("employer_user_id", employerUserId)
      .eq("employer_job_id", employerJobId)
      .order("created_at", { ascending: false }),
    "list candidate extraction metrics by job"
  );
}

export function summarizeCandidateExtractionQuality(
  records: CandidateExtractionMetricsRecord[]
): CandidateExtractionQualitySummary {
  const summary: CandidateExtractionQualitySummary = {
    totalRuns: records.length,
    successfulRuns: 0,
    failedRuns: 0,
    validationFailureCount: 0,
    normalizationRepairCount: 0
  };

  for (const record of records) {
    summary.validationFailureCount += clampCount(record.validation_failure_count);
    summary.normalizationRepairCount += clampCount(record.normalization_repair_count);

    if (record.extraction_succeeded) {
      summary.successfulRuns += 1;
    } else {
      summary.failedRuns += 1;
    }
  }

  return summary;
}
