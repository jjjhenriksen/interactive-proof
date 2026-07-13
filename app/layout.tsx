import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Interactive Proof",
    template: "%s | Interactive Proof",
  },
  description:
    "A reading companion for understanding mathematical papers alongside their Lean formalizations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <header className="site-header">
          <div className="site-header__inner">
            <Link className="wordmark" href="/" aria-label="Interactive Proof home">
              <span className="wordmark__mark" aria-hidden="true">
                IP
              </span>
              <span>Interactive Proof</span>
            </Link>
            <nav aria-label="Primary navigation">
              <Link className="nav-link" href="/proofs/cycle-double-cover">
                Read a proof
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="site-footer__inner">
            <p>Machine-checked sources, human-scale explanations.</p>
            <p>Built for OpenAI Build Week.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
