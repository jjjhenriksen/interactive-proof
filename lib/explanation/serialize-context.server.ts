import { CONTEXT_BUDGETS } from "./context-budgets";
import type { ExplainRequest } from "./request-schema";
import type {
  ContextBundle,
  PublicContext,
  PublicSource,
  SourceExcerpt,
  VerificationSummary,
} from "./types";
import { loadProofPackage } from "../proof-packages/registry.server";
import type { LeanSource, ProofMapping } from "../proof-packages/schema";
import type { RuntimeProofPackage } from "../proof-packages/types";
import { verificationStatus } from "../verification/audit";

export type ExplanationContextErrorCode = "SOURCE_NOT_FOUND" | "SELECTION_MISMATCH";

export class ExplanationContextError extends Error {
  constructor(
    readonly code: ExplanationContextErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ExplanationContextError";
  }
}

export async function buildExplanationContext(
  request: ExplainRequest,
): Promise<{ context: ContextBundle; publicContext: PublicContext }> {
  const loaded = await loadProofPackage(request.proofId);
  if (!loaded) {
    throw new ExplanationContextError("SOURCE_NOT_FOUND", "Proof package not found");
  }

  const resolved =
    request.location.source === "paper"
      ? await resolvePaperSelection(request, loaded)
      : request.location.source === "lean"
        ? await resolveLeanSelection(request, loaded)
        : fail("SOURCE_NOT_FOUND", "This proof package has no validated guide source");

  const verification = verificationSummary(loaded);
  const mapping = resolved.mapping;
  const mappedSources = mapping ? await resolveMappedSources(resolved.kind, mapping, loaded) : [];
  const allSourceIds = unique([resolved.excerpt.id, ...mappedSources.map(({ id }) => id)]);
  const publicSources = deduplicateSources([
    resolved.publicSource,
    ...mappedSources.map((source) => source.publicSource),
  ]);

  const supportingMaterial = takeSupportingMaterial(
    loaded.manifest.glossary
      .filter((entry) => entry.sourceIds.some((id) => allSourceIds.includes(id)))
      .map(({ term, explanation, sourceIds }) => ({
        term,
        explanation,
        sourceIds: sourceIds.filter((id) => allSourceIds.includes(id)),
      })),
    mapping?.prerequisites ?? [],
  );
  const mappingIndex = new Map(loaded.manifest.mappings.map((item) => [item.id, item]));
  const dependencies = (mapping?.dependencies ?? []).map((id) => ({
    id,
    label: mappingIndex.get(id)?.label ?? id,
  }));
  const usedBy = (mapping?.usedBy ?? []).map((id) => ({
    id,
    label: mappingIndex.get(id)?.label ?? id,
  }));
  const instructor = request.instructorEntryIds.map((id) => {
    const entry = loaded.instructorEntries.find((item) => item.id === id);
    if (!entry) return fail("SOURCE_NOT_FOUND", `Instructor entry not found: ${id}`);
    if (!entry.sourceIds.some((sourceId) => allSourceIds.includes(sourceId)) && !entry.mappingIds.includes(mapping?.id ?? "")) {
      return fail("SOURCE_NOT_FOUND", `Instructor entry is not attached to this selection: ${id}`);
    }
    return { id: entry.id, kind: entry.kind, title: entry.title, body: entry.body, author: entry.author, license: entry.license };
  });

  const context: ContextBundle = {
    proof: {
      id: loaded.manifest.id,
      title: loaded.manifest.title,
      audience: loaded.manifest.audience,
    },
    selection: {
      text: request.selectedText,
      sourceId: resolved.excerpt.id,
      sourceType: resolved.kind,
      locationLabel: resolved.excerpt.label,
    },
    surroundingSource: {
      ...resolved.excerpt,
      text: truncate(
        resolved.excerpt.text,
        CONTEXT_BUDGETS.surroundingSourceCharacters,
      ),
    },
    mappedSources: boundExcerpts(
      mappedSources.map(({ id, type, label, text }) => ({ id, type, label, text })),
    ),
    glossary: supportingMaterial.glossary,
    prerequisites: supportingMaterial.prerequisites,
    dependencies,
    usedBy,
    instructor,
    verification,
    allowedSourceIds: allSourceIds,
  };

  return {
    context,
    publicContext: {
      selection: {
        text: request.selectedText,
        sourceType: resolved.kind,
        locationLabel: resolved.excerpt.label,
      },
      sources: publicSources,
      verification,
      curated: [
        ...supportingMaterial.glossary.map((item) => ({ kind: "glossary" as const, label: item.term, explanation: item.explanation })),
        ...supportingMaterial.prerequisites.map((item) => ({ kind: "prerequisite" as const, label: item, explanation: "Background used by this mapped proof step." })),
      ],
    },
  };
}

