# Demo media

These assets were captured from the release candidate at 1440×900 unless noted otherwise.

- `interactive-proof-thumbnail.png` — generated social/YouTube thumbnail. It is a visual title card, not a screenshot of a specific proof.
- `reading-room-desktop.png` — product library and evidence-language overview.
- `odd-sum-square-desktop.png` — odd-sum-square reader with the complete verification package.
- `odd-sum-square-mobile.png` — mobile reader capture.
- `setup-docs-desktop.png` — public setup documentation page.
- `demo-rehearsal-key-free.webm` — silent rehearsal recording using the checked-in reviewed example and verification evidence. It contains no live model request and is not the final narrated submission video.
- `demo-rehearsal-key-free.mp4` — H.264 copy of the same rehearsal for editors and upload tools that do not accept WebM.

## Final recording handoff

After deploying with a server-side `OPENAI_API_KEY`, record the live version using `docs/submission/DEMO.md`. Replace the key-free rehearsal with a narrated capture that visibly includes:

1. a real streamed GPT-5.6 explanation;
2. one source-chip navigation;
3. a Lean selection and follow-up;
4. the second proof and its passing verification evidence; and
5. the Codex/GPT-5.6 role distinction.

Do not show `.env.local`, the API key, private tabs, local filesystem paths, or the cycle-double-cover package as build-verified.
