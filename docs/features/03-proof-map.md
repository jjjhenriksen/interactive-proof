# Feature spec 03: Proof map

**Priority:** P1

**Outcome:** Learners can see where the selected step sits in the argument and navigate paper-to-Lean dependencies without reading the proof linearly.

## Scope

- Add a “Proof map” view derived entirely from existing mappings, dependencies, and `usedBy` relationships.
- Represent each mapping as one semantic node joining a paper location with zero or more Lean declarations.
- Show prerequisite edges separately from proof-dependency edges.
- Highlight the active mapping when navigation originates from paper selection, Lean selection, source chip, or URL state.
- Support list/outline fallback at narrow widths and for assistive technology.

## Non-goals

- Automatically inferring new mappings.
- Visualizing Lean tactic execution or the complete import graph.
- Force-directed physics that changes layout between renders.
- Claiming logical equivalence from a curator-authored mapping.

## Derived graph contract

```ts
type ProofMapNode = {
  id: string;
  label: string;
  paper: { page: number; sourceId: string };
  lean: Array<{ sourceId: string; declaration: string; file: string }>;
  correspondence: "full" | "partial" | "context-only";
};

type ProofMapEdge = {
  from: string;
  to: string;
  kind: "depends-on" | "used-by" | "prerequisite";
};
```

Extend the manifest schema with `correspondence` only if it cannot be derived safely. Existing packages receive an explicit migration value; never default an ambiguous mapping to `full`.

## Layout and interaction

- Use deterministic layered layout based on manifest order and dependency depth.
- Nodes expose paper page, Lean declarations, and correspondence status.
- Selecting a node updates the reader to the mapped source without a full reload.
- “Where is this used?” opens the map focused on downstream edges.
- The map is usable as a semantic ordered list with buttons/links even if SVG/canvas is unavailable.
- Do not encode edge kind or correspondence using color alone.

## Validation rules

- Dependency and `usedBy` targets must exist.
- Self-edges and duplicate edges fail package validation.
- Cycles are allowed only if explicitly represented as `context-only`; otherwise report them as authoring errors.
- The derived graph must be serializable into the generated runtime registry.

## Acceptance criteria

- Both packages render a deterministic map without proof-specific UI branches.
- Opening the map from paper or Lean highlights the expected mapping.
- Every interactive node navigates to a real source location.
- Partial correspondence is visibly disclosed.
- Keyboard users can traverse nodes and activate navigation in a meaningful order.
- Mobile uses the outline fallback without horizontal page overflow.

## Test plan

- Graph derivation and validation unit tests, including missing targets and cycles.
- Snapshot tests for deterministic ordering.
- Browser tests for paper→map→Lean and Lean→map→paper navigation.
- Accessibility assertions for names, current node, edge labels, and focus.

## Dependencies

Share a single `ReaderLocation` contract with deep links. Do not invent a second navigation-state representation.
