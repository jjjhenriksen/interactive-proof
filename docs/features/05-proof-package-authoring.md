# Feature spec 05: Proof-package authoring workflow

**Priority:** P1/P2 bridge; highest generalization value

**Outcome:** A contributor can add a third proof package through a repeatable command-driven workflow without editing generated registries or reverse-engineering the schema.

## CLI surface

```text
npm run proof:new -- <proof-id>
npm run proof:extract -- <proof-id>
npm run proof:check -- <proof-id>
npm run proof:preview -- <proof-id>
```

Commands are local authoring tools. They never upload papers, call a model, or alter another package.

## Scope

- Scaffold a package from a versioned template.
- Prompt for title, audience, paper attribution/license status, Lean repository/revision/toolchain, and display mode.
- Generate placeholder manifest sections that fail validation until deliberately completed.
- Extract page blocks and PDF hashes using the existing extraction path.
- Produce an authoring report covering assets, mappings, line ranges, licenses, verification freshness, and public-release readiness.
- Launch the normal reader focused on the package for preview.
- Document the human mapping workflow with examples.
- Prove the workflow by adding a small third, clearly licensed package in a separate PR.

## Non-goals

- Automatic formalization or automatic correctness claims.
- Downloading a repository or paper without explicit user-provided sources.
- Model-generated mappings accepted without review.
- A hosted upload service.

## Template rules

The template includes:

```text
proofs/<id>/
  proof.json
  paper.pdf                 # user supplied; never fabricate
  paper.pages.json
  lean/
  verification.json
  AUTHORING.md
```

`verification.json` begins as schema-valid `not-run`. `proof.json` begins with `license.status: review-required` unless the author explicitly supplies a supported license and attribution. Generated files carry a generator schema version.

## Authoring report

```ts
type AuthoringReport = {
  proofId: string;
  schemaValid: boolean;
  releaseReady: boolean;
  errors: AuthoringFinding[];
  warnings: AuthoringFinding[];
  verificationStatus: "verified" | "failed" | "stale" | "not-run";
  rightsStatus: "cleared" | "review-required";
};
```

The report is deterministic JSON plus readable terminal output. It must never label `review-required` material release-ready.

## Safety requirements

- Reject traversal, symlink escapes, invalid IDs, and overwriting existing packages.
- Write scaffolds through a temporary directory and rename atomically.
- Do not shell-interpolate user input.
- Do not modify `registry.generated.ts` until validation succeeds.
- Preserve source files and surface conflicts rather than rewriting mathematical content.

## Acceptance criteria

- A contributor can scaffold, populate, validate, and preview a package using documented commands.
- Invalid mappings, hashes, licenses, and Lean ranges produce actionable findings.
- Re-running scaffold cannot overwrite an existing package.
- The generated package uses the generic reader without shared-component conditionals.
- CI detects stale generated registry data.
- The example third package has clear paper and Lean redistribution terms.

## Test plan

- CLI argument and ID validation.
- Temporary-directory fixtures for happy path, collision, partial failure, and symlink escape.
- Golden authoring-report fixtures.
- Registry freshness test.
- End-to-end preview smoke for the third package.

## Suggested PR split

1. CLI scaffold and tests.
2. Authoring report and registry freshness gate.
3. Documentation/template polish.
4. Third proof package created through the released workflow.
