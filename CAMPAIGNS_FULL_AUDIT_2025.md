# Campaigns Full System Audit — March 2026

## Executive Summary

Full-stack audit of the campaign system covering backend (controller, routes, services, validators), frontend (8 pages, 5 components), database schema, and test coverage. **60 issues identified** across 4 severity levels.

| Severity | Count | Description |
|----------|-------|-------------|
| **P0 — Critical** | 8 | Security vulnerabilities, data corruption risks, stuck states |
| **P1 — High** | 16 | Functional bugs, missing validation, incomplete features |
| **P2 — Medium** | 18 | UX issues, code quality, inconsistencies |
| **P3 — Low** | 18 | Test coverage gaps, documentation, polish |

---

## System Architecture Overview

### Backend (12,200+ LOC)

| Component | File | Lines | Endpoints/Functions |
|-----------|------|-------|---------------------|
| Routes | `backend/src/routes/campaign.routes.ts` | ~627 | 30+ routes |
| Controller | `backend/src/controllers/campaign.controller.ts` | ~1,532 | 28 exports |
| Validators | `backend/src/validators/campaign.validator.ts` | ~160 | 15 Zod schemas |
| Executor | `backend/src/services/campaign-executor.service.ts` | ~828 | Batch send, A/B, compliance |
| Analytics | `backend/src/services/campaignAnalytics.service.ts` | ~503 | Metrics, tracking, comparison |
| Scheduler | `backend/src/services/campaign-scheduler.service.ts` | ~397 | Recurring, deferred sends |
| Templates | `backend/src/data/campaign-templates.ts` | ~361 | 10 pre-built templates |

### Frontend (6,850+ LOC)

| Page | File | Lines |
|------|------|-------|
| CampaignsList | `src/pages/campaigns/CampaignsList.tsx` | ~1,600 |
| CampaignCreate | `src/pages/campaigns/CampaignCreate.tsx` | ~1,400 |
| CampaignDetail | `src/pages/campaigns/CampaignDetail.tsx` | ~1,000 |
| CampaignReports | `src/pages/campaigns/CampaignReports.tsx` | ~740 |
| ABTesting | `src/pages/campaigns/ABTesting.tsx` | ~656 |
| CampaignSchedule | `src/pages/campaigns/CampaignSchedule.tsx` | ~584 |
| CampaignEdit | `src/pages/campaigns/CampaignEdit.tsx` | ~458 |
| CampaignTemplates | `src/pages/campaigns/CampaignTemplates.tsx` | ~374 |

### Database (Prisma)

- **Campaign** model: 40+ fields (identity, content, scheduling, financial, metrics, A/B, recurring, management)
- **CampaignLead**: Per-recipient tracking (sent, delivered, opened, clicked, converted, bounced)
- **CampaignAnalytics**: Aggregated metrics snapshots
- **ABTestResult**: Per-variant results
- 10 compound indexes for query performance

---

## P0 — CRITICAL ISSUES (Fix Immediately)

### SEC-1: Tracking endpoints don't verify lead belongs to user's organization
**File:** `backend/src/controllers/campaign.controller.ts` (Lines 1325–1395)  
**Endpoints:** `POST /:id/track/open`, `POST /:id/track/click`, `POST /:id/track/conversion`

The `leadId` is accepted from the request body and passed directly to the analytics service without verifying it belongs to the caller's organization. An authenticated user from Org A could track events against leads in Org B, corrupting their analytics and manipulating lead scores (+5/+10/+40 points per event).

```typescript
// Current (VULNERABLE):
export const trackOpen = async (req: Request, res: Response) => {
  const { leadId, messageId } = req.body;
  await trackEmailOpen(id, leadId, messageId, req.user!.organizationId);
  // ← leadId NOT verified as belonging to req.user!.organizationId
};
```

**Fix:** Verify lead ownership before tracking:
```typescript
const lead = await prisma.lead.findFirst({
  where: { id: leadId, organizationId: req.user!.organizationId }
});
if (!lead) throw new NotFoundError('Lead not found');
```

**Impact:** Cross-tenant data corruption, lead score manipulation  
**CVSS:** 7.5 (High)

---

### SEC-2: Analytics service missing organization scoping
**File:** `backend/src/services/campaignAnalytics.service.ts` (entire file)

