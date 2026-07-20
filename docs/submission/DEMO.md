# Under-three-minute demo

Target finished length: **2:35–2:50**. Record at 1080p or higher with the browser at 100% zoom, a readable pointer, and no API keys, local paths, notifications, or private tabs visible. Capture one clean continuous journey where practical; use cuts only to remove waiting or navigate between the sample proof and upload workspace. Do not speed up the model stream so much that it looks prerecorded.

## Current public-release scope

The public demo contains the cleared **Odd Numbers Build Squares** sample package and an upload workspace for user-provided papers with optional Lean source. Uploaded files are temporary, browser-parsed, and always labeled unverified.

The key-free rehearsal and static captures are in [`docs/submission/media/`](media/README.md). They are preparation assets, not evidence of a deployed live GPT-5.6 stream.

## Voiceover script

**0:00–0:12 — Opening**

“This is Interactive Proof, a reading companion for mathematical papers and their Lean formalizations. It is for the moment when most of a proof makes sense, but one compressed step stops you.”

**0:12–0:34 — Select the paper heading**

“Here is the odd-numbers package. The paper is rendered with a selectable text layer, so I can highlight the induction step where I am actually reading instead of moving the question into a separate chat.”

**0:34–0:58 — More details and streaming**

“I choose More details. The source context appears first, then GPT-5.6 streams an explanation focused on this selection. The model receives a bounded bundle assembled by the server from this proof package; it does not browse the repository or choose its own evidence.”

**0:58–1:16 — Source and trust chips**

“These chips are application data, not model prose. They separate what the paper states, the mapped Lean source, prerequisite background, and generated explanation. Following a chip takes me back to the exact source.”

**1:16–1:40 — Lean selection**

“I can make the same move from the Lean side. The sample declaration is a complete local file with recorded verification evidence. For an uploaded file, the same UI remains explicit that the source is temporary and unverified.”

**1:40–1:56 — Follow-up**

“Now I can ask a follow-up without losing the original declaration or location. Recent history is bounded, and a failed request preserves the answer already on screen so it can be retried.”

**1:56–2:18 — Upload workspace**

“The reader is package-driven rather than hardcoded for one result. I can also open the upload workspace, add a paper and optional Lean source, and inspect them temporarily without adding the files to the repository.”

**2:18–2:36 — Verification evidence**

“Its complete Lean file has a recorded passing build with zero sorry declarations. The evidence panel shows the toolchain, command, source revision, output digest, and declared axioms. A passing build verifies that formal declaration; it does not prove that our explanatory mapping is perfect.”

**2:36–2:48 — Codex and close**

“I used Codex as a repository collaborator for architecture, implementation, testing, accessibility, proof-package validation, and release checks. Human review remained responsible for the educational design, mathematical correspondence, licensing, and every claim you see here. Interactive Proof helps a learner keep reading, one difficult step at a time.”

## Shot-by-shot capture plan

| Time | Picture | Required visible evidence | Capture note |
|---|---|---|---|
| 0:00–0:12 | Proof library, then open Odd Numbers Build Squares | Project name and the cleared public proof card | Start from `https://interactive-proof.jjjhenriksen.chatgpt.site/` in a signed-out window. |
| 0:12–0:34 | Paper view | Rendered PDF and selected induction passage | Use a short supported selection with clear highlight. |
| 0:34–0:58 | Context menu, click **More details**, panel opens | Selection menu, immediate source context, visibly streaming answer | Rehearse on the deployed model; do not substitute a fixture in the submission video. |
| 0:58–1:16 | Explanation panel | Paper, Lean, prerequisite, and generated-explanation distinctions; source-chip navigation | Click one chip and visibly land at its source before returning. |
| 1:16–1:40 | Lean tab | Selected declaration, **Connect to Lean**, mapped source context | Keep the declaration name readable; uploaded Lean remains unverified. |
| 1:40–1:56 | Follow-up input | Original selected excerpt/location and completed follow-up | Ask one short question whose answer fits on screen. |
| 1:56–2:18 | Upload workspace | Temporary paper preview and optional Lean file | Do not show private filesystem paths or upload contents that are not yours to publish. |
| 2:18–2:36 | Odd-sum verification disclosure | `passed`, Lean toolchain, command, revision, zero `sorry`, axiom audit/output digest | Scroll slowly enough for the evidence to be legible. |
| 2:36–2:48 | Return to calm reader view | Source, explanation, and evidence visible together | End on the product, not a slide of logos. |

## Recording rehearsal

- [ ] The capture is less than 3:00 after YouTube processing.
- [ ] Audio explicitly says both **Codex** and **GPT-5.6** and explains their different roles.
- [ ] The paper heading selection is visibly real.
- [ ] The model answer visibly streams from the deployed application.
- [ ] At least one source chip is followed to its destination.
- [ ] A Lean selection and one follow-up are shown.
- [ ] The upload workspace is shown with its temporary and unverified boundary.
- [ ] Verification evidence is legible and belongs to odd-sum-square.
- [ ] No invented score, learner metric, award, private URL, API key, or session ID appears.
- [ ] Captions have been reviewed for mathematical notation and the name “Lean.”
- [ ] The final YouTube video is public and works while signed out: `[YOUTUBE_URL]`.
