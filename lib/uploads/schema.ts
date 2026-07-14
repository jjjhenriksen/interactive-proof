import { z } from "zod";

import {
  conversationTurnSchema,
  explanationDepthSchema,
  explanationModeSchema,
} from "../explanation/request-schema";

const leanPathSchema = z.string().trim().min(1).max(240).refine(
  (value) => value.endsWith(".lean") && !value.includes("..") && !value.startsWith("/") && !value.startsWith("\\") && !value.includes("\\"),
  "invalid Lean file",
);

const uploadedSelectionSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("paper"),
    page: z.number().int().min(1).max(100),
    selectedText: z.string().trim().min(2).max(1_200),
    surroundingText: z.string().trim().min(2).max(12_000),
  }).strict(),
  z.object({
    source: z.literal("lean"),
    file: leanPathSchema,
    selectedText: z.string().trim().min(2).max(1_200),
    surroundingText: z.string().trim().min(2).max(12_000),
  }).strict(),
]);

export const uploadedExplainRequestSchema = z.object({
  paperTitle: z.string().trim().min(1).max(300),
  selection: uploadedSelectionSchema,
  mappedLean: z.object({
    file: leanPathSchema,
    text: z.string().trim().min(2).max(8_000),
  }).strict().optional(),
  mappedPaper: z.object({ page: z.number().int().min(1).max(100), text: z.string().trim().min(2).max(8_000) }).strict().optional(),
  mappingNote: z.string().trim().max(500).optional(),
  mode: explanationModeSchema,
  depth: explanationDepthSchema.default("standard"),
  question: z.string().trim().min(1).max(800).optional(),
  history: z.array(conversationTurnSchema).max(6).default([]),
  rightsConfirmed: z.literal(true),
}).strict().superRefine((request, context) => {
  if (request.mode === "question" && !request.question) context.addIssue({ code: "custom", path: ["question"], message: "question is required in question mode" });
  if (request.mode !== "question" && request.question) context.addIssue({ code: "custom", path: ["question"], message: "question is only accepted in question mode" });
  const normalizedSelection = request.selection.selectedText.replace(/\s+/g, " ").trim();
  const normalizedContext = request.selection.surroundingText.replace(/\s+/g, " ").trim();
  if (!normalizedContext.includes(normalizedSelection)) {
    context.addIssue({ code: "custom", path: ["selection", "selectedText"], message: "selected text must occur in surrounding text" });
  }
});

export type UploadedExplainRequest = z.infer<typeof uploadedExplainRequestSchema>;

export const UPLOAD_LIMITS = {
  pdfBytes: 20 * 1024 * 1024,
  pdfPages: 100,
  extractedPaperCharacters: 200_000,
  leanFileBytes: 256 * 1024,
  leanArchiveBytes: 5 * 1024 * 1024,
  leanTotalBytes: 1024 * 1024,
  leanFiles: 20,
} as const;
