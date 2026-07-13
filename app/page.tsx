import Link from "next/link";

const TRUST_LABELS = [
  {
    label: "Paper states",
    description: "The claim as written in the source paper.",
  },
  {
    label: "Lean verifies",
    description: "The corresponding machine-checked declaration.",
  },
  {
    label: "AI explains",
    description: "A contextual interpretation, clearly identified as generated.",
  },
] as const;

export default function HomePage() {
  return (
    <main id="main-content">
      <section className="hero" aria-labelledby="hero-title">
        <div className="page-shell hero__grid">
          <div className="hero__copy">
            <p className="eyebrow">A reading companion for formal mathematics</p>
            <h1 id="hero-title">Stay with the proof when one step stops you.</h1>
            <p className="hero__lede">
              Highlight a sentence, equation, or Lean declaration to get a focused
              explanation grounded in the paper and its formal proof.
            </p>
            <div className="hero__actions">
              <Link className="button button--primary" href="/proofs/cycle-double-cover">
                Open the reader shell
                <span aria-hidden="true">→</span>
              </Link>
              <a className="button button--secondary" href="#how-it-works">
                See how it works
              </a>
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
                <p className="explanation-preview__label">AI explains</p>
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

      <section className="method" id="how-it-works" aria-labelledby="method-title">
        <div className="page-shell method__grid">
          <div>
            <p className="eyebrow">Grounded by design</p>
            <h2 id="method-title">One answer, with its kinds of evidence kept distinct.</h2>
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
