import type { RoleProfile, RoleProfileConflict } from "@/lib/agents/job-posting/role-profile";

export type ClarificationPriority = "high" | "medium" | "low";

export type ClarificationQuestion = {
  key: string;
  question: string;
  priority: ClarificationPriority;
  rationale: string;
};

export type RequirementDiscoveryResult = {
  clarificationQuestions: ClarificationQuestion[];
  updateInstructions: string[];
  suppressedQuestions: string[];
};

export type RequirementDiscoveryInput = {
  profile: RoleProfile;
  previouslyAskedQuestions: string[];
};

const MAX_CLARIFICATIONS_PER_TURN = 3;

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildConflictQuestion(conflict: RoleProfileConflict): ClarificationQuestion {
  if (conflict.field === "compensationRange") {
    return {
      key: "conflict:compensationRange",
      question: "Should we align seniority expectations or the compensation range for this role?",
      priority: conflict.severity === "high" ? "high" : "medium",
      rationale: conflict.issue
    };
  }

  return {
    key: `conflict:${conflict.field}`,
    question: `How should we resolve the ${conflict.field} conflict before drafting?`,
    priority: conflict.severity === "high" ? "high" : conflict.severity,
    rationale: conflict.issue
  };
}

function buildConstraintQuestion(constraint: string): ClarificationQuestion | null {
  const normalized = normalizeText(constraint);

  if (normalized.includes("compensation")) {
    return {
      key: "constraint:compensation",
      question: "What compensation range is approved by finance for this role?",
      priority: "high",
      rationale: "Compensation must be finalized for accurate candidate targeting and budget alignment."
    };
  }

  if (normalized.includes("location")) {
    return {
      key: "constraint:location",
      question: "What location policy should this role use (remote, hybrid, or on-site)?",
      priority: "high",
      rationale: "Location policy is required to define sourcing scope and candidate eligibility."
    };
  }

  if (normalized.includes("hiring manager")) {
    return {
      key: "constraint:hiring_manager",
      question: "Who is the hiring manager and final approver for this role?",
      priority: "low",
      rationale: "Hiring manager ownership is needed for approval flow and decision accountability."
    };
  }

  if (normalized.includes("interview loop")) {
    return {
      key: "constraint:interview_loop",
      question: "What interview loop stages should we lock in for this role?",
      priority: "low",
      rationale: "Interview loop definition is required for candidate pipeline planning."
    };
  }

  return null;
}

function priorityRank(priority: ClarificationPriority) {
  if (priority === "high") {
    return 0;
  }
  if (priority === "medium") {
    return 1;
  }
  return 2;
}

function dedupeByKey(candidates: ClarificationQuestion[]) {
  const seen = new Set<string>();
  const result: ClarificationQuestion[] = [];

  for (const candidate of candidates) {
    if (seen.has(candidate.key)) {
      continue;
    }
    seen.add(candidate.key);
    result.push(candidate);
  }

  return result;
}

export function discoverRequirementClarifications(
  input: RequirementDiscoveryInput
): RequirementDiscoveryResult {
  const candidates: ClarificationQuestion[] = [];

  for (const conflict of input.profile.conflicts) {
    candidates.push(buildConflictQuestion(conflict));
  }

  for (const unresolved of input.profile.unresolvedConstraints) {
    const question = buildConstraintQuestion(unresolved);
    if (question) {
      candidates.push(question);
    }
  }

  const uniqueCandidates = dedupeByKey(candidates).sort((a, b) => {
    const priorityDelta = priorityRank(a.priority) - priorityRank(b.priority);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    return 0;
  });

  if (uniqueCandidates.length === 0) {
    return {
      clarificationQuestions: [],
      updateInstructions: [
        "No additional clarification required. Continue refining draft wording using the normalized role profile."
      ],
      suppressedQuestions: []
    };
  }

  const previouslyAsked = new Set(input.previouslyAskedQuestions.map(normalizeText));
  const clarificationQuestions: ClarificationQuestion[] = [];
  const suppressedQuestions: string[] = [];

  for (const candidate of uniqueCandidates) {
    if (previouslyAsked.has(normalizeText(candidate.question))) {
      suppressedQuestions.push(candidate.question);
      continue;
    }

    if (clarificationQuestions.length >= MAX_CLARIFICATIONS_PER_TURN) {
      continue;
    }

    clarificationQuestions.push(candidate);
  }

  return {
    clarificationQuestions,
    updateInstructions: [
      "Apply employer clarification answers to role profile fields before drafting the next JD revision.",
      "Persist resolved constraints and close superseded clarification items for this session."
    ],
    suppressedQuestions
  };
}
