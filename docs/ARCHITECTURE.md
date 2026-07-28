# Architecture

## Context

Affinity India is a server-rendered Next.js application with authenticated
dashboard routes and validated server APIs. The production data model targets
PostgreSQL through Prisma. The private Sites release uses an equivalent
Cloudflare D1 adapter through Drizzle so product and generated-content workflows
are durable in the deployed environment. The web runtime remains stateless.

## Phase 1 containers

```text
Browser
  -> Next.js web application
       -> Authentication/session service
       -> Validated application services
            -> Prisma -> PostgreSQL
            -> Drizzle -> D1 (private Sites adapter)
            -> Scoring engine (deterministic)
            -> Content provider adapter
                 -> OpenAI Responses API (when configured)
                 -> Conservative built-in launch generator
       -> Structured logs and error monitoring
       -> Policy knowledge service
            -> Dated marketplace rules and commission schedules
            -> Content, disclosure, and prohibited-practice records
            -> Administrator review history
```

## Application boundaries

- `app/`: routes, layouts, server actions, and presentation.
- `components/`: reusable UI and product-specific feature components.
- `lib/api/`: response envelopes, route guards, validation, and error mapping.
- `lib/auth/`: session, role checks, and access policy.
- `lib/content/`: provider-neutral prompts, generation, validation, response
  parsing, and generated-content persistence.
- `lib/scoring/`: pure scoring rules, explanations, and version metadata.
- `lib/policies/`: source-backed policy queries, review-state transitions, and
  append-only update-history recording.
- `lib/observability/`: redacted structured logging and isolated operational
  error delivery.
- `db/` and `drizzle/`: current Sites schema and forward-only D1 migrations.
- `lib/db/`: Prisma client, transactions, and PostgreSQL error translation.
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
- Deliver only bounded, non-sensitive operational error metadata to an optional
  HTTPS webhook. Monitoring delivery runs outside the request lifecycle, has a
  three-second timeout, and falls back to structured Worker logs.

## Deployment

Pull requests run formatting, lint, type, test, and production-build checks.
`main` is the release source. Database migrations run as an explicit deployment
step before traffic shifts to a new application version.

## Phase evolution

Phase 2 adds marketplace adapters, raw-source retention, trend signals, rules,
and compliance checks behind stable interfaces. Its first deployed slice uses
six explicit policy models, effective dates, primary-source URLs, review
statuses, and administrator-attributed state changes. Phase 3 adds event
ingestion, campaign analytics, background queues, learning feedback, and
scheduled jobs.
