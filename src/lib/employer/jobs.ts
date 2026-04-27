export const EMPLOYER_JOB_STATUSES = [
  "draft",
  "needs_review",
  "published",
  "closed",
  "archived"
] as const;

export type EmployerJobStatus = (typeof EMPLOYER_JOB_STATUSES)[number];

export type EmployerJobAction = "submit_for_review" | "publish" | "close" | "archive";

export type EmployerJobInput = {
  title: string;
  department: string;
  level: string;
  location: string;
  compensationBand: string;
  hiringProblem: string;
  outcomes: string;
  requirements: string;
  interviewLoop: string;
};

export type EmployerJobBrief = {
  hiringProblem: string;
  outcomes: string;
  requirements: string;
  interviewLoop: string;
};

export type EmployerJobRecord = {
  id: string;
  employer_user_id: string;
  title: string;
  department: string;
  level: string;
  location: string;
  compensation_band: string;
  status: EmployerJobStatus;
  brief: EmployerJobBrief;
  draft_description: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type EmployerJobDraftInsert = Omit<
  EmployerJobRecord,
  "id" | "created_at" | "updated_at"
>;

export type EmployerJobPrimaryAction = {
  label: "Continue" | "Review" | "View";
  intent: "continue" | "review" | "view";
};

export type EmployerJobQualityStatus = "pass" | "warn" | "fail";

export type EmployerJobReviewGate = {
  canSubmitForReview: boolean;
  blocksReview: boolean;
  requiresEmployerFix: boolean;
  warningMessage: string | null;
};

type EmployerJobsClient = {
  from: (table: "employer_jobs") => {
    select: (columns: string) => unknown;
    insert: (values: EmployerJobDraftInsert) => unknown;
    update: (values: Partial<EmployerJobDraftInsert>) => unknown;
    delete: () => unknown;
  };
};

type QueryResult<T> = {
  data: T;
  error: { message?: string } | null;
};

function trimField(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function assertQueryResult<T>(result: QueryResult<T>, operation: string) {
  if (result.error) {
    throw new Error(result.error.message ?? `Unable to ${operation}.`);
  }

  return result.data;
}

export function getEmployerJobInputFromFormData(formData: FormData): EmployerJobInput {
  return {
    title: trimField(formData.get("title")),
    department: trimField(formData.get("department")),
    level: trimField(formData.get("level")),
    location: trimField(formData.get("location")),
    compensationBand: trimField(formData.get("compensationBand")),
    hiringProblem: trimField(formData.get("hiringProblem")),
    outcomes: trimField(formData.get("outcomes")),
    requirements: trimField(formData.get("requirements")),
    interviewLoop: trimField(formData.get("interviewLoop"))
  };
}

export function validateEmployerJobInput(input: EmployerJobInput) {
  return Object.entries(input)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

export function buildEmployerJobDescription(input: EmployerJobInput) {
  return [
    input.title,
    "",
    `Department: ${input.department}`,
    `Level: ${input.level}`,
    `Location: ${input.location}`,
    `Compensation: ${input.compensationBand}`,
    "",
    "Hiring problem",
    input.hiringProblem,
    "",
    "First outcomes",
    input.outcomes,
    "",
    "Requirements",
    input.requirements,
    "",
    "Interview loop",
    input.interviewLoop
  ].join("\n");
}

export function buildEmployerJobDraftInsert(
  employerUserId: string,
  input: EmployerJobInput
): EmployerJobDraftInsert {
  return {
    employer_user_id: employerUserId,
    title: input.title,
    department: input.department,
    level: input.level,
    location: input.location,
    compensation_band: input.compensationBand,
    status: "draft",
    brief: {
      hiringProblem: input.hiringProblem,
      outcomes: input.outcomes,
      requirements: input.requirements,
      interviewLoop: input.interviewLoop
    },
    draft_description: buildEmployerJobDescription(input),
    published_at: null
  };
}

export function getNextEmployerJobStatus(
  status: EmployerJobStatus,
  action: EmployerJobAction
): EmployerJobStatus | null {
  if (status === "draft" && action === "submit_for_review") {
    return "needs_review";
  }

  if (status === "needs_review" && action === "publish") {
    return "published";
  }

  if ((status === "draft" || status === "needs_review" || status === "published") && action === "close") {
    return "closed";
  }

  if (status !== "archived" && action === "archive") {
    return "archived";
  }

  return null;
}

export function getEmployerJobPrimaryAction(status: EmployerJobStatus): EmployerJobPrimaryAction {
  if (status === "draft") {
    return { label: "Continue", intent: "continue" };
  }

  if (status === "needs_review") {
    return { label: "Review", intent: "review" };
  }

  return { label: "View", intent: "view" };
}

export function getEmployerJobReviewGate(input: {
  status: EmployerJobStatus;
  qualityCheckStatuses: EmployerJobQualityStatus[];
  interviewBlueprintCompletenessGaps?: string[];
}): EmployerJobReviewGate {
  if (input.status !== "draft") {
    return {
      canSubmitForReview: false,
      blocksReview: false,
      requiresEmployerFix: false,
      warningMessage: null
    };
  }

  const qualityBlocksReview = input.qualityCheckStatuses.includes("fail");
  const interviewStructureBlocked =
    (input.interviewBlueprintCompletenessGaps ?? []).map((gap) => gap.trim()).filter(Boolean).length > 0;

  if (qualityBlocksReview && interviewStructureBlocked) {
    return {
      canSubmitForReview: false,
      blocksReview: true,
      requiresEmployerFix: true,
      warningMessage:
        "Critical quality failures and interview structure blockers must be fixed before this job can move to review."
    };
  }

  if (qualityBlocksReview) {
    return {
      canSubmitForReview: false,
      blocksReview: true,
      requiresEmployerFix: true,
      warningMessage: "Critical quality failures must be fixed before this job can move to review."
    };
  }

  if (interviewStructureBlocked) {
    return {
      canSubmitForReview: false,
      blocksReview: true,
      requiresEmployerFix: true,
      warningMessage:
        "Interview structure is incomplete. Resolve blueprint readiness gaps before this job can move to review."
    };
  }

  const requiresEmployerFix = input.qualityCheckStatuses.includes("warn");
  if (requiresEmployerFix) {
    return {
      canSubmitForReview: true,
      blocksReview: false,
      requiresEmployerFix: true,
      warningMessage: "Quality warnings are present. Resolve them before review when possible."
    };
  }

  return {
    canSubmitForReview: true,
    blocksReview: false,
    requiresEmployerFix: false,
    warningMessage: null
  };
}

export function formatEmployerJobStatus(status: EmployerJobStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function createEmployerJobDraft(
  client: EmployerJobsClient,
  employerUserId: string,
  input: EmployerJobInput
) {
  const insert = buildEmployerJobDraftInsert(employerUserId, input);
  const query = client.from("employer_jobs").insert(insert) as {
    select: (columns: string) => {
      single: () => Promise<QueryResult<EmployerJobRecord>>;
    };
  };

  return assertQueryResult(await query.select("*").single(), "create job draft");
}

export async function listEmployerJobs(client: EmployerJobsClient, employerUserId: string) {
  const query = client.from("employer_jobs").select("*") as {
    eq: (column: string, value: string) => {
      order: (column: string, options: { ascending: boolean }) => Promise<QueryResult<EmployerJobRecord[]>>;
    };
  };

  return assertQueryResult(
    await query.eq("employer_user_id", employerUserId).order("updated_at", { ascending: false }),
    "list employer jobs"
  );
}

export async function getEmployerJob(
  client: EmployerJobsClient,
  employerUserId: string,
  jobId: string
) {
  const query = client.from("employer_jobs").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<QueryResult<EmployerJobRecord | null>>;
      };
    };
  };

  return assertQueryResult(
    await query.eq("id", jobId).eq("employer_user_id", employerUserId).maybeSingle(),
    "load employer job"
  );
}

export async function updateEmployerJobDraft(
  client: EmployerJobsClient,
  employerUserId: string,
  jobId: string,
  input: EmployerJobInput
) {
  const patch = buildEmployerJobDraftInsert(employerUserId, input);
  const query = client.from("employer_jobs").update({
    title: patch.title,
    department: patch.department,
    level: patch.level,
    location: patch.location,
    compensation_band: patch.compensation_band,
    brief: patch.brief,
    draft_description: patch.draft_description
  }) as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        select: (columns: string) => {
          single: () => Promise<QueryResult<EmployerJobRecord>>;
        };
      };
    };
  };

  return assertQueryResult(
    await query.eq("id", jobId).eq("employer_user_id", employerUserId).select("*").single(),
    "update job draft"
  );
}

