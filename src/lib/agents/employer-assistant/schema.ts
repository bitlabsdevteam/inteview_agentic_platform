export const EMPLOYER_ASSISTANT_ACTIONS = [
  "screen_candidate",
  "request_more_signal",
  "review_candidate",
  "improve_job_requirements"
] as const;

export const EMPLOYER_ASSISTANT_EVIDENCE_SOURCES = [
  "candidate_score",
  "candidate_profile",
  "job_requirement",
  "resume_excerpt"
] as const;

export const EMPLOYER_ASSISTANT_RISK_SEVERITIES = ["low", "medium", "high"] as const;

export type EmployerAssistantRecommendationAction = (typeof EMPLOYER_ASSISTANT_ACTIONS)[number];
export type EmployerAssistantEvidenceSource = (typeof EMPLOYER_ASSISTANT_EVIDENCE_SOURCES)[number];
export type EmployerAssistantRiskSeverity = (typeof EMPLOYER_ASSISTANT_RISK_SEVERITIES)[number];

export type EmployerAssistantEvidenceReference = {
  sourceType: EmployerAssistantEvidenceSource;
  referenceId: string;
  quote: string;
  relevance: number;
};

export type EmployerAssistantRiskFlag = {
  code: string;
  severity: EmployerAssistantRiskSeverity;
  message: string;
  mitigation?: string;
};

export type EmployerAssistantScreeningQuestion = {
  question: string;
  competency: string;
  intent: string;
  rubricDimension: string;
  uncertaintyFlag: boolean;
};

export type EmployerAssistantScreeningKit = {
  title: string;
  objective: string;
  questions: EmployerAssistantScreeningQuestion[];
};

export type EmployerAssistantRecommendation = {
  action: EmployerAssistantRecommendationAction;
  rationale: string;
  evidenceReferences: EmployerAssistantEvidenceReference[];
  riskFlags: EmployerAssistantRiskFlag[];
  screeningKit?: EmployerAssistantScreeningKit;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isProbability(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function validateEvidenceReferences(value: unknown, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push("evidenceReferences must be an array.");
    return;
  }

  if (value.length === 0) {
    errors.push("evidenceReferences must include at least one item.");
    return;
  }

  value.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`evidenceReferences[${index}] must be an object.`);
      return;
    }

    if (
      typeof item.sourceType !== "string" ||
      !EMPLOYER_ASSISTANT_EVIDENCE_SOURCES.includes(
        item.sourceType as EmployerAssistantEvidenceSource
      )
    ) {
      errors.push(
        `evidenceReferences[${index}].sourceType must be one of ${EMPLOYER_ASSISTANT_EVIDENCE_SOURCES.join(", ")}.`
      );
    }

    if (!hasText(item.referenceId)) {
      errors.push(`evidenceReferences[${index}].referenceId is required.`);
    }

    if (!hasText(item.quote)) {
      errors.push(`evidenceReferences[${index}].quote is required.`);
    }

    if (!isProbability(item.relevance)) {
      errors.push(`evidenceReferences[${index}].relevance must be a number between 0 and 1.`);
    }
  });
}

function validateRiskFlags(value: unknown, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push("riskFlags must be an array.");
    return;
  }

  value.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`riskFlags[${index}] must be an object.`);
      return;
    }

    if (!hasText(item.code)) {
      errors.push(`riskFlags[${index}].code is required.`);
    }

    if (
      typeof item.severity !== "string" ||
      !EMPLOYER_ASSISTANT_RISK_SEVERITIES.includes(item.severity as EmployerAssistantRiskSeverity)
    ) {
      errors.push(
        `riskFlags[${index}].severity must be one of ${EMPLOYER_ASSISTANT_RISK_SEVERITIES.join(", ")}.`
      );
    }

    if (!hasText(item.message)) {
      errors.push(`riskFlags[${index}].message is required.`);
    }

    if (item.mitigation !== undefined && !hasText(item.mitigation)) {
      errors.push(`riskFlags[${index}].mitigation must be a non-empty string when provided.`);
    }
  });
}

function validateScreeningKit(value: unknown, errors: string[]) {
  if (!isRecord(value)) {
    errors.push("screeningKit must be an object when provided.");
    return;
  }

  if (!hasText(value.title)) {
    errors.push("screeningKit.title is required.");
  }

  if (!hasText(value.objective)) {
    errors.push("screeningKit.objective is required.");
  }

  if (!Array.isArray(value.questions)) {
    errors.push("screeningKit.questions must be an array.");
    return;
  }

  if (value.questions.length === 0) {
    errors.push("screeningKit.questions must include at least one item.");
    return;
  }

  value.questions.forEach((question, index) => {
    if (!isRecord(question)) {
      errors.push(`screeningKit.questions[${index}] must be an object.`);
      return;
    }

    if (!hasText(question.question)) {
      errors.push(`screeningKit.questions[${index}].question is required.`);
    }

    if (!hasText(question.competency)) {
      errors.push(`screeningKit.questions[${index}].competency is required.`);
    }

    if (!hasText(question.intent)) {
      errors.push(`screeningKit.questions[${index}].intent is required.`);
    }

    if (!hasText(question.rubricDimension)) {
      errors.push(`screeningKit.questions[${index}].rubricDimension is required.`);
    }

    if (typeof question.uncertaintyFlag !== "boolean") {
      errors.push(`screeningKit.questions[${index}].uncertaintyFlag must be a boolean.`);
    }
  });
}

export function validateEmployerAssistantRecommendation(
  recommendation: unknown
): ValidationResult<EmployerAssistantRecommendation> {
  if (!isRecord(recommendation)) {
    return {
      ok: false,
      data: null,
      errors: ["Employer assistant recommendation must be an object."]
    };
  }

  const errors: string[] = [];

  if (
    typeof recommendation.action !== "string" ||
    !EMPLOYER_ASSISTANT_ACTIONS.includes(
      recommendation.action as EmployerAssistantRecommendationAction
    )
  ) {
    errors.push(`action must be one of ${EMPLOYER_ASSISTANT_ACTIONS.join(", ")}.`);
  }

  if (!hasText(recommendation.rationale)) {
    errors.push("rationale is required.");
  }

  validateEvidenceReferences(recommendation.evidenceReferences, errors);
  validateRiskFlags(recommendation.riskFlags, errors);

  if (recommendation.screeningKit !== undefined) {
    validateScreeningKit(recommendation.screeningKit, errors);
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
    data: recommendation as EmployerAssistantRecommendation,
    errors: []
  };
}
