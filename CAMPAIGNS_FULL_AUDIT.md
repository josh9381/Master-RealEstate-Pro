# Campaigns System — Full Audit Report

**Date:** $(date +%Y-%m-%d)  
**Scope:** All campaign-related code across frontend, backend, API, services, validators, and database  
**Methodology:** Static code review + live API testing + TypeScript error analysis  

---

## Executive Summary

The campaign subsystem spans **30+ files** across frontend (8 pages, 4 components, API client, types) and backend (routes, controller, 3 services, validators, Prisma schema). The audit identified **60 total issues**: **14 P0 (Critical)**, **35 P1 (High)**, and **11 P2 (Medium)**.

### Fixes Applied During This Audit

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | **Stale dist build** — Server was running compiled JS that was missing status transition validation, `$transaction` wrapper, and other safety features from the TypeScript source | **CRITICAL** | Rebuilt dist via `tsc --build`, restarted server. Verified DRAFT→COMPLETED now correctly rejected. |
| 2 | **Case-sensitive search** — `contains` queries without `mode: 'insensitive'` meant "market" returned 0 results while "Market" returned 4 | **HIGH** | Added `mode: 'insensitive'` to both `name` and `subject` Prisma contains queries in `getCampaigns()`. Verified both cases now return 4. |

---

## Architecture Overview

