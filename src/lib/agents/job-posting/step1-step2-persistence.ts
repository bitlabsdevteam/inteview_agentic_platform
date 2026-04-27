import type { JobDescriptionQualityCheck } from "@/lib/agents/job-posting/quality-controls";
import type { RoleProfile, RoleProfileConflict, RoleProfileConfidence } from "@/lib/agents/job-posting/role-profile";

type QueryResult<T> = {
  data: T;
  error: { message?: string } | null;
};

export type EmployerJobRoleProfileRecord = {
  id: string;
  employer_user_id: string;
  employer_job_id: string;
  session_id: string;
  normalized_profile: RoleProfile;
  unresolved_constraints: string[];
  conflicts: RoleProfileConflict[];
  confidence: RoleProfileConfidence;
  created_at: string;
  updated_at: string;
};

export type EmployerJobQualityCheckRecord = {
  id: string;
  employer_user_id: string;
  employer_job_id: string;
  session_id: string;
  check_type: JobDescriptionQualityCheck["checkType"];
  status: JobDescriptionQualityCheck["status"];
  issues: string[];
  suggested_rewrite: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type StepOneTwoPersistenceClient = {
  from: (table: "employer_job_role_profiles" | "employer_job_quality_checks") => {
    select: (columns: string) => unknown;
    insert: (values: Record<string, unknown>) => unknown;
    upsert?: (values: Record<string, unknown>) => unknown;
  };
};

export type EmployerJobRoleProfileUpsertInput = {
  employerUserId: string;
  employerJobId: string;
  sessionId: string;
  normalizedProfile: RoleProfile;
  unresolvedConstraints: string[];
  conflicts: RoleProfileConflict[];
  confidence: RoleProfileConfidence;
};

export type EmployerJobQualityCheckInsertInput = {
  employerUserId: string;
  employerJobId: string;
  sessionId: string;
  check: JobDescriptionQualityCheck;
  metadata?: Record<string, unknown>;
};

function assertQueryResult<T>(result: QueryResult<T>, operation: string) {
  if (result.error) {
    throw new Error(result.error.message ?? `Unable to ${operation}.`);
  }

  return result.data;
}

export function buildEmployerJobRoleProfileUpsert(input: EmployerJobRoleProfileUpsertInput) {
  return {
    employer_user_id: input.employerUserId,
    employer_job_id: input.employerJobId,
    session_id: input.sessionId,
    normalized_profile: input.normalizedProfile,
    unresolved_constraints: input.unresolvedConstraints,
    conflicts: input.conflicts,
    confidence: input.confidence
  };
}

export function buildEmployerJobQualityCheckInsert(input: EmployerJobQualityCheckInsertInput) {
  return {
    employer_user_id: input.employerUserId,
    employer_job_id: input.employerJobId,
    session_id: input.sessionId,
    check_type: input.check.checkType,
    status: input.check.status,
    issues: input.check.issues,
    suggested_rewrite: input.check.suggestedRewrite,
    metadata: input.metadata ?? {}
  };
}

export async function upsertEmployerJobRoleProfile(
  client: StepOneTwoPersistenceClient,
  input: EmployerJobRoleProfileUpsertInput
) {
  const query = (client.from("employer_job_role_profiles") as unknown as {
    upsert: (values: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<QueryResult<EmployerJobRoleProfileRecord>>;
      };
    };
  }).upsert(buildEmployerJobRoleProfileUpsert(input));

  return assertQueryResult(await query.select("*").single(), "upsert employer job role profile");
}

export async function getEmployerJobRoleProfileBySession(
  client: StepOneTwoPersistenceClient,
  employerUserId: string,
  employerJobId: string,
  sessionId: string
) {
  const query = client.from("employer_job_role_profiles").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<QueryResult<EmployerJobRoleProfileRecord | null>>;
        };
      };
    };
  };

  return assertQueryResult(
    await query
      .eq("employer_user_id", employerUserId)
      .eq("employer_job_id", employerJobId)
      .eq("session_id", sessionId)
      .maybeSingle(),
    "load employer job role profile by session"
  );
}

export async function createEmployerJobQualityCheck(
  client: StepOneTwoPersistenceClient,
  input: EmployerJobQualityCheckInsertInput
) {
  const query = client
    .from("employer_job_quality_checks")
    .insert(buildEmployerJobQualityCheckInsert(input)) as {
    select: (columns: string) => {
      single: () => Promise<QueryResult<EmployerJobQualityCheckRecord>>;
    };
  };

  return assertQueryResult(await query.select("*").single(), "create employer job quality check");
}

export async function listEmployerJobQualityChecksBySession(
  client: StepOneTwoPersistenceClient,
  employerUserId: string,
  employerJobId: string,
  sessionId: string
) {
  const query = client.from("employer_job_quality_checks").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          order: (
            column: string,
            options: { ascending: boolean }
          ) => Promise<QueryResult<EmployerJobQualityCheckRecord[]>>;
        };
      };
    };
  };

  return assertQueryResult(
    await query
      .eq("employer_user_id", employerUserId)
      .eq("employer_job_id", employerJobId)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    "list employer job quality checks by session"
  );
}
