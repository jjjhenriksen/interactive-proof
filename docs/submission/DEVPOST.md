# Devpost submission copy

This file is the paste-ready submission package for Interactive Proof. Replace only the bracketed launch placeholders. Do not convert a pending check into a claim until the signed-out launch checklist passes.

## Project title

Interactive Proof

## Tagline

Select the proof step that stopped you, then see how the paper, Lean, and explanation fit together.

## Category

Education

## Short description

Interactive Proof is a reading companion for machine-checked mathematics. Select a sentence or Lean declaration to get a streamed, local explanation grounded in the paper, mapped formal source, prerequisites, and recorded verification evidence.

## Long description

### The moment we are designing for

A mathematical paper can be understandable until one compressed sentence brings the whole reading session to a stop. A Lean formalization can verify the same result and still be difficult to learn from: the declaration names, library abstractions, and proof tactics do not automatically explain the mathematics. Opening a generic chat loses the reader's exact location and makes it difficult to tell source fact from interpretation.

Interactive Proof keeps that moment inside the document. A reader selects the sentence, equation, or Lean excerpt that is causing trouble and chooses **More details**, **Simpler**, **Connect to Lean**, **Where is this used?**, or **Ask in side chat**. A panel opens beside the source, shows the original excerpt and location, and streams an explanation focused on that local step.

### How it works

Each proof is a repository-owned package containing a paper, selectable page text, curated Lean source, a glossary, paper-to-Lean mappings, and a verification record. The browser sends only a bounded selection and location. The server validates that location, reloads the authoritative package, and constructs the context supplied to GPT-5.6. The model does not browse the repository or choose arbitrary files.

The interface keeps four ideas visibly separate:

- **Paper states** identifies claims grounded in the paper.
- **Lean verifies** is shown only when the package has a matching recorded build.
- **Prerequisite** introduces background needed for the selected step.
- **Generated explanation** labels the model's interpretation.

Source chips and verification badges come from validated application data, not from model-authored prose. A chip can return the reader to a paper page or mapped Lean declaration. Follow-up questions retain the original selection and use bounded recent history; if a follow-up fails, the prior answer remains on screen and can be retried.

### Two proofs, one reader

The flagship package connects a three-page cycle-double-cover note to curated Lean display excerpts. It demonstrates a genuinely difficult correspondence while being explicit that those excerpts are not a buildable local Lean project: its verification status is `not-run`.

The second package, **Why the First n Odd Numbers Sum to n²**, uses the same route, reader, schemas, mappings, and explanation flow. Its one-page paper was authored for this project under CC BY 4.0, and its complete local Lean file has a recorded passing Lean 4 build with zero `sorry` declarations. The evidence also records the theorem's declared axiom output rather than hiding it behind a generic checkmark.

### Why this belongs in Education

Interactive Proof is for a learner who can follow the broad argument but needs help at one point of compression. The product does not replace the paper, an instructor, or formal verification. It helps the learner ask a smaller and more useful question: “What is this step doing here?”

That local interaction matters for two groups at once. A mathematics learner can see how an informal claim becomes a formal declaration. A Lean learner can start from the mathematical role of unfamiliar code instead of treating a successful build as a readable explanation. Instructors and formalizers can package those connections deliberately, including partial correspondences and prerequisites, instead of relying on unrestricted retrieval.

The trust design is part of the teaching. A machine-checked declaration, a curator's paper-to-code mapping, and a generated analogy are different kinds of evidence. Interactive Proof lets a learner see those boundaries while continuing to read.

### What is implemented

- A generic Next.js proof-package reader with two packages.
- PDF.js canvas rendering with a selectable text layer.
- Curated, declaration-aware Lean views.
- A contextual selection menu for paper and code.
- Server-side deterministic context construction and request validation.
- GPT-5.6 through the OpenAI Responses API with server-sent streaming.
- Source chips, evidence labels, bounded follow-ups, retry, and cancellation states.
- Recorded Lean verification metadata and package validation.
- Unit, integration, browser, keyboard, responsive, and reduced-motion coverage.

### Boundaries

This is not an arbitrary-PDF chatbot, an automatic paper-to-Lean translator, or a theorem prover. Mappings are curated, the library contains two proof packages, and there is no in-browser Lean editor. The cycle-double-cover PDF and excerpts must not be publicly redistributed until their rights status is resolved; if permission is not confirmed before launch, the public build must omit that material or replace it with cleared content. Live explanations require a server-side OpenAI key and an available quota.

## Education impact case

**Learner:** a mathematically curious student, independent reader, or new Lean user who understands most of an argument but gets stuck on a locally compressed step.

**Current failure mode:** leaving the paper for a search or generic chatbot loses the source location; opening the formal repository introduces a second unfamiliar language; a bare “verified” badge does not teach what was checked.

**Intervention:** one selection opens a source-aware explanation beside the proof. The reader sees the paper location, mapped declaration, prerequisite context, and verification record before deciding what to trust or ask next.

