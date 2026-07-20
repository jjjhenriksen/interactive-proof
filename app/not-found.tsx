import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found" id="main-content">
      <div className="not-found__content">
        <p className="eyebrow">Page not found</p>
        <h1>Start with a paper of your own.</h1>
        <p>
          Upload a paper to open a temporary workspace and ask about the step that
          stopped your reading.
        </p>
        <Link className="button button--primary" href="/upload">
          Upload a paper
        </Link>
      </div>
    </main>
  );
}
