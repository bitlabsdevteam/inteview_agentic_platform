import { describe, expect, it } from "vitest";

import {
  INITIAL_EMPLOYER_JOB_COMPOSER_STREAM_STATE,
  reduceEmployerJobComposerStreamState
} from "@/lib/agents/job-posting/composer-stream-state";

describe("employer job composer stream state reducer", () => {
  it("moves from idle to streaming and resets token output on submit", () => {
    const previous = {
      ...INITIAL_EMPLOYER_JOB_COMPOSER_STREAM_STATE,
      status: "error" as const,
      statusMessage: "Old error.",
      thinkingStream: "old token"
    };

    const next = reduceEmployerJobComposerStreamState(previous, {
      type: "submit_started",
      requestId: 1
    });

    expect(next).toEqual({
      status: "streaming",
      statusMessage: "Initializing stream.",
      thinkingStream: "",
      activeRequestId: 1
    });
  });

  it("appends tokens only for the active request id", () => {
    const streaming = reduceEmployerJobComposerStreamState(
      INITIAL_EMPLOYER_JOB_COMPOSER_STREAM_STATE,
      {
        type: "submit_started",
        requestId: 2
      }
    );

    const ignored = reduceEmployerJobComposerStreamState(streaming, {
      type: "token_received",
      requestId: 1,
      token: "stale"
    });
    expect(ignored.thinkingStream).toBe("");

    const next = reduceEmployerJobComposerStreamState(streaming, {
      type: "token_received",
      requestId: 2,
      token: "fresh"
    });
    expect(next.thinkingStream).toBe("fresh");
  });

  it("supports streaming -> complete status transition", () => {
    const streaming = reduceEmployerJobComposerStreamState(
      INITIAL_EMPLOYER_JOB_COMPOSER_STREAM_STATE,
      {
        type: "submit_started",
        requestId: 3
      }
    );

    const next = reduceEmployerJobComposerStreamState(streaming, {
      type: "stream_completed",
      requestId: 3
    });

    expect(next.status).toBe("complete");
    expect(next.statusMessage).toBe("Draft generation complete.");
  });

  it("supports streaming -> error status transition", () => {
    const streaming = reduceEmployerJobComposerStreamState(
      INITIAL_EMPLOYER_JOB_COMPOSER_STREAM_STATE,
      {
        type: "submit_started",
        requestId: 4
      }
    );

    const next = reduceEmployerJobComposerStreamState(streaming, {
      type: "stream_failed",
      requestId: 4,
      message: "Provider request failed."
    });

    expect(next.status).toBe("error");
    expect(next.statusMessage).toBe("Provider request failed.");
  });
});
