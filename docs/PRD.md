# Product requirements document: Interactive Proof

**Status:** Working MVP; public deployment, live evaluation evidence, and submission inputs remain pending

**Target:** OpenAI Build Week 2026

**Track:** Education

**Submission deadline:** Tuesday, July 21, 2026 at 5:00 PM Pacific Time

**Product owner:** Jacqueline Henriksen

**Reference artifact:** `proofs/cycle-double-cover/index.html`

## 1. Product summary

Interactive Proof is an AI reading companion for machine-checked mathematics. A reader highlights a confusing sentence, equation, proof step, or Lean declaration and chooses **More details** to receive a local, level-appropriate explanation grounded in the original paper and its formal Lean development.

The product borrows the compact selection interaction of Codex's **More details** feature, but specializes the context and response for formal mathematics. It keeps the reader in the document, explains only the point of friction, and makes visible the difference among what the paper states, what Lean verifies, what prerequisite mathematics is being introduced, and what the model is inferring.

## 2. Problem

Mathematical papers and formal proof repositories are individually difficult to read and rarely designed to be read together. Papers compress definitions and intermediate arguments for expert audiences. Lean developments expand those arguments into unfamiliar representations, library lemmas, and implementation details. When a reader gets stuck on one local step, their available options are poor:

- leave the document and search for general background;
- ask a generic chatbot that lacks the paper and proof context;
- inspect a Lean repository without knowing which declaration corresponds to the passage;
- abandon the argument.

The resulting problem is not always that the entire paper is beyond the reader. Often one compressed sentence, equation, or formal declaration blocks otherwise meaningful progress.

## 3. Target users

### Primary user

A mathematically curious student or independent learner who can follow the broad argument but needs help with locally compressed steps, unfamiliar notation, or the relationship between prose and formal code.

### Secondary users

- A Lean learner trying to understand how informal mathematics becomes declarations and proofs.
- An instructor using a formally verified result as teaching material.
- An author or formalizer publishing an accessible companion to a paper and Lean repository.

### Not the target user this week

- A researcher asking the system to discover or prove new mathematics.
- A user expecting arbitrary PDFs to be converted automatically into verified Lean.
- A production formal-methods team needing a full Lean IDE.

## 4. Jobs to be done

When I encounter a confusing part of a mathematical paper, I want an explanation of that exact part using its nearby argument and formal counterpart, so that I can continue reading without losing my place.

When I encounter unfamiliar Lean code, I want to know what mathematical work the declaration is doing and where it appears in the paper, so that the formalization becomes a readable source rather than an opaque certificate.

When an AI explains a formal result, I want to know which statements come from the paper, which are verified by Lean, and which are explanatory interpretation, so that I can calibrate my trust.

## 5. Product principles

1. **Explain locally first.** Begin with the selected passage and its role at that point in the proof.
2. **Ground before expanding.** Use known paper locations, Lean declarations, and curated mappings before supplying general background.
3. **Separate evidence types.** Never present generated interpretation as machine verification.
4. **Keep the reader in flow.** The explanation appears beside the source and preserves the selection for follow-up.
5. **Teach at the requested depth.** Simpler explanations introduce only the prerequisites needed for the selected step.
6. **Admit missing evidence.** If the proof package cannot establish an answer, say so directly.
7. **Make verification observable.** A “verified” claim must point to a recorded Lean build, source revision, and audit result.

## 6. Goals

### Product goals

- Let a reader invoke a useful explanation directly from selected paper text or Lean code.
- Ground explanations in a deterministic proof package rather than unrestricted retrieval.
- Support contextual follow-up questions without losing the original source location.
- Demonstrate the same interaction on two proof packages.
- Deliver a coherent, accessible reading experience suitable for a public educational demo.

### Hackathon goals

- Demonstrate a non-trivial use of GPT-5.6 where long-context mathematical reasoning materially improves the product.
- Show how Codex accelerated architecture, implementation, testing, accessibility work, evaluation, and documentation.
- Provide a public hosted experience and a repository a judge can run from clear instructions.
- Make the Education-track impact case specific and credible.
- Preserve the Codex `/feedback` session ID covering the majority of core implementation.

## 7. Non-goals

- General automatic formalization.
- Autonomous theorem proving.
- A general PDF question-answering product.
- Live browser-based Lean editing or tactic execution.
- Perfect automatic paper-to-Lean alignment.
- Accounts, saved annotations, collaboration, subscriptions, or analytics dashboards.
- A large document library or vector-search infrastructure.
- Native mobile applications.

