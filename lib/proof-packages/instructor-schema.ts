import { z } from "zod";

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
export const InstructorEntrySchema = z.object({
  id,
  kind: z.enum(["objective", "hint", "misconception", "explanation"]),
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(2_000).refine((value) => !/<\/?[a-z][^>]*>/i.test(value), "HTML is not allowed"),
  sourceIds: z.array(id).max(20),
  mappingIds: z.array(id).max(20),
  author: z.string().min(1).max(160),
  license: z.string().min(1).max(160),
  reviewedAt: z.string().datetime(),
}).strict();

export const InstructorFileSchema = z.object({
  schemaVersion: z.literal(1),
  entries: z.array(InstructorEntrySchema).max(100),
}).strict().superRefine((value, context) => {
  const ids = value.entries.map((entry) => entry.id);
  const duplicate = ids.find((entry, index) => ids.indexOf(entry) !== index);
  if (duplicate) context.addIssue({ code: "custom", path: ["entries"], message: `duplicate id: ${duplicate}` });
});

export type InstructorEntry = z.infer<typeof InstructorEntrySchema>;
