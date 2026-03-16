# Campaigns System — Complete Full-Stack Audit

**Date:** March 15, 2026  
**Scope:** Database → Backend (routes, controller, services, validators) → Frontend (8 pages, 5 components, API client, types) → Tests (unit, E2E)  
**Total codebase:** ~12,824 lines across 20 files

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Layer](#2-database-layer)
3. [Backend Layer](#3-backend-layer)
4. [Frontend Layer](#4-frontend-layer)
5. [API Contract](#5-api-contract)
6. [Security Audit](#6-security-audit)
7. [Performance Audit](#7-performance-audit)
8. [Test Coverage Audit](#8-test-coverage-audit)
9. [Visual / UX Audit](#9-visual--ux-audit)
10. [Accessibility Audit](#10-accessibility-audit)
11. [Feature Completeness](#11-feature-completeness)
12. [All Issues — Prioritized Master List](#12-all-issues--prioritized-master-list)
13. [Recommended Action Plan](#13-recommended-action-plan)

---

## 1. Architecture Overview

### Data Flow
```
User → React Pages → campaignsApi (api.ts) → Express Routes → Middleware (auth, validation, rate-limit, plan-limit) → Controller → Prisma → PostgreSQL
                                                                                                                          ↓
                                                                                                              Services (executor, scheduler, analytics)
```

### File Inventory

| Layer | File | Lines | Purpose |
|-------|------|-------|---------|
| **Frontend Pages** | `CampaignsList.tsx` | 1,352 | Main list: 3 views, search, filters, bulk ops, stats, charts |
| | `CampaignCreate.tsx` | 1,832 | 6-step wizard: type → details → content → audience → schedule → review |
| | `CampaignDetail.tsx` | 1,302 | Analytics dashboard, charts, execution status, inline edit |
| | `CampaignEdit.tsx` | 458 | Full edit form — name, type, status, dates, budget, A/B, recurring |
| | `CampaignSchedule.tsx` | 584 | Scheduled/sent/recurring management |
| | `CampaignReports.tsx` | 740 | Two-tab: Overview analytics + Detailed per-campaign reports |
| | `CampaignTemplates.tsx` | 374 | Browse and use pre-built templates |
| | `ABTesting.tsx` | 656 | A/B test CRUD and results |
| **Frontend Components** | `CampaignsSubNav.tsx` | 134 | Shared type-filter + page navigation |
| | `CampaignExecutionStatus.tsx` | 241 | Real-time execution polling (3s) |
| | `CampaignPreviewModal.tsx` | 250 | Pre-send confirmation with cost/recipients |
| | `AdvancedAudienceFilters.tsx` | 381 | Dynamic filter builder |
| | `CampaignRowMenu.tsx` | 112 | Shared row-level action menu |
| **Backend** | `campaign.routes.ts` | 627 | 30+ route definitions |
| | `campaign.controller.ts` | 1,532 | 28 exported handler functions |
| | `campaign.validator.ts` | 160 | 6 Zod schemas |
| | `campaign-executor.service.ts` | 828 | Email/SMS batch sender |
| | `campaignAnalytics.service.ts` | 503 | Metrics, tracking, time-series |
| | `campaign-scheduler.service.ts` | 397 | Recurring campaign cron |
| | `campaign-templates.ts` | 361 | 10 static real-estate templates |
| **Tests** | `campaign.test.ts` | 459 | 19 backend integration tests |
| | `05-campaigns.spec.ts` | — | 11 E2E smoke tests |

### Routing (App.tsx)

| Route | Component | Access |
|-------|-----------|--------|
| `/campaigns` | CampaignsList | Auth required |
| `/campaigns/create` | CampaignCreate | Auth required |
| `/campaigns/:id` | CampaignDetail | Auth required |
| `/campaigns/:id/edit` | CampaignEdit | Auth required |
| `/campaigns/templates` | CampaignTemplates | Auth required |
| `/campaigns/schedule` | CampaignSchedule | Auth required |
| `/campaigns/reports` | CampaignReports | Auth required |
| `/campaigns/ab-testing` | ABTesting | Auth required |
| `/campaigns/email` | Redirect → `/campaigns?type=email` | — |
| `/campaigns/sms` | Redirect → `/campaigns?type=sms` | — |
| `/campaigns/phone` | Redirect → `/campaigns?type=phone` | — |

---

## 2. Database Layer

### Campaign Model (40+ fields)
| Category | Fields |
|----------|--------|
| Identity | `id`, `name`, `type` (EMAIL/SMS/PHONE/SOCIAL), `status` (7 states), `organizationId`, `createdById` |
| Content | `subject`, `body`, `previewText`, `attachments`, `mediaUrl` |
| Scheduling | `startDate`, `endDate`, `sendTimeOptimization` |
| Financial | `budget`, `spent`, `revenue`, `roi` |
| Metrics | `audience`, `sent`, `delivered`, `opened`, `clicked`, `converted`, `bounced`, `unsubscribed` |
| A/B Testing | `isABTest`, `abTestData`, `abTestWinnerMetric`, `abTestEvalHours` |
| Recurring | `isRecurring`, `frequency`, `recurringPattern`, `nextSendAt`, `occurrenceCount`, `maxOccurrences`, `lastSentAt` |
| Archival | `isArchived`, `archivedAt` |
| Timestamps | `createdAt`, `updatedAt` |

### Status State Machine (Prisma Enum)
```
DRAFT → SCHEDULED → SENDING → ACTIVE → COMPLETED
  ↓         ↓          ↓         ↓
  └───> CANCELLED <────┘    PAUSED → ACTIVE
```

### Related Models
- **CampaignLead** — Per-recipient tracking with lifecycle timestamps (sent/delivered/opened/clicked/converted/bounced/unsubscribed). Unique on `(campaignId, leadId)`.
- **CampaignAnalytics** — Aggregated metrics snapshot. Unique on `campaignId`.
- **ABTestResult** — Per-test variant results.
- **Tag** — M2M via `CampaignTag` join table.
- **Activity** — Campaign-related activities (opens/clicks) linked to leads.

### Indexes
10 database indexes including compound `(organizationId, status)`, `(isRecurring, nextSendAt)`, `(type)`, `(startDate)`, `(isArchived)`.

---

## 3. Backend Layer

### 3.1 Routes (campaign.routes.ts — 627 lines)

All routes behind `authenticate` middleware. 30+ endpoints:

| Method | Path | Validation | Rate Limit | Plan Limit | Handler |
|--------|------|-----------|------------|------------|---------|
| GET | `/stats` | — | — | — | `getCampaignStats` |
| POST | `/compile-email` | ❌ None | — | — | inline |
| POST | `/upload-attachments` | ❌ None | — | — | inline (file upload) |
| GET | `/templates` | — | — | — | `getCampaignTemplates` |
| GET | `/templates/:templateId` | — | — | — | `getCampaignTemplate` |
| POST | `/from-template/:templateId` | ❌ None | — | — | `createCampaignFromTemplate` |
| GET | `/top-performers` | — | — | — | `getTopPerformers` |
| POST | `/compare` | — | — | — | `compareCampaignsEndpoint` |
| GET | `/:id/stats` | ✅ `campaignIdSchema` | — | — | inline |
| GET | `/:id/execution-status` | ✅ `campaignIdSchema` | — | — | inline |
| POST | `/:id/recipients` | ✅ params only | — | — | inline |
| GET | `/` | ✅ `listCampaignsQuerySchema` | — | — | `getCampaigns` |
| GET | `/:id` | ✅ `campaignIdSchema` | — | — | `getCampaign` |
| POST | `/` | ✅ `createCampaignSchema` | ✅ `sensitiveLimiter` | ✅ `enforcePlanLimit` | `createCampaign` |
| PATCH | `/:id` | ✅ params + `updateCampaignSchema` | — | — | `updateCampaign` |
| PATCH | `/:id/metrics` | ✅ params + `updateCampaignMetricsSchema` | — | — | `updateCampaignMetrics` |
| POST | `/:id/pause` | ✅ params | ✅ | — | `pauseCampaign` |
| GET | `/:id/preview` | ✅ params | — | — | `getCampaignPreview` |
| POST | `/:id/send` | ✅ params + `sendCampaignSchema` | ✅ | — | `sendCampaign` |
| POST | `/:id/send-now` | ✅ params | ✅ | — | `sendCampaignNow` |
| PATCH | `/:id/reschedule` | ✅ params only | — | — | `rescheduleCampaign` |
| POST | `/:id/duplicate` | ✅ params | ✅ | — | `duplicateCampaign` |
| POST | `/:id/archive` | ✅ params | ✅ | — | `archiveCampaign` |
| POST | `/:id/unarchive` | ✅ params | ✅ | — | `unarchiveCampaign` |
| GET | `/:id/analytics` | ✅ params | — | — | `getCampaignAnalytics` |
| GET | `/:id/analytics/links` | ✅ params | — | — | `getLinkStats` |
| GET | `/:id/analytics/timeline` | ✅ params | — | — | `getTimeline` |
| POST | `/:id/track/open` | ✅ params | ✅ | — | `trackOpen` |
| POST | `/:id/track/click` | ✅ params | ✅ | — | `trackClick` |
| POST | `/:id/track/conversion` | ✅ params | ✅ | — | `trackConversionEvent` |
| GET | `/:id/recipients` | ✅ params | — | — | inline |
| GET | `/:id/abtest-results` | ✅ params | — | — | inline |
| DELETE | `/:id` | ✅ params | ✅ | — | `deleteCampaign` |

### 3.2 Controller (campaign.controller.ts — 1,532 lines)

28 exported functions. All use `req.user.organizationId` for tenant isolation.

**Key patterns:**
- `updateCampaign` uses `$transaction` + `validTransitions` state machine for safe status changes
- `deleteCampaign` is actually a soft-delete (archives + sets CANCELLED)
- `sendCampaign` validates status is DRAFT/SCHEDULED/PAUSED before dispatching to executor
- `pauseCampaign` validates status is ACTIVE/SENDING
- `getCampaignPreview` renders Handlebars templates with sample leads

### 3.3 Validators (campaign.validator.ts — 160 lines)

| Schema | Key Constraints |
|--------|----------------|
| `createCampaignSchema` | name: 1-255; body: max 50k; budget ≥ 0; frequency requires `isRecurring=true` (refine) |
| `updateCampaignSchema` | All create fields + metrics, all optional |
| `sendCampaignSchema` | leadIds (string[]), filters (.status, .source, .tags, .score); `.strict()` |
| `campaignIdSchema` | Non-empty string |
| `listCampaignsQuerySchema` | page/limit from string→number; sortBy whitelist |
| `updateCampaignMetricsSchema` | Metric fields, all `number.min(0).optional()` |

### 3.4 Services

**Campaign Executor (828 lines):**
- Batch sending: 100/batch, 3 parallel
- Email: Handlebars + MJML compilation, CAN-SPAM footer with unsubscribe tokens
- SMS: Twilio integration, TCPA footer ("Reply STOP to opt out"), `smsOptIn` check, MMS support
- A/B test: 50/50 lead split, variant tracking
- Send-time optimization: Deferred sending based on lead engagement patterns
- Error rollback: Sets status back to DRAFT on crash

**Campaign Analytics (503 lines):**
- Metric aggregation from Activity records
- Tracking: open (+5 lead score), click (+10), conversion (+40 lead score + revenue)
- Time-series: Daily rollups with zero-fill
- Link click stats: Per-URL breakdown
- Campaign comparison: Side-by-side metrics

**Campaign Scheduler (397 lines):**
- Cron-triggered: Finds SCHEDULED (one-time) and ACTIVE recurring campaigns
- Calculates next send dates for daily/weekly/monthly
- Processes deferred send-time optimization leads
- Auto-evaluates A/B test winners

**Campaign Templates (361 lines):**
- 10 static templates (7 EMAIL, 3 SMS) for real estate
- Categories: Alert, Newsletter, Event, Celebration, Update, Outreach
- Query functions: `getAllTemplates()`, `getTemplatesByCategory()`, `getTemplatesByType()`, `getRecurringTemplates()`

---

## 4. Frontend Layer

### 4.1 Pages Summary

| Page | Lines | Views | API Calls | State |
|------|-------|-------|-----------|-------|
| CampaignsList | 1,352 | List/Grid/Calendar | 8 mutations + 1 query | useState + React Query |
| CampaignCreate | 1,832 | 6-step wizard | 4 lead queries + create/send/delete | Large formData useState |
| CampaignDetail | 1,302 | Analytics tabs | 6 parallel queries + mutations | React Query + edit form state |
| CampaignEdit | 458 | Form | getCampaign + update | Local editForm state |
| CampaignTemplates | 374 | Grid | getTemplates + createFromTemplate | Client-side filter |
| CampaignSchedule | 584 | 3 sections | getCampaigns + send/reschedule | Client-side grouping |
| CampaignReports | 740 | 2 tabs | 4 queries (Promise.allSettled) | React Query + refs |
| ABTesting | 656 | List + results | abtestService calls | React Query + action state |

### 4.2 Components Summary

| Component | Lines | Purpose | Polling |
|-----------|-------|---------|---------|
| CampaignsSubNav | 134 | Type filters + page nav | — |
| CampaignExecutionStatus | 241 | Real-time progress | 3s interval |
| CampaignPreviewModal | 250 | Send confirmation + cost | — |
| AdvancedAudienceFilters | 381 | Dynamic filter builder | — |
| CampaignRowMenu | 112 | Shared action dropdown | — |

### 4.3 API Client (src/lib/api.ts — campaignsApi)

25 methods covering:
- Full CRUD: `getCampaigns`, `getCampaign`, `createCampaign`, `updateCampaign`, `deleteCampaign`
- Actions: `sendCampaign`, `pauseCampaign`, `sendCampaignNow`, `rescheduleCampaign`
- Organization: `duplicateCampaign`, `archiveCampaign`, `unarchiveCampaign`
- Templates: `getTemplates`, `getTemplate`, `createFromTemplate`
- Analytics: `getCampaignAnalytics`, `getCampaignTimeline`, `getCampaignLinkStats`
- Content: `compileEmail`, `uploadAttachments`, `previewCampaign`
- Recipients: `addRecipients`, `getCampaignRecipients`
- A/B: `getABTestResults`

---

## 5. API Contract

### Live Endpoint Test Results

| Endpoint | Method | Status | Response Shape |
|----------|--------|--------|---------------|
| `/api/campaigns` | GET | ✅ 200 | `{ success, data: { campaigns: [...], pagination } }` |
| `/api/campaigns` | POST | ✅ 200 | `{ success, data: { campaign } }` |
| `/api/campaigns/:id` | GET | ✅ 200 | `{ success, data: { campaign } }` |
| `/api/campaigns/:id` | PATCH | ✅ 200 | Status transitions validated |
| `/api/campaigns/:id` | DELETE | ✅ 200 | Soft-delete (archive + cancel) |
| `/api/campaigns?search=` | GET | ✅ 200 | Case-insensitive ✅ |
| `/api/campaigns?status=` | GET | ✅ 200 | Status filtering |
| `/api/campaigns?type=` | GET | ✅ 200 | Type filtering |
| `/api/campaigns/stats` | GET | ✅ 200 | Aggregate stats |
| `/api/campaigns/templates` | GET | ✅ 200 | 10 templates (7 EMAIL, 3 SMS) |
| `/api/campaigns/:id/send` | POST | ✅ 200 | Triggers executor |
| `/api/campaigns/:id/pause` | POST | ✅ 200 | ACTIVE/SENDING only |
| `/api/campaigns/:id/preview` | GET | ✅ 200 | HTML + recipients + cost |
| `/api/campaigns/:id/analytics` | GET | ✅ 200 | Campaign metrics |
| `/api/campaigns/:id/execution-status` | GET | ✅ 200 | Phase + progress |

### Data Profile (Seed Data)
- 13 campaigns: EMAIL (9), SMS (2), SOCIAL (1), PHONE (1)
- Statuses: ACTIVE (6), COMPLETED (4), DRAFT (3)
- Some campaigns have `budget: null` — null-safe handling required

---

## 6. Security Audit

### ✅ What's Secure

| Area | Status | Details |
|------|--------|---------|
| Authentication | ✅ | All routes behind `authenticate` middleware |
| Multi-tenancy CRUD | ✅ | `organizationId` filtering on all campaign queries |
| Role-based access | ✅ | `getCampaignsFilter(roleFilter)` on list endpoint |
| Status transitions | ✅ | `validTransitions` state machine in `updateCampaign` with `$transaction` |
| SQL injection | ✅ | Prisma ORM parameterizes all queries |
| XSS prevention | ✅ | DOMPurify in CampaignDetail + CampaignPreviewModal |
| CAN-SPAM compliance | ✅ | Auto-generated unsubscribe tokens + footer |
| TCPA compliance | ✅ | STOP opt-out footer, `smsOptIn` check |
| Plan limits | ✅ | `enforcePlanLimit('campaigns')` on creation |
| CSRF | ✅ | JWT-based auth (no cookies) |
| File upload | ✅ | 5 files / 10MB each limit |
| Rate limiting | ✅ | `sensitiveLimiter` on create, send, track, archive, delete |
| Monthly send limits | ✅ | `checkMonthlyMessageLimit` in executor |

### ❌ Security Vulnerabilities

#### SEC-1: CRITICAL — Cross-Tenant Lead Score Manipulation via Tracking Endpoints
**Files:** `campaign.controller.ts` (trackOpen/trackClick/trackConversion), `campaignAnalytics.service.ts`  
**Issue:** `POST /:id/track/open|click|conversion` accept `leadId` and `messageId` in request body but **never verify these belong to the authenticated user's organization**. An attacker can pass a `leadId` from another org and manipulate their lead score (+5/+10/+40 per event).  
**Impact:** HIGH — cross-tenant score manipulation, IDOR  
**Fix:** Validate `leadId` belongs to `req.user.organizationId` before calling tracking service.

#### SEC-2: HIGH — Missing Organization Filter in getCampaignStats
**File:** `campaign.controller.ts` ~L430  
**Issue:** Uses conditional spread `...(organizationId && { where: { organizationId } })`. If `organizationId` is falsy (undefined on `req.user`), stats queries run **without org filter**, leaking cross-tenant data.  
**Fix:** Throw if `!organizationId` instead of conditional spread.

#### SEC-3: HIGH — Recipients Endpoint Doesn't Verify Lead Ownership
**File:** `campaign.routes.ts` `POST /:id/recipients`  
**Issue:** Verifies campaign belongs to user's org but **never checks that provided `leadIds` belong to the same org**. An attacker can link leads from other organizations to their campaign.  
**Fix:** Add `WHERE leadId IN (...) AND organizationId = ...` verification.

#### SEC-4: MEDIUM — Tracking Endpoints Have No Body Validation
**File:** `campaign.routes.ts` `POST /:id/track/*`  
**Issue:** `leadId`, `messageId`, and `url` fields taken from `req.body` without Zod validation. No type/format checks.  
**Fix:** Add `validateBody(trackingSchema)`.

#### SEC-5: MEDIUM — Multiple Endpoints Missing Zod Validation
Missing body validation on:
- `POST /compile-email`
- `POST /from-template/:templateId`
- `POST /:id/duplicate` (optional name)
- `PATCH /:id/reschedule` (manual validation in controller)
- `POST /:id/recipients` (manual array check only)

#### SEC-6: MEDIUM — updateCampaignSchema Allows Direct Metric Manipulation
**File:** `campaign.validator.ts`  
**Issue:** The update schema includes `sent`, `delivered`, `opened`, `clicked`, `converted`, `bounced`, `unsubscribed`, `revenue`, `roi`. Users can **directly set campaign metrics via PATCH**, bypassing tracking.  
**Fix:** Separate user-editable fields from system-managed metrics.

#### SEC-7: LOW — Analytics Service Has No Org Scoping
**File:** `campaignAnalytics.service.ts`  
**Issue:** `getCampaignMetrics()`, `getLinkClickStats()`, `getCampaignTimeSeries()`, `compareCampaigns()` accept `campaignId` but never filter by `organizationId`. Safe when called from controller (which pre-checks), but a defense-in-depth gap.

#### SEC-8: LOW — Scheduler Race Condition (Non-Atomic Status Claim)
**File:** `campaign-scheduler.service.ts`  
**Issue:** Fetches campaigns with `status: 'SCHEDULED'`, then separately updates to `SENDING`. No atomic `WHERE status = 'SCHEDULED'` on the update — two scheduler instances could double-fire.  
**Fix:** Use `updateMany` with `where: { id, status: 'SCHEDULED' }` and skip if 0 rows updated.

---

## 7. Performance Audit

### ❌ Performance Issues

#### PERF-1: CRITICAL — Client-Side Filtering/Pagination (3 Pages)
**Files:** `CampaignsList.tsx`, `CampaignSchedule.tsx`, `CampaignReports.tsx`  
**Issue:** All three pages fetch ALL campaigns then filter/paginate in JavaScript. The API already supports `page`, `limit`, `status`, `type` params — they're unused.  
**Impact:** Won't scale beyond ~100 campaigns. Every filter/tab/page change re-processes the entire dataset.  
**Fix:** Pass server-side params: `campaignsApi.getCampaigns({ page, limit, status, type })`.

#### PERF-2: HIGH — 6 Parallel API Calls on CampaignDetail Load
**File:** `CampaignDetail.tsx`  
**Issue:** 6 independent `useQuery` hooks fire simultaneously (campaign, analytics, deliverability, timeline, hourly, device/geo). With rate limiting or slow backend, this cascades.  
**Fix:** Consolidate into 1-2 backend endpoints, or use a query waterfall.

#### PERF-3: MEDIUM — N+1 Query in getTopPerformingCampaigns
**File:** `campaignAnalytics.service.ts`  
**Issue:** Fetches up to 100 campaigns, then calls `getCampaignMetrics()` for each (3 DB queries each = 300+ queries).  
**Fix:** Batch aggregate with a single query.

#### PERF-4: MEDIUM — Aggressive Polling (3s) Without Backoff
**File:** `CampaignExecutionStatus.tsx`  
**Issue:** Polls every 3 seconds even when tab is hidden (does skip fetch but interval runs). No exponential backoff on errors. Doesn't stop on draft/cancelled phases.  
**Fix:** Add visibility check, exponential backoff, and state-based polling termination.

### ✅ Performance Wins
- Batch email processing: 100/batch, 3 parallel
- Proper database indexes (10 compound indexes)
- Lazy-loaded pages via `lazyWithRetry()` with Suspense
- React Query caching with appropriate stale times

---

## 8. Test Coverage Audit

### Current Coverage

| Layer | Tests | Files | Status |
|-------|-------|-------|--------|
| Backend integration | 19 | `campaign.test.ts` (459 lines) | Moderate |
| E2E (Playwright) | 11 | `05-campaigns.spec.ts` | Shallow smoke |
| Frontend unit | 0 | — | **Missing entirely** |
| Code coverage | — | Not in coverage reports | **Not captured** |
| **Total** | **30** | | |

### Backend Tests — What's Covered
- ✅ Create campaign (required + optional fields, invalid type → 400, no auth → 401)
- ✅ List campaigns (pagination, filter by status/type, search)
- ✅ Get single campaign (with computed metrics, 404)
- ✅ Update campaign (field update, ROI calculation, 404)
- ✅ Delete campaign (success + DB verify, 404)
- ✅ Campaign stats aggregation
- ✅ Metrics patch endpoint

### Backend Tests — What's MISSING
| Gap | Priority |
|-----|----------|
| **Organization isolation** — no test with second org verifying cross-org denial | 🔴 Critical |
| **Status transition validation** — no tests for invalid transitions (COMPLETED→DRAFT) | 🔴 Critical |
| **Send campaign** — no send/dispatch endpoint tested | 🔴 Critical |
| **Role-based access** — no ADMIN vs USER permission tests | 🟡 High |
| **Bulk operations** — no bulk delete/status change tests | 🟡 High |
| **Duplicate campaign** — not tested | 🟡 High |
| **Archive/unarchive** — not tested | 🟡 High |
| **Templates** — not tested | 🟡 High |
| **Concurrent sends** — no race condition tests | 🟡 High |
| **Validation edge cases** — missing fields, max lengths, empty body | 🟢 Medium |
| **Pagination edge cases** — page 2, custom limit, empty results | 🟢 Medium |

### E2E Tests — Smoke Only
All 11 tests are navigation/rendering checks. No form submissions, no CRUD operations, no error state testing. The campaign create test fills the form but never submits.

### Frontend Tests — Zero
No component tests exist for any campaign page, form, or interaction.

---

## 9. Visual / UX Audit

### P0 — Visual Bugs (Broken/Misleading)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| V1 | **Stats/Budget/Charts don't update with type filter** — stats cards show identical data regardless of Email/SMS/Phone tab | `CampaignsList.tsx` L500-650 | Misleading metrics |
| V2 | **ROI pie chart dataKey/label mismatch** — slices sized by `revenue` but labels show `roi%` | `CampaignsList.tsx` L639-644 | Misleading visualization |
| V3 | **Phone tab shows "Coming Soon" but renders full dashboard below** | `CampaignsList.tsx` L334-340 | Confusing UX |
| V4 | **Campaign cards show raw ISO dates** — "Started 2026-01-19T21:37:14.413Z" | `CampaignsList.tsx` L808 | Unpolished |
| V5 | **Revenue format inconsistency** — "$197K" vs "$196,500.69" vs "$10,107.26" across views | `CampaignsList.tsx` L544 | Inconsistent |

### P1 — Functional UX Issues

| # | Issue | Location |
|---|-------|----------|
| U1 | **No DRAFT/CANCELLED status filter tabs** — these campaigns only visible under "All" | `CampaignsList.tsx` status tabs |
| U2 | **Grid view missing Pause/Resume/Send/Archive actions** that exist in list view | `CampaignsList.tsx` grid menu |
| U3 | **Calendar view is a date-grouped list**, not a visual calendar | `CampaignsList.tsx` |
| U4 | **No per-step validation in creation wizard** — validation only at final step | `CampaignCreate.tsx` |
| U5 | **Orphan DRAFT campaigns accumulate** — created before preview, lost on browser close | `CampaignCreate.tsx` |
| U6 | **Dual edit surfaces** — inline modal in Detail AND separate Edit page with different fields | `CampaignDetail.tsx` + `CampaignEdit.tsx` |
| U7 | **CampaignEdit missing A/B test + recurring fields** | `CampaignEdit.tsx` |
| U8 | **Unsubscribe count not displayed anywhere in frontend** despite backend tracking | `CampaignDetail.tsx` |
| U9 | **ROI displayed inconsistently** — "1944%" in stats, "5.68" raw on cards, "x" suffix in some views | Multiple files |
| U10 | **Budget bar can exceed 100%** — no Math.min clamp in some views | `CampaignsList.tsx` |

---

## 10. Accessibility Audit

| # | Issue | Severity |
|---|-------|----------|
| A1 | **No `htmlFor`/`id` on form labels** in CampaignEdit and CampaignCreate | Medium |
| A2 | **No `aria-current="page"`** on active nav items in CampaignsSubNav | Medium |
| A3 | **No keyboard navigation** for campaign cards in grid view | Medium |
| A4 | **Grid card uses `window.location.href`** instead of React Router `navigate()` (full page reload on Enter) | Low |
| A5 | **Action menus use plain buttons** — no dropdown component with arrow keys, Escape, focus trap | Low |
| A6 | **No screen reader labels** on icon-only buttons (view toggle, bulk actions) | Low |

---

## 11. Feature Completeness

| Feature | Status | Notes |
|---------|--------|-------|
| Campaign CRUD | ✅ Complete | Create, read, update, delete working |
| Email campaigns | ✅ Complete | Block editor, MJML, CAN-SPAM, attachments |
| SMS campaigns | ✅ Complete | Twilio, TCPA, MMS support |
| Phone campaigns | ⏳ Coming Soon | UI exists, executor rejects |
| Social campaigns | ⏳ Coming Soon | In schema/validator, not executable |
| Campaign templates | ✅ Complete | 10 real estate templates (7 EMAIL, 3 SMS) |
| A/B testing | ✅ Complete | Split audience, variant tracking, winner evaluation |
| Recurring campaigns | ✅ Complete | Daily/weekly/monthly, max occurrences |
| Send-time optimization | ✅ Complete | Timezone/engagement-based |
| Campaign preview | ✅ Complete | Cost estimate, recipient sample |
| Campaign comparison | ✅ Complete | Multi-select compare table |
| Campaign analytics | ✅ Complete | Funnel, timeline, hourly, device, geo |
| Deliverability stats | ✅ Complete | Bounce/complaint rates |
| Real-time execution | ✅ Complete | Polling-based progress bar |
| Bulk operations | ✅ Complete | Status change, delete, export CSV |
| Archive/unarchive | ✅ Complete | Soft archive with timestamp |
| Duplicate campaign | ✅ Complete | Copies settings, DRAFT status |
| Unsubscribe display | ⚠️ Partial | Backend tracks, frontend doesn't show |
| Calendar view | ⚠️ Incomplete | Toggle exists, renders date-grouped list not calendar |
| Edit A/B test settings | ❌ Missing | CampaignEdit has no A/B fields |
| Edit recurring settings | ❌ Missing | CampaignEdit has no recurring fields |
| Server-side pagination | ❌ Not Used | API supports it, frontend ignores it |

---

## 12. All Issues — Prioritized Master List

### 🔴 P0 — Critical (Fix Immediately)

| # | Category | Issue | File(s) |
|---|----------|-------|---------|
| 1 | Security | **Cross-tenant lead score manipulation** via tracking endpoints (no leadId org verification) | `campaign.controller.ts` trackOpen/Click/Conversion |
| 2 | Security | **Conditional org filter in getCampaignStats** — cross-tenant data leak if orgId is falsy | `campaign.controller.ts` L430 |
| 3 | Security | **Recipients endpoint doesn't verify lead ownership** — cross-org lead linking | `campaign.routes.ts` POST /:id/recipients |
| 4 | Performance | **Client-side filtering/pagination** — all campaigns fetched, filtered in JS | `CampaignsList.tsx`, `CampaignSchedule.tsx`, `CampaignReports.tsx` |
| 5 | Bug | **Campaign stuck in SENDING on crash** — catch block doesn't always rollback status | `campaign-executor.service.ts` |
| 6 | Bug | **SENDING status not in frontend tabs** — campaigns in SENDING won't appear in any tab | `CampaignsList.tsx` status tabs |

### 🟡 P1 — High (Fix This Sprint)

| # | Category | Issue | File(s) |
|---|----------|-------|---------|
| 7 | Security | Tracking endpoints lack body validation (Zod) | `campaign.routes.ts` track/* |
| 8 | Security | 5 endpoints missing body validation | `campaign.routes.ts` multiple |
| 9 | Security | Update schema allows direct metric manipulation | `campaign.validator.ts` |
| 10 | Security | Scheduler non-atomic status claim (double-fire risk) | `campaign-scheduler.service.ts` |
| 11 | Bug | Stats/Budget/Charts don't update with type filter tab | `CampaignsList.tsx` |
| 12 | Bug | Orphan DRAFT campaigns from abandoned create flow | `CampaignCreate.tsx` |
| 13 | Bug | No per-step validation in campaign creation wizard | `CampaignCreate.tsx` |
| 14 | Bug | CampaignEdit missing A/B test + recurring fields | `CampaignEdit.tsx` |
| 15 | Bug | ROI displayed inconsistently (%, x, raw number) | Multiple |
| 16 | Bug | Pie chart dataKey/label mismatch (revenue size vs ROI label) | `CampaignsList.tsx` |
| 17 | Bug | Grid view missing action menu options vs list view | `CampaignsList.tsx` |
| 18 | Bug | SOCIAL type accepted by validator, rejected by executor | `campaign.validator.ts` / `campaign-executor.service.ts` |
| 19 | Bug | No DRAFT or CANCELLED filter tabs in campaign list | `CampaignsList.tsx` |
| 20 | Bug | Raw ISO dates shown on campaign cards | `CampaignsList.tsx` |
| 21 | Bug | Duplicate campaign copies metrics (shows false history) | `campaign.controller.ts` duplicateCampaign |
| 22 | Bug | Campaign cards show raw ROI without % or x suffix | `CampaignsList.tsx` |
| 23 | Performance | 6 parallel API calls on CampaignDetail load | `CampaignDetail.tsx` |
| 24 | Performance | N+1 query in getTopPerformingCampaigns | `campaignAnalytics.service.ts` |
| 25 | Test | No org isolation tests | `campaign.test.ts` |
| 26 | Test | No status transition validation tests | `campaign.test.ts` |
| 27 | Test | No send campaign tests | `campaign.test.ts` |
| 28 | Test | Zero frontend component tests | Missing |

### 🟢 P2 — Medium (Next Sprint)

| # | Category | Issue | File(s) |
|---|----------|-------|---------|
| 29 | UX | Phone tab renders full dashboard below "Coming Soon" | `CampaignsList.tsx` |
| 30 | UX | Calendar view is a date-grouped list, not a visual calendar | `CampaignsList.tsx` |
| 31 | UX | Dual edit surfaces (inline modal + page) with different fields | `CampaignDetail.tsx` + `CampaignEdit.tsx` |
| 32 | UX | Unsubscribe count not shown in frontend | `CampaignDetail.tsx` |
| 33 | UX | Revenue format inconsistency ($XK vs $X,XXX.XX) | Multiple |
| 34 | UX | Budget bar can exceed 100% in some views | `CampaignsList.tsx` |
| 35 | UX | No empty state for comparison table | `CampaignsList.tsx` |
| 36 | UX | Template stat icons all identical | `CampaignTemplates.tsx` |
| 37 | Bug | Audience filters don't persist across page reload | `AdvancedAudienceFilters.tsx` |
| 38 | Bug | End date can be set before start date (CampaignEdit) | `CampaignEdit.tsx` |
| 39 | Bug | Recurring campaign detection via name pattern (fragile) | `CampaignSchedule.tsx` |
| 40 | Bug | Execution status polling runs indefinitely (no backoff) | `CampaignExecutionStatus.tsx` |
| 41 | Bug | A/B test validates < 2 variants | `ABTesting.tsx` |
| 42 | Bug | SMS segment calculation uses 160 instead of 153 for multi-part | `CampaignCreate.tsx` |
| 43 | Security | Analytics service has no org scoping (defense-in-depth) | `campaignAnalytics.service.ts` |
| 44 | Accessibility | Missing htmlFor/id on form labels | `CampaignEdit.tsx`, `CampaignCreate.tsx` |
| 45 | Accessibility | No keyboard navigation for grid view cards | `CampaignsList.tsx` |

### ⚪ P3 — Low (Backlog)

| # | Category | Issue | File(s) |
|---|----------|-------|---------|
| 46 | Code Quality | Campaign type icons hardcoded/duplicated across views | `CampaignsList.tsx` |
| 47 | Code Quality | Magic numbers in batch processing (100, 3) | `campaign-executor.service.ts` |
| 48 | Code Quality | Date formatting inconsistency across files | Multiple |
| 49 | Code Quality | Console.log statements in production code | Multiple |
| 50 | Code Quality | Unused imports in campaign pages | Multiple |
| 51 | UX | No loading skeletons on Edit/Schedule pages | `CampaignEdit.tsx`, `CampaignSchedule.tsx` |
| 52 | UX | Status badge colors differ between list/detail views | Multiple |
| 53 | Test | No E2E test for full campaign create wizard | `05-campaigns.spec.ts` |
| 54 | Test | No concurrent send/race condition tests | Missing |
| 55 | Bug | `noRecipients` flag defined but never used in PreviewModal | `CampaignPreviewModal.tsx` |
| 56 | Bug | Template category filtering is case-sensitive | `CampaignTemplates.tsx` |
| 57 | Bug | `recurringPattern` string vs object type mismatch in edit | `CampaignEdit.tsx` |

---

## 13. Recommended Action Plan

### Phase 1: Security Fixes (Immediate)
1. **Add leadId/messageId org ownership verification** to tracking endpoints
2. **Make organizationId mandatory** (not conditional) in getCampaignStats
3. **Verify lead ownership** in POST /:id/recipients
4. **Add Zod validation** to tracking endpoints and 5 other unvalidated endpoints
5. **Separate user-editable fields** from system metrics in update schema
6. **Atomic status claim** in scheduler (WHERE status guard on UPDATE)

### Phase 2: Critical Bug Fixes (This Week)
7. **Implement server-side pagination** — pass page/limit/status/type to API in CampaignsList, Schedule, Reports
8. **Add SENDING + DRAFT + CANCELLED** to frontend status filter tabs
9. **Fix stats/budget/charts** to update when type filter changes
10. **Fix ROI display** — standardize as percentage with consistent formatting
11. **Fix pie chart** — align dataKey with labels (both revenue OR both ROI)
12. **Format dates** — use `toLocaleDateString()` or date-fns instead of raw ISO strings

### Phase 3: Feature Gaps (This Sprint)
13. **Add A/B test + recurring fields** to CampaignEdit
14. **Add per-step validation** in campaign creation wizard
15. **Show unsubscribe rate** in CampaignDetail
16. **Only show "Coming Soon"** for Phone tab (not full dashboard)
17. **Consolidate edit surfaces** — decide on inline modal OR edit page
18. **Add orphan draft cleanup** — background job or pre-confirm create flow

### Phase 4: Test Coverage (Next Sprint)
19. **Add org isolation tests** — multi-tenant CRUD denial
20. **Add status transition tests** — invalid transitions rejected
21. **Add send campaign tests** — full send flow
22. **Add frontend component tests** — at minimum CampaignsList, CampaignCreate
23. **Add E2E campaign create wizard test** — full form submission

### Phase 5: Polish (Backlog)
24. Budget bar Math.min clamp in all views
25. Keyboard accessibility for grid cards
26. Form label htmlFor/id attributes
27. Loading skeletons for edit/schedule pages
28. Calendar view implementation
29. Standardize date formatting library

---

## What's Working Well ✅

1. **Full CRUD lifecycle** with real API integration and React Query cache invalidation
2. **Multi-channel support** — Email (full), SMS (full), with graceful "Coming Soon" for Phone/Social
3. **Multi-step creation wizard** — 6 steps with save-as-draft, preview, and AI content generation
4. **Real-time execution tracking** — polling component with phase progress visualization
5. **DOMPurify sanitization** — XSS-safe HTML rendering in previews and detail views
6. **A/B Testing** — full test creation, running, and results analysis
7. **CAN-SPAM + TCPA compliance** — auto-generated unsubscribe links and STOP opt-out
8. **Advanced audience filters** — custom filter builder with 10 field types
9. **Template system** — 10 real estate templates with category filtering
10. **Recurring campaigns** — daily/weekly/monthly with day-of-week picker
11. **Three view modes** — list, grid, calendar on main campaigns list
12. **Bulk actions** — multi-select with status change, delete, export CSV
13. **Role-based access** — backend uses role filters for org-level isolation
14. **Plan limit enforcement** — middleware prevents exceeding subscription limits
15. **Rate limiting** — sensitive endpoints protected against abuse
16. **Zod validation** — type-safe request validation on major endpoints
17. **Rich email editor** — block-based editor with MJML compilation
18. **Budget tracking** — budget vs. spent visualization
19. **Lazy loading** — all pages lazy-loaded with Suspense + Error Boundaries
20. **Comprehensive analytics** — funnel, timeline, hourly, device, geo, link tracking

---

*Audit complete. 57 issues identified: 6 P0 (Critical), 22 P1 (High), 17 P2 (Medium), 12 P3 (Low).*
