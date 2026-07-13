import { z } from "zod";

export const explanationModes = [
  "details",
  "simpler",
  "lean",
  "usage",
  "question",
] as const;

export const explanationModeSchema = z.enum(explanationModes);

const paperLocationSchema = z.object({
  source: z.literal("paper"),
  page: z.number().int().positive(),
  blockIds: z.array(z.string().min(1).max(120)).max(20).default([]),
});

const leanLocationSchema = z
  .object({
    source: z.literal("lean"),
    file: z.string().min(1).max(240),
    declaration: z.string().min(1).max(240),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
  })
  .refine(({ startLine, endLine }) => endLine >= startLine, {
    message: "endLine must not precede startLine",
    path: ["endLine"],
  });

const guideLocationSchema = z.object({
  source: z.literal("guide"),
  section: z.string().min(1).max(160),
});

export const sourceLocationSchema = z.discriminatedUnion("source", [
  paperLocationSchema,
  leanLocationSchema,
  guideLocationSchema,
]);

export const conversationTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(4_000),
});

export const explainRequestSchema = z
  .object({
    proofId: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid proof identifier"),
    source: z.enum(["paper", "lean", "guide"]),
    location: sourceLocationSchema,
    selectedText: z.string().trim().min(2).max(1_200),
    mode: explanationModeSchema,
    question: z.string().trim().min(1).max(800).optional(),
    history: z.array(conversationTurnSchema).max(6).default([]),
  })
  .superRefine((request, context) => {
    if (request.source !== request.location.source) {
      context.addIssue({
        code: "custom",
        message: "source must match location.source",
        path: ["source"],
      });
    }

    if (request.mode === "question" && !request.question) {
      context.addIssue({
        code: "custom",
        message: "question is required in question mode",
        path: ["question"],
      });
    }

    if (request.mode !== "question" && request.question) {
      context.addIssue({
        code: "custom",
        message: "question is only accepted in question mode",
        path: ["question"],
      });
    }
  });

export type ExplanationMode = z.infer<typeof explanationModeSchema>;
export type SourceLocation = z.infer<typeof sourceLocationSchema>;
export type ConversationTurn = z.infer<typeof conversationTurnSchema>;
export type ExplainRequest = z.infer<typeof explainRequestSchema>;
