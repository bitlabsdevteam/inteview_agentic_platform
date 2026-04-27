import type {
  EmployerAssistantRecommendationAction,
  EmployerAssistantScreeningKit,
  EmployerAssistantScreeningQuestion
} from "@/lib/agents/employer-assistant/schema";

export type EmployerAssistantScreeningKitInput = {
  action: EmployerAssistantRecommendationAction;
  jobRequirementsText: string;
  candidateSummary: string;
  missingSignals?: string[];
  maxQuestions?: number;
};

type QuestionTemplate = {
  signalKey: string;
  competency: "technical" | "behavioral";
  rubricDimension: string;
  question: string;
  intent: string;
  uncertaintyFlag: boolean;
};

const FALLBACK_TEMPLATES: QuestionTemplate[] = [
  {
    signalKey: "technical_baseline",
    competency: "technical",
    rubricDimension: "technical_depth",
    question: "Walk through one recent backend problem you solved end-to-end and the tradeoffs you made.",
    intent: "Validate baseline technical depth against role requirements.",
    uncertaintyFlag: false
  },
  {
    signalKey: "behavioral_baseline",
    competency: "behavioral",
    rubricDimension: "stakeholder_communication",
    question: "Describe a time you aligned engineering and product stakeholders during a high-pressure delivery.",
    intent: "Confirm collaboration behavior required for employer-side workflow execution.",
    uncertaintyFlag: false
  },
  {
    signalKey: "quality_bar",
    competency: "technical",
    rubricDimension: "quality_ownership",
    question:
      "Explain how you set quality checks before shipping a change that could impact production reliability.",
    intent: "Assess ownership of production quality and release discipline.",
    uncertaintyFlag: false
  }
];

const SIGNAL_TEMPLATE_MAP: Record<string, Omit<QuestionTemplate, "signalKey">> = {
  system_design_depth: {
    competency: "technical",
    rubricDimension: "system_design",
    question:
      "Design a service to handle a 10x traffic increase. What tradeoffs would you make for reliability and latency?",
    intent: "Probe missing system design depth signal with concrete scaling constraints.",
    uncertaintyFlag: true
  },
  production_incident_handling: {
    competency: "technical",
    rubricDimension: "incident_response",
    question:
      "Describe a production incident you led. How did you triage, communicate updates, and prevent recurrence?",
    intent: "Probe missing production incident handling signal.",
    uncertaintyFlag: true
  },
  ownership_scope: {
    competency: "behavioral",
    rubricDimension: "ownership",
    question:
      "Give an example of a project where you owned outcomes beyond coding tasks. What decisions were yours?",
    intent: "Probe missing ownership scope signal across ambiguous profile areas.",
    uncertaintyFlag: true
  },
  stakeholder_influence: {
    competency: "behavioral",
    rubricDimension: "stakeholder_communication",
    question:
      "Tell me about a disagreement with product or leadership and how you influenced the final direction.",
    intent: "Probe missing stakeholder influence and communication signal.",
    uncertaintyFlag: true
  },
  large_scale_migration_depth: {
    competency: "technical",
    rubricDimension: "architecture_migration",
    question:
      "Explain a migration you planned or executed. How did you reduce risk while preserving delivery velocity?",
    intent: "Probe missing large-scale migration depth signal.",
    uncertaintyFlag: true
  },
  cross_functional_communication: {
    competency: "behavioral",
    rubricDimension: "cross_functional_execution",
    question:
      "Describe how you communicate technical tradeoffs to non-engineering teams when timelines are constrained.",
    intent: "Probe missing cross-functional communication signal.",
    uncertaintyFlag: true
  }
};

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

function normalizeQuestionBound(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 5;
  }

  return Math.max(2, Math.min(8, Math.floor(value)));
}

function deriveRequirementBasedTemplate(jobRequirementsText: string): QuestionTemplate | null {
  const lines = normalizeLines(jobRequirementsText);
  const bullets = lines.filter((line) => line.startsWith("- ")).map((line) => line.slice(2).trim());
  const target = (bullets[0] ?? lines[0] ?? "").trim();

  if (!target) {
    return null;
  }

  return {
    signalKey: "job_requirement_alignment",
    competency: "technical",
    rubricDimension: "requirement_alignment",
    question: `Which part of "${target}" have you delivered directly, and how did you measure impact?`,
    intent: "Validate direct alignment with the most visible stated requirement.",
    uncertaintyFlag: false
  };
}

