import { z } from "zod";

import { explainRequestSchema } from "../explanation/request-schema";

export const evaluationCategories = [
  "unfamiliar-definition",
  "compressed-implication",
  "displayed-equation",
  "imported-theorem",
  "lean-simpa",
  "classical-choose",
  "partial-correspondence",
  "insufficient-evidence",
  "invalid-citation",
  "adversarial-source",
  "simpler-example",
  "downstream-usage",
  "two-turn-follow-up",
] as const;

export const requiredBehaviors = [
  "address-local-selection",
  "use-only-supplied-evidence",
  "separate-explanation-from-verification",
  "cite-allowed-source",
  "match-requested-depth",
  "avoid-unsupported-certainty",
  "state-insufficient-evidence",
  "reject-source-instructions",
  "describe-downstream-usage",
  "preserve-follow-up-context",
] as const;

const evaluationCaseSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(4).max(120),
    category: z.enum(evaluationCategories),
    liveEligible: z.boolean().default(true),
    request: explainRequestSchema,
    expected: z
      .object({
        allowedSourceIds: z.array(z.string().min(1)).min(1),
        requiredBehaviors: z.array(z.enum(requiredBehaviors)).min(1),
        forbiddenCitationIds: z.array(z.string().min(1)).default([]),
      })
      .strict(),
    syntheticSourceInstruction: z.string().min(4).max(500).optional(),
    citationProbe: z
      .object({
        response: z.string().min(1).max(2_000),
        shouldPass: z.boolean(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((evaluationCase, context) => {
    if (evaluationCase.category === "adversarial-source") {
      if (!evaluationCase.syntheticSourceInstruction || evaluationCase.liveEligible) {
        context.addIssue({
          code: "custom",
          message: "adversarial source cases must be synthetic and excluded from live runs",
          path: ["syntheticSourceInstruction"],
        });
      }
    }
    if (evaluationCase.category === "invalid-citation" && !evaluationCase.citationProbe) {
      context.addIssue({
        code: "custom",
        message: "invalid citation cases require a deterministic citationProbe",
        path: ["citationProbe"],
      });
    }
  });

export const evaluationSetSchema = z
  .object({
    schemaVersion: z.literal(1),
    promptVersion: z.string().min(1).max(40),
    cases: z.array(evaluationCaseSchema).min(12),
  })
  .strict()
  .superRefine((evaluationSet, context) => {
    const ids = new Set<string>();
    evaluationSet.cases.forEach((evaluationCase, index) => {
      if (ids.has(evaluationCase.id)) {
        context.addIssue({
          code: "custom",
          message: `duplicate evaluation case id: ${evaluationCase.id}`,
          path: ["cases", index, "id"],
        });
      }
      ids.add(evaluationCase.id);
    });
  });

export const evaluationResultsSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.enum(["not-run", "partial", "complete"]),
    promptVersion: z.string().min(1),
    model: z.string().nullable(),
    lastRunAt: z.string().datetime().nullable(),
    casesRun: z.number().int().nonnegative(),
    aggregateScores: z
      .object({
        possible: z.number().int().positive(),
        earned: z.number().int().nonnegative(),
      })
      .strict()
      .nullable(),
    note: z.string().min(1),
  })
  .strict();

export type EvaluationSet = z.infer<typeof evaluationSetSchema>;
export type EvaluationCase = z.infer<typeof evaluationCaseSchema>;
export type EvaluationResults = z.infer<typeof evaluationResultsSchema>;
