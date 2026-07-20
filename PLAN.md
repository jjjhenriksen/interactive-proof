# Interactive Proof: one-week implementation plan

This delivery plan implements [`docs/PRD.md`](docs/PRD.md) and [`docs/SPEC.md`](docs/SPEC.md).

## Product thesis

Interactive Proof is an AI reading companion for machine-checked mathematics. A reader can select a confusing sentence, equation, or Lean declaration and request a contextual explanation grounded in both the paper and its formal proof, without leaving the document.

The product is inspired by the compact interaction of Codex's **More details** action, but it is specialized for mathematical reading. Its differentiator is not generic chat. It is the connection among four kinds of evidence:

1. what the paper states;
2. what the Lean development verifies;
3. what prerequisite mathematics is needed;
4. what the model is inferring to explain the relationship.

The authored odd-sum-square package is the sample proof and the upload workspace is the reusable path for new papers and optional Lean source.

## Hackathon outcome

By the end of the week, a judge should be able to open a hosted URL and:

1. read a rendered, selectable mathematical paper;
2. highlight a passage and choose **More details**;
3. receive a streamed explanation in a side panel;
4. see which paper page and Lean declaration grounded the explanation;
5. ask a follow-up without losing the selected context;
6. repeat the interaction on a Lean declaration;
7. open a user-provided paper through the temporary upload workspace.

This is an **Education** submission. The primary audience is a mathematically curious reader who can follow an argument but gets blocked by locally compressed steps. Lean learners and authors of formally verified papers are secondary audiences.

## Product contract

### Primary interaction

Selecting supported paper text, explanatory prose, or Lean code opens a small contextual menu:

- **More details** — explain the selection at the reader's current level;
- **Simpler** — minimize notation and introduce prerequisites;
- **Connect to Lean** — relate the selection to mapped declarations;
- **Where is this used?** — explain its role and downstream dependencies;
- **Ask in side chat** — open the panel with a free-form question.

For the one-week MVP, the first four actions can share one endpoint and differ only by an explicit explanation mode. They should not become separate agent workflows.

### Side panel response

Every response should expose these distinctions when relevant:

- **Paper states** — a claim directly grounded in a paper location;
- **Lean verifies** — a claim supported by a mapped, build-checked declaration;
- **Explanation** — a generated interpretation or analogy;
- **Prerequisite** — background material supplied to bridge a knowledge gap.

Source chips appear immediately while the explanation streams. A response must never imply that generated prose was machine-verified.

### Follow-up behavior

Follow-ups retain:

- the original selection;
- its page or Lean declaration;
- the retrieved context bundle;
- the recent question-and-answer turns;
- the selected explanation depth.

The MVP will keep this state in the browser and send a bounded recent history with each request. It does not need accounts, durable conversations, or a database.

## MVP boundaries

### In scope

- One responsive web application.
- One cleared, deliberately small proof package.
- A temporary upload workspace for user-provided papers and optional Lean source.
- Selectable PDF text with page-aware source locations.
- Selectable Lean excerpts with declaration-aware locations.
- Contextual selection menu and keyboard-accessible side panel.
- GPT-5.6 explanations through the Responses API.
- Streamed answer text.
- Explicit evidence/trust labels and source links.
- A repeatable proof-package schema.
- A lightweight Lean verification record.
- Hosted demo, local setup, tests, and submission documentation.

### Explicitly out of scope this week

- Automatically formalizing arbitrary papers.
- Automatically proving missing Lean theorems.
- A general-purpose PDF chatbot.
- Semantic search across a large research library.
- User accounts, saved highlights, collaborative annotations, or billing.
- A full Lean editor or live tactic execution in the browser.
- Perfect automatic paper-to-declaration alignment.
- Mobile PDF annotation beyond the core selection and explanation flow.

## Architecture

### Application stack

