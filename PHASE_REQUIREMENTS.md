# AI Affiliate Commerce Platform for India — Three-Phase Requirements

This document is the root-level source of truth for the locked product scope. It contains exactly three delivery phases and 575 implementation tasks. Implementation progress is tracked separately in the phase progress and verification documents under `docs/`.

## Scope governance

- Phase 1 must establish and launch the core product.
- Phase 2 must replace sample-only intelligence with supported, credentialed marketplace data and compliance controls.
- Phase 3 must add performance tracking, learning, automation, operational controls, and production-scale reliability.
- A requirement is complete only when its implementation and proportionate verification evidence exist. Credential-gated or externally blocked integrations must not be reported as complete.

---

# Phase 1 — Core Product Live

## Objective

Launch a working web application where you can:

1. Log in.
2. View today’s top affiliate products.
3. Open a product.
4. See its opportunity score.
5. Generate a reel script, caption, hashtags and CTA.
6. Add or import products manually.
7. Mark products as approved, rejected or promoted.

Initially, the system can use manually imported and sample product data. The purpose is to get the **core product live first**.

## Phase 1 Tasks

### Repository and project foundation

1. Create the GitHub repository.
2. Add a professional README.
3. Add the product vision and locked MVP scope.
4. Create the initial project folder structure.
5. Initialize the Next.js application.
6. Configure TypeScript strict mode.
7. Install and configure Tailwind CSS.
8. Install and configure shadcn/ui.
9. Configure ESLint.
10. Configure Prettier.
11. Add `.editorconfig`.
12. Create `.env.example`.
13. Add secure environment-variable validation.
14. Add `.gitignore`.
15. Add GitHub issue templates.
16. Add pull-request templates.
17. Define the branching strategy.
18. Add a contribution guide.
19. Add a code-of-conduct file.
20. Add the initial architecture document.

### Database and backend

21. Select PostgreSQL as the production database.
22. Configure Prisma ORM.
23. Create the user database model.
24. Create the marketplace model.
25. Create the product model.
26. Create the seller model.
27. Create the product-price-history model.
28. Create the product-score model.
29. Create the generated-content model.
30. Create the promotion-status model.
31. Create the product-category model.
32. Create the product-tag model.
33. Create the affiliate-link model.
34. Add database indexes.
35. Add database uniqueness constraints.
36. Create the initial Prisma migration.
37. Create a database seed script.
38. Seed the five supported marketplaces.
39. Seed sample categories.
40. Seed at least 50 sample products.
41. Add database connection pooling.
42. Add database error handling.
43. Add structured API responses.
44. Add API validation using Zod.
45. Create centralized API error handling.

### Authentication and access

46. Implement secure user authentication.
47. Create the login page.
48. Create the logout flow.
49. Protect dashboard routes.
50. Protect backend API routes.
51. Add session handling.
52. Add basic role support.
53. Create an administrator role.
54. Create a standard-user role.
55. Add an unauthorized-access page.

### Dashboard and navigation

56. Create the main application layout.
57. Create the sidebar navigation.
58. Create the top navigation bar.
59. Add mobile-responsive navigation.
60. Create the dashboard homepage.
61. Create a “Today’s Top Products” section.
62. Create marketplace filter controls.
63. Create category filter controls.
64. Create price-range filters.
65. Create minimum-rating filters.
66. Create sort-by-score functionality.
67. Create product-card components.
68. Display product image.
69. Display product name.
70. Display marketplace.
71. Display current price.
72. Display original price.
73. Display discount percentage.
74. Display rating.
75. Display review count.
76. Display opportunity score.
77. Display trend score.
78. Display commission estimate.
79. Add loading states.
80. Add empty states.
81. Add API error states.
82. Add pagination.
83. Add dashboard search.
84. Add responsive desktop layout.
85. Add responsive mobile layout.

### Product management

86. Create the product-list page.
87. Create the product-details page.
88. Create the add-product form.
89. Allow manual product creation.
90. Allow product editing.
91. Allow product deletion.
92. Add product-status management.
93. Add “New” status.
94. Add “Reviewed” status.
95. Add “Approved” status.
96. Add “Rejected” status.
97. Add “Promoted” status.
98. Add internal product notes.
99. Add product tags.
100.  Add product categories.
101.  Add marketplace-specific product IDs.
102.  Add product URL storage.
103.  Add affiliate URL storage.
104.  Add image URL storage.
105.  Add seller details.
106.  Add stock-status field.
107.  Add return-risk field.
108.  Add product duplication checks.
109.  Add CSV product import.
110.  Add CSV import validation.

