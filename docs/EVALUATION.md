# Evaluation and security methodology

Interactive Proof evaluates whether an explanation helps a reader resume a local proof while remaining honest about its evidence. It does not evaluate whether a model can solve arbitrary mathematics, and a good score is not a claim of mathematical correctness beyond the supplied package.

## Fixed set

`evals/cases.json` contains 13 versioned cases for the authored sample package and upload-safe context boundary. The set covers paper and Lean selections, all supported explanation depths, unfamiliar definitions, compressed reasoning, equations, theorem boundaries, simplification, correspondence limits, downstream usage, a two-turn follow-up, insufficient evidence, invalid citations, and an adversarial source-text instruction.

The adversarial source case is synthetic and offline-only. It tests that malicious text remains inside the serialized source-data section and never becomes a model instruction. CI validates every other case against repository-owned source locations and allowed source IDs.

## Human scoring rubric

Each live response receives 0, 1, or 2 points for each criterion:

1. **Locality:** addresses the selected passage rather than replacing it with a proof summary.
2. **Grounding:** uses only supplied evidence for claims attributed to the paper or Lean.
3. **Trust distinction:** distinguishes generated explanation, prerequisite knowledge, paper claims, and Lean verification.
4. **Citation validity:** cites only source identifiers in the server-provided allowed list.
5. **Requested depth:** follows the selected details, simpler, Lean, usage, or follow-up mode.
6. **Calibrated certainty:** identifies partial correspondence and missing evidence instead of guessing.

`0` means absent or contradicted, `1` means partially satisfied, and `2` means clearly satisfied. A reviewer records notes for failures before aggregate results are published. Citation validity and security probes are also checked deterministically; those checks do not replace human review.

## Deterministic offline validation

Run:

```bash
npm run eval:validate
```

This command requires no API key. It validates the case and result schemas, minimum coverage, supported modes, authoritative source locations, exact allowed-source sets, context budgets, prompt-injection boundaries, and the invalid-citation probe. Unit tests cover the same contracts and the 12,000-character combined history cap.

## Optional live run

Live evaluation is deliberately excluded from CI. To run it explicitly:

```bash
OPENAI_API_KEY=... npm run eval:live -- --confirm-live
OPENAI_API_KEY=... npm run eval:live -- --confirm-live --case paper-unfamiliar-recursive-definition
```

The command uses the same context builder and OpenAI streaming transport as the application with `store: false` and no tools. Responses are printed for human review but not written to disk. The generated `output/evals/live-summary-*.json` contains only case IDs, model and prompt versions, timestamps, response hashes and lengths, token usage, and citation IDs. It contains no API key, source text, user question, full prompt, conversation history, or model response.

The checked-in `evals/results.json` changes only after a reviewer completes and documents a live run. Until then the public page says `not run` and publishes no score.

## Interpretation limits

- The set is small and project-specific; it does not measure general theorem-proving ability.
- The proof-package mappings are human-curated and may themselves need revision.
- Citation checks establish identifier validity, not that every sentence is perfectly entailed.
- A Lean build validates a formal declaration, not the faithfulness of its informal-paper correspondence.
- Synthetic injection tests cover the documented boundary but are not a complete security audit.
