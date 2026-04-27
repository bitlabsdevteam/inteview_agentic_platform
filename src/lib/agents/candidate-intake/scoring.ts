import {
  validateCandidateProfileScore,
  type CandidateExtractionOutput,
  type CandidateProfileScore
} from "@/lib/agents/candidate-intake/schema";

export type CandidateRequirementFitScoringInput = {
  requirementText: string;
  profile: CandidateExtractionOutput;
  scoreVersion?: string;
  maxEvidenceSnippets?: number;
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "or",
  "the",
  "to",
  "of",
  "for",
  "with",
  "in",
  "on",
  "by",
  "as",
  "is",
  "are",
  "be",
  "from",
  "at",
  "this",
  "that"
]);

function clampUnit(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function roundTwo(value: number) {
  return Math.round(clampUnit(value) * 100) / 100;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function toTokenSet(value: string) {
  return new Set(tokenize(value));
}

function scoreTokenOverlap(source: Set<string>, target: Set<string>) {
  if (target.size === 0) {
    return 0;
  }

  let matched = 0;
  for (const token of target) {
    if (source.has(token)) {
      matched += 1;
    }
  }

  return matched / target.size;
}

function parseRequirementLines(requirementText: string) {
  return requirementText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter((line) => line.length > 0);
}

function parseRequirementText(requirementText: string) {
  const trimmed = requirementText.trim();

  if (!trimmed) {
    throw new Error("Requirement text is required for candidate scoring.");
  }

  const lines = parseRequirementLines(trimmed);
  const effectiveLines = lines.length ? lines : [trimmed];
  const allTokens = new Set<string>();

  for (const line of effectiveLines) {
    for (const token of tokenize(line)) {
      allTokens.add(token);
    }
  }

  return {
    lines: effectiveLines,
    tokens: allTokens
  };
}

function containsEducationRequirement(requirementTokens: Set<string>) {
  const keywords = ["degree", "bachelor", "masters", "phd", "education", "equivalent"];
  return keywords.some((keyword) => requirementTokens.has(keyword));
}

function createEvidenceSnippets(input: {
  requirementLines: string[];
  profile: CandidateExtractionOutput;
  maxSnippets: number;
}) {
  const snippets: string[] = [];
  const summary = input.profile.summary.trim();
  const skillSet = new Set(input.profile.skills.map((skill) => normalizeText(skill)));

  for (const requirement of input.requirementLines) {
    if (snippets.length >= input.maxSnippets) {
      break;
    }

    const requirementTokens = toTokenSet(requirement);
    const matchedSkill = input.profile.skills.find((skill) =>
      requirementTokens.has(normalizeText(skill)) ||
      tokenize(skill).some((token) => requirementTokens.has(token))
    );

    if (matchedSkill) {
      snippets.push(`Matched requirement "${requirement}" via skill: ${matchedSkill}.`);
      continue;
    }

    const matchedWork = input.profile.workExperience.find((item) => {
      const itemTokens = toTokenSet(item);
      return scoreTokenOverlap(itemTokens, requirementTokens) > 0;
    });

    if (matchedWork) {
      snippets.push(`Matched requirement "${requirement}" via experience: ${matchedWork.trim()}`);
      continue;
    }

    if (summary && scoreTokenOverlap(toTokenSet(summary), requirementTokens) > 0) {
      snippets.push(`Matched requirement "${requirement}" via summary evidence.`);
    }
  }

  if (!snippets.length) {
    snippets.push("Limited direct requirement overlap detected; manual review recommended.");
  }

  return snippets.slice(0, input.maxSnippets);
}

export function calibrateCandidateRequirementFitScore(
  input: CandidateRequirementFitScoringInput
): CandidateProfileScore {
  const requirements = parseRequirementText(input.requirementText);
  const scoreVersion = input.scoreVersion?.trim() || "v1-requirement-fit";
  const maxEvidenceSnippets = Math.max(1, Math.min(5, input.maxEvidenceSnippets ?? 3));

  const skillsTokens = new Set<string>();
  for (const skill of input.profile.skills) {
    for (const token of tokenize(skill)) {
      skillsTokens.add(token);
    }
  }

  const workTokens = new Set<string>();
  for (const item of input.profile.workExperience) {
    for (const token of tokenize(item)) {
      workTokens.add(token);
    }
  }

  const summaryTokens = toTokenSet(input.profile.summary);

  const educationTokens = new Set<string>();
  for (const item of input.profile.education) {
    for (const token of tokenize(item)) {
      educationTokens.add(token);
    }
  }

  const hardSkillsBase = scoreTokenOverlap(skillsTokens, requirements.tokens);
  const roleExperienceBase = scoreTokenOverlap(workTokens, requirements.tokens);
  const domainContextBase = scoreTokenOverlap(summaryTokens, requirements.tokens);
  const educationBase = containsEducationRequirement(requirements.tokens)
    ? scoreTokenOverlap(educationTokens, requirements.tokens)
    : 1;

  const hardSkills = roundTwo(hardSkillsBase * input.profile.confidence.skills);
  const roleExperience = roundTwo(roleExperienceBase * input.profile.confidence.workExperience);
  const domainContext = roundTwo(
    domainContextBase * ((input.profile.confidence.summary + input.profile.confidence.workExperience) / 2)
  );
  const educationSignals = roundTwo(educationBase * input.profile.confidence.education);

  const weightedBase =
    hardSkills * 0.35 + roleExperience * 0.3 + domainContext * 0.2 + educationSignals * 0.15;
  const confidenceAdjusted = weightedBase * (0.6 + 0.4 * input.profile.confidence.overall);
  const overall = roundTwo((hardSkills + roleExperience + domainContext + educationSignals) / 4);
  const aggregateScore = roundTwo((confidenceAdjusted + overall) / 2);

  const score: CandidateProfileScore = {
    requirementFitScores: {
      hardSkills,
      roleExperience,
      domainContext,
      educationSignals,
      overall
    },
    aggregateScore,
    scoreVersion,
    evidenceSnippets: createEvidenceSnippets({
      requirementLines: requirements.lines,
      profile: input.profile,
      maxSnippets: maxEvidenceSnippets
    })
  };

  const validation = validateCandidateProfileScore(score);
  if (!validation.ok) {
    throw new Error(
      `Candidate score calibration produced invalid output: ${validation.errors.join("; ")}`
    );
  }

  return validation.data;
}
