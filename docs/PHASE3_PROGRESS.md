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
- [x] Durable experiment, assigned-variation, immutable result-snapshot,
      recommendation-feedback, learning-profile, scoring-weight-version, and
      recommendation-quality-snapshot models.

## Validation evidence

- The forward-only D1 migration creates eight Phase 3 tables, at least 27
  indexes, and the expected campaign/promotion and tracking foreign keys after
  every Phase 1 and Phase 2 migration.
- A fresh PostgreSQL 16 database applied all eight repository migrations
  without manual intervention.
- PostgreSQL experiment and learning evidence contains seven additional tables,
  10 foreign keys, and 23 indexes.
- The existing 50-product seed applied twice after the Phase 3 migration
  without count drift.
- Campaign validators reject reversed date ranges, invalid budgets, unsupported
  lifecycle actions, and unbounded filters.
- Campaign repository and API tests verify owner-scoped reads and mutations,
  authenticated identity, and server-side validation.
- The complete repository quality gate passes 117 checks, including formatting,
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
- The complete repository quality gate passes 117 checks.

## Content experiments and learning

- [x] Signed-in experiment and learning workspace at `/experiments`.
- [x] Owner-scoped content-variation creation and listing.
- [x] A/B and multivariate test setup with two to five unique variations and
      allocation that must total exactly 100 percent.
- [x] Draft, running, completed, and archived experiment lifecycle.
- [x] Immutable performance snapshots derived from verified clicks, accepted
      conversions, and approved or paid commission.
- [x] Explicit winner selection blocked below the configured confidence
      threshold.
- [x] Winner and loser state retained on the tested creative records.
- [x] Recommendation feedback captures approved, rejected, promoted, skipped,
      successful, and unsuccessful decisions with bounded audience, timing, and
      reason context.
- [x] Administrator-only learning refresh over a bounded evidence window.
- [x] Learning profiles summarize marketplace, category, price band, commission
      band, creator, audience, hook, CTA, caption tone, season, and festival.
- [x] Event streams are pre-aggregated before joining so click, conversion, and
      commission evidence is not multiplied.
- [x] The interface states that profiles are evidence summaries and never
      silently change production scoring weights.

The confidence calculation is a two-proportion normal approximation over
conversion outcomes. Metrics such as clicks, commission, and earnings per click
remain visible result measures, but a winner is not presented as statistically
proven without conversion evidence.

## Experiment and learning validation evidence

- D1 migrations execute from the Phase 1 base through the experiment and
  learning foundation in an in-memory SQLite verifier.
- A disposable PostgreSQL 16 instance applied all eight migrations and the
  50-product seed twice without count drift.
- Tests cover creative-content requirements, unique variations, exact traffic
  allocation, confidence behavior, winner gating, bounded feedback, the
  default 90-day evidence window, learning dimensions, owner scoping, and
  administrator-only refresh.
- The production build includes all four experiment/learning APIs and the
  signed-in workspace.
- The complete repository quality gate passes 117 checks.

## Governed scoring optimization

- [x] Versioned factor, marketplace, and category scoring-weight configuration.
- [x] Semantic version, normalized factor total, multiplier bounds, evidence
      range, observation count, and explanation validation.
- [x] Administrator-only draft creation, activation, and rollback APIs.
- [x] Draft quality backtesting over historical factor breakdowns and linked
      recommendation outcomes without changing live scores.
- [x] Recommendation-quality snapshots for approval, promotion, successful
      outcome, commission, evidence count, and confidence.
- [x] Activation requires a matching quality snapshot, at least 20 evaluated
      recommendations, at least 30 percent evidence confidence, and no more than
      10 percent composite degradation against the active baseline.
- [x] One-step rollback restores the prior active version and records rollback
      time.
- [x] Active factor and marketplace/category multipliers are applied by new
      evidence-backed scoring runs.
- [x] New opportunity-score evidence records the exact active model version.
- [x] Administrator workspace at `/optimization` exposes drafts, evidence,
      activation state, and rollback.

No automatic process can activate scoring weights. Scheduled retraining may
prepare a draft and quality evidence, but administrator activation remains a
separate explicit action.

## Scoring-governance validation evidence

- Validators reject malformed versions, non-normalized factors, out-of-range
  marketplace/category multipliers, and reversed evidence windows.
- Tests prove active factor weights change calculated contributions and persist
  their model version in score output.
- Repository tests cover the quality, sample-size, confidence, baseline,
  degradation, and rollback gates.
- The production build includes the administrator workspace and all three
  scoring-governance API routes.
- The complete repository quality gate passes 117 checks.

## Scheduled automation control plane

- [x] Durable automation-job, run, retry-lineage, and bounded processing-log
      models in D1 and PostgreSQL.
- [x] Nine seeded schedules for product ingestion, price refresh, availability
      refresh, trend refresh, score recalculation, top-10 generation, content
      generation, compliance checks, and governed score retraining.
- [x] Every seeded schedule starts paused; deployment cannot start external work
      implicitly.
- [x] Fifteen-minute Worker scheduler dispatches due jobs and due retries.
- [x] Daily and weekly UTC cron validation with deterministic next-run
      calculation.
- [x] Upstream dependency health blocks downstream execution.
- [x] Per-job timeout, bounded attempt count, and exponential retry policy.
- [x] Healthy, paused, running, degraded, and failing job-health states.
- [x] Queued, running, succeeded, failed, timed-out, skipped, and blocked run
      states.
- [x] Manual administrator reruns retain initiator identity.
- [x] Bounded operational logs contain event names and metrics without request
      bodies or credentials.
- [x] Top-10 generation executes against current ranked products and retains the
      chosen product IDs in run metrics.
- [x] Scheduled score retraining refreshes owner learning profiles and active
      version quality snapshots but cannot activate a scoring version.
- [x] Administrator dashboard at `/automation` exposes health, policy controls,
      manual reruns, latest outcomes, and processing logs.

Partner-dependent ingestion, price, stock, trend, content, and compliance job
handlers return `SKIPPED` with `HANDLER_NOT_CONFIGURED` until their corresponding
credentialed transports are proven. A skipped run is never counted as a
success. Those schedules remain paused by default.

## Automation validation evidence

- The forward-only D1 migration creates three automation tables, eight indexes,
  the expected run/log foreign keys, and nine paused jobs after every earlier
  migration.
- A disposable PostgreSQL 16 database applied all nine repository migrations;
  it contained nine paused jobs and the 50-product seed remained idempotent
  across two runs.
- Tests cover cron bounds, deterministic next times, job policy limits,
  dependency blocking, exponential retries, timeouts, explicit skips,
  retraining safety, administrator authorization, Worker scheduler dispatch,
  migration execution, route protection, and dashboard controls.
- The production build includes the scheduled Worker entry point, four
  automation APIs, and the administrator dashboard.
- The complete repository quality gate passes 117 checks.

## Next Phase 3 slice

The next target is user notifications and reports: in-app delivery, preferences,
read state, daily/weekly/monthly summaries, operational and performance alerts,
email-provider handoff, and report downloads. Credential-dependent automation
handlers remain an explicit integration gate in parallel.

## Release

Phase 3 has not been deployed. Its source remains local pending completed
tracking workflows, production verification, and explicit owner approval.
