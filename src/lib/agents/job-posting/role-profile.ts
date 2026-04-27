export const ROLE_PROFILE_CONFLICT_SEVERITIES = ["low", "medium", "high"] as const;

export type RoleProfileConflictSeverity = (typeof ROLE_PROFILE_CONFLICT_SEVERITIES)[number];

export type RoleProfileConflict = {
  field: string;
  issue: string;
  severity: RoleProfileConflictSeverity;
  suggestedResolution: string;
};

export type RoleProfileConfidence = {
  title: number;
  department: number;
  level: number;
  locationPolicy: number;
  compensationRange: number;
};

export type RoleProfile = {
  title: string;
  department: string;
  level: string;
  locationPolicy: string;
  compensationRange: string;
  mustHaveRequirements: string[];
  niceToHaveRequirements: string[];
  businessOutcomes: string[];
  interviewLoopIntent: string[];
  unresolvedConstraints: string[];
  conflicts: RoleProfileConflict[];
  confidence: RoleProfileConfidence;
};

export type RoleProfileValidationResult =
  | {
      ok: true;
      data: RoleProfile;
      errors: [];
    }
  | {
      ok: false;
      data: null;
      errors: string[];
    };

export type BuildRoleProfileInput = {
  employerPrompt: string;
  latestMessage: string;
  currentProfile: RoleProfile | null;
};

export type BuildRoleProfileResult = {
  profile: RoleProfile;
  conflicts: RoleProfileConflict[];
  unresolvedConstraints: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeSpaces(item))
    .filter(Boolean);
}

function normalizeUnique(values: string[]) {
  return Array.from(
    new Map(values.map((value) => [value.toLowerCase(), normalizeSpaces(value)])).values()
  );
}

function severityFrom(value: unknown): RoleProfileConflictSeverity | null {
  if (typeof value !== "string") {
    return null;
  }

  if (
    ROLE_PROFILE_CONFLICT_SEVERITIES.includes(value as RoleProfileConflictSeverity)
  ) {
    return value as RoleProfileConflictSeverity;
  }

  return null;
}

function isConfidenceValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function validateConfidenceField(
  confidence: Record<string, unknown>,
  field: keyof RoleProfileConfidence,
  errors: string[]
) {
  if (!isConfidenceValue(confidence[field])) {
    errors.push(`confidence.${field} must be a number between 0 and 1.`);
  }
}

function parseLevel(text: string) {
  const normalized = text.toLowerCase();

  if (/\bprincipal\b/.test(normalized)) {
    return "Principal";
  }
  if (/\bstaff\b/.test(normalized)) {
    return "Staff";
  }
  if (/\blead\b/.test(normalized)) {
    return "Lead";
  }
  if (/\bsenior\b/.test(normalized)) {
    return "Senior";
  }
  if (/\bmid\b/.test(normalized)) {
    return "Mid";
  }
  if (/\bjunior\b/.test(normalized)) {
    return "Junior";
  }

  return "Not specified";
}

function parseTitle(text: string, fallbackLevel: string) {
  const fromNeed = /\bneed\s+(?:a|an)\s+([^.,\n]+?)(?:\s+for\b|[.,\n]|$)/i.exec(text);
  if (fromNeed && hasText(fromNeed[1])) {
    const raw = normalizeSpaces(fromNeed[1]);
    return raw
      .replace(/^senior\s+/i, "")
      .replace(/^staff\s+/i, "")
      .replace(/^principal\s+/i, "")
      .replace(/^lead\s+/i, "")
      .replace(/^junior\s+/i, "")
      .trim()
      .replace(/^./, (char) => char.toUpperCase());
  }

  if (fallbackLevel !== "Not specified") {
    return `${fallbackLevel} Role`;
  }

  return "Generalist Role";
}

function parseDepartment(text: string) {
  const normalized = text.toLowerCase();

  if (/\bengineer|engineering|developer\b/.test(normalized)) {
    return "Engineering";
  }
  if (/\bproduct\b/.test(normalized)) {
    return "Product";
  }
  if (/\bdesign\b/.test(normalized)) {
    return "Design";
  }
  if (/\bsales\b/.test(normalized)) {
    return "Sales";
  }

  return "General";
}

