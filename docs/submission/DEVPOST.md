# Devpost submission copy

This file is the paste-ready submission package for Interactive Proof. Replace only the bracketed launch placeholders. Do not convert a pending check into a claim until the signed-out launch checklist passes.

## Project title

Interactive Proof

## Tagline

Select the proof step that stopped you, then see how the paper, Lean, and explanation fit together.

## Category

Education

## Short description

Interactive Proof is a reading companion for machine-checked mathematics. Select a sentence or Lean declaration to get a streamed explanation in plain language, with the paper, mapped formal source, and proof details available when you want to check them.

## Long description

### The moment we are designing for

A mathematical paper can be understandable until one compressed sentence brings the whole reading session to a stop. A Lean formalization can verify the same result and still be difficult to learn from: the declaration names, library abstractions, and proof tactics do not automatically explain the mathematics. Opening a generic chat loses the reader's exact location and makes it difficult to tell source fact from interpretation.

Interactive Proof keeps that moment inside the document. A reader selects the sentence, equation, or Lean excerpt that is causing trouble and chooses **More details**, **Explain more simply**, **Connect to Lean**, **Where is this used?**, or **Ask in side chat**. A panel opens beside the source, shows the original excerpt and location, and streams an explanation focused on that local step.

### How it works

Each proof is a repository-owned package containing a paper, selectable page text, curated Lean source, a glossary, paper-to-Lean mappings, and a verification record. The browser sends only a bounded selection and location. The server validates that location, reloads the authoritative package, and constructs the context supplied to GPT-5.6. The model does not browse the repository or choose arbitrary files.

The explanation starts in plain language and keeps the selected passage in view. A compact **Sources and formal proof** disclosure links back to the paper and Lean declaration used for the response. Verification remains a separate trust signal: a recorded Lean build checks the supplied declaration, not the entire informal-paper correspondence. Follow-up questions retain the original selection and use bounded recent history; if a follow-up fails, the prior answer remains on screen and can be retried.

### One sample, one upload workspace

The sample package connects an authored paper to a complete local Lean file with recorded proof details. The upload workspace extends the same reading flow to user-provided papers and optional Lean source while clearly labeling uploaded Lean as unverified.

The **Why the First n Odd Numbers Sum to n²** sample uses the same route, reader, schemas, mappings, and explanation flow. Its one-page paper was authored for this project under CC BY 4.0, and its complete local Lean file has a recorded passing Lean 4 build with zero `sorry` declarations. The upload workspace applies the same interaction to user-provided files without treating them as verified repository packages.

### Why this belongs in Education

Interactive Proof is for a learner who can follow the broad argument but needs help at one point of compression. The product does not replace the paper, an instructor, or formal verification. It helps the learner ask a smaller and more useful question: “What is this step doing here?”

That local interaction matters for two groups at once. A mathematics learner can see how an informal claim becomes a formal declaration. A Lean learner can start from the mathematical role of unfamiliar code instead of treating a successful build as a readable explanation. Instructors and formalizers can package those connections deliberately, including partial correspondences and prerequisites, instead of relying on unrestricted retrieval.

The trust design is part of the teaching. A machine-checked declaration, a curator's paper-to-code mapping, and a generated analogy are different kinds of evidence. Interactive Proof lets a learner see those boundaries while continuing to read.

### Inspiration

Interactive Proof is personal. I first discovered programming through Scratch, then found the elegance of mathematics and code through school mathematics and competitive programming clubs. Formal verification introduced a new language and a new kind of reading: research papers full of unfamiliar concepts, category-theoretic vocabulary, and proof steps that assumed I already knew how to ask the right question.

I was fortunate to have mentors, research projects, and a community that helped me keep learning. Many people do not. Not everyone discovers mathematics through a classroom; some arrive through research, open source, clubs, independent study, or simple curiosity. They often have no syllabus, office hours, or mentor beside them when a paper becomes opaque.

I built Interactive Proof for those learners. It provides the kind of source-aware guidance that helped me enter formal verification without replacing mathematical reasoning, teachers, or the original proof.

### What it does

Interactive Proof is an AI-powered educational companion for mathematical papers and formal proofs. Learners can upload a paper PDF and, when appropriate, a Lean proof, then select a sentence, equation, or declaration for a focused explanation based on the supplied source.

- PDF upload for mathematical papers.
- Optional Lean upload for formal-verification workflows.
- Plain-language explanations connected directly to source material.
- Interactive proof exploration with paper-to-Lean navigation.
- Context-aware follow-ups that preserve the learner's place.

The product is designed first for nontraditional learners, while also serving classrooms, educators, and researchers who want difficult proofs to become more transparent and approachable.

### How I built it

I built Interactive Proof as a solo full-stack AI application. The browser parses temporary uploads and sends only a bounded selection and nearby context. The server validates that selection against authoritative source material, reconstructs the relevant paper, Lean, glossary, prerequisite, and verification context, and streams an explanation through the OpenAI Responses API.

Every technical choice supports the same educational philosophy. I was not trying to build an AI that solves mathematics. I wanted to build one that encourages curiosity, supports independent learning, and helps someone continue reading when they reach the page that would normally make them stop.

### Challenges

The hardest design problem was balancing accessibility with mathematical rigor. Explanations need to simplify a proof step without quietly changing what it claims. Supporting papers and Lean introduced a second challenge: the formats represent mathematics differently, but learners need to move between them without losing context. The central philosophical challenge was resisting the easy path of building another system that simply answers questions. Every feature had to answer: does this help someone become a more confident learner?

### What I learned

