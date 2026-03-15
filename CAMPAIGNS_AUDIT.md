# Campaigns Tab Full Audit

**Date:** March 13, 2026  
**Scope:** All campaign pages, components, backend routes, controllers, services, and validators

---

## Architecture Overview

**Total:** 11,215 lines across 18 files

| Layer | Files | Lines |
|---|---|---|
| Frontend Pages | 8 (CampaignsList, CampaignCreate, CampaignDetail, CampaignEdit, CampaignTemplates, CampaignSchedule, CampaignReports, ABTesting) | 6,504 |
| Frontend Components | 4 (SubNav, ExecutionStatus, PreviewModal, AdvancedAudienceFilters) | 888 |
| Backend Controller | 1 | 1,379 |
| Backend Routes | 1 | 604 |
| Backend Services | 3 (Executor, Scheduler, Analytics) | 1,701 |
| Backend Validator | 1 | 139 |

### Routing (App.tsx lines 178–188)

| Route | Component | Description |
|---|---|---|
| `/campaigns` | CampaignsList | Main list with type filter tabs + status tabs |
| `/campaigns/create` | CampaignCreate | Multi-step wizard (Type → Details → Configure) |
| `/campaigns/:id` | CampaignDetail | Analytics + status dashboard |
| `/campaigns/:id/edit` | CampaignEdit | Edit campaign fields and content |
| `/campaigns/templates` | CampaignTemplates | Browse and use pre-built templates |
| `/campaigns/schedule` | CampaignSchedule | Manage scheduled and recurring campaigns |
| `/campaigns/reports` | CampaignReports | Two-tab view: Overview + Detailed Reports |
| `/campaigns/ab-testing` | ABTesting | Create, run, and analyze A/B tests |
| `/campaigns/email\|sms\|phone` | Redirect | Redirects to `/campaigns?type=...` |

---

## What's Working Well

1. **Full CRUD lifecycle** — Create, read, update, delete campaigns all connected to real API endpoints with React Query mutations and cache invalidation.
2. **Multi-channel support** — Email (full), SMS (full), Phone (coming soon placeholder), Social (coming soon). Graceful degradation with "Coming Soon" badges.
3. **Multi-step creation wizard** — 3-step flow (Type → Details → Configure) with save-as-draft, preview modal, and AI content generation integration.
4. **Real-time execution tracking** — `CampaignExecutionStatus` polls every 3s, shows phase progress (queued → sending → completed).
5. **Campaign preview before sending** — `CampaignPreviewModal` with DOMPurify sanitization for HTML content (XSS-safe).
6. **A/B Testing** — Full test creation, running, and results analysis with statistical significance charts.
7. **Advanced audience filters** — Custom filter builder with 10 field types, operators, and dynamic lead count.
8. **Templates system** — Backend-served templates with category filtering, search, and one-click campaign creation.
9. **Recurring campaigns** — Daily/weekly/monthly with day-of-week picker and occurrence limits.
10. **Three view modes** — List, Grid, Calendar views on the main campaigns list.
11. **Bulk actions** — Multi-select with status change, delete, export CSV.
12. **Role-based access control** — Backend uses `getRoleFilterFromRequest()` + `getCampaignsFilter()` for org-level isolation.
13. **Plan limit enforcement** — `enforcePlanLimit('campaigns')` on POST /api/campaigns.
14. **Rate limiting** — `sensitiveLimiter` on campaign creation.
15. **Lazy loading** — All campaign pages are lazy-loaded via `lazyWithRetry()` with Suspense + Error Boundaries.
16. **Zod validation** — Full request validation on both create and update with type-safe schemas.
17. **Email block editor** — Rich `EmailBlockEditor` component for building emails with templates.
18. **Budget tracking** — Budget vs. spent progress bar displayed on campaign cards.
19. **Export** — CSV export with dedicated `campaignExportColumns` configuration.
20. **TCPA compliance notice** — SMS campaigns show automatic STOP opt-out messaging.

---

## Visual UI Audit

**Date:** March 13, 2026  
**Method:** Manual screenshot review across all campaign sub-pages (All, Email, SMS, Phone, Templates, Schedule, Reports)

### Screenshots Reviewed