### Scoring engine version 1

111. Define the initial scoring methodology.
112. Add rating score.
113. Add review-volume score.
114. Add discount score.
115. Add commission score.
116. Add price-attractiveness score.
117. Add seller-quality score.
118. Add return-risk penalty.
119. Add competition score.
120. Add trend score placeholder.
121. Add demand score placeholder.
122. Create the overall-opportunity formula.
123. Normalize all scores to 100.
124. Store scoring explanations.
125. Display scoring breakdown.
126. Add score recalculation endpoint.
127. Add bulk score recalculation.
128. Add score versioning.
129. Add score calculation tests.
130. Add invalid-data handling.

### AI content generation

131. Configure the AI provider.
132. Create a reusable AI service.
133. Add prompt-template management.
134. Generate product summaries.
135. Generate “Why promote this product?” analysis.
136. Generate target-audience suggestions.
137. Generate three reel hooks.
138. Generate a 30-second reel script.
139. Generate a 60-second reel script.
140. Generate a social-media caption.
141. Generate hashtags.
142. Generate CTA options.
143. Generate thumbnail-text ideas.
144. Generate product pros.
145. Generate product cautions.
146. Add content-regeneration capability.
147. Save generated content to the database.
148. Add copy-to-clipboard buttons.
149. Add AI request loading states.
150. Add AI response error handling.

### Quality, deployment and launch

151. Add unit tests.
152. Add API integration tests.
153. Add dashboard component tests.
154. Add authentication tests.
155. Add database migration tests.
156. Configure GitHub Actions.
157. Run lint checks in GitHub Actions.
158. Run type checks in GitHub Actions.
159. Run tests in GitHub Actions.
160. Run production builds in GitHub Actions.
161. Add Docker configuration.
162. Create production database.
163. Deploy the web application.
164. Configure the production domain.
165. Configure HTTPS.
166. Configure environment secrets.
167. Add application logging.
168. Add error monitoring.
169. Run mobile-device testing.
170. Run browser compatibility testing.
171. Fix launch-blocking defects.
172. Create admin onboarding documentation.
173. Create the Phase 1 launch checklist.
174. Publish the first production release.
175. Confirm the live core workflow end to end.

## Phase 1 Definition of Done

The application is live and allows you to manually add or import products, score them, view the top opportunities and generate ready-to-use affiliate content.

---

# Phase 2 — Real Marketplace Intelligence

## Objective

Replace sample and manual data with real marketplace information. Add platform rules, affiliate-link support, trend signals and compliance checking.

The product must start answering:

> “Which real product should I promote today, and what content should I create for it?”

## Phase 2 Tasks

### Marketplace knowledge base

1. Create the marketplace-rules database model.
2. Create the commission-rule model.
3. Create the content-policy model.
4. Create the affiliate-disclosure model.
5. Create the prohibited-practice model.
6. Create the platform-update-history model.
7. Document Amazon Associates requirements.
8. Document Amazon social-media rules.
9. Document Amazon affiliate disclosures.
10. Document Amazon commission categories.
11. Document Meesho creator requirements.
12. Document Meesho product-tagging rules.
13. Document Meesho pricing rules.
14. Document Meesho reel requirements.
15. Document Flipkart affiliate requirements.
16. Document Flipkart commission rules.
17. Document Flipkart linking rules.
18. Document Myntra affiliate options.
19. Document Myntra creator requirements.
20. Document AJIO affiliate options.
21. Document AJIO creator requirements.
22. Add effective dates to every rule.
23. Add source references to every rule.
24. Add rule-status tracking.
25. Add policy-change review workflow.

### Product-data ingestion framework

26. Create the product-source interface.
27. Create the marketplace-adapter interface.
28. Create the normalized-product schema.
29. Create the raw-source-data model.
30. Store source timestamps.
31. Store source confidence levels.
32. Add ingestion-run logging.
33. Add ingestion error logging.
34. Add retry handling.
35. Add rate-limit handling.
36. Add duplicate-product reconciliation.
37. Add marketplace-product matching.
38. Add canonical product grouping.
39. Add stale-product detection.
40. Add unavailable-product detection.
41. Add scheduled ingestion jobs.
42. Add manual ingestion triggers.
43. Add source health monitoring.
44. Add ingestion statistics.
45. Add failed-job recovery.

