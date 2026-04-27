export type V15WorkspacePanelFixture = {
  key: "read_only_artifact" | "agent_chat_only";
  label: string;
  description: string;
};

export type V15ReadonlyArtifactSectionFixture = {
  key:
    | "role_profile_summary"
    | "generated_job_posting"
    | "interview_structure_summary"
    | "review_notes";
  label: string;
  description: string;
};

export type V15ChatKeyboardExpectationFixture = {
  submitOnEnter: true;
  newlineOnShiftEnter: true;
  showsVisibleSendButton: false;
};

export const V15_WORKSPACE_LAYOUT_FIXTURES: V15WorkspacePanelFixture[] = [
  {
    key: "read_only_artifact",
    label: "Read-Only Generated Artifact",
    description: "Show the full created hiring artifact in display mode on the left."
  },
  {
    key: "agent_chat_only",
    label: "Agent Chat Only",
    description: "Keep the right panel limited to the agent thread and composer."
  }
];

export const V15_READONLY_ARTIFACT_SECTION_FIXTURES: V15ReadonlyArtifactSectionFixture[] = [
  {
    key: "role_profile_summary",
    label: "Role Profile Summary",
    description: "Summarize the normalized employer role requirements and constraints."
  },
  {
    key: "generated_job_posting",
    label: "Generated Job Posting",
    description: "Render the created job posting in read-only form."
  },
  {
    key: "interview_structure_summary",
    label: "Interview Structure Summary",
    description: "Display the generated interview plan and question coverage without edit controls."
  },
  {
    key: "review_notes",
    label: "Review Notes",
    description: "Expose quality and approval guidance needed before employer review."
  }
];

export const V15_CHAT_KEYBOARD_EXPECTATIONS: V15ChatKeyboardExpectationFixture = {
  submitOnEnter: true,
  newlineOnShiftEnter: true,
  showsVisibleSendButton: false
};

export const V15_AGENT_CHAT_PROPS_FIXTURE = {
  jobId: "job-1",
  initialSession: {
    id: "session-1",
    status: "needs_follow_up",
    assumptions: [],
    missingCriticalFields: [],
    followUpQuestions: [],
    updatedAt: "2026-04-28T00:00:00.000Z"
  },
  initialMessages: [],
  initialMemory: { summary: null, compacted: false },
  initialRoleProfileSummary: {
    title: "Senior AI Product Engineer",
    department: "Engineering",
    level: "Senior",
    locationPolicy: "Remote US",
    compensationRange: "$180k-$220k",
    unresolvedConstraints: ["Hiring manager not yet confirmed"],
    conflicts: []
  },
  initialQualityChecks: [
    {
      checkType: "completeness",
      status: "warn" as const,
      issues: ["Missing required section: Interview process."],
      suggestedRewrite: "Add explicit interview process section."
    },
    {
      checkType: "discriminatory_phrasing",
      status: "fail" as const,
      issues: ["Potentially biased phrase detected: 'rockstar engineer'."],
      suggestedRewrite: "Use skill-based language."
    }
  ],
  initialReadinessFlags: { blocksReview: true, requiresEmployerFix: true }
};
