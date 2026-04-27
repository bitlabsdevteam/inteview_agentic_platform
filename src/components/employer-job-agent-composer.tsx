"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  extractReadableTextFromPossiblyJson,
  parseSseFrame,
  scheduleTransientThinkingLifecycle,
  splitIntoTokenChunks,
  type TransientThinkingTiming,
  type TransientThinkingPhase
} from "@/lib/agents/job-posting/streaming";
import {
  INITIAL_EMPLOYER_JOB_COMPOSER_STREAM_STATE,
  type EmployerJobComposerStreamStatus,
  reduceEmployerJobComposerStreamState
} from "@/lib/agents/job-posting/composer-stream-state";

function formatStreamStatus(status: EmployerJobComposerStreamStatus) {
  if (status === "streaming") {
    return "Streaming";
  }

  if (status === "complete") {
    return "Complete";
  }

  if (status === "error") {
    return "Error";
  }

  return "Idle";
}

type TransientThinkingMessage = {
  id: number;
  text: string;
  phase: TransientThinkingPhase;
};

type TransientThinkingToken = {
  id: number;
  text: string;
  phase: TransientThinkingPhase;
};

const TRANSIENT_THINKING_TOKEN_TIMING: TransientThinkingTiming = {
  fadeIn: 90,
  visible: 680,
  fadeOut: 180
};
const TRANSIENT_THINKING_TOKEN_STAGGER_MS = 36;