### Amazon integration

46. Create the Amazon adapter.
47. Add Amazon product identifier support.
48. Import Amazon product names.
49. Import Amazon prices.
50. Import Amazon images.
51. Import Amazon ratings.
52. Import Amazon review counts.
53. Import Amazon categories.
54. Import Amazon seller information.
55. Import Amazon availability.
56. Store Amazon affiliate URLs.
57. Add Amazon data-validation rules.
58. Add Amazon product-update jobs.
59. Add Amazon integration tests.
60. Add Amazon source-status dashboard.

### Meesho integration

61. Create the Meesho adapter.
62. Add Meesho product identifier support.
63. Import Meesho product names.
64. Import Meesho prices.
65. Import Meesho product images.
66. Import Meesho ratings.
67. Import Meesho review counts.
68. Import Meesho categories.
69. Import Meesho supplier information.
70. Import Meesho delivery information.
71. Import Meesho return information.
72. Store Meesho affiliate URLs.
73. Add Meesho product-variation handling.
74. Add Meesho combo-price handling.
75. Add Meesho integration tests.

### Flipkart integration

76. Create the Flipkart adapter.
77. Add Flipkart product identifier support.
78. Import Flipkart product names.
79. Import Flipkart prices.
80. Import Flipkart product images.
81. Import Flipkart ratings.
82. Import Flipkart review counts.
83. Import Flipkart categories.
84. Import Flipkart seller data.
85. Import Flipkart availability.
86. Store Flipkart affiliate URLs.
87. Add Flipkart validation rules.
88. Add Flipkart product-update jobs.
89. Add Flipkart integration tests.
90. Add Flipkart source-status dashboard.

### Myntra and AJIO integration

91. Create the Myntra adapter.
92. Add Myntra product identifier support.
93. Import Myntra product details.
94. Import Myntra pricing.
95. Import Myntra discounts.
96. Import Myntra images.
97. Import Myntra ratings.
98. Store Myntra affiliate URLs.
99. Add Myntra integration tests.
100.  Create the AJIO adapter.
101.  Add AJIO product identifier support.
102.  Import AJIO product details.
103.  Import AJIO pricing.
104.  Import AJIO discounts.
105.  Import AJIO images.
106.  Import AJIO ratings.
107.  Store AJIO affiliate URLs.
108.  Add AJIO integration tests.
109.  Add combined fashion-platform filters.
110.  Add fashion-size and variation support.

### Trend intelligence

111. Create the trend-signal model.
112. Create the source-trend-score model.
113. Add Google Trends signals.
114. Add social-media mention signals.
115. Add marketplace bestseller signals.
116. Add review-growth signals.
117. Add price-drop signals.
118. Add discount-growth signals.
119. Add product-availability signals.
120. Add category-momentum signals.
121. Add seasonal-demand signals.
122. Add festival-demand signals.
123. Add new-product velocity signals.
124. Add product-age calculations.
125. Add trend-signal confidence scoring.
126. Add seven-day trend calculations.
127. Add 30-day trend calculations.
128. Add trend-spike detection.
129. Add trend-decay detection.
130. Add trend-source weighting.

### Opportunity scoring version 2

131. Replace placeholder demand scoring.
132. Replace placeholder trend scoring.
133. Add real commission calculations.
134. Add net commission estimates.
135. Add return-risk scoring.
136. Add seller-reliability scoring.
137. Add product-saturation scoring.
138. Add content-virality scoring.
139. Add price-band scoring.
140. Add category-conversion scoring.
141. Add festival-relevance scoring.
142. Add target-audience-size scoring.
143. Add product-visual-appeal scoring.
144. Add urgency scoring.
145. Add stock-stability scoring.
146. Add source-confidence penalties.
147. Add missing-data penalties.
148. Add explainable-score output.
149. Add marketplace-specific weighting.
150. Add category-specific weighting.

### Compliance engine

151. Create the compliance-check model.
152. Create compliance-check results.
153. Verify the correct marketplace tag.
154. Verify exact-product matching.
155. Verify product-colour matching.
156. Verify current-price accuracy.
157. Verify combo-price accuracy.
158. Verify required affiliate disclosure.
159. Verify prohibited claims.
160. Verify misleading discount claims.
161. Verify unsupported product claims.
162. Verify content originality requirements.
163. Verify restricted-category rules.
164. Add marketplace-specific checks.
165. Add compliance pass/fail status.
166. Add compliance-warning status.
167. Add compliance-fix suggestions.
168. Block export for severe violations.
169. Add manual compliance override.
170. Log all compliance overrides.

