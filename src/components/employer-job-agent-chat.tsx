"use client";

import React, { useMemo, useState } from "react";
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

function formatCheckType(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function EmployerJobAgentChat({
  jobId,
  initialSession,
  initialMessages,
  initialMemory,
  initialRoleProfileSummary = null,
  initialQualityChecks = [],
  initialReadinessFlags = { blocksReview: false, requiresEmployerFix: false }
}: EmployerJobAgentChatProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ChatSessionState | null>(initialSession);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [memory, setMemory] = useState<ChatMemoryState>(initialMemory);
  const [roleProfileSummary, setRoleProfileSummary] = useState<RoleProfileSummaryState | null>(
    initialRoleProfileSummary
  );
  const [qualityChecks, setQualityChecks] = useState<QualityCheckState[]>(initialQualityChecks);
  const [readinessFlags, setReadinessFlags] =
    useState<ReadinessFlagsState>(initialReadinessFlags);

  const readinessLabel = useMemo(() => summarizeReadiness(session), [session]);
  const canSubmit = message.trim().length > 0 && !isSubmitting;

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

      if (!response.ok || !payload.session || !payload.messages || !payload.memory) {
        setError(payload.error ?? "Unable to update this job draft right now.");
        return;
      }

      setSession(payload.session);
      setMessages(payload.messages);
      setMemory(payload.memory);
      setRoleProfileSummary(payload.roleProfileSummary ?? null);
      setQualityChecks(Array.isArray(payload.qualityChecks) ? payload.qualityChecks : []);
      setReadinessFlags(payload.readinessFlags ?? { blocksReview: false, requiresEmployerFix: false });
      setMessage("");
      router.refresh();
    } catch {
      setError("Unable to update this job draft right now.");
    } finally {
      setIsSubmitting(false);
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

      <form className="employer-composer employer-job-chat__composer" onSubmit={submit}>
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
          required
        />
        <div className="employer-composer__actions">
          <button
            className="employer-composer__button"
            data-testid="employer-job-chat-submit"
            type="submit"
            disabled={!canSubmit}
          >
            {isSubmitting ? "Updating Draft..." : "Send To Agent"}
          </button>
        </div>
        {error ? <p className="employer-job-chat__error">{error}</p> : null}
      </form>

      <aside className="employer-job-chat__memory" data-testid="employer-job-chat-memory">
        <p className="employer-section-label">Session Memory</p>
        {memory.summary ? (
          <>
            <p className="employer-message__body">{memory.summary.summaryText}</p>
            {memory.summary.unresolvedGaps.length ? (
              <ul className="employer-guardrail-list">
                {memory.summary.unresolvedGaps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="employer-message__body">No unresolved publish blockers in memory.</p>
            )}
            {memory.compacted ? (
              <p className="employer-message__body">
                Context compacted from {memory.summary.compactedMessageCount} messages.
              </p>
            ) : null}
          </>
        ) : (
          <p className="employer-message__body">Memory will populate after the first revision turn.</p>
        )}

        <section className="employer-job-chat__readiness">
          <p className="employer-section-label">Follow-up Questions</p>
          {session?.followUpQuestions.length ? (
            <ul className="employer-guardrail-list">
              {session.followUpQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          ) : (
            <p className="employer-message__body">No required follow-up questions right now.</p>
          )}
        </section>

        <section className="employer-job-chat__role-profile" data-testid="employer-job-chat-role-profile">
          <p className="employer-section-label">Role Profile Summary</p>
          {roleProfileSummary ? (
            <>
              <dl className="employer-job-chat__kv">
                <div>
                  <dt>Title</dt>
                  <dd>{roleProfileSummary.title || "Not specified"}</dd>
                </div>
                <div>
                  <dt>Department</dt>
                  <dd>{roleProfileSummary.department || "Not specified"}</dd>
                </div>
                <div>
                  <dt>Level</dt>
                  <dd>{roleProfileSummary.level || "Not specified"}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{roleProfileSummary.locationPolicy || "Not specified"}</dd>
                </div>
                <div>
                  <dt>Compensation</dt>
                  <dd>{roleProfileSummary.compensationRange || "Not specified"}</dd>
                </div>
              </dl>

              {roleProfileSummary.unresolvedConstraints.length ? (
                <>
                  <p className="employer-message__body">Unresolved constraints:</p>
                  <ul className="employer-guardrail-list">
                    {roleProfileSummary.unresolvedConstraints.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : (
            <p className="employer-message__body">Role profile will appear after refinement turns.</p>
          )}
        </section>

        <section className="employer-job-chat__quality" data-testid="employer-job-chat-quality">
          <p className="employer-section-label">Quality Warnings</p>
          {qualityChecks.length ? (
            <>
              <p className="employer-message__body employer-job-chat__readiness-flag">
                {readinessFlags.blocksReview
                  ? "Review is currently blocked until critical quality failures are fixed."
                  : readinessFlags.requiresEmployerFix
                    ? "Employer fixes are recommended before review."
                    : "No quality blockers detected."}
              </p>
              {qualityChecks.map((check) => (
                <article
                  key={`${check.checkType}:${check.status}:${check.suggestedRewrite}`}
                  className={`employer-job-chat__quality-item employer-job-chat__quality-item--${check.status}`}
                >
                  <p className="employer-message__speaker">
                    {formatCheckType(check.checkType)} · {check.status.toUpperCase()}
                  </p>
                  {check.issues.length ? (
                    <ul className="employer-guardrail-list">
                      {check.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="employer-message__body">No issues detected.</p>
                  )}
                  <p className="employer-message__body">{check.suggestedRewrite}</p>
                </article>
              ))}
            </>
          ) : (
            <p className="employer-message__body">Quality checks will populate after the first revision turn.</p>
          )}
        </section>
      </aside>
    </section>
  );
}
