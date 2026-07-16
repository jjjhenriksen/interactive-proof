# Public launch and final-field checklist

Nothing in this checklist is complete merely because it exists in source control. Check each item against the release commit and deployed application. Record evidence beside the item when useful.

Live Devpost fields and dates were checked through the Devpost Hackathons connector on July 13, 2026. Submissions were open, and the configured deadline was July 22, 2026 at 00:00 UTC, equivalent to July 21 at 5:00 PM Pacific Time. Recheck immediately before submitting.

## Current status — July 16, 2026

**Release candidate:** `main` at `759d08a` (`Fix repository-wide autoreview findings (#19)`).

### Completed in the repository

- PRs #10–#19 are merged, including release gates, deep links, themes, guided learning, authoring tools, proof map, instructor guidance, recorded demonstrations, ephemeral uploads, and repository-wide review fixes.
- Both proof packages validate locally; `odd-sum-square` has recorded passing Lean evidence and `cycle-double-cover` remains explicitly `not-run`.
- The production allowlist is `PUBLIC_PROOF_IDS=odd-sum-square`, so unresolved cycle-double-cover material is excluded unless the owner deliberately changes that setting.
- Proof and evaluation validation, 31 unit-test files with 120 tests, typecheck, lint, Next.js build, Sites build, and the full 33-test applicable browser suite pass. Five browser cases are intentionally skipped by project configuration.
- `npm audit --omit=dev` reports zero production vulnerabilities after the reviewed dependency override.
- The MIT code license, third-party rights matrix, no-key demonstration path, evaluation methodology, Devpost copy, demo script, upload security boundary, and public setup documentation are checked in.

### Still blocking public launch

- Add `OPENAI_API_KEY` as a server-only production secret, deploy the site, and verify one real billed GPT-5.6 streamed response.
- Add provider-backed/shared production rate limiting before treating the current process-local limiter as the only abuse control.
- Record `[HOSTED_URL]`, complete signed-out deployment QA, and record the final release commit.
- Decide how judges access the currently private GitHub repository.
- Complete the demo video, Devpost owner fields, and final submission rehearsal.

## Release blockers

- [x] Resolve the cycle-double-cover paper and Lean excerpt redistribution status, or remove/replace that material in the public build. **Current mitigation:** excluded by `PUBLIC_PROOF_IDS=odd-sum-square`; do not add it back without clearance.
- [x] Merge the release documentation, accessibility acceptance, evaluation/security, deployment, and submission branches selected for release. **Evidence:** PRs #10–#19 are merged into `main`.
- [x] Run the repository's complete offline validation gate against the release commit. **Evidence:** proof/evaluation validation, 120 tests, typecheck, lint, both production builds, 33 applicable browser tests, and the production audit passed for `759d08a`.
- [ ] Deploy with `OPENAI_MODEL=gpt-5.6` and a server-only `OPENAI_API_KEY`.
- [ ] Confirm a live, billed GPT-5.6 response on the deployed application; deterministic test fixtures are not sufficient evidence.

## Signed-out public launch

Test in a fresh private window with extensions disabled and no existing app session.

- [ ] `[HOSTED_URL]` loads without authentication, invitation, VPN, or browser warning.
- [ ] The browser network panel exposes no API key, hidden system prompt, filesystem path, or private repository credential.
- [ ] Both release proof packages open from the library without a 404.
- [ ] The paper PDF and selectable text layer load from a cold cache.
- [ ] A supported paper selection opens the action menu and **More details** streams a response.
- [ ] Source chips navigate to their named paper page or Lean declaration.
- [ ] A Lean selection opens the same explanation journey.
- [ ] Two follow-ups retain the original selection; history remains bounded.
- [ ] A simulated or controlled failure preserves earlier content and exposes retry.
- [ ] Verification evidence is visible for odd-sum-square and matches the committed record.
- [ ] Cycle-double-cover displays `not-run`, never a verified badge.
- [ ] Unknown proof URLs show the designed not-found state without leaking paths.
- [ ] Mobile at 360 px uses a touch action sheet and full-height explanation sheet.
- [ ] Keyboard-only flow has visible focus, contained modal focus on mobile, Escape dismissal, and focus restoration.
- [ ] The UI remains usable at 200% browser zoom and with reduced motion enabled.
- [ ] Rate limiting has a user-readable response and does not expose server detail.
- [ ] A deliberate missing/invalid server configuration fails honestly rather than generating placeholder prose.

## PRD P0 acceptance matrix

| PRD requirement | Release evidence to inspect | Final check |
|---|---|---|
| R1 Proof-package reader | Two package cards, generic `/proofs/[proofId]` route, designed not-found state | [x] |
| R2 Selectable paper | PDF.js text selection records page-aware bounded context; oversize/blank selection rejected | [x] |
| R3 Selectable Lean source | Declaration-aware selection; excerpt-only source explicitly labeled | [x] |
| R4 Contextual action menu | Five actions, keyboard navigation, Escape, viewport positioning, mobile sheet | [x] |
| R5 Grounded explanation | Server reconstructs package context; deployed GPT-5.6 response streams; source IDs constrained | [ ] |
| R6 Trust distinctions | Paper, Lean, prerequisite, and explanation labels; insufficient-evidence behavior | [x] |
| R7 Contextual follow-up | Two follow-ups, bounded history, preserved content, retry | [x] |
| R8 Lean verification record | Odd-sum record includes revision, toolchain, command, timestamp, result, `sorry`, axioms, digest | [x] |
| R9 Public demo and local run | Signed-out URL, server-only secrets, complete README, deterministic no-key tests | [ ] |