**Credible near-term benefit:** fewer context switches and a shorter path from “I do not understand this sentence” to a focused question about its role. The same package can support classroom demonstration, independent study, and Lean onboarding.

**What we are not claiming:** we have not measured learning gains, retention, completion rates, or mathematical correctness across a broad corpus. The hackathon build demonstrates the interaction and its evidence boundaries; educational efficacy needs later learner studies.

## Built with

- Codex
- GPT-5.6
- OpenAI Responses API
- OpenAI JavaScript SDK
- Next.js 16
- React 19
- TypeScript
- Node.js 24
- PDF.js (`pdfjs-dist`)
- Lean 4
- Zod
- Vitest
- Playwright
- ESLint

## How Codex was used

Codex served as the repository collaborator across the build. Work began by turning the hackathon requirements and the original single-file reading room into a PRD, technical specification, and one-week delivery plan. Codex then helped implement and review the generic proof-package architecture, streamed explanation route, deterministic context boundary, second proof package, PDF.js reader, browser tests, responsive behavior, accessibility acceptance, verification tooling, and release documentation.

The workflow was concrete: give Codex the goal, relevant repository paths, constraints, and an observable definition of done; inspect the resulting diff; run package validation, unit tests, type checking, lint, production builds, and browser flows; then correct failures before accepting the change. Separate branches kept implementation tracks reviewable.

Human judgment set the educational product direction, chose the evidence distinctions, curated paper-to-Lean mappings, reviewed mathematical wording, and remains responsible for licensing and every public claim. Codex accelerated repository exploration and implementation, but it was not treated as evidence that a theorem, correspondence, deployment, or evaluation result was valid.

Required majority-core-work session: `[CODEX_FEEDBACK_SESSION_ID]`

## How GPT-5.6 is used

GPT-5.6 is the explanation engine in the running application, configured through `OPENAI_MODEL` with `gpt-5.6` as the submission default. A server-only route calls the Responses API with streaming enabled. Before the call, application code reconstructs a bounded context bundle from the registered proof package: selected source, mapped counterpart, glossary entries, prerequisites, direct dependencies, and recent conversation history.

The instructions ask GPT-5.6 to explain the selected passage locally, preserve notation, adapt depth, distinguish source claims from interpretation, cite only supplied source identifiers, and state when the available evidence is insufficient. Paper and Lean text are delimited as quoted source material rather than instructions. Model tools are disabled for the MVP.

GPT-5.6 generates the explanatory prose; it does not generate source chips, verification badges, links, or build status. Those are rendered from validated server metadata. Automated tests use deterministic fake streams and do not consume API credits. Before submission, the launch rehearsal must confirm that the deployed environment actually reports `gpt-5.6` and completes the live journey.

## Judge testing instructions

### Hosted path

1. Open `[HOSTED_URL]` in a signed-out browser window. No account should be required.
2. Choose **Cycle Double Cover**.
3. In the paper view, select text in the theorem or a mapped passage and choose **More details**.
4. Confirm that source chips appear and explanation text streams into the panel.
5. Open a paper or Lean source chip and confirm that it returns to the named source location.
6. Switch to **Lean**, select an excerpt, and choose **Connect to Lean**.
7. Ask a follow-up about the same selection; confirm that the selection context remains visible.
8. Return to the proof library and open **Odd Numbers Build Squares**.
9. Open **Verification evidence** and inspect the recorded toolchain, command, revision, build result, `sorry` count, and axiom audit.

If the cycle-double-cover package is removed from the public build for licensing, use the cleared replacement package named in the final demo and preserve the same paper-to-Lean steps.

### Local path

Use the repository's README as the source of truth. In summary: use Node 24, run `npm ci`, copy `.env.example` to `.env.local`, add a server-side `OPENAI_API_KEY`, and run `npm run dev`. The reader remains inspectable without a key, but live explanations intentionally return a configuration error.

Repository: https://github.com/jjjhenriksen/interactive-proof

## Known limitations

- Paper-to-Lean mappings are curated; the application does not discover equivalence automatically.
- The library currently contains two proof packages, not an arbitrary upload workflow.
- The cycle-double-cover package contains educational Lean excerpts and records `not-run`; it must never be presented as locally build-verified.
- The cycle-double-cover paper and excerpt redistribution status is still `review-required` and is a public-launch blocker unless resolved or replaced.
- Only the odd-sum-square package contains complete local Lean source with a recorded passing build.
- A passing Lean build verifies the formal declaration at the recorded revision; it does not independently verify the paper-to-Lean correspondence.
- Live explanation quality and latency depend on the model service and deployment quota.
- Conversations are bounded browser state; there are no accounts, saved highlights, or durable history.
- The project has not established learner-outcome metrics or broad-corpus mathematical accuracy.

## Submission links

- Hosted project: `[HOSTED_URL]`
- Source repository: https://github.com/jjjhenriksen/interactive-proof
- Public YouTube demo video: `[YOUTUBE_URL]`
- Codex `/feedback` session: `[CODEX_FEEDBACK_SESSION_ID]`