## 8. Core user journey

1. The reader opens a proof package.
2. The reader sees the paper, guided context, and mapped Lean source in one reading environment.
3. The reader selects a confusing passage.
4. A contextual menu appears beside the selection.
5. The reader chooses **More details**, **Simpler**, **Connect to Lean**, **Where is this used?**, or **Ask in side chat**.
6. The explanation panel opens with the selected excerpt, source location, and grounding chips already visible.
7. GPT-5.6 streams an explanation focused on the selection.
8. The response distinguishes paper claims, Lean-verified claims, prerequisites, and generated interpretation.
9. The reader follows a citation back to its source or asks a contextual follow-up.
10. Closing the panel returns focus to the selected passage.

## 9. Functional requirements

### P0: required for submission

#### R1. Proof-package reader

- The application loads proof content by package identifier.
- The cycle double cover package renders through the generic reader.
- A second proof package renders without changes to shared reader components.
- A missing or invalid package has a designed error state.

#### R2. Selectable paper

- The PDF is rendered with a selectable text layer.
- A valid selection records the proof ID, page, selected text, and bounded surrounding context.
- Whitespace-only and oversized selections do not trigger a model request.
- The paper remains usable when the explanation panel is open.

#### R3. Selectable Lean source

- The reader can open curated Lean files and declarations.
- A code selection records its file and containing declaration.
- The interface identifies excerpts as excerpts when full source is not bundled.

#### R4. Contextual action menu

- A compact menu appears near supported selections.
- It offers **More details**, **Simpler**, **Connect to Lean**, **Where is this used?**, and **Ask in side chat**.
- It supports keyboard navigation, visible focus, Escape dismissal, and viewport-aware positioning.
- Touch layouts use an action sheet rather than a tiny floating target.

#### R5. Grounded explanation

- The server reconstructs authoritative context from repository-owned package data.
- The configured submission model is GPT-5.6.
- The explanation streams into the panel.
- The answer addresses the selected passage rather than summarizing the entire proof.
- The answer cites only source identifiers supplied by the server.
- The interface presents source chips independently from model-authored prose.

#### R6. Trust distinctions

- Responses can visibly distinguish **Paper states**, **Lean verifies**, **Explanation**, and **Prerequisite**.
- The system never describes an explanation as formally verified.
- Missing or ambiguous paper-to-Lean correspondence is disclosed.
- Insufficient evidence produces an explicit bounded answer rather than an invented one.

#### R7. Contextual follow-up

- The reader can ask at least two follow-up questions about the same selection.
- The original selection and source location remain visible.
- Conversation history is bounded.
- A failed follow-up preserves prior content and offers retry.

#### R8. Lean verification record

- Each claimed verified package records source revision, toolchain, command, timestamp, build result, `sorry` count, and declared axioms.
- The UI links a verification claim to this evidence.
- No build status is shown unless generated from an actual run.

#### R9. Public demo and local run

- A public URL exposes the full core journey without credentials.
- API secrets remain server-side.
- The repository contains setup, environment, testing, sample-data, licensing, and troubleshooting instructions.
- A fixture or captured example allows repository reviewers to inspect the UI without spending API credits.

### P1: desirable if P0 is stable

- Explanation depth preference persists during a browser session.
- The panel suggests two context-aware follow-up actions.
- Mapped dependency navigation highlights where a declaration is used.
- The reader can copy a deep link to a paper page or Lean declaration.
- Prompt evaluation results are rendered in a small public methodology page.

### P2: post-hackathon

- Codex-assisted package authoring command.
- Automatic mapping suggestions with human approval.
- Durable saved highlights and conversations.
- Instructor-authored explanation layers.
- Live Lean language-server integration.
- Proof-package publishing and discovery.

## 10. Context and response contract

The explanation request must include only bounded selection metadata, mode, question, and recent conversation history. The server is responsible for loading:

- the selected paper page or Lean declaration;
- the explicitly mapped counterpart;
- relevant glossary entries;
- curated prerequisites;
- direct dependencies and downstream uses;
- verification metadata.

The model must treat all paper and Lean text as quoted source material, not instructions. It must preserve mathematical notation, identify uncertainty, avoid unsupported claims of equivalence, and cite only supplied source identifiers.

## 11. Experience requirements

