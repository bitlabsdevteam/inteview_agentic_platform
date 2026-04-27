import { describe, expect, it } from "vitest";

import {
  buildCandidateIntakeRecordInsert,
  buildCandidateProfileInsert,
  createCandidateIntakeRecord,
  createCandidateProfile,
  getCandidateProfileById,
  listCandidateProfilesByJob,
  listCandidateIntakeRecordsByJob,
  type CandidateIntakeRecordInput,
  type CandidateProfileInput
} from "@/lib/agents/candidate-intake/persistence";

const intakeInput: CandidateIntakeRecordInput = {
  employerUserId: "employer-user-1",
  employerJobId: "job-1",
  fullName: "Jamie Rivera",
  email: "jamie@example.com",
  phone: "+1-555-0100",
  resume: {
    storagePath: "employers/employer-user-1/jobs/job-1/candidates/jamie.pdf",
    fileName: "jamie.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 200000
  },
  sourceText: "Senior engineer with AI workflow experience.",
  status: "received"
};

const profileInput: CandidateProfileInput = {
  candidateIntakeId: "intake-1",
  employerUserId: "employer-user-1",
  employerJobId: "job-1",
  profile: {
    summary: "Senior engineer focused on AI workflow delivery.",
    skills: ["TypeScript", "Postgres"],
    workExperience: ["Led AI hiring workflow implementation."],
    education: ["B.S. Computer Science"],
    confidence: {
      summary: 0.93,
      skills: 0.89,
      workExperience: 0.86,
      education: 0.8,
      overall: 0.88
    }
  },
  audit: {
    modelId: "gpt-5.5",
    providerResponseId: "resp_123",
    promptChecksum: "sha256:abc"
  },
  candidateScore: {
    requirementFitScores: {
      hardSkills: 0.91,
      roleExperience: 0.84,
      domainContext: 0.79,
      educationSignals: 0.74,
      overall: 0.82
    },
    aggregateScore: 0.83,
    scoreVersion: "v1-requirement-fit",
    evidenceSnippets: [
      "Matched TypeScript + Postgres requirements from profile skills.",
      "Matched AI hiring workflow requirement from work experience."
    ]
  },
  scoreAudit: {
    scorer: "deterministic_requirement_fit",
    scorerModelId: null,
    scoreComputationChecksum: "sha256:score-123"
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

describe("candidate intake persistence", () => {
  it("builds candidate intake inserts from normalized intake payload", () => {
    expect(buildCandidateIntakeRecordInsert(intakeInput)).toEqual({
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      full_name: "Jamie Rivera",
      email: "jamie@example.com",
      phone: "+1-555-0100",
      resume_storage_path: "employers/employer-user-1/jobs/job-1/candidates/jamie.pdf",
      resume_file_name: "jamie.pdf",
      resume_mime_type: "application/pdf",
      resume_file_size_bytes: 200000,
      source_text: "Senior engineer with AI workflow experience.",
      status: "received"
    });
  });

  it("builds candidate profile inserts with audit metadata and per-field confidence", () => {
    expect(buildCandidateProfileInsert(profileInput)).toEqual({
      candidate_intake_id: "intake-1",
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      summary: "Senior engineer focused on AI workflow delivery.",
      skills: ["TypeScript", "Postgres"],
      work_experience: ["Led AI hiring workflow implementation."],
      education: ["B.S. Computer Science"],
      confidence: {
        summary: 0.93,
        skills: 0.89,
        workExperience: 0.86,
        education: 0.8,
        overall: 0.88
      },
      model_id: "gpt-5.5",
      provider_response_id: "resp_123",
      prompt_checksum: "sha256:abc",
      requirement_fit_scores: {
        hardSkills: 0.91,
        roleExperience: 0.84,
        domainContext: 0.79,
        educationSignals: 0.74,
        overall: 0.82
      },
      aggregate_score: 0.83,
      score_version: "v1-requirement-fit",
      score_evidence_snippets: [
        "Matched TypeScript + Postgres requirements from profile skills.",
        "Matched AI hiring workflow requirement from work experience."
      ],
      extraction_metadata: {
        modelId: "gpt-5.5",
        providerResponseId: "resp_123",
        promptChecksum: "sha256:abc",
        scoringAudit: {
          scorer: "deterministic_requirement_fit",
          scorerModelId: null,
          scoreComputationChecksum: "sha256:score-123"
        }
      }
    });
  });

  it("does not persist hidden reasoning artifacts when score fields are written", () => {
    const insert = buildCandidateProfileInsert(profileInput) as Record<string, unknown>;
    const metadata = insert.extraction_metadata as Record<string, unknown>;

    expect(insert).not.toHaveProperty("reasoning_trace");
    expect(insert).not.toHaveProperty("chain_of_thought");
    expect(metadata).not.toHaveProperty("reasoningSummary");
    expect(metadata).not.toHaveProperty("thinkingMessages");
    expect(metadata).not.toHaveProperty("actionLog");
  });

  it("creates intake records in candidate_intake_records", async () => {
    const record = {
      id: "intake-1",
      ...buildCandidateIntakeRecordInsert(intakeInput),
      created_at: "2026-04-26T00:00:00.000Z",
      updated_at: "2026-04-26T00:00:00.000Z"
    };
    const { client, calls } = createInsertClient(record);

    await expect(createCandidateIntakeRecord(client, intakeInput)).resolves.toEqual(record);
    expect(calls).toEqual([
      {
        table: "candidate_intake_records",
        values: buildCandidateIntakeRecordInsert(intakeInput),
        columns: "*"
      }
    ]);
  });

  it("creates candidate profiles in candidate_profiles", async () => {
    const record = {
      id: "profile-1",
      ...buildCandidateProfileInsert(profileInput),
      created_at: "2026-04-26T00:00:00.000Z",
      updated_at: "2026-04-26T00:00:00.000Z"
    };
    const { client, calls } = createInsertClient(record);

    await expect(createCandidateProfile(client, profileInput)).resolves.toEqual(record);
    expect(calls).toEqual([
      {
        table: "candidate_profiles",
        values: buildCandidateProfileInsert(profileInput),
        columns: "*"
      }
    ]);
  });

  it("lists candidate intake records scoped by employer owner and job", async () => {
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
      listCandidateIntakeRecordsByJob(client, "employer-user-1", "job-1")
    ).resolves.toEqual([]);
    expect(calls).toEqual([
      { table: "candidate_intake_records" },
      { select: "*" },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] },
      { order: ["created_at", { ascending: false }] }
    ]);
  });

  it("lists candidate intake records with optional status filters", async () => {
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
                      in(column: string, value: string[]) {
                        calls.push({ in: [column, value] });

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
      }
    };

    await expect(
      listCandidateIntakeRecordsByJob(client, "employer-user-1", "job-1", {
        statuses: ["processing", "profile_ready"]
      })
    ).resolves.toEqual([]);

    expect(calls).toEqual([
      { table: "candidate_intake_records" },
      { select: "*" },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] },
      { in: ["status", ["processing", "profile_ready"]] },
      { order: ["created_at", { ascending: false }] }
    ]);
  });

  it("lists candidate profiles with skill filter, confidence threshold, and score sorting", async () => {
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
                      contains(column: string, value: unknown) {
                        calls.push({ contains: [column, value] });

                        return {
                          filter(column: string, operator: string, value: string) {
                            calls.push({ filter: [column, operator, value] });

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
          }
        };
      }
    };

    await expect(
      listCandidateProfilesByJob(client, "employer-user-1", "job-1", {
        skill: "TypeScript",
        minimumOverallConfidence: 0.8,
        sortBy: "aggregate_score_desc"
      })
    ).resolves.toEqual([]);

    expect(calls).toEqual([
      { table: "candidate_profiles" },
      { select: "*" },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] },
      { contains: ["skills", ["TypeScript"]] },
      { filter: ["confidence->>overall", "gte", "0.8"] },
      { order: ["aggregate_score", { ascending: false }] }
    ]);
  });

  it("loads candidate profile by id with strict owner and job scope constraints", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const expected = {
      id: "profile-1",
      candidate_intake_id: "intake-1",
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1"
    };
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
                      eq(lastColumn: string, lastValue: string) {
                        calls.push({ eq: [lastColumn, lastValue] });

                        return {
                          maybeSingle() {
                            return Promise.resolve({
                              data: expected,
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
      }
    };

    await expect(
      getCandidateProfileById(client, "employer-user-1", "job-1", "profile-1")
    ).resolves.toEqual(expected);
    expect(calls).toEqual([
      { table: "candidate_profiles" },
      { select: "*" },
      { eq: ["id", "profile-1"] },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] }
    ]);
  });

  it("keeps owner/job scope constraints when falling back to candidate intake id lookup", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const expected = {
      id: "profile-1",
      candidate_intake_id: "intake-1",
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1"
    };
    let maybeSingleCount = 0;
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
                      eq(lastColumn: string, lastValue: string) {
                        calls.push({ eq: [lastColumn, lastValue] });

                        return {
                          maybeSingle() {
                            maybeSingleCount += 1;
                            return Promise.resolve({
                              data: maybeSingleCount === 1 ? null : expected,
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
      }
    };

    await expect(
      getCandidateProfileById(client, "employer-user-1", "job-1", "intake-1")
    ).resolves.toEqual(expected);
    expect(calls).toEqual([
      { table: "candidate_profiles" },
      { select: "*" },
      { eq: ["id", "intake-1"] },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] },
      { table: "candidate_profiles" },
      { select: "*" },
      { eq: ["candidate_intake_id", "intake-1"] },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] }
    ]);
  });
});
