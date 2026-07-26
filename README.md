# Affinity India

AI-assisted affiliate commerce intelligence for Indian creators and operators.
Affinity India ranks products from Amazon, Flipkart, Meesho, Myntra, and AJIO,
explains each opportunity, generates promotion-ready content, and records what
was promoted.

## Product status

Phase 1 is under active development. The locked first release covers:

- secure sign-in and role-aware access;
- a responsive dashboard of today's best product opportunities;
- manual and CSV product intake;
- explainable, versioned opportunity scoring;
- AI-generated hooks, reel scripts, captions, hashtags, and CTAs;
- approve, reject, and promoted workflow states; and
- a production deployment with automated quality checks.

Live marketplace ingestion, policy intelligence, tracking, and optimization are
intentionally reserved for Phases 2 and 3. See [Product scope](docs/PRODUCT.md)
and [Architecture](docs/ARCHITECTURE.md).

## Technology

- Next.js 16, React 19, and strict TypeScript
- Tailwind CSS
- PostgreSQL and Prisma as the production system-of-record architecture
- D1 and Drizzle for durable storage in the current private Sites release
- Zod for boundary and environment validation
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

## Quality commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
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
