# Affinity India

AI-assisted affiliate commerce intelligence for Indian creators and operators.
Affinity India ranks products from Amazon, Flipkart, Meesho, Myntra, and AJIO,
explains each opportunity, generates promotion-ready content, and records what
was promoted.

## Product status

Phase 1 is live privately while its external launch gates remain under active
configuration. The locked first release covers:

- secure sign-in and role-aware access;
- a responsive dashboard of today's best product opportunities;
- manual and CSV product intake;
- explainable, versioned opportunity scoring;
- AI-generated hooks, reel scripts, captions, hashtags, and CTAs;
- approve, reject, and promoted workflow states; and
- a production deployment with automated quality checks.

Live marketplace ingestion, policy intelligence, tracking, and optimization are
delivered incrementally in Phases 2 and 3. Phase 2 now includes the policy
centre, normalized ingestion control plane, five marketplace adapter contracts,
trend/scoring v2, compliance, evidence-aware recommendations, saved/comparison
workspaces, and source-health alerts. Partner transports remain disabled until
approved marketplace access is configured. See
[Phase 2 progress](docs/PHASE2_PROGRESS.md),
[Phase 2 release audit](docs/PHASE2_RELEASE_AUDIT.md),
[Product scope](docs/PRODUCT.md), and [Architecture](docs/ARCHITECTURE.md).

Operators should follow [Administrator onboarding](docs/ADMIN_ONBOARDING.md)
and the evidence-based [Phase 1 launch checklist](docs/PHASE1_LAUNCH_CHECKLIST.md).
The latest reproducible runtime results are recorded in
[Phase 1 verification evidence](docs/PHASE1_VERIFICATION_EVIDENCE.md).

## Technology

- Next.js 16, React 19, and strict TypeScript
- Tailwind CSS
- PostgreSQL and Prisma as the production system-of-record architecture
- D1 and Drizzle for durable storage in the current private Sites release
- Zod for boundary and environment validation
- Redacted structured Worker logs with an optional HTTPS error-monitoring webhook
- Node's test runner for domain, migration, authentication, and render checks
- GitHub Actions for lint, type, test, and build gates
- Sites-compatible Cloudflare runtime for the web application

## Local development

Requirements: Node.js 22.13 or later and PostgreSQL 16 or later.

```bash
cp .env.example .env.local
npm install
npm run dev
```

The application validates environment variables at startup. Do not commit local
secrets.

`OPENAI_API_KEY` enables OpenAI structured content generation. Without a key,
the application uses its conservative built-in launch generator so the complete
Phase 1 workflow remains testable; saved records identify which provider and
prompt version produced each bundle.

`ERROR_MONITORING_WEBHOOK_URL` optionally delivers bounded operational error
events to an HTTPS monitoring endpoint. `ERROR_MONITORING_TOKEN` adds bearer
authentication. Delivery has a three-second timeout, cannot fail a user
request, and never includes prompts, tokens, emails, cookies, or exception
messages. Structured Worker logs remain the fallback when no endpoint is
configured.

## Quality commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Containerized edge runtime

The application container runs the same built vinext worker used by Sites,
applies forward-only D1 migrations, and persists local data in a named volume.

```bash
docker compose up --build
```

In another terminal, verify the read-only runtime or the complete disposable
workflow:

```bash
npm run verify:core
ALLOW_VERIFY_MUTATIONS=true npm run verify:core
```

The mutating verifier creates a uniquely identified temporary product, scores
it, generates content, moves it through Reviewed, Approved, and Promoted, then
deletes it in a `finally` cleanup. Run it only against an environment where this
explicit mutation is acceptable.

To start the optional PostgreSQL 16 development target alongside the edge
runtime:

```bash
docker compose --profile postgres up --build
```

## Repository workflow

`main` is protected and always releasable. Work on short-lived branches named
`feat/...`, `fix/...`, `docs/...`, or `chore/...`; open a pull request; and merge
only after required checks and review pass. Full details are in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Security

Do not report security issues in public issues. Follow
[SECURITY.md](SECURITY.md) for private reporting and supported-version policy.

## License

Proprietary. All rights reserved.
