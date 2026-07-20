# Third-party and source attribution

This file records what is known in the repository. `Review required` means that the repository does not currently contain enough evidence to assert public redistribution rights. It is not a claim that permission is unavailable.

## Proof and source artifacts

| Artifact | Location or source | Recorded author/source | License or rights status | Release action |
|---|---|---|---|---|
| Interactive Proof application code | This repository, excluding separately identified artifacts | Jacqueline Henriksen and project contributors | MIT; see `LICENSE` | Preserve the MIT notice. |
| Odd-number educational paper | `proofs/odd-sum-square/odd-sum-square-paper.pdf` | Interactive Proof Project | CC BY 4.0, stated in the PDF and package manifest | Preserve title, attribution, license name, and <https://creativecommons.org/licenses/by/4.0/>. |
| Odd-number Lean source | `proofs/odd-sum-square/lean/Main.lean` | Interactive Proof Project | Covered by the repository MIT license | Preserve the MIT notice when redistributed with the project. |

## Direct software dependencies

The lockfile is the source of truth for exact versions and transitive dependencies. The following direct-package licenses were read from the installed package metadata during release preparation; retain upstream notices when distribution requires them.

| Package | Role | Declared license |
|---|---|---|
| Next.js, React, React DOM, Zod, Vitest | Application and tests | MIT |
| OpenAI JavaScript SDK, PDF.js, Playwright, TypeScript | API transport, PDF rendering, browser tests, compiler | Apache-2.0 |

This summary is not a substitute for a complete dependency-license audit of `package-lock.json` before distributing a binary or bundled deployment.

## Generated artifacts

Generated output does not gain broader rights than its inputs. `output/pdf/odd-sum-square-paper-1.png` is a rendering of the CC BY 4.0 authored paper. Any future screenshot, excerpt, or transformed proof asset should identify its inputs and preserve their attribution requirements.