## PRD experience and quality gates

- [x] The selected passage and source location precede generated text.
- [x] Loading, streaming, completion, insufficient evidence, failure, retry, and cancellation are understandable.
- [x] Color is not the only evidence or status cue.
- [x] The second proof requires no proof-specific branch in shared reader components.
- [x] Every displayed source chip resolves to registered package data.
- [x] Every displayed verification claim resolves to a recorded build result.
- [x] Public wording distinguishes generated explanation, curated correspondence, and machine-checked declaration.
- [x] No success target is presented as a measured result unless a checked-in evaluation artifact supports it.

## Repository and rights

- [ ] https://github.com/jjjhenriksen/interactive-proof is public while signed out, or the required judge accounts have explicit access.
- [x] The release commit contains an appropriate code license. **Evidence:** MIT `LICENSE`.
- [x] Third-party notices record the status of bundled paper and Lean assets. **Evidence:** `THIRD_PARTY_NOTICES.md`; cycle-double-cover remains `review-required` and excluded from the configured public build.
- [x] The README setup succeeds from a clean dependency install on Node 24.
- [x] `.env.example` contains names only, never a real secret.
- [x] `npm ci`, proof validation, unit tests, type checking, lint, production builds, and Playwright release flows pass for `759d08a`.
- [x] The repository contains sample proof data and lets reviewers inspect the reader without spending API credits.
- [ ] The release tag or commit SHA used for judging is recorded: ____________________.

## Demo video

- [ ] The final video follows `docs/submission/DEMO.md` and is under three minutes.
- [ ] Voiceover explains the product, how Codex was used, and how GPT-5.6 is used at runtime.
- [ ] The video demonstrates paper selection, streaming, source chips, Lean selection, a follow-up, a second proof, and verification evidence.
- [ ] The video does not imply that the cycle-double-cover excerpts have a passing local build.
- [ ] The YouTube video is public, embeddable, and playable signed out: `[YOUTUBE_URL]`.
- [ ] Title, description, captions, thumbnail, and audio have been checked after YouTube processing.

## Devpost final fields

- [ ] Field 27945, **Submitter Type**, is selected by the project owner: Individual, Team of Individuals, or Organization.
- [ ] Field 27946, **Country of Residence**, is selected by the project owner and is eligible under the official rules.
- [ ] Project title: **Interactive Proof**
- [ ] Tagline copied from `docs/submission/DEVPOST.md`.
- [ ] Field 27947, category: **Education**
- [ ] Short and long descriptions copied from `docs/submission/DEVPOST.md` without stale claims.
- [ ] Built-with list includes Codex, GPT-5.6, Responses API, and the actual shipped stack.
- [ ] Codex narrative describes repository work and human decision boundaries accurately.
- [ ] GPT-5.6 narrative matches the deployed model configuration and observed network path.
- [ ] Hosted project URL entered and opened signed out: `[HOSTED_URL]`.
- [ ] Field 27948, repository URL: https://github.com/jjjhenriksen/interactive-proof
- [ ] Demo URL entered and played from Devpost preview: `[YOUTUBE_URL]`.
- [ ] Field 27949, optional hosted judge instructions, uses the tested instructions in `docs/submission/DEVPOST.md`.
- [ ] Field 27950, majority-core-work Codex `/feedback` session ID: `[CODEX_FEEDBACK_SESSION_ID]`.
- [ ] Field 27951 is left blank because this Education project is not submitted as a plugin or developer tool.
- [ ] Testing instructions match the final release and do not direct judges to removed material.
- [ ] Known limitations include curated mappings, the two-package scope, verification boundaries, and any unresolved launch issue.
- [ ] Team/member fields, contact details, and required registration questions are complete.
- [ ] No award, user count, feedback ID, evaluation score, uptime, latency, or learning-impact claim lacks direct evidence.
- [ ] Devpost preview preserves headings, lists, links, superscript notation, and code formatting.

## Final submission rehearsal

- [ ] Recheck the live hackathon announcement and deadline before submission.
- [ ] Complete the full judge journey once on desktop and once at 360 px.
- [ ] Ask a second person to follow only the published judge instructions.
- [ ] Save screenshots of the completed Devpost fields and confirmation state.
- [ ] Submit with enough time to correct validation errors.
- [ ] After submission, reopen the project page signed out and verify every link once more.

## Inputs still required from the project owner

1. Hosted project URL: `[HOSTED_URL]`
2. Public YouTube demo URL: `[YOUTUBE_URL]`
3. Codex `/feedback` session ID covering the majority of core implementation: `[CODEX_FEEDBACK_SESSION_ID]`
4. OpenAI API key added as a server-only deployment secret; never commit it or expose it with a `NEXT_PUBLIC_` prefix.
5. GitHub judge-access decision for the currently private repository.
6. Required Devpost identity choices: Submitter Type and eligible Country of Residence.

The cycle-double-cover rights decision is no longer a blocker for the configured public build because the package is omitted from `PUBLIC_PROOF_IDS`. It becomes required again if that package is added to the deployed release.
