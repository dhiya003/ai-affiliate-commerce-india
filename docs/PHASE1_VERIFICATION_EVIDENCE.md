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

The correction was released as private Sites version 7 from commit
`68f441577085eceeced5e6f73e2243d2e81328c3`. Production browser QA then proved
that:

- `/products/amazon-earbuds` renders the complete score breakdown without a
  Worker exception;
- the product catalogue and dashboard render all six products;
- the dashboard refreshes from the live API and agrees with the detail score;
- the detail, catalogue, and dashboard remain usable at a 390 by 844 mobile
  viewport; and
- the post-release error-log query contained no application errors.

The mobile detail page was also visually inspected as a full-page capture.
Controls, score bars, facts, notes, and history remained within the viewport
without overlap or horizontal clipping.

## Complete production catalogue

Private Sites version 10 was released from commit
`b8068657c434557fdd3085d268a43c128e3f7006`. Signed-in production QA proved
that:

- the live D1 migration exposes exactly 50 sample products across five
  paginated catalogue pages;
- the catalogue filter contains all seven stored categories, including
  categories that do not appear on page 1;
- filtering the later-page Accessories category returns exactly five matching
  products;
- product-media containers and missing-image fallbacks render cleanly on the
  desktop catalogue and mobile detail page;
- a newly seeded product detail renders its complete score, commission,
  workflow, facts, notes, and history without clipping at 390 by 844; and
- the post-release Worker error query contained no application exceptions.

The complete category list is fetched from the owner-visible dataset rather
than inferred from the current page. New categories created through product
intake are merged into the filter without requiring a reload.

## Dashboard discovery filters

Private Sites version 11 was released from commit
`079d06b0aef03da82f044357e08172d65315ff30`. Signed-in production QA proved
that:

- the dashboard refreshes from the live API to all 50 products;
- category, minimum-rating, minimum-price, and maximum-price filters compose
  correctly;
- Electronics, rating 4.5 or higher, and price ₹500–₹1,500 returns exactly two
  matching products;
- contradictory price bounds show the empty state and clearing the filters
  restores all 50 products;
- all controls remain usable without clipping at 390 by 844; and
- the post-release Worker error query contained no application exceptions.

## Error monitoring

The application now includes a provider-neutral operational-error adapter:

- only HTTPS destinations are accepted;
- payloads contain bounded event metadata and omit messages, stack traces,
  prompts, tokens, emails, cookies, and request bodies;
- optional bearer authentication is supported;
- delivery has a three-second timeout and cannot fail the user request;
- the health endpoint reports whether webhook delivery or Worker-log fallback
  is active; and
- automated tests prove valid delivery, invalid configuration rejection,
  redaction boundaries, and failure isolation.

The complete repository quality gate passes 38 checks after this integration,
including formatting, lint, strict type checking, the production build, and all
automated tests. Configuring a production destination and alert routing remains
an external launch gate.

## Dependency security

- Next.js was upgraded from 16.2.6 to 16.2.12.
- Patched PostCSS 8.5.18, Sharp 0.35.0, and Effect 3.20.0 resolutions are
  enforced.
- `npm audit --omit=dev --audit-level=high` reports zero production
  vulnerabilities.

## PostgreSQL 16

The production Prisma path was verified against a fresh, isolated PostgreSQL 16
database on 26 July 2026:

- `prisma migrate deploy` applied the initial migration without drift or manual
  intervention;
- the seed created one administrator, five marketplaces, five sellers, eight
  categories, 50 products, 50 price-history records, and 50 versioned scores;
- every marketplace contained exactly 10 products;
- the resulting public schema contained 45 indexes and 16 foreign keys; and
- a second seed run remained at 50 products, proving the seed is idempotent.

The disposable container, network, and test volume were removed after
verification. Provisioning the managed production PostgreSQL service and
setting its pooled and direct connection URLs remain external launch gates.

This evidence covers the reproducible local edge runtime. Browser-specific,
custom-domain, external-provider, managed-PostgreSQL, and public GitHub release
checks remain separate launch gates.
