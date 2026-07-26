# Phase 1 verification evidence

Last updated: 26 July 2026

## Container runtime

- `docker compose config --quiet` passed.
- `docker compose build app` completed from a clean Node 22 base image.
- Both forward-only D1 migrations applied successfully on first boot.
- A subsequent boot reported no pending migrations.
- The container health check reached `healthy` on local port 3100.
- The Workers compatibility date is pinned to `2026-05-22`, the newest date
  supported by the bundled local runtime used in this verification.

## Core workflow

The disposable verifier completed the following authenticated sequence against
the containerized production build:

1. dependency health returned `ok`;
2. seeded catalogue returned six products;
3. temporary product creation returned `201`;
4. opportunity score recalculation returned score version `v1.0.0`;
5. a complete affiliate content bundle was generated and persisted;
6. status advanced through Reviewed, Approved, and Promoted;
7. product detail returned all three status-history events;
8. the temporary product was deleted in cleanup; and
9. the final read-only check returned the original six-product count.

The successful final detail request used request ID
`ca613785-f258-472f-877e-92c5cbeba9ff`. The final read-only cleanup check used
request ID `7292a2a0-7cf6-4c12-98c5-3a0b69fc5438`.

## Product-detail regression

Live desktop QA of Sites version 6 found a Worker exception on
`GET /products/amazon-earbuds`. Production request and Ray ID
`a213966f1dd98007` recorded `Cannot convert undefined or null to object` while
rendering score factors. The seeded score JSON predates the complete versioned
score shape and did not include `breakdown`.

The repository now normalizes incomplete legacy scores at the data boundary and
the view also treats a missing breakdown defensively. Verification against the
rebuilt production container proved:

- the unpatched container reproduced the exact `Object.entries` failure and
  returned `500`;
- the patched container returned `200` for the same authenticated product route;
- the rendered HTML contained the product name, opportunity score, Rating, and
  Review volume factors; and
- all 28 repository checks passed, including a regression assertion for the
  compatibility path.

Production verification of the corrected Sites release remains required after
deployment.

## Dependency security

- Next.js was upgraded from 16.2.6 to 16.2.12.
- Patched PostCSS 8.5.18, Sharp 0.35.0, and Effect 3.20.0 resolutions are
  enforced.
- `npm audit --omit=dev --audit-level=high` reports zero production
  vulnerabilities.

This evidence covers the reproducible local edge runtime. Browser-specific,
custom-domain, external-provider, managed-PostgreSQL, and public GitHub release
checks remain separate launch gates.