| Page | URL | Status |
|---|---|---|
| Campaigns List (All Types) | `/campaigns` | Reviewed |
| Campaigns List (Email filter) | `/campaigns?type=email` | Reviewed |
| Campaigns List (SMS filter) | `/campaigns?type=sms` | Reviewed |
| Campaigns List (Phone filter) | `/campaigns?type=phone` | Reviewed |
| Campaign Templates | `/campaigns/templates` | Reviewed |
| Campaign Schedule | `/campaigns/schedule` | Reviewed |
| Campaign Reports — Overview | `/campaigns/reports` (Overview tab) | Reviewed |
| Campaign Reports — Detailed | `/campaigns/reports` (Detailed Reports tab) | Reviewed |

### Visual Issues Found

#### V-P0 — Visual Bugs (Broken / Misleading)

| # | Issue | Page | Code Location | Details |
|---|---|---|---|---|
| V1 | **ROI by Campaign Type pie chart dataKey/label mismatch** | Campaigns List | `CampaignsList.tsx` L639–644 | Pie chart `dataKey="revenue"` but label renders `${type}: ${roi}%`. The chart slices are sized by revenue but labels show ROI %. This makes the visual proportions misleading — a high-revenue/low-ROI slice looks large but says "0%". Screenshot confirms "Email: 2865%, Sms: 3315%, Social: 0%" labels on a pie sized by revenue dollars, not ROI. |
| V2 | **Stats cards don't update when type filter changes** | Campaigns List (Email/SMS/Phone) | `CampaignsList.tsx` L500–560 | When filtering to Email (9), SMS (2), or Phone (1), the stats cards (Active: 6, Messages Sent: 2,454, Revenue: $197K, ROI: 1944%) remain identical across all filter views. The stats are computed from all campaigns regardless of `typeFilter`. Expected: stats should reflect the filtered subset. |
| V3 | **Budget Overview doesn't update with type filter** | Campaigns List (Email/SMS/Phone) | `CampaignsList.tsx` L580–610 | Budget Overview ($24,600 budget, $10,107.26 spent) stays the same when toggling Email/SMS/Phone. Should display budget totals for the selected type only. |
| V4 | **Performance charts don't update with type filter** | Campaigns List (Email/SMS/Phone) | `CampaignsList.tsx` L615–650 | The "Performance by Campaign Type" bar chart and "ROI by Campaign Type" pie chart show identical data regardless of which type tab is selected. When on the Email tab, the chart should highlight/isolate Email performance. |
| V5 | **Phone tab shows "Coming Soon" banner but still renders full dashboard below** | Campaigns List (Phone) | `CampaignsList.tsx` L334–340 | The Phone tab shows a yellow "Coming Soon" banner, but then renders all the same stats, budget overview, charts, search, and campaign list below it. Expected: Phone tab should show only the coming-soon message, or the dashboard should display phone-filtered data only. |

#### V-P1 — Visual Polish / UX Issues