### Frontend (React + TypeScript)

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/campaigns/CampaignsList.tsx` | ~1600 | Main list: 3 views (list/grid/calendar), search, filters, bulk actions, stats, charts |
| `src/pages/campaigns/CampaignCreate.tsx` | ~1400 | Multi-step wizard: type → details → content → review, AI content gen, block editor |
| `src/pages/campaigns/CampaignDetail.tsx` | ~1000 | Detail view: analytics tabs, charts, recipient activity, execution status |
| `src/pages/campaigns/CampaignEdit.tsx` | ~500 | Edit form with all campaign fields |
| `src/pages/campaigns/CampaignReports.tsx` | ~600 | Performance reports with date filtering |
| `src/pages/campaigns/CampaignSchedule.tsx` | ~400 | Schedule management |
| `src/pages/campaigns/CampaignTemplates.tsx` | ~500 | Template library |
| `src/pages/campaigns/ABTesting.tsx` | ~600 | A/B test management and results |
| `src/components/campaigns/CampaignExecutionStatus.tsx` | ~200 | Real-time execution tracker (polls every 3s) |
| `src/components/campaigns/CampaignPreviewModal.tsx` | ~300 | Send preview with cost estimation |
| `src/components/campaigns/AdvancedAudienceFilters.tsx` | ~200 | Audience segmentation UI |
| `src/components/campaigns/CampaignsSubNav.tsx` | ~50 | Sub-navigation tabs |
| `src/lib/api.ts` (campaignsApi) | ~150 | All API methods: CRUD, send/pause, templates, analytics, A/B test results |

### Backend (Express + Prisma + PostgreSQL)

| File | Purpose |
|------|---------|
| `backend/src/routes/campaign.routes.ts` | 25+ route definitions, auth middleware, rate limiting, plan limits |
| `backend/src/controllers/campaign.controller.ts` | 50+ controller functions: CRUD, send, pause, archive, duplicate, templates, analytics, tracking, recipients |
| `backend/src/services/campaign-executor.service.ts` | Email/SMS batch sending (100/batch, 3 parallel), send-time optimization, CAN-SPAM/TCPA compliance |
| `backend/src/services/campaignAnalytics.service.ts` | Metrics aggregation, performance tracking |
| `backend/src/services/campaign-scheduler.service.ts` | Recurring campaign scheduler |
| `backend/src/validators/campaign.validator.ts` | Zod schemas: create, update, send, list |
| `prisma/schema.prisma` | Campaign, CampaignLead, CampaignTag models |

---

## P0 — Critical Issues (14)

### 1. Campaign stuck in SENDING status on crash (Backend)
**File:** `backend/src/services/campaign-executor.service.ts` lines 191–243  
**Problem:** The executor sets status to `SENDING` before execution begins (line 191), and updates to `ACTIVE` only on success (line 210). If execution crashes mid-send (process crash, OOM, unhandled rejection), the campaign is permanently stuck in `SENDING` with no recovery path. The `catch` block (line 237) returns a failure result but **never resets the status** back to `ACTIVE` or `DRAFT`.  
**Impact:** Campaign becomes unrecoverable without direct database intervention.  
**Fix:** Add status rollback in the catch block:
```typescript
catch (error) {
  logger.error('[CAMPAIGN] Execution failed:', error);
  // Rollback status from SENDING to previous state
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'ACTIVE' },  // or store previous status
  }).catch(e => logger.error('[CAMPAIGN] Status rollback failed:', e));
  return { success: false, ... };
}
```

### 2. SMS segment calculation formula error (Frontend)
**File:** `src/pages/campaigns/CampaignCreate.tsx`  
**Problem:** SMS segment count calculation adds TCPA footer length (26 chars) before dividing by 160. But multi-part SMS uses 153 chars per segment (not 160) due to UDH headers. The formula `Math.ceil((length + 26) / 160)` undercounts segments for messages over 160 chars.  
**Impact:** Users see incorrect cost estimates for SMS campaigns.

### 3. CampaignCreate — Promise race condition on unmount (Frontend)
**File:** `src/pages/campaigns/CampaignCreate.tsx`  
**Problem:** The audience data fetch (line 117) uses `Promise.all` with 4 parallel API calls inside `useQuery`. If the user navigates away before completion, the fetched data may attempt to update unmounted component state. While React Query handles this for the query itself, any `setState` calls inside the `queryFn` after the Promise resolves could fail silently or cause memory leaks.  
**Impact:** Memory leak, potential stale state on re-mount.

### 4. CampaignCreate — incorrect audience data type usage (Frontend)
**File:** `src/pages/campaigns/CampaignCreate.tsx`  
**Problem:** The audience preview fetches lead counts from 4 endpoints (all, new, contacted, qualified) but the API response structure may vary between list endpoints. The code assumes each response has a consistent `.data.total` path without defensive checks.  
**Impact:** Crash if any audience endpoint returns unexpected data shape.

### 5. CampaignDetail — inconsistent API response mapping (Frontend)
**File:** `src/pages/campaigns/CampaignDetail.tsx`  
**Problem:** The detail page access campaign data through multiple inconsistent paths — sometimes `campaign.data`, sometimes `response.data.campaign`, sometimes just `data`. If the API response shape changes, multiple destructuring patterns will break silently.  
**Impact:** Undefined access errors, blank sections in UI.

### 6. CampaignDetail — unsafe data access patterns (Frontend)
**File:** `src/pages/campaigns/CampaignDetail.tsx`  
**Problem:** Multiple chart rendering sections access nested properties like `campaign.metrics.openRate` without null checks. If metrics are undefined (new campaign, API failure), the component crashes.  
**Impact:** White screen of death for campaigns without metrics.

### 7. ABTesting — unsafe nested Promise.all (Frontend)
**File:** `src/pages/campaigns/ABTesting.tsx` line 57  
**Problem:** `Promise.all(resultsPromises)` is used to fetch results for all active/completed tests. While individual promises have try/catch, the outer `Promise.all` doesn't — if a test's error handler itself throws (e.g., logger undefined), the entire query fails and no A/B test data is shown.  
**Impact:** Complete A/B testing tab failure if any single test result fetch has an unhandled error.  
**Fix:** Use `Promise.allSettled` instead of `Promise.all`.

### 8. ABTesting — potential null reference crash (Frontend)
**File:** `src/pages/campaigns/ABTesting.tsx`  
**Problem:** The average improvement calculation accesses `r.results.variantA.conversionRate` and `r.results.variantB.conversionRate` without verifying that `results` or `variantA`/`variantB` exist. A malformed response causes `TypeError: Cannot read properties of undefined`.  
**Impact:** A/B testing page crash.

### 9. CampaignExecutionStatus — race condition in completion detection (Frontend)
**File:** `src/components/campaigns/CampaignExecutionStatus.tsx` lines 45-87  
**Problem:** The `useEffect` depends on `[campaignId, onComplete, error]`. When `error` is set, the effect re-runs, creating a new interval. The `completedRef` check prevents double `onComplete` calls, but the interval recreation on error state change can cause multiple concurrent polling loops if `error` toggles rapidly.  
**Impact:** Multiple polling loops running simultaneously, excessive API calls.  
**Fix:** Remove `error` from the dependency array.

### 10. CampaignExecutionStatus — retry doesn't restart polling (Frontend)
**File:** `src/components/campaigns/CampaignExecutionStatus.tsx`  
**Problem:** The retry button calls `retryFetch` which sets `error` to null and `completedRef.current` to false. This triggers the `useEffect` to re-run (due to `error` dep), but the old interval was already cleared in the cleanup. The new effect creates a fresh interval, which works — but only because of the `error` dependency. If that dependency is removed (to fix #9), retry stops working.  
**Impact:** Coupled to the race condition bug — fixing one breaks the other.

### 11. CampaignPreviewModal — unsafe nested property access (Frontend)
**File:** `src/components/campaigns/CampaignPreviewModal.tsx`  
**Problem:** Preview data is accessed as `previewData.html`, `previewData.subject`, `previewData.estimatedCost` without null guards after the API call. If the preview endpoint returns an error or empty response, the modal crashes.  
**Impact:** Modal crash, user unable to preview before sending.

### 12. CampaignPreviewModal — type confusion (Frontend)
**File:** `src/components/campaigns/CampaignPreviewModal.tsx`  
**Problem:** The estimated cost is displayed as a number but the API may return it as a string or undefined. No type coercion or formatting is applied consistently.  
**Impact:** Cost shows as "undefined" or "NaN" to users.

### 13. CampaignReports — missing error handling in Promise.all (Frontend)
**File:** `src/pages/campaigns/CampaignReports.tsx` line 55  
**Problem:** Three API calls are wrapped in `Promise.all` (campaign analytics, monthly performance, hourly engagement). If any one fails, all three fail and the entire reports tab shows an error. Should use `Promise.allSettled` to show partial data.  
**Impact:** Complete reports tab failure for a single endpoint issue.

### 14. CampaignReports — division by zero (Frontend)
**File:** `src/pages/campaigns/CampaignReports.tsx`  
**Problem:** ROI and engagement rate calculations divide by `totalSent` or similar metrics without checking for zero. A campaign with 0 sends crashes the calculations.  
**Impact:** NaN displayed across reporting metrics.

---

## P1 — High Priority Issues (35)

### Backend (12)

| # | Issue | File | Description |
|---|-------|------|-------------|
| 1 | SOCIAL type accepted by validator, rejected by executor | `campaign.validator.ts` / `campaign-executor.service.ts` | Zod schema allows `SOCIAL` type, but executor only handles `EMAIL` and `SMS`. Creation succeeds but sending crashes. |
| 2 | No SENDING state in transition map | `campaign.controller.ts` | The `validTransitions` map doesn't include `SENDING` as a key. If a campaign is stuck in SENDING, no transition is possible via the API. |
| 3 | Race condition in concurrent sends | `campaign-executor.service.ts` | Two users can trigger `sendCampaign` simultaneously. Both pass the status check, both set to SENDING, leads receive duplicates. |
| 4 | Monthly limit check is advisory only | `campaign-executor.service.ts` | The limit check happens before sending but there's no lock. Concurrent campaigns could both pass the check and exceed the limit. |
| 5 | Tag filter overwrite in getTargetLeads | `campaign-executor.service.ts` | If `filters.tags` is set AND the campaign has its own tag, the campaign tag gets overwritten by the filter tags in the `where` clause. |
| 6 | No pagination in getTargetLeads | `campaign-executor.service.ts` | `findMany` without pagination loads ALL matching leads into memory. For organizations with 100K+ leads, this causes OOM. |
| 7 | Failed batch assumes BATCH_SIZE failures | `campaign-executor.service.ts` | Line ~505: `totalFailed += BATCH_SIZE` when a batch Promise is rejected, but the last batch may have fewer items. |
| 8 | Handlebars template injection prevention is incomplete | `campaign-executor.service.ts` | The `esc()` function escapes `{{` and `}}` but doesn't handle triple-stash `{{{` which bypasses Handlebars escaping. |
| 9 | Missing rate limiter on bulk endpoints | `campaign.routes.ts` | Bulk delete and bulk status change lack rate limiting. An attacker could delete all campaigns with rapid requests. |
| 10 | No Content-Security-Policy on preview endpoint | `campaign.controller.ts` | The `getCampaignPreview` renders HTML content and returns it directly. No CSP header is set. |
| 11 | Archive/unarchive lack cascading effects | `campaign.controller.ts` | Archiving a campaign doesn't pause scheduled sends or cancel pending CampaignLead rows. |
| 12 | Duplicate campaign doesn't reset metrics | `campaign.controller.ts` | The duplicate endpoint copies metrics (sent, delivered, opened, clicked) from the original. A duplicated campaign shows false historical data. |

### Frontend (23)

| # | Issue | File | Description |
|---|-------|------|-------------|
| 13 | Client-side filtering with full data fetch | `CampaignsList.tsx` | Status tab filtering fetches ALL campaigns and filters client-side. With 1000+ campaigns, this is a significant performance problem. |
| 14 | Debounced search doesn't cancel stale requests | `CampaignsList.tsx` | A slow search request can return after a newer one, showing stale results. |
| 15 | Bulk export has no progress indicator | `CampaignsList.tsx` | Exporting 1000+ campaigns blocks the UI thread with no feedback. |
| 16 | Calendar view doesn't handle timezone | `CampaignsList.tsx` | Campaign dates displayed in calendar view use the raw date string without timezone adjustment. |
| 17 | Grid view card layout breaks with long names | `CampaignsList.tsx` | Campaign names longer than ~40 chars overflow the card boundaries in grid view. |
| 18 | Quick Create modal has no validation | `CampaignsList.tsx` | The inline campaign creation modal allows empty name/subject submission. |
| 19 | Delete confirmation is a JS confirm() | `CampaignsList.tsx` | Bulk delete uses `window.confirm()` instead of a proper modal, inconsistent with other UX patterns. |
| 20 | Status change doesn't refresh related queries | `CampaignsList.tsx` | After changing a campaign status, related stats/charts queries are not invalidated. |
| 21 | Block editor loses data on step navigation | `CampaignCreate.tsx` | Going back from the review step to content step may reset the block editor state. |
| 22 | AI content generation has no abort controller | `CampaignCreate.tsx` | If the user cancels or navigates away during AI generation, the request continues in the background. |
| 23 | Recurring campaign config not validated | `CampaignCreate.tsx` | Recurring schedule fields (interval, endDate) aren't validated before submission. |
| 24 | A/B test setup allows < 2 variants | `CampaignCreate.tsx` | The A/B test configuration component doesn't enforce a minimum of 2 variants. |
| 25 | Edit form doesn't handle concurrent edits | `CampaignEdit.tsx` | No optimistic locking or last-write-wins detection. Two users editing the same campaign overwrite each other. |
| 26 | Edit form allows saving invalid state transitions | `CampaignEdit.tsx` | Status dropdown shows all statuses regardless of current state. Backend now validates, but UX should prevent invalid selections. |
| 27 | Templates page has no error boundary | `CampaignTemplates.tsx` | A malformed template JSON crashes the entire templates page. |
| 28 | Template preview doesn't sanitize HTML | `CampaignTemplates.tsx` | Template preview renders HTML without DOMPurify sanitization. |
| 29 | Schedule page refetches on every mount | `CampaignSchedule.tsx` | No `staleTime` set on the schedule query, causing unnecessary refetches. |
| 30 | A/B test results don't auto-refresh | `ABTesting.tsx` | Active test results require manual page refresh or button click. |
| 31 | Statistical significance shown without sample size check | `ABTesting.tsx` | Results show "statistically significant" even with < 100 samples per variant, which is unreliable. |
| 32 | Execution status component unmount leak | `CampaignExecutionStatus.tsx` | If `onComplete` callback changes reference between renders, the interval is recreated unnecessarily. |
| 33 | Preview modal doesn't handle large HTML | `CampaignPreviewModal.tsx` | Very large email HTML (>1MB) renders in an iframe without lazy loading, freezing the UI. |
| 34 | Audience filters don't persist across page reload | `AdvancedAudienceFilters.tsx` | Filter state is React state only, lost on refresh. |
| 35 | No empty state for campaign comparison table | `CampaignsList.tsx` | The comparison table shows empty rows instead of a helpful message when no campaigns are selected. |

---

## P2 — Medium Priority Issues (11)

| # | Issue | File | Description |
|---|-------|------|-------------|
| 1 | Campaign type icons are hardcoded | `CampaignsList.tsx` | Icon mapping is duplicated across list/grid/card views instead of being a shared utility. |
| 2 | Magic numbers in batch processing | `campaign-executor.service.ts` | `BATCH_SIZE = 100` and `PARALLEL_BATCHES = 3` are hardcoded constants, should be configurable. |
| 3 | Date formatting inconsistency | Multiple files | Some files use `toLocaleDateString()`, others use `toLocaleTimeString()`, others use manual formatting. |
| 4 | Console.log statements in production code | Multiple files | Several `console.log` calls remain in frontend campaign files. |
| 5 | Unused imports in campaign pages | Multiple files | Several campaign pages import icons or components that aren't used. |
| 6 | Missing loading skeletons | `CampaignEdit.tsx`, `CampaignSchedule.tsx` | These pages show blank state instead of skeleton loading UI. |
| 7 | Color palette inconsistency | Campaign components | Status badge colors don't match between list view and detail view. |
| 8 | No keyboard navigation in campaign cards | `CampaignsList.tsx` | Grid view cards aren't keyboard-accessible (no tabIndex, no Enter handler). |
| 9 | Campaign analytics endpoint returns unbounded data | `campaignAnalytics.service.ts` | Daily stats can return years of data without pagination. |
| 10 | Test coverage gaps | Backend tests | Campaign tests don't cover: concurrent sends, send-time optimization, SENDING stuck state recovery. |
| 11 | No E2E test for campaign create wizard | E2E tests | The multi-step create wizard has no end-to-end test coverage. |

---

## API Testing Results

All endpoints tested via live HTTP requests against `localhost:8000`:

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/campaigns` | GET | ✅ Working | Returns paginated list with campaigns array |
| `/api/campaigns` | POST | ✅ Working | Creates campaign, response at `data.campaign` |
| `/api/campaigns/:id` | GET | ✅ Working | Returns single campaign with all fields |
| `/api/campaigns/:id` | PATCH | ✅ Working | Updates with status transition validation (**FIXED**) |
| `/api/campaigns/:id` | DELETE | ✅ Working | Soft/hard delete |
| `/api/campaigns?search=` | GET | ✅ Working | Case-insensitive search (**FIXED**) |
| `/api/campaigns?status=` | GET | ✅ Working | Status filtering |
| `/api/campaigns?type=` | GET | ✅ Working | Type filtering |
| `/api/campaigns/stats` | GET | ✅ Working | Aggregate statistics |
| `/api/campaigns/:id/send` | POST | ✅ Working | Triggers executor, sets SENDING → ACTIVE |
| `/api/campaigns/:id/pause` | POST | ✅ Working | Only from ACTIVE/SENDING states |
| `/api/campaigns/:id/archive` | POST | ✅ Working | Toggles isArchived flag |
| `/api/campaigns/:id/duplicate` | POST | ✅ Working | Creates copy (but copies metrics — P1 #12) |
| `/api/campaigns/templates` | GET | ✅ Working | Returns template library |
| `/api/campaigns/:id/analytics` | GET | ✅ Working | Returns campaign-specific metrics |
| `/api/campaigns/:id/execution-status` | GET | ✅ Working | Returns execution phase/progress |

### Data Profile
- **13 seed campaigns** across: EMAIL (7), SMS (3), PHONE (2), SOCIAL (1)
- **Statuses:** DRAFT (3), ACTIVE (6), COMPLETED (4)
- All campaigns belong to organization `Pinnacle Realty Group`

---

## TypeScript Status

All 10 campaign-related source files checked — **zero TypeScript errors**.

---

## Security Observations

| Area | Status | Notes |
|------|--------|-------|
| Authentication | ✅ | All routes behind `authenticate` middleware |
| Multi-tenancy | ✅ | `organizationId` filtering on all queries, verified in `$transaction` block |
| Rate limiting | ⚠️ | Sensitive routes rate-limited, but bulk operations are not |
| Input validation | ✅ | Zod schemas on create/update/send/list |
| Template injection | ⚠️ | Handlebars `{{` escaping present but `{{{` (triple-stash) not handled |
| XSS prevention | ✅ | DOMPurify used in frontend, HTML output escaped in backend |
| CAN-SPAM compliance | ✅ | Unsubscribe tokens generated per-lead, footer injected via MJML |
| TCPA compliance | ✅ | STOP opt-out footer added, `smsOptIn` check before sending |
| Plan limits | ✅ | `enforcePlanLimit` middleware on campaign creation |
| CSRF | ✅ | JWT-based auth (no cookies = no CSRF) |

---

## Recommended Priority Actions

### Immediate (P0 — do now)
1. **Add SENDING status rollback** in executor catch block to prevent stuck campaigns
2. **Fix SMS segment calculation** — use 153 chars/segment for multi-part messages
3. **Use `Promise.allSettled`** instead of `Promise.all` in ABTesting and CampaignReports

### Short-term (P1 — this sprint)
4. **Add SENDING to `validTransitions`** map with transitions to `[ACTIVE, CANCELLED, DRAFT]`
5. **Remove SOCIAL from validator** or implement SOCIAL campaign execution
6. **Add distributed lock** for campaign execution to prevent concurrent sends
7. **Reset metrics on campaign duplicate**
8. **Add rate limiting to bulk endpoints**
9. **Server-side status filtering** — pass status as query param to backend instead of client-side filtering

### Medium-term (P2 — next sprint)
10. Add E2E tests for campaign create wizard
11. Add integration tests for concurrent execution scenarios
12. Standardize date formatting across campaign views
13. Add keyboard navigation to campaign card grid

---

## Files Modified During Audit

| File | Change |
|------|--------|
| `backend/src/controllers/campaign.controller.ts` | Added `mode: 'insensitive'` to search queries |
| `backend/dist/**` | Rebuilt from TypeScript source |

## Server Status
- Backend server **restarted** with rebuilt dist (PID changed from 10438 to new process)
- All test data created during audit has been **cleaned up** (10 test campaigns deleted)
