export default function ProofLoading() {
  return (
    <main className="proof-page" id="main-content" aria-busy="true">
      <div className="page-shell">
        <p className="eyebrow">Loading proof package</p>
        <div className="loading-shell" aria-label="Loading proof reader">
          <div className="skeleton skeleton--title" />
          <div className="loading-shell__grid">
            <div className="skeleton skeleton--pane" />
            <div className="skeleton skeleton--pane" />
          </div>
        </div>
      </div>
    </main>
  );
}