export async function transitionEmployerJobStatus(
  client: EmployerJobsClient,
  employerUserId: string,
  jobId: string,
  currentStatus: EmployerJobStatus,
  action: EmployerJobAction
) {
  const nextStatus = getNextEmployerJobStatus(currentStatus, action);

  if (!nextStatus) {
    throw new Error(`Cannot ${action.replaceAll("_", " ")} from ${currentStatus}.`);
  }

  const patch: Partial<EmployerJobDraftInsert> = {
    status: nextStatus,
    published_at: nextStatus === "published" ? new Date().toISOString() : null
  };
  const query = client.from("employer_jobs").update(patch) as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          select: (columns: string) => {
            single: () => Promise<QueryResult<EmployerJobRecord>>;
          };
        };
      };
    };
  };

  return assertQueryResult(
    await query
      .eq("id", jobId)
      .eq("employer_user_id", employerUserId)
      .eq("status", currentStatus)
      .select("*")
      .single(),
    "transition job status"
  );
}

export async function removeEmployerJob(
  client: EmployerJobsClient,
  employerUserId: string,
  jobId: string
) {
  const query = client.from("employer_jobs").delete() as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        select: (columns: string) => {
          maybeSingle: () => Promise<QueryResult<{ id: string } | null>>;
        };
      };
    };
  };

  const deleted = assertQueryResult(
    await query
      .eq("id", jobId)
      .eq("employer_user_id", employerUserId)
      .select("id")
      .maybeSingle(),
    "remove employer job"
  );

  if (!deleted) {
    throw new Error("Unable to remove employer job.");
  }
}
