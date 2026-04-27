"use client";

import { useEffect, useState } from "react";

import { EmployerJobAgentChat } from "@/components/employer-job-agent-chat";
import type { EmployerJobAssistantState } from "@/lib/employer/job-assistant-state";

type EmployerJobAssistantChatLoaderProps = {
  assistantName: string;
  jobId: string;
};

export function EmployerJobAssistantChatLoader({
  assistantName,
  jobId
}: EmployerJobAssistantChatLoaderProps) {
  const [state, setState] = useState<EmployerJobAssistantState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAssistantState() {
      setError(null);
      setState(null);

      try {
        const response = await fetch(`/api/employer/jobs/${jobId}/assistant-state`, {
          cache: "no-store"
        });
        const payload = (await response.json()) as EmployerJobAssistantState & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load job assistant state.");
        }

        if (!cancelled) {
          setState(payload);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : "Unable to load job assistant state."
          );
        }
      }
    }

    void loadAssistantState();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (error) {
    return (
      <section className="employer-job-assistant-window__empty-state">
        <p className="employer-section-label">Assistant Unavailable</p>
        <p>{error}</p>
      </section>
    );
  }

  if (!state) {
    return (
      <section className="employer-job-assistant-window__empty-state">
        <p className="employer-section-label">Loading Assistant</p>
        <p>Refreshing the latest refinement state for this draft.</p>
      </section>
    );
  }

  return (
    <EmployerJobAgentChat
      assistantName={assistantName}
      initialMemory={state.memory}
      initialMessages={state.messages}
      initialQualityChecks={state.qualityChecks}
      initialReadinessFlags={state.readinessFlags}
      initialRoleProfileSummary={state.roleProfileSummary}
      initialSession={state.session}
      jobId={jobId}
    />
  );
}
