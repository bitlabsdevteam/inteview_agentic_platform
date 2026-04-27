import { describe, expect, it } from "vitest";

import { removeEmployerJob, transitionEmployerJobStatus } from "@/lib/employer/jobs";

describe("employer jobs data access", () => {
  it("transitions a job to archived status", async () => {
    const calls: Array<{ type: string; values?: unknown }> = [];
    const client = {
      from(_table: "employer_jobs") {
        return {
          update(values: unknown) {
            calls.push({ type: "update", values });
            const filters: Array<[string, string]> = [];
            return {
              eq(column: string, value: string) {
                filters.push([column, value]);
                return this;
              },
              select() {
                return {
                  single: async () => ({
                    data: {
                      id: "job-1",
                      employer_user_id: "employer-user-1",
                      title: "Senior Data Engineer",
                      department: "Platform",
                      level: "Senior",
                      location: "Remote",
                      compensation_band: "$170k-$210k",
                      status: "archived",
                      brief: {
                        hiringProblem: "Improve data reliability.",
                        outcomes: "Fewer incidents.",
                        requirements: "SQL and observability.",
                        interviewLoop: "Recruiter, panel, final."
                      },
                      draft_description: "Draft",
                      created_at: "2026-04-25T00:00:00.000Z",
                      updated_at: "2026-04-25T00:00:00.000Z",
                      published_at: null
                    },
                    error: null
                  })
                };
              }
            };
          }
        };
      }
    };

    const result = await transitionEmployerJobStatus(
      client as never,
      "employer-user-1",
      "job-1",
      "published",
      "archive"
    );

    expect(result.status).toBe("archived");
    expect(calls).toEqual([
      {
        type: "update",
        values: {
          status: "archived",
          published_at: null
        }
      }
    ]);
  });

  it("deletes an employer-owned job", async () => {
    const filters: Array<[string, string]> = [];

    await removeEmployerJob(
      {
        from() {
          return {
            delete() {
              return {
                eq(column: string, value: string) {
                  filters.push([column, value]);
                  if (filters.length === 2) {
                    return {
                      select() {
                        return {
                          maybeSingle: async () => ({
                            data: { id: "job-1" },
                            error: null
                          })
                        };
                      }
                    };
                  }
                  return this;
                }
              };
            }
          };
        }
      } as never,
      "employer-user-1",
      "job-1"
    );

    expect(filters).toEqual([
      ["id", "job-1"],
      ["employer_user_id", "employer-user-1"]
    ]);
  });

  it("throws when delete affects no rows", async () => {
    await expect(
      removeEmployerJob(
        {
          from() {
            return {
              delete() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          select() {
                            return {
                              maybeSingle: async () => ({
                                data: null,
                                error: null
                              })
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
        } as never,
        "employer-user-1",
        "job-1"
      )
    ).rejects.toThrow("Unable to remove employer job.");
  });
});