### Product recommendation experience

171. Create “Today’s Top 10” using live data.
172. Create marketplace-specific top 10 lists.
173. Create category-specific top 10 lists.
174. Add emerging-products view.
175. Add low-competition-products view.
176. Add high-commission-products view.
177. Add viral-potential-products view.
178. Add seasonal-products view.
179. Add saved-products list.
180. Add product-comparison view.
181. Add recommendation explanations.
182. Add “Why now?” explanations.
183. Add target-audience recommendations.
184. Add content-angle recommendations.
185. Add risk and caution summaries.

### Phase 2 validation and release

186. Test every marketplace adapter.
187. Test price freshness.
188. Test product availability.
189. Test affiliate-link correctness.
190. Test scoring consistency.
191. Test compliance checking.
192. Test source failure handling.
193. Test duplicate detection.
194. Test stale-data handling.
195. Add marketplace health alerts.
196. Add source freshness indicators.
197. Add integration monitoring.
198. Fix priority defects.
199. Publish Phase 2 release notes.
200. Deploy Phase 2 to production.

## Phase 2 Definition of Done

The application uses real product information, identifies strong affiliate opportunities across the five marketplaces, creates compliant content and explains why each product is recommended.

---

# Phase 3 — Performance, Automation and Scale

## Objective

Turn the working product into an intelligent affiliate operating system that tracks results, learns what works and improves recommendations.

The product must answer:

> “What worked, what failed, and what should I promote next?”

## Phase 3 Tasks

### Campaign and promotion management

1. Create the campaign database model.
2. Create the promotion database model.
3. Link promotions to products.
4. Link promotions to generated content.
5. Add campaign names.
6. Add campaign objectives.
7. Add campaign channels.
8. Add campaign start dates.
9. Add campaign end dates.
10. Add campaign budgets.
11. Add campaign status.
12. Add promotion publication dates.
13. Add published-content URLs.
14. Add creator-account mapping.
15. Add campaign notes.
16. Add campaign duplication.
17. Add campaign templates.
18. Add campaign archiving.
19. Add campaign filters.
20. Add campaign search.

### Affiliate-link tracking

21. Create tracked-link model.
22. Create click-event model.
23. Create conversion-event model.
24. Create commission-event model.
25. Create short tracking links.
26. Add unique tracking IDs.
27. Record click timestamp.
28. Record marketplace.
29. Record product.
30. Record campaign.
31. Record content variation.
32. Record traffic source.
33. Record device type.
34. Record country or region where permitted.
35. Add bot-click filtering.
36. Add duplicate-click handling.
37. Add suspicious-click detection.
38. Add conversion import.
39. Add commission import.
40. Add order-status tracking.

### Performance dashboard

41. Create overall analytics dashboard.
42. Display total clicks.
43. Display total conversions.
44. Display total commission.
45. Display conversion rate.
46. Display click-through rate.
47. Display earnings per click.
48. Display earnings per product.
49. Display earnings per marketplace.
50. Display earnings per campaign.
51. Display earnings per category.
52. Display daily performance.
53. Display weekly performance.
54. Display monthly performance.
55. Display date-range comparison.
56. Add product-performance table.
57. Add marketplace-performance table.
58. Add campaign-performance table.
59. Add top-performing content.
60. Add underperforming content.

### Content experimentation

61. Create content-variation model.
62. Generate multiple reel hooks.
63. Generate multiple captions.
64. Generate multiple CTAs.
65. Generate multiple hashtag sets.
66. Generate multiple audience angles.
67. Label content variants.
68. Track each content variant.
69. Compare hook performance.
70. Compare caption performance.
71. Compare CTA performance.
72. Compare content length.
73. Compare content tone.
74. Compare posting time.
75. Compare platform performance.
76. Add A/B test setup.
77. Add A/B test results.
78. Add winning-variant selection.
79. Add experiment confidence rating.
80. Archive losing variants.

### AI learning and optimization

