# Under-three-minute demo

Target finished length: **2:35–2:50**. Record at 1080p or higher with the browser at 100% zoom, a readable pointer, and no API keys, local paths, notifications, or private tabs visible. Capture one clean continuous journey where practical; use cuts only to remove waiting or navigate between proofs. Do not speed up the model stream so much that it looks prerecorded.

## Current public-release constraint

The current public allowlist is `PUBLIC_PROOF_IDS=odd-sum-square`. The cycle-double-cover paper and Lean excerpts remain `review-required` for redistribution, so do not record or publish them in the final public video until that rights review is resolved. The public-safe recording uses **Odd Numbers Build Squares** for the paper, Lean, live explanation, and verification shots. The cycle-double-cover flow can remain a private rehearsal only.

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

“I can make the same move from the Lean side. This code is explicitly labeled as a curated excerpt. I select the declaration and ask to connect it to the paper. The explanation starts from the mathematical job this code is doing, while the interface keeps correspondence separate from formal verification.”

**1:40–1:56 — Follow-up**

“Now I can ask a follow-up without losing the original declaration or location. Recent history is bounded, and a failed request preserves the answer already on screen so it can be retried.”

**1:56–2:18 — Second proof**

“The reader is package-driven rather than hardcoded for one result. This second proof explains why the first n odd numbers sum to n squared. It uses the same PDF reader, mappings, Lean view, and explanation flow, but at an introductory level.”

**2:18–2:36 — Verification evidence**

“Its complete Lean file has a recorded passing build with zero sorry declarations. The evidence panel shows the toolchain, command, source revision, output digest, and declared axioms. A passing build verifies that formal declaration; it does not prove that our explanatory mapping is perfect.”

**2:36–2:48 — Codex and close**

“I used Codex as a repository collaborator for architecture, implementation, testing, accessibility, proof-package validation, and release checks. Human review remained responsible for the educational design, mathematical correspondence, licensing, and every claim you see here. Interactive Proof helps a learner keep reading, one difficult step at a time.”

## Shot-by-shot capture plan

| Time | Picture | Required visible evidence | Capture note |
|---|---|---|---|
| 0:00–0:12 | Proof library, then open Odd Numbers Build Squares | Project name and the cleared public proof card | Start from `[HOSTED_URL]` in a signed-out window. |
| 0:12–0:34 | Paper view | Rendered PDF and selected induction passage | Use a short supported selection with clear highlight. |
| 0:34–0:58 | Context menu, click **More details**, panel opens | Selection menu, immediate source context, visibly streaming answer | Rehearse on the deployed model; do not substitute a fixture in the submission video. |
| 0:58–1:16 | Explanation panel | Paper, Lean, prerequisite, and generated-explanation distinctions; source-chip navigation | Click one chip and visibly land at its source before returning. |
| 1:16–1:40 | Lean tab | Explicit excerpt label, selected Lean text, **Connect to Lean**, mapped source context | Keep the declaration name readable. Never call this package build-verified. |
| 1:40–1:56 | Follow-up input | Original selected excerpt/location and completed follow-up | Ask one short question whose answer fits on screen. |
| 1:56–2:18 | Return to library, revisit Odd Numbers Build Squares | The same package through the same UI; paper and Lean tabs | Use a clean cut if package navigation consumes time. |
| 2:18–2:36 | Odd-sum verification disclosure | `passed`, Lean toolchain, command, revision, zero `sorry`, axiom audit/output digest | Scroll slowly enough for the evidence to be legible. |
| 2:36–2:48 | Return to calm reader view | Source, explanation, and evidence visible together | End on the product, not a slide of logos. |

## Recording rehearsal

- [ ] The capture is less than 3:00 after YouTube processing.
- [ ] Audio explicitly says both **Codex** and **GPT-5.6** and explains their different roles.
- [ ] The paper heading selection is visibly real.
- [ ] The model answer visibly streams from the deployed application.
- [ ] At least one source chip is followed to its destination.
- [ ] A Lean selection and one follow-up are shown.
- [ ] The second proof is opened from the same proof library.
- [ ] Verification evidence is legible and belongs to odd-sum-square.
- [ ] If a private rehearsal shows cycle-double-cover, it is described as excerpt-only and `not-run`; it is omitted from the public video unless rights are cleared.
- [ ] No invented score, learner metric, award, private URL, API key, or session ID appears.
- [ ] Captions have been reviewed for mathematical notation and the name “Lean.”
- [ ] The final YouTube video is public and works while signed out: `[YOUTUBE_URL]`.
