# FinFlow Track Keyword Discovery and SEO Execution Plan

**Research date:** 2026-11-25  
**Google Search Console window:** 2026-10-26 to 2026-11-22  
**Property:** `sc-domain:finflowtrack.com`  
**Repository baseline:** `main` at `74e7f63607bb0ee2e61acde2cf0161cd23155169`

## Executive decision

Prioritize improvements to pages already earning relevant impressions and fix indexation/internal-linking issues on commercial pages. Do not publish another generic free-accounting or expense-tracking article yet: the repository already contains substantial coverage, including a recently refreshed free-accounting comparison, an expense guide consolidation, a 13-week cash-flow worksheet, and a break-even calculator.

Search Console supplies impressions, clicks, CTR, and average position—not monthly search volume, keyword difficulty, or CPC. Those metrics are intentionally not invented in this report.

## 1. Verified search demand and query clusters

### Free accounting software: strongest content opportunity

The existing page `/blog/free-accounting-software-for-small-business` recorded 843 impressions, 1 click, and an average position of 12.6 over the reporting window (approximately 0.12% CTR).

Selected query rows returned for this page:

| Query | Impressions | Average position | Interpretation |
| --- | ---: | ---: | --- |
| free business accounting apps worth considering | 47 | 9.7 | Broad commercial investigation |
| free bookkeeping platforms with reporting features | 37 | 8.8 | Reporting feature comparison |
| which free accounting programs can track invoices? | 35 | 10.8 | Invoicing capability comparison |
| easy small business accounting software free | 14 | 21.9 | Broad commercial investigation |
| recommend free accounting software for tracking sales | 13 | 10.3 | Sales tracking |
| free accounting solutions for a growing small business | 10 | 7.8 | Growth / plan suitability |
| best free accounting software for a small company | 9 | 9.2 | Commercial investigation |
| what accounting platforms are built around small business needs? | 9 | 9.3 | Product selection |

**Assigned URL:** `/blog/free-accounting-software-for-small-business`

**Primary topic:** free accounting software for small business.

**Secondary intents:** free accounting with invoicing, free bookkeeping with reports, sales tracking, free-plan limitations, and when a growing business needs a paid plan.

**Decision:** UPDATE, not CREATE. The page already received an update dated 2026-11-24 in its frontmatter. Recheck the rendered page and current SERP snippet before making another copy or another near-duplicate page. Google last recorded a crawl on 2026-09-23, so the current revision has not yet been confirmed as crawled.

### Business expense tracking: optimize existing asset

The existing `/blog/how-to-keep-track-of-business-expenses` page recorded 120 impressions and an average position of 18.5 in the reporting window.

Selected query rows include:

| Query | Impressions | Average position | Interpretation |
| --- | ---: | ---: | --- |
| manage business expenses online | 32 | 30.9 | Relevant but broad |
| business checking with expense tracking | 14 | 6.9 | Likely banking-intent mismatch |
| how to reconcile business expenses automatically without spreadsheets | 5 | 9.8 | Workflow / automation |
| how to track and categorize all fees and charges on a business bank account? | 4 | 10.8 | Banking-adjacent recordkeeping |

**Assigned URL:** `/blog/how-to-keep-track-of-business-expenses`

**Decision:** UPDATE the existing guide only where content can better satisfy expense recording, categorization, receipt retention, payment-fee recording, reconciliation, and software-selection intent. Do not describe FinFlow Track as a bank account or promise automatic bank reconciliation.

**Cannibalization caution:** The older opportunity database says `/blog/how-to-track-business-expenses` was consolidated and redirected. However, the current URL inspection returned that older URL as **Submitted and indexed**, with itself as Google's canonical URL and a last crawl on 2026-10-11. The intended primary URL was also indexed and self-canonical, with a last crawl on 2026-08-26. This conflicts with the earlier implementation log. Verify the live HTTP response and route/redirect configuration, then reconcile sitemap and internal links. Do not assume the redirect is working based only on the old log.

### Cash flow and financial reporting

Existing GSC evidence from the current project snapshot:

- Cash-flow forecasting guide: 69 impressions, average position 15.4.
- Cash-flow management guide: 81 impressions.
- Profit and loss guide: 69 impressions, average position 8.3.
- Balance sheet guide: 80 impressions, average position 9.4.

