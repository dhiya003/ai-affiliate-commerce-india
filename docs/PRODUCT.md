# Product vision and locked MVP

## Vision

Give Indian affiliate creators a trustworthy daily answer to two questions:
which product should I promote, and what should I say about it?

The platform should reduce research time without hiding uncertainty. Every
recommendation must show its source data, score factors, estimated economics,
and risks.

## Phase 1 objective

Launch the core product using manually entered, CSV-imported, and seeded data.
A signed-in user can review today's opportunities, inspect an explainable score,
generate promotion-ready content, and move a product through the editorial
workflow.

## Included

1. Authentication, sessions, administrator and standard-user roles.
2. Dashboard search, filters, sorting, pagination, and responsive product cards.
3. Product create, edit, delete, detail, notes, tags, categories, seller data,
   marketplace identifiers, URLs, inventory, and return-risk fields.
4. CSV import with validation and duplicate detection.
5. Versioned opportunity scoring from rating, reviews, discount, commission,
   price attractiveness, seller quality, risk, competition, trend, and demand.
6. AI summaries, rationale, audience, hooks, 30/60-second scripts, captions,
   hashtags, calls to action, thumbnails, pros, and cautions.
7. Editorial states: New, Reviewed, Approved, Rejected, and Promoted.
8. Automated tests, deployment checks, logging, monitoring, and launch guidance.

## Explicitly excluded from Phase 1

- live marketplace scraping or partner API ingestion;
- automated marketplace-rule and content-compliance enforcement;
- click, conversion, commission, and campaign analytics;
- automated model-weight learning and scheduled marketplace jobs;
- billing, multi-tenant organizations, and creator payouts.

These belong to the locked Phase 2 and Phase 3 releases.

## Success criteria

- A new administrator can sign in and reach a useful seeded dashboard.
- At least 50 sample products across all five marketplaces can be searched and
  filtered.
- A user can add or import a product, calculate its explainable score, generate
  content, and mark it promoted without leaving the app.
- Invalid data and unavailable AI services fail safely with clear recovery.
- The mobile and desktop core journey passes the launch checklist in production.

## Product principles

- Evidence before hype.
- Explain recommendations and preserve source timestamps.
- Treat affiliate disclosures and marketplace policies as product requirements.
- Keep human approval in the publishing loop.
- Optimize for the Indian market, INR, and creator workflows from day one.