The `getCampaignMetrics`, `getLinkClickStats`, `getCampaignTimeSeries`, and `compareCampaigns` functions accept a `campaignId` but never verify the campaign belongs to the requesting user's organization. While the controller layer adds org checks for some endpoints, the service layer itself has no defense-in-depth.

**Impact:** If any new route calls these services without controller-level org checks, cross-tenant data leakage occurs.

---

### SEC-3: `compareCampaigns` service has no org scoping
**File:** `backend/src/services/campaignAnalytics.service.ts` (Line ~440)

```typescript
export async function compareCampaigns(campaignIds: string[]) {
  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: campaignIds } },
    // ← NO organizationId filter!
  });
}
```

The controller (`compareCampaignsEndpoint`) does pre-filter `campaignIds` by org, but the service itself is unprotected. The `getTopPerformingCampaigns` function similarly uses an optional `organizationId` parameter that can be omitted.

---

### BUG-1: Scheduler race condition on campaign status claim
**File:** `backend/src/services/campaign-scheduler.service.ts` (Lines 166–182)

The scheduler uses `updateMany` with a status guard to "claim" a campaign, but this isn't truly atomic — between the `findMany` and `updateMany` there's a window where another scheduler instance could claim the same campaign. Under high load or multi-instance deployments, this can cause duplicate sends.

```typescript
const claimed = await prisma.campaign.updateMany({
  where: { id: campaign.id, status: campaign.status },
  data: { status: 'SENDING' },
});
```

**Fix:** Use a database-level advisory lock or a `SELECT ... FOR UPDATE` pattern within a transaction.

---

### BUG-2: `executeCampaign` doesn't verify campaign ownership
**File:** `backend/src/services/campaign-executor.service.ts` (Lines 79–85)

```typescript
const campaign = await prisma.campaign.findUnique({
  where: { id: campaignId },
  // ← NO organizationId check
});
```

While callers (controller endpoints) verify ownership before calling `executeCampaign`, the service itself is unprotected. Internal callers (scheduler) don't need to pass `organizationId`, but the lack of defense-in-depth is a risk.

---

### BUG-3: `sendCampaignNow` sets COMPLETED before executor finishes recurring logic
**File:** `backend/src/controllers/campaign.controller.ts` (Lines 678–695)

After `executeCampaign` returns, the controller unconditionally sets status to `COMPLETED` with `endDate: new Date()`. This overrides the executor's status transition — if the campaign was recurring, this breaks the recurring chain permanently.

```typescript
await prisma.campaign.update({
  where: { id },
  data: {
    status: 'COMPLETED',  // ← Overwrites executor's ACTIVE status
    endDate: new Date(),
  },
});
```

**Fix:** Only set `COMPLETED` for non-recurring campaigns; let recurring campaigns keep their executor-set status.

---

### BUG-4: `previewCampaign` service doesn't verify campaign ownership
**File:** `backend/src/services/campaign-executor.service.ts` (Line ~770)

```typescript
const campaign = await prisma.campaign.findUnique({
  where: { id: campaignId },
  // ← NO organizationId check
});
```

The `getCampaignPreview` controller does check ownership, but the `previewCampaign` service function doesn't — it's callable internally without org scoping.

---

### BUG-5: Handlebars template injection incomplete
**File:** `backend/src/services/campaign-executor.service.ts` (Lines 410–420)

The `esc()` function escapes `{{` and `{{{` patterns in lead data to prevent Handlebars injection, but this is applied to individual fields. If lead data contains nested objects or arrays that are serialized differently, the escaping could be bypassed. Additionally, the preview endpoint in the controller (Line ~900) registers an `esc` Handlebars helper but doesn't use the same escaping logic as the executor.

---

## P1 — HIGH PRIORITY ISSUES

### P1-1: CampaignEdit missing recurring campaign fields
**File:** `src/pages/campaigns/CampaignEdit.tsx` (Lines 40–68)

The edit form initializes state without `isRecurring`, `frequency`, `recurringPattern`, `daysOfWeek`, `maxOccurrences` fields. Editing a recurring campaign silently drops these settings.

### P1-2: CampaignEdit missing `abTestEvalHours` initialization
**File:** `src/pages/campaigns/CampaignEdit.tsx` (Lines 50–62)

A/B test evaluation hours are not loaded into the form state, so editing an A/B test campaign resets `abTestEvalHours` to the default.

