# Interactive Proof feature specifications

**Status:** Internal roadmap and future authoring notes

**Parent document:** [`../PRD.md`](../PRD.md)

This folder records bounded future workstreams. The public product is upload-first; these notes describe extensions around that core and the internal curated-fixture authoring path. Update the PRD when a feature changes the product contract.

## Recommended execution order

| Order | Feature | Primary outcome | Depends on |
|---|---|---|---|
| 1 | Upload-first release | Hosted upload journey, temporary-file boundaries, and submission evidence | Current `main` (implemented) |
| 2 | [Guided learning](02-guided-learning.md) | Persistent depth and useful next questions | Current explanation flow |
| 3 | [Proof map](03-proof-map.md) | Navigable structure of mappings and dependencies | Existing package mappings |
| 4 | [Deep links](04-deep-links.md) | Shareable paper, Lean, mapping, and explanation locations | Reader navigation contracts |
| 5 | [Proof-package authoring](05-proof-package-authoring.md) | Repeatable path for adding proofs | Package schema and validators |
| 6 | [Instructor layers](06-instructor-layers.md) | Curated teaching material distinct from AI output | Package authoring conventions |
| 7 | [Demonstration mode](07-demonstration-mode.md) | Honest no-key review and resilient demos | Stable explanation/context schema |
| 8 | [Ephemeral uploads](08-ephemeral-uploads.md) | Temporary reader-provided PDF and optional Lean workspace | Current `main` (implemented) |

The upload-first release is implemented. Features 2–4 may run in parallel after their shared URL/state decisions are aligned. Feature 5 should establish conventions before feature 6 extends the internal package schema. Feature 7 can run independently if it consumes the existing public context contract rather than duplicating it.

## Shared implementation rules

- Preserve the distinction among paper claims, Lean verification, prerequisites, curator-authored material, and generated explanation.
- The server or generated registry remains authoritative for internal proof-package content; uploaded files remain browser-local and temporary.
- Client input must never select arbitrary files, source identifiers, or verification claims.
- Keep model tools disabled unless a later approved spec changes that boundary.
- Do not add accounts, durable user data, vector search, autonomous formalization, or live Lean editing in these workstreams.
- Every implemented feature must pass package validation, evaluation validation, unit tests, typecheck, lint, production build, and relevant Playwright coverage.
- Sites-facing changes must also pass the vinext build and a Wrangler smoke test.
- New user-visible claims require observable evidence; placeholders must stay visibly marked.

## Agent handoff format

Each agent should report:

1. Branch and commit SHA.
2. Files and contracts changed.
3. Acceptance criteria satisfied.
4. Commands run and exact results.
5. Screenshots for visible changes.
6. Known limitations and follow-up decisions.
7. Review location or commit SHA; direct-to-main work is acceptable when explicitly requested.
