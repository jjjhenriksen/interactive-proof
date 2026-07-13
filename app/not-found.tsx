import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found" id="main-content">
      <div className="not-found__content">
        <p className="eyebrow">Proof package not found</p>
        <h1>This proof is not in the reading room.</h1>
        <p>
          The package may have moved, or its source files may not have passed validation.
        </p>
        <Link className="button button--primary" href="/">
          Return to the proof index
        </Link>
      </div>
    </main>
  );
}