function parseLocationPolicy(text: string) {
  const normalized = text.toLowerCase();
  if (/remote\s+us|us\s+remote|remote\s+u\.?s\.?/.test(normalized)) {
    return "Remote US";
  }
  if (/\bremote\b/.test(normalized)) {
    return "Remote";
  }
  if (/\bhybrid\b/.test(normalized)) {
    return "Hybrid";
  }
  if (/\bon[- ]?site\b|\bin office\b/.test(normalized)) {
    return "On-site";
  }

  return "Not specified";
}

function parseCompensationRange(text: string) {
  const withDollar = /\$\s*(\d{2,3})k?\s*[-–]\s*\$\s*(\d{2,3})k?/i.exec(text);
  if (withDollar) {
    return `$${withDollar[1]}k-$${withDollar[2]}k`;
  }

  const withoutDollar = /\b(\d{2,3})k\s*[-–]\s*(\d{2,3})k\b/i.exec(text);
  if (withoutDollar) {
    return `$${withoutDollar[1]}k-$${withoutDollar[2]}k`;
  }

  return "Not specified";
}

function splitRequirements(value: string) {
  return normalizeUnique(
    value
      .split(/,| and /i)
      .map((item) => normalizeSpaces(item.replace(/\.$/, "")))
      .filter(Boolean)
  );
}

function parseMustHaveRequirements(text: string) {
  const mustHave = /must\s+have\s+([^\n.]+)/i.exec(text);
  if (mustHave && hasText(mustHave[1])) {
    return splitRequirements(mustHave[1]);
  }

  const seeded: string[] = [];
  if (/next\.js/i.test(text)) {
    seeded.push("Next.js");
  }
  if (/\bpostgres\b/i.test(text)) {
    seeded.push("Postgres");
  }

  return seeded.length ? normalizeUnique(seeded) : ["Must-have requirements not yet confirmed"];
}

function parseBusinessOutcomes(latestMessage: string) {
  if (!hasText(latestMessage)) {
    return ["Define role outcomes with hiring manager"];
  }

  const trimmed = normalizeSpaces(latestMessage.replace(/^add\s+/i, ""));
  return [trimmed.replace(/^./, (char) => char.toUpperCase())];
}

function deriveConflicts(profile: {
  level: string;
  locationPolicy: string;
  compensationRange: string;
}) {
  const conflicts: RoleProfileConflict[] = [];

  const range = /(\d{2,3})k\s*[-–]\s*(\d{2,3})k/i.exec(profile.compensationRange);
  if (range) {
    const low = Number(range[1]);
    if (profile.level === "Junior" && low >= 180) {
      conflicts.push({
        field: "compensationRange",
        issue: "Compensation appears high for junior level expectations.",
        severity: "medium",
        suggestedResolution: "Confirm level or adjust compensation to align with market band."
      });
    }
  }

  if (profile.locationPolicy === "Remote" && profile.level === "Not specified") {
    conflicts.push({
      field: "level",
      issue: "Location policy is defined but role level is still unspecified.",
      severity: "low",
      suggestedResolution: "Confirm target seniority to anchor sourcing and interview calibration."
    });
  }

  return conflicts;
}

