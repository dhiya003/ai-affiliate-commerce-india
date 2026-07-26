# Phase 1 administrator onboarding

## Before first use

1. Open the private production URL and sign in with ChatGPT.
2. Confirm your account is listed in `ADMIN_EMAILS` when using the PostgreSQL
   runtime. Sites owner-only access remains the primary private-release gate.
3. Open `/api/health` and confirm `status` is `ok` and the database is `up`.
4. Confirm the dashboard contains seeded products from Amazon, Flipkart,
   Meesho, Myntra, and AJIO.

## First product workflow

1. Select **Add product** from the dashboard or product catalogue.
2. Add one marketplace product manually, or import a CSV with the required
   columns shown in the intake dialog.
3. Confirm the product receives an opportunity score and appears in **All
   products**.
4. Open the product, review the score explanation, and correct any product facts
   using **Edit**.
5. Mark the product **Reviewed** and then **Approved**, recording a decision note.
6. Generate the affiliate content bundle. Review all claims, live price, seller,
   return policy, and affiliate disclosure before copying content.
7. Mark the product **Promoted** only after publication.

## Operating rules

- Treat sample products as demonstrations until their live marketplace facts
  have been verified.
- Never present the opportunity score as guaranteed earnings.
- Confirm marketplace price, stock, seller, commission, and return policy at
  publication time.
- Keep the affiliate disclosure in every published promotion.
- Reject or revise generated text that adds facts absent from the product page.
- Use status notes to preserve the reason for editorial decisions.

## Troubleshooting

- If `/api/health` reports `degraded`, stop product mutations and inspect the
  latest structured `health.database.unavailable` log.
- Every API response includes `x-request-id`; use it to correlate a user report
  with `api.request.failed` or `http.request.completed` logs.
- A built-in content provider label is expected until `OPENAI_API_KEY` is set in
  the production environment. Generated bundles remain usable and auditable.
- Duplicate marketplace IDs are rejected within the same marketplace. Edit the
  existing record rather than importing it again.
