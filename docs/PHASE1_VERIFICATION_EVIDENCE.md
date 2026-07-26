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

## Dependency security

- Next.js was upgraded from 16.2.6 to 16.2.12.
- Patched PostCSS 8.5.18, Sharp 0.35.0, and Effect 3.20.0 resolutions are
  enforced.
- `npm audit --omit=dev --audit-level=high` reports zero production
  vulnerabilities.

This evidence covers the reproducible local edge runtime. Browser-specific,
custom-domain, external-provider, managed-PostgreSQL, and public GitHub release
checks remain separate launch gates.
