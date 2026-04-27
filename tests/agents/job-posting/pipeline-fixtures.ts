export type PipelineStageFixture = {
  key: "job_posting" | "interview_structure" | "review";
  label: string;
  description: string;
};

export type PipelineStageState = "current" | "complete" | "blocked" | "upcoming";

export type InterviewBlueprintQuestionFixture = {
  questionText: string;
  intent: string;
  evaluationFocus: string;
  strongSignal: string;
  failureSignal: string;
  followUpPrompt: string;
};

export type InterviewBlueprintStageFixture = {
  stageLabel: string;
  questions: InterviewBlueprintQuestionFixture[];
};

export type InterviewBlueprintFixture = {
  status: "draft";
  title: string;
  objective: string;
  responseMode: "text" | "voice_agent";
  toneProfile: "direct" | "supportive" | "neutral" | "high-precision";
  parsingStrategy: "keyword_match" | "evidence_extraction" | "rubric_scoring" | "hybrid";
  benchmarkSummary: string;
  approvalNotes: string;
  stages: InterviewBlueprintStageFixture[];
};

export const PIPELINE_STAGE_FIXTURES: PipelineStageFixture[] = [
  {
    key: "job_posting",
    label: "Build Job Posting",
    description: "Create the role profile, clarify constraints, and refine the JD."
  },
  {
    key: "interview_structure",
    label: "Design Interview Structure",
    description: "Configure questions, mode, tone, parsing strategy, and benchmarks."
  },
  {
    key: "review",
    label: "Review And Approve",
    description: "Confirm readiness, resolve blockers, and submit for employer review."
  }
];

export const PIPELINE_STAGE_STATES: PipelineStageState[] = [
  "current",
  "complete",
  "blocked",
  "upcoming"
];

export const BASELINE_INTERVIEW_BLUEPRINT_FIXTURE: InterviewBlueprintFixture = {
  status: "draft",
  title: "Platform Engineer Interview Plan",
  objective: "Assess architecture ownership, delivery judgment, and communication quality.",
  responseMode: "voice_agent",
  toneProfile: "high-precision",
  parsingStrategy: "hybrid",
  benchmarkSummary:
    "Advance candidates who show concrete ownership examples, clear tradeoff reasoning, and strong debugging communication.",
  approvalNotes: "Employer review required before candidate-facing activation.",
  stages: [
    {
      stageLabel: "Screen",
      questions: [
        {
          questionText: "Tell me about a recent system you owned end to end.",
          intent: "Establish ownership scope and delivery complexity.",
          evaluationFocus: "Ownership",
          strongSignal: "Names clear decisions, constraints, and results.",
          failureSignal: "Stays generic and cannot describe personal impact.",
          followUpPrompt: "What tradeoffs did you make and why?"
        }
      ]
    },
    {
      stageLabel: "Technical Deep Dive",
      questions: [
        {
          questionText: "How would you design a resilient pipeline for high-volume employer events?",
          intent: "Evaluate architecture depth and operational judgment.",
          evaluationFocus: "System design",
          strongSignal: "Explains scaling, failure modes, and monitoring choices.",
          failureSignal: "Focuses only on happy-path implementation details.",
          followUpPrompt: "Where would you expect the first bottleneck to appear?"
        }
      ]
    }
  ]
};
