import Link from "next/link";

import { listProofIds, loadProofPackage } from "../lib/proof-packages/registry.server";
import { verificationStatus } from "../lib/verification/audit";

const TRUST_LABELS = [
  {
    label: "From the paper",
    description: "The idea and wording from the original paper.",
  },
  {
    label: "From the formal proof",
    description: "The matching Lean declaration, when one is available.",
  },
  {
    label: "A helpful explanation",
    description: "A plain-language guide that connects the two without replacing either one.",
  },
] as const;

export default async function HomePage() {
  const proofs = (
    await Promise.all(listProofIds().map((id) => loadProofPackage(id)))
  ).filter((proof) => proof !== null);

  return (
    <main id="main-content">
      <section className="hero" aria-labelledby="hero-title">
        <div className="page-shell hero__grid">
          <div className="hero__copy">
            <p className="eyebrow">A reading companion for formal mathematics</p>
            <h1 id="hero-title">Stay with the proof when one step stops you.</h1>
            <p className="hero__lede">
              Highlight a sentence, equation, or Lean declaration to get a focused
              explanation in plain language, with the formal proof close by when you need it.
            </p>
            <div className="hero__actions">
              <a className="button button--primary" href="#proof-library">
                Choose a proof
                <span aria-hidden="true">→</span>
              </a>
              <a className="button button--secondary" href="#how-it-works">
                See how it works
              </a>
              <Link className="button button--secondary" href="/upload">
                Upload your own paper
              </Link>
            </div>
          </div>

          <div className="reader-preview" aria-label="Preview of the reading experience">
            <div className="reader-preview__bar">
              <span>Proof 01</span>
              <span>Paper · page 2</span>
            </div>
            <div className="reader-preview__body">
              <p className="reader-preview__kicker">The key reduction</p>
              <p className="reader-preview__passage">
                It is enough to show that the target vector lies in the image of the
                linear map <span className="selection">associated to the graph</span>.
              </p>
              <div className="selection-menu" aria-hidden="true">
                <span>More details</span>
                <span>Connect to Lean</span>
              </div>
              <aside className="explanation-preview">
                <p className="explanation-preview__label">In plain English</p>
                <p>
                  This changes the problem from finding cycles directly to solving a
                  structured linear equation. The next lemma establishes exactly when
                  that equation has a solution.
                </p>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="proof-library" id="proof-library" aria-labelledby="proof-library-title">
        <div className="page-shell">
          <div className="proof-library__heading">
            <div>
              <p className="eyebrow">The reading room</p>
              <h2 id="proof-library-title">Choose the proof that meets you where you are.</h2>
            </div>
            <p>
              Each package uses the same reader and source navigation. Only the
              mathematics changes.
            </p>
          </div>
          <div className="proof-grid">
            {proofs.map((proof) => {
              const status = verificationStatus(proof.manifest, proof.verification);
              return (
                <article className="proof-card" key={proof.manifest.id}>
                  <div className="proof-card__meta">
                    <span>{proof.paperPages.pages.length === 1 ? "1 paper page" : `${proof.paperPages.pages.length} paper pages`}</span>
                    <span>{status === "verified" ? "Formal proof checked" : `Formal proof ${status}`}</span>
                  </div>
                  <h3>{proof.manifest.shortTitle}</h3>
                  <p>{proof.manifest.summary}</p>
                  <Link href={`/proofs/${proof.manifest.id}`}>
                    Read this proof <span aria-hidden="true">→</span>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="method" id="how-it-works" aria-labelledby="method-title">
        <div className="page-shell method__grid">
          <div>
            <p className="eyebrow">How it helps</p>
            <h2 id="method-title">See the idea first. Follow it into the formal proof when you are ready.</h2>
          </div>
          <div className="trust-list">
            {TRUST_LABELS.map((item, index) => (
              <article className="trust-item" key={item.label}>
                <span className="trust-item__number" aria-hidden="true">
                  0{index + 1}
                </span>
                <div>
                  <h3>{item.label}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
