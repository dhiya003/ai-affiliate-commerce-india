# Phase 2 progress

Last updated: 29 July 2026

Phase 2 replaces sample-only intelligence with current marketplace sources,
compliance rules, ingestion, real trend signals, and opportunity scoring
version 2. This document records only capabilities supported by repository and
runtime evidence.

## Marketplace knowledge base

- [x] Separate marketplace-rule, commission-rule, content-policy,
      affiliate-disclosure, prohibited-practice, and platform-update-history
      models in D1 and PostgreSQL.
- [x] Effective date, first-party source URL, review status, reviewer, and
      review timestamp on every policy record.
- [x] Initial source-backed records across Amazon, Flipkart, Meesho, Myntra,
      and AJIO.
- [x] Amazon operating, social disclosure, commission, and prohibited-practice
      records.
- [x] Flipkart operating, linking, commission, and paid-trademark restriction
      records.
- [x] Meesho creator-content, Reelz Deals, dynamic-fee, brand-guideline, and
      campaign-term records.
- [x] Myntra Meta product-tagging announcement recorded as `NEEDS_REVIEW` until
      creator eligibility and account terms are confirmed.
- [x] AJIO affiliate availability recorded as `NEEDS_REVIEW`; the public
      platform terms are not treated as evidence of a general creator affiliate
      program.
- [x] Protected policy centre with marketplace, record-type, and review-status
      filters.
- [x] Administrator-only status review with an append-only update-history
      record.

## Validation evidence

- Five forward-only D1 tables plus update history are added without changing
  the existing 50-product catalogue.
- D1 seed verification contains 17 policy records and two initial update
  events; every policy has an HTTPS source, effective date, and valid status.
- The PostgreSQL 16 migration applied after the Phase 1 schema without manual
  intervention.
- The PostgreSQL seed produced five marketplace rules and at least one record
  in every other policy model while preserving all 50 products.
- A second PostgreSQL seed run left all aggregate counts unchanged.
- The complete repository quality gate passes 68 checks, including the
  production build, authentication boundaries, model coverage, sources, and
  administrator audit workflow.

## Normalized product ingestion

- [x] Product-source and marketplace-adapter TypeScript contracts.
- [x] Validated normalized-product contract for all five marketplaces.
- [x] Immutable raw payload retention with deterministic SHA-256 hashes.
- [x] Source and receipt timestamps, confidence, match status, availability,
      and per-source freshness windows.
- [x] Run-level counters and per-record error logs.
- [x] Bounded exponential retry state, administrator recovery endpoint, and
      unresolved-error resolution.
- [x] Source rate-limit state and pre-run enforcement.
- [x] Duplicate payload reconciliation by source, external identifier, and
      payload hash.
- [x] Marketplace-product matching and canonical product grouping.
- [x] Stale and unavailable-product detection.
- [x] Disabled-by-default schedules for every marketplace source; live
      schedules are not enabled without credentials and a supported adapter.
- [x] Administrator-only manual triggers for batches of up to 250 records.
- [x] Protected source-health and ingestion-statistics interface at `/sources`.
- [x] D1 and PostgreSQL parity for sources, runs, raw payloads, canonical
      groups, matches, errors, and schedules.

## Ingestion validation evidence

- All seven forward-only D1 ingestion tables, five manual sources, five
  disabled partner sources, and their schedules apply after the existing
  catalogue and policy migrations.
- The isolated PostgreSQL 16 verification applied all three migrations and
  seeded twice without count drift.
- PostgreSQL aggregate evidence after the second seed:
  `5 marketplaces | 10 sources | 10 schedules | 50 products | 5 marketplace
rules | 2 commission rules | 1 content policy | 1 disclosure | 1 prohibited
practice`.
- The complete repository quality gate passes 68 checks, including ingestion
  schemas, normalization, canonical-key stability, confidence thresholds,
  freshness, retry backoff, and D1 seed execution.

## Trend intelligence and scoring v2 foundation

- [x] Trend-signal, source-trend-score, and immutable opportunity-score-evidence
      models in D1 and PostgreSQL.
- [x] Explicit signal types for Google Trends, social mentions, marketplace
      bestseller rank, review growth, price and discount movement,
      availability, category momentum, seasonal and festival demand, and
      new-product velocity.
- [x] Confidence-aware, source-weighted, time-decayed seven-day and 30-day
      calculations.
- [x] Trend spike, rise, stability, and decay classification.
- [x] Scoring v2 contract with demand, trend, gross and net commission,
      return-risk, seller reliability, saturation, virality, price band,
      category conversion, festival relevance, audience size, visual appeal,
      urgency, and stock stability factors.
- [x] Marketplace-specific and category-specific factor multipliers.
- [x] Source-confidence, missing-data, and return-risk penalties.
- [x] Explainable factor contributions, cautions, weights, and persisted
      provenance.
- [x] Administrator-only trend-evidence recording and authenticated evidence
      reads.
- [x] Product detail trend-provenance interface that reports absent evidence as
      unproven instead of substituting a midpoint.

## Trend/scoring validation evidence

- The forward-only D1 migration creates all three intelligence tables after the
  policy and ingestion migrations.
- An isolated PostgreSQL 16 database applied all four repository migrations,
  seeded the existing 50-product catalogue, and contained all three trend and
  score-evidence tables.
- Unit coverage verifies window membership, expiry, source confidence,
  spike detection, v2 net commission, penalties, and marketplace/category
  multipliers.
