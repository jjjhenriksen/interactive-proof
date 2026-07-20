# Feature spec 07: Honest demonstration mode

**Priority:** P1 release resilience

**Outcome:** Reviewers can inspect representative completed interactions without API spend or network availability, while the UI makes clear that the content is a recorded fixture rather than a live GPT-5.6 response.

## Scope

- Add checked-in recorded explanation fixtures for a small set of exact selections and modes.
- Validate fixtures against the same request, public context, source IDs, prompt version, and response rendering contract used by live requests.
- Offer “View recorded example” only when an exact matching fixture exists.
- Keep live explanation as the primary action when the deployment is configured.
- Add a repository-only or explicitly enabled demo transport for deterministic video rehearsal.

## Non-goals

- Silently falling back from failed live GPT calls to recorded output.
- Presenting recorded content as current model output.
- Caching arbitrary user questions or production conversations.
- Shipping a broad canned-answer database.

## Fixture contract

```ts
type RecordedExplanation = {
  schemaVersion: 1;
  id: string;
  proofId: string;
  requestFingerprint: string;
  promptVersion: string;
  model: string;
  recordedAt: string;
  reviewedBy: string;
  selection: PublicContext["selection"];
  sources: PublicSource[];
  verification: VerificationSummary;
  answer: string;
  suggestions: FollowUpSuggestion[];
};
```

The fingerprint is derived from canonical proof ID, location, selected text, mode, depth, package revision, and prompt version. It contains no secret. A mismatch marks the fixture stale and prevents display.

## UX behavior

- Recorded mode carries a persistent “Recorded example” badge and recording metadata.
- The panel explains that no model request is being made.
- Live errors remain errors and retain retry; they never auto-switch modes.
- Source chips and verification evidence are reconstructed from current validated package data, then compared with fixture metadata.
- Follow-up suggestions may demonstrate UI but must not accept free-form continuation unless using the live endpoint.

## Security and privacy

- Fixtures contain only repository-owned or redistribution-cleared source excerpts.
- No API keys, raw prompts, private questions, request headers, or user identifiers.
- Fixture creation is an explicit local command and requires reviewer metadata.
- Production enablement is an explicit environment flag.

## Acceptance criteria

- A reviewer without an API key can open at least one paper and one Lean recorded example.
- Every recorded answer is visibly distinct from live generation.
- Stale or mismatched fixtures fail validation and are not offered.
- A live request failure never substitutes recorded content.
- Recorded examples preserve source navigation, trust labels, accessibility, and responsive behavior.

## Test plan

- Fingerprint stability and staleness tests.
- Fixture schema, attribution, and allowed-source validation.
- Browser coverage for no-key recorded flow, live/recorded distinction, stale fixture omission, and failure non-fallback.
- Archive inspection confirming only approved fixtures and public package content ship.

## Dependency

If guided learning lands first, fixtures include structured suggestions. Otherwise make suggestions optional in schema version 1 and migrate once the guided-learning contract is stable.