People rarely learn difficult subjects completely alone. What mattered in my own journey was not only learning Lean or reading research papers, but having mentors and communities that made it safe to ask a small question. Building Interactive Proof taught me that educational AI earns trust through plain-language explanations, transparent interfaces, and visible connections to the original source—not through the model alone.

### What's next

I want to deepen support for proof assistants, strengthen connections between papers and formalizations, and add richer visualizations that build intuition alongside rigor. Most importantly, Interactive Proof should keep serving the people who inspired it: learners who find mathematics through a research lab, an open-source project, a club, or a single paper that sparks their curiosity.

### What is implemented

- A generic Next.js proof-package reader with one cleared sample package and a temporary upload workspace.
- PDF.js canvas rendering with a selectable text layer.
- Curated, declaration-aware Lean views.
- A contextual selection menu for paper and code.
- Server-side deterministic context construction and request validation.
- GPT-5.6 through the OpenAI Responses API with server-sent streaming.
- Source links, proof details, bounded follow-ups, retry, and cancellation states.
- Recorded Lean verification metadata and package validation.
- Unit, integration, browser, keyboard, responsive, and reduced-motion coverage.

### Boundaries

This is not an arbitrary-PDF chatbot, an automatic paper-to-Lean translator, or a theorem prover. Mappings are curated, the sample package is repository-backed, and uploaded files remain temporary rather than becoming public proof packages. Live explanations require a server-side OpenAI key and an available quota.

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

Codex served as the repository collaborator across the build. Work began by turning the hackathon requirements into a PRD, technical specification, and one-week delivery plan. Codex then helped implement and review the generic proof-package architecture, streamed explanation route, deterministic context boundary, PDF.js reader, temporary upload workspace, browser tests, responsive behavior, accessibility acceptance, verification tooling, and release documentation.

The workflow was concrete: give Codex the goal, relevant repository paths, constraints, and an observable definition of done; inspect the resulting diff; run package validation, unit tests, type checking, lint, production builds, and browser flows; then correct failures before accepting the change. Separate branches kept implementation tracks reviewable.

Human judgment set the educational product direction, chose the evidence distinctions, curated paper-to-Lean mappings, reviewed mathematical wording, and remains responsible for licensing and every public claim. Codex accelerated repository exploration and implementation, but it was not treated as evidence that a theorem, correspondence, deployment, or evaluation result was valid.

Required majority-core-work session: `[CODEX_FEEDBACK_SESSION_ID]`

## How GPT-5.6 is used

GPT-5.6 is the explanation engine in the running application, configured through `OPENAI_MODEL` with `gpt-5.6` as the submission default. A server-only route calls the Responses API with streaming enabled. Before the call, application code reconstructs a bounded context bundle from the registered proof package: selected source, mapped counterpart, glossary entries, prerequisites, direct dependencies, and recent conversation history.

The instructions ask GPT-5.6 to explain the selected passage locally, preserve notation, adapt depth, distinguish source claims from interpretation, cite only supplied source identifiers, and state when the available evidence is insufficient. Paper and Lean text are delimited as quoted source material rather than instructions. Model tools are disabled for the MVP.

GPT-5.6 generates the explanatory prose; it does not generate source chips, verification badges, links, or build status. Those are rendered from validated server metadata. Automated tests use deterministic fake streams and do not consume API credits. Before submission, the launch rehearsal must confirm that the deployed environment actually reports `gpt-5.6` and completes the live journey.

## Judge testing instructions

### Hosted path

1. Open <https://interactive-proof.jjjhenriksen.chatgpt.site/> in a signed-out browser window. No account should be required.
2. Choose **Odd Numbers Build Squares** or open the upload workspace.
3. In the paper view, select text in the theorem or a mapped passage and choose **More details**.
4. Confirm that the plain-language explanation streams into the panel, then open **Sources and formal proof** to inspect its links.
5. Open a paper or Lean source chip and confirm that it returns to the named source location.
6. Switch to **Lean**, select an excerpt, and choose **Connect to Lean**.
7. Ask a follow-up about the same selection; confirm that the selection context remains visible.
8. Return to the proof library and open **Odd Numbers Build Squares**.
9. Open **Proof details** and inspect the recorded toolchain, command, revision, build result, `sorry` count, and axiom audit.

For a user-provided paper, consent to the temporary workspace before opening files and keep the upload contents private unless the user owns the publication rights.

### Local path

Use the repository's README as the source of truth. In summary: use Node 24, run `npm ci`, copy `.env.example` to `.env.local`, add a server-side `OPENAI_API_KEY`, and run `npm run dev`. The reader remains inspectable without a key, but live explanations intentionally return a configuration error.

Repository: https://github.com/jjjhenriksen/interactive-proof

## Known limitations

- Paper-to-Lean mappings are curated; the application does not discover equivalence automatically.
- The library contains one authored proof package plus a temporary upload workflow.
- Uploaded Lean is always unverified and must not be presented as locally build-verified.
- Only the odd-sum-square package contains complete local Lean source with a recorded passing build.
- A passing Lean build verifies the formal declaration at the recorded revision; it does not independently verify the paper-to-Lean correspondence.
- Live explanation quality and latency depend on the model service and deployment quota.
- Conversations are bounded browser state; there are no accounts, saved highlights, or durable history.
- The project has not established learner-outcome metrics or broad-corpus mathematical accuracy.

## Submission links

- Hosted project: https://interactive-proof.jjjhenriksen.chatgpt.site/
- Source repository: https://github.com/jjjhenriksen/interactive-proof
- Public YouTube demo video: `[YOUTUBE_URL]`
- Codex `/feedback` session: `[CODEX_FEEDBACK_SESSION_ID]`
