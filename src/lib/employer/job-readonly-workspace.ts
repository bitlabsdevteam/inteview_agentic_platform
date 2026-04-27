import type {
  EmployerJobAssistantQualityCheckState,
  EmployerJobAssistantRoleProfileSummaryState,
  EmployerJobAssistantState
} from "@/lib/employer/job-assistant-state";
import { formatEmployerJobStatus, type EmployerJobRecord } from "@/lib/employer/jobs";
import type {
  InterviewBlueprintParsingStrategy,
  InterviewBlueprintResponseMode,
  InterviewBlueprintStage,
  InterviewBlueprintToneProfile
} from "@/lib/agents/job-posting/interview-blueprint";

export type EmployerJobInterviewBlueprintSummary = {
  id: string | null;
  title: string;
  objective: string;
  responseMode: InterviewBlueprintResponseMode | null;
  toneProfile: InterviewBlueprintToneProfile | null;
  parsingStrategy: InterviewBlueprintParsingStrategy | null;
  benchmarkSummary: string;
  questionCount: number;
  completenessGaps: string[];
  stages: InterviewBlueprintStage[];
};

export type EmployerJobReadonlyWorkspaceSection = {
  key:
    | "role_profile_summary"
    | "generated_job_posting"
    | "interview_structure_summary"
    | "review_notes";
  label: string;
  body: string;
  items: Array<{
    label: string;
    value: string;
  }>;
  bullets: string[];
};

