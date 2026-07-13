# Interactive Proof

Interactive companions that connect mathematical papers to their Lean formalizations.

## Product documents

- [`docs/PRD.md`](docs/PRD.md) — product requirements for the contextual “More details” educational experience.
- [`docs/SPEC.md`](docs/SPEC.md) — technical contract for proof packages, selection, grounded explanations, verification, and testing.
- [`PLAN.md`](PLAN.md) — one-week implementation and hackathon delivery sequence.

## Proof packages

- [`proofs/cycle-double-cover/`](proofs/cycle-double-cover/) — an interactive reconstruction of the cycle double cover argument, including its local paper PDF and a simulated Lean workspace.

Each proof currently lives in its own directory with an `index.html` entry point and any local source material it needs. This first package is the reference artifact from which reusable viewer code and a package schema can be extracted once a second proof is added.

## Open the current example

Open `proofs/cycle-double-cover/index.html` directly in a browser. The example has no build step and keeps its PDF links relative to the package directory.
