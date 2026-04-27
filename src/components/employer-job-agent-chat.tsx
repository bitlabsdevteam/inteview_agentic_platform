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
  assistantName: string;
  jobId: string;
  initialSession: ChatSessionState | null;
  initialMessages: ChatMessage[];
  initialMemory: ChatMemoryState;
  initialRoleProfileSummary?: RoleProfileSummaryState | null;
  initialQualityChecks?: QualityCheckState[];
  initialReadinessFlags?: ReadinessFlagsState;
};

function getSpeakerLabel(role: ChatMessage["role"], assistantName: string) {
  if (role === "agent") {
    return assistantName;
  }

  if (role === "employer") {
    return "You";
  }

  return "Workspace";
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

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "AI";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function EmployerJobAgentChat({
  assistantName,
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
  const assistantInitials = useMemo(() => getInitials(assistantName), [assistantName]);

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
      <header className="employer-job-chat__header">
        <div className="employer-job-chat__identity">
          <div aria-hidden="true" className="employer-job-chat__avatar">
            {assistantInitials}
          </div>
          <div className="employer-job-chat__identity-copy">
            <p className="employer-section-label">Agent Chat</p>
            <h3>{assistantName}</h3>
            <p className="employer-job-chat__status">{readinessLabel}</p>
          </div>
        </div>
      </header>

      <div className="employer-job-chat__thread" aria-live="polite">
        {messages.length ? (
          messages.map((entry) => (
            <article
              key={entry.id}
              className={`employer-job-chat__message employer-job-chat__message--${entry.role}`}
              data-testid="employer-job-chat-message"
            >
              {entry.role === "system" ? (
                <p className="employer-job-chat__system-badge">{entry.content}</p>
              ) : (
                <>
                  <div className="employer-job-chat__bubble-meta">
                    <span className="employer-message__speaker">
                      {getSpeakerLabel(entry.role, assistantName)}
                    </span>
                  </div>
                  <p className="employer-job-chat__bubble">{entry.content}</p>
                </>
              )}
            </article>
          ))
        ) : (
          <div className="employer-job-chat__empty-state">
            <div aria-hidden="true" className="employer-job-chat__avatar employer-job-chat__avatar--large">
              {assistantInitials}
            </div>
            <p className="employer-section-label">Ready To Refine</p>
            <p className="employer-job-chat__empty-copy">
              {assistantName} is ready to tighten this draft. Ask for sharper requirements,
              cleaner language, or stronger hiring signals.
            </p>
          </div>
        )}
      </div>

      <form
        ref={formRef}
        className="employer-composer employer-job-chat__composer"
        onSubmit={submit}
      >
        <label className="employer-composer__label" htmlFor="jobChatMessage">
          Message {assistantName}
        </label>
        <div className="employer-job-chat__composer-shell">
          <textarea
            id="jobChatMessage"
            name="jobChatMessage"
            className="employer-composer__input employer-job-chat__input"
            data-testid="employer-job-chat-input"
            rows={4}
            placeholder="Ask for tighter requirements, clearer scope, stronger screening signals, or a rewritten section."
            value={message}
            onChange={(event) => setMessage(event.currentTarget.value)}
            onKeyDown={handleComposerKeyDown}
            required
          />
          <button
            className="employer-composer__button employer-job-chat__send"
            data-testid="employer-job-chat-submit"
            disabled={isSubmitting || message.trim().length === 0}
            type="submit"
          >
            {isSubmitting ? "Sending..." : "Send"}
          </button>
        </div>
        <p className="employer-job-chat__composer-hint">
          Press Enter to send. Use Shift+Enter for a new line.
        </p>
        {error ? <p className="employer-job-chat__error">{error}</p> : null}
      </form>
    </section>
  );
}
