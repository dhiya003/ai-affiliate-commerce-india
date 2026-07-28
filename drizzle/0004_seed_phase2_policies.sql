INSERT OR IGNORE INTO `marketplace_rules` (
  `id`, `marketplace`, `title`, `summary`, `effective_at`, `source_url`,
  `status`, `reviewed_at`, `reviewed_by_email`, `created_at`, `updated_at`,
  `rule_type`
) VALUES
  (
    'rule-amazon-associates-operating', 'Amazon',
    'Associates operating agreement',
    'Use Special Links and Amazon-provided content only within the Associates agreement and applicable operating documentation.',
    '2021-11-01T00:00:00.000Z',
    'https://affiliate-program.amazon.in/help/operating/agreement',
    'ACTIVE', '2026-07-29T00:00:00.000Z', 'system@affinity.local',
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'AFFILIATE_REQUIREMENT'
  ),
  (
    'rule-meesho-reelz-deals', 'Meesho',
    'Reelz Deals affiliate workflow',
    'Opted-in products may be selected by influencers for social or storefront content using trackable product links; seller-panel communications may add controlling terms.',
    '2026-05-18T00:00:00.000Z',
    'https://www.meesho.com/legal/influencer-marketing-tncs',
    'ACTIVE', '2026-07-29T00:00:00.000Z', 'system@affinity.local',
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'CREATOR_REQUIREMENT'
  ),
  (
    'rule-flipkart-affiliate-operating', 'Flipkart',
    'Affiliate operating agreement',
    'Participation requires acceptance into the program and use of approved referral links from the registered site or application.',
    '2024-10-18T00:00:00.000Z',
    'https://affiliate.flipkart.com/terms-and-conditions',
    'ACTIVE', '2026-07-29T00:00:00.000Z', 'system@affinity.local',
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'AFFILIATE_REQUIREMENT'
  ),
  (
    'rule-myntra-meta-affiliate', 'Myntra',
    'Meta affiliate product tagging',
    'Flipkart Group announced product tagging for Myntra through Facebook posts and Reels; creator eligibility and account-level terms must be confirmed before use.',
    '2026-06-09T00:00:00.000Z',
    'https://stories.flipkart.com/announcement/flipkart-group-launches-meta-affiliate-partnerships-to-power-india-s-creator-commerce-revolution',
    'NEEDS_REVIEW', NULL, NULL,
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'CREATOR_REQUIREMENT'
  ),
  (
    'rule-ajio-affiliate-availability', 'AJIO',
    'Affiliate option requires verification',
    'The current public AJIO platform terms do not establish a general creator affiliate program. Confirm an approved partner route before generating or publishing affiliate links.',
    '2026-07-29T00:00:00.000Z',
    'https://www.ajio.com/help/termsAndCondition',
    'NEEDS_REVIEW', NULL, NULL,
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'AFFILIATE_AVAILABILITY'
  );

