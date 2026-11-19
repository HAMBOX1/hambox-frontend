# Hambox Elite brief (13 Nov 2026) vs. what the site has today

Source: `Hambox Elite-membership.pdf` (13 pages, 14 sections).
Method: a quick scan of the backend modules (Commerce, Catalog, Content, Themes...) and the admin routes. This is a map of
where things stand, NOT a feature-by-feature audit: each "partial" row still needs its detail checked before work starts.

Legend: HAVE = a module/screen for it exists | PARTIAL = something exists, the brief asks for more | MISSING = nothing found

| Brief section | Status | What exists / what is missing |
|---|---|---|
| CORE: one system, admin control, switch on/off | PARTIAL | Settings + permissions exist. No "Feature Center" (one place to switch every feature on/off and test internally). |
| LV-01/02 Tiers Normal-Bronze-Silver-Gold-Platinum-Diamond + ELITE, tier kept separate from Stars | PARTIAL | `ReferralTierPolicy` and memberships exist. No loyalty tier ladder driven by qualifying activity, independent of the Stars balance, with manual adjustments and a log. |
| LV-03 Retire PRIME, migrate old PRIME referral codes | MISSING | Needs a one-time import/migration of the old codes (and conflict handling). |
| LV-04 ELITE Business (B2B) | MISSING | No B2B domain: approval, wholesale prices, quotes, sales-rep orders. |
| UI-01..04 Theme per tier, layout variants, tier-gated content, customer's default design choice | MISSING | `Themes` module exists but is store-wide. Needs per-tier theme/variant, content gated by tier/ELITE (enforced on the server), customer preference saved. |
| ST-01..06 Stars balance, earn rules (product/category/SKU, include/exclude, 0-Stars), multipliers, hold/availability, value, no free-star loops | PARTIAL | `PointsTransaction` ledger and an account Points page exist. Earn rules by product/internal category, multiplier conflict rules, pending/available states, redemption value and caps need checking/building. |
| RW-01..05 Stars Shop (rewards catalogue, cash / Stars / mixed, reservation, disclosures, goals) | MISSING | No rewards catalogue or redemption flow found. |
| RF-01..05 Referral (code, Give & Get, anti-fraud, campaigns, customer page + admin reports) | PARTIAL | `ReferralProfile`, history, audit log, `ReferralRewardService`, admin Referrals screen exist. Check: eligibility on first paid + delivered order, hold period, campaign boosters, reports/export. |
| CM-01..05 Campaign Manager (targeting incl. new products in an internal category, types, stacking, previews, cost) | PARTIAL | `Promotion` (targets, conditions, coupons) and admin Campaigns/Promotions exist. Missing: Stars/multiplier campaign types, stacking policy, profit preview and budget caps, scheduling with history. |
| CM-04 Ads from the same campaign (floating, banner, popup, badge...) | PARTIAL | Floating ads done (3 designs, positions, pages, preview). Not linked to campaigns or targeted by tier. |
| EL-01..07 ELITE subscription (plans 1/6/12 months, prepaid vs auto-renew, strict expiry, early renewal, benefits, Vault, gift/trial) | PARTIAL | `MembershipPlan`, subscription, benefits, history exist. Check: exact-minute expiry, no-auto-charge rules, Vault page, monthly claim, gift pass/trial codes. |
| EX-01..04 Missions, watchlist, bundles/early access, profile frames/badges | PARTIAL | Wishlist and alert subscriptions exist. Missions, price slots, badges/frames are missing. |
| CU-01..04 Customers: Customer 360, import/export, safe archive linking, protected data | MISSING | No admin "Customers" screen. Needs search/filters, 360 view, Excel/CSV import-export with preview and permissions, archive mapping. |
| B2B-01..04 Business accounts, wholesale prices, quotes, off-site deals, separate reward rules | MISSING | See LV-04. |
| OP-01..04 Payment is not delivery, reward costing, product info before redeeming, refund reversal | PARTIAL | Orders, idempotency and refunds exist. Needs reward-aware reversal and a margin check before a campaign is published. |
| Admin: roles/logs, exportable reports, notifications | PARTIAL | Roles, security, reports, communication exist; need new permissions and the reports above. |

## What I would do first (smallest steps that unlock the rest)
1. Customers admin: list/search/360 + export. Almost everything else (Stars, tiers, B2B, archive import) hangs on it.
2. Stars rules: earn rules per product/category, multipliers, pending/available. Builds on the existing ledger.
3. Tier ladder (Bronze-Diamond) as a setting with qualifying rules, kept separate from the Stars balance.
4. Per-tier theme/variants and tier-gated content.
5. Stars Shop, then ELITE Vault/monthly claim.
6. ELITE Business (B2B) last: biggest and most independent.

The brief itself says the numbers (rates, prices, limits) are set from the dashboard and are not final, so none of them should be hard-coded.
