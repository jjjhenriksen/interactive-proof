import { NextResponse } from "next/server";

import { createExplanationStream } from "../../../lib/explanation/openai-response.server";
import { checkRateLimit } from "../../../lib/explanation/rate-limit.server";
import { buildUploadedExplanationContext } from "../../../lib/uploads/context.server";
import { uploadedExplainRequestSchema } from "../../../lib/uploads/schema";

export const runtime = "edge";
const MAX_REQUEST_BYTES = 48_000;

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) return NextResponse.json({ code: "INVALID_REQUEST", message: "The uploaded-context request is too large." }, { status: 413 });
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) return NextResponse.json({ code: "INVALID_REQUEST", message: "The uploaded-context request is too large." }, { status: 413 });
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return NextResponse.json({ code: "INVALID_REQUEST", message: "The request is not valid JSON." }, { status: 400 }); }
  const parsed = uploadedExplainRequestSchema.safeParse(value);
  if (!parsed.success) return NextResponse.json({ code: "INVALID_REQUEST", message: "The uploaded context is invalid." }, { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ code: "MODEL_ERROR", message: "AI explanations are not configured on this deployment.", isRetryable: false }, { status: 503 });
  const key = `upload:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local"}`;
  const configured = Number(process.env.EXPLAIN_RATE_LIMIT_PER_HOUR ?? 30);
  const rateLimit = checkRateLimit(key, { limit: Number.isInteger(configured) && configured > 0 ? configured : 30, windowMs: 60 * 60 * 1_000 });
  if (!rateLimit.allowed) return NextResponse.json({ code: "RATE_LIMITED", message: "The demo explanation limit has been reached." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  const requestId = crypto.randomUUID();
  const stream = createExplanationStream({ ...buildUploadedExplanationContext(parsed.data), apiKey, model: process.env.OPENAI_MODEL ?? "gpt-5.6", requestId, signal: request.signal });
  return new Response(stream, { headers: { "Cache-Control": "no-cache, no-store, no-transform", "Content-Type": "text/event-stream; charset=utf-8", "X-Accel-Buffering": "no", "X-Request-Id": requestId } });
}