INSERT OR IGNORE INTO `commission_rules` (
  `id`, `marketplace`, `title`, `summary`, `effective_at`, `source_url`,
  `status`, `reviewed_at`, `reviewed_by_email`, `created_at`, `updated_at`,
  `category`, `rate_min`, `rate_max`
) VALUES
  (
    'commission-amazon-apparel-july-2026', 'Amazon',
    'Apparel, accessories, shoes, luggage, bags, watches and beauty',
    'The official July 2026 advertising fee schedule lists a fixed 10 percent rate for these categories.',
    '2026-07-01T00:00:00.000Z',
    'https://affiliate-program.amazon.in/help/node/topic/GRXPHT8U84RAYDXZ',
    'ACTIVE', '2026-07-29T00:00:00.000Z', 'system@affinity.local',
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'Apparel & Beauty', 10, 10
  ),
  (
    'commission-amazon-electronics-july-2026', 'Amazon',
    'Personal computers, smart watches and electronics',
    'The official July 2026 advertising fee schedule lists a fixed 3.5 percent rate for these categories.',
    '2026-07-01T00:00:00.000Z',
    'https://affiliate-program.amazon.in/help/node/topic/GRXPHT8U84RAYDXZ',
    'ACTIVE', '2026-07-29T00:00:00.000Z', 'system@affinity.local',
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'Electronics', 3.5, 3.5
  ),
  (
    'commission-flipkart-general-july-2026', 'Flipkart',
    'Books and general merchandise',
    'The official July 2026 referral payout table lists 5 percent for new and existing customers across website and app orders.',
    '2026-07-01T00:00:00.000Z',
    'https://affiliate.flipkart.com/commissions',
    'ACTIVE', '2026-07-29T00:00:00.000Z', 'system@affinity.local',
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'Books & General Merchandise', 5, 5
  ),
  (
    'commission-meesho-dynamic', 'Meesho',
    'Seller-configured campaign fee',
    'Reelz Deals fees are communicated through the seller panel and can vary; no static creator rate should be assumed.',
    '2026-05-18T00:00:00.000Z',
    'https://www.meesho.com/legal/influencer-marketing-tncs',
    'ACTIVE', '2026-07-29T00:00:00.000Z', 'system@affinity.local',
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'Campaign-specific', NULL, NULL
  );

INSERT OR IGNORE INTO `content_policies` (
  `id`, `marketplace`, `title`, `summary`, `effective_at`, `source_url`,
  `status`, `reviewed_at`, `reviewed_by_email`, `created_at`, `updated_at`,
  `channel`
) VALUES
  (
    'content-amazon-social-disclosure', 'Amazon',
    'Social affiliate disclosure',
    'Each social post containing an Amazon affiliate link needs a clear and conspicuous link-level disclosure placed where viewers will notice it.',
    '2021-11-01T00:00:00.000Z',
    'https://affiliate-program.amazon.in/help/node/topic/GPXFHVYZMTGPUMPE',
    'ACTIVE', '2026-07-29T00:00:00.000Z', 'system@affinity.local',
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'SOCIAL_MEDIA'
  ),
  (
    'content-meesho-brand-guidelines', 'Meesho',
    'Campaign brand guidelines',
    'Brand guidelines must be supplied in writing for Meesho Mall affiliate campaigns, and created content must comply with applicable advertising standards and law.',
    '2026-05-18T00:00:00.000Z',
    'https://www.meesho.com/legal/MEESHO-MALL-AFFILIATE-MARKETING-PROGRAM-T%26Cs',
    'ACTIVE', '2026-07-29T00:00:00.000Z', 'system@affinity.local',
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'SOCIAL_MEDIA'
  ),
  (
    'content-ajio-no-misleading-claims', 'AJIO',
    'No false or misleading platform content',
    'AJIO platform terms prohibit false, malicious, deceptive, or misleading statements; affiliate-specific creator terms still require verification.',
    '2026-07-29T00:00:00.000Z',
    'https://www.ajio.com/help/termsAndCondition',
    'NEEDS_REVIEW', NULL, NULL,
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'GENERAL'
  );

INSERT OR IGNORE INTO `affiliate_disclosures` (
  `id`, `marketplace`, `title`, `summary`, `effective_at`, `source_url`,
  `status`, `reviewed_at`, `reviewed_by_email`, `created_at`, `updated_at`,
  `disclosure_text`, `placement`
) VALUES
  (
    'disclosure-amazon-associate', 'Amazon',
    'Amazon Associate identification',
    'Use the required Associate identification and a clear link-level disclosure for affiliate content.',
    '2021-11-01T00:00:00.000Z',
    'https://affiliate-program.amazon.in/help/node/topic/GPXFHVYZMTGPUMPE',
    'ACTIVE', '2026-07-29T00:00:00.000Z', 'system@affinity.local',
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'As an Amazon Associate I earn from qualifying purchases.',
    'Clearly and conspicuously on the site; place a link-level disclosure near each affiliate link or product review.'
  ),
  (
    'disclosure-generic-affiliate', 'All',
    'Generic affiliate relationship disclosure',
    'Use a plain-language disclosure until marketplace-specific wording has been reviewed and approved.',
    '2026-07-29T00:00:00.000Z',
    'https://www.ascionline.in/guidelines/influencer-advertising-guidelines/',
    'NEEDS_REVIEW', NULL, NULL,
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'Affiliate link: I may earn a commission if you purchase through this link.',
    'Before or adjacent to the promotional claim and affiliate link.'
  );

