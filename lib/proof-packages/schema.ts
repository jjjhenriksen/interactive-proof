import { z } from "zod";

const IdSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be a lowercase kebab-case identifier");

export const PackageRelativePathSchema = z
  .string()
  .min(1)
  .max(500)
  .refine((value) => !value.includes("\\"), "must use forward slashes")
  .refine((value) => !value.includes("\0"), "must not contain null bytes")
  .refine((value) => !value.startsWith("/"), "must be relative")
  .refine(
    (value) => value.split("/").every((part) => part !== "" && part !== "." && part !== ".."),
    "must not contain empty, current-directory, or parent-directory segments",
  );

export const PaperLicenseSchema = z
  .object({
    status: z.enum(["cleared", "review-required", "link-only"]),
    name: z.string().min(1).max(200).optional(),
    url: z.string().url().optional(),
  })
  .strict();

export const LeanSourceSchema = z
  .object({
    sourceId: IdSchema,
    file: PackageRelativePathSchema,
    declaration: z.string().min(1).max(240),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
  })
  .strict()
  .superRefine((source, context) => {
    if (source.endLine < source.startLine) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endLine"],
        message: "must be greater than or equal to startLine",
      });
    }
  });

export const ProofMappingSchema = z
  .object({
    id: IdSchema,
    label: z.string().min(1).max(240),
    paper: z
      .object({
        sourceId: IdSchema,
        pages: z.array(z.number().int().positive()).min(1),
        heading: z.string().min(1).max(300).optional(),
        quote: z.string().min(1).max(2_000).optional(),
      })
      .strict(),
    lean: z.array(LeanSourceSchema).min(1),
    prerequisites: z.array(z.string().min(1).max(500)).max(20),
    dependencies: z.array(IdSchema).max(30),
    usedBy: z.array(IdSchema).max(30),
    correspondence: z.enum(["direct", "partial", "supporting"]),
    correspondenceNote: z.string().min(1).max(2_000),
  })
  .strict();

export const ProofPackageSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: IdSchema,
    title: z.string().min(1).max(300),
    shortTitle: z.string().min(1).max(100),
    summary: z.string().min(1).max(2_000),
    audience: z.string().min(1).max(500),
    paper: z
      .object({
        title: z.string().min(1).max(300),
        authors: z.array(z.string().min(1).max(200)).min(1),
        pdf: PackageRelativePathSchema,
        pages: PackageRelativePathSchema,
        license: PaperLicenseSchema,
      })
      .strict(),
    lean: z
      .object({
        repository: z.string().url(),
        revision: z.string().min(1).max(200),
        toolchain: z.string().min(1).max(200),
        sourceDirectory: PackageRelativePathSchema,
        displayMode: z.enum(["full", "excerpts"]),
      })
      .strict(),
    glossary: z.array(
      z
        .object({
          id: IdSchema,
          term: z.string().min(1).max(200),
          explanation: z.string().min(1).max(1_000),
          sourceIds: z.array(IdSchema).max(30),
        })
        .strict(),
    ),
    mappings: z.array(ProofMappingSchema),
  })
  .strict()
  .superRefine((manifest, context) => {
    const duplicate = (values: string[]) => values.find((value, index) => values.indexOf(value) !== index);
    const mappingIds = manifest.mappings.map(({ id }) => id);
    const glossaryIds = manifest.glossary.map(({ id }) => id);
    const leanSourceIds = manifest.mappings.flatMap(({ lean }) => lean.map(({ sourceId }) => sourceId));

    for (const [path, values] of [
      [["mappings"], mappingIds],
      [["glossary"], glossaryIds],
      [["mappings"], leanSourceIds],
    ] as const) {
      const repeated = duplicate(values);
      if (repeated) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [...path], message: `duplicate id: ${repeated}` });
      }
    }

    const knownMappings = new Set(mappingIds);
    manifest.mappings.forEach((mapping, mappingIndex) => {
      for (const field of ["dependencies", "usedBy"] as const) {
        mapping[field].forEach((id, idIndex) => {
          if (!knownMappings.has(id)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["mappings", mappingIndex, field, idIndex],
              message: `unknown mapping id: ${id}`,
            });
          }
        });
      }
    });
  });

export type ProofPackage = z.infer<typeof ProofPackageSchema>;
export type ProofMapping = z.infer<typeof ProofMappingSchema>;
export type LeanSource = z.infer<typeof LeanSourceSchema>;
