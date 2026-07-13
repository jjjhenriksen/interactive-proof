import { NextResponse } from "next/server";

import { buildExplanationContext, ExplanationContextError } from "../../../lib/explanation/build-context.server";
import { createExplanationStream } from "../../../lib/explanation/openai-response.server";
import { checkRateLimit } from "../../../lib/explanation/rate-limit.server";
import { explainRequestSchema } from "../../../lib/explanation/request-schema";

export const runtime = "edge";

const MAX_REQUEST_BYTES = 32_000;

function publicError(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
) {
  return NextResponse.json({ code, message }, { status, headers });
}

function requestKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local-demo"
  );
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return publicError(413, "INVALID_REQUEST", "The explanation request is too large.");
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    return publicError(413, "INVALID_REQUEST", "The explanation request is too large.");
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return publicError(400, "INVALID_REQUEST", "The explanation request is not valid JSON.");
  }

  const parsed = explainRequestSchema.safeParse(json);
  if (!parsed.success) {
    return publicError(400, "INVALID_REQUEST", "The explanation request is invalid.");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        code: "MODEL_ERROR",
        message: "AI explanations are not configured on this deployment.",
        isRetryable: false,
      },
      { status: 503 },
    );
  }

  const configuredLimit = Number(process.env.EXPLAIN_RATE_LIMIT_PER_HOUR ?? 30);
  const rateLimit = checkRateLimit(requestKey(request), {
    limit: Number.isInteger(configuredLimit) && configuredLimit > 0 ? configuredLimit : 30,
    windowMs: 60 * 60 * 1_000,
  });
  if (!rateLimit.allowed) {
    return publicError(
      429,
      "RATE_LIMITED",
      "The demo explanation limit has been reached. Please try again later.",
      { "Retry-After": String(rateLimit.retryAfterSeconds) },
    );
  }

  let explanationContext;
  try {
    explanationContext = await buildExplanationContext(parsed.data);
  } catch (error) {
    if (error instanceof ExplanationContextError) {
      const status = error.code === "SOURCE_NOT_FOUND" ? 404 : 400;
      return publicError(status, error.code, error.message);
    }
    console.error("Explanation context construction failed", error);
    return publicError(500, "INTERNAL_ERROR", "The explanation context could not be prepared.");
  }

  const requestId = crypto.randomUUID();
  const stream = createExplanationStream({
    request: parsed.data,
    ...explanationContext,
    apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-5.6",
    requestId,
    signal: request.signal,
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
      "X-Request-Id": requestId,
    },
  });
}
