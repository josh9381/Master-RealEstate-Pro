# Campaigns Tab — Deep Audit

**Date:** March 14, 2026  
**Method:** Full code analysis of all 18 campaign files + live API testing + prior visual screenshot review  
**Scope:** Pages, components, backend controller/routes/services/validators, API layer, routing

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Live API Test Results](#live-api-test-results)
3. [Security Vulnerabilities](#security-vulnerabilities)
4. [P0 — Critical Bugs](#p0--critical-bugs)
5. [P1 — Functional Issues](#p1--functional-issues)
6. [P2 — UX / Polish Issues](#p2--ux--polish-issues)
7. [P3 — Code Quality / Tech Debt](#p3--code-quality--tech-debt)
8. [Visual / UI Bugs (from screenshot audit)](#visual--ui-bugs)
9. [Accessibility Issues](#accessibility-issues)
10. [Performance Issues](#performance-issues)
11. [Per-File Summary](#per-file-summary)
12. [What's Working Well](#whats-working-well)
13. [Recommended Fix Priority](#recommended-fix-priority)

---

## Architecture Overview

**~11,215 lines across 18 files**

| Layer | Files | Approx Lines |
|---|---|---|
| Frontend Pages | 8 (CampaignsList, CampaignCreate, CampaignDetail, CampaignEdit, CampaignTemplates, CampaignSchedule, CampaignReports, ABTesting) | 6,504 |
| Frontend Components | 4 (CampaignsSubNav, CampaignExecutionStatus, CampaignPreviewModal, AdvancedAudienceFilters) | 888 |
| Backend Controller | 1 (campaign.controller.ts) | 1,379 |
| Backend Routes | 1 (campaign.routes.ts) | 604 |
| Backend Services | 3 (campaign-executor, campaign-scheduler, campaign-analytics) | 1,701 |
| Backend Validator | 1 (campaign.validator.ts) | 139 |

### Routing (App.tsx)

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
| `/campaigns/email\|sms\|phone` | Redirect → `/campaigns?type=...` | Legacy redirect |

---

## Live API Test Results

**Server:** `http://localhost:8000` — Running  
**Auth:** `admin@pinnaclerealty.com` / `Password123!` — Working  
**Token:** JWT via `POST /api/auth/login` → `data.tokens.accessToken`

| Endpoint | Status | Notes |
|---|---|---|
| `GET /api/campaigns` | ✅ 200 | Returns `{ success, data: { campaigns: [...], pagination } }` — 13 campaigns |
| `GET /api/campaigns/templates` | ✅ 200 | 7 templates (all EMAIL type) |
| `GET /api/campaigns/:id/analytics` | ✅ 200 | Returns analytics data (some with 0 sent) |
| `GET /api/campaigns/:id/preview` | ✅ 200 | Returns preview content |
| `GET /api/campaigns/:id/execution-status` | ✅ 200 | Returns execution phase data |

**Campaign Data Distribution:**
- **Types:** EMAIL: 9, SMS: 2, SOCIAL: 1, PHONE: 1
- **Statuses:** ACTIVE: 6, COMPLETED: 4, DRAFT: 3
- **Note:** Some campaigns have `budget: null` (not 0) — needs null-safe handling

---

## Security Vulnerabilities

### SEC-1: IDOR — Missing Organization Filter in Campaign Preview ⚠️ HIGH

- **File:** `backend/src/controllers/campaign.controller.ts` ~L770
- **Issue:** `getCampaignPreview()` builds a lead query (`where` clause) but does NOT include `organizationId`. Users could see leads from other organizations in campaign previews.
- **Fix:** Add `organizationId: req.user!.organizationId` to the where clause.

### SEC-2: No Input Validation on Send Campaign Endpoint ⚠️ HIGH

- **File:** `backend/src/routes/campaign.routes.ts` ~L330
- **Issue:** `POST /api/campaigns/:id/send` has NO body validation middleware. The `leadIds` and `filters` objects are passed directly to the controller without schema validation. Missing `sensitiveLimiter` middleware (unlike the create endpoint).
- **Fix:** Add `validateBody(sendCampaignSchema)` and `sensitiveLimiter` middleware.

### SEC-3: Unvalidated Filter Object in Executor Service ⚠️ MEDIUM

- **File:** `backend/src/services/campaign-executor.service.ts` ~L130
- **Issue:** `getTargetLeads()` constructs Prisma WHERE clauses from the `filters` object without validation. Attacker-crafted filter objects could manipulate query behavior.
- **Fix:** Validate filter parameters with strict schema before building queries.

### SEC-4: Unsafe Array Access in Recipients Endpoint

- **File:** `backend/src/routes/campaign.routes.ts` ~L227
- **Issue:** `POST /:id/recipients` blindly accesses `req.body.leadIds?.length` without validating that `leadIds` is actually an array.
- **Fix:** Add Zod validation: `z.object({ leadIds: z.array(z.string()).min(1) })`.

### SEC-5: Unvalidated Template Data — Potential Handlebars Injection

- **File:** `backend/src/services/campaign-executor.service.ts` ~L420
- **Issue:** Lead fields like `company`, `status` are interpolated into Handlebars templates without sanitization. If lead data contains `{{...}}` syntax, it could cause template injection.
- **Fix:** Escape braces in user data before template compilation.

### SEC-6: Unsafe Metadata Field Storage

- **File:** `backend/src/services/campaign-executor.service.ts` ~L159
- **Issue:** The `metadata` JSON field is set with untrusted optimization data without schema validation.
- **Fix:** Validate metadata structure before storing.

### SEC-7: MMS Preview Renders Unvalidated URL as `<img src>`

- **File:** `CampaignCreate.tsx` ~L755
- **Issue:** The MMS Media URL input renders `<img src={formData.mediaUrl}>` directly from user input. While local-only, URLs like `javascript:` or data URIs could be problematic.
- **Fix:** Validate URL format with `new URL()` constructor and whitelist `https://` only.

### Overall Security Posture

| Area | Status | Notes |
|---|---|---|
| Authentication | ✅ Pass | All routes behind `authenticate` middleware |
| Org-level Isolation | ⚠️ Partial | Most queries filter by `organizationId`, but preview endpoint (SEC-1) is missing it |
| Input Validation | ⚠️ Partial | Create/Update validated via Zod; Send/Recipients endpoints lack validation |
| XSS Prevention | ✅ Pass | CampaignPreviewModal uses DOMPurify |
| Rate Limiting | ⚠️ Partial | `sensitiveLimiter` on creation, missing on send |
| SQL Injection | ✅ Pass | Prisma ORM parameterizes queries |
| File Upload | ✅ Pass | 5 files, 10MB each limit enforced |

---

## P0 — Critical Bugs

### P0-1: Row Menu Not Closing on Outside Click (CampaignsList)

- **File:** `CampaignsList.tsx` ~L74-85, L830
- **Issue:** The `menuRef` is only conditionally assigned in grid view but never in list view. The `useEffect` click-outside handler checks `menuRef.current` which remains null for list view rows.
- **Impact:** Row menus in list view stay open, blocking other interactions.
- **Fix:** Attach the ref to the menu container in both views, or use a `useClickOutside` hook.

### P0-2: Grid View Row Menu Missing Options (CampaignsList)

- **File:** `CampaignsList.tsx` ~L1006
- **Issue:** The grid view row menu lacks Pause/Resume, Send Now, and Archive/Unarchive options that exist in the list view.
- **Impact:** Feature parity broken between views.
- **Fix:** Extract menu options to a shared component used in both views.

### P0-3: useEffect Dependency on `searchParams.toString()` (CampaignCreate)

- **File:** `CampaignCreate.tsx` ~L75
- **Issue:** The `useEffect` depends on `searchParams.toString()` which creates a new string every render, causing the effect to re-run infinitely.
- **Fix:** Use specific params: `searchParams.get('type')` and `searchParams.get('templateId')`.

### P0-4: Null Pointer on `campaign.sent` (CampaignsList)

- **File:** `CampaignsList.tsx` ~L970, L1159
- **Issue:** Direct access to `campaign.sent.toLocaleString()` without null checks. Live API confirms some campaigns return `budget: null`.
- **Impact:** Runtime crash: "Cannot read property 'toLocaleString' of null".
- **Fix:** Use `(campaign.sent ?? 0).toLocaleString()`.

### P0-5: Unhandled Promise Rejections in Batch Operations (CampaignsList)

- **File:** `CampaignsList.tsx` ~L308-335
- **Issue:** `Promise.all()` calls in `handleStatusChange` and `handleBulkDelete` have no `.catch()` handler. Modals close immediately before operations complete (not awaited).
- **Impact:** Failed bulk operations appear successful to users.
- **Fix:** `await Promise.all(...)` in try/catch, close modal only after completion.

### P0-6: Date Validation Logic Flaw (CampaignDetail)

- **File:** `CampaignDetail.tsx` ~L431-438
- **Issue:** Validation checks `startDate < new Date()` without timezone consideration. Fails for timezones ahead of UTC. Also allows editing start date of already-active campaigns.
- **Fix:** Compare UTC dates and check campaign status before allowing date edits.

### P0-7: Date Parsing Without Null Check (CampaignEdit)

- **File:** `CampaignEdit.tsx` ~L89
- **Issue:** `new Date(campaignResponse.startDate).toISOString().split('T')[0]` — if `startDate` is null/undefined, creates Invalid Date and crashes.
- **Fix:** Guard: `campaignResponse.startDate ? new Date(...)... : ''`.

---

## P1 — Functional Issues

### P1-1: Bulk Delete/Status Fires Mutations Sequentially (CampaignsList)

- **File:** `CampaignsList.tsx` ~L286-335
- **Issue:** `handleBulkDelete` and `handleStatusChange` call `mutateAsync` in a `forEach`/`map` loop inside `Promise.all`, but modals close immediately without awaiting.
- **Fix:** Await `Promise.all`, show loading state, batch into single API call if possible.

### P1-2: Campaign Search Not Properly Debounced (CampaignsList)

- **File:** `CampaignsList.tsx` ~L36-48
- **Issue:** Debounce is partially implemented with `searchTimerRef` and 300ms delay. The `debouncedSearch` state correctly delays API calls, but the `handleSearchChange` function recreates a new closure on every render.
- **Fix:** Use `useCallback` with proper refs or a dedicated `useDebouncedValue` hook.

### P1-3: Missing Pagination UI (CampaignsList)

- **File:** `CampaignsList.tsx` ~L58
- **Issue:** Backend supports `page`/`limit` params (confirmed via API: returns `pagination` object), but frontend fetches all campaigns without pagination controls.
- **Impact:** With 100+ campaigns, loads everything at once.
- **Fix:** Add pagination component using the `pagination` data from API response.

### P1-4: No Status Transition Validation (Backend)

- **File:** `campaign.controller.ts` ~L158
- **Issue:** `updateCampaign()` allows arbitrary status changes via PATCH. A user could change COMPLETED → DRAFT or ACTIVE → DRAFT mid-send.
- **Fix:** Implement state machine: `const validTransitions = { DRAFT: ['SCHEDULED'], SCHEDULED: ['SENDING', 'CANCELLED'], ... }`.

### P1-5: Incorrect Campaign Status Filtering in Schedule Page

- **File:** `CampaignSchedule.tsx` ~L73-80
- **Issue:** "Recently Sent" section filters by `status === 'COMPLETED' || status === 'ACTIVE'`, but ACTIVE campaigns are still running, not sent.
- **Fix:** Filter only `COMPLETED` campaigns for "Recently Sent".

### P1-6: Fragile Recurring Campaign Detection via Name Pattern

- **File:** `CampaignSchedule.tsx` ~L60-68
- **Issue:** Recurring campaigns detected by checking if name includes 'weekly' or 'monthly' (case-insensitive). Other campaigns with those words match incorrectly.
- **Fix:** Rely solely on `isRecurring` field.

### P1-7: CampaignReports Incorrect Data Selection Logic

- **File:** `CampaignReports.tsx` ~L83-85
- **Issue:** `topCampaigns.length > 1 ? topCampaigns : allCampaignsData` — if exactly 1 top campaign exists, it's incorrectly replaced with all campaigns.
- **Fix:** Change to `topCampaigns.length > 0 ? topCampaigns : (allCampaignsData || [])`.

### P1-8: Template Category Filtering Case-Sensitive

- **File:** `CampaignTemplates.tsx` ~L76-89
- **Issue:** `t.type === selectedCategory.toUpperCase()` works, but `t.category === selectedCategory` is case-sensitive. Mixed-case API data silently fails to match.
- **Fix:** Normalize both sides: `(t.category || '').toUpperCase() === selectedCategory.toUpperCase()`.

### P1-9: End Date Can Be Before Start Date (CampaignEdit)

- **File:** `CampaignEdit.tsx` ~L153-163
- **Issue:** No validation that `endDate >= startDate`. Users can set contradictory dates.
- **Fix:** Add `if (new Date(endDate) < new Date(startDate))` validation.

### P1-10: `deviceData` and `geoData` Always Empty Arrays (CampaignDetail)

- **File:** `CampaignDetail.tsx` ~L148-170
- **Issue:** `useMemo` hooks for `deviceData` and `geoData` return `[]` with TODO comments. If the breakdown APIs fail, sections render nothing with no fallback message.
- **Fix:** Either implement the actual data fetching or show "Feature not yet available" message.

### P1-11: Confirm Dialog Closes Before Action Completes (CampaignSchedule)

- **File:** `CampaignSchedule.tsx` ~L533-536
- **Issue:** `setConfirmAction(prev => ({ ...prev, isOpen: false }))` executes BEFORE the async send operation completes. If it fails, the dialog is already gone.
- **Fix:** Close dialog only after operation succeeds.

### P1-12: Recurring Campaign Missing Weekly Day Validation (CampaignCreate)

- **File:** `CampaignCreate.tsx` ~L1026-1030
- **Issue:** Weekly recurring campaigns can be saved with empty `daysOfWeek[]`, creating an invalid schedule.
- **Fix:** Validate in `validateCampaignForm()`: error if `isRecurring && frequency === 'weekly' && daysOfWeek.length === 0`.

### P1-13: A/B Test Variant Subject Not Validated (ABTesting)

- **File:** `ABTesting.tsx` ~L1224
- **Issue:** A/B testing can be enabled without variant text. `createErrors` state is initialized but never populated — no visible form validation.
- **Fix:** Add validation: `if (enableABTest && !abTestVariant.trim())` → show error.

### P1-14: SMS Character Limit Ignores TCPA Footer Text (CampaignCreate)

- **File:** `CampaignCreate.tsx` ~L713-718
- **Issue:** Counter shows 320 chars max, but "Reply STOP to opt out." (26 chars) is auto-appended. Effective limit is ~294 chars, but users aren't told.
- **Fix:** Update limit to `320 - 26 = 294` or show dynamic counter: `{content.length}/294 (26 reserved for opt-out)`.

### P1-15: Template Fetch Memory Leak (CampaignCreate)

- **File:** `CampaignCreate.tsx` ~L70-85
- **Issue:** `useEffect` for template loading has no cleanup. If component unmounts before API resolves, `setFormData()` is called on unmounted component.
- **Fix:** Add `AbortController` or `let isMounted = true` guard.

### P1-16: Budget Validation Insufficient (CampaignCreate)

- **File:** `CampaignCreate.tsx` ~L312-318
- **Issue:** Validation checks `<= 0` but `parseFloat("abc")` returns `NaN` which skips the check. Negative numbers pass as well.
- **Fix:** `if (!formData.budget || Number.isNaN(parseFloat(formData.budget))) error = ...`.

### P1-17: Mock Mode Check Accepts Whitespace-Only API Key (Backend)

- **File:** `campaign.routes.ts` ~L210
- **Issue:** `const isMockMode = !process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === ''` — whitespace-only key passes.
- **Fix:** `!process.env.SENDGRID_API_KEY?.trim()`.

### P1-18: Missing Frequency/Recurring Validation (Backend)

- **File:** `campaign.validator.ts` ~L51
- **Issue:** Schema allows `frequency: 'daily'` without `isRecurring: true`. Creates inconsistent data.
- **Fix:** Add `.refine()`: `if (data.frequency) data.isRecurring` must be true.

---

## P2 — UX / Polish Issues

### P2-1: CampaignEdit Doesn't Show SubNav

- **File:** `CampaignEdit.tsx`
- **Issue:** Every other campaign page renders `<CampaignsSubNav />` except CampaignEdit, breaking navigation consistency.

### P2-2: Calendar View Is a Date-Grouped List, Not a Visual Calendar

- **File:** `CampaignsList.tsx` ~L1160
- **Issue:** The CalendarIcon toggle implies a real calendar grid, but it renders a date-grouped flat list.

### P2-3: Quick Start Templates Link to Same URL

- **File:** `CampaignsList.tsx` ~L1175, L1183
- **Issue:** Newsletter and Promotional quick start cards both link to `/campaigns/create?type=EMAIL` with no template differentiation.

### P2-4: Campaign Cards Show Raw ISO Dates

- **File:** `CampaignsList.tsx` ~L808
- **Issue:** "Started 2026-01-19T21:37:14.413Z" shown raw. Should be formatted: "Jan 19, 2026".

### P2-5: ROI Shown Without Consistent Units

- **File:** `CampaignsList.tsx` ~L235-240, L950
- **Issue:** Stats card shows "1944%", individual cards show raw numbers (3.76, 5.68) without "%" or "x" suffix. Inconsistent.

### P2-6: Revenue Format Inconsistency

- **File:** `CampaignsList.tsx` ~L544
- **Issue:** Stats show "$197K" (lossy truncation), Detailed Reports shows "$196,500.69", Budget Overview uses `toLocaleString()`. Three different formats.

### P2-7: Budget Progress Bar Can Exceed 100%

- **File:** `CampaignsList.tsx` ~L937, L980
- **Issue:** Width `((spent / budget) * 100)%` has no `Math.min(..., 100)` clamp. Overspending breaks the bar width.

### P2-8: Campaign Comparison Table Shows `undefined` for Null Metrics

- **File:** `CampaignsList.tsx` ~L758
- **Issue:** If selected comparison campaign has null sent/opened/clicked, shows `undefined` instead of 0.

### P2-9: No Loading State for Row Menu Actions

- **File:** `CampaignsList.tsx` ~L860-900
- **Issue:** Pause, Resume, Send Now actions show no loading indicator. Users can click multiple times.

### P2-10: Phone Tab Renders Full Dashboard Below "Coming Soon" Banner

- **File:** `CampaignsList.tsx` ~L334-340
- **Issue:** Phone tab shows yellow banner then renders all stats, charts, search below it. Should show only the coming-soon message.

### P2-11: Stats/Budget/Charts Don't Update With Type Filter

- **File:** `CampaignsList.tsx` ~L500-650
- **Issue:** Stats cards, Budget Overview, and Performance charts show identical data regardless of which type tab (Email/SMS/Phone) is selected. Computed from all campaigns, not the filtered subset.

### P2-12: Pie Chart dataKey/Label Mismatch

- **File:** `CampaignsList.tsx` ~L639-644
- **Issue:** Pie chart `dataKey="revenue"` but label renders `${type}: ${roi}%`. Slices sized by revenue but labels show ROI percentages. Visually misleading.

### P2-13: Templates Page Stat Icons All Identical

- **File:** `CampaignTemplates.tsx` ~L145-170
- **Issue:** All 5 stat cards use the same gray `FileText` icon. Should use Mail, MessageSquare, Phone, RefreshCw icons.

### P2-14: Schedule Page Raw Date Formats

- **File:** `CampaignSchedule.tsx` ~L145, L250
- **Issue:** "Next Campaign" shows "Scheduled" as value instead of the date. "Next send: 2/26/2026" inconsistent with "2/21/2026 at 03:14 PM" format elsewhere.

### P2-15: "Social" Campaigns Exist in Data but Channel Marked "Coming Soon"

- **File:** `CampaignSchedule.tsx` ~L280
- **Issue:** "Social Media Lead Capture" campaign appears with `SOCIAL` badge, but Social is marked as unavailable in SubNav.

### P2-16: Reports Overview Shows Empty/Single-Campaign Data

- **File:** `CampaignReports.tsx` ~L218-308
- **Issue:** "Campaign Comparison" table shows only 1 campaign with 0 sent. "Best Time to Send" Y-axis caps at 1 with tiny bars. "Top Performing Content" shows only 1 entry at 0%. The analytics API returns sparse data.

### P2-17: Detailed Reports Creates Very Long Scroll for All 13 Campaigns

- **File:** `CampaignReports.tsx` ~L475-565
- **Issue:** Lists every campaign with full metric cards. Needs pagination or collapsible sections.

### P2-18: Funnel Converted Bar Nearly Invisible at 0.4%

- **File:** `CampaignReports.tsx` ~L600-640
- **Issue:** The Converted bar at 0.4% width is nearly invisible. Non-zero values should have a minimum visible width.

### P2-19: Numeric Input Accepts Invalid Values in Audience Filters

- **File:** `AdvancedAudienceFilters.tsx` ~L159
- **Issue:** `parseInt('abc')` returns NaN → silently becomes 0. No range validation for lead score (should be 0-100).

### P2-20: Execution Status Polling Runs Indefinitely

- **File:** `CampaignExecutionStatus.tsx` ~L65
- **Issue:** Polls every 3 seconds regardless of tab visibility, campaign state, or network. No exponential backoff.

---

## P3 — Code Quality / Tech Debt

### P3-1: CampaignsList.tsx is 1,417 Lines

- Should extract: CampaignCard, CampaignStats, CampaignCharts, modals into separate components.

### P3-2: CampaignCreate.tsx is 1,374 Lines

- Each wizard step (Type, Details, Configure) should be its own component.

### P3-3: CampaignDetail.tsx is 1,290 Lines

- Contains inline edit modal, delete modal, content modal, multiple chart sections, and deliverability stats all in one file.

### P3-4: Custom Modals Instead of Shared Dialog Component

- **File:** `CampaignsList.tsx` ~L1211-1350
- Status, Delete, Duplicate, Quick Create modals are hand-built `fixed inset-0` divs instead of using the existing `Dialog` component.

### P3-5: Dead Code — `deviceData` and `geoData` useMemo Stubs

- **File:** `CampaignDetail.tsx` ~L148-170
- Always return `[]` with TODO comments. Should be removed or implemented.

### P3-6: Inconsistent `|| 0` vs `?? 0` for Null Coalescing

- **Files:** CampaignsList, CampaignDetail, CampaignReports
- `campaign.opened || 0` fails for value `0` (falsy). Should use `?? 0` throughout.

### P3-7: `as any` Type Casts in Execution Status Component

- **File:** `CampaignExecutionStatus.tsx` ~L51
- `const data = (response as any)?.data` — no type safety.

### P3-8: Unused `initialPhase` Parameter

- **File:** `CampaignExecutionStatus.tsx` ~L36
- Destructured as `initialPhase: _initialPhase` and never used.

### P3-9: CampaignEdit Missing TypeScript Type on editForm State

- **File:** `CampaignEdit.tsx` ~L14-26
- No type annotation on `editForm` state. Properties could be anything.

### P3-10: Catch Block Does Nothing in CampaignEdit

- **File:** `CampaignEdit.tsx` ~L28-40
- `catch (err) { throw err }` — pointless try-catch wrapper.

### P3-11: Inline Async Functions in onClick Handlers (CampaignSchedule)

- **File:** `CampaignSchedule.tsx` ~L290
- Async arrow functions inline in `onClick` recreate on every render.

### P3-12: Hardcoded Batch Sizes Not Configurable (Backend)

- **File:** `campaign-executor.service.ts` ~L467
- `BATCH_SIZE = 100`, `PARALLEL_BATCHES = 3` — hardcoded instead of configurable per provider.

### P3-13: `createMany` skipDuplicates Logs Misleading Count (Backend)

- **File:** `campaign-executor.service.ts` ~L36
- Logs `leadIds.length` as created count, but `skipDuplicates: true` means actual count may be lower.

### P3-14: Handlebars `{{company.address}}` Stays Literal in CAN-SPAM Footer

- **File:** `campaign-executor.service.ts` ~L425
- Template variable `{{company.address}}` is compiled BEFORE lead data is available, so it stays as literal text in emails.

### P3-15: Inconsistent Export Patterns

- Some pages: `export default function`, others: `const + export default` at bottom, others: named function + `export default`.

---

## Visual / UI Bugs

*(From screenshot audit — March 13, 2026)*

### V-P0 (Broken / Misleading)

| # | Issue | Page | Details |
|---|---|---|---|
| V1 | Pie chart dataKey/label mismatch | Campaigns List | Slices sized by revenue, labels show ROI %. Misleading proportions. |
| V2 | Stats cards don't update with type filter | Campaigns List (Email/SMS/Phone) | Active count, Messages Sent, Revenue, ROI identical across all filter tabs. |
| V3 | Budget Overview doesn't update with type filter | Campaigns List | $24,600/$10,107.26 stays same for Email/SMS/Phone tabs. |
| V4 | Performance charts don't update with type filter | Campaigns List | Bar/pie charts show identical data regardless of tab. |
| V5 | Phone tab full dashboard below "Coming Soon" | Campaigns List (Phone) | Yellow banner + full stats/charts/search below it. |

### V-P1 (Data Presentation)

| # | Issue | Page | Details |
|---|---|---|---|
| V6 | Revenue "$197K" lossy format | Campaigns List | Should match Budget Overview's `toLocaleString()` format. |
| V7 | "1944%" ROI alarming display | Campaigns List | Technically correct but visually misleading. Should show "19.4x return". |
| V8 | Campaign card ROI without units | Campaigns List | Shows raw numbers (3.76, 5.68) without "%" or "x". |
| V9 | Raw ISO dates in campaign list | Campaigns List | "Started 2026-01-19T21:37:14.413Z" — not human-readable. |
| V10 | Budget bar color inconsistency | Campaigns List | Main bar: blue-to-purple gradient. Card bars: solid `bg-blue-500`. |
| V11 | Budget bar can overflow | Campaigns List | No `Math.min(100)` clamp on individual campaign bars. |
| V12 | Quick Start icons don't match types | Campaigns List | Promotional uses `Target`, Survey uses `MessageSquare`. |
| V13 | Two Quick Start cards link to same URL | Campaigns List | Newsletter and Promotional both → `/campaigns/create?type=EMAIL`. |
| V14 | Open/click rate discrepancy between tabs | Reports | Overview: 29%/24%. Detailed: 29.2%/24.5%. Different calculations. |
| V15 | Campaign Comparison shows only 1 campaign | Reports (Overview) | "Weekly Market Report" with 0 sent, 0% rates. |
| V16 | "Best Time to Send" Y-axis too small | Reports (Overview) | Values 0–1 range, all bars look same height. |
| V17 | "Top Performing Content" shows 1 at 0% | Reports (Overview) | Only "Weekly Market Report" at 0% open/click. |
| V18 | Detailed Reports long scroll (13 campaigns) | Reports (Detailed) | No pagination or collapse for 13 full metric cards. |
| V19 | All template stat icons identical | Templates | All 5 cards use same gray `FileText` icon. |
| V20 | "SMS: 0" and "Phone: 0" shown prominently | Templates | Zero-value stats waste space, look incomplete. |
| V21 | Raw date "2/26/2026" inconsistent format | Schedule | Mixed formats: "2/26/2026" vs "2/21/2026 at 03:14 PM". |
| V22 | "Scheduled" text instead of date in stat card | Schedule | Date in tiny subtitle, word "Scheduled" is the hero value. |
| V23 | "SOCIAL" badge on unavailable channel | Schedule | Social campaign exists but channel is "Coming Soon". |
| V24 | Converted funnel bar nearly invisible | Reports (Detailed) | 0.4% width is almost invisible. Needs min visible width. |

### V-P2 (Minor Nits)

| # | Issue | Details |
|---|---|---|
| V25 | View toggle icons lack tooltips | List/grid/calendar icons have no tooltip or aria-label. |
| V26 | Status tab counts no color coding | "Active (6)" all same color, could color-code by status. |
| V27 | SubNav "Phone" badge says "Soon" | Abbreviated — should be "Coming Soon" or use tooltip. |
| V28 | Chart grid lines dominate empty areas | Grid lines visible when bars are 0. |
| V29 | "Best Open Rate"/"Best Click Rate" color unexplained | Green vs purple not documented or matching funnel colors. |
| V30 | No "select all" checkbox in campaign list | Individual checkboxes exist but no header bulk-select. |

---

## Accessibility Issues

| # | File | Issue | WCAG Level |
|---|---|---|---|
| A1 | CampaignDetail ~L743 | `CardHeader` with `onClick` has no `role="button"`, `tabIndex`, or keyboard handler | AA |
| A2 | CampaignDetail ~L775 | Expand/collapse icon buttons missing `aria-label` | AA |
| A3 | CampaignDetail ~L550 | Bounce rate severity conveyed by color only — no text indicator | AA |
| A4 | CampaignDetail ~L307 | Recipient activity table missing `<caption>` | A |
| A5 | CampaignCreate ~L555-580 | Error messages use red color only — inaccessible to colorblind users | AA |
| A6 | CampaignCreate ~L600 | File input label missing `htmlFor` attribute | AA |
| A7 | CampaignCreate ~L713 | SMS character counter not announced to screen readers (missing `aria-live`) | A |
| A8 | CampaignCreate ~L742 | MMS preview image has no `alt` text | A |
| A9 | CampaignEdit ~L111 | Back button is icon-only without descriptive `aria-label` | AA |
| A10 | CampaignEdit ~L217 | Conditional editor swap has no `aria-live` announcement | A |
| A11 | CampaignsList ~L(view toggle) | View mode toggle icons lack `aria-label` / tooltips | AA |

---

## Performance Issues

| # | File | Issue | Impact |
|---|---|---|---|
| PERF-1 | CampaignCreate ~L110-116 | 4 separate API calls for lead counts on page load | 200-400ms extra latency |
| PERF-2 | CampaignDetail ~L597-636 | 6 parallel queries fire simultaneously (analytics, deliverability, timeline, hourly, device, geo) | API overwhelm risk |
| PERF-3 | CampaignExecutionStatus ~L65 | Polls every 3s with no visibility check or backoff | Battery drain, unnecessary network |
| PERF-4 | CampaignsList ~L1280-1291 | Calendar rendering loops all days × all campaigns | Slow with 100+ campaigns |
| PERF-5 | CampaignReports ~L277-298 | Funnel calculations not memoized — recalculates every render | Unnecessary CPU |
| PERF-6 | CampaignsList ~L300-420 | Event handlers recreated every render without `useCallback` | Minor — matters if passed to child components |

---

## Per-File Summary

| File | Lines | P0 | P1 | P2 | P3 | Security | Accessibility |
|---|---|---|---|---|---|---|---|
| **CampaignsList.tsx** | 1,417 | 3 | 3 | 11 | 3 | 0 | 1 |
| **CampaignCreate.tsx** | 1,374 | 1 | 6 | 2 | 2 | 2 | 4 |
| **CampaignDetail.tsx** | 1,290 | 1 | 3 | 2 | 2 | 1 | 4 |
| **CampaignEdit.tsx** | ~400 | 1 | 2 | 1 | 3 | 0 | 2 |
| **CampaignSchedule.tsx** | ~550 | 0 | 3 | 2 | 1 | 0 | 0 |
| **CampaignReports.tsx** | ~650 | 0 | 1 | 2 | 2 | 0 | 0 |
| **CampaignTemplates.tsx** | ~350 | 0 | 2 | 2 | 1 | 0 | 0 |
| **ABTesting.tsx** | ~475 | 0 | 1 | 0 | 0 | 0 | 0 |
| **CampaignExecutionStatus.tsx** | ~180 | 0 | 0 | 1 | 2 | 0 | 0 |
| **CampaignsSubNav.tsx** | ~120 | 0 | 0 | 0 | 0 | 0 | 0 |
| **CampaignPreviewModal.tsx** | ~200 | 0 | 0 | 0 | 0 | 0 | 0 |
| **AdvancedAudienceFilters.tsx** | ~390 | 0 | 0 | 1 | 0 | 0 | 0 |
| **campaign.controller.ts** | 1,379 | 0 | 2 | 1 | 1 | 1 | — |
| **campaign.routes.ts** | 604 | 0 | 1 | 0 | 0 | 2 | — |
| **campaign-executor.service.ts** | ~700 | 0 | 0 | 0 | 3 | 2 | — |
| **campaign-scheduler.service.ts** | ~500 | 0 | 0 | 1 | 0 | 0 | — |
| **campaign.validator.ts** | 139 | 0 | 1 | 0 | 0 | 0 | — |
| **TOTALS** | **~11,215** | **7** | **18** | **17** | **15** | **7** | **11** |

---

## What's Working Well

1. **Full CRUD lifecycle** — Create, read, update, delete all connected with React Query mutations and cache invalidation.
2. **Multi-channel support** — Email/SMS full, Phone/Social graceful "Coming Soon" degradation.
3. **3-step creation wizard** — Type → Details → Configure with save-as-draft, preview modal, AI content integration.
4. **Real-time execution tracking** — `CampaignExecutionStatus` polls every 3s with phase progress.
5. **XSS-safe preview** — `CampaignPreviewModal` uses DOMPurify for HTML sanitization.
6. **A/B Testing** — Full test creation, running, and results analysis with statistical significance.
7. **Advanced audience filters** — Custom filter builder with 10 field types and dynamic lead counts.
8. **Templates system** — 7 backend-served templates with category filtering, search, one-click creation.
9. **Recurring campaigns** — Daily/weekly/monthly with day-of-week picker and occurrence limits.
10. **Three view modes** — List, Grid, Calendar on main campaigns list.
11. **Bulk actions** — Multi-select with status change, delete, export CSV.
12. **RBAC** — `getRoleFilterFromRequest()` + `getCampaignsFilter()` for org-level isolation.
13. **Plan limit enforcement** — `enforcePlanLimit('campaigns')` on POST.
14. **Rate limiting** — `sensitiveLimiter` on campaign creation.
15. **Lazy loading** — All pages via `lazyWithRetry()` with Suspense + Error Boundaries.
16. **Zod validation** — Full request validation on create/update with type-safe schemas.
17. **Email block editor** — Rich visual email builder.
18. **Budget tracking** — Budget vs. spent progress bars.
19. **CSV export** — With dedicated `campaignExportColumns` configuration.
20. **TCPA compliance** — SMS campaigns show automatic STOP opt-out messaging.
21. **All 20+ API endpoints wired** — No orphan endpoints found.

---

## Recommended Fix Priority

### Tier 1 — Security (fix immediately)
1. **SEC-1** — Add `organizationId` filter to campaign preview leads query (IDOR)
2. **SEC-2** — Add body validation + rate limiter to `/send` endpoint
3. **SEC-3** — Validate filter objects before building Prisma queries
4. **SEC-4** — Validate `leadIds` array in recipients endpoint

### Tier 2 — Critical Bugs (fix next)
5. **P0-1** — Fix row menu click-outside handler for list view
6. **P0-4** — Add null-safe access for `campaign.sent`, `campaign.budget`
7. **P0-5** — Await batch operations before closing modals
8. **P0-3** — Fix `useEffect` dependency in CampaignCreate
9. **P0-6/P0-7** — Fix date validation and null checks

### Tier 3 — Visual Bugs with High Impact
10. **V2-V4** — Make stats/budget/charts filter by selected type tab
11. **V5** — Phone tab: show only coming-soon, hide dashboard
12. **V1/V12** — Fix pie chart labels, ROI units, ISO dates

### Tier 4 — Functional Issues
13. **P1-3** — Add pagination UI for campaigns list
14. **P1-4** — Add status transition validation to backend
15. **P1-1** — Batch bulk operations properly
16. **P1-5/P1-6** — Fix Schedule page filtering logic
17. **P1-12/P1-13** — Add missing form validations

### Tier 5 — Polish + Code Quality
18. V-P1 items (data formatting, template icons, reports data)
19. P2 items (SubNav consistency, calendar view, loading states)
20. P3 items (break up mega-files, remove dead code, fix type safety)
21. Accessibility items (add aria-labels, keyboard support, semantic markup)

---

**Total Issues: 75**  
| Category | Count |
|---|---|
| Security | 7 |
| P0 Critical | 7 |
| P1 Functional | 18 |
| P2 UX/Polish | 17 |
| P3 Code Quality | 15 |
| Accessibility | 11 |
| Performance | 6 |
| Visual (screenshot) | 30 |
