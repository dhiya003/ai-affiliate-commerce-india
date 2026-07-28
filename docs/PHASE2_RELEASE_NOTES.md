# Phase 2 release notes

Status: **Draft — not deployed**

Phase 2 adds the marketplace-intelligence foundation needed to move Affinity
India from operator-entered catalogue data toward evidence-backed affiliate
recommendations. This source state must not be described as a live marketplace
release until the activation gates in the
[Phase 2 release audit](PHASE2_RELEASE_AUDIT.md) are complete.

## Highlights

- Marketplace policy centre for Amazon, Flipkart, Meesho, Myntra, and AJIO,
  with dated sources, review status, and administrator audit history.
- Normalized ingestion control plane with immutable raw payloads, deterministic
  hashes, source timestamps, confidence, matching, canonical grouping,
  deduplication, retries, rate limits, schedules, and failed-run recovery.
- Validated partner adapter contracts for all five marketplaces.
- Marketplace-specific support for Amazon ASINs, Flipkart FSNs, Meesho supplier
  and combo details, and Myntra/AJIO fashion sizes, colours, and variations.
- Trend evidence and scoring v2 with seven-day and 30-day windows, decay,
  confidence weighting, net commission, marketplace/category weights, and
  explicit missing-evidence penalties.
- Compliance checks for exact product, marketplace, colour, price, discount,
  disclosure, restricted categories, and unsupported claims.
- Severe compliance failures block content export until fixed or explicitly
  overridden by an administrator with a recorded reason.
- Six recommendation views, saved products, two-to-four-product comparison,
  why-now evidence, audience and content angles, and risk summaries.
- Source freshness, marketplace-health alerts, and redacted monitoring delivery.

## Safety and data-truth behavior

- Partner sources and schedules are disabled by default.
- Disabled sources do not generate false operational incidents.
- Recommendations that lack required trend or commission evidence return
  explicit empty or unproven states.
- Test fixtures are isolated to automated tests and are never labeled as live
  marketplace data.
- Affiliate links must use HTTPS and the matching marketplace domain.
- Myntra creator eligibility and AJIO affiliate availability remain
  `NEEDS_REVIEW` where public evidence is insufficient.

## Verification

- The complete repository gate passes formatting, lint, strict type checks, a
  production build, and 71 automated checks.
- D1 migrations preserve the existing catalogue while adding policies,
  ingestion, trend, compliance, saved-product, and disabled partner-source
  records.
- All six PostgreSQL migrations apply to a fresh PostgreSQL 16 database.
- Two consecutive seed runs preserve exact counts: five marketplaces, 50
  products, five ready manual sources, five disabled API sources, and ten
  disabled schedules.

## Required before deployment

- Approved marketplace partner/API/feed access and production secret
  configuration.
- Authenticated transport implementation and bounded non-production ingestion
  for each marketplace.
- Operator verification of live prices, availability, seller data, affiliate
  attribution, commissions, variations, and source freshness.
- Real trend evidence and proof that evidence-dependent recommendation views are
  current.
- Review of all policy records still marked `NEEDS_REVIEW`.
- Desktop, mobile, and cross-browser production smoke tests.
- Explicit owner approval for the exact release revision.