| # | Issue | Page | Code Location | Details |
|---|---|---|---|---|
| V6 | **Revenue stat uses lossy "$XK" format** | Campaigns List | `CampaignsList.tsx` L544 | Total Revenue shows "$197K" (truncated from $197,000+). The Detailed Reports tab on the same app shows "$196,500.69". Using `/1000 + "K"` loses precision. Should match the Budget Overview format which uses `toLocaleString()` ($10,107.26). |
| V7 | **Average ROI shows unrealistically large "1944%"** | Campaigns List | `CampaignsList.tsx` L235–240 | ROI is calculated as `(totalRevenue / totalSpent) * 100` = ($197K / ~$10K) * 100 = ~1944%. This is technically correct but visually alarming. Should clarify units or add context (e.g., "19.4x return"). |
| V8 | **Campaign cards show raw ROI number without context** | Campaigns List | `CampaignsList.tsx` L950 | Campaign cards show ROI as raw numbers (3.76, 5.68, 6.52, 2.76) without a "%" or "x" suffix. The stat card says "1944%" but individual cards show "5.68" — inconsistent ROI representation. |
| V9 | **Campaign list shows raw ISO dates** | Campaigns List | `CampaignsList.tsx` L808 | "Started 2026-01-19T21:37:14.413Z" and "Started 2026-03-01T00:00:00.000Z" shown next to campaign names. Should be formatted as human-readable dates (e.g., "Jan 19, 2026"). |
| V10 | **Budget progress bars use different colors** | Campaigns List | `CampaignsList.tsx` L598 vs L980 | The main Budget Overview uses a blue-to-purple gradient, but individual campaign budget bars use solid `bg-blue-500`. Should be consistent. |
| V11 | **Budget progress bar can exceed container width** | Campaigns List | `CampaignsList.tsx` L980 | Individual campaign budget bars have no `Math.min(..., 100)` clamp. If `spent > budget`, the bar overflows. The main budget bar is safe (but should also clamp). |
| V12 | **Quick Start template icons don't match their types** | Campaigns List (bottom) | `CampaignsList.tsx` L1174–1203 | Newsletter uses `Mail` (correct), Promotional uses `Target` (should be a promotion/sale icon), Event Invite uses `CalendarIcon` (correct), Survey uses `MessageSquare` (a chat icon, should be a clipboard/form icon). |
| V13 | **Two Quick Start templates link to identical URL** | Campaigns List (bottom) | `CampaignsList.tsx` L1175, L1183 | Both Newsletter and Promotional link to `/campaigns/create?type=EMAIL` with no template differentiation. |
| V14 | **CampaignReports Overview shows "29%" open rate, "24%" click rate — different base calculations** | Reports (Overview) | `CampaignReports.tsx` L150–165 | Overview tab shows 29% open rate and 24% click rate, while Detailed Reports shows 29.2% open rate and 24.5% click rate. The Overview calculates from the analytics endpoint while Detailed calculates locally from campaign data. Slight discrepancy confuses users comparing tabs. |
| V15 | **Campaign Comparison table in Reports only shows 1 campaign** | Reports (Overview) | `CampaignReports.tsx` L218–250 | The Overview tab's "Campaign Comparison" table only shows "Weekly Market Report" with 0 sent, 0% rates. It comes from the analytics `topCampaigns` endpoint which may only return campaigns with specific criteria, while 13 campaigns exist. Expected: show all or top-performing campaigns. |
| V16 | **"Best Time to Send" bar chart Y-axis scale is too small** | Reports (Overview) | `CampaignReports.tsx` L277 | Y-axis caps at 1 with very small bars. The data values are tiny (0–1 range), suggesting the hourly open rates are expressed as fractions rather than percentages. All bars look almost the same height. |
| V17 | **"Top Performing Content" shows only 1 entry at 0%** | Reports (Overview) | `CampaignReports.tsx` L300–308 | Shows only "Weekly Market Report" with 0% open and 0% click. The `topCampaigns` from the analytics API is returning only campaigns with low/no engagement, not the actual top performers. |
| V18 | **Detailed Reports "Campaign Performance Details" shows all 13 campaigns** | Reports (Detailed) | `CampaignReports.tsx` L475–565 | Lists every campaign with full metric cards. For 13 campaigns, this creates a very long scrolling list. Should add pagination or collapsible sections. |
| V19 | **Templates page shows all stats with same `FileText` icon** | Templates | `CampaignTemplates.tsx` L145–170 | All 5 stat cards (Total, Email, SMS, Phone, Recurring) use the same gray `FileText` icon. Should use differentiated icons: `Mail` for Email, `MessageSquare` for SMS, `Phone` for Phone, `RefreshCw` for Recurring. |
| V20 | **Templates "SMS: 0" and "Phone: 0" stats shown prominently** | Templates | `CampaignTemplates.tsx` L145–170 | Two of five stats show "0" (SMS templates, Phone templates). Showing prominent zero-value stats wastes visual real estate and makes the system look incomplete. |
| V21 | **Schedule page shows raw date "2/26/2026" in recurring section** | Schedule | `CampaignSchedule.tsx` L250 | "Next send: 2/26/2026" uses short US date format. Inconsistent with the "Recently Sent" section which shows "2/21/2026 at 03:14 PM" format. Should standardize all dates. |
| V22 | **Schedule "Next Campaign" stat card shows "Scheduled" text instead of actual date** | Schedule | `CampaignSchedule.tsx` L145 | The stat card's large bold value shows the word "Scheduled" while the actual date is in tiny subtitle text below. The date is the valuable info and should be primary. |
| V23 | **Campaign type badge "SOCIAL" appears in recently sent list** | Schedule | `CampaignSchedule.tsx` L280 | "Social Media Lead Capture" shows `SOCIAL` badge, but Social campaigns are "Coming Soon" per the SubNav. Inconsistency: social campaigns exist in data but the channel is marked as unavailable. |
| V24 | **Funnel percentages show 1 decimal but bar widths don't align visually** | Reports (Detailed) | `CampaignReports.tsx` L600–640 | The funnel shows "Sent: 2,454 (100.0%)", "Delivered: 2,291 (93.4%)", "Opened: 670 (27.3%)", "Clicked: 164 (6.7%)", "Converted: 11 (0.4%)". The Converted bar is nearly invisible at 0.4% width. Consider a minimum visible width for non-zero values. |