export type EmployerJobReadonlyWorkspace = {
  header: {
    statusLabel: string;
    title: string;
    summary: string;
  };
  sections: EmployerJobReadonlyWorkspaceSection[];
};

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function dedupe(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function formatEnumLabel(value: string | null) {
  if (!hasText(value)) {
    return "Not set";
  }

  return value
    .split(/[_-]+/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildRoleProfileSection(
  job: EmployerJobRecord,
  roleProfileSummary: EmployerJobAssistantRoleProfileSummaryState
): EmployerJobReadonlyWorkspaceSection {
  if (!roleProfileSummary) {
    return {
      key: "role_profile_summary",
      label: "Role Profile Summary",
      body: "Role profile will populate after refinement turns.",
      items: [
        { label: "Title", value: job.title },
        { label: "Department", value: job.department },
        { label: "Level", value: job.level },
        { label: "Location", value: job.location },
        { label: "Compensation", value: job.compensation_band }
      ],
      bullets: []
    };
  }

  const conflictBullets = roleProfileSummary.conflicts.map((conflict) =>
    [conflict.field, conflict.issue, conflict.suggestedResolution]
      .filter(hasText)
      .join(": ")
  );

  return {
    key: "role_profile_summary",
    label: "Role Profile Summary",
    body: "Normalized employer requirements and unresolved role constraints.",
    items: [
      { label: "Title", value: roleProfileSummary.title || job.title },
      { label: "Department", value: roleProfileSummary.department || job.department },
      { label: "Level", value: roleProfileSummary.level || job.level },
      { label: "Location", value: roleProfileSummary.locationPolicy || job.location },
      {
        label: "Compensation",
        value: roleProfileSummary.compensationRange || job.compensation_band
      }
    ],
    bullets: dedupe([
      ...roleProfileSummary.unresolvedConstraints,
      ...conflictBullets
    ])
  };
}

function buildGeneratedJobPostingSection(job: EmployerJobRecord): EmployerJobReadonlyWorkspaceSection {
  return {
    key: "generated_job_posting",
    label: "Generated Job Posting",
    body: job.draft_description,
    items: [
      { label: "Hiring problem", value: job.brief.hiringProblem },
      { label: "First outcomes", value: job.brief.outcomes },
      { label: "Requirements", value: job.brief.requirements },
      { label: "Interview loop", value: job.brief.interviewLoop }
    ],
    bullets: []
  };
}

function buildInterviewStructureSection(
  interviewBlueprintSummary: EmployerJobInterviewBlueprintSummary
): EmployerJobReadonlyWorkspaceSection {
  const questionBullets = interviewBlueprintSummary.stages.flatMap((stage) =>
    stage.questions.map((question) => `${stage.stageLabel}: ${question.questionText}`)
  );

  const bullets =
    questionBullets.length > 0
      ? questionBullets
      : interviewBlueprintSummary.completenessGaps;

  return {
    key: "interview_structure_summary",
    label: "Interview Structure Summary",
    body: interviewBlueprintSummary.objective,
    items: [
      { label: "Plan title", value: interviewBlueprintSummary.title },
      {
        label: "Response mode",
        value: formatEnumLabel(interviewBlueprintSummary.responseMode)
      },
      {
        label: "Tone profile",
        value: formatEnumLabel(interviewBlueprintSummary.toneProfile)
      },
      {
        label: "Parsing strategy",
        value: formatEnumLabel(interviewBlueprintSummary.parsingStrategy)
      },
      {
        label: "Question coverage",
        value: `${interviewBlueprintSummary.questionCount} questions`
      },
      {
        label: "Benchmark summary",
        value: hasText(interviewBlueprintSummary.benchmarkSummary)
          ? interviewBlueprintSummary.benchmarkSummary
          : "Not set"
      }
    ],
    bullets
  };
}

function formatQualityCheck(check: EmployerJobAssistantQualityCheckState) {
  const checkType = check.checkType
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const issue = check.issues[0]?.trim();

  if (hasText(issue)) {
    return `${checkType}: ${issue}`;
  }

  return `${checkType}: ${check.suggestedRewrite}`;
}

function buildReviewNotesSection(input: {
  assistantState: EmployerJobAssistantState;
  interviewBlueprintSummary: EmployerJobInterviewBlueprintSummary;
  reviewWarningMessage: string | null;
}): EmployerJobReadonlyWorkspaceSection {
  const bullets = dedupe([
    input.reviewWarningMessage ??
      "No blocking review warnings remain. Employer approval is still required before publishing.",
    ...input.assistantState.qualityChecks.map((check) => formatQualityCheck(check)),
    ...input.assistantState.qualityChecks
      .map((check) =>
        hasText(check.suggestedRewrite)
          ? `${check.checkType
              .replace(/[_-]+/g, " ")
              .replace(/\b\w/g, (char) => char.toUpperCase())}: ${check.suggestedRewrite}`
          : ""
      )
      .filter(Boolean),
    ...input.interviewBlueprintSummary.completenessGaps
  ]);

  return {
    key: "review_notes",
    label: "Review Notes",
    body: input.assistantState.readinessFlags.blocksReview
      ? "Resolve the remaining warnings before moving this draft into employer review."
      : "The artifact is ready for employer review once the team is satisfied with the content.",
    items: [
      {
        label: "Review readiness",
        value: input.assistantState.readinessFlags.blocksReview ? "Blocked" : "Ready"
      },
      {
        label: "Employer fixes recommended",
        value: input.assistantState.readinessFlags.requiresEmployerFix ? "Yes" : "No"
      }
    ],
    bullets
  };
}

export function buildEmployerJobReadonlyWorkspace(input: {
  job: EmployerJobRecord;
  assistantState: EmployerJobAssistantState;
  interviewBlueprintSummary: EmployerJobInterviewBlueprintSummary;
  reviewWarningMessage: string | null;
}): EmployerJobReadonlyWorkspace {
  return {
    header: {
      statusLabel: formatEmployerJobStatus(input.job.status),
      title: input.job.title,
      summary: "Review the full generated artifact here. Ask the assistant to revise anything that should change."
    },
    sections: [
      buildRoleProfileSection(input.job, input.assistantState.roleProfileSummary),
      buildGeneratedJobPostingSection(input.job),
      buildInterviewStructureSection(input.interviewBlueprintSummary),
      buildReviewNotesSection(input)
    ]
  };
}
