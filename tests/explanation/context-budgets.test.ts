import { describe, expect, it } from "vitest";

import {
  CONTEXT_BUDGETS,
  contextIsWithinBudget,
  measureContextCharacters,
} from "../../lib/explanation/context-budgets";
import type { ContextBundle } from "../../lib/explanation/types";

function contextWithText(overrides: Partial<ContextBundle> = {}): ContextBundle {
  return {
    proof: { id: "proof", title: "Proof", audience: "Readers" },
    selection: {
      text: "selection",
      sourceId: "page-1-block-1",
      sourceType: "paper",
      locationLabel: "Paper page 1",
    },
    surroundingSource: {
      id: "page-1-block-1",
      type: "paper",
      label: "Paper page 1",
      text: "source",
    },
    mappedSources: [],
    glossary: [],
    prerequisites: [],
    dependencies: [],
    usedBy: [],
    verification: {
      status: "not-run",
      revision: null,
      toolchain: null,
      checkedAt: null,
      sorryCount: null,
      axiomCount: null,
    },
    allowedSourceIds: ["page-1-block-1"],
    ...overrides,
  };
}

describe("context budgets", () => {
  it("measures glossary and prerequisites against one shared supporting budget", () => {
    const context = contextWithText({
      glossary: [{ term: "term", explanation: "x".repeat(2_500), sourceIds: [] }],
      prerequisites: ["y".repeat(2_500)],
    });

    expect(measureContextCharacters(context).supportingMaterial).toBe(5_004);
    expect(contextIsWithinBudget(context)).toBe(false);
  });

  it("rejects mapped source material above the documented combined limit", () => {
    const context = contextWithText({
      mappedSources: [
        {
          id: "lean-source",
          type: "lean",
          label: "Lean source",
          text: "x".repeat(CONTEXT_BUDGETS.mappedSourcesCharacters + 1),
        },
      ],
    });

    expect(contextIsWithinBudget(context)).toBe(false);
  });
});