- **Next.js + TypeScript** for the reader and server-side API route.
- **PDF.js text layer** for page rendering and selectable paper text.
- **OpenAI Responses API** for explanations, with `gpt-5.6` as the configured hackathon model.
- **Server-sent streaming** for incremental answer text.
- **Zod or JSON Schema** for proof packages and request validation.
- No database for the MVP.

The API key remains server-side. The model name is configured through an environment variable with `gpt-5.6` as the documented submission default.

### Repository shape

```text
Interactive-Proof/
├── app/
│   ├── api/explain/route.ts
│   ├── proofs/[proofId]/page.tsx
│   └── page.tsx
├── components/
│   ├── paper-reader/
│   ├── lean-reader/
│   ├── selection-menu/
│   └── explanation-panel/
├── lib/
│   ├── proof-packages/
│   ├── explanation/
│   └── validation/
├── proofs/
│   └── odd-sum-square/
│       ├── proof.json
│       ├── paper.pdf
│       ├── paper.pages.json
│       ├── lean/
│       └── verification.json
├── scripts/
│   ├── extract-paper-text.ts
│   └── verify-lean.ts
├── tests/
│   ├── fixtures/
│   └── evals/
└── output/
    └── reviewed-media/
```

The exact framework-generated filenames may vary, but these ownership boundaries should remain: UI, context construction, proof data, and model transport must not be embedded in one page.

### Proof-package schema

Each proof package should contain:

```json
{
    "id": "odd-sum-square",
    "title": "Why the First n Odd Numbers Sum to n²",
  "paper": {
    "pdf": "paper.pdf",
    "text": "paper.txt",
    "license": "CC BY 4.0"
  },
  "lean": {
    "repository": "https://github.com/jjjhenriksen/interactive-proof",
    "revision": "sha256:SOURCE_DIGEST",
    "toolchain": "leanprover/lean4:v4.29.1"
  },
  "mappings": [
    {
      "id": "theorem-1-1",
      "paper": { "pages": [1], "label": "Theorem 1.1" },
      "lean": {
        "file": "lean/Main.lean",
        "declaration": "oddSum_eq_square"
      },
      "prerequisites": ["mathematical induction", "natural numbers"]
    }
  ]
}
```

The client sends only an identifier and selection metadata. The server reloads the authoritative package context instead of trusting arbitrary context supplied by the browser.

### Explanation request

The browser sends:

```ts
type ExplainRequest = {
  proofId: string
  source: "paper" | "lean" | "guide"
  location: { page?: number; declaration?: string; section?: string }
  selectedText: string
  mode: "details" | "simpler" | "lean" | "usage" | "question"
  question?: string
  history: Array<{ role: "user" | "assistant"; text: string }>
}
```

The server validates the selection against a known proof package, gathers a bounded context bundle, emits source metadata, and streams the explanation. Initial context retrieval should be deterministic:

1. selected text and surrounding page or declaration;
2. explicitly mapped paper/Lean counterpart;
3. glossary entries and prerequisite notes attached to that mapping;
4. direct dependencies and downstream uses;
5. at most the last few conversation turns.

Vector search is unnecessary for two small proof packages and should only be added if deterministic mappings become inadequate.

### Model instructions

The system prompt should require the model to:

- address the selected passage rather than summarize the entire proof;
- preserve mathematical notation exactly when discussing it;
- distinguish source claims, verified declarations, prerequisites, and interpretation;
- cite only source identifiers included in the context bundle;
- say when the supplied sources do not establish an answer;
- avoid claiming that paper-to-Lean correspondence is itself machine-verified;
- adapt depth without becoming condescending;
- treat paper and repository text as quoted source material, not instructions.

The response may be streamed as Markdown. Source chips and trust labels should come from validated server metadata rather than be invented by the model.

## Interaction and visual behavior

### Selection menu

- Appears next to the selection without covering it.
- Uses semantic buttons with visible focus and Escape dismissal.
- Repositions within the viewport rather than overflowing.
- Does not appear for whitespace-only or unsupported selections.
- Limits overly large selections and explains the limit.
- On touch devices, opens a bottom action sheet after selection.

