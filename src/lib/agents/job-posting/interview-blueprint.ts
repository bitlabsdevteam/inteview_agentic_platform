export const INTERVIEW_BLUEPRINT_RESPONSE_MODES = ["text", "voice_agent"] as const;
export const INTERVIEW_BLUEPRINT_TONE_PROFILES = [
  "direct",
  "supportive",
  "neutral",
  "high-precision"
] as const;
export const INTERVIEW_BLUEPRINT_PARSING_STRATEGIES = [
  "keyword_match",
  "evidence_extraction",
  "rubric_scoring",
  "hybrid"
] as const;

export type InterviewBlueprintResponseMode =
  (typeof INTERVIEW_BLUEPRINT_RESPONSE_MODES)[number];
export type InterviewBlueprintToneProfile =
  (typeof INTERVIEW_BLUEPRINT_TONE_PROFILES)[number];
export type InterviewBlueprintParsingStrategy =
  (typeof INTERVIEW_BLUEPRINT_PARSING_STRATEGIES)[number];

export type InterviewBlueprintQuestion = {
  questionText: string;
  questionOrder: number;
  intent: string;
  evaluationFocus: string;
  strongSignal: string;
  failureSignal: string;
  followUpPrompt: string;
};

export type InterviewBlueprintStage = {
  stageLabel: string;
  stageOrder: number;
  questions: InterviewBlueprintQuestion[];
};

export type InterviewBlueprint = {
  status: "draft";
  title: string;
  objective: string;
  responseMode: InterviewBlueprintResponseMode;
  toneProfile: InterviewBlueprintToneProfile;
  parsingStrategy: InterviewBlueprintParsingStrategy;
  benchmarkSummary: string;
  approvalNotes: string;
  stages: InterviewBlueprintStage[];
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

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function normalizeQuestion(question: InterviewBlueprintQuestion): InterviewBlueprintQuestion {
  return {
    questionText: normalizeText(question.questionText),
    questionOrder: question.questionOrder,
    intent: normalizeText(question.intent),
    evaluationFocus: normalizeText(question.evaluationFocus),
    strongSignal: normalizeText(question.strongSignal),
    failureSignal: normalizeText(question.failureSignal),
    followUpPrompt: normalizeText(question.followUpPrompt)
  };
}

function normalizeStage(stage: InterviewBlueprintStage): InterviewBlueprintStage {
  return {
    stageLabel: normalizeText(stage.stageLabel),
    stageOrder: stage.stageOrder,
    questions: stage.questions.map(normalizeQuestion)
  };
}

function validateQuestion(value: unknown, stageIndex: number, questionIndex: number, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`stages[${stageIndex}].questions[${questionIndex}] must be an object.`);
    return;
  }

  if (!hasText(value.questionText)) {
    errors.push(`stages[${stageIndex}].questions[${questionIndex}].questionText is required.`);
  }

  if (!isPositiveInteger(value.questionOrder)) {
    errors.push(`stages[${stageIndex}].questions[${questionIndex}].questionOrder must be a positive integer.`);
  }

  if (!hasText(value.intent)) {
    errors.push(`stages[${stageIndex}].questions[${questionIndex}].intent is required.`);
  }

  if (!hasText(value.evaluationFocus)) {
    errors.push(`stages[${stageIndex}].questions[${questionIndex}].evaluationFocus is required.`);
  }

  if (!hasText(value.strongSignal)) {
    errors.push(`stages[${stageIndex}].questions[${questionIndex}].strongSignal is required.`);
  }

  if (!hasText(value.failureSignal)) {
    errors.push(`stages[${stageIndex}].questions[${questionIndex}].failureSignal is required.`);
  }

  if (!hasText(value.followUpPrompt)) {
    errors.push(`stages[${stageIndex}].questions[${questionIndex}].followUpPrompt is required.`);
  }
}

