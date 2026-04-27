import type {
  EmployerAssistantEvidenceReference,
  EmployerAssistantRecommendation,
  EmployerAssistantRecommendationAction,
  EmployerAssistantRiskFlag
} from "@/lib/agents/employer-assistant/schema";
import type { CandidateRequirementFitScores } from "@/lib/agents/candidate-intake/schema";

export type EmployerAssistantAdvisorInput = {
  jobRequirementsText: string;
  candidateSummary: string;
  aggregateScore: number | null;
  overallConfidence: number | null;
  requirementFitScores?: CandidateRequirementFitScores;
  scoreEvidenceSnippets?: string[];
  missingSignals?: string[];
};

const SCORE_REVIEW_THRESHOLD = 0.8;
const CONFIDENCE_REVIEW_THRESHOLD = 0.75;
const CONFIDENCE_LOW_THRESHOLD = 0.55;
const MAX_MISSING_FOR_REVIEW = 1;
const MISSING_CRITICAL_THRESHOLD = 3;

function clampUnit(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function normalizeMissingSignals(values: string[] | undefined) {
  if (!values) {
    return [];
  }

  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort();
}

function isUnderdefinedRequirements(text: string) {
  const lines = normalizeLines(text);
  const bulletLines = lines.filter((line) => line.startsWith("- ")).map((line) => line.slice(2).trim());
  const effective = bulletLines.length ? bulletLines : lines;
  const tokenCount = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1).length;

  return effective.length < 2 || (effective.length < 3 && tokenCount < 10);
}

function toQuotedSnippet(value: string, maxLength = 180) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "No evidence snippet provided.";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function resolveAction(input: {
  requirementsUnderdefined: boolean;
  aggregateScore: number | null;
  overallConfidence: number | null;
  missingSignalsCount: number;
}): EmployerAssistantRecommendationAction {
  if (input.requirementsUnderdefined) {
    return "improve_job_requirements";
  }

  if (
    input.aggregateScore === null ||
    input.overallConfidence === null ||
    input.overallConfidence < CONFIDENCE_LOW_THRESHOLD ||
    input.missingSignalsCount >= MISSING_CRITICAL_THRESHOLD
  ) {
    return "request_more_signal";
  }

  if (
    input.aggregateScore >= SCORE_REVIEW_THRESHOLD &&
    input.overallConfidence >= CONFIDENCE_REVIEW_THRESHOLD &&
    input.missingSignalsCount <= MAX_MISSING_FOR_REVIEW
  ) {
    return "review_candidate";
  }

  return "screen_candidate";
}

function createRationale(input: {
  action: EmployerAssistantRecommendationAction;
  aggregateScore: number | null;
  overallConfidence: number | null;
  missingSignals: string[];
  requirementsUnderdefined: boolean;
}) {
  const scoreText =
    input.aggregateScore === null
      ? "aggregate score unavailable"
      : `aggregate score ${(input.aggregateScore * 100).toFixed(0)}%`;
  const confidenceText =
    input.overallConfidence === null
      ? "confidence unavailable"
      : `confidence ${(input.overallConfidence * 100).toFixed(0)}%`;
  const missingText = input.missingSignals.length
    ? `Missing signals: ${input.missingSignals.join(", ")}.`
    : "No critical missing signals detected.";

  if (input.action === "improve_job_requirements") {
    return `Job requirements are underdefined, so candidate guidance quality is constrained (${scoreText}, ${confidenceText}). Improve requirement specificity before advancing decisions. ${missingText}`;
  }

  if (input.action === "request_more_signal") {
    return `Current evidence is insufficient for a reliable decision (${scoreText}, ${confidenceText}). Collect targeted signal before deciding next pipeline movement. ${missingText}`;
  }

  if (input.action === "review_candidate") {
    return `Candidate demonstrates strong fit with reliable evidence (${scoreText}, ${confidenceText}). Proceed to employer review with focused checkpoint validation. ${missingText}`;
  }

  return `Candidate shows partial fit with manageable uncertainty (${scoreText}, ${confidenceText}). Run a structured screen to validate open areas before review. ${missingText}`;
}