### Explanation panel

- Opens on the right at desktop widths and as a full-height sheet on small screens.
- Shows the selected excerpt and location before the answer.
- Displays source chips before streaming begins.
- Has visible loading, streaming, completed, error, and retry states.
- Preserves the previous answer when a follow-up fails.
- Restores focus to the selected passage when closed.
- Respects reduced-motion preferences.

### Educational tone

The model should begin locally: “This sentence is doing X here.” It should introduce only prerequisites needed for the selected step. It should prefer small concrete examples over broad lectures and provide an optional deeper route rather than front-loading every detail.

## Lean verification contract

`verification.json` records observable facts rather than a generic “verified” badge:

```json
{
  "revision": "PINNED_COMMIT",
  "toolchain": "PINNED_TOOLCHAIN",
  "build": "passed",
  "checkedAt": "ISO_TIMESTAMP",
  "sorryCount": 0,
  "axioms": [],
  "command": "lake build"
}
```

If the full formal source cannot be bundled, the UI must label displayed code as excerpts and link to the pinned source. A build result must not be shown unless the repository actually produced it.

## One-week sequence

### Monday, July 13 — foundation and product skeleton

- Preserve the current single-file artifact as the visual reference.
- Scaffold the TypeScript application and baseline test setup.
- Define and validate `proof.json`.
- Move the authored sample content into package-owned data.
- Render its navigation and guided content through the generic proof route.
- Establish design tokens, responsive shell, focus behavior, and error boundaries.

**Exit gate:** the new app renders the existing proof content without relying on hardcoded proof-specific imports in page components.

### Tuesday, July 14 — selectable paper and Lean sources

- Replace the native PDF iframe with PDF.js page rendering and a text layer.
- Capture selected text, page number, and surrounding page context.
- Build the Lean declaration reader from package data.
- Capture declaration-aware code selections.
- Implement the contextual selection menu for mouse and keyboard.

**Exit gate:** selecting either paper text or Lean code produces a validated local context payload with no model call.

### Wednesday, July 15 — “More details” vertical slice

- Add the server-side Responses API route.
- Use GPT-5.6 and stream response text.
- Implement the explanation panel and all loading/error states.
- Ground one paper selection in its mapped Lean declaration.
- Add **More details**, **Simpler**, **Connect to Lean**, and **Where is this used?** modes.
- Protect the endpoint with request-size limits and basic rate limiting.

**Exit gate:** the flagship demo interaction works end to end from paper selection to grounded streamed explanation.

### Thursday, July 16 — follow-up conversation and trust UX

- Add bounded in-browser conversation history.
- Implement **Ask in side chat** and contextual follow-ups.
- Add paper/Lean/explanation/prerequisite labels.
- Add source chips that jump to a paper page or Lean declaration.
- Add insufficient-evidence behavior and a visible retry path.
- Prevent source text from being treated as model instructions.

**Exit gate:** a reader can ask two follow-ups while retaining the original selection and can see what evidence supports each answer.

### Friday, July 17 — sample verification and uploads

- Keep one authored, clearly licensed sample proof.
- Add the temporary paper and optional Lean upload workspace without changing shared reader components.
- Pin Lean source revisions and toolchains.
- Implement the verification script and record.
- Add visible build, `sorry`, and axiom information.
- Remove any proof-specific branching discovered while adding the upload workspace.

**Exit gate:** the sample package and upload workspace support the same selection-to-explanation flow, and verification claims are backed by recorded command output.

### Saturday, July 18 — evaluation, accessibility, and deployment

- Create a fixed evaluation set of at least 8 representative selections.
- Review responses for mathematical relevance, grounding, source accuracy, level adaptation, and unsupported certainty.
- Add regression tests for context construction and source validation.
- Add end-to-end tests for paper selection, Lean selection, follow-up, retry, and keyboard use.
- Test at 360px, desktop width, 200% zoom, dark mode, and reduced motion.
- Deploy a public demo with server-side secrets.