#### V-P2 — Minor Visual Nits

| # | Issue | Page | Details |
|---|---|---|---|
| V25 | **View mode toggle icons lack labels/tooltips** | Campaigns List | The 3 view toggle icons (list/grid/calendar) have no tooltip or aria-label explaining what each does. |
| V26 | **Status tab counts could use color coding** | Campaigns List | Status tabs show "Active (6)", "Scheduled (0)", "Paused (0)", "Completed (4)" — the counts have no color distinction. Active count could be green, Paused amber, etc. |
| V27 | **SubNav "Phone" badge says "Soon" — not obvious it means "Coming Soon"** | All campaign pages | The amber badge next to "Phone" reads "Soon" which is abbreviated. Could say "Coming Soon" or use a tooltip. |
| V28 | **Chart grid lines visible on empty chart areas** | Campaigns List & Reports | When charts have sparse data (Phone/Social bars at 0), the grid lines dominate the empty space. |
| V29 | **Detailed Reports "Best Open Rate" and "Best Click Rate" use different green/purple colors** | Reports (Detailed) | Best Open Rate percentages are green, Best Click Rate are purple. While intentional for differentiation, it's not explained and doesn't match the funnel colors. |
| V30 | **Campaign list checkboxes have no visual "select all" header** | Campaigns List | Individual campaign cards have checkboxes, but there's no "select all" checkbox in the header to select/deselect all at once. |

---

## Issues Found

### P0 — Critical Bugs

| # | Issue | File (line) | Details |
|---|---|---|---|
| 1 | **Row menu not closing on outside click** | `CampaignsList.tsx` (~L830) | The `showRowMenu` state is toggled on button click, but there's no click-outside handler. Clicking another area of the page doesn't close the dropdown — it stays open, blocking other interactions. |
| 2 | **Grid view row menu is duplicated with fewer options** | `CampaignsList.tsx` (~L1006) | The grid view row menu lacks Pause/Resume, Send Now, and Archive/Unarchive options that exist in the list view. Inconsistent feature parity between views. |
| 3 | **`useEffect` dependency on `searchParams.toString()`** | `CampaignCreate.tsx` (~L75) | The `useEffect` depends on `searchParams.toString()` which creates a new string every render. This causes the effect to run repeatedly. Should use specific params like `searchParams.get('type')` and `searchParams.get('templateId')`. |

### P1 — Functional Issues

| # | Issue | File (line) | Details |
|---|---|---|---|
| 4 | **Bulk delete fires mutations sequentially without batching** | `CampaignsList.tsx` (~L286) | `handleBulkDelete` calls `deleteCampaignMutation.mutate()` in a `forEach` loop, firing N separate API calls. Should use a batch delete endpoint or `Promise.all`. Same issue with `handleStatusChange`. |
| 5 | **Campaign search doesn't debounce** | `CampaignsList.tsx` (~L53) | `searchQuery` state change triggers API refetch immediately on every keystroke (included in query key). Should debounce search input. |
| 6 | **CampaignDetail edit modal date validation ignores timezone** | `CampaignDetail.tsx` (~L253) | The inline edit form validates `startDate < new Date()` but doesn't account for timezone offsets. Also, editing an already-active campaign's start date to the past would fail silently. |
| 7 | **Missing pagination on campaign list** | `CampaignsList.tsx` (~L58) | The API supports pagination (`page`, `limit`) but the frontend fetches all campaigns without pagination UI. For users with 100+ campaigns, this will load everything at once. |
| 8 | **`deviceData` and `geoData` always return empty arrays** | `CampaignDetail.tsx` (~L148-155) | `deviceData` and `geoData` `useMemo` hooks return `[]` with a comment "Phase 8.9: Fetch real..." but the actual API queries (`deviceBreakdownData`, `geoBreakdownData`) are fetched separately and fall back to these empty arrays. If the breakdown APIs fail, the sections render nothing with no fallback message. |
| 9 | **CampaignSchedule "Send Now" confirmation state could go stale** | `CampaignSchedule.tsx` (~L109) | `handleSendNow` uses a local `confirmAction` state for confirmation. If the page re-renders between opening the confirm dialog and confirming, the action ref could be stale. |
| 10 | **EmailCampaigns, SMSCampaigns, PhoneCampaigns are dead code** | `EmailCampaigns.tsx`, `SMSCampaigns.tsx`, `PhoneCampaigns.tsx` | These 3 files (~450 lines total) are no longer routed — redirected to CampaignsList with query params per App.tsx L50. They should be deleted. |