export function validateRoleProfile(profile: unknown): RoleProfileValidationResult {
  if (!isRecord(profile)) {
    return {
      ok: false,
      data: null,
      errors: ["Role profile must be an object."]
    };
  }

  const errors: string[] = [];

  for (const field of [
    "title",
    "department",
    "level",
    "locationPolicy",
    "compensationRange"
  ] as const) {
    if (!hasText(profile[field])) {
      errors.push(`${field} is required.`);
    }
  }

  for (const field of [
    "mustHaveRequirements",
    "niceToHaveRequirements",
    "businessOutcomes",
    "interviewLoopIntent"
  ] as const) {
    if (!Array.isArray(profile[field]) || profile[field].some((item) => !hasText(item))) {
      errors.push(`${field} must contain non-empty strings.`);
    }
  }

  if (
    !Array.isArray(profile.unresolvedConstraints) ||
    profile.unresolvedConstraints.some((item) => !hasText(item))
  ) {
    errors.push("unresolvedConstraints must contain non-empty strings.");
  }

  if (!Array.isArray(profile.conflicts)) {
    errors.push("conflicts must be an array.");
  } else {
    profile.conflicts.forEach((conflict, index) => {
      if (!isRecord(conflict)) {
        errors.push(`conflicts[${index}] must be an object.`);
        return;
      }

      if (!hasText(conflict.field)) {
        errors.push(`conflicts[${index}].field is required.`);
      }
      if (!hasText(conflict.issue)) {
        errors.push(`conflicts[${index}].issue is required.`);
      }
      if (!severityFrom(conflict.severity)) {
        errors.push(
          `conflicts[${index}].severity must be one of ${ROLE_PROFILE_CONFLICT_SEVERITIES.join(", ")}.`
        );
      }
      if (!hasText(conflict.suggestedResolution)) {
        errors.push(`conflicts[${index}].suggestedResolution is required.`);
      }
    });
  }

  if (!isRecord(profile.confidence)) {
    errors.push("confidence is required.");
  } else {
    for (const field of [
      "title",
      "department",
      "level",
      "locationPolicy",
      "compensationRange"
    ] as const) {
      validateConfidenceField(profile.confidence, field, errors);
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
    data: profile as RoleProfile,
    errors: []
  };
}

function mergeWithCurrentProfile(extracted: RoleProfile, currentProfile: RoleProfile | null): RoleProfile {
  if (!currentProfile) {
    return extracted;
  }

  return {
    ...currentProfile,
    ...extracted,
    mustHaveRequirements: normalizeUnique([
      ...currentProfile.mustHaveRequirements,
      ...extracted.mustHaveRequirements
    ]),
    niceToHaveRequirements: normalizeUnique([
      ...currentProfile.niceToHaveRequirements,
      ...extracted.niceToHaveRequirements
    ]),
    businessOutcomes: normalizeUnique([
      ...currentProfile.businessOutcomes,
      ...extracted.businessOutcomes
    ]),
    interviewLoopIntent: normalizeUnique([
      ...currentProfile.interviewLoopIntent,
      ...extracted.interviewLoopIntent
    ]),
    unresolvedConstraints: normalizeUnique([
      ...currentProfile.unresolvedConstraints,
      ...extracted.unresolvedConstraints
    ])
  };
}

export function buildRoleProfileFromEmployerContext(
  input: BuildRoleProfileInput
): BuildRoleProfileResult {
  const employerPrompt = normalizeSpaces(input.employerPrompt);
  const latestMessage = normalizeSpaces(input.latestMessage);
  const joinedContext = `${employerPrompt} ${latestMessage}`.trim();

  const level = parseLevel(joinedContext);
  const title = parseTitle(joinedContext, level);
  const department = parseDepartment(joinedContext);
  const locationPolicy = parseLocationPolicy(joinedContext);
  const compensationRange = parseCompensationRange(joinedContext);

  const unresolvedConstraints = ["Hiring manager not yet confirmed"];
  const conflicts = deriveConflicts({
    level,
    locationPolicy,
    compensationRange
  });

  const extracted: RoleProfile = {
    title,
    department,
    level,
    locationPolicy,
    compensationRange,
    mustHaveRequirements: parseMustHaveRequirements(joinedContext),
    niceToHaveRequirements: [],
    businessOutcomes: parseBusinessOutcomes(latestMessage),
    interviewLoopIntent: ["Recruiter screen", "Technical architecture interview"],
    unresolvedConstraints,
    conflicts,
    confidence: {
      title: title === "Generalist Role" ? 0.6 : 0.9,
      department: department === "General" ? 0.6 : 0.88,
      level: level === "Not specified" ? 0.55 : 0.9,
      locationPolicy: locationPolicy === "Not specified" ? 0.5 : 0.95,
      compensationRange: compensationRange === "Not specified" ? 0.45 : 0.9
    }
  };

  const profile = mergeWithCurrentProfile(extracted, input.currentProfile);

  return {
    profile,
    conflicts: profile.conflicts,
    unresolvedConstraints: profile.unresolvedConstraints
  };
}