**Decision:** UPDATE existing pages and improve cross-linking. The repository already contains a 13-week cash-flow worksheet and break-even calculator. Avoid publishing another generic cash-flow or break-even article. For reporting guides, add practical explanations and examples only when supported by the product's actual reporting implementation.

### Commercial comparison pages

- FinFlow Track vs Wave: indexed; 3 page-specific query rows returned, each with very low impressions.
- FinFlow Track vs Xero: indexed; one query row returned with 4 impressions at average position 42.5.
- The broader opportunity database contains previously researched QuickBooks and Zoho Books comparisons. Continue to monitor their query and conversion performance; do not create another comparison hub.

**Decision:** improve comparison-page snippets, internal linking, and accurate feature/plan explanations after checking the actual competitor documentation. Avoid competitor pricing claims unless revalidated from official sources at the time of the change.

## 2. Indexing and technical discovery

Google URL Inspection returned these states during the research run:

| URL | Inspection result | Last crawl / note |
| --- | --- | --- |
| `/pricing` | Discovered — currently not indexed | No successful indexed crawl returned |
| `/compare` | Discovered — currently not indexed | No successful indexed crawl returned |
| `/features` | Submitted and indexed | 2026-10-28 |
| `/compare/finflow-track-vs-wave` | Submitted and indexed | 2026-11-18 |
| `/blog/free-accounting-software-for-small-business` | Submitted and indexed | 2026-09-23 |
| `/blog/how-to-keep-track-of-business-expenses` | Submitted and indexed | 2026-08-26 |
| `/blog/how-to-track-business-expenses` | Submitted and indexed | 2026-10-11; conflicts with prior redirect log |

### Required technical actions

1. Inspect the live `/pricing` and `/compare` responses for status code, canonical, robots directives, rendered content, and sitemap inclusion.
2. Add or confirm prominent contextual internal links to `/pricing` from the homepage, features, comparison hub, and relevant product-intent articles.
3. Add or confirm links to `/compare` from the navigation, homepage, and individual comparison pages.
4. Investigate the expense-guide redirect discrepancy. If the older URL is intended to redirect, verify a server-side permanent redirect to the primary URL; update sitemap and internal links to use only the primary canonical URL.
5. Request indexing in Search Console only after the live page is verified. A request is not a guarantee of indexing.
6. Reinspect URLs after Google has had time to recrawl.

## 3. Prioritized execution backlog

| Priority | Action | Target | Acceptance criteria | Status |
| --- | --- | --- | --- | --- |
| P0 | Verify and resolve pricing-page indexability | `/pricing` | Live 200 response, self-canonical, indexable robots, useful rendered plan content, sitemap presence, contextual internal links; request indexing after verification | Not started |
| P0 | Verify and resolve comparison-hub indexability | `/compare` | Live 200 response, self-canonical, indexable robots, unique useful hub content, sitemap presence, links from navigation and comparison pages | Not started |
| P0 | Reconcile expense-guide redirect discrepancy | Both expense-guide URLs | Older URL returns intended permanent redirect if consolidation is still the intended architecture; primary URL self-canonical; sitemap/internal links point to primary URL | Investigation required |
| P1 | Reassess free-accounting article after 2026-11-24 update | `/blog/free-accounting-software-for-small-business` | Rendered title/description match comparison intent; table and plan limits accurate; clear free-plan boundaries; useful internal links; no unsupported claims | Updated in repo; live/recrawl verification pending |
| P1 | Improve expense guide around relevant non-banking intent | `/blog/how-to-keep-track-of-business-expenses` | Covers recording, categorization, receipts, payment fees and reconciliation without implying bank-account functionality | Existing asset; optimization pending |
| P1 | Strengthen cash-flow and financial-reporting topic cluster | Existing cash-flow, P&L and balance-sheet URLs | Helpful internal links to existing worksheet/tool and relevant product reports; no duplicate generic articles | Existing assets; optimization pending |
| P2 | Improve comparison-page search snippets and conversion path | Existing Wave, QuickBooks, Xero and Zoho pages | Accurate product/competitor claims, country-specific caveats, transparent methodology, relevant links to pricing/signup | Monitor and validate |
| P2 | Validate new freelancer accounting landing page | New page only if justified | Distinct intent confirmed by query/SERP evidence; existing freelancer weekly-expense guide does not satisfy same intent; product capability fit verified | Research required |
| P3 | Validate multi-currency accounting topic | Existing multi-currency product capability | Independent search demand and SERP gap confirmed; accurate explanation of transaction-time exchange-rate locking | Research required |

