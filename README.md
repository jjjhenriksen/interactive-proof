# Interactive Proof

Interactive companions that connect mathematical papers to their Lean formalizations.

## Product documents

- [`docs/PRD.md`](docs/PRD.md) — product requirements for the contextual “More details” educational experience.
- [`docs/SPEC.md`](docs/SPEC.md) — technical contract for proof packages, selection, grounded explanations, verification, and testing.
- [`PLAN.md`](PLAN.md) — one-week implementation and hackathon delivery sequence.

## Run the application

Use Node 24, install dependencies, and copy the environment template:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add an OpenAI API key to `.env.local`, then open
`http://localhost:3000/proofs/cycle-double-cover`. The key is used only by the
server-side `/api/explain` route. `OPENAI_MODEL` defaults to the hackathon target,
`gpt-5.6`, and can be overridden without changing source code.

Without an API key, the reader and selection tools still work, while explanation
requests show an explicit configuration error.

## Proof packages

- [`proofs/cycle-double-cover/`](proofs/cycle-double-cover/) — an interactive reconstruction of the cycle double cover argument, including its local paper PDF and a simulated Lean workspace.

Each proof lives in its own validated package directory. The generated registry
loads package metadata, extracted paper pages, curated paper-to-Lean mappings,
Lean display sources, and recorded verification facts through the same generic
reader route.

## Run the application

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add an OpenAI API key to `.env.local`, then open
`http://localhost:3000/proofs/cycle-double-cover`. The key is used only by the
server-side `/api/explain` route. `OPENAI_MODEL` defaults to the hackathon target,
`gpt-5.6`, and can be overridden without changing source code.

Without an API key, the reader and selection tools still work, while explanation
requests show an explicit configuration error.

## Validate changes

The pull-request workflow uses Node 24 and does not require an OpenAI API key. It validates proof packages, runs unit and static checks, creates a production build, and exercises the core reader journey in Chromium.

```bash
npm run proof:validate
npm test
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
PLAYWRIGHT_SERVER=production npm run test:e2e:smoke
```

Run `npm run test:e2e` to exercise all configured desktop and mobile browser projects during local development.

The original single-file reading room remains at
`proofs/cycle-double-cover/index.html` as a visual reference artifact.
