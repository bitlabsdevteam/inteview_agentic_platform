import type { EmployerJobInput } from "@/lib/employer/jobs";

export const JOB_POSTING_FIELD_SOURCES = [
  "user_provided",
  "inferred",
  "defaulted",
  "missing"
] as const;

export type JobPostingFieldSource = (typeof JOB_POSTING_FIELD_SOURCES)[number];

export type JobPostingAgentInput = {
  employerUserId: string;
  prompt: string;
  previousSessionId?: string;
};

export type JobPostingAgentField = {
  value: string;
  source: JobPostingFieldSource;
  confidence: number;
};

export type JobPostingAgentOutput = {
  title: JobPostingAgentField;
  department: JobPostingAgentField;
  level: JobPostingAgentField;
  location: JobPostingAgentField;
  employmentType: JobPostingAgentField;
  compensationBand: JobPostingAgentField;
  hiringProblem: string;
  outcomes: string[];
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  interviewLoop: string[];
  draftDescription: string;
  assumptions: string[];
  missingCriticalFields: string[];
  followUpQuestions: string[];
  reasoningSummary: string[];
  thinkingMessages: string[];
  actionLog: string[];
};

export type JobPostingAgentValidationResult =
  | {
      ok: true;
      data: JobPostingAgentOutput;
      errors: [];
    }
  | {
      ok: false;
      data: null;
      errors: string[];
    };

const FIELD_NAMES = [
  "title",
  "department",
  "level",
  "location",
  "employmentType",
  "compensationBand"
] as const satisfies ReadonlyArray<keyof JobPostingAgentOutput>;

const REQUIRED_ARRAY_NAMES = [
  "outcomes",
  "responsibilities",
  "requirements",
  "interviewLoop"
] as const satisfies ReadonlyArray<keyof JobPostingAgentOutput>;

const OPTIONAL_ARRAY_NAMES = [
  "niceToHave",
  "assumptions",
  "missingCriticalFields",
  "followUpQuestions"
] as const satisfies ReadonlyArray<keyof JobPostingAgentOutput>;

const TRANSPARENCY_ARRAY_NAMES = [
  "reasoningSummary",
  "thinkingMessages",
  "actionLog"
] as const satisfies ReadonlyArray<keyof JobPostingAgentOutput>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidSource(value: unknown): value is JobPostingFieldSource {
  return (
    typeof value === "string" &&
    JOB_POSTING_FIELD_SOURCES.includes(value as JobPostingFieldSource)
  );
}

function isValidConfidence(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function validateAgentField(
  record: Record<string, unknown>,
  fieldName: (typeof FIELD_NAMES)[number],
  errors: string[]
) {
  const field = record[fieldName];

  if (!isRecord(field)) {
    errors.push(`${fieldName} must include value, source, and confidence.`);
    return;
  }

  if (!hasText(field.value)) {
    errors.push(`${fieldName}.value is required.`);
  }

  if (!isValidSource(field.source)) {
    errors.push(`${fieldName}.source must be one of ${JOB_POSTING_FIELD_SOURCES.join(", ")}.`);
  }

  if (!isValidConfidence(field.confidence)) {
    errors.push(`${fieldName}.confidence must be a number between 0 and 1.`);
  }
}

function validateStringArray(
  record: Record<string, unknown>,
  fieldName:
    | (typeof REQUIRED_ARRAY_NAMES)[number]
    | (typeof OPTIONAL_ARRAY_NAMES)[number]
    | (typeof TRANSPARENCY_ARRAY_NAMES)[number],
  errors: string[],
  options: { required: boolean }
) {
  const value = record[fieldName];

  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array.`);
    return;
  }

  if (options.required && value.length === 0) {
    errors.push(`${fieldName} must include at least one item.`);
    return;
  }

  if (value.some((item) => !hasText(item))) {
    errors.push(`${fieldName} must contain only non-empty strings.`);
  }
}

export function validateJobPostingAgentOutput(
  output: unknown
): JobPostingAgentValidationResult {
  if (!isRecord(output)) {
    return {
      ok: false,
      data: null,
      errors: ["Agent output must be an object."]
    };
  }

  const errors: string[] = [];

  for (const fieldName of FIELD_NAMES) {
    validateAgentField(output, fieldName, errors);
  }

  for (const fieldName of ["hiringProblem", "draftDescription"] as const) {
    if (!hasText(output[fieldName])) {
      errors.push(`${fieldName} is required.`);
    }
  }

  for (const fieldName of REQUIRED_ARRAY_NAMES) {
    validateStringArray(output, fieldName, errors, { required: true });
  }

  for (const fieldName of OPTIONAL_ARRAY_NAMES) {
    validateStringArray(output, fieldName, errors, { required: false });
  }

  for (const fieldName of TRANSPARENCY_ARRAY_NAMES) {
    validateStringArray(output, fieldName, errors, { required: false });
  }

  if (Array.isArray(output.followUpQuestions) && output.followUpQuestions.length > 3) {
    errors.push("followUpQuestions cannot contain more than 3 items.");
  }

  if (errors.length) {
    return {
      ok: false,
      data: null,
      errors
    };
  }

  return {
    ok: true,
    data: output as JobPostingAgentOutput,
    errors: []
  };
}

function formatBullets(items: string[]) {
  return items.map((item) => `- ${item.trim()}`).join("\n");
}

function formatRequirements(output: JobPostingAgentOutput) {
  const required = ["Required:", formatBullets(output.requirements)].join("\n");

  if (!output.niceToHave.length) {
    return required;
  }

  return [required, "", "Nice to have:", formatBullets(output.niceToHave)].join("\n");
}

export function convertAgentOutputToEmployerJobInput(
  output: JobPostingAgentOutput
): EmployerJobInput {
  return {
    title: output.title.value.trim(),
    department: output.department.value.trim(),
    level: output.level.value.trim(),
    location: output.location.value.trim(),
    compensationBand: output.compensationBand.value.trim(),
    hiringProblem: output.hiringProblem.trim(),
    outcomes: formatBullets(output.outcomes),
    requirements: formatRequirements(output),
    interviewLoop: formatBullets(output.interviewLoop)
  };
}
