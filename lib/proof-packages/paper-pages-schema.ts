import { z } from "zod";

export const PaperBlockSchema = z
  .object({
    id: z.string().regex(/^page-[1-9]\d*-block-[1-9]\d*$/),
    kind: z.enum(["heading", "body", "equation", "caption", "metadata"]).default("body"),
    text: z.string().min(1),
  })
  .strict();

export const PaperPagesSchema = z
  .object({
    schemaVersion: z.literal(1),
    pdfSha256: z.string().regex(/^[a-f0-9]{64}$/),
    pages: z
      .array(
        z
          .object({
            number: z.number().int().positive(),
            text: z.string(),
            blocks: z.array(PaperBlockSchema),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((paper, context) => {
    const blockIds = new Set<string>();
    paper.pages.forEach((page, pageIndex) => {
      if (page.number !== pageIndex + 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pages", pageIndex, "number"],
          message: `expected contiguous page number ${pageIndex + 1}`,
        });
      }
      page.blocks.forEach((block, blockIndex) => {
        if (!block.id.startsWith(`page-${page.number}-block-`)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["pages", pageIndex, "blocks", blockIndex, "id"],
            message: "block id does not match its page",
          });
        }
        if (blockIds.has(block.id)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["pages", pageIndex, "blocks", blockIndex, "id"],
            message: `duplicate block id: ${block.id}`,
          });
        }
        blockIds.add(block.id);
      });
    });
  });

export type PaperPages = z.infer<typeof PaperPagesSchema>;
export type PaperBlock = z.infer<typeof PaperBlockSchema>;