export function EmployerJobAgentComposer() {
  const router = useRouter();
  const [employerPrompt, setEmployerPrompt] = useState("");
  const [streamState, dispatchStream] = useReducer(
    reduceEmployerJobComposerStreamState,
    INITIAL_EMPLOYER_JOB_COMPOSER_STREAM_STATE
  );
  const nextRequestIdRef = useRef(0);
  const nextTransientMessageIdRef = useRef(0);
  const nextTransientTokenIdRef = useRef(0);
  const transientLifecycleCancelersRef = useRef<Array<() => void>>([]);
  const transientTokenLifecycleCancelersRef = useRef<Array<() => void>>([]);
  const transientTokenQueueTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const rawThinkingStreamRef = useRef("");
  const displayedThinkingTextRef = useRef("");
  const [transientThinkingMessages, setTransientThinkingMessages] = useState<
    TransientThinkingMessage[]
  >([]);
  const [transientThinkingTokens, setTransientThinkingTokens] = useState<TransientThinkingToken[]>(
    []
  );
  const { status: streamStatus, statusMessage, thinkingStream } = streamState;

  const isSubmitting = streamStatus === "streaming";
  const canSubmit = employerPrompt.trim().length > 0 && !isSubmitting;
  const streamLabel = useMemo(() => formatStreamStatus(streamStatus), [streamStatus]);

  function clearTransientThinkingTimers() {
    transientLifecycleCancelersRef.current.forEach((cancelLifecycle) => {
      cancelLifecycle();
    });
    transientLifecycleCancelersRef.current = [];
  }

  function clearTransientThinkingTokenTimers() {
    transientTokenLifecycleCancelersRef.current.forEach((cancelLifecycle) => {
      cancelLifecycle();
    });
    transientTokenLifecycleCancelersRef.current = [];
    transientTokenQueueTimersRef.current.forEach((timerId) => {
      clearTimeout(timerId);
    });
    transientTokenQueueTimersRef.current = [];
  }

  function queueTransientThinkingMessage(requestId: number, text: string) {
    const message = text.trim();

    if (!message) {
      return;
    }

    const messageId = nextTransientMessageIdRef.current + 1;
    nextTransientMessageIdRef.current = messageId;

    setTransientThinkingMessages((current) => [
      ...current,
      {
        id: messageId,
        text: message,
        phase: "fade-in"
      }
    ]);

    const cancelLifecycle = scheduleTransientThinkingLifecycle({
      onVisible: () => {
        if (nextRequestIdRef.current !== requestId) {
          return;
        }

        setTransientThinkingMessages((current) =>
          current.map((item) =>
            item.id === messageId
              ? {
                  ...item,
                  phase: "visible"
                }
              : item
          )
        );
      },
      onFadeOut: () => {
        if (nextRequestIdRef.current !== requestId) {
          return;
        }

        setTransientThinkingMessages((current) =>
          current.map((item) =>
            item.id === messageId
              ? {
                  ...item,
                  phase: "fade-out"
                }
              : item
          )
        );
      },
      onRemove: () => {
        if (nextRequestIdRef.current !== requestId) {
          return;
        }

        setTransientThinkingMessages((current) => current.filter((item) => item.id !== messageId));
      }
    });
    transientLifecycleCancelersRef.current.push(cancelLifecycle);
  }

  function queueTransientThinkingTextTokens(requestId: number, text: string) {
    const chunks = splitIntoTokenChunks(text);

    chunks.forEach((chunk, index) => {
      if (!chunk) {
        return;
      }

      const queueHandle = setTimeout(() => {
        if (nextRequestIdRef.current !== requestId) {
          return;
        }

        const tokenId = nextTransientTokenIdRef.current + 1;
        nextTransientTokenIdRef.current = tokenId;

        setTransientThinkingTokens((current) => [
          ...current,
          {
            id: tokenId,
            text: chunk,
            phase: "fade-in"
          }
        ]);

        const cancelLifecycle = scheduleTransientThinkingLifecycle(
          {
            onVisible: () => {
              if (nextRequestIdRef.current !== requestId) {
                return;
              }

              setTransientThinkingTokens((current) =>
                current.map((item) =>
                  item.id === tokenId
                    ? {
                        ...item,
                        phase: "visible"
                      }
                    : item
                )
              );
            },
            onFadeOut: () => {
              if (nextRequestIdRef.current !== requestId) {
                return;
              }

              setTransientThinkingTokens((current) =>
                current.map((item) =>
                  item.id === tokenId
                    ? {
                        ...item,
                        phase: "fade-out"
                      }
                    : item
                )
              );
            },
            onRemove: () => {
              if (nextRequestIdRef.current !== requestId) {
                return;
              }

              setTransientThinkingTokens((current) =>
                current.filter((item) => item.id !== tokenId)
              );
            }
          },
          {
            timing: TRANSIENT_THINKING_TOKEN_TIMING
          }
        );

        transientTokenLifecycleCancelersRef.current.push(cancelLifecycle);
      }, index * TRANSIENT_THINKING_TOKEN_STAGGER_MS);

      transientTokenQueueTimersRef.current.push(queueHandle);
    });
  }

  function consumeThinkingTokenAsText(requestId: number, token: string) {
    rawThinkingStreamRef.current = `${rawThinkingStreamRef.current}${token}`;
    const nextDisplayText = extractReadableTextFromPossiblyJson(rawThinkingStreamRef.current);
    const previousDisplayText = displayedThinkingTextRef.current;
    displayedThinkingTextRef.current = nextDisplayText;

    let delta = nextDisplayText;
    if (nextDisplayText.startsWith(previousDisplayText)) {
      delta = nextDisplayText.slice(previousDisplayText.length);
    }

    if (delta.trim().length > 0) {
      queueTransientThinkingTextTokens(requestId, delta);
    }
  }

  useEffect(() => {
    return () => {
      clearTransientThinkingTimers();
      clearTransientThinkingTokenTimers();
    };
  }, []);

  async function submitPrompt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const prompt = employerPrompt.trim();

    if (!prompt || isSubmitting) {
      return;
    }

    const requestId = nextRequestIdRef.current + 1;
    nextRequestIdRef.current = requestId;
    clearTransientThinkingTimers();
    clearTransientThinkingTokenTimers();
    setTransientThinkingMessages([]);
    setTransientThinkingTokens([]);
    rawThinkingStreamRef.current = "";
    displayedThinkingTextRef.current = "";
    dispatchStream({
      type: "submit_started",
      requestId
    });

    try {
      const response = await fetch("/api/employer/jobs/agent-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          employerPrompt: prompt
        })
      });

      if (!response.ok || !response.body) {
        dispatchStream({
          type: "stream_failed",
          requestId,
          message: "Unable to start stream. Please try again."
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedCompletion = false;
      let receivedError = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        while (buffer.includes("\n\n")) {
          const boundary = buffer.indexOf("\n\n");
          const frame = buffer.slice(0, boundary + 2);
          buffer = buffer.slice(boundary + 2);

          const parsed = parseSseFrame(frame);

          if (
            !parsed ||
            typeof parsed.data !== "object" ||
            parsed.data === null ||
            Array.isArray(parsed.data)
          ) {
            continue;
          }
          const data = parsed.data as Record<string, unknown>;

          if (parsed.event === "activity_status" && typeof data.message === "string") {
            queueTransientThinkingMessage(requestId, data.message);
            dispatchStream({
              type: "status_received",
              requestId,
              message: data.message
            });
            continue;
          }

          if (parsed.event === "activity_token" && typeof data.token === "string") {
            consumeThinkingTokenAsText(requestId, data.token);
            dispatchStream({
              type: "token_received",
              requestId,
              token: data.token
            });
            continue;
          }

          if (parsed.event === "error" && typeof data.message === "string") {
            receivedError = true;
            queueTransientThinkingMessage(requestId, data.message);
            dispatchStream({
              type: "stream_failed",
              requestId,
              message: data.message
            });
            continue;
          }

          if (parsed.event === "complete" && typeof data.redirectUrl === "string") {
            receivedCompletion = true;
            dispatchStream({
              type: "stream_completed",
              requestId
            });
            router.push(data.redirectUrl);
            return;
          }
        }
      }

      if (!receivedCompletion && !receivedError) {
        queueTransientThinkingMessage(requestId, "Stream ended before completion.");
        dispatchStream({
          type: "stream_failed",
          requestId,
          message: "Stream ended before completion. Please try again."
        });
      }
    } catch {
      queueTransientThinkingMessage(requestId, "Unable to start stream.");
      dispatchStream({
        type: "stream_failed",
        requestId,
        message: "Unable to start stream. Please try again."
      });
    }
  }

  return (
    <>
      <form
        onSubmit={submitPrompt}
        className="employer-job-agent__composer"
        data-testid="employer-job-agent-form"
      >
        <label className="employer-composer__label" htmlFor="employerPrompt">
          Hiring prompt
        </label>
        <textarea
          className="employer-composer__input employer-job-agent__input"
          data-testid="employer-job-prompt-composer"
          id="employerPrompt"
          name="employerPrompt"
          placeholder="We need a senior product engineer to own AI interview workflows for remote US customers..."
          required
          rows={9}
          value={employerPrompt}
          onChange={(event) => setEmployerPrompt(event.currentTarget.value)}
        />
        <div className="employer-composer__actions">
          <button
            className="employer-composer__button"
            data-testid="employer-job-create-button"
            type="submit"
            disabled={!canSubmit}
          >
            Generate Draft
          </button>
        </div>
      </form>

      <section
        className="employer-job-agent__panel"
        data-testid="employer-job-agent-thinking-stream"
        aria-live="polite"
      >
        <p className="employer-section-label">Agent Activity</p>
        <p data-testid="employer-job-agent-stream-status">Status: {streamLabel}</p>
        <p>{statusMessage}</p>
        <div
          className="employer-job-agent__transient-messages"
          data-testid="employer-job-agent-transient-messages"
        >
          {transientThinkingMessages.map((message) => (
            <p
              key={message.id}
              className={`employer-job-agent__transient-message employer-job-agent__transient-message--${message.phase}`}
              data-testid="employer-job-agent-transient-message"
            >
              {message.text}
            </p>
          ))}
        </div>
        <pre
          className="employer-job-agent__stream-output"
          data-testid="employer-job-agent-stream-output"
          aria-label="Live Draft Stream"
        >
          {transientThinkingTokens.length ? (
            transientThinkingTokens.map((token) => (
              <span
                key={token.id}
                className={`employer-job-agent__stream-token employer-job-agent__stream-token--${token.phase}`}
                data-testid="employer-job-agent-stream-token"
              >
                {token.text}
              </span>
            ))
          ) : (
            <span>
              {thinkingStream
                ? extractReadableTextFromPossiblyJson(thinkingStream)
                : "No text streamed yet."}
            </span>
          )}
        </pre>
      </section>
    </>
  );
}
