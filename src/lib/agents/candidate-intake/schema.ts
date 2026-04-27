export type CandidateIntakeResumeMetadata = {
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
};

export type CandidateIntakePayload = {
  employerUserId: string;
  employerJobId: string;
  fullName: string;
  email?: string;
  phone?: string;
  resume: CandidateIntakeResumeMetadata;
  sourceText?: string;
};

export type CandidateProfileConfidence = {
  summary: number;
  skills: number;
  workExperience: number;
  education: number;
  overall: number;
};

export type CandidateExtractionOutput = {
  summary: string;
  skills: string[];
  workExperience: string[];
  education: string[];
  confidence: CandidateProfileConfidence;
};

export type CandidateProfileAuditMetadata = {
  modelId: string;
  providerResponseId?: string;
  promptChecksum: string;
};

export type CandidateScoreAuditMetadata = {
  scorer: string;
  scorerModelId?: string | null;
  scoreComputationChecksum?: string | null;
};

export type CandidateRequirementFitScores = {
  hardSkills: number;
  roleExperience: number;
  domainContext: number;
  educationSignals: number;
  overall: number;
};

export type CandidateProfileScore = {
  requirementFitScores: CandidateRequirementFitScores;
  aggregateScore: number;
  scoreVersion: string;
  evidenceSnippets: string[];
};

export type CandidateProfilePersistenceInput = {
  candidateIntakeId: string;
  employerUserId: string;
  employerJobId: string;
  profile: CandidateExtractionOutput;
  audit: CandidateProfileAuditMetadata;
  candidateScore?: CandidateProfileScore;
  scoreAudit?: CandidateScoreAuditMetadata;
};

