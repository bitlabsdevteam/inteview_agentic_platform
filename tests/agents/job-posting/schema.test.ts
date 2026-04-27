import { describe, expect, it } from "vitest";

import {
  convertAgentOutputToEmployerJobInput,
  validateJobPostingAgentOutput,
  type JobPostingAgentOutput
} from "@/lib/agents/job-posting/schema";

const validOutput: JobPostingAgentOutput = {
  title: {
    value: "Senior Full-Stack AI Product Engineer",
    source: "inferred",
    confidence: 0.92
  },
  department: {
    value: "Engineering",
    source: "inferred",
    confidence: 0.9
  },
  level: {
    value: "Senior",
    source: "inferred",
    confidence: 0.84
  },
  location: {
    value: "Remote",
    source: "user_provided",
    confidence: 1
  },
  employmentType: {
    value: "Full-time",
    source: "defaulted",
    confidence: 0.55
  },
  compensationBand: {
    value: "To be confirmed",
    source: "missing",
    confidence: 0
  },
  hiringProblem: "We need an engineer to build AI interview workflows with strong product ownership.",
  outcomes: [
    "Ship reliable prompt-first employer job creation.",
    "Improve Supabase-backed auditability for agent outputs."
  ],
  responsibilities: [
    "Own full-stack product features from planning through release.",
    "Design agent orchestration paths for hiring workflows."
  ],
  requirements: [
    "Experience with Next.js, Postgres, Supabase, and LLM-powered product flows.",
    "Can make pragmatic architecture decisions in ambiguous product areas."
  ],
  niceToHave: ["Experience building recruiting or interview tooling."],
  interviewLoop: [
    "Recruiter screen",
    "Hiring manager conversation",
    "Technical architecture interview",
    "Final product values conversation"
  ],
  draftDescription: "Senior Full-Stack AI Product Engineer\n\nAbout the role\nBuild AI hiring workflows.",
  assumptions: [
    "Department inferred as Engineering from the technical product scope.",
    "Level inferred as Senior because the role owns ambiguous product features."
  ],
  missingCriticalFields: ["compensationBand"],
  followUpQuestions: ["What compensation range should appear on the posting?"],
  reasoningSummary: [
    "Parsed employer intent as senior full-stack product engineering ownership.",
    "Inferred missing role metadata from context and marked assumptions."
  ],
  thinkingMessages: [
    "Identified publishing-critical gap: compensation band.",
    "Prepared one targeted follow-up question."
  ],
  actionLog: ["draft_generated", "follow_up_requested:compensationBand"]
};

describe("job posting agent schema", () => {
  it("accepts structured output with field provenance and review metadata", () => {
    expect(validateJobPostingAgentOutput(validOutput)).toEqual({
      ok: true,
      data: validOutput,
      errors: []
    });
  });

  it("rejects empty fields, invalid provenance, invalid confidence, and too many follow-up questions", () => {
    const invalid = {
      ...validOutput,
      title: {
        value: " ",
        source: "guessed",
        confidence: 1.5
      },
      outcomes: [],
      followUpQuestions: [
        "What is the compensation band?",
        "Where is the job located?",
        "What employment type is this?",
        "What interview loop should we use?"
      ]
    };

    expect(validateJobPostingAgentOutput(invalid)).toEqual({
      ok: false,
      data: null,
      errors: [
        "title.value is required.",
        "title.source must be one of user_provided, inferred, defaulted, missing.",
        "title.confidence must be a number between 0 and 1.",
        "outcomes must include at least one item.",
        "followUpQuestions cannot contain more than 3 items."
      ]
    });
  });

  it("converts agent output into the existing employer job draft input", () => {
    expect(convertAgentOutputToEmployerJobInput(validOutput)).toEqual({
      title: "Senior Full-Stack AI Product Engineer",
      department: "Engineering",
      level: "Senior",
      location: "Remote",
      compensationBand: "To be confirmed",
      hiringProblem: "We need an engineer to build AI interview workflows with strong product ownership.",
      outcomes:
        "- Ship reliable prompt-first employer job creation.\n- Improve Supabase-backed auditability for agent outputs.",
      requirements:
        "Required:\n- Experience with Next.js, Postgres, Supabase, and LLM-powered product flows.\n- Can make pragmatic architecture decisions in ambiguous product areas.\n\nNice to have:\n- Experience building recruiting or interview tooling.",
      interviewLoop:
        "- Recruiter screen\n- Hiring manager conversation\n- Technical architecture interview\n- Final product values conversation"
    });
  });
});
