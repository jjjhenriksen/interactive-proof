import type { Metadata } from "next";
import Link from "next/link";

import { ThemeToggle } from "../components/theme/theme-toggle";
import "./globals.css";

const themeBootScript = `(() => { try { const saved = localStorage.getItem("interactive-proof-theme"); const preference = saved === "light" || saved === "dark" || saved === "system" ? saved : "system"; const theme = preference === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : preference; document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; } catch {} })();`;

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
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
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
              <div className="nav-links">
                <Link className="nav-link" href="/#proof-library">
                  Browse proofs
                </Link>
                <Link className="nav-link" href="/methodology">
                  Evaluation
                </Link>
                <ThemeToggle />
              </div>
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
