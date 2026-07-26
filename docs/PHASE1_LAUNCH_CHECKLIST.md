# Phase 1 launch checklist

This checklist is the release gate for the locked Phase 1 workflow. A checked
item means the repository and private Sites release contain verifiable evidence;
external integrations remain unchecked until their production state is proven.

## Product workflow

- [x] ChatGPT sign-in, sign-out, protected pages, and protected APIs.
- [x] Seeded dashboard across Amazon, Flipkart, Meesho, Myntra, and AJIO.
- [x] Searchable and filterable product catalogue with pagination.
- [x] Manual creation, CSV import validation, editing, and deletion.
- [x] New, Reviewed, Approved, Rejected, and Promoted status history.
- [x] Versioned opportunity score, explanation, recalculation, and tests.
- [x] Complete content bundle generation, regeneration, persistence, and copy
      controls.

## Security and reliability

- [x] Zod validation and consistent API error envelopes with request IDs.
- [x] Owner-scoped product data and generated content.
- [x] Redacted structured logs without prompts, tokens, emails, or cookies.
- [x] Database health endpoint and no-store API responses.
- [x] CSP, HSTS on HTTPS, content-type, permissions, and referrer headers.
- [x] Forward-only D1 migrations packaged with the deployed build.
- [x] Formatting, lint, strict type checks, automated tests, and production build.
- [x] Containerized edge build, automatic local migrations, health check, and
      disposable core-workflow verification.
- [x] Prisma migration and idempotent 50-product seed verified on PostgreSQL 16.
- [x] Production dependency audit reports zero high-severity vulnerabilities.
- [ ] External error-monitoring destination and alert routing configured.

## Production configuration

- [x] Owner-only production deployment with HTTPS.
- [x] Durable Sites D1 database binding and migrations.
- [x] Built-in launch content generator available without external credentials.
- [ ] `OPENAI_API_KEY` stored in Sites and the OpenAI provider path smoke-tested.
- [ ] Managed PostgreSQL instance provisioned and `DATABASE_URL` configured.
- [ ] Custom production domain selected, configured, and verified.
- [ ] External GitHub repository created and protected CI checks observed.

## Manual release verification

- [ ] Administrator completes the onboarding workflow on desktop.
- [ ] Administrator repeats the core workflow at a mobile viewport.
- [ ] Chrome, Safari, Firefox, and Edge smoke tests complete.
- [ ] Live marketplace facts and affiliate disclosures reviewed before the first
      real promotion.
- [ ] Owner records release approval with date, tester, and request IDs from any
      defects investigated.

See [Phase 1 verification evidence](PHASE1_VERIFICATION_EVIDENCE.md) for the
latest automated runtime results.

Do not declare the complete Phase 1 launch finished while any required external
or manual verification item above remains unchecked.
