import { describe, expect, it } from "vitest";

import { buildJobPostingPipelineStages } from "@/lib/agents/job-posting/job-pipeline";
import {
  BASELINE_INTERVIEW_BLUEPRINT_FIXTURE,
  PIPELINE_STAGE_FIXTURES
} from "./pipeline-fixtures";

describe("job posting pipeline stage-state contracts", () => {
  it("keeps Stage 1 current and later stages upcoming when the job posting foundation is incomplete", () => {
    expect(
      buildJobPostingPipelineStages({
        jobStatus: "draft",
        hasRoleProfile: false,
        qualityCheckStatuses: [],
        interviewBlueprint: null
      })
    ).toEqual({
      activeStageKey: "job_posting",
      stages: [
        {
          key: PIPELINE_STAGE_FIXTURES[0].key,
          label: PIPELINE_STAGE_FIXTURES[0].label,
          state: "current",
          blockers: [
            "Complete the role profile before moving to interview design."
          ]
        },
        {
          key: PIPELINE_STAGE_FIXTURES[1].key,
          label: PIPELINE_STAGE_FIXTURES[1].label,
          state: "upcoming",
          blockers: []
        },
        {
          key: PIPELINE_STAGE_FIXTURES[2].key,
          label: PIPELINE_STAGE_FIXTURES[2].label,
          state: "upcoming",
          blockers: []
        }
      ]
    });
  });

  it("marks Stage 1 complete and advances Stage 2 to current when the job posting stage is ready", () => {
    expect(
      buildJobPostingPipelineStages({
        jobStatus: "draft",
        hasRoleProfile: true,
        qualityCheckStatuses: ["pass", "warn"],
        interviewBlueprint: {
          hasBlueprint: false,
          completenessGaps: []
        }
      })
    ).toEqual({
      activeStageKey: "interview_structure",
      stages: [
        {
          key: PIPELINE_STAGE_FIXTURES[0].key,
          label: PIPELINE_STAGE_FIXTURES[0].label,
          state: "complete",
          blockers: []
        },
        {
          key: PIPELINE_STAGE_FIXTURES[1].key,
          label: PIPELINE_STAGE_FIXTURES[1].label,
          state: "current",
          blockers: []
        },
        {
          key: PIPELINE_STAGE_FIXTURES[2].key,
          label: PIPELINE_STAGE_FIXTURES[2].label,
          state: "upcoming",
          blockers: []
        }
      ]
    });
  });

  it("uses blocked for Stage 2 when interview design has unresolved completeness gaps", () => {
    expect(
      buildJobPostingPipelineStages({
        jobStatus: "draft",
        hasRoleProfile: true,
        qualityCheckStatuses: ["pass"],
        interviewBlueprint: {
          hasBlueprint: true,
          completenessGaps: [
            "Select response mode for the interview plan.",
            "Add at least one benchmark summary for evaluator guidance."
          ]
        }
      })
    ).toEqual({
      activeStageKey: "interview_structure",
      stages: [
        {
          key: PIPELINE_STAGE_FIXTURES[0].key,
          label: PIPELINE_STAGE_FIXTURES[0].label,
          state: "complete",
          blockers: []
        },
        {
          key: PIPELINE_STAGE_FIXTURES[1].key,
          label: PIPELINE_STAGE_FIXTURES[1].label,
          state: "blocked",
          blockers: [
            "Select response mode for the interview plan.",
            "Add at least one benchmark summary for evaluator guidance."
          ]
        },
        {
          key: PIPELINE_STAGE_FIXTURES[2].key,
          label: PIPELINE_STAGE_FIXTURES[2].label,
          state: "upcoming",
          blockers: []
        }
      ]
    });
  });

  it("promotes review to current after Stages 1 and 2 are complete", () => {
    expect(
      buildJobPostingPipelineStages({
        jobStatus: "draft",
        hasRoleProfile: true,
        qualityCheckStatuses: ["pass"],
        interviewBlueprint: {
          hasBlueprint: true,
          completenessGaps: [],
          blueprint: BASELINE_INTERVIEW_BLUEPRINT_FIXTURE
        }
      })
    ).toEqual({
      activeStageKey: "review",
      stages: [
        {
          key: PIPELINE_STAGE_FIXTURES[0].key,
          label: PIPELINE_STAGE_FIXTURES[0].label,
          state: "complete",
          blockers: []
        },
        {
          key: PIPELINE_STAGE_FIXTURES[1].key,
          label: PIPELINE_STAGE_FIXTURES[1].label,
          state: "complete",
          blockers: []
        },
        {
          key: PIPELINE_STAGE_FIXTURES[2].key,
          label: PIPELINE_STAGE_FIXTURES[2].label,
          state: "current",
          blockers: []
        }
      ]
    });
  });
});
