import type { JobPostingInferenceResult } from "@/lib/agents/job-posting/inference";
import type { ProviderStreamEvent } from "@/lib/agents/job-posting/streaming";

type EnvSource = Record<string, string | undefined>;

const STUB_MODEL = "gpt-5.5-e2e-stub";

function createField(value: string, confidence = 0.96) {
  return {
    value,
    source: "user_provided" as const,
    confidence
  };
}

function createBaseDraftDescription(input: {
  title: string;
  compensationBand: string;
  requirementsIntro: string;
  interviewProcess: string;
  extraBody: string[];
}) {
  return [
    `${input.title}`,
    "",
    `Compensation: ${input.compensationBand}`,
    "",
    "Requirements:",
    input.requirementsIntro,
    "",
    "Interview process:",
    input.interviewProcess,
    "",
    ...input.extraBody
  ].join("\n");
}

function createDraftResult(input: {
  providerResponseId: string;
  title: string;
  compensationBand: string;
  draftDescription: string;
  requirements: string[];
  missingCriticalFields?: string[];
  followUpQuestions?: string[];
  assumptions?: string[];
  thinkingMessages?: string[];
  actionLog?: string[];
}) {
  return {
    providerResponseId: input.providerResponseId,
    model: STUB_MODEL,
    prompt: {
      promptKey: "job_creator_agent_system_prompt",
      version: "v1",
      checksum: "e2e-stub-checksum"
    },
    output: {
      title: createField(input.title),
      department: createField("Engineering"),
      level: createField("Senior"),
      location: createField("Remote US"),
      employmentType: createField("Full-time"),
      compensationBand: createField(input.compensationBand),
      hiringProblem:
        "Build a stronger employer-side recruiting assistant workflow with clear ownership and quality controls.",
      outcomes: [
        "Improve job quality before employer review.",
        "Reduce manual recruiting coordination work."
      ],
      responsibilities: [
        "Own employer-side recruiting workflow automation.",
        "Improve job publishing quality and review readiness."
      ],
      requirements: input.requirements,
      niceToHave: ["Experience with structured hiring workflows."],
      interviewLoop: [
        "Recruiter screen",
        "Hiring manager interview",
        "Systems interview",
        "Final decision review"
      ],
      draftDescription: input.draftDescription,
      assumptions: input.assumptions ?? ["Employer wants a senior IC who can own workflow quality."],
      missingCriticalFields: input.missingCriticalFields ?? [],
      followUpQuestions: input.followUpQuestions ?? [],
      reasoningSummary: ["E2E stub generated deterministic structured output."],
      thinkingMessages: input.thinkingMessages ?? ["Stubbed draft refinement in progress."],
      actionLog: input.actionLog ?? ["Generated deterministic job draft output for E2E."]
    }
  } satisfies JobPostingInferenceResult;
}

function createInitialDraftResult() {
  const title = "Senior AI Platform Engineer";
  return createDraftResult({
    providerResponseId: "resp_e2e_create",
    title,
    compensationBand: "$180k-$220k",
    requirements: [
      "Strong backend systems design experience.",
      "Experience with AI workflow orchestration.",
      "Clear written communication with employers and hiring managers."
    ],
    draftDescription: createBaseDraftDescription({
      title,
      compensationBand: "$180k-$220k",
      requirementsIntro:
        "Strong backend systems design, AI workflow orchestration, and clear written communication with employers.",
      interviewProcess:
        "Recruiter screen, hiring manager interview, systems interview, and final review.",
      extraBody: [
        "You will own employer-side workflow quality and reduce manual recruiting dependency.",
        "This role partners with product, engineering, and recruiting operations."
      ]
    }),
    thinkingMessages: ["Creating deterministic draft for refinement flow."]
  });
}

function createBlockedRevisionResult() {
  const title = "Senior AI Platform Engineer";
  return createDraftResult({
    providerResponseId: "resp_e2e_blocked",
    title,
    compensationBand: "$180k-$220k",
    requirements: [
      "Strong backend systems design experience.",
      "Experience with AI workflow orchestration.",
      "Native English speaker communication."
    ],
    missingCriticalFields: ["compensationBand"],
    followUpQuestions: ["Can you confirm the compensation band for this role?"],
    draftDescription: createBaseDraftDescription({
      title,
      compensationBand: "$180k-$220k",
      requirementsIntro:
        "Strong backend systems design, AI workflow orchestration, and native English speaker communication.",
      interviewProcess:
        "Recruiter screen, hiring manager interview, systems interview, and final review.",
      extraBody: [
        "We are looking for a native English speaker who can lead employer-side workflow quality.",
        "This role partners with product, engineering, and recruiting operations."
      ]
    }),
    assumptions: ["Employer may still be revising compensation expectations."],
    thinkingMessages: ["Flagging a discriminatory phrasing issue for employer review."],
    actionLog: ["Generated blocked revision with quality failure and clarification question."]
  });
}

function createResolvedRevisionResult() {
  const title = "Senior AI Platform Engineer";
  return createDraftResult({
    providerResponseId: "resp_e2e_resolved",
    title,
    compensationBand: "$180k-$220k",
    requirements: [
      "Strong backend systems design experience.",
      "Experience with AI workflow orchestration.",
      "Clear written communication with distributed teams."
    ],
    draftDescription: createBaseDraftDescription({
      title,
      compensationBand: "$180k-$220k",
      requirementsIntro:
        "Strong backend systems design, AI workflow orchestration, and clear written communication with distributed teams.",
      interviewProcess:
        "Recruiter screen, hiring manager interview, systems interview, and final review.",
      extraBody: [
        "You will improve employer-side recruiting quality with inclusive, skill-based language.",
        "This role partners with product, engineering, and recruiting operations across remote US teams."
      ]
    }),
    assumptions: ["Compensation and location are now confirmed by the employer."],
    thinkingMessages: ["Generated resolved revision with no remaining critical quality blockers."],
    actionLog: ["Generated resolved revision and cleared clarification prompts."]
  });
}

export function isJobPostingE2EStubMode(env: EnvSource = process.env as EnvSource) {
  return env.E2E_AGENT_STUB_MODE?.trim() === "true";
}

export function createJobPostingE2EStubInferenceResult(
  input: { employerPrompt: string }
): JobPostingInferenceResult {
  const normalizedPrompt = input.employerPrompt.toLowerCase();

  if (
    normalizedPrompt.includes("native english speaker") ||
    normalizedPrompt.includes("remove the compensation band")
  ) {
    return createBlockedRevisionResult();
  }

  if (
    normalizedPrompt.includes("inclusive language") ||
    normalizedPrompt.includes("restore compensation")
  ) {
    return createResolvedRevisionResult();
  }

  return createInitialDraftResult();
}

export function createJobPostingE2EStubStreamEvents(
  result: JobPostingInferenceResult
): ProviderStreamEvent[] {
  const preview = result.output.draftDescription.slice(0, 96);

  return [
    {
      type: "status",
      message: "Parsing employer hiring prompt."
    },
    {
      type: "status",
      message: "Building deterministic draft for E2E validation."
    },
    {
      type: "token",
      token: preview
    }
  ];
}
