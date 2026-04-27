import { describe, expect, it } from "vitest";

import {
  createSseEvent,
  createSseFrameForProviderStreamEvent,
  extractReadableTextFromPossiblyJson,
  parseSseFrame,
  parseProviderStreamEventFrame,
  scheduleTransientThinkingLifecycle,
  splitIntoTokenChunks
} from "@/lib/agents/job-posting/streaming";

describe("job posting streaming utilities", () => {
  it("splits text into token chunks while preserving spaces", () => {
    expect(splitIntoTokenChunks("Thinking about role scope")).toEqual([
      "Thinking ",
      "about ",
      "role ",
      "scope"
    ]);
  });

  it("serializes SSE events with event and data lines", () => {
    const frame = createSseEvent("activity_token", {
      token: "Thinking ",
      index: 0
    });

    expect(frame).toContain("event: activity_token\n");
    expect(frame).toContain('data: {"token":"Thinking ","index":0}\n\n');
  });

  it("parses an SSE frame back into typed event payload", () => {
    const parsed = parseSseFrame(
      'event: complete\ndata: {"redirectUrl":"/employer/jobs/job-1"}\n\n'
    );

    expect(parsed).toEqual({
      event: "complete",
      data: { redirectUrl: "/employer/jobs/job-1" }
    });
  });

  it("serializes typed provider stream token and status events", () => {
    const tokenFrame = createSseFrameForProviderStreamEvent({
      type: "token",
      token: "Analyzing "
    });
    const statusFrame = createSseFrameForProviderStreamEvent({
      type: "status",
      message: "Streaming started."
    });

    expect(tokenFrame).toContain("event: activity_token\n");
    expect(tokenFrame).toContain('data: {"token":"Analyzing "}\n\n');
    expect(statusFrame).toContain("event: activity_status\n");
    expect(statusFrame).toContain('data: {"message":"Streaming started."}\n\n');
  });

  it("parses typed provider stream events from frames", () => {
    expect(
      parseProviderStreamEventFrame('event: activity_token\ndata: {"token":"token "}\n\n')
    ).toEqual({
      type: "token",
      token: "token "
    });
    expect(
      parseProviderStreamEventFrame('event: activity_status\ndata: {"message":"ok"}\n\n')
    ).toEqual({
      type: "status",
      message: "ok"
    });
    expect(parseProviderStreamEventFrame('event: error\ndata: {"message":"bad"}\n\n')).toEqual({
      type: "error",
      message: "bad"
    });
    expect(
      parseProviderStreamEventFrame('event: complete\ndata: {"redirectUrl":"/employer/jobs/j1"}\n\n')
    ).toEqual({
      type: "complete",
      redirectUrl: "/employer/jobs/j1"
    });
  });

  it("returns null for malformed or unsupported provider stream events", () => {
    expect(parseProviderStreamEventFrame("event: activity_status\ndata: {}\n\n")).toBeNull();
    expect(parseProviderStreamEventFrame("event: unknown\ndata: {\"x\":1}\n\n")).toBeNull();
  });

  it("extracts readable text from complete JSON output", () => {
    expect(
      extractReadableTextFromPossiblyJson(
        JSON.stringify({
          reasoningSummary: ["Inferred scope from prompt."],
          thinkingMessages: ["Checking critical gaps."],
          title: {
            value: "Senior AI Product Engineer"
          }
        })
      )
    ).toBe("Inferred scope from prompt. Checking critical gaps. Senior AI Product Engineer");
  });

  it("extracts readable text from partial JSON stream text", () => {
    expect(
      extractReadableTextFromPossiblyJson(
        '{"reasoningSummary":["Inferred scope"],"thinkingMessages":["Checking gaps"],"tit'
      )
    ).toBe("Inferred scope Checking gaps");
  });

  it("schedules transient thinking lifecycle with deterministic fade timing", () => {
    const scheduled: Array<{ id: number; delayMs: number; run: () => void }> = [];
    const calls: string[] = [];
    let nextId = 0;

    scheduleTransientThinkingLifecycle(
      {
        onVisible: () => calls.push("visible"),
        onFadeOut: () => calls.push("fade-out"),
        onRemove: () => calls.push("remove")
      },
      {
        setTimeout(run, delayMs) {
          const id = ++nextId;
          scheduled.push({ id, delayMs, run });
          return id;
        },
        clearTimeout() {}
      }
    );

    expect(scheduled.map((item) => item.delayMs)).toEqual([180, 1680, 1980]);

    scheduled
      .sort((a, b) => a.delayMs - b.delayMs)
      .forEach((item) => {
        item.run();
      });

    expect(calls).toEqual(["visible", "fade-out", "remove"]);
  });

  it("cancels transient thinking lifecycle callbacks", () => {
    const scheduled: Array<{ run: () => void }> = [];
    const calls: string[] = [];

    const cancel = scheduleTransientThinkingLifecycle(
      {
        onVisible: () => calls.push("visible"),
        onFadeOut: () => calls.push("fade-out"),
        onRemove: () => calls.push("remove")
      },
      {
        setTimeout(run) {
          scheduled.push({ run });
          return scheduled.length;
        },
        clearTimeout() {}
      }
    );

    cancel();
    scheduled.forEach((item) => {
      item.run();
    });

    expect(calls).toEqual([]);
  });

  it("supports custom lifecycle start delay and timing overrides", () => {
    const scheduled: Array<{ delayMs: number }> = [];

    scheduleTransientThinkingLifecycle(
      {
        onVisible() {},
        onFadeOut() {},
        onRemove() {}
      },
      {
        startDelayMs: 40,
        timing: {
          fadeIn: 10,
          visible: 20,
          fadeOut: 30
        }
      },
      {
        setTimeout(_run, delayMs) {
          scheduled.push({ delayMs });
          return scheduled.length;
        },
        clearTimeout() {}
      }
    );

    expect(scheduled.map((item) => item.delayMs)).toEqual([50, 70, 100]);
  });
});
