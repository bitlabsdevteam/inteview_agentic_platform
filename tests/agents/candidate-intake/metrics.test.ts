import { describe, expect, it } from "vitest";

import {
  buildCandidateExtractionMetricsInsert,
  createCandidateExtractionMetricsRecord,
  listCandidateExtractionMetricsByJob,
  summarizeCandidateExtractionQuality,
  type CandidateExtractionMetricsInput
} from "@/lib/agents/candidate-intake/metrics";

const metricsInput: CandidateExtractionMetricsInput = {
  employerUserId: "employer-user-1",
  employerJobId: "job-1",
  candidateIntakeId: "intake-1",
  validationFailureCount: 2,
  normalizationRepairCount: 3,
  extractionSucceeded: true,
  failureReason: null,
  metadata: {
    profileSchemaVersion: "v1",
    extractionRunId: "run-1"
  }
};

function createInsertClient(returned: unknown) {
  const calls: Array<{ table: string; values: unknown; columns?: string }> = [];
  const client = {
    from(table: string) {
      return {
        insert(values: unknown) {
          calls.push({ table, values });

          return {
            select(columns: string) {
              calls[calls.length - 1].columns = columns;

              return {
                single: async () => ({
                  data: returned,
                  error: null
                })
              };
            }
          };
        }
      };
    }
  };

  return { client, calls };
}

describe("candidate extraction metrics", () => {
  it("builds extraction metrics inserts with quality counters", () => {
    expect(buildCandidateExtractionMetricsInsert(metricsInput)).toEqual({
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      candidate_intake_id: "intake-1",
      validation_failure_count: 2,
      normalization_repair_count: 3,
      extraction_succeeded: true,
      failure_reason: null,
      metadata: {
        profileSchemaVersion: "v1",
        extractionRunId: "run-1"
      }
    });
  });

  it("creates extraction metric records", async () => {
    const record = {
      id: "metric-1",
      ...buildCandidateExtractionMetricsInsert(metricsInput),
      created_at: "2026-04-27T00:00:00.000Z",
      updated_at: "2026-04-27T00:00:00.000Z"
    };
    const { client, calls } = createInsertClient(record);

    await expect(createCandidateExtractionMetricsRecord(client, metricsInput)).resolves.toEqual(record);
    expect(calls).toEqual([
      {
        table: "candidate_extraction_metrics",
        values: buildCandidateExtractionMetricsInsert(metricsInput),
        columns: "*"
      }
    ]);
  });

  it("lists extraction metrics by employer owner and job scope", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      from(table: string) {
        calls.push({ table });

        return {
          select(columns: string) {
            calls.push({ select: columns });

            return {
              eq(column: string, value: string) {
                calls.push({ eq: [column, value] });

                return {
                  eq(nextColumn: string, nextValue: string) {
                    calls.push({ eq: [nextColumn, nextValue] });

                    return {
                      order(orderColumn: string, options: { ascending: boolean }) {
                        calls.push({ order: [orderColumn, options] });

                        return Promise.resolve({
                          data: [],
                          error: null
                        });
                      }
                    };
                  }
                };
              }
            };
          }
        };
      }
    };

    await expect(
      listCandidateExtractionMetricsByJob(client, "employer-user-1", "job-1")
    ).resolves.toEqual([]);
    expect(calls).toEqual([
      { table: "candidate_extraction_metrics" },
      { select: "*" },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] },
      { order: ["created_at", { ascending: false }] }
    ]);
  });

  it("summarizes extraction quality counters for a job", () => {
    const summary = summarizeCandidateExtractionQuality([
      {
        id: "m1",
        employer_user_id: "employer-user-1",
        employer_job_id: "job-1",
        candidate_intake_id: "intake-1",
        validation_failure_count: 2,
        normalization_repair_count: 1,
        extraction_succeeded: true,
        failure_reason: null,
        metadata: {},
        created_at: "2026-04-27T00:00:00.000Z",
        updated_at: "2026-04-27T00:00:00.000Z"
      },
      {
        id: "m2",
        employer_user_id: "employer-user-1",
        employer_job_id: "job-1",
        candidate_intake_id: "intake-2",
        validation_failure_count: 3,
        normalization_repair_count: 2,
        extraction_succeeded: false,
        failure_reason: "schema_validation_failed",
        metadata: {},
        created_at: "2026-04-27T00:00:00.000Z",
        updated_at: "2026-04-27T00:00:00.000Z"
      }
    ]);

    expect(summary).toEqual({
      totalRuns: 2,
      successfulRuns: 1,
      failedRuns: 1,
      validationFailureCount: 5,
      normalizationRepairCount: 3
    });
  });
});