function validateStage(value: unknown, stageIndex: number, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`stages[${stageIndex}] must be an object.`);
    return;
  }

  if (!hasText(value.stageLabel)) {
    errors.push(`stages[${stageIndex}].stageLabel is required.`);
  }

  if (!isPositiveInteger(value.stageOrder)) {
    errors.push(`stages[${stageIndex}].stageOrder must be a positive integer.`);
  }

  if (!Array.isArray(value.questions)) {
    errors.push(`stages[${stageIndex}].questions must be an array.`);
    return;
  }

  value.questions.forEach((question, questionIndex) => {
    validateQuestion(question, stageIndex, questionIndex, errors);
  });
}

export function validateInterviewBlueprint(
  blueprint: unknown
): ValidationResult<InterviewBlueprint> {
  if (!isRecord(blueprint)) {
    return {
      ok: false,
      data: null,
      errors: ["Interview blueprint must be an object."]
    };
  }

  const errors: string[] = [];

  if (blueprint.status !== "draft") {
    errors.push("status must be draft.");
  }

  if (!hasText(blueprint.title)) {
    errors.push("title is required.");
  }

  if (!hasText(blueprint.objective)) {
    errors.push("objective is required.");
  }

  if (
    typeof blueprint.responseMode !== "string" ||
    !INTERVIEW_BLUEPRINT_RESPONSE_MODES.includes(
      blueprint.responseMode as InterviewBlueprintResponseMode
    )
  ) {
    errors.push(
      `responseMode must be one of ${INTERVIEW_BLUEPRINT_RESPONSE_MODES.join(", ")}.`
    );
  }

  if (
    typeof blueprint.toneProfile !== "string" ||
    !INTERVIEW_BLUEPRINT_TONE_PROFILES.includes(
      blueprint.toneProfile as InterviewBlueprintToneProfile
    )
  ) {
    errors.push(
      `toneProfile must be one of ${INTERVIEW_BLUEPRINT_TONE_PROFILES.join(", ")}.`
    );
  }

  if (
    typeof blueprint.parsingStrategy !== "string" ||
    !INTERVIEW_BLUEPRINT_PARSING_STRATEGIES.includes(
      blueprint.parsingStrategy as InterviewBlueprintParsingStrategy
    )
  ) {
    errors.push(
      `parsingStrategy must be one of ${INTERVIEW_BLUEPRINT_PARSING_STRATEGIES.join(", ")}.`
    );
  }

  if (!hasText(blueprint.benchmarkSummary)) {
    errors.push("benchmarkSummary is required.");
  }

  if (!hasText(blueprint.approvalNotes)) {
    errors.push("approvalNotes is required.");
  }

  if (!Array.isArray(blueprint.stages)) {
    errors.push("stages must be an array.");
  } else if (blueprint.stages.length === 0) {
    errors.push("stages must include at least one item.");
  } else {
    blueprint.stages.forEach((stage, stageIndex) => {
      validateStage(stage, stageIndex, errors);
    });
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
    data: blueprint as InterviewBlueprint,
    errors: []
  };
}

export function normalizeInterviewBlueprint(blueprint: InterviewBlueprint): InterviewBlueprint {
  return {
    status: "draft",
    title: normalizeText(blueprint.title),
    objective: normalizeText(blueprint.objective),
    responseMode: blueprint.responseMode,
    toneProfile: blueprint.toneProfile,
    parsingStrategy: blueprint.parsingStrategy,
    benchmarkSummary: normalizeText(blueprint.benchmarkSummary),
    approvalNotes: normalizeText(blueprint.approvalNotes),
    stages: blueprint.stages.map(normalizeStage)
  };
}

export function deriveInterviewBlueprintCompletenessGaps(
  blueprint: InterviewBlueprint
): string[] {
  const gaps: string[] = [];

  if (!hasText(blueprint.responseMode)) {
    gaps.push("Select response mode for the interview plan.");
  }

  if (!hasText(blueprint.parsingStrategy)) {
    gaps.push("Select parsing strategy for interview evaluation.");
  }

  if (!hasText(blueprint.benchmarkSummary)) {
    gaps.push("Add at least one benchmark summary for evaluator guidance.");
  }

  blueprint.stages.forEach((stage) => {
    if (!Array.isArray(stage.questions) || stage.questions.length === 0) {
      gaps.push(`Add at least one interview question to stage: ${normalizeText(stage.stageLabel)}.`);
    }
  });

  return gaps;
}