INSERT OR IGNORE INTO `prohibited_practices` (
  `id`, `marketplace`, `title`, `summary`, `effective_at`, `source_url`,
  `status`, `reviewed_at`, `reviewed_by_email`, `created_at`, `updated_at`,
  `severity`
) VALUES
  (
    'prohibited-amazon-link-incentive', 'Amazon',
    'Incentivising use of affiliate links',
    'Do not offer consideration, rewards, or incentives for using Associates links or request purchases as support.',
    '2021-11-01T00:00:00.000Z',
    'https://affiliate-program.amazon.in/help/node/topic/G8TW5AE9XL2VX9VM',
    'ACTIVE', '2026-07-29T00:00:00.000Z', 'system@affinity.local',
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'BLOCKING'
  ),
  (
    'prohibited-flipkart-trademark-bidding', 'Flipkart',
    'Paid advertising on Flipkart proprietary terms',
    'Do not bid on Flipkart trademarks, variations, or misspellings in paid search or social advertising.',
    '2024-10-18T00:00:00.000Z',
    'https://affiliate.flipkart.com/terms-and-conditions',
    'ACTIVE', '2026-07-29T00:00:00.000Z', 'system@affinity.local',
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'BLOCKING'
  ),
  (
    'prohibited-myntra-unverified-link', 'Myntra',
    'Unverified affiliate-link route',
    'Do not publish a Myntra affiliate link until the creator account and supported Meta product-tagging route are verified.',
    '2026-06-09T00:00:00.000Z',
    'https://stories.flipkart.com/announcement/flipkart-group-launches-meta-affiliate-partnerships-to-power-india-s-creator-commerce-revolution',
    'NEEDS_REVIEW', NULL, NULL,
    '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'HIGH'
  );

INSERT OR IGNORE INTO `platform_update_history` (
  `id`, `marketplace`, `policy_kind`, `policy_id`, `change_type`,
  `previous_status`, `next_status`, `summary`, `source_url`, `detected_at`,
  `reviewed_at`, `reviewed_by_email`, `created_at`
) VALUES
  (
    'update-meesho-mall-2026-05-18', 'Meesho', 'MARKETPLACE_RULE',
    'rule-meesho-reelz-deals', 'SOURCE_UPDATED', NULL, 'ACTIVE',
    'Meesho Mall Affiliate Marketing Program terms were last updated on 18 May 2026.',
    'https://www.meesho.com/legal/MEESHO-MALL-AFFILIATE-MARKETING-PROGRAM-T%26Cs',
    '2026-05-18T00:00:00.000Z', '2026-07-29T00:00:00.000Z',
    'system@affinity.local', '2026-07-29T00:00:00.000Z'
  ),
  (
    'update-flipkart-meta-2026-06-09', 'Myntra', 'MARKETPLACE_RULE',
    'rule-myntra-meta-affiliate', 'PROGRAM_ANNOUNCED', NULL, 'NEEDS_REVIEW',
    'Flipkart Group announced Meta affiliate product tagging for Flipkart and Myntra creators.',
    'https://stories.flipkart.com/announcement/flipkart-group-launches-meta-affiliate-partnerships-to-power-india-s-creator-commerce-revolution',
    '2026-06-09T00:00:00.000Z', NULL, NULL,
    '2026-07-29T00:00:00.000Z'
  );
