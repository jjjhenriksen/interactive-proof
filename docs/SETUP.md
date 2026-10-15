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

### Shared explanation quota

Production explanations require an HTTPS Redis REST endpoint supporting the
Upstash-compatible command API and atomic `EVAL`. Set these server-only secrets
through the hosting provider's secret manager (never `NEXT_PUBLIC_` variables):

```dotenv
EXPLAIN_QUOTA_REDIS_REST_URL=https://your-redis-rest-endpoint
EXPLAIN_QUOTA_REDIS_REST_TOKEN=your_server_only_token
```

Use one shared Redis database across all replicas, regions, and edge isolates;
the token must permit `EVAL`, `GET`, `INCR`, `PTTL`, and `PEXPIRE`. All instances
must use the same `EXPLAIN_RATE_LIMIT_PER_HOUR`. The two routes (`/api/explain`
and `/api/explain-upload`) consume **one combined per-identity allowance** in a
one-hour window starting at the first admitted request. An atomic Lua operation
checks/increments the counter and sets its expiry using Redis's clock. Rejected
requests do not extend the window. Quota keys use a SHA-256 identity digest under
`interactive-proof:explain:v1:`; treat these pseudonymous keys as private data.
Use a separate database for unrelated deployments. Restarts do not reset quotas;
deleting/evicting keys does, so configure Redis capacity and a no-eviction policy
accordingly. Admitted requests consume quota even if subsequent model work fails.

Only `NODE_ENV=development` or `test`, with **both** backend settings absent,
uses the process-local development limiter. It is not deployment-wide. Production
with missing settings, partial configuration in any environment, non-HTTPS URLs,
backend errors, invalid responses, or a three-second backend timeout fails closed
with HTTP 503 (`RATE_LIMIT_UNAVAILABLE`, `Retry-After: 30`) before a model call.
There is no fail-open fallback. An exhausted quota returns HTTP 429 with the
remaining-window `Retry-After`. A timed-out atomic operation may have consumed
quota even though no model call was made; retrying must check quota again.

On direct Cloudflare visitor traffic, identity is the trusted `CF-Connecting-IP`
header. A non-Cloudflare origin must prevent clients from supplying this header
(strip it at the ingress); without it, requests share one conservative anonymous
bucket. This is a per-identity abuse control, **not a total deployment spend cap**:
different identities each have their own allowance. Retain provider budget limits
for a deployment-wide monetary ceiling. Configure and smoke-test the backend
before enabling production explanations; no paid backend is provisioned by this
repository.

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

The shared-quota tests mock the REST transport for route/failure checks. To
also execute the Lua script against a disposable real Redis instance (Docker
required, no hosted account or secrets):

```bash
docker run --rm -d --name interactive-proof-quota-test redis:7-alpine
REDIS_TEST_CONTAINER=interactive-proof-quota-test npm test -- tests/explanation/shared-quota-redis.test.ts
docker stop interactive-proof-quota-test
```

This opt-in test checks 25 concurrent attempts through independent module
instances, counter expiry, denial without window extension, and missing-TTL
repair. It is skipped in the default suite without `REDIS_TEST_CONTAINER`.

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