## 4. New-content decisions: prevent duplication

Do **not** create these now:

- Another generic free accounting software comparison.
- Another broad how-to-track-business-expenses guide.
- Another generic cash-flow forecasting article.
- Another break-even calculator or explanatory article.
- Another comparison hub or duplicate competitor comparison.

Potential future topics, pending additional keyword/SERP validation:

1. Accounting software for freelancers — a distinct landing page only if search intent and product fit are demonstrated.
2. Multi-currency accounting software — explain the actual transaction recording and exchange-rate locking behavior; validate demand first.
3. A practical expense-tracking template — build only if it is materially more useful than the existing guide and template proposal.

## 5. Internal-linking map

Use descriptive anchors naturally; do not repeat exact-match anchors mechanically.

- Free-accounting guide → pricing, features, invoice creation guide, expense guide, and relevant comparison pages.
- Expense guide → expense-related product feature/help content, free-accounting guide, and reporting guides.
- Cash-flow forecasting guide → existing 13-week worksheet and cash-flow product/report explanation.
- P&L and balance-sheet guides → the relevant reporting feature page and one another where contextually useful.
- Comparison hub → each live comparison and pricing page.
- Homepage and features → pricing and comparison hub.

All links must point to verified live routes and the canonical host/path.

## 6. Measurement and analytics requirements

The available GA4 acquisition snapshot showed 9 sessions, 7 active users, 5 engaged sessions, and 0 recorded key events. One organic-search session landed on `/auth` and had 0% engagement. These numbers are a small snapshot, not a stable trend. The lack of recorded key events means organic acquisition cannot yet be tied reliably to meaningful product use.

Instrument or verify these events, with consent and privacy requirements respected:

- Registration started.
- Registration completed.
- First invoice created.
- First expense recorded.
- First financial report generated.
- Paid-plan checkout completed.

Report organic landing-page sessions and engaged sessions alongside registrations and first-value actions. Do not use pageviews or rankings as a substitute for activation.

## 7. Reporting and decision rules

- Review GSC query and page data on a consistent 28-day window and compare against the preceding equivalent period.
- Keep page-level and query-level data separate; query reports omit anonymized searches and query totals do not equal page totals.
- Record country only when the query report is explicitly country-filtered. Aggregate country impressions do not prove query-level country demand.
- Label GSC impressions as impressions, never monthly search volume.
- Do not invent search volume, keyword difficulty, CPC, backlinks, conversion rates, or revenue.
- Do not change publication dates to simulate freshness. Preserve original publication dates and update review metadata only when substantive changes are made.
- Do not publish or merge automatically. Preserve repository CI, human review, and production publishing controls.

## 8. Data provenance and limitations

- Search Console query-level data for the free-accounting and expense pages was retrieved on 2026-11-25 for 2026-10-26 through 2026-11-22.
- URL index status was retrieved through Google Search Console URL Inspection on 2026-11-25.
- Repository inventory and existing content were checked against the main branch at commit `74e7f63607bb0ee2e61acde2cf0161cd23155169`.
- The report uses GSC impressions, clicks, CTR, and average position. It does not include verified third-party monthly search volume, keyword difficulty, CPC, or a complete SERP competitor analysis.
- The GA4 snapshot is low volume and has no recorded key events; conclusions about conversion performance are therefore limited.

## 9. Research run log

| Date | Work | Outcome |
| --- | --- | --- |
| 2026-11-25 | Retrieved GSC query data for free-accounting and expense pages | Identified free accounting comparison as the strongest existing non-branded content opportunity |
| 2026-11-25 | Inspected pricing, comparison, features, Wave comparison, free-accounting and expense URLs | Found pricing and comparison hub discovered but not indexed; found older expense URL indexed despite prior redirect log |
| 2026-11-25 | Searched repository for existing topic coverage and tools | Confirmed free-accounting comparison, expense consolidation, freelancer weekly checklist, 13-week cash-flow worksheet and break-even calculator already exist |
| 2026-11-25 | Prepared prioritized backlog | Focus on indexability, redirect reconciliation, existing-page optimization and activation measurement; no duplicate article recommended |
