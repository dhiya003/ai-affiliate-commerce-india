# Opportunity scoring v1

Phase 1 scoring is deterministic, explainable, and normalized to 0–100. It is a
prioritization aid, not a prediction of guaranteed earnings.

## Formula

| Factor               | Weight | Input treatment                                   |
| -------------------- | -----: | ------------------------------------------------- |
| Rating               |    16% | Rating divided by 5; missing rating receives 40   |
| Review volume        |    12% | Logarithmic scale, reaching 100 at 10,000 reviews |
| Discount             |    12% | Linear scale, reaching 100 at a 60% discount      |
| Commission           |    15% | Linear scale, reaching 100 at a 15% rate          |
| Price attractiveness |    10% | India-oriented bands, strongest below ₹500        |
| Seller quality       |    10% | Seller rating divided by 5; missing receives 45   |
| Competition          |    10% | Direct normalized score; Phase 1 default is 50    |
| Trend                |     8% | Direct normalized score; Phase 1 default is 50    |
| Demand               |     7% | Direct normalized score; Phase 1 default is 50    |

The weighted total is reduced by 2, 7, 15, or 5 points for low, medium, high,
or unknown return risk. The result is clamped to 0–100 and rounded to two
decimal places.

## Missing and invalid data

Missing rating, seller rating, and commission receive conservative defaults and
are listed as cautions. Trend, demand, and competition are explicitly identified
as placeholders until Phase 2. Invalid ranges, negative prices, fractional
review counts, and an original price lower than the current price are rejected.

## Versioning

Every stored score includes `v1.0.0`, its complete factor breakdown, a formula
description, strongest factors, cautions, and placeholder fields. A future
formula change must increment the version rather than rewriting historical
scores.
