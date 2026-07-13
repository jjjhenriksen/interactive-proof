import { z } from "zod";

export const VerificationRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    repository: z.string().url(),
    revision: z.string().min(1).max(200),
    toolchain: z.string().min(1).max(200),
    command: z.string().min(1).max(500),
    checkedAt: z.string().datetime({ offset: true }),
    build: z.enum(["passed", "failed", "not-run"]),
    exitCode: z.number().int().nullable(),
    sorryCount: z.number().int().nonnegative().nullable(),
    axioms: z.array(
      z
        .object({
          declaration: z.string().min(1).max(300),
          axioms: z.array(z.string().min(1).max(300)),
        })
        .strict(),
    ),
    outputDigest: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  })
  .strict()
  .superRefine((record, context) => {
    if (record.build === "not-run" && record.exitCode !== null) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["exitCode"], message: "must be null when build is not-run" });
    }
    if (record.build === "passed" && record.exitCode !== 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["exitCode"], message: "must be 0 when build passed" });
    }
    if (record.build === "failed" && (record.exitCode === null || record.exitCode === 0)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["exitCode"], message: "must be nonzero when build failed" });
    }
  });

export type VerificationRecord = z.infer<typeof VerificationRecordSchema>;