81. Create the recommendation-feedback model.
82. Capture approved recommendations.
83. Capture rejected recommendations.
84. Capture promoted products.
85. Capture skipped products.
86. Capture successful products.
87. Capture unsuccessful products.
88. Learn category conversion rates.
89. Learn marketplace conversion rates.
90. Learn price-band conversion rates.
91. Learn commission-band performance.
92. Learn creator-specific preferences.
93. Learn audience-specific preferences.
94. Learn hook performance.
95. Learn CTA performance.
96. Learn caption-tone performance.
97. Learn seasonal performance.
98. Learn festival performance.
99. Adjust opportunity-score weights.
100.  Add score-retraining schedule.
101.  Add recommendation-quality metrics.
102.  Add recommendation-confidence scores.
103.  Add feedback explanations.
104.  Add model-version tracking.
105.  Add rollback for poor scoring versions.

### Scheduled automation

106. Add daily product ingestion.
107. Add daily price refresh.
108. Add daily availability refresh.
109. Add daily trend refresh.
110. Add daily score recalculation.
111. Add daily top-10 generation.
112. Add daily content generation.
113. Add daily compliance checking.
114. Add failed-job retries.
115. Add job dependency handling.
116. Add job timeout handling.
117. Add job health monitoring.
118. Add scheduled-job dashboard.
119. Add manual rerun capability.
120. Add processing logs.
121. Add notification for failed imports.
122. Add notification for stale prices.
123. Add notification for broken affiliate links.
124. Add notification for compliance failures.
125. Add notification for high-opportunity products.

### User notifications and reports

126. Add in-app notification center.
127. Add daily opportunity summary.
128. Add weekly performance summary.
129. Add monthly earnings summary.
130. Add new-trending-product alerts.
131. Add price-drop alerts.
132. Add stock-return alerts.
133. Add affiliate-rule-change alerts.
134. Add campaign-performance alerts.
135. Add low-conversion alerts.
136. Add high-return-risk alerts.
137. Add notification preferences.
138. Add email-notification support.
139. Add notification read status.
140. Add report-download capability.

### Administration and operations

141. Create administrator dashboard.
142. Add user management.
143. Add marketplace-source management.
144. Add scoring-weight management.
145. Add category-weight management.
146. Add AI-prompt management.
147. Add marketplace-rule management.
148. Add commission-rule management.
149. Add content-template management.
150. Add feature flags.
151. Add ingestion-job controls.
152. Add audit logs.
153. Add administrator activity logs.
154. Add system-health dashboard.
155. Add database-health dashboard.
156. Add AI-usage dashboard.
157. Add AI-cost tracking.
158. Add marketplace-source-cost tracking.
159. Add data-retention settings.
160. Add backup controls.

### Security and reliability

161. Add rate limiting.
162. Add request validation.
163. Add secure HTTP headers.
164. Add CSRF protection where required.
165. Add database-backup automation.
166. Add backup-restoration testing.
167. Add secret-rotation procedure.
168. Add session-expiration controls.
169. Add suspicious-login detection.
170. Add security-event logging.
171. Add dependency vulnerability scanning.
172. Add code-quality scanning.
173. Add production uptime monitoring.
174. Add error-rate alerts.
175. Add API-performance monitoring.
176. Add database-performance monitoring.
177. Add disaster-recovery documentation.
178. Add incident-response documentation.
179. Add privacy-policy page.
180. Add terms-of-use page.

### Scale and production readiness

181. Optimize dashboard queries.
182. Optimize product-search performance.
183. Add database caching.
184. Add background queues.
185. Add queue retry policies.
186. Add image optimization.
187. Add API-response caching.
188. Add database index review.
189. Add pagination performance testing.
190. Add load testing.
191. Add stress testing.
192. Add concurrent-user testing.
193. Add data-volume testing.
194. Add marketplace-source fallback.
195. Add AI-provider fallback.
196. Add production rollback workflow.
197. Add blue-green deployment support.
198. Complete security review.
199. Complete final acceptance testing.
200. Release the production-scale version.

## Phase 3 Definition of Done

The system automatically refreshes products, scores opportunities, generates content, tracks campaigns and affiliate performance, learns from conversions and improves future product recommendations.

---

# Delivery order

## First release

Complete only **Phase 1** and take it live.

## Second release

Connect live marketplace intelligence and compliance using **Phase 2**.

## Third release

Add tracking, learning, automation and production scaling using **Phase 3**.

## Requirement totals

- **Phase 1:** 175 tasks
- **Phase 2:** 200 tasks
- **Phase 3:** 200 tasks
- **Total:** 575 implementation tasks