- The primary reading surface is calm, editorial, and content-led.
- Desktop explanations open in a right panel; small screens use a full-height sheet.
- The selected passage and source location appear before generated text.
- Loading, streaming, completed, refusal, insufficient-evidence, failure, and retry states are designed.
- Page controls and action targets meet mobile touch sizing.
- The experience works at 360 px width and 200% zoom.
- All core actions are keyboard reachable, focus is visible, and focus is restored after dismissal.
- Motion respects `prefers-reduced-motion`.
- Color is not the sole indicator of evidence type or state.

## 12. Success measures

### Demo acceptance metrics

- A new reader can complete selection-to-explanation without instruction.
- First visible response state appears immediately; streamed model text begins within a practical interactive window under normal demo conditions.
- Both paper and Lean selections complete the same core journey.
- All displayed source chips resolve to real package locations.
- All displayed verification claims resolve to recorded evidence.
- The second proof requires no proof-specific conditional in shared UI components.

### Evaluation targets

Across at least 12 fixed representative selections:

- 100% of citations reference an allowed source ID.
- 100% of responses label insufficient evidence when the package cannot answer.
- At least 10 of 12 responses address the local selection and requested depth without unsupported certainty.
- No adversarial source-text instruction overrides the system behavior.
- Any failed case is documented and converted into a prompt, mapping, or UX issue before submission.

These are internal acceptance targets, not claims of general mathematical correctness.

## 13. Risks and mitigations

| Risk | Consequence | Mitigation |
|---|---|---|
| Native PDF embedding hides selections from the app | Core interaction cannot work | Render through PDF.js with a text layer. |
| Mathematical explanations hallucinate correspondence | User over-trusts the system | Deterministic mappings, constrained source IDs, trust labels, and insufficient-evidence behavior. |
| One handcrafted proof looks like a static demo | Weak implementation score | Load two packages through one schema and generic route. |
| Live Lean integration consumes the week | Missed vertical slice | Use recorded build evidence; defer live editing. |
| Model latency harms the demo | Experience feels broken | Stream responses, show source context immediately, and keep requests bounded. |
| API key or prompt leaks to the client | Security failure | Server-only route, validated input, no secret-bearing client bundle. |
| Paper or code redistribution rights are unclear | Public repository risk | Record licenses and attribution; use an authored or clearly licensed second proof. |
| Submission work is left to the deadline | Working product is not judgeable | Record demo progressively and reserve July 20–21 for packaging and submission. |

## 14. Judging-criteria alignment

### Technological Implementation

The project combines selectable PDF rendering, source-aware Lean navigation, deterministic cross-source mappings, server-side context construction, streamed GPT-5.6 explanations, trust labeling, prompt evaluation, and recorded Lean verification. The README will identify where Codex accelerated each layer and where human mathematical decisions remained necessary.

### Design

The flagship reading room already establishes the product's visual language. The implementation adds a coherent selection menu, explanation panel, evidence states, responsive behavior, accessibility, and recovery paths rather than presenting a model endpoint as a standalone chat box.

### Potential Impact

The demonstrated problem is specific: a reader who can follow most of a proof is blocked by a locally compressed step and lacks a trustworthy bridge between the paper and Lean. The product directly addresses that moment without claiming to replace authors, instructors, or formal verification.

### Quality of the Idea

The product adapts a proven “More details” interaction to a domain where contextual grounding and trust distinctions are unusually important. It demonstrates understanding of both mathematical reading and the limits of formal verification.

## 15. Submission requirements

The release checklist must include:

- Education category selection.
- Working hosted project.
- Public YouTube demo under three minutes with voiceover.
- Voiceover covering the product, Codex use, and GPT-5.6 use.
- Public repository with an appropriate license, or required private-repository access.
- README with setup, sample data, run/test instructions, and explicit Codex/GPT-5.6 workflow notes.
- Repository URL and optional hosted-test instructions.
- `/feedback` session ID for the session containing most core implementation.

The live Devpost source reported submissions open and a deadline of July 21 at 5:00 PM Pacific when this PRD was drafted on July 13, 2026. Recheck announcements and key dates before final submission.

## 16. Open product decisions

These decisions should be resolved during implementation only when they block a P0 path:

- Which small, clearly licensed theorem becomes the second proof package.
- Whether paper pages are rendered continuously or one page at a time on small screens.
- Whether the first answer uses one adaptive explanation or visibly separated evidence sections.
- Whether response history is sent manually or continued through API-managed response state.
- Whether public demo rate limiting is anonymous-IP based or protected by a lightweight shared demo quota.

None changes the core product contract.