### P2 — UX / Polish Issues

| # | Issue | File (line) | Details |
|---|---|---|---|
| 11 | **Quick Start Templates link to same URL for Newsletter and Promotional** | `CampaignsList.tsx` (~L1188-1198) | Two of the four "Quick Start" cards link to `/campaigns/create?type=EMAIL` without differentiating the template. Should link to specific templates or pre-fill different campaign names. |
| 12 | **"Survey" quick start card uses wrong icon** | `CampaignsList.tsx` (~L1200) | The Survey card shows `MessageSquare` (chat icon) but is linked to EMAIL type. Should have a distinct survey icon. |
| 13 | **CampaignEdit doesn't show SubNav** | `CampaignEdit.tsx` | Unlike every other campaign page, CampaignEdit doesn't render `<CampaignsSubNav />`, breaking navigation consistency. |
| 14 | **Calendar view is a date-grouped list, not a visual calendar** | `CampaignsList.tsx` (~L1160) | The "calendar" view is a simple date-grouped list, not a visual calendar grid. The CalendarIcon toggle implies a real calendar. |
| 15 | **No loading state for row menu actions** | `CampaignsList.tsx` (~L860-900) | Pause, Resume, Send Now actions from the row menu don't show loading indicators. User can click multiple times. |
| 16 | **CampaignReports uses `any` types extensively** | `CampaignReports.tsx` (~L228) | Multiple `any` type annotations in the DetailedReportsTab and OverviewTab reduce type safety. |
| 17 | **ABTesting create form lacks validation** | `ABTesting.tsx` (~L26) | The `createErrors` state is initialized but never populated — no visible form validation for the A/B test creation form. |
| 18 | **Budget progress bar can exceed 100%** | `CampaignsList.tsx` (~L937) | Budget progress width: `((campaign.spent / campaign.budget) * 100)%` has no `Math.min(..., 100)` clamp, so overspending shows broken UI. |
| 19 | **MMS preview renders unvalidated external URL as `<img src>`** | `CampaignCreate.tsx` (~L733) | The MMS Media URL input renders `<img src={formData.mediaUrl}>` directly from user input. While this is local preview only, a URL validation check before rendering would be better practice. |
| 20 | **Campaign Comparison table shows `undefined` for null metrics** | `CampaignsList.tsx` (~L758) | If a selected comparison campaign has null values for sent/opened/clicked, it shows `undefined` in the table cells instead of 0. |

### P3 — Code Quality

| # | Issue | File | Details |
|---|---|---|---|
| 21 | **CampaignsList.tsx is 1,417 lines** | `CampaignsList.tsx` | Should extract: (a) campaign row/card into `CampaignCard`, (b) modals into separate components, (c) stats section into `CampaignStats`, (d) chart section into `CampaignCharts`. |
| 22 | **CampaignCreate.tsx is 1,374 lines** | `CampaignCreate.tsx` | Massive form state (20+ fields). Each step (Type, Details, Configure) should be its own component. |
| 23 | **CampaignDetail.tsx is 1,290 lines** | `CampaignDetail.tsx` | Contains inline edit modal, delete modal, content modal, multiple chart sections, and deliverability stats all in one file. |
| 24 | **Custom modals instead of shared Dialog component** | `CampaignsList.tsx` (~L1211-1350) | Status, Delete, Duplicate, and Quick Create modals are hand-built with `fixed inset-0` divs instead of using the existing `Dialog` component (used in CampaignPreviewModal). |
| 25 | **Inconsistent export patterns** | Various | Some pages use `export default function`, others use `const` + `export default` at bottom, others use named function + `export default` at bottom. |

---

## Security Assessment

