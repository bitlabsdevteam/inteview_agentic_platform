import type { QualityCheckStatus } from "@/lib/agents/job-posting/quality-controls";
import type { EmployerJobStatus } from "@/lib/employer/jobs";

export const JOB_POSTING_PIPELINE_STAGES = [
  {
    key: "job_posting",
    label: "Build Job Posting"
  },
  {
    key: "interview_structure",
    label: "Design Interview Structure"
  },
  {
    key: "review",
    label: "Review And Approve"
  }
] as const;

export type JobPostingPipelineStageKey = (typeof JOB_POSTING_PIPELINE_STAGES)[number]["key"];
export type JobPostingPipelineStageState = "current" | "complete" | "blocked" | "upcoming";

export type JobPostingInterviewBlueprintProgress = {
  hasBlueprint: boolean;
  completenessGaps: string[];
  blueprint?: unknown;
};

export type BuildJobPostingPipelineStagesInput = {
  jobStatus: EmployerJobStatus;
  hasRoleProfile: boolean;
  qualityCheckStatuses: QualityCheckStatus[];
  interviewBlueprint: JobPostingInterviewBlueprintProgress | null;
};

export type JobPostingPipelineStage = {
  key: JobPostingPipelineStageKey;
  label: string;
  state: JobPostingPipelineStageState;
  blockers: string[];
};

export type JobPostingPipelineStageSummary = {
  activeStageKey: JobPostingPipelineStageKey;
  stages: JobPostingPipelineStage[];
};

function dedupe(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function getJobPostingBlockers(input: BuildJobPostingPipelineStagesInput) {
  const blockers: string[] = [];

  if (!input.hasRoleProfile) {
    blockers.push("Complete the role profile before moving to interview design.");
  }

  if (input.qualityCheckStatuses.includes("fail")) {
    blockers.push("Resolve critical quality failures before moving to interview design.");
  }

  return dedupe(blockers);
}

function getInterviewStructureBlockers(input: BuildJobPostingPipelineStagesInput) {
  if (!input.interviewBlueprint) {
    return [];
  }

  return dedupe(input.interviewBlueprint.completenessGaps);
}

function buildStage(
  key: JobPostingPipelineStageKey,
  state: JobPostingPipelineStageState,
  blockers: string[]
): JobPostingPipelineStage {
  const definition = JOB_POSTING_PIPELINE_STAGES.find((stage) => stage.key === key);

  if (!definition) {
    throw new Error(`Unknown job posting pipeline stage: ${key}`);
  }

  return {
    key,
    label: definition.label,
    state,
    blockers
  };
}

function buildDraftStageSummary(
  input: BuildJobPostingPipelineStagesInput
): JobPostingPipelineStageSummary {
  const jobPostingBlockers = getJobPostingBlockers(input);
  if (jobPostingBlockers.length > 0) {
    return {
      activeStageKey: "job_posting",
      stages: [
        buildStage("job_posting", "current", jobPostingBlockers),
        buildStage("interview_structure", "upcoming", []),
        buildStage("review", "upcoming", [])
      ]
    };
  }

  const interviewStructureBlockers = getInterviewStructureBlockers(input);
  const interviewStageState: JobPostingPipelineStageState =
    interviewStructureBlockers.length > 0 ? "blocked" : input.interviewBlueprint?.hasBlueprint ? "complete" : "current";

  if (interviewStageState !== "complete") {
    return {
      activeStageKey: "interview_structure",
      stages: [
        buildStage("job_posting", "complete", []),
        buildStage("interview_structure", interviewStageState, interviewStructureBlockers),
        buildStage("review", "upcoming", [])
      ]
    };
  }

  return {
    activeStageKey: "review",
    stages: [
      buildStage("job_posting", "complete", []),
      buildStage("interview_structure", "complete", []),
      buildStage("review", "current", [])
    ]
  };
}

export function buildJobPostingPipelineStages(
  input: BuildJobPostingPipelineStagesInput
): JobPostingPipelineStageSummary {
  if (input.jobStatus === "draft") {
    return buildDraftStageSummary(input);
  }

  if (input.jobStatus === "needs_review") {
    return {
      activeStageKey: "review",
      stages: [
        buildStage("job_posting", "complete", []),
        buildStage("interview_structure", "complete", []),
        buildStage("review", "current", [])
      ]
    };
  }

  return {
    activeStageKey: "review",
    stages: [
      buildStage("job_posting", "complete", []),
      buildStage("interview_structure", "complete", []),
      buildStage("review", "complete", [])
    ]
  };
}
