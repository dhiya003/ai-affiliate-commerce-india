# Phase 3 progress

Last updated: 29 July 2026

Phase 3 turns verified product recommendations into measurable campaigns,
publication records, affiliate attribution, experiments, feedback, and
automation. This document records only capabilities proven by repository or
runtime evidence.

## Campaign and promotion foundation

- [x] Durable creator-account model with owner, platform, handle, external
      identifier, and active status.
- [x] Durable campaign model with owner, creator account, name, objective,
      channel, start/end dates, INR budget, lifecycle status, notes, template
      label, duplication lineage, and archive timestamp.
- [x] Durable promotion model linking campaign, product, generated content, and
      content variation.
- [x] Promotion schedule, publication timestamp, published URL, and lifecycle
      status.
- [x] Owner-scoped campaign create and list APIs with Zod request validation.
- [x] Campaign search and status/channel filtering.
- [x] Campaign duplication copies the campaign plan and its non-archived
      promotions as new planned records.
- [x] Campaign archiving is recoverable and does not delete performance
      lineage.
- [x] Signed-in campaign operations interface at `/campaigns`.
- [x] Campaign navigation from the main dashboard.

## Affiliate tracking and experimentation data foundation

- [x] Content-variation model for hook, caption, CTA, hashtag set, audience
      angle, length, tone, platform, winner state, and archival.
- [x] Tracked-link model with unique tracking ID, unique short path,
      marketplace destination, campaign, product, promotion, and content
      variation lineage.
- [x] Click-event model with timestamp, traffic source, device type, optional
      permitted region, bot flag, duplicate flag, privacy-preserving
      fingerprint hash, and suspicious-click reason.
- [x] Conversion-event model with link/click lineage, marketplace, hashed
      external order identity, status, value, currency, and import timestamp.
- [x] Commission-event model with conversion lineage, marketplace, amount,
      currency, status, observed time, approval time, and import time.
- [x] Owner and time indexes for campaign, promotion, tracked-link, conversion,
      and commission queries.
- [x] No raw external order identifier is stored by the attribution models.

## Validation evidence

- The forward-only D1 migration creates eight Phase 3 tables, at least 27
  indexes, and the expected campaign/promotion and tracking foreign keys after
  every Phase 1 and Phase 2 migration.
- A fresh PostgreSQL 16 database applied all seven repository migrations
  without manual intervention.
- PostgreSQL schema evidence contains eight Phase 3 tables, 16 foreign keys,
  and 35 indexes.
- The existing 50-product seed applied twice after the Phase 3 migration
  without count drift.
- Campaign validators reject reversed date ranges, invalid budgets, unsupported
  lifecycle actions, and unbounded filters.
- Campaign repository and API tests verify owner-scoped reads and mutations,
  authenticated identity, and server-side validation.
- The complete repository quality gate passes 88 checks, including formatting,
  lint, strict type checks, the production build, migration execution, schema
  privacy invariants, and all prior Phase 1 and Phase 2 coverage.

## Measurable affiliate tracking workflow

- [x] Owner-scoped promotion creation links campaign, product, generated
      content, optional content variation, schedule, publication evidence, and
      tracked destination.
- [x] Tracked destinations require HTTPS and the exact product marketplace
      domain.
- [x] Public short-link redirect records a click before returning a no-store,
      no-referrer redirect to the validated marketplace destination.
- [x] Clicks retain only a daily one-way fingerprint hash; raw connecting IPs
      are never stored.
- [x] Mobile, tablet, desktop, other, and unknown device classification.
- [x] Bounded traffic-source hostname and permitted country-code capture.
- [x] Bot, 30-minute duplicate, and high-velocity suspicious-click
      classification.
- [x] Administrator-only conversion and commission batch import with a
      250-record limit.
- [x] External order identifiers are hashed with owner and marketplace context
      before storage.
- [x] Re-imported conversions update lifecycle status without duplicating the
      order, and commission observations are idempotent by conversion, status,
      and observed time.

## Performance dashboard

- [x] Signed-in performance workspace at `/performance`.
- [x] Date-range filtering with a default 30-day window.
- [x] Verified clicks exclude bot and duplicate events.
- [x] Conversion totals include confirmed, shipped, and delivered orders.
- [x] Commission totals include approved and paid observations.
- [x] Conversion rate and earnings per verified click.
- [x] Daily, marketplace, campaign, and product breakdowns.
- [x] Pre-aggregated event streams prevent click/conversion joins from
      multiplying commission totals.
- [x] Click-through rate remains explicitly unproven until a connected creator
      platform supplies impression data.
- [x] Performance navigation from the main dashboard.

## Tracking and performance validation evidence

- Tests cover promotion publication invariants, exact marketplace destination
  domains, device/bot/referrer classification, privacy-safe redirects, bounded
  imports, lifecycle states, owner scoping, date ranges, and aggregation shape.
- The production build contains campaign promotion, public tracked redirect,
  performance read, attribution import, and signed-in dashboard routes.
- The complete repository quality gate passes 88 checks.

## Next Phase 3 slice

The next target is content experimentation and recommendation feedback:
variation creation, A/B test setup, winner selection, feedback capture, and
performance-derived learning inputs. The current tracking workflow is
production-shaped but remains empty until operator-owned campaigns receive
real traffic and approved attribution imports.

## Release

Phase 3 has not been deployed. Its source remains local pending completed
tracking workflows, production verification, and explicit owner approval.