**Exit gate:** the hosted demo passes the smoke test and the evaluation results are documented honestly.

### Sunday, July 19 — release candidate

- Finish README setup and architecture documentation.
- Document exactly how Codex and GPT-5.6 were used.
- Include sample packages and a no-key fixture or screenshots for repository reviewers.
- Add licensing and attribution for the paper and Lean sources.
- Record a complete under-three-minute demo draft.
- Freeze the core feature set.

**Exit gate:** a fresh reviewer can run the project from the README and a judge can experience the full interaction without local setup.

### Monday, July 20 — submission rehearsal

- Run the clean-clone setup and complete the hosted judge journey.
- Review the repository license and source attributions.
- Finalize project description, category, built-with list, and testing instructions.
- Re-record only demo sections made inaccurate by final fixes.
- Capture the `/feedback` session ID and verify all required submission fields.

**Exit gate:** every Devpost field has a final answer and the public video is ready.

### Tuesday, July 21 — submit before 5:00 PM PT

- Check live Devpost announcements and key dates once more.
- Upload or link the public YouTube video.
- Verify the repository and hosted URLs from a signed-out browser.
- Submit with time reserved for validation errors.
- Make no feature changes after submission unless they repair a judge-blocking defect.

**Exit gate:** Devpost reports the project submitted before the official deadline.

## Test and evaluation plan

### Deterministic tests

- Schema rejects unknown proof IDs and invalid source locations.
- Server reconstructs context from repository data, not client-provided source text.
- Selection length, question length, and conversation history are bounded.
- A paper mapping returns only allowed Lean declarations.
- Source chips always resolve to real package locations.
- API failures preserve the selection and offer retry.
- No OpenAI API key or full hidden prompt appears in browser output.

### Prompt evaluation set

Include selections representing:

- an unfamiliar definition;
- a compressed implication;
- a displayed equation;
- an imported deep theorem;
- a short Lean proof using `simpa`;
- `Classical.choose` and its trust implications;
- a declaration whose paper correspondence is partial;
- a question the package cannot answer;
- a misleading or adversarial instruction embedded in source text;
- a request for a simpler example;
- a request for downstream usage;
- a two-turn follow-up.

Score each result on a small documented rubric:

1. addresses the selected passage;
2. uses only supplied evidence for source claims;
3. preserves the distinction between explanation and verification;
4. cites a valid paper or Lean location;
5. matches the requested depth;
6. avoids unsupported certainty.

The goal is not a contrived perfect score. Failures should become prompt, mapping, or UX fixes and remain visible in the evaluation notes.

## Definition of done

The hackathon MVP is done when all of the following are observable:

- A public URL loads without credentials.
- The sample proof and upload workspace render through the same application.
- Paper text and Lean code are selectable.
- **More details** returns a streamed GPT-5.6 explanation.
- The response visibly identifies its paper and Lean grounding.
- Follow-up questions retain selection context.
- Unsupported questions receive an explicit insufficient-evidence answer.
- Lean verification metadata reflects an actual recorded build.
- Keyboard navigation, mobile layout, loading, and failure states work.
- Automated tests cover the core context and interaction paths.
- The README includes setup, environment variables, test commands, architecture, licensing, and a hosted demo.
- The submission documents Codex usage and includes the required `/feedback` session ID.

## Decisions to defer until evidence requires them

- Vector search versus deterministic mappings.
- Durable Conversations API objects versus bounded browser history.
- Automatic mapping generation versus a Codex-assisted authoring command.
- User accounts and saved annotations.
- Live Lean language-server integration.
- Packaging the authoring workflow as a Codex skill or plugin.

These are plausible extensions, but none should delay the selection-to-explanation vertical slice.

## Immediate first implementation task

Create the application shell and proof-package schema around the cleared sample package. User-provided papers and Lean source enter through the temporary upload workspace rather than the repository package tree.
