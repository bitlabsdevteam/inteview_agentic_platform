import { NextResponse } from "next/server";

import { createPromptFirstEmployerJobDraft } from "@/lib/agents/job-posting/create-draft";
import {
  createJobPostingE2EStubInferenceResult,
  createJobPostingE2EStubStreamEvents,
  isJobPostingE2EStubMode
} from "@/lib/agents/job-posting/e2e-stub";
import {
  streamJobPostingInference,
  type JobPostingInferenceResult
} from "@/lib/agents/job-posting/inference";
import { getOpenAIClientConfig } from "@/lib/agents/job-posting/openai-client";
import { createStaticJobCreatorPromptVersion } from "@/lib/agents/job-posting/prompts";
import {
  createSseFrameForProviderStreamEvent,
  type ProviderStreamEvent
} from "@/lib/agents/job-posting/streaming";
import { parseAccountRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type StreamPayload = {
  employerPrompt?: unknown;
};

type DraftStreamResult = {
  job: {
    id: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDraftStreamResult(value: unknown): value is DraftStreamResult {
  if (!isRecord(value) || !isRecord(value.job)) {
    return false;
  }

  return typeof value.job.id === "string";
}

function readEmployerPrompt(payload: StreamPayload) {
  const prompt =
    typeof payload.employerPrompt === "string" ? payload.employerPrompt.trim() : "";

  if (!prompt) {
    throw new Error("Employer prompt is required before creating a job draft.");
  }

  return prompt;
}

function sanitizeStreamErrorMessage(error: unknown) {
  const fallback = "Unable to generate a draft right now. Please try again.";

  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();

  if (!message) {
    return fallback;
  }

  if (message.startsWith("Employer prompt is required")) {
    return message;
  }

  return fallback;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const role = parseAccountRole(data.user?.user_metadata?.role);

  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (role !== "employer") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let payload: StreamPayload;

  try {
    payload = (await request.json()) as StreamPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  let employerPrompt: string;

  try {
    employerPrompt = readEmployerPrompt(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid prompt." },
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const pushProviderEvent = (event: ProviderStreamEvent) => {
        controller.enqueue(encoder.encode(createSseFrameForProviderStreamEvent(event)));
      };

      try {
        const promptVersion = createStaticJobCreatorPromptVersion();
        const isE2EStub = isJobPostingE2EStubMode();
        const config = isE2EStub
          ? {
              apiKey: "e2e-stub",
              model: "gpt-5.5-e2e-stub",
              baseUrl: "https://stub.local/v1"
            }
          : getOpenAIClientConfig();
        let streamedInferenceResult: JobPostingInferenceResult | null = null;

        if (isE2EStub) {
          streamedInferenceResult = createJobPostingE2EStubInferenceResult({
            employerPrompt
          });

          for (const event of createJobPostingE2EStubStreamEvents(streamedInferenceResult)) {
            pushProviderEvent(event);
          }
        } else {
          for await (const event of streamJobPostingInference({
            config,
            promptVersion,
            employerPrompt
          })) {
            if (event.type === "token") {
              pushProviderEvent(event);
              continue;
            }

            if (event.type === "status") {
              pushProviderEvent(event);
              continue;
            }

            if (event.type === "error") {
              pushProviderEvent(event);
              continue;
            }

            if (event.type === "result") {
              streamedInferenceResult = event.result;
              break;
            }
          }
        }

        if (!streamedInferenceResult) {
          throw new Error("Draft generation stream completed without a final result.");
        }

        const completion = await createPromptFirstEmployerJobDraft({
          client: supabase,
          employerUserId: data.user.id,
          employerPrompt,
          config,
          promptVersion,
          runInference: async () => streamedInferenceResult
        });

        if (!isDraftStreamResult(completion)) {
          throw new Error("Draft generation returned an invalid response shape.");
        }

        pushProviderEvent({
          type: "complete",
          redirectUrl: `/employer/jobs/${completion.job.id}`
        });
      } catch (error) {
        pushProviderEvent({
          type: "error",
          message: sanitizeStreamErrorMessage(error)
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