### P1-3: Client-side-only pagination on campaigns list
**File:** `src/pages/campaigns/CampaignsList.tsx` (Lines 291–304)

The API supports server-side pagination (`page`, `limit`, `sortBy`, `sortOrder` params), but the frontend loads all campaigns and paginates client-side with `useMemo`. This won't scale beyond a few hundred campaigns.

### P1-4: No status transition validation in frontend
**File:** `src/pages/campaigns/CampaignCreate.tsx`

The create wizard allows setting any initial status without verifying it's a valid starting state. For example, a user could set initial status to `COMPLETED` on a brand-new campaign.

### P1-5: SMS segment calculation uses wrong character limit
**File:** `backend/src/services/campaign-executor.service.ts`

SMS messages over 160 characters use 153 characters per segment (7 bytes for UDH header), but the cost estimation in the preview doesn't account for this. Multi-part SMS cost is underestimated.

### P1-6: A/B test validation gaps
**File:** `src/pages/campaigns/ABTesting.tsx` (Lines 67–71)

No validation for:
- Minimum confidence threshold (should be ≥ 50%, ≤ 99%)
- A/B evaluation hours range (validator allows 1–720 but UI doesn't enforce)
- Minimum sample size for statistical significance

### P1-7: `getTargetLeads` returns all leads when no filters or leadIds provided
**File:** `backend/src/services/campaign-executor.service.ts` (Lines 260–305)

If `executeCampaign` is called with no `leadIds` and no `filters`, and the campaign has no tags, `getTargetLeads` returns ALL leads in the organization. This could accidentally send to the entire database.

### P1-8: Delete endpoint does soft-delete but returns "deleted" message
**File:** `backend/src/controllers/campaign.controller.ts` (Lines 370–395)

The delete endpoint actually archives the campaign (sets `isArchived: true`, `status: 'CANCELLED'`), but returns `message: 'Campaign deleted successfully'`. This is misleading and the operation doesn't clean up related `CampaignLead` rows.

### P1-9: No idempotency on tracking endpoints
**File:** `backend/src/controllers/campaign.controller.ts` (Lines 1325–1395)

The `trackOpen`, `trackClick`, and `trackConversion` endpoints have no deduplication. A single email open can be tracked multiple times (e.g., email client reloads images), inflating metrics. The `CampaignLead` model has `openedAt` for dedup but it's not checked.

### P1-10: Recurring campaign `nextSendAt` not set on creation
**File:** `backend/src/controllers/campaign.controller.ts` (Lines 210–255)

When creating a recurring campaign, `nextSendAt` is not calculated or set. The scheduler relies on `nextSendAt` to find due campaigns, so a newly created recurring campaign in ACTIVE status will never be picked up until manually triggered.

### P1-11: compareCampaigns endpoint accepts arbitrary campaign IDs
**File:** `backend/src/controllers/campaign.controller.ts` (Lines 1458–1490)

While the controller filters IDs by org, it passes `validIds` (which may be a subset) to the service. If some IDs were filtered out (cross-org), the user gets partial results with no warning.

### P1-12: `getCampaignStats` doesn't exclude archived campaigns
**File:** `backend/src/controllers/campaign.controller.ts` (Lines 430–480)

Stats aggregation includes archived campaigns in totals, which skews metrics (e.g., total sent, total revenue). Should filter `isArchived: false` by default.

### P1-13: A/B test shuffle uses Math.random (not cryptographically secure)
**File:** `backend/src/services/campaign-executor.service.ts` (Line ~685)

```typescript
const shuffled = [...leads].sort(() => Math.random() - 0.5);
```

`Math.random()` produces a biased sort. Use Fisher-Yates shuffle for fair A/B audience distribution.

### P1-14: Bulk error details not shown to user
**File:** `src/pages/campaigns/CampaignsList.tsx` (Lines 315–330)

Bulk delete/status operations use `Promise.allSettled` correctly but only show a count of failures, not which campaigns failed or why.

### P1-15: Calendar view not implemented
**File:** `src/pages/campaigns/CampaignsList.tsx`

The calendar view mode option exists in the UI but renders a list, not a calendar.

### P1-16: Grid view menu missing actions
**File:** `src/pages/campaigns/CampaignsList.tsx`

Grid view context menu is missing pause, resume, send now, and archive actions that are available in list view.

---

## P2 — MEDIUM PRIORITY ISSUES

### P2-1: Controller files exceed 1,500 lines
`campaign.controller.ts` (1,532 lines) should be split into sub-controllers (CRUD, execution, analytics, templates).

### P2-2: CampaignCreate.tsx at ~1,400 lines
Should extract step components into separate files.

### P2-3: CampaignsList.tsx at ~1,600 lines
Should extract view modes (list/grid/calendar) into separate components.

### P2-4: `getCampaignPreview` uses `require('handlebars')`
**File:** `backend/src/controllers/campaign.controller.ts` (Line ~898)

Uses CommonJS `require()` for Handlebars inside an async function instead of the top-level ES import used elsewhere. Inconsistent and bypasses tree-shaking.

### P2-5: Multiple parallel API calls on CampaignDetail page load
6+ API calls fire simultaneously on mount (`getCampaign`, `getAnalytics`, `getLinkStats`, `getTimeline`, `getRecipients`, `getABTestResults`). Should waterfall or lazy-load.

### P2-6: Revenue format inconsistency
Some places format revenue as dollars, others as raw numbers. No centralized currency formatter.

### P2-7: Raw ISO dates displayed in campaign list
Dates like `2025-10-24T00:00:00.000Z` shown instead of formatted dates.

### P2-8: No loading states on row menu actions
Clicking "Send Now", "Pause", etc. in the row menu has no loading indicator while the API call is in progress.

### P2-9: Campaign comparison shows "undefined" for null values
Comparison table renders `undefined` when a campaign has null metrics fields.

### P2-10: AdvancedAudienceFilters has hardcoded 10M budget limit
**File:** `src/components/campaigns/AdvancedAudienceFilters.tsx` (Lines 76–78)

Budget field clamped to $10,000,000 max — should be configurable or derived from plan limits.

### P2-11: Duplicate Handlebars escape logic
Template variable escaping is duplicated in 3 places:
- `sendEmailCampaign()` (executor)
- `sendSMSCampaign()` (executor)
- `getCampaignPreview()` (controller)

Should be extracted to a shared utility.

### P2-12: `getTopPerformingCampaigns` fetches 100 campaigns then N+1 queries metrics
**File:** `backend/src/services/campaignAnalytics.service.ts`

Fetches 100 campaigns, then calls `getCampaignMetrics` for each (which itself does 3 queries per campaign). This is 301 queries for the top performers endpoint.

### P2-13: No pagination on recipients endpoint GET query
The GET `/:id/recipients` endpoint properly paginates but limits to max 100 per page. For campaigns with 10,000+ recipients, users must page through 100+ pages.

### P2-14: Error responses expose internal error messages
**File:** `backend/src/controllers/campaign.controller.ts` (Lines 1330–1395)

Tracking endpoint error responses include `error: err.message`, which could leak internal state information to the client.

### P2-15: `executeCampaign` mutates the `leads` array in place
**File:** `backend/src/services/campaign-executor.service.ts` (Lines 170–175)

```typescript
leads.length = 0;
leads.push(...immLeads);
```

Direct mutation of the `leads` array is fragile. Should reassign to a new variable.

### P2-16: No campaign name uniqueness enforcement
Multiple campaigns can have identical names, making it hard to distinguish in reports and comparisons.

### P2-17: `sendCampaignSchema` allows empty `filters` object
The `sendCampaignSchema` uses `.strict()` but allows an empty `filters: {}` which results in sending to ALL leads (via `getTargetLeads` fallback behavior).

### P2-18: Phone campaign type accepted but unsupported
Validator allows `PHONE` type, but executor throws "Campaign type PHONE not supported". Should reject at creation time or show clear "Coming Soon" status.

---

## P3 — LOW PRIORITY / TEST COVERAGE GAPS

### Test Coverage Summary

| Layer | File | Tests | Coverage |
|-------|------|-------|----------|
| Backend API | `backend/tests/campaign.test.ts` | 19 tests | ~25% of endpoints |
| E2E | `e2e/tests/05-campaigns.spec.ts` | 11 tests | Smoke only (0% functional) |
| Frontend Unit | (none) | 0 | 0% |
| Services | (none) | 0 | 0% |
| **Total** | | **30 tests** | **~15–20% estimated coverage** |

### Missing Test Categories

**Backend API (not tested):**
- POST `/campaigns/:id/send` — Campaign execution
- POST `/campaigns/:id/duplicate` — Campaign duplication
- POST `/campaigns/:id/archive` / `/unarchive`
- PATCH `/campaigns/:id/reschedule`
- POST `/campaigns/:id/send-now`
- POST `/campaigns/:id/recipients` — Add recipients
- GET `/campaigns/:id/recipients` — List recipients
- POST `/campaigns/:id/track/*` — Tracking endpoints
- GET `/campaigns/:id/analytics/*` — Analytics endpoints
- POST `/campaigns/compare` — Campaign comparison
- GET `/campaigns/top-performers`
- Organization isolation (cross-tenant access)
- Status transition validation (invalid transitions)
- Concurrent send protection
- Rate limiting behavior
- Plan limit enforcement

**Services (zero test files):**
- `campaign-executor.service.ts` — Batch processing, A/B splitting, compliance
- `campaign-scheduler.service.ts` — Scheduling, recurring logic, deferred sends
- `campaignAnalytics.service.ts` — Metrics aggregation, tracking, time series
- `send-time-optimizer.service.ts` — Optimization algorithms

**Frontend (zero test files):**
- CampaignCreate wizard flow and validation
- CampaignEdit form completeness
- CampaignsList filtering, pagination, bulk operations
- CampaignDetail analytics rendering
- ABTesting creation and evaluation
- All campaign components

**E2E (smoke only — no functional tests):**
- Campaign CRUD lifecycle
- Send campaign flow
- A/B test creation and winner selection
- Template usage flow
- Recurring campaign setup
- Bulk operations
- Error states and validation

---

## What's Working Well

1. **Full CRUD lifecycle** — All operations connected to real API endpoints with mutations + cache invalidation
2. **Multi-channel support** — Email (full), SMS (full), Phone/Social (coming soon)
3. **Real-time execution tracking** — Polling-based progress with phase progression
4. **A/B Testing** — Full test creation, running, auto-evaluation, and results
5. **Template system** — 10 pre-made real estate templates with one-click creation
6. **Recurring campaigns** — Daily/weekly/monthly with day-of-week and time selection
7. **Multi-tenancy** — Organization-level isolation on most endpoints
8. **CAN-SPAM compliance** — Unsubscribe tokens, footer injection, per-lead tracking
9. **TCPA compliance** — STOP opt-out footer for SMS, opt-in checking
10. **Batch processing** — Email/SMS sent in batches of 100 with 3 parallel batches
11. **Send-time optimization** — Per-lead optimal send time calculation with deferred sends
12. **Advanced audience filters** — Dynamic filter builder with 10+ field types
13. **Input validation** — Zod schemas on all write endpoints
14. **Rate limiting** — Applied on sensitive operations (send, create, archive)
15. **XSS prevention** — DOMPurify sanitization on preview modal
16. **Status rollback** — Executor rolls back from SENDING to DRAFT on failure
17. **Plan limits** — Monthly message limits and campaign count enforcement

---

## Recommended Fix Priority

### Sprint 1 (Security — Immediate)
1. SEC-1: Add lead org verification to tracking endpoints
2. SEC-2: Add org scoping to analytics service functions
3. SEC-3: Add org filter to `compareCampaigns` service
4. BUG-5: Audit Handlebars escaping for completeness

### Sprint 2 (Data Integrity)
5. BUG-1: Add proper locking for scheduler campaign claims
6. BUG-2: Add org check to `executeCampaign`
7. BUG-3: Fix `sendCampaignNow` for recurring campaigns
8. P1-9: Add deduplication to tracking endpoints
9. P1-10: Set `nextSendAt` on recurring campaign creation

### Sprint 3 (Feature Completeness)
10. P1-1: Add recurring fields to CampaignEdit
11. P1-2: Add `abTestEvalHours` to CampaignEdit
12. P1-3: Implement server-side pagination on frontend
13. P1-7: Require explicit audience selection before sending
14. P1-15: Implement calendar view or remove the option

### Sprint 4 (Testing)
15. Add integration tests for send, duplicate, archive, tracking endpoints
16. Add service-level unit tests for executor, scheduler, analytics
17. Add frontend component tests for form validation
18. Expand E2E tests to cover functional flows

---

*Audit performed: March 16, 2026*  
*Auditor: Full-stack code review of all 20+ campaign files, 12,200+ LOC*
