"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ChatMessage = {
  id: string;
  role: "employer" | "agent" | "system";
  content: string;
  createdAt: string;
};

type ChatSessionState = {
  id: string;
  status: string;
  assumptions: string[];
  missingCriticalFields: string[];
  followUpQuestions: string[];
  updatedAt: string;
};

type ChatMemoryState = {
  summary: {
    summaryText: string;
    unresolvedGaps: string[];
    keyDecisions: string[];
    compactedMessageCount: number;
    updatedAt: string;
  } | null;
  compacted: boolean;
};

type RoleProfileSummaryState = {
  title?: string;
  department?: string;
  level?: string;
  locationPolicy?: string;
  compensationRange?: string;
  unresolvedConstraints: string[];
  conflicts: Array<{
    field?: string;
    issue?: string;
    severity?: "low" | "medium" | "high" | string;
    suggestedResolution?: string;
  }>;
};

type QualityCheckState = {
  checkType: string;
  status: "pass" | "warn" | "fail";
  issues: string[];
  suggestedRewrite: string;
};

type ReadinessFlagsState = {
  blocksReview: boolean;
  requiresEmployerFix: boolean;
};

type EmployerJobAgentChatProps = {
  jobId: string;
  initialSession: ChatSessionState | null;
  initialMessages: ChatMessage[];
  initialMemory: ChatMemoryState;
  initialRoleProfileSummary?: RoleProfileSummaryState | null;
  initialQualityChecks?: QualityCheckState[];
  initialReadinessFlags?: ReadinessFlagsState;
};

function formatRole(role: ChatMessage["role"]) {
  if (role === "agent") {
    return "Agent";
  }
  if (role === "employer") {
    return "Employer";
  }
  return "System";
}

function summarizeReadiness(session: ChatSessionState | null) {
  if (!session) {
    return "No session yet. Start chat to begin JD refinement.";
  }

  if (session.missingCriticalFields.length > 0) {
    return "Not publish-ready yet.";
  }

  return "No critical fields missing.";
}

export function EmployerJobAgentChat({
  jobId,
  initialSession,
  initialMessages
}: EmployerJobAgentChatProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ChatSessionState | null>(initialSession);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  const readinessLabel = useMemo(() => summarizeReadiness(session), [session]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextMessage = message.trim();
    if (!nextMessage || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/employer/jobs/${jobId}/agent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: nextMessage,
          sessionId: session?.id
        })
      });
      const payload = (await response.json()) as {
        error?: string;
        session?: ChatSessionState;
        messages?: ChatMessage[];
        memory?: ChatMemoryState;
        roleProfileSummary?: RoleProfileSummaryState | null;
        qualityChecks?: QualityCheckState[];
        readinessFlags?: ReadinessFlagsState;
      };

      if (!response.ok || !payload.session || !payload.messages) {
        setError(payload.error ?? "Unable to update this job draft right now.");
        return;
      }

      setSession(payload.session);
      setMessages(payload.messages);
      setMessage("");
      router.refresh();
    } catch {
      setError("Unable to update this job draft right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <section className="employer-job-chat" data-testid="employer-job-detail-chat">
      <div className="employer-job-chat__thread" aria-live="polite">
        <p className="employer-section-label">JD Agent Chat</p>
        <p className="employer-job-chat__status">{readinessLabel}</p>
        {messages.length ? (
          messages.map((entry) => (
            <article
              key={entry.id}
              className={`employer-message employer-message--${entry.role}`}
              data-testid="employer-job-chat-message"
            >
              <p className="employer-message__speaker">{formatRole(entry.role)}</p>
              <p className="employer-message__body">{entry.content}</p>
            </article>
          ))
        ) : (
          <p className="employer-message__body">No chat history yet.</p>
        )}
      </div>

      <form
        ref={formRef}
        className="employer-composer employer-job-chat__composer"
        onSubmit={submit}
      >
        <label className="employer-composer__label" htmlFor="jobChatMessage">
          Continue refining this JD
        </label>
        <textarea
          id="jobChatMessage"
          name="jobChatMessage"
          className="employer-composer__input"
          data-testid="employer-job-chat-input"
          rows={6}
          placeholder="Tighten the requirements for senior backend ownership and update compensation to $180k-$220k."
          value={message}
          onChange={(event) => setMessage(event.currentTarget.value)}
          onKeyDown={handleComposerKeyDown}
          required
        />
        <p className="employer-job-chat__composer-hint">
          Press Enter to send. Use Shift+Enter for a new line.
        </p>
        {error ? <p className="employer-job-chat__error">{error}</p> : null}
      </form>
    </section>
  );
}