type ValidationResult<T> =
  | {
      ok: true;
      data: T;
      errors: [];
    }
  | {
      ok: false;
      data: null;
      errors: string[];
    };

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isConfidenceValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function validateStringArray(
  value: unknown,
  fieldName: "skills" | "workExperience" | "education",
  errors: string[]
) {
  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array.`);
    return;
  }

  if (value.some((item) => !hasText(item))) {
    errors.push(`${fieldName} must contain only non-empty strings.`);
  }
}

function validateProfileConfidence(
  confidence: unknown,
  errors: string[]
): confidence is CandidateProfileConfidence {
  if (!isRecord(confidence)) {
    errors.push("confidence must be an object.");
    return false;
  }

  const fields = [
    "summary",
    "skills",
    "workExperience",
    "education",
    "overall"
  ] as const satisfies readonly (keyof CandidateProfileConfidence)[];

  let isValid = true;

  for (const fieldName of fields) {
    if (!isConfidenceValue(confidence[fieldName])) {
      errors.push(`confidence.${fieldName} must be a number between 0 and 1.`);
      isValid = false;
    }
  }

  return isValid;
}

function validateEvidenceSnippets(value: unknown, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push("evidenceSnippets must be an array.");
    return;
  }

  if (value.some((item) => !hasText(item))) {
    errors.push("evidenceSnippets must contain only non-empty strings.");
  }
}

function validateRequirementFitScores(
  value: unknown,
  errors: string[]
): value is CandidateRequirementFitScores {
  if (!isRecord(value)) {
    errors.push("requirementFitScores must be an object.");
    return false;
  }

  const fields = [
    "hardSkills",
    "roleExperience",
    "domainContext",
    "educationSignals",
    "overall"
  ] as const satisfies readonly (keyof CandidateRequirementFitScores)[];

  let isValid = true;

  for (const fieldName of fields) {
    if (!isConfidenceValue(value[fieldName])) {
      errors.push(`requirementFitScores.${fieldName} must be a number between 0 and 1.`);
      isValid = false;
    }
  }

  return isValid;
}

export function validateCandidateIntakePayload(
  payload: unknown
): ValidationResult<CandidateIntakePayload> {
  if (!isRecord(payload)) {
    return {
      ok: false,
      data: null,
      errors: ["Candidate intake payload must be an object."]
    };
  }

  const errors: string[] = [];

  for (const fieldName of ["employerUserId", "employerJobId", "fullName"] as const) {
    if (!hasText(payload[fieldName])) {
      errors.push(`${fieldName} is required.`);
    }
  }

  if (!isRecord(payload.resume)) {
    errors.push("resume is required.");
  } else {
    if (!hasText(payload.resume.storagePath)) {
      errors.push("resume.storagePath is required.");
    }

    if (!hasText(payload.resume.fileName)) {
      errors.push("resume.fileName is required.");
    }

    if (!hasText(payload.resume.mimeType)) {
      errors.push("resume.mimeType is required.");
    }

    if (
      typeof payload.resume.fileSizeBytes !== "number" ||
      !Number.isFinite(payload.resume.fileSizeBytes) ||
      payload.resume.fileSizeBytes <= 0
    ) {
      errors.push("resume.fileSizeBytes must be greater than 0.");
    }
  }

  if (payload.email !== undefined && !hasText(payload.email)) {
    errors.push("email must be a non-empty string when provided.");
  }

  if (payload.phone !== undefined && !hasText(payload.phone)) {
    errors.push("phone must be a non-empty string when provided.");
  }

  if (payload.sourceText !== undefined && !hasText(payload.sourceText)) {
    errors.push("sourceText must be a non-empty string when provided.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      data: null,
      errors
    };
  }

  return {
    ok: true,
    data: payload as CandidateIntakePayload,
    errors: []
  };
}

export function validateCandidateExtractionOutput(
  output: unknown
): ValidationResult<CandidateExtractionOutput> {
  if (!isRecord(output)) {
    return {
      ok: false,
      data: null,
      errors: ["Candidate extraction output must be an object."]
    };
  }

  const errors: string[] = [];

  if (!hasText(output.summary)) {
    errors.push("summary is required.");
  }

  validateStringArray(output.skills, "skills", errors);
  validateStringArray(output.workExperience, "workExperience", errors);
  validateStringArray(output.education, "education", errors);
  validateProfileConfidence(output.confidence, errors);

  if (errors.length > 0) {
    return {
      ok: false,
      data: null,
      errors
    };
  }

  return {
    ok: true,
    data: output as CandidateExtractionOutput,
    errors: []
  };
}

export function validateCandidateProfileScore(
  score: unknown
): ValidationResult<CandidateProfileScore> {
  if (!isRecord(score)) {
    return {
      ok: false,
      data: null,
      errors: ["Candidate profile score must be an object."]
    };
  }

  const errors: string[] = [];

  validateRequirementFitScores(score.requirementFitScores, errors);

  if (!isConfidenceValue(score.aggregateScore)) {
    errors.push("aggregateScore must be a number between 0 and 1.");
  }

  if (!hasText(score.scoreVersion)) {
    errors.push("scoreVersion is required.");
  }

  validateEvidenceSnippets(score.evidenceSnippets, errors);

  if (errors.length > 0) {
    return {
      ok: false,
      data: null,
      errors
    };
  }

  return {
    ok: true,
    data: score as CandidateProfileScore,
    errors: []
  };
}

export function validateCandidateProfilePersistenceInput(
  input: unknown
): ValidationResult<CandidateProfilePersistenceInput> {
  if (!isRecord(input)) {
    return {
      ok: false,
      data: null,
      errors: ["Candidate profile persistence input must be an object."]
    };
  }

  const errors: string[] = [];

  for (const fieldName of ["candidateIntakeId", "employerUserId", "employerJobId"] as const) {
    if (!hasText(input[fieldName])) {
      errors.push(`${fieldName} is required.`);
    }
  }

  const profileResult = validateCandidateExtractionOutput(input.profile);
  if (!profileResult.ok) {
    errors.push(...profileResult.errors);
  }

  if (!isRecord(input.audit)) {
    errors.push("audit is required.");
  } else {
    if (!hasText(input.audit.modelId)) {
      errors.push("audit.modelId is required.");
    }

    if (input.audit.providerResponseId !== undefined && !hasText(input.audit.providerResponseId)) {
      errors.push("audit.providerResponseId must be a non-empty string when provided.");
    }

    if (!hasText(input.audit.promptChecksum)) {
      errors.push("audit.promptChecksum is required.");
    }
  }

  if (input.candidateScore !== undefined) {
    const scoreResult = validateCandidateProfileScore(input.candidateScore);
    if (!scoreResult.ok) {
      errors.push(...scoreResult.errors);
    }
  }

  if (input.scoreAudit !== undefined) {
    if (!isRecord(input.scoreAudit)) {
      errors.push("scoreAudit must be an object when provided.");
    } else {
      if (!hasText(input.scoreAudit.scorer)) {
        errors.push("scoreAudit.scorer is required.");
      }

      if (
        input.scoreAudit.scorerModelId !== undefined &&
        input.scoreAudit.scorerModelId !== null &&
        !hasText(input.scoreAudit.scorerModelId)
      ) {
        errors.push("scoreAudit.scorerModelId must be a non-empty string or null.");
      }

      if (
        input.scoreAudit.scoreComputationChecksum !== undefined &&
        input.scoreAudit.scoreComputationChecksum !== null &&
        !hasText(input.scoreAudit.scoreComputationChecksum)
      ) {
        errors.push("scoreAudit.scoreComputationChecksum must be a non-empty string or null.");
      }
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      data: null,
      errors
    };
  }

  return {
    ok: true,
    data: input as CandidateProfilePersistenceInput,
    errors: []
  };
}
