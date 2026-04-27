import type { RoleProfile } from "@/lib/agents/job-posting/role-profile";

export const QUALITY_CHECK_TYPES = [
  "completeness",
  "readability",
  "discriminatory_phrasing",
  "requirement_contradiction"
] as const;

export type QualityCheckType = (typeof QUALITY_CHECK_TYPES)[number];
export type QualityCheckStatus = "pass" | "warn" | "fail";

export type JobDescriptionQualityCheck = {
  checkType: QualityCheckType;
  status: QualityCheckStatus;
  issues: string[];
  suggestedRewrite: string;
};

export type JobDescriptionQualityResult = {
  overallStatus: QualityCheckStatus;
  checks: JobDescriptionQualityCheck[];
  readinessFlags: {
    blocksReview: boolean;
    requiresEmployerFix: boolean;
  };
};

export type EvaluateJobDescriptionQualityInput = {
  draftDescription: string;
  profile: RoleProfile;
};

function normalize(text: string) {
  return text.toLowerCase();
}

function containsSection(text: string, sectionLabel: string) {
  const lower = normalize(text);
  const normalizedLabel = normalize(sectionLabel);
  return lower.includes(`${normalizedLabel}:`);
}

function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function extractCompensationLow(text: string) {
  const rangeMatch = /\$\s*(\d{2,3})k\s*[-–]\s*\$\s*(\d{2,3})k/i.exec(text);
  if (rangeMatch) {
    return Number(rangeMatch[1]);
  }

  const singleMatch = /\$\s*(\d{2,3})k\b/i.exec(text);
  if (singleMatch) {
    return Number(singleMatch[1]);
  }

  return null;
}

function evaluateCompleteness(text: string): JobDescriptionQualityCheck {
  const issues: string[] = [];

  if (!containsSection(text, "requirements")) {
    issues.push("Missing required section: Requirements.");
  }

  if (!containsSection(text, "interview process")) {
    issues.push("Missing required section: Interview process.");
  }

  if (issues.length > 0) {
    return {
      checkType: "completeness",
      status: "fail",
      issues,
      suggestedRewrite:
        "Add explicit Requirements and Interview process sections aligned to the normalized role profile."
    };
  }

  return {
    checkType: "completeness",
    status: "pass",
    issues: [],
    suggestedRewrite: "No rewrite needed."
  };
}

function evaluateReadability(text: string): JobDescriptionQualityCheck {
  const issues: string[] = [];
  const words = countWords(text);
  const lower = normalize(text);

  if (words < 40) {
    issues.push("Draft is too short to communicate role scope and expectations clearly.");
  }

  if (lower.includes("handle everything") || lower.includes("always online")) {
    issues.push("Draft includes vague or extreme phrasing that reduces clarity.");
  }

  if (issues.length > 0) {
    return {
      checkType: "readability",
      status: "warn",
      issues,
      suggestedRewrite:
        "Use specific, role-relevant language and balanced expectations to improve readability."
    };
  }

  return {
    checkType: "readability",
    status: "pass",
    issues: [],
    suggestedRewrite: "No rewrite needed."
  };
}

function evaluateDiscriminatoryPhrasing(text: string): JobDescriptionQualityCheck {
  const issues: string[] = [];
  const lower = normalize(text);

  if (lower.includes("under 30 years old")) {
    issues.push("Potentially discriminatory phrase detected: 'under 30 years old'.");
  }

  if (lower.includes("native english speaker")) {
    issues.push("Potentially exclusionary phrase detected: 'native English speaker'.");
  }

  if (lower.includes("rockstar engineer")) {
    issues.push("Potentially biased phrase detected: 'rockstar engineer'.");
  }

  if (issues.length > 0) {
    return {
      checkType: "discriminatory_phrasing",
      status: "fail",
      issues,
      suggestedRewrite:
        "Replace exclusionary or biased phrasing with skill-based, job-relevant language."
    };
  }

  return {
    checkType: "discriminatory_phrasing",
    status: "pass",
    issues: [],
    suggestedRewrite: "No rewrite needed."
  };
}

function evaluateRequirementContradiction(
  draftDescription: string,
  profile: RoleProfile
): JobDescriptionQualityCheck {
  const issues: string[] = [];

  const profileLow = extractCompensationLow(profile.compensationRange);
  const draftLow = extractCompensationLow(draftDescription);

  const isJuniorHighCompensation = profile.level.toLowerCase() === "junior" && profileLow !== null && profileLow >= 180;
  if (isJuniorHighCompensation) {
    return {
      checkType: "requirement_contradiction",
      status: "fail",
      issues: [
        "Profile contradiction detected: junior level with high compensation band requires explicit employer confirmation."
      ],
      suggestedRewrite:
        "Resolve level-versus-compensation contradiction before marking this draft ready for review."
    };
  }

  if (profileLow !== null && draftLow !== null && draftLow < profileLow) {
    issues.push("Draft compensation appears inconsistent with normalized profile compensation range.");
  }

  if (issues.length > 0) {
    return {
      checkType: "requirement_contradiction",
      status: "warn",
      issues,
      suggestedRewrite:
        "Align compensation details with the approved profile range or request employer clarification."
    };
  }

  return {
    checkType: "requirement_contradiction",
    status: "pass",
    issues: [],
    suggestedRewrite: "No rewrite needed."
  };
}

function deriveOverallStatus(checks: JobDescriptionQualityCheck[]): QualityCheckStatus {
  if (checks.some((check) => check.status === "fail")) {
    return "fail";
  }

  if (checks.some((check) => check.status === "warn")) {
    return "warn";
  }

  return "pass";
}

export function evaluateJobDescriptionQuality(
  input: EvaluateJobDescriptionQualityInput
): JobDescriptionQualityResult {
  const text = input.draftDescription.trim();

  const checks: JobDescriptionQualityCheck[] = [
    evaluateCompleteness(text),
    evaluateReadability(text),
    evaluateDiscriminatoryPhrasing(text),
    evaluateRequirementContradiction(text, input.profile)
  ];

  const overallStatus = deriveOverallStatus(checks);

  return {
    overallStatus,
    checks,
    readinessFlags: {
      blocksReview: overallStatus === "fail",
      requiresEmployerFix: overallStatus !== "pass"
    }
  };
}