type ResolvedSelection = {
  kind: "paper" | "lean";
  excerpt: SourceExcerpt;
  publicSource: PublicSource;
  mapping?: ProofMapping;
};

type MappedExcerpt = SourceExcerpt & { publicSource: PublicSource };

async function resolvePaperSelection(
  request: ExplainRequest,
  loaded: RuntimeProofPackage,
): Promise<ResolvedSelection> {
  if (request.location.source !== "paper") return fail("SOURCE_NOT_FOUND", "Invalid paper location");
  const location = request.location;
  const page = loaded.paperPages.pages.find(({ number }) => number === location.page);
  if (!page) return fail("SOURCE_NOT_FOUND", "Paper page not found");
  if (location.blockIds.length === 0) {
    return fail("SOURCE_NOT_FOUND", "A paper selection must identify at least one extracted block");
  }
  const blockIndex = new Map(page.blocks.map((block) => [block.id, block]));
  const blocks = location.blockIds.map((id) => {
    const block = blockIndex.get(id);
    if (!block) return fail("SOURCE_NOT_FOUND", `Paper block not found on page ${page.number}`);
    return block;
  });
  const canonicalText = blocks.map(({ text }) => text).join("\n\n");
  assertSelectionMatches(request.selectedText, canonicalText);
  const sourceId = blocks[0].id;
  const mapping =
    loaded.manifest.mappings.find((item) => item.paper.sourceId === sourceId) ??
    loaded.manifest.mappings.find((item) => item.paper.pages.includes(page.number));
  const label = `Paper page ${page.number}${mapping?.paper.heading ? ` · ${mapping.paper.heading}` : ""}`;
  return {
    kind: "paper",
    excerpt: { id: sourceId, type: "paper", label, text: canonicalText },
    publicSource: { id: sourceId, type: "paper", label, page: page.number },
    mapping,
  };
}

async function resolveLeanSelection(
  request: ExplainRequest,
  loaded: RuntimeProofPackage,
): Promise<ResolvedSelection> {
  if (request.location.source !== "lean") return fail("SOURCE_NOT_FOUND", "Invalid Lean location");
  const location = request.location;
  const candidates = loaded.manifest.mappings.flatMap((mapping) =>
    mapping.lean.map((source) => ({ mapping, source })),
  );
  const match = candidates.find(
    ({ source }) =>
      source.file === location.file &&
      source.declaration === location.declaration &&
      location.startLine >= source.startLine &&
      location.endLine <= source.endLine,
  );
  if (!match) return fail("SOURCE_NOT_FOUND", "Lean declaration or selected line range not found");

  const text = await readLeanExcerpt(loaded, match.source);
  const relativeStart = location.startLine - match.source.startLine;
  const relativeEnd = location.endLine - match.source.startLine + 1;
  const selectedLines = text.split(/\r?\n/).slice(relativeStart, relativeEnd).join("\n");
  assertSelectionMatches(request.selectedText, selectedLines);
  const label = `${match.source.file} · ${match.source.declaration}`;
  return {
    kind: "lean",
    excerpt: { id: match.source.sourceId, type: "lean", label, text },
    publicSource: leanPublicSource(match.source, loaded, label),
    mapping: match.mapping,
  };
}

async function resolveMappedSources(
  selectedKind: "paper" | "lean",
  mapping: ProofMapping,
  loaded: RuntimeProofPackage,
): Promise<MappedExcerpt[]> {
  if (selectedKind === "paper") {
    return Promise.all(
      mapping.lean.map(async (source) => {
        const label = `${source.file} · ${source.declaration}`;
        return {
          id: source.sourceId,
          type: "lean" as const,
          label,
          text: await readLeanExcerpt(loaded, source),
          publicSource: leanPublicSource(source, loaded, label),
        };
      }),
    );
  }

  const page = loaded.paperPages.pages.find(({ number }) => number === mapping.paper.pages[0]);
  const block = page?.blocks.find(({ id }) => id === mapping.paper.sourceId);
  if (!page || !block) return fail("SOURCE_NOT_FOUND", "Mapped paper source not found");
  const label = `Paper page ${page.number}${mapping.paper.heading ? ` · ${mapping.paper.heading}` : ""}`;
  return [
    {
      id: block.id,
      type: "paper",
      label,
      text: block.text,
      publicSource: { id: block.id, type: "paper", label, page: page.number },
    },
  ];
}

