import { NextResponse } from "next/server";

import { buildExplanationContext, ExplanationContextError } from "../../../lib/explanation/build-context.server";
import { createExplanationStream } from "../../../lib/explanation/openai-response.server";
import { checkExplanationQuota } from "../../../lib/explanation/rate-limit.server";
import { explainRequestSchema } from "../../../lib/explanation/request-schema";
import { readBoundedRequestText, RequestBodyTooLargeError } from "../../../lib/explanation/read-body.server";

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

export async function POST(request: Request) {
  let rawBody: string;
  try {
    rawBody = await readBoundedRequestText(request, MAX_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return publicError(413, "INVALID_REQUEST", "The explanation request is too large.");
    }
    return publicError(400, "INVALID_REQUEST", "The explanation request could not be read.");
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

  let rateLimit;
  try {
    rateLimit = await checkExplanationQuota(request);
  } catch {
    return publicError(503, "RATE_LIMIT_UNAVAILABLE", "The explanation quota is temporarily unavailable. Please try again later.", { "Retry-After": "30", "Cache-Control": "no-store" });
  }
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
