import type { Metadata } from "next";
import Link from "next/link";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Set up Interactive Proof, understand its source details, and bring your own paper and optional Lean source.",
};

const CONTENTS = [
  { href: "#first-read", label: "Start reading" },
  { href: "#your-material", label: "Use your material" },
  { href: "#api-key", label: "Enable AI explanations" },
  { href: "#evidence", label: "Understand source details" },
  { href: "#local-development", label: "Run locally" },
] as const;

export default function DocumentationPage() {
  return (
    <main className={styles.page} id="main-content">
      <div className={`page-shell ${styles.shell}`}>
        <header className={styles.hero}>
          <p className="eyebrow">Documentation</p>
          <h1>From paper to a clear explanation.</h1>
          <p className={styles.lede}>
            Interactive Proof is useful before an API key is configured. Begin with a
            recorded example, inspect the paper-to-Lean correspondence, or open a
            temporary workspace with your own files. Add a server-side key only when
            you are ready to request live explanations.
          </p>
          <div className={styles.actions}>
            <Link className="button button--primary" href="/#proof-library">
              Read a sample proof
            </Link>
            <Link className="button button--secondary" href="/upload">
              Open an upload workspace
            </Link>
          </div>
        </header>

        <div className={styles.layout}>
          <aside className={styles.contents} aria-labelledby="contents-title">
            <p id="contents-title" className={styles.contentsTitle}>
              On this page
            </p>
            <nav aria-label="Documentation sections">
              <ol>
                {CONTENTS.map((item, index) => (
                  <li key={item.href}>
                    <a href={item.href}>
                      <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className={styles.article}>
            <section id="first-read" aria-labelledby="first-read-title">
              <p className={styles.sectionNumber}>01</p>
              <h2 id="first-read-title">Start with a proof already in the reading room.</h2>
              <p>
                Choose a sample proof, switch between the paper and Lean views, and
                inspect its proof map and proof details. Recorded examples show
                the complete explanation interface without making a model request.
              </p>
              <ol className={styles.steps}>
                <li>Select a sentence, equation, or Lean declaration.</li>
                <li>Choose an action such as More details or Connect to Lean.</li>
                <li>Open the source disclosure to return to the exact paper or Lean location.</li>
                <li>Open the proof details when you want to confirm how the formal result was checked.</li>
              </ol>
            </section>

            <section id="your-material" aria-labelledby="your-material-title">
              <p className={styles.sectionNumber}>02</p>
              <h2 id="your-material-title">Use a paper of your own.</h2>
              <p>
                The upload workspace requires a PDF and accepts optional individual
                <code>.lean</code> files or a ZIP of Lean sources. Files are parsed in
                your browser and are not added to the public proof library.
              </p>
              <div className={styles.note}>
                <strong>Temporary by design.</strong>
                <p>
                  Only the selected passage and bounded nearby context are sent when you
                  explicitly request an explanation. Uploaded Lean is labeled unverified.
                </p>
              </div>
              <Link className={styles.textLink} href="/upload">
                Review the upload consent and limits <span aria-hidden="true">→</span>
              </Link>
            </section>

            <section id="api-key" aria-labelledby="api-key-title">
              <p className={styles.sectionNumber}>03</p>
              <h2 id="api-key-title">Enable live AI explanations.</h2>
              <p>
                Keep the OpenAI key on the server. Never paste it into browser code,
                commit it to Git, or give it a <code>NEXT_PUBLIC_</code> prefix.
              </p>
              <h3>Local development</h3>
              <pre className={styles.codeBlock} aria-label="Local environment setup">
                <code>{`cp .env.example .env.local
# Edit .env.local and set:
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6
npm run dev`}</code>
              </pre>
              <p>
                Restart the development server after changing environment variables.
                Without a key, the reader remains available and explanation requests
                return an explicit configuration error.
              </p>
              <h3>Hosted deployment</h3>
              <p>
                Add <code>OPENAI_API_KEY</code> using the host&apos;s secret manager. Add
                <code>OPENAI_MODEL</code>, <code>EXPLAIN_RATE_LIMIT_PER_HOUR</code>, and
                an explicit <code>PUBLIC_PROOF_IDS</code> allowlist as environment
                variables, then deploy a new version. The public demo currently uses
                the GPT-5.6 deployment configuration.
              </p>
            </section>

            <section id="evidence" aria-labelledby="evidence-title">
              <p className={styles.sectionNumber}>04</p>
              <h2 id="evidence-title">Know what each source detail means.</h2>
              <dl className={styles.evidenceList}>
                <div>
                  <dt>From the paper</dt>
                  <dd>This is the passage or claim selected from the paper.</dd>
                </div>
                <div>
                  <dt>From the formal proof</dt>
                  <dd>This points to the Lean declaration used for the formal check.</dd>
                </div>
                <div>
                  <dt>Helpful background</dt>
                  <dd>A short definition or reminder that makes this step easier to follow.</dd>
                </div>
                <div>
                  <dt>In plain English</dt>
                  <dd>A focused explanation of the selected passage, with notation added only as needed.</dd>
                </div>
              </dl>
              <p>
                The explanation starts with the idea. The source details stay available
                when you want to check the exact paper passage or formal declaration.
              </p>
              <Link className={styles.textLink} href="/methodology">
                Read the evaluation and security methodology <span aria-hidden="true">→</span>
              </Link>
            </section>

            <section id="local-development" aria-labelledby="local-development-title">
              <p className={styles.sectionNumber}>05</p>
              <h2 id="local-development-title">Run and verify the project locally.</h2>
              <pre className={styles.codeBlock} aria-label="Local project commands">
                <code>{`npm ci
cp .env.example .env.local
npm run dev

# Before opening a pull request
npm run proof:validate
npm run eval:validate
npm test
npm run typecheck
npm run lint
npm run build`}</code>
              </pre>
              <p>
                Node.js 24 is required. Chromium is needed only for browser tests, and
                Lean is needed only when regenerating the proof check for a full
                local proof package.
              </p>
            </section>
          </article>
        </div>
      </div>
    </main>
  );
}
