import type { ContextBundle } from "./types";

export const CONTEXT_BUDGETS = {
  selectionCharacters: 1_200,
  surroundingSourceCharacters: 8_000,
  mappedSourcesCharacters: 16_000,
  supportingMaterialCharacters: 5_000,
  conversationTurns: 6,
  conversationCharacters: 12_000,
} as const;

export function measureContextCharacters(context: ContextBundle) {
  return {
    selection: context.selection.text.length,
    surroundingSource: context.surroundingSource.text.length,
    mappedSources: context.mappedSources.reduce((sum, source) => sum + source.text.length, 0),
    supportingMaterial:
      context.glossary.reduce(
        (sum, entry) => sum + entry.term.length + entry.explanation.length,
        0,
      ) + context.prerequisites.reduce((sum, prerequisite) => sum + prerequisite.length, 0),
  };
}

export function contextIsWithinBudget(context: ContextBundle): boolean {
  const measured = measureContextCharacters(context);
  return (
    measured.selection <= CONTEXT_BUDGETS.selectionCharacters &&
    measured.surroundingSource <= CONTEXT_BUDGETS.surroundingSourceCharacters &&
    measured.mappedSources <= CONTEXT_BUDGETS.mappedSourcesCharacters &&
    measured.supportingMaterial <= CONTEXT_BUDGETS.supportingMaterialCharacters
  );
}