- The complete repository quality gate passes 68 checks.

## Compliance engine

- [x] Compliance-check, per-rule result, and append-only override models in D1
      and PostgreSQL.
- [x] Exact marketplace and exact-product verification.
- [x] Product-colour, current-price, combo-price, and discount-accuracy checks.
- [x] Required affiliate and marketplace-specific disclosure checks, including
      the Amazon Associate disclosure path.
- [x] Prohibited-claim, unsupported health-claim, restricted-category, and
      content-originality checks.
- [x] Pass, warning, fail, and overridden workflow states with info, warning,
      high, and blocking severities.
- [x] Per-result remediation suggestions and evidence payloads.
- [x] Copy/export blocking for unresolved blocking violations.
- [x] Administrator-only manual overrides with mandatory reason, actor,
      timestamp, previous status, and durable audit record.
- [x] Protected product compliance API and product-detail compliance interface.

## Compliance validation evidence

- The forward-only D1 migration creates all three compliance tables after the
  policy, ingestion, and trend/scoring migrations.
- An isolated PostgreSQL 16 database applied all five repository migrations,
  seeded the existing catalogue, and contained all three compliance tables.
- Unit coverage verifies compliant content, price and discount mismatches,
  missing disclosure, prohibited and unsupported claims, exact-product
  identity, and colour matching.
- The complete repository quality gate passes 68 checks.

## Recommendation experience

- [x] “Today’s top 10,” emerging, low-competition, high-commission,
      viral-potential, and seasonal recommendation views.
- [x] Marketplace and category lists through the existing verified catalogue
      filters.
- [x] Durable, user-owned saved-product model in D1 and PostgreSQL.
- [x] Protected saved-product create, list, and remove API.
- [x] Signed-in saved-products workspace with explicit empty state.
- [x] Two-to-four-product comparison workflow.
- [x] Side-by-side recommendation explanations using opportunity, commission,
      seller, stock, trend, content, and compliance evidence.
- [x] “Why now?” explanations that distinguish verified trend evidence from
      unproven timing.
- [x] Target-audience and content-angle recommendations from the latest saved
      content bundle.
- [x] Risk and caution summaries covering return risk, availability,
      compliance blocks, and missing affiliate URLs.
- [x] Evidence-dependent recommendation views return empty states when their
      required signal does not exist; they do not promote sample values as live
      evidence.

## Recommendation validation evidence

- The forward-only D1 migration creates the saved-products table with
  user/product uniqueness and user/time indexing.
- An isolated PostgreSQL 16 database applied all six repository migrations,
  seeded the existing catalogue, and contained the account-backed saved-product
  table.
- The production build includes protected `/saved`, `/compare`, and
  `/api/saved-products` routes.
- Query validation covers all six recommendation view contracts.
- The complete repository quality gate passes 68 checks.

## Marketplace partner adapter contracts

- [x] Shared injected feed-client boundary so transport and partner
      authentication remain separate from marketplace normalization.
- [x] Amazon adapter with ASIN validation, Amazon-domain enforcement, pricing,
      seller, rating, availability, commission, and affiliate-link mapping.
- [x] Flipkart adapter with FSN, marketplace-domain, seller, pricing, rating,
      availability, commission, and affiliate-link mapping.
- [x] Meesho adapter with supplier, delivery window, return window, combo/unit
      price, variation availability, commission, and affiliate-link mapping.
- [x] Myntra and AJIO fashion adapters with style identifiers, size and colour
      variations, variation availability, price/MRP discount consistency,
      commission, and affiliate-link mapping.
- [x] HTTPS and marketplace-domain allowlists prevent cross-marketplace links
      from entering the normalized product contract.
- [x] Invalid price pairs, inconsistent discounts, and product/variation
      availability conflicts are rejected before ingestion.
- [x] Source-specific evidence is retained in `sourceAttributes` instead of
      being discarded during normalization.
- [x] Five partner API sources and schedules exist in D1 and PostgreSQL but are
      explicitly disabled until real partner access and credentials are
      configured.

## Adapter validation evidence

- Six adapter tests cover valid normalization and invalid-domain, price,
  discount, and availability failure paths across all five marketplaces.
- The forward-only D1 seed adds one disabled API source and disabled schedule
  per marketplace while preserving the five existing manual sources.
- A fresh PostgreSQL 16 database applied all six migrations and seeded twice
  without count drift.
- PostgreSQL aggregate evidence after the second seed:
  `5 marketplaces | 10 sources | 5 manual READY | 5 API DISABLED |
10 disabled schedules | 50 products`.
- The complete repository quality gate passes 68 checks, including formatting,
  lint, strict type checks, production build, route tests, all prior Phase 1
  and Phase 2 coverage, and the six new adapter contracts.

## Next Phase 2 slice

The next repository-controlled target is Phase 2 release hardening: integration
alerts, freshness indicators, source failure scenarios, affiliate-link
validation, and release notes. Live marketplace credentials, supported partner
API access, authenticated transport clients, and enabled schedules remain
external integration gates; no test fixture or sample value is presented as
live marketplace evidence.

## Release

The marketplace policy foundation was released as owner-only Sites version 14
from commit `b79af44bb47bda90deb87c0774aca40105490e0f`. The saved version records
that exact source provenance, includes both forward-only D1 migrations, and its
production deployment reached the terminal `succeeded` state.
