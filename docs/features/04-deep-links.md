# Feature spec 04: Deep links and sharing

**Priority:** P1

**Outcome:** A learner or instructor can copy a stable link to the exact paper, Lean, mapping, or explanation location they are discussing.

## Canonical URL contract

```text
/proofs/:proofId?source=paper&page=2&mapping=duality-condition
/proofs/:proofId?source=lean&declaration=compatibility_solvable&mapping=duality-condition
```

Optional fragment:

```text
#source=page-2-block-3
```

Do not place selected text, model output, conversation history, prompts, or questions in the URL.

## Scope

- Define and validate one `ReaderLocation` union for paper, Lean, and mapping focus.
- Initialize reader state from valid URL parameters.
- Update the URL with `history.replaceState` for routine navigation and `pushState` for explicit source-chip/map navigation.
- Add “Copy link” actions for current source and current mapping.
- Restore location on reload and browser back/forward.
- Provide a designed fallback when a known proof has stale/unknown location parameters.

## Non-goals

- Publicly sharing generated explanations.
- Server-side short links.
- Encoding arbitrary selections or private questions.
- Persisting panel conversation state.

## Security and validation

- Proof IDs still pass through the registered route.
- Paper pages, source IDs, mappings, files, and declarations must resolve through the runtime package.
- Unknown values are removed from the canonicalized URL and produce a non-destructive notice.
- Copy-link text is created by the application; never copy unsanitized source content into a URL.

## UX behavior

- “Copy source link” is available near source navigation controls.
- “Copy mapping link” appears when a mapping is active.
- A brief accessible status announces success or clipboard failure.
- Opening a link scrolls/focuses the target after the PDF text layer or Lean view is ready.
- Respect focus expectations: initial deep-link focus may move to the target; background URL updates must not steal focus.

## Acceptance criteria

- Paper, Lean, and mapping links survive reload.
- Back/forward traverses explicit source navigation correctly.
- Unknown parameters never expose paths or crash the reader.
- Links contain no selected prose, model text, prompt content, or conversation history.
- Copy status is announced and does not depend on color.
- Proof-map and source-chip navigation use the same location contract.

## Test plan

- Parser/serializer round-trip unit tests.
- Canonicalization tests for invalid and mixed parameters.
- Browser tests for reload, back/forward, clipboard text, delayed PDF focus, and unknown locations.
- Mobile and keyboard acceptance coverage.

## Dependency decision

Land the `ReaderLocation` type before proof-map navigation. Guided-learning depth may accept an optional URL override, but it must not serialize questions or histories.