| Area | Status | Notes |
|---|---|---|
| **Access Control** | ✅ Pass | All routes behind `authenticate` middleware. Campaign queries filter by `organizationId`. |
| **Input Validation** | ✅ Pass | Zod schemas validate all create/update payloads. Query params validated. |
| **XSS Prevention** | ✅ Pass | CampaignPreviewModal uses DOMPurify for HTML sanitization. |
| **Rate Limiting** | ✅ Pass | `sensitiveLimiter` on campaign creation. |
| **SQL Injection** | ✅ Pass | Prisma ORM parameterizes all queries. |
| **IDOR** | ✅ Pass | Backend verifies `organizationId` ownership on all operations. |
| **File Upload** | ✅ Pass | `attachmentUpload` middleware handles file upload with limits (5 files, 10MB each). |

---

## Backend API Coverage

| Endpoint | Frontend Usage | Status |
|---|---|---|
| `GET /api/campaigns` | CampaignsList, Schedule, Reports | ✅ Connected |
| `GET /api/campaigns/:id` | CampaignDetail, CampaignEdit | ✅ Connected |
| `POST /api/campaigns` | CampaignCreate, Quick Create | ✅ Connected |
| `PATCH /api/campaigns/:id` | CampaignEdit, Status changes | ✅ Connected |
| `DELETE /api/campaigns/:id` | Delete action | ✅ Connected |
| `POST /api/campaigns/:id/send` | Send campaign | ✅ Connected |
| `POST /api/campaigns/:id/send-now` | Schedule page Send Now | ✅ Connected |
| `POST /api/campaigns/:id/pause` | Pause action | ✅ Connected |
| `PATCH /api/campaigns/:id/reschedule` | Schedule page reschedule | ✅ Connected |
| `GET /api/campaigns/:id/preview` | Preview modal | ✅ Connected |
| `POST /api/campaigns/compile-email` | Email block editor | ✅ Connected |
| `POST /api/campaigns/upload-attachments` | File attachments | ✅ Connected |
| `GET /api/campaigns/templates` | Templates page | ✅ Connected |
| `POST /api/campaigns/from-template/:id` | Create from template | ✅ Connected |
| `POST /api/campaigns/:id/duplicate` | Duplicate action | ✅ Connected |
| `POST /api/campaigns/:id/archive` | Archive action | ✅ Connected |
| `POST /api/campaigns/:id/unarchive` | Unarchive action | ✅ Connected |
| `GET /api/campaigns/:id/analytics` | Detail page analytics | ✅ Connected |
| `GET /api/campaigns/:id/execution-status` | Execution status polling | ✅ Connected |
| `POST /api/campaigns/:id/track-open` | Tracking pixel | ✅ Connected |
| `POST /api/campaigns/:id/track-click` | Link tracking | ✅ Connected |

All 20+ API endpoints are wired to frontend consumers. No orphan endpoints found.

---

## Summary

The campaigns tab is **feature-complete and well-connected** across frontend and backend with strong security posture. The main areas for improvement are:

### Code / Logic Issues
- **P0 (3 items):** Fix the row menu click-outside handler, synchronize grid/list view menu options, and fix the `useEffect` dependency in CampaignCreate
- **P1 (7 items):** Add search debouncing, pagination UI, batch operations, and remove 3 dead code files (~450 lines)
- **P2 (10 items):** Polish budget overflow, comparison table null handling, consistent SubNav usage, and form validation
- **P3 (5 items):** Break up the 3 mega-files (1,200–1,400 lines each) into smaller components for maintainability

### Visual / UI Issues (from screenshot audit)
- **V-P0 (5 items):** Pie chart data/label mismatch, stats/budget/charts not updating with type filter, Phone tab rendering full dashboard below "Coming Soon" banner
- **V-P1 (19 items):** Revenue format inconsistency ($197K vs $196,500.69), raw ISO dates in campaign cards, ROI shown without units, template icon mismatches, Reports tabs showing inconsistent data, empty "Best Time to Send" / "Top Performing" sections, Schedule page date formatting
- **V-P2 (6 items):** Missing view toggle tooltips, no "select all" checkbox, abbreviated "Soon" badge, chart grid lines on empty areas

### Priority Fix Order
1. **V1–V5** — Type filter tabs don't actually filter stats/charts/budget (highest visual impact)
2. **P0 #1–3** — Click-outside handler, grid view menu parity, useEffect dependency
3. **V6, V8, V9** — Revenue formatting, ROI units, ISO date formatting (data presentation)
4. **V15–V17** — Reports Overview showing empty/single-campaign data
5. **P1 #4–5** — Bulk delete batching, search debouncing (functional UX)
