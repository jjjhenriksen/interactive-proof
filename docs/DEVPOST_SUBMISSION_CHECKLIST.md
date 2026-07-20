# Devpost submission checklist

**Status:** Media package prepared; deployment and submission inputs remain incomplete.

Use this as the final evidence gate. Check an item only after verifying the linked artifact or public behavior.

## Submission fields

- [ ] Submission title: `Interactive Proof`
- [ ] Category: `Education`
- [ ] Devpost project URL: `TBD`
- [ ] Public demo URL: `TBD`
- [ ] Public repository URL: `https://github.com/jjjhenriksen/interactive-proof`
- [ ] Demo video URL: `TBD`
- [ ] Team member names and Devpost accounts: `TBD`
- [ ] Required Codex `/feedback` session ID: `TBD - paste exact session ID`
- [ ] Confirm current deadline, eligibility, and submission rules in Devpost immediately before submission.

## Product evidence

- [ ] Private-window visitor can open the home page without an account.
- [ ] The sample proof opens through `/proofs/[proofId]`.
- [ ] The sample paper selection opens the contextual action menu.
- [ ] A Lean declaration selection can request **Connect to Lean**.
- [ ] A GPT-5.6 response streams into the explanation panel.
- [ ] Two-turn follow-up retains the original selection.
- [ ] Source chips resolve to registered paper blocks or Lean declarations.
- [ ] Verification evidence expands and exposes revision, toolchain, command, time, exit code, sorry count, axioms, and output digest.
- [ ] Missing API configuration produces an honest error; it never shows fixture prose as a live model answer.

## Verification gate

Record the commit tested: `TBD`

```bash
npm ci
npm run proof:verify
npm run proof:validate
npm test
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
PLAYWRIGHT_SERVER=production npm run test:e2e:smoke
```

- [ ] `odd-sum-square` is `passed` at the checked-in source digest.
- [ ] Its sorry count is zero and its axiom output is visible.
- [ ] Uploaded Lean is labeled temporary and unverified; only the sample package has repository-backed verification evidence.
- [ ] Working tree is clean after regeneration.
- [ ] Hosted commit matches the tested commit.

## Licensing and safety

- [ ] Root MIT license reviewed and accepted by the project owner.
- [ ] Odd-sum paper retains CC BY 4.0 attribution in the PDF and manifest.
- [ ] Any future uploaded or bundled paper has a documented license and attribution before it is added to a public package.
- [ ] Third-party dependency notices reviewed for the deployment form.
- [ ] No API key, `.env.local`, hidden prompt, or unrelated filesystem path appears in the client bundle or network payload.
- [ ] Rate limit is configured for the public demo.

## Three-minute video outline

Use the public-safe asset and narration guidance in [`docs/submission/DEMO.md`](submission/DEMO.md). The committed media folder contains a silent key-free rehearsal, not the final live-stream evidence.

- [ ] 0:00-0:25 - The problem: one compressed step can stop a capable reader.
- [ ] 0:25-1:05 - Select paper text and use **More details**.
- [ ] 1:05-1:40 - Connect the passage to Lean and explain the trust labels.
- [ ] 1:40-2:10 - Ask a contextual follow-up.
- [ ] 2:10-2:35 - Open the upload workspace and show the temporary-paper boundary.
- [ ] 2:35-2:50 - Expand recorded verification evidence.
- [ ] 2:50-3:00 - State the Education impact and Codex/GPT-5.6 workflow.
- [ ] Voiceover is audible, captions are corrected, and video duration is under the current Devpost limit.

## Submission copy inputs

- [ ] One-sentence pitch approved.
- [ ] Problem, audience, and Education impact paragraphs approved.
- [ ] Technical implementation paragraph names PDF.js, deterministic mappings, Responses API streaming, and Lean evidence without overstating them.
- [ ] Codex-use paragraph identifies planning, implementation, testing, and verification work backed by the feedback session.
- [ ] “What is verified” language distinguishes Lean compilation from paper-to-formal correspondence.
- [ ] Screenshots show the paper selection, explanation panel, upload workspace, and verification disclosure.

## Final public smoke test

- [ ] Desktop Chromium.
- [ ] Mobile viewport at 360 px.
- [ ] Keyboard-only core journey and visible focus.
- [ ] 200% zoom without losing core actions.
- [ ] Reduced-motion preference.
- [ ] No browser console errors.
- [ ] PDF worker and fonts load from the public origin.
- [ ] One paper request, one Lean request, and one follow-up succeed under the deployed rate limit.
