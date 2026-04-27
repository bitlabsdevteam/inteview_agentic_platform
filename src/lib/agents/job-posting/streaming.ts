export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export type ParsedSseFrame = {
  event: string;
  data: JsonValue;
};

export type ProviderStreamEvent =
  | { type: "token"; token: string }
  | { type: "status"; message: string }
  | { type: "error"; message: string }
  | { type: "complete"; redirectUrl: string };

export type TransientThinkingPhase = "fade-in" | "visible" | "fade-out";

export const TRANSIENT_THINKING_TIMING_MS = {
  fadeIn: 180,
  visible: 1500,
  fadeOut: 300
} as const;

type TimerApi = {
  setTimeout: (handler: () => void, delayMs: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

const DEFAULT_TIMER_API: TimerApi = {
  setTimeout: (handler, delayMs) => globalThis.setTimeout(handler, delayMs),
  clearTimeout: (handle) => {
    globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>);
  }
};

type TransientThinkingLifecycleCallbacks = {
  onVisible: () => void;
  onFadeOut: () => void;
  onRemove: () => void;
};

export type TransientThinkingTiming = {
  fadeIn: number;
  visible: number;
  fadeOut: number;
};

type TransientThinkingLifecycleOptions = {
  startDelayMs?: number;
  timing?: TransientThinkingTiming;
};

function isTimerApi(value: unknown): value is TimerApi {
  return (
    typeof value === "object" &&
    value !== null &&
    "setTimeout" in value &&
    typeof (value as TimerApi).setTimeout === "function" &&
    "clearTimeout" in value &&
    typeof (value as TimerApi).clearTimeout === "function"
  );
}

export const PROVIDER_STREAM_EVENT_NAME = {
  token: "activity_token",
  status: "activity_status",
  error: "error",
  complete: "complete"
} as const;

export function splitIntoTokenChunks(text: string) {
  const value = text.trim();

  if (!value) {
    return [] as string[];
  }

  const words = value.split(/\s+/);

  return words.map((word, index) => (index === words.length - 1 ? word : `${word} `));
}

export function createSseEvent(event: string, data: JsonValue) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function scheduleTransientThinkingLifecycle(
  callbacks: TransientThinkingLifecycleCallbacks,
  optionsOrTimerApi: TransientThinkingLifecycleOptions | TimerApi = {},
  maybeTimerApi: TimerApi = DEFAULT_TIMER_API
) {
  const options = isTimerApi(optionsOrTimerApi) ? {} : optionsOrTimerApi;
  const timerApi = isTimerApi(optionsOrTimerApi) ? optionsOrTimerApi : maybeTimerApi;
  const timing = options.timing ?? TRANSIENT_THINKING_TIMING_MS;
  const startDelayMs = options.startDelayMs ?? 0;
  let cancelled = false;

  const runIfActive = (callback: () => void) => () => {
    if (!cancelled) {
      callback();
    }
  };

  const visibleHandle = timerApi.setTimeout(
    runIfActive(callbacks.onVisible),
    startDelayMs + timing.fadeIn
  );
  const fadeOutHandle = timerApi.setTimeout(
    runIfActive(callbacks.onFadeOut),
    startDelayMs + timing.fadeIn + timing.visible
  );
  const removeHandle = timerApi.setTimeout(
    runIfActive(callbacks.onRemove),
    startDelayMs + timing.fadeIn + timing.visible + timing.fadeOut
  );

  return () => {
    cancelled = true;
    timerApi.clearTimeout(visibleHandle);
    timerApi.clearTimeout(fadeOutHandle);
    timerApi.clearTimeout(removeHandle);
  };
}

function collectJsonStringValues(value: JsonValue, output: string[]) {
  if (typeof value === "string") {
    output.push(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonStringValues(item, output));
    return;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectJsonStringValues(item as JsonValue, output));
  }
}

function normalizeDisplayText(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractStringLiteralsFromJsonLikeText(text: string) {
  const matches = text.matchAll(/"((?:\\.|[^"\\])*)"/g);
  const values: string[] = [];

  for (const match of matches) {
    const literal = match[1];
    const start = typeof match.index === "number" ? match.index : 0;
    const suffix = text.slice(start + match[0].length);

    if (/^\s*:/.test(suffix)) {
      continue;
    }

    try {
      values.push(JSON.parse(`"${literal}"`) as string);
    } catch {
      values.push(literal);
    }
  }

  return values;
}

export function extractReadableTextFromPossiblyJson(streamText: string) {
  const value = streamText.trim();

  if (!value) {
    return "";
  }

  try {
    const parsed = JSON.parse(value) as JsonValue;
    const strings: string[] = [];
    collectJsonStringValues(parsed, strings);
    return normalizeDisplayText(strings);
  } catch {
    return normalizeDisplayText(extractStringLiteralsFromJsonLikeText(value));
  }
}

export function createSseFrameForProviderStreamEvent(event: ProviderStreamEvent) {
  if (event.type === "token") {
    return createSseEvent(PROVIDER_STREAM_EVENT_NAME.token, {
      token: event.token
    });
  }

  if (event.type === "status") {
    return createSseEvent(PROVIDER_STREAM_EVENT_NAME.status, {
      message: event.message
    });
  }

  if (event.type === "error") {
    return createSseEvent(PROVIDER_STREAM_EVENT_NAME.error, {
      message: event.message
    });
  }

  return createSseEvent(PROVIDER_STREAM_EVENT_NAME.complete, {
    redirectUrl: event.redirectUrl
  });
}

export function parseSseFrame(frame: string): ParsedSseFrame | null {
  const lines = frame
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return null;
  }

  const eventLine = lines.find((line) => line.startsWith("event: "));
  const dataLine = lines.find((line) => line.startsWith("data: "));

  if (!eventLine || !dataLine) {
    return null;
  }

  const event = eventLine.replace("event: ", "").trim();
  const raw = dataLine.replace("data: ", "").trim();

  try {
    return {
      event,
      data: JSON.parse(raw) as JsonValue
    };
  } catch {
    return null;
  }
}

function isRecord(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseProviderStreamEventFrame(frame: string): ProviderStreamEvent | null {
  const parsed = parseSseFrame(frame);

  if (!parsed || !isRecord(parsed.data)) {
    return null;
  }

  if (
    parsed.event === PROVIDER_STREAM_EVENT_NAME.token &&
    typeof parsed.data.token === "string"
  ) {
    return {
      type: "token",
      token: parsed.data.token
    };
  }

  if (
    parsed.event === PROVIDER_STREAM_EVENT_NAME.status &&
    typeof parsed.data.message === "string"
  ) {
    return {
      type: "status",
      message: parsed.data.message
    };
  }

  if (
    parsed.event === PROVIDER_STREAM_EVENT_NAME.error &&
    typeof parsed.data.message === "string"
  ) {
    return {
      type: "error",
      message: parsed.data.message
    };
  }

  if (
    parsed.event === PROVIDER_STREAM_EVENT_NAME.complete &&
    typeof parsed.data.redirectUrl === "string"
  ) {
    return {
      type: "complete",
      redirectUrl: parsed.data.redirectUrl
    };
  }

  return null;
}
