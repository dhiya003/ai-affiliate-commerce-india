# Architecture

## Context

Affinity India is a server-rendered Next.js application with authenticated
dashboard routes and validated server APIs. PostgreSQL is the system of record.
The web runtime is stateless; durable data, sessions, and generated content live
outside individual application instances.

## Phase 1 containers

```text
Browser
  -> Next.js web application
       -> Authentication/session service
       -> Validated application services
            -> Prisma -> PostgreSQL
            -> Scoring engine (deterministic)
            -> AI provider adapter
       -> Structured logs and error monitoring
```

## Application boundaries

- `app/`: routes, layouts, server actions, and presentation.
- `components/`: reusable UI and product-specific feature components.
- `lib/api/`: response envelopes, route guards, validation, and error mapping.
- `lib/auth/`: session, role checks, and access policy.
- `lib/ai/`: provider-neutral prompts, generation, and response parsing.
- `lib/scoring/`: pure scoring rules, explanations, and version metadata.
- `lib/db/`: Prisma client, transactions, and database error translation.
- `prisma/`: schema, migrations, and seed data.
- `tests/`: unit, integration, component, and journey tests.

Feature work may introduce these directories incrementally, but dependencies
must flow from UI/routes toward domain services and adapters. Domain scoring
code must not import framework or database modules.

## Data model direction

Core entities are User, Marketplace, Seller, Category, Product, PriceHistory,
ProductScore, GeneratedContent, PromotionStatus, Tag, and AffiliateLink.
Products use marketplace plus marketplace product ID as a natural uniqueness
boundary. Scores and generated content are append-oriented so prior decisions
remain auditable.

## Security

- Validate all untrusted input with Zod at the boundary.
- Authorize every protected page and mutation on the server.
- Keep secrets server-only and validate them at startup.
- Use parameterized ORM queries, secure cookies, CSRF-safe mutations, rate
  limits, and restrictive security headers.
- Never log access tokens, product-import files, or generated-content prompts
  containing personal data.

## Reliability

- Return a consistent success/error envelope with a request identifier.
- Make score calculations deterministic and independently testable.
- Wrap multi-record writes in transactions.
- Set timeouts on AI calls; surface retryable failures without losing user data.
- Use connection pooling and health checks for PostgreSQL.

## Deployment

Pull requests run formatting, lint, type, test, and production-build checks.
`main` is the release source. Database migrations run as an explicit deployment
step before traffic shifts to a new application version.

## Phase evolution

Phase 2 adds marketplace adapters, raw-source retention, trend signals, rules,
and compliance checks behind stable interfaces. Phase 3 adds event ingestion,
campaign analytics, background queues, learning feedback, and scheduled jobs.
