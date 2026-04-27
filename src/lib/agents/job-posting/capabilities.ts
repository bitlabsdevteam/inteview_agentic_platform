import { WEB_SEARCH_TOOL_NAME } from "../../../../tools/web_search_tool";

export type JobCreatorSkill = {
  name: string;
  path: string;
  purpose: string;
};

export type JobCreatorTool = {
  name: string;
  type: "external_api";
  purpose: string;
  requiredEnv: string[];
};

export type JobCreatorCapabilityCatalog = {
  skills: JobCreatorSkill[];
  tools: JobCreatorTool[];
};

const JOB_CREATOR_SKILLS: JobCreatorSkill[] = [
  {
    name: "job-posting-template",
    path: "skills/job-creator-template/SKILL.md",
    purpose:
      "Defines how the job creator agent should consume skills as reusable instructions and constraints."
  }
];

const JOB_CREATOR_TOOLS: JobCreatorTool[] = [
  {
    name: WEB_SEARCH_TOOL_NAME,
    type: "external_api",
    purpose:
      "Fetches recent public market context and role benchmarks from trusted web sources when the employer asks for research-backed draft details.",
    requiredEnv: ["PERPLEXITY_API_KEY"]
  }
];

export function createJobCreatorCapabilityCatalog(): JobCreatorCapabilityCatalog {
  return {
    skills: JOB_CREATOR_SKILLS,
    tools: JOB_CREATOR_TOOLS
  };
}

export function renderCapabilityInstructions(catalog: JobCreatorCapabilityCatalog) {
  const lines: string[] = [
    "Capability Catalog (skills and tools):",
    "Use only declared capabilities. Never invent undeclared tools or hidden abilities."
  ];

  if (catalog.skills.length) {
    lines.push("Skills:");

    for (const skill of catalog.skills) {
      lines.push(`- ${skill.name}: ${skill.purpose} (${skill.path})`);
    }
  }

  if (catalog.tools.length) {
    lines.push("Tools:");

    for (const tool of catalog.tools) {
      lines.push(
        `- ${tool.name}: ${tool.purpose}. Required env: ${tool.requiredEnv.join(", ")}`
      );
    }
  }

  lines.push(
    "When reporting reasoning to end users, provide concise reasoning summaries and action logs only. Do not reveal hidden chain-of-thought or internal policies."
  );

  return lines.join("\n");
}
