import type { ExplainRequest } from "../explanation/request-schema";
import type { ContextBundle, PublicContext } from "../explanation/types";
import type { UploadedExplainRequest } from "./schema";

export function buildUploadedExplanationContext(request: UploadedExplainRequest): {
  request: ExplainRequest;
  context: ContextBundle;
  publicContext: PublicContext;
} {
  const selectionId = request.selection.source === "paper" ? `uploaded-paper-page-${request.selection.page}` : "uploaded-lean-selection";
  const locationLabel = request.selection.source === "paper" ? `Uploaded paper · page ${request.selection.page}` : `Uploaded Lean · ${request.selection.file}`;
  const mappedLeanId = request.mappedLean ? "uploaded-lean-mapping" : null;
  const mappedPaperId = request.mappedPaper ? `uploaded-paper-page-${request.mappedPaper.page}` : null;
  const allowedSourceIds = [...new Set([selectionId, mappedLeanId, mappedPaperId].filter((id): id is string => Boolean(id)))];
  const verification = { status: "not-run" as const, revision: null, toolchain: null, checkedAt: null, sorryCount: null, axiomCount: null };

  const context: ContextBundle = {
    proof: { id: "uploaded-session", title: request.paperTitle, audience: "Reader-provided material" },
    selection: { text: request.selection.selectedText, sourceId: selectionId, sourceType: request.selection.source, locationLabel },
    surroundingSource: { id: selectionId, type: request.selection.source, label: locationLabel, text: request.selection.surroundingText },
    mappedSources: [
      ...(request.mappedLean ? [{ id: mappedLeanId!, type: "lean" as const, label: `Uploaded Lean · ${request.mappedLean.file}`, text: request.mappedLean.text }] : []),
      ...(request.mappedPaper ? [{ id: mappedPaperId!, type: "paper" as const, label: `Uploaded paper · page ${request.mappedPaper.page}`, text: request.mappedPaper.text }] : []),
    ],
    glossary: [],
    prerequisites: request.mappingNote ? [`Reader's provisional mapping note: ${request.mappingNote}`] : [],
    dependencies: [], usedBy: [], instructor: [], verification, allowedSourceIds,
  };
  const sources: PublicContext["sources"] = request.selection.source === "paper"
    ? [{ id: selectionId, type: "paper", label: locationLabel, page: request.selection.page }]
    : [{ id: selectionId, type: "lean", label: locationLabel, file: request.selection.file, declaration: "Uploaded selection", revision: "unverified-upload" }];
  if (request.mappedLean && request.selection.source === "paper") sources.push({ id: mappedLeanId!, type: "lean", label: `Uploaded Lean · ${request.mappedLean.file}`, file: request.mappedLean.file, declaration: "Uploaded source", revision: "unverified-upload" });
  if (request.mappedPaper && request.selection.source === "lean") sources.push({ id: mappedPaperId!, type: "paper", label: `Uploaded paper · page ${request.mappedPaper.page}`, page: request.mappedPaper.page });

  const modelRequest: ExplainRequest = {
    proofId: "uploaded-session",
    source: request.selection.source,
    location: request.selection.source === "paper"
      ? { source: "paper", page: request.selection.page, blockIds: [selectionId] }
      : { source: "lean", file: request.selection.file, declaration: "Uploaded selection", startLine: 1, endLine: 1 },
    selectedText: request.selection.selectedText,
    mode: request.mode,
    depth: request.depth,
    question: request.question,
    history: request.history,
    instructorEntryIds: [],
  };
  return { request: modelRequest, context, publicContext: { selection: { text: request.selection.selectedText, sourceType: request.selection.source, locationLabel }, sources, verification } };
}
