# Feature spec 06: Instructor-authored learning layers

**Priority:** P2, feasible after authoring conventions

**Outcome:** Instructors and proof curators can attach reviewed learning objectives, hints, misconceptions, and explanations to mapped proof steps while keeping authorship visible.

## Scope

- Extend proof packages with optional instructor layers attached to source IDs or mapping IDs.
- Support four entry kinds: `objective`, `hint`, `misconception`, and `explanation`.
- Show available entries in a “Curated guidance” section before or beside generated explanation.
- Allow a generated explanation request to include selected instructor entries as bounded quoted context.
- Record author, license, and review metadata for every layer.

## Non-goals

- In-browser authoring, accounts, classroom rosters, grading, or learner analytics.
- Letting the model impersonate an instructor.
- Treating instructor prose as Lean verification or paper text.

## Manifest contract

```ts
type InstructorEntry = {
  id: string;
  kind: "objective" | "hint" | "misconception" | "explanation";
  title: string;
  body: string;
  sourceIds: string[];
  mappingIds: string[];
  author: string;
  license: string;
  reviewedAt: string;
};
```

Store entries in `instructor.json` so large teaching material does not overwhelm `proof.json`. The manifest references the file and its digest. Registry generation validates and bundles it.

## Validation rules

- IDs are unique within a package.
- Every source and mapping reference exists.
- Body and total package sizes are bounded.
- Author, license, and review timestamp are required.
- HTML is not accepted; render Markdown from a restricted supported subset or plain text.
- Instructor material is quoted data in model context and cannot override instructions.

## UX requirements

- Label entries “Curated guidance” and display the named author.
- Distinguish all four kinds by text/icon and not color alone.
- Hints are collapsed initially; misconceptions require neutral wording.
- Learners may use a curated entry without invoking GPT-5.6.
- Source navigation from an entry returns to the referenced paper or Lean location.

## Acceptance criteria

- A package without instructor material renders unchanged.
- A package with entries displays them at every valid referenced location.
- Generated responses identify instructor material separately from paper and Lean evidence.
- Unknown references, missing attribution, unsafe markup, and oversize entries fail validation.
- Curated guidance works without an API key.

## Test plan

- Schema and reference validation tests.
- Context-budget and prompt-injection tests.
- Browser tests for disclosure, authorship, source navigation, no-key use, keyboard, and mobile.
- Add instructor entries to the clearly licensed demonstration package, not unresolved third-party material.

## Dependency

Use the authoring report to expose instructor-layer readiness and attribution findings. Do not build a second standalone validation system.
