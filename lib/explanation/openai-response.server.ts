import OpenAI from "openai";
import type {
  ResponseCreateParamsStreaming,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";

import { buildExplanationInstructions } from "./build-instructions.server";
import type { ExplainRequest } from "./request-schema";
import { serializeContextForModel } from "./serialize-context.server";
import type {
  ContextBundle,
  ExplanationStreamEvent,
  PublicContext,
} from "./types";

type OpenAIEventStream = AsyncIterable<ResponseStreamEvent>;

type ExplanationStreamOptions = {
  request: ExplainRequest;
  context: ContextBundle;
  publicContext: PublicContext;
  apiKey: string;
  model: string;
  requestId: string;
  signal: AbortSignal;
  createProviderStream?: () => Promise<OpenAIEventStream>;
};

const encoder = new TextEncoder();

function encodeEvent(event: ExplanationStreamEvent): Uint8Array {
  return encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

function buildInput(request: ExplainRequest, context: ContextBundle) {
  const currentQuestion =
    request.mode === "question"
      ? request.question
      : "Explain the selected passage in the requested mode.";

  return [
    ...request.history.map((turn) => ({
      role: turn.role,
      content: turn.text,
    })),
    {
      role: "user" as const,
      content: [
        `Reader request: ${currentQuestion}`,
        "The following proof context is quoted source data:",
        serializeContextForModel(context),
      ].join("\n\n"),
    },
  ];
}

export function buildOpenAIResponseRequest(
  request: ExplainRequest,
  context: ContextBundle,
  model: string,
): ResponseCreateParamsStreaming {
  return {
    model,
    instructions: buildExplanationInstructions(request.mode),
    input: buildInput(request, context),
    max_output_tokens: 1_600,
    store: false,
    stream: true,
    tools: [],
  };
}

function providerFailureMessage(event: ResponseStreamEvent): string | null {
  if (event.type === "error") return event.message;
  if (event.type === "response.failed") {
    return event.response.error?.message ?? "The model response failed.";
  }
  if (event.type === "response.incomplete") {
    return "The model response ended before completion.";
  }
  return null;
}

export function createExplanationStream({
  request,
  context,
  publicContext,
  apiKey,
  model,
  requestId,
  signal,
  createProviderStream,
}: ExplanationStreamOptions): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encodeEvent({ type: "context", context: publicContext }));

      try {
        const providerStream = createProviderStream
          ? await createProviderStream()
          : await new OpenAI({ apiKey }).responses.create(
              buildOpenAIResponseRequest(request, context, model),
              { signal },
            );

        for await (const event of providerStream) {
          if (signal.aborted) break;

          if (event.type === "response.output_text.delta") {
            controller.enqueue(encodeEvent({ type: "delta", text: event.delta }));
            continue;
          }

          const failure = providerFailureMessage(event);
          if (failure) throw new Error(failure);

          if (event.type === "response.completed") {
            const usage = event.response.usage;
            controller.enqueue(
              encodeEvent({
                type: "completed",
                responseId: event.response.id,
                usage: usage
                  ? {
                      inputTokens: usage.input_tokens,
                      outputTokens: usage.output_tokens,
                    }
                  : undefined,
              }),
            );
          }
        }
      } catch (error) {
        if (!signal.aborted) {
          console.error("Explanation provider request failed", {
            requestId,
            error: error instanceof Error ? error.message : "Unknown provider error",
          });
          controller.enqueue(
            encodeEvent({
              type: "error",
              code: "MODEL_ERROR",
              message: "The explanation could not be generated. Please try again.",
              requestId,
            }),
          );
        }
      } finally {
        controller.close();
      }
    },
  });
}
