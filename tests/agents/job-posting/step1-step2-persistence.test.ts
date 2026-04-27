import { describe, expect, it } from "vitest";

import type { JobDescriptionQualityCheck } from "@/lib/agents/job-posting/quality-controls";
import type { RoleProfile } from "@/lib/agents/job-posting/role-profile";
import {
  buildEmployerJobQualityCheckInsert,
  buildEmployerJobRoleProfileUpsert,
  createEmployerJobQualityCheck,
  getEmployerJobRoleProfileBySession,
  listEmployerJobQualityChecksBySession,
  upsertEmployerJobRoleProfile
} from "@/lib/agents/job-posting/step1-step2-persistence";

const roleProfile: RoleProfile = {
  title: "Senior AI Product Engineer",
  department: "Engineering",
  level: "Senior",
  locationPolicy: "Remote US",
  compensationRange: "$180k-$220k",
  mustHaveRequirements: ["Next.js", "Postgres"],
  niceToHaveRequirements: ["Recruiting-tech experience"],
  businessOutcomes: ["Ship employer recruiting assistant roadmap"],
  interviewLoopIntent: ["Recruiter screen", "Technical architecture interview"],
  unresolvedConstraints: ["Hiring manager not yet confirmed"],
  conflicts: [],
  confidence: {
    title: 0.96,
    department: 0.92,
    level: 0.9,
    locationPolicy: 0.95,
    compensationRange: 0.9
  }
};

const qualityCheck: JobDescriptionQualityCheck = {
  checkType: "completeness",
  status: "pass",
  issues: [],
  suggestedRewrite: "No rewrite needed."
};

describe("step1-step2 persistence", () => {
  it("builds role profile upsert payload with strict owner/job/session scope", () => {
    expect(
      buildEmployerJobRoleProfileUpsert({
        employerUserId: "employer-user-1",
        employerJobId: "job-1",
        sessionId: "session-1",
        normalizedProfile: roleProfile,
        unresolvedConstraints: roleProfile.unresolvedConstraints,
        conflicts: roleProfile.conflicts,
        confidence: roleProfile.confidence
      })
    ).toEqual({
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      session_id: "session-1",
      normalized_profile: roleProfile,
      unresolved_constraints: ["Hiring manager not yet confirmed"],
      conflicts: [],
      confidence: {
        title: 0.96,
        department: 0.92,
        level: 0.9,
        locationPolicy: 0.95,
        compensationRange: 0.9
      }
    });
  });

  it("builds quality check insert payload with typed check fields", () => {
    expect(
      buildEmployerJobQualityCheckInsert({
        employerUserId: "employer-user-1",
        employerJobId: "job-1",
        sessionId: "session-1",
        check: qualityCheck,
        metadata: { source: "quality-controls-v13" }
      })
    ).toEqual({
      employer_user_id: "employer-user-1",
      employer_job_id: "job-1",
      session_id: "session-1",
      check_type: "completeness",
      status: "pass",
      issues: [],
      suggested_rewrite: "No rewrite needed.",
      metadata: { source: "quality-controls-v13" }
    });
  });

  it("upserts role profile scoped by employer/job/session", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      from(table: string) {
        calls.push({ table });

        return {
          upsert(values: unknown) {
            calls.push({ upsert: values });

            return {
              select(columns: string) {
                calls.push({ select: columns });

                return {
                  single: async () => ({
                    data: { id: "rp-1" },
                    error: null
                  })
                };
              }
            };
          }
        };
      }
    };

    await expect(
      upsertEmployerJobRoleProfile(client, {
        employerUserId: "employer-user-1",
        employerJobId: "job-1",
        sessionId: "session-1",
        normalizedProfile: roleProfile,
        unresolvedConstraints: roleProfile.unresolvedConstraints,
        conflicts: roleProfile.conflicts,
        confidence: roleProfile.confidence
      })
    ).resolves.toEqual({ id: "rp-1" });

    expect(calls).toEqual([
      { table: "employer_job_role_profiles" },
      {
        upsert: {
          employer_user_id: "employer-user-1",
          employer_job_id: "job-1",
          session_id: "session-1",
          normalized_profile: roleProfile,
          unresolved_constraints: ["Hiring manager not yet confirmed"],
          conflicts: [],
          confidence: {
            title: 0.96,
            department: 0.92,
            level: 0.9,
            locationPolicy: 0.95,
            compensationRange: 0.9
          }
        }
      },
      { select: "*" }
    ]);
  });

  it("loads role profile by strict employer/job/session scope", async () => {
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
                  eq(columnTwo: string, valueTwo: string) {
                    calls.push({ eq: [columnTwo, valueTwo] });

                    return {
                      eq(columnThree: string, valueThree: string) {
                        calls.push({ eq: [columnThree, valueThree] });

                        return {
                          maybeSingle: async () => ({ data: null, error: null })
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
      getEmployerJobRoleProfileBySession(client, "employer-user-1", "job-1", "session-1")
    ).resolves.toBeNull();

    expect(calls).toEqual([
      { table: "employer_job_role_profiles" },
      { select: "*" },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] },
      { eq: ["session_id", "session-1"] }
    ]);
  });

  it("creates and lists quality checks within employer/job/session scope", async () => {
    const insertCalls: Array<Record<string, unknown>> = [];
    const insertClient = {
      from(table: string) {
        insertCalls.push({ table });

        return {
          insert(values: unknown) {
            insertCalls.push({ insert: values });

            return {
              select(columns: string) {
                insertCalls.push({ select: columns });

                return {
                  single: async () => ({ data: { id: "qc-1" }, error: null })
                };
              }
            };
          }
        };
      }
    };

    await expect(
      createEmployerJobQualityCheck(insertClient, {
        employerUserId: "employer-user-1",
        employerJobId: "job-1",
        sessionId: "session-1",
        check: qualityCheck,
        metadata: { source: "quality-controls-v13" }
      })
    ).resolves.toEqual({ id: "qc-1" });

    expect(insertCalls).toEqual([
      { table: "employer_job_quality_checks" },
      {
        insert: {
          employer_user_id: "employer-user-1",
          employer_job_id: "job-1",
          session_id: "session-1",
          check_type: "completeness",
          status: "pass",
          issues: [],
          suggested_rewrite: "No rewrite needed.",
          metadata: { source: "quality-controls-v13" }
        }
      },
      { select: "*" }
    ]);

    const listCalls: Array<Record<string, unknown>> = [];
    const listClient = {
      from(table: string) {
        listCalls.push({ table });

        return {
          select(columns: string) {
            listCalls.push({ select: columns });

            return {
              eq(column: string, value: string) {
                listCalls.push({ eq: [column, value] });

                return {
                  eq(columnTwo: string, valueTwo: string) {
                    listCalls.push({ eq: [columnTwo, valueTwo] });

                    return {
                      eq(columnThree: string, valueThree: string) {
                        listCalls.push({ eq: [columnThree, valueThree] });

                        return {
                          order(orderColumn: string, options: { ascending: boolean }) {
                            listCalls.push({ order: [orderColumn, options] });
                            return Promise.resolve({ data: [], error: null });
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
      listEmployerJobQualityChecksBySession(listClient, "employer-user-1", "job-1", "session-1")
    ).resolves.toEqual([]);

    expect(listCalls).toEqual([
      { table: "employer_job_quality_checks" },
      { select: "*" },
      { eq: ["employer_user_id", "employer-user-1"] },
      { eq: ["employer_job_id", "job-1"] },
      { eq: ["session_id", "session-1"] },
      { order: ["created_at", { ascending: true }] }
    ]);
  });
});