function createEvidenceReferences(input: {
  jobRequirementsText: string;
  candidateSummary: string;
  aggregateScore: number | null;
  scoreEvidenceSnippets: string[];
}): EmployerAssistantEvidenceReference[] {
  const references: EmployerAssistantEvidenceReference[] = [];

  if (input.aggregateScore !== null) {
    references.push({
      sourceType: "candidate_score",
      referenceId: "aggregate_score",
      quote: `Deterministic aggregate score ${(input.aggregateScore * 100).toFixed(0)}%.`,
      relevance: 0.9
    });
  }

  references.push({
    sourceType: "job_requirement",
    referenceId: "job_requirements",
    quote: toQuotedSnippet(input.jobRequirementsText, 200),
    relevance: 0.8
  });

  references.push({
    sourceType: "candidate_profile",
    referenceId: "candidate_summary",
    quote: toQuotedSnippet(input.candidateSummary),
    relevance: 0.75
  });

  if (input.scoreEvidenceSnippets.length > 0) {
    references.push({
      sourceType: "resume_excerpt",
      referenceId: "score_evidence_1",
      quote: toQuotedSnippet(input.scoreEvidenceSnippets[0], 200),
      relevance: 0.7
    });
  }

  return references;
}

function createRiskFlags(input: {
  action: EmployerAssistantRecommendationAction;
  requirementsUnderdefined: boolean;
  overallConfidence: number | null;
  missingSignals: string[];
}): EmployerAssistantRiskFlag[] {
  const riskFlags: EmployerAssistantRiskFlag[] = [];

  if (input.requirementsUnderdefined) {
    riskFlags.push({
      code: "job_requirements_underdefined",
      severity: "high",
      message: "Job requirements are too vague to support reliable recommendation quality.",
      mitigation: "Add explicit must-have skills, ownership scope, and outcome expectations."
    });
  }

  if (input.overallConfidence === null || input.overallConfidence < CONFIDENCE_LOW_THRESHOLD) {
    riskFlags.push({
      code: "low_confidence_signal",
      severity: "high",
      message: "Candidate confidence signal is below reliability threshold.",
      mitigation: "Collect structured responses focused on missing or ambiguous evidence."
    });
  }

  if (input.missingSignals.length >= MISSING_CRITICAL_THRESHOLD) {
    riskFlags.push({
      code: "missing_critical_evidence",
      severity: "medium",
      message: `Multiple critical evidence gaps remain: ${input.missingSignals.join(", ")}.`,
      mitigation: "Run targeted screening questions for each missing signal."
    });
  }

  if (riskFlags.length === 0 && input.action === "screen_candidate") {
    riskFlags.push({
      code: "moderate_signal_uncertainty",
      severity: "low",
      message: "Candidate appears promising but requires structured screening for confirmation.",
      mitigation: "Use a focused screening kit before final review."
    });
  }

  return riskFlags;
}

export function adviseEmployerNextStep(input: EmployerAssistantAdvisorInput): EmployerAssistantRecommendation {
  const aggregateScore = clampUnit(input.aggregateScore);
  const overallConfidence = clampUnit(input.overallConfidence);
  const scoreEvidenceSnippets = (input.scoreEvidenceSnippets ?? []).map((item) => item.trim()).filter(Boolean);
  const missingSignals = normalizeMissingSignals(input.missingSignals);
  const requirementsText = normalizeText(input.jobRequirementsText);
  const requirementsUnderdefined = isUnderdefinedRequirements(requirementsText);

  const action = resolveAction({
    requirementsUnderdefined,
    aggregateScore,
    overallConfidence,
    missingSignalsCount: missingSignals.length
  });

  return {
    action,
    rationale: createRationale({
      action,
      aggregateScore,
      overallConfidence,
      missingSignals,
      requirementsUnderdefined
    }),
    evidenceReferences: createEvidenceReferences({
      jobRequirementsText: requirementsText,
      candidateSummary: input.candidateSummary,
      aggregateScore,
      scoreEvidenceSnippets
    }),
    riskFlags: createRiskFlags({
      action,
      requirementsUnderdefined,
      overallConfidence,
      missingSignals
    })
  };
}
