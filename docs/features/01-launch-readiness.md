# Feature spec 01: Launch readiness

**Priority:** Release blocker

**Outcome:** A judge can open a public URL without credentials, complete the core GPT-5.6 journey, and inspect only material whose redistribution status is resolved.

## Problem

The current deployment is owner-only, and passing builds do not yet constitute a public, signed-out submission journey. User-provided papers and Lean files are temporary and are not bundled by default.

## Scope

- Resolve the public package set through one documented decision per bundled paper and Lean excerpt: permission, cleared replacement, or omission.
- Configure Sites with `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5.6`, and the existing rate-limit setting.
- Add a public-release package allowlist if some repository packages must remain private or local-only.
- Make the deployed site public only after the allowlist and license checks pass.
- Run one explicit live-model evaluation against the fixed eligible cases, followed by human scoring and checked-in sanitized results.
- Perform the signed-out launch checklist and update only claims supported by the run.
- Redeploy the exact tested `main` commit.

## Non-goals

- Changing the evaluation rubric to improve a score.
- Publishing raw prompts, selected source text, API keys, or conversation history.
- Treating a successful deployment as proof that live explanations work.
- Automatically granting redistribution rights.

## Required design

The proof library must not show a broken or unexplained missing card. If a package is excluded from public release, either omit it from the public registry or show a non-interactive, explicit “available in repository only” state. The public methodology page must show the actual reviewed run status, model, prompt version, timestamp, case count, aggregate rubric results, and limitations.

## Configuration contract

Add a build-time variable:

```text
PUBLIC_PROOF_IDS=odd-sum-square,another-cleared-proof
```

Rules:

- Missing variable means all registered packages in local development.
- Production release automation must set an explicit list.
- Unknown or duplicate IDs fail the build.
- Excluded packages are not copied to `public/proof-assets` and are absent from the runtime registry.

## Implementation work

1. Extend registry generation with an optional explicit public allowlist.
2. Ensure static PDF copying follows the filtered registry.
3. Add validation tests for unknown, duplicate, excluded, and empty public sets.
4. Configure Sites secrets without writing values into the repository.
5. Run `eval:live` only with its explicit confirmation flag and store sanitized reviewed results.
6. Update PRD/SPEC status, checklist, README URL, and submission placeholders after verification.
7. Test the production URL in a signed-out browser.

## Acceptance criteria

- Public deployment requires no ChatGPT or application login.
- Network inspection exposes no OpenAI key or hidden instruction text.
- A paper selection and Lean selection both stream a GPT-5.6 response.
- Two follow-ups preserve the original selection.
- Every visible package has resolved public redistribution status.
- Excluded package bytes are absent from the deployment archive.
- Evaluation results identify the run honestly; failures remain visible.
- All P0 checklist items have evidence or an explicit owner blocker.

## Test gate

```text
npm run proof:validate
npm run eval:validate
npm test
npm run typecheck
npm run lint
npm run build
npm run build:sites
npm run test:e2e
```

Also inspect the packaged archive, run the Wrangler route/PDF smoke, and complete the signed-out production journey manually.

## Owner inputs

- Final review of uploaded-paper licensing and attribution guidance.
- Production OpenAI key and spend limit.
- Approval to change Sites access from owner-only to public.