function createTemplateForMissingSignal(signalKey: string): QuestionTemplate {
  const mapped = SIGNAL_TEMPLATE_MAP[signalKey];
  if (mapped) {
    return {
      signalKey,
      ...mapped
    };
  }

  return {
    signalKey,
    competency: "behavioral",
    rubricDimension: "signal_clarification",
    question: `Provide a concrete example that clarifies this signal gap: ${signalKey.replaceAll("_", " ")}.`,
    intent: "Probe missing signal that does not yet have a dedicated template.",
    uncertaintyFlag: true
  };
}

function buildQuestionSet(input: EmployerAssistantScreeningKitInput): EmployerAssistantScreeningQuestion[] {
  const maxQuestions = normalizeQuestionBound(input.maxQuestions);
  const missingSignals = normalizeMissingSignals(input.missingSignals);
  const questions: EmployerAssistantScreeningQuestion[] = [];
  const usedRubricDimensions = new Set<string>();

  for (const signal of missingSignals) {
    if (questions.length >= maxQuestions) {
      break;
    }

    const template = createTemplateForMissingSignal(signal);
    if (usedRubricDimensions.has(template.rubricDimension)) {
      continue;
    }

    usedRubricDimensions.add(template.rubricDimension);
    questions.push({
      question: template.question,
      competency: template.competency,
      intent: template.intent,
      rubricDimension: template.rubricDimension,
      uncertaintyFlag: template.uncertaintyFlag
    });
  }

  const requirementTemplate = deriveRequirementBasedTemplate(input.jobRequirementsText);
  if (
    requirementTemplate &&
    questions.length < maxQuestions &&
    !usedRubricDimensions.has(requirementTemplate.rubricDimension)
  ) {
    usedRubricDimensions.add(requirementTemplate.rubricDimension);
    questions.push({
      question: requirementTemplate.question,
      competency: requirementTemplate.competency,
      intent: requirementTemplate.intent,
      rubricDimension: requirementTemplate.rubricDimension,
      uncertaintyFlag: requirementTemplate.uncertaintyFlag
    });
  }

  for (const fallback of FALLBACK_TEMPLATES) {
    if (questions.length >= maxQuestions) {
      break;
    }

    if (usedRubricDimensions.has(fallback.rubricDimension)) {
      continue;
    }

    usedRubricDimensions.add(fallback.rubricDimension);
    questions.push({
      question: fallback.question,
      competency: fallback.competency,
      intent: fallback.intent,
      rubricDimension: fallback.rubricDimension,
      uncertaintyFlag: fallback.uncertaintyFlag
    });
  }

  return questions;
}

function createTitle(action: EmployerAssistantRecommendationAction) {
  if (action === "request_more_signal") {
    return "Candidate Screening: Missing Signal Clarification";
  }

  if (action === "review_candidate") {
    return "Candidate Screening: Review Confirmation Pack";
  }

  if (action === "improve_job_requirements") {
    return "Candidate Screening: Requirement Alignment Discovery";
  }

  return "Candidate Screening: Next-Step Validation";
}

function createObjective(input: EmployerAssistantScreeningKitInput) {
  const missingSignalCount = normalizeMissingSignals(input.missingSignals).length;
  const candidateSummary = input.candidateSummary.trim();

  if (missingSignalCount > 0) {
    return `Collect structured evidence for ${missingSignalCount} missing signal area(s) before employer decision. Candidate context: ${candidateSummary || "No summary provided."}`;
  }

  return `Collect consistent technical and behavioral evidence before employer decision. Candidate context: ${candidateSummary || "No summary provided."}`;
}

export function generateEmployerAssistantScreeningKit(
  input: EmployerAssistantScreeningKitInput
): EmployerAssistantScreeningKit {
  return {
    title: createTitle(input.action),
    objective: createObjective(input),
    questions: buildQuestionSet(input)
  };
}
