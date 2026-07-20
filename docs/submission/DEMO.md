# Under-three-minute demo

Target finished length: **2:35–2:50**. Record at 1080p or higher with the browser at 100% zoom, a readable pointer, and no API keys, local paths, notifications, or private tabs visible. Capture one clean continuous upload-first journey where practical. Do not speed up the model stream so much that it looks prerecorded.

## Current public-release scope

The public demo starts with an upload workspace for user-provided papers with optional Lean source. Uploaded files are temporary, browser-parsed, and always labeled unverified. The repository's cleared proof fixture is not part of the public starting flow.

The key-free rehearsal and static captures are in [`docs/submission/media/`](media/README.md). They are preparation assets, not evidence of a deployed live GPT-5.6 stream.

## Voiceover script

**0:00–0:12 — Opening**

“This is Interactive Proof, an upload-first companion for mathematical papers and their Lean formalizations. It is for the moment when most of a proof makes sense, but one compressed step stops you.”

**0:12–0:34 — Upload and select**

“I upload a paper, give consent for the temporary workspace, and select the passage where I am actually reading instead of moving the question into a separate chat.”

**0:34–0:58 — More details and streaming**

“I choose More details. The source context appears first, then GPT-5.6 streams an explanation focused on this selection. The model receives a bounded bundle assembled by the server from this upload; it does not browse arbitrary files or the repository.”

**0:58–1:16 — Source details**

“The answer starts in plain English. When I want to check it, I can open Sources and formal proof to return to the exact paper passage and Lean declaration used for this explanation.”

**1:16–1:40 — Optional Lean**

“If I have Lean, I can add it to the same temporary workspace. The UI remains explicit that uploaded Lean is source text, not a verification result.”

**1:40–1:56 — Follow-up**

“Now I can ask a follow-up without losing the original declaration or location. Recent history is bounded, and a failed request preserves the answer already on screen so it can be retried.”

**1:56–2:18 — Clear and retry**

“The workspace is temporary by design. I can clear the files and start with another paper without adding anything to the repository.”

**2:18–2:36 — Boundaries**

“The app explains the material I provide; it does not prove a theorem or translate a paper automatically. Uploaded Lean stays unverified, and the response is bounded by the selected passage and nearby context.”

**2:36–2:48 — Codex and close**

“I used Codex as a repository collaborator for architecture, implementation, testing, accessibility, proof-package validation, and release checks. Human review remained responsible for the educational design, mathematical correspondence, licensing, and every claim you see here. Interactive Proof helps a learner keep reading, one difficult step at a time.”

## Shot-by-shot capture plan

| Time | Picture | Required visible evidence | Capture note |
|---|---|---|---|
| 0:00–0:12 | Homepage, then open Upload a paper | Upload-first CTA and project name | Start from `https://interactive-proof.jjjhenriksen.chatgpt.site/` in a signed-out window. |
| 0:12–0:34 | Upload workspace | Temporary consent, rendered PDF, and selected passage | Use a short supported selection with clear highlight. |
| 0:34–0:58 | Context menu, click **More details**, panel opens | Selection menu, immediate source context, visibly streaming answer | Rehearse on the deployed model; do not substitute a fixture in the submission video. |
| 0:58–1:16 | Explanation panel | Plain-language answer and source disclosure | Open the disclosure to show what shaped the response. |
| 1:16–1:40 | Optional Lean upload | Uploaded Lean source labeled unverified | Add a small `.lean` file and show the explicit status. |
| 1:40–1:56 | Follow-up input | Original selected excerpt/location and completed follow-up | Ask one short question whose answer fits on screen. |
| 1:56–2:18 | Clear workspace | Temporary file boundary and reset | Clear the workspace and show the empty state. |
| 2:18–2:36 | Boundaries | Uploaded Lean remains unverified; bounded context | Keep the wording explicit and learner-facing. |
| 2:36–2:48 | Return to calm reader view | Source, explanation, and evidence visible together | End on the product, not a slide of logos. |

## Recording rehearsal

- [ ] The capture is less than 3:00 after YouTube processing.
- [ ] Audio explicitly says both **Codex** and **GPT-5.6** and explains their different roles.
- [ ] The paper heading selection is visibly real.
- [ ] The model answer visibly streams from the deployed application.
- [ ] The source disclosure is opened.
- [ ] Optional Lean upload and one follow-up are shown.
- [ ] The upload workspace is shown with its temporary and unverified boundary.
- [ ] The temporary boundary is legible and no private file path appears.
- [ ] No invented score, learner metric, award, private URL, API key, or session ID appears.
- [ ] Captions have been reviewed for mathematical notation and the name “Lean.”
- [ ] The final YouTube video is public and works while signed out: `[YOUTUBE_URL]`.
