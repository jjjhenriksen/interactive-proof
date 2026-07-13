# Interactive Proof

Interactive companions that connect mathematical papers to their Lean formalizations.

## Product documents

- [`docs/PRD.md`](docs/PRD.md) — product requirements for the contextual “More details” educational experience.
- [`docs/SPEC.md`](docs/SPEC.md) — technical contract for proof packages, selection, grounded explanations, verification, and testing.
- [`PLAN.md`](PLAN.md) — one-week implementation and hackathon delivery sequence.

## Proof packages

- [`proofs/cycle-double-cover/`](proofs/cycle-double-cover/) — an interactive reconstruction of the cycle double cover argument, including its local paper PDF and a simulated Lean workspace.

Each proof currently lives in its own directory with an `index.html` entry point and any local source material it needs. This first package is the reference artifact from which reusable viewer code and a package schema can be extracted once a second proof is added.

## Run the application

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The original standalone prototype remains available at `proofs/cycle-double-cover/index.html` as a visual reference.

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
