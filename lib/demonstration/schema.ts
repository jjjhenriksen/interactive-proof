import { z } from "zod";
import { sourceLocationSchema, explanationDepthSchema, explanationModeSchema } from "../explanation/request-schema";

export const RecordedExplanationSchema = z.object({
  schemaVersion: z.literal(1), id: z.string().min(1).max(100), proofId: z.string().min(1).max(80),
  requestFingerprint: z.string().regex(/^[a-f0-9]{8}$/), promptVersion: z.string().min(1).max(80), model: z.string().min(1).max(80),
  recordedAt: z.string().datetime(), reviewedBy: z.string().min(1).max(160),
  selection: z.object({ source: z.enum(["paper", "lean", "guide"]), selectedText: z.string().min(2).max(1200), location: sourceLocationSchema, mode: explanationModeSchema, depth: explanationDepthSchema }).strict().refine((value) => value.source === value.location.source, "selection source must match its location"),
  sourceIds: z.array(z.string().min(1).max(120)).min(1).max(12),
  answer: z.string().min(1).max(8000),
  suggestions: z.array(z.object({ id: z.string().min(1).max(100), label: z.string().min(1).max(80), question: z.string().min(1).max(300), sourceIds: z.array(z.string().min(1).max(120)).max(12) }).strict()).max(2),
}).strict();
export const RecordedFileSchema = z.object({ schemaVersion: z.literal(1), fixtures: z.array(RecordedExplanationSchema).max(20) }).strict();
export type RecordedExplanation = z.infer<typeof RecordedExplanationSchema>;

export function recordedFingerprint(fixture: Pick<RecordedExplanation, "proofId" | "selection" | "promptVersion">, revision: string) {
  const canonical = JSON.stringify([fixture.proofId, fixture.selection.location, fixture.selection.selectedText, fixture.selection.mode, fixture.selection.depth, revision, fixture.promptVersion]);
  let hash = 2166136261;
  for (let index = 0; index < canonical.length; index += 1) { hash ^= canonical.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
