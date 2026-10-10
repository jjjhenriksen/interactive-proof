const CONTEXT_LIMIT = 12_000;

/**
 * Keep the selected passage and nearby text inside the upload request budget.
 * Source offsets refer to the original string, before whitespace normalization.
 * PDF extraction does not provide selection offsets; repeated passages use the
 * first exact, whitespace-normalized match when no usable offset is supplied.
 */
export function selectionContext(source: string, selectedText: string, preferredStart?: number): string | null {
  const normalizedSelection = selectedText.replace(/\s+/g, " ").trim();
  if (!normalizedSelection) return null;
  const pattern = normalizedSelection.split(" ").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
  const matcher = new RegExp(pattern, "g");
  const preferredOffset = typeof preferredStart === "number" && Number.isInteger(preferredStart) && preferredStart >= 0
    ? preferredStart + (source.slice(preferredStart).match(/^\s*/)?.[0].length ?? 0)
    : undefined;
  matcher.lastIndex = preferredOffset ?? 0;
  let match = matcher.exec(source);
  if (preferredOffset !== undefined && match?.index !== preferredOffset) {
    matcher.lastIndex = 0;
    match = matcher.exec(source);
  }
  if (!match) return null;
  // A large whitespace run can exceed the budget even for a short selection.
  if (match[0].length > CONTEXT_LIMIT) return normalizedSelection;
  const margin = Math.floor((CONTEXT_LIMIT - match[0].length) / 2);
  const start = Math.max(0, Math.min(match.index - margin, source.length - CONTEXT_LIMIT));
  return source.slice(start, start + CONTEXT_LIMIT);
}
