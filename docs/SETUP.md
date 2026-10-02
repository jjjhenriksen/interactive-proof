# Setup and operator guide

This guide explains the upload-first reading experience and the optional internal fixture tooling. You can open the temporary upload workspace before configuring any secret; curated proof data is retained for deterministic tests and verification, not as a public reading-room catalogue.

The same guidance is published in the application at `/docs`.

The current public demo is [interactive-proof.jjjhenriksen.chatgpt.site](https://interactive-proof.jjjhenriksen.chatgpt.site/). Use the local setup below when you want to run the reader against your own environment.

## Local setup

Requirements:

- Node.js 24
- npm
- Chromium only for browser tests
- Lean via elan, with the toolchain pinned in `proofs/odd-sum-square/lean-toolchain`, for the compiler regression tests in `npm test` and for regenerating verification evidence. The application itself does not require Lean.

Install and start the application:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000/upload>. The empty `OPENAI_API_KEY` is intentional: file parsing and the temporary reading workspace remain usable, while a live explanation request fails with an explicit configuration error.

## Enable live explanations

Edit `.env.local` and set:

```dotenv
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6
EXPLAIN_RATE_LIMIT_PER_HOUR=30
PUBLIC_PROOF_IDS=odd-sum-square
```

Restart the development server after changing environment variables.

Security rules:

- Keep `OPENAI_API_KEY` server-side.
- Never commit `.env.local` or paste the key into source code.
- Never use a `NEXT_PUBLIC_` prefix for the key.
- Use the deployment provider's secret manager for hosted environments.
- Treat `PUBLIC_PROOF_IDS` as an explicit internal-fixture allowlist. It does not make a proof package the public entry flow.

## Bring your own paper and Lean

Open `/upload` and provide:

- one PDF paper; and
- optionally, individual `.lean` files or a ZIP containing Lean sources.

The browser parses these files into a temporary workspace. They are not added to the repository or any curated proof registry. Only a selected passage and bounded nearby context are sent when the reader explicitly requests an explanation. Uploaded Lean is always presented as unverified.

Permanent, curated proof packages use the authoring workflow documented in the root README. Before redistributing outside material, record its license and attribution in `THIRD_PARTY_NOTICES.md`.

## Deployment configuration

Configure `OPENAI_API_KEY` as a server-only secret. Configure `OPENAI_MODEL`, `EXPLAIN_RATE_LIMIT_PER_HOUR`, and `PUBLIC_PROOF_IDS` as production environment variables, then deploy a newly saved version.

Do not treat the current process-local request limiter as a globally shared quota across Cloudflare isolates. Use a provider-backed rate-limit binding or shared durable store before relying on it as the only production abuse control.

## Validation gate

Run these checks before deployment:

```bash
npm run proof:validate
npm run eval:validate
npm test
npm run typecheck
npm run lint
npm run build
npm run build:sites
npm audit --omit=dev
```

For the browser suite:

```bash
npx playwright install chromium
npm run test:e2e
```

The release check intentionally requires production configuration:

```bash
npm run release:check
```

After deployment, verify the signed-out journey described in `docs/submission/DEVPOST.md`, and record the hosted URL and release commit there before submission.