function readLeanExcerpt(loaded: RuntimeProofPackage, source: LeanSource): string {
  const excerpt = loaded.leanExcerpts[source.sourceId];
  if (!excerpt) return fail("SOURCE_NOT_FOUND", "Bundled Lean source not found");
  return excerpt;
}

function leanPublicSource(
  source: LeanSource,
  loaded: RuntimeProofPackage,
  label: string,
): PublicSource {
  return {
    id: source.sourceId,
    type: "lean",
    label,
    file: source.file,
    declaration: source.declaration,
    revision: loaded.manifest.lean.revision,
  };
}

function verificationSummary(loaded: RuntimeProofPackage): VerificationSummary {
  const record = loaded.verification;
  return {
    status: verificationStatus(loaded.manifest, record),
    revision: record.revision,
    toolchain: record.toolchain,
    checkedAt: record.checkedAt,
    sorryCount: record.sorryCount,
    axiomCount: record.axioms.reduce((count, item) => count + item.axioms.length, 0),
  };
}

function assertSelectionMatches(selectedText: string, canonicalText: string): void {
  if (!normalize(canonicalText).includes(normalize(selectedText))) {
    fail("SELECTION_MISMATCH", "Selected text does not match the authoritative package source");
  }
}

function normalize(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, Math.max(0, limit - 1))}…`;
}

function boundExcerpts(excerpts: SourceExcerpt[]): SourceExcerpt[] {
  let remaining = CONTEXT_BUDGETS.mappedSourcesCharacters;
  return excerpts.flatMap((excerpt) => {
    if (remaining <= 0) return [];
    const text = truncate(excerpt.text, remaining);
    remaining -= text.length;
    return [{ ...excerpt, text }];
  });
}

function takeSupportingMaterial<T extends { term: string; explanation: string }>(
  values: T[],
  prerequisites: string[],
): { glossary: T[]; prerequisites: string[] } {
  let remaining = CONTEXT_BUDGETS.supportingMaterialCharacters;
  const glossary = values.flatMap((value) => {
    if (remaining <= value.term.length) return [];
    const explanation = truncate(value.explanation, Math.max(0, remaining - value.term.length));
    remaining -= value.term.length + explanation.length;
    return [{ ...value, explanation }];
  });
  const boundedPrerequisites = prerequisites.flatMap((value) => {
    if (remaining <= 0) return [];
    const item = truncate(value, remaining);
    remaining -= item.length;
    return [item];
  });
  return { glossary, prerequisites: boundedPrerequisites };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function deduplicateSources(sources: PublicSource[]): PublicSource[] {
  return sources.filter((source, index) => sources.findIndex(({ id }) => id === source.id) === index);
}

function fail(code: ExplanationContextErrorCode, message: string): never {
  throw new ExplanationContextError(code, message);
}

export function serializeContextForModel(context: ContextBundle): string {
  const sections = [
    ["PROOF", `${context.proof.title}\nAudience: ${context.proof.audience}`],
    [
      "SELECTION",
      `${context.selection.locationLabel}\nSource ID: ${context.selection.sourceId}\n${context.selection.text}`,
    ],
    ["SURROUNDING SOURCE", formatExcerpt(context.surroundingSource)],
    ["MAPPED SOURCES", context.mappedSources.map(formatExcerpt).join("\n\n") || "None supplied."],
    [
      "GLOSSARY",
      context.glossary
        .map((entry) => `${entry.term}: ${entry.explanation} [${entry.sourceIds.join(", ")}]`)
        .join("\n") || "None supplied.",
    ],
    ["PREREQUISITES", context.prerequisites.map((item) => `- ${item}`).join("\n") || "None supplied."],
    ["DEPENDENCIES", context.dependencies.map((item) => `- ${item.id}: ${item.label}`).join("\n") || "None supplied."],
    ["USED BY", context.usedBy.map((item) => `- ${item.id}: ${item.label}`).join("\n") || "None supplied."],
    ["INSTRUCTOR MATERIAL (QUOTED DATA)", (context.instructor ?? []).map((item) => `${item.kind}: ${item.title}\n${item.body}\nAuthor: ${item.author}; License: ${item.license}`).join("\n\n") || "None supplied."],
    ["VERIFICATION", JSON.stringify(context.verification)],
    ["ALLOWED SOURCE IDS", context.allowedSourceIds.join("\n")],
  ] as const;

  return sections.map(([heading, content]) => `<${heading}>\n${content}\n</${heading}>`).join("\n\n");
}

function formatExcerpt(excerpt: ContextBundle["surroundingSource"]): string {
  return `${excerpt.label}\nSource ID: ${excerpt.id}\n${excerpt.text}`;
}
