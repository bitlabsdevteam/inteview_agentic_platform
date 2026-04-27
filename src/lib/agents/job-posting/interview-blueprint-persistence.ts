import type {
  InterviewBlueprint,
  InterviewBlueprintQuestion
} from "@/lib/agents/job-posting/interview-blueprint";

type QueryResult<T> = {
  data: T;
  error: { message?: string } | null;
};

export type EmployerJobInterviewBlueprintRecord = {
  id: string;
  employer_user_id: string;
  employer_job_id: string;
  status: InterviewBlueprint["status"];
  title: string;
  objective: string;
  response_mode: InterviewBlueprint["responseMode"];
  tone_profile: InterviewBlueprint["toneProfile"];
  parsing_strategy: InterviewBlueprint["parsingStrategy"];
  benchmark_summary: string;
  approval_notes: string;
  created_at: string;
  updated_at: string;
};

export type EmployerJobInterviewQuestionRecord = {
  id: string;
  interview_blueprint_id: string;
  employer_user_id: string;
  employer_job_id: string;
  stage_label: string;
  stage_order: number;
  question_order: number;
  question_text: string;
  intent: string;
  evaluation_focus: string;
  strong_signal: string;
  failure_signal: string;
  follow_up_prompt: string;
  created_at: string;
  updated_at: string;
};

type InterviewBlueprintPersistenceClient = {
  from: (table: "employer_job_interview_blueprints" | "employer_job_interview_questions") => {
    select: (columns: string) => unknown;
    insert: (values: Record<string, unknown>) => unknown;
    upsert?: (values: Record<string, unknown>) => unknown;
  };
};

export type EmployerJobInterviewBlueprintUpsertInput = {
  employerUserId: string;
  employerJobId: string;
  blueprint: InterviewBlueprint;
};

export type EmployerJobInterviewQuestionInsertInput = {
  employerUserId: string;
  employerJobId: string;
  interviewBlueprintId: string;
  stageLabel: string;
  stageOrder: number;
  question: InterviewBlueprintQuestion;
};

function assertQueryResult<T>(result: QueryResult<T>, operation: string) {
  if (result.error) {
    throw new Error(result.error.message ?? `Unable to ${operation}.`);
  }

  return result.data;
}

export function buildEmployerJobInterviewBlueprintUpsert(
  input: EmployerJobInterviewBlueprintUpsertInput
) {
  return {
    employer_user_id: input.employerUserId,
    employer_job_id: input.employerJobId,
    status: input.blueprint.status,
    title: input.blueprint.title,
    objective: input.blueprint.objective,
    response_mode: input.blueprint.responseMode,
    tone_profile: input.blueprint.toneProfile,
    parsing_strategy: input.blueprint.parsingStrategy,
    benchmark_summary: input.blueprint.benchmarkSummary,
    approval_notes: input.blueprint.approvalNotes
  };
}

export function buildEmployerJobInterviewQuestionInsert(
  input: EmployerJobInterviewQuestionInsertInput
) {
  return {
    interview_blueprint_id: input.interviewBlueprintId,
    employer_user_id: input.employerUserId,
    employer_job_id: input.employerJobId,
    stage_label: input.stageLabel,
    stage_order: input.stageOrder,
    question_order: input.question.questionOrder,
    question_text: input.question.questionText,
    intent: input.question.intent,
    evaluation_focus: input.question.evaluationFocus,
    strong_signal: input.question.strongSignal,
    failure_signal: input.question.failureSignal,
    follow_up_prompt: input.question.followUpPrompt
  };
}

export async function upsertEmployerJobInterviewBlueprint(
  client: InterviewBlueprintPersistenceClient,
  input: EmployerJobInterviewBlueprintUpsertInput
) {
  const query = (client.from("employer_job_interview_blueprints") as unknown as {
    upsert: (values: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<QueryResult<EmployerJobInterviewBlueprintRecord>>;
      };
    };
  }).upsert(buildEmployerJobInterviewBlueprintUpsert(input));

  return assertQueryResult(
    await query.select("*").single(),
    "upsert employer job interview blueprint"
  );
}

export async function getEmployerJobInterviewBlueprintByJob(
  client: InterviewBlueprintPersistenceClient,
  employerUserId: string,
  employerJobId: string
) {
  const query = client.from("employer_job_interview_blueprints").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<QueryResult<EmployerJobInterviewBlueprintRecord | null>>;
      };
    };
  };

  return assertQueryResult(
    await query
      .eq("employer_user_id", employerUserId)
      .eq("employer_job_id", employerJobId)
      .maybeSingle(),
    "load employer job interview blueprint by job"
  );
}

export async function createEmployerJobInterviewQuestion(
  client: InterviewBlueprintPersistenceClient,
  input: EmployerJobInterviewQuestionInsertInput
) {
  const query = client
    .from("employer_job_interview_questions")
    .insert(buildEmployerJobInterviewQuestionInsert(input)) as {
    select: (columns: string) => {
      single: () => Promise<QueryResult<EmployerJobInterviewQuestionRecord>>;
    };
  };

  return assertQueryResult(
    await query.select("*").single(),
    "create employer job interview question"
  );
}

export async function listEmployerJobInterviewQuestionsByBlueprint(
  client: InterviewBlueprintPersistenceClient,
  employerUserId: string,
  employerJobId: string,
  interviewBlueprintId: string
) {
  const query = client.from("employer_job_interview_questions").select("*") as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          order: (
            column: string,
            options: { ascending: boolean }
          ) => {
            order: (
              column: string,
              options: { ascending: boolean }
            ) => Promise<QueryResult<EmployerJobInterviewQuestionRecord[]>>;
          };
        };
      };
    };
  };

  return assertQueryResult(
    await query
      .eq("employer_user_id", employerUserId)
      .eq("employer_job_id", employerJobId)
      .eq("interview_blueprint_id", interviewBlueprintId)
      .order("stage_order", { ascending: true })
      .order("question_order", { ascending: true }),
    "list employer job interview questions by blueprint"
  );
}
