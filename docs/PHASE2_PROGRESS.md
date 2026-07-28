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
- The complete repository quality gate passes 52 checks, including the
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

- All seven forward-only D1 ingestion tables and five marketplace source and
  schedule seeds apply after the existing catalogue and policy migrations.
- The isolated PostgreSQL 16 verification applied all three migrations and
  seeded twice without count drift.
- PostgreSQL aggregate evidence after the second seed:
  `5 marketplaces | 5 sources | 5 schedules | 50 products | 5 marketplace
  rules | 2 commission rules | 1 content policy | 1 disclosure | 1 prohibited
  practice`.
- The complete repository quality gate passes 52 checks, including ingestion
  schemas, normalization, canonical-key stability, confidence thresholds,
  freshness, retry backoff, and D1 seed execution.

## Next Phase 2 slice

The next repository-controlled target is opportunity-scoring version 2:
replace placeholder trend, demand, and competition inputs with explicit
evidence models and explainable score provenance. Real marketplace credentials,
live adapters, and production schedules remain external integration gates.

## Release

The marketplace policy foundation was released as owner-only Sites version 14
from commit `b79af44bb47bda90deb87c0774aca40105490e0f`. The saved version records
that exact source provenance, includes both forward-only D1 migrations, and its
production deployment reached the terminal `succeeded` state.
