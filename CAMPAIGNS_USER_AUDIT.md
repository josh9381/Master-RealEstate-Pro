# Campaigns User-Focused Audit — Full Stack

**Date:** 2026-03-14  
**Scope:** All campaign-related frontend pages, components, backend routes, controllers, services, validators, and Prisma schema.

---

## 1. Architecture Overview

### Frontend (React + TanStack Query)
| File | Purpose |
|------|---------|
| `src/pages/campaigns/CampaignsList.tsx` | List, filter, bulk actions, 3 view modes (list/grid/calendar) |
| `src/pages/campaigns/CampaignCreate.tsx` | 3-step wizard: type → details → configure, preview modal |
| `src/pages/campaigns/CampaignDetail.tsx` | Single campaign view with analytics, charts, deliverability |
| `src/pages/campaigns/CampaignEdit.tsx` | Inline edit form with block email editor |
| `src/pages/campaigns/CampaignSchedule.tsx` | Scheduled/sent/recurring campaigns with reschedule modal |
| `src/pages/campaigns/CampaignReports.tsx` | Overview analytics, performance trends, campaign comparison table |
| `src/pages/campaigns/CampaignTemplates.tsx` | Browse and use pre-built templates |
| `src/components/campaigns/CampaignsSubNav.tsx` | Shared sub-navigation with type filter counts |
| `src/components/campaigns/CampaignExecutionStatus.tsx` | Real-time execution polling (3s interval) |
| `src/components/campaigns/CampaignPreviewModal.tsx` | Pre-send confirmation with cost/recipient preview |
| `src/lib/api.ts` (campaignsApi) | 25+ API methods covering full CRUD + analytics + tracking |

### Backend (Express + Prisma)
| File | Purpose |
|------|---------|
| `backend/src/routes/campaign.routes.ts` | 25+ route definitions with auth, validation, rate limiting |
| `backend/src/controllers/campaign.controller.ts` | All handler logic (CRUD, send, analytics, templates, A/B test) |
| `backend/src/validators/campaign.validator.ts` | Zod schemas for create/update/send/list/metrics |
| `backend/src/services/campaign-executor.service.ts` | Actual email/SMS sending with batch processing |
| `backend/src/services/campaignAnalytics.service.ts` | Metrics aggregation, tracking (open/click/conversion) |
| `backend/src/services/campaign-scheduler.service.ts` | Recurring campaign scheduling |
| `backend/src/services/send-time-optimizer.service.ts` | Per-lead optimal send time calculation |
| `backend/src/data/campaign-templates.ts` | Pre-built template definitions |

### Database (Prisma Schema)
- **Campaign** — 40+ fields: full lifecycle, metrics, A/B testing, recurring, send-time optimization, archiving
- **CampaignLead** — Per-recipient tracking (sent/delivered/opened/clicked/converted/bounced)
- **CampaignAnalytics** — Aggregated snapshot with rates

---

## 2. CRITICAL BUGS (P0) — User-Facing Breakage

### BUG-1: `SENDING` Status Not in Validator Enum → Stale Campaign State
- **Location:** `campaign.validator.ts` line 11 defines `campaignStatusSchema` as `['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']`
- **Problem:** The executor sets status to `'SENDING'` (`campaign-executor.service.ts` ~line 195), but this status is NOT in the Zod enum. If a user tries to view or update a campaign while it's in `SENDING` status via the frontend, any status-related operations will fail validation.
- **Impact:** Users see campaigns stuck in a limbo state; the frontend `CampaignExecutionStatus` component references phase `'sending'` but the status tab filters only handle `ACTIVE/SCHEDULED/PAUSED/COMPLETED`. Campaigns in `SENDING` status won't appear in any tab.
- **Fix:** Add `'SENDING'` to `campaignStatusSchema` and handle it in frontend status tabs/filters.

### BUG-2: `CANCELLED` Status in Validator but Missing From Frontend Tabs
- **Location:** `CampaignsList.tsx` line ~720 — status tabs are `['all', 'ACTIVE', 'SCHEDULED', 'PAUSED', 'COMPLETED']`
- **Problem:** `CANCELLED` and `DRAFT` campaigns are only visible under "All" tab. Users who cancel a campaign can't find it in a dedicated tab.
- **Impact:** Cancelled campaigns are hidden; draft campaigns are hidden from dedicated filtering.
- **Fix:** Add `DRAFT` and `CANCELLED` tabs, or display them under existing tabs with visual differentiation.

### BUG-3: `pauseCampaign` Controller Doesn't Validate Status Transition
- **Location:** `campaign.controller.ts` `pauseCampaign` function
- **Problem:** The controller sets `status: 'PAUSED'` without checking if the current status allows pausing. Only `ACTIVE` campaigns should be pausable. Currently, a `DRAFT` or `COMPLETED` campaign can be paused, which makes no logical sense.
- **Impact:** Users can put completed or draft campaigns into a `PAUSED` state, creating confusion.
- **Fix:** Add status validation: only allow pause from `ACTIVE` or `SENDING`.

### BUG-4: `DELETE /campaigns/:id` Is a Hard Delete — No Confirmation or Soft Delete
- **Location:** `campaign.controller.ts` `deleteCampaign`
- **Problem:** Campaigns are permanently deleted with `prisma.campaign.delete()`. This cascades to all `Activity`, `CampaignLead`, and `CampaignAnalytics` records.
- **Impact:** Users lose all historical campaign data permanently. For a CRM, this is destructive — especially if a campaign has been sent to hundreds of leads.
- **Fix:** Consider soft-delete (already have `isArchived`/`archivedAt` fields), or require campaign to be archived before deletion, or add an "undo" period.

---

## 3. HIGH SEVERITY BUGS (P1) — Significant UX Issues

### BUG-5: Client-Side Pagination Fetches ALL Campaigns
- **Location:** `CampaignsList.tsx` line ~107-112
- **Problem:** The query fetches all campaigns (`campaignsApi.getCampaigns(params)` with no page/limit), then filters/paginates client-side. The commented-out status filter confirms this was intentional "for better UX."
- **Impact:** With hundreds of campaigns, this causes slow load times and excessive memory usage. The backend supports pagination (`page`, `limit` params) but the frontend ignores it.
- **Fix:** Implement server-side pagination. Pass `page`, `limit`, and `status` to the API. Use the backend's `totalPages` for pagination controls.

### BUG-6: Search Filter Applied to `searchQuery` Instead of `debouncedSearch`
- **Location:** `CampaignsList.tsx` line ~228
- **Problem:** `filteredCampaigns` filter uses `searchQuery` (un-debounced) for client-side filtering, while the API query uses `debouncedSearch`. This means:
  1. Client-side filtering is instant but the API refetch lags behind
  2. If server returns filtered results, client filter runs on top with mismatched terms
- **Impact:** Flickering/inconsistent search results during typing.
- **Fix:** Use `debouncedSearch` consistently in both API query and client-side filter, OR move all filtering server-side.

### BUG-7: Bulk Status Change Uses `mutateAsync` in `Promise.all` Without Error Boundaries
- **Location:** `CampaignsList.tsx` `handleStatusChange` (~line 315)
- **Problem:** Uses `Promise.all()` to change status of multiple campaigns, but invalid status transitions (e.g., `COMPLETED → ACTIVE`) will silently fail per-campaign. The catch block shows a generic "Failed to update some campaigns" with no specifics.
- **Impact:** Users think bulk operations succeeded, but some campaigns weren't updated. No indication of which ones failed or why.
- **Fix:** Use `Promise.allSettled()`, report individual failures with campaign names and reasons.

### BUG-8: `resumeCampaignMutation` Sends `status: 'ACTIVE'` Without Checking Current State
- **Location:** `CampaignsList.tsx` line ~200
- **Problem:** Resume uses `campaignsApi.updateCampaign(id, { status: 'ACTIVE' })`. The backend's `updateCampaign` validates transitions, but the UI only shows the Resume button for `PAUSED` campaigns. However, if the campaign was cancelled and somehow reaches this state, the transition would be rejected.
- **Impact:** Potential silent failure in edge cases. The error toast says "Failed to resume campaign" with no context.
- **Fix:** Minor — add error message from API response to toast.

### BUG-9: `CampaignDetail` Edit Modal Allows Setting Past Start Date for Non-Active Campaigns
- **Location:** `CampaignDetail.tsx` line ~305
- **Problem:** The validation `if (editForm.startDate && new Date(editForm.startDate) < new Date() && editForm.status !== 'ACTIVE')` allows past dates for ACTIVE campaigns but blocks them for others. However, it should also allow past dates for COMPLETED campaigns (historical data).
- **Impact:** Minor UX confusion — users editing completed campaigns can't keep the original past start date.
- **Fix:** Only validate future dates for DRAFT/SCHEDULED campaigns.

### BUG-10: No `DRAFT` Status Filter in Campaign List Tabs
- **Location:** `CampaignsList.tsx` status tabs
- **Problem:** New campaigns default to `DRAFT` status, but the status filter tabs don't include `DRAFT`. Users must use the "All" tab to find drafts.
- **Impact:** Confusing for users who save drafts and then can't easily find them.
- **Fix:** Add `DRAFT` to the tabs array.

---

## 4. MEDIUM SEVERITY ISSUES (P2) — UX Polish & Data Integrity

### ISSUE-11: ROI Calculation Inconsistency Between Frontend and Backend
- **Backend** (`campaign.controller.ts`): ROI = `((revenue - spent) / spent) * 100` → percentage
- **Frontend** (`CampaignsList.tsx`): ROI displayed as `{campaign.roi}x` → treats it as a multiplier
- **Frontend stats**: `avgROI = totalRevenue / totalSpent` → different formula entirely
- **Impact:** ROI shows as "100x" when it should be "100%" or "1x". Metrics are misleading.
- **Fix:** Standardize ROI calculation. The backend stores percentage ROI, but the frontend displays it with "x" suffix, suggesting it's a multiplier.

### ISSUE-12: Campaign Type "SOCIAL" Listed as Coming Soon But Still in Backend Schema
- **Backend:** `CampaignType` enum includes `SOCIAL`, the validator accepts it
- **Frontend:** Social type card shows "Coming Soon" badge and is clickable but blocked
- **Impact:** If someone creates a SOCIAL campaign via API, it would exist but have no executor (campaign-executor throws "Campaign type SOCIAL not supported").
- **Fix:** Either add backend validation to reject SOCIAL campaigns, or remove from enum.

### ISSUE-13: `getCampaignPreview` Recipient Count Logic Mismatch
- **Location:** `campaign.controller.ts` `getCampaignPreview`
- **Problem:** Recipient count is based on `prisma.lead.count()` with tag filters, but the cost estimate uses this count. However, the actual `executeCampaign` may send to different leads (based on passed `leadIds` or `filters`). The preview count can be wildly different from actual send count.
- **Impact:** Users see "500 recipients, $5.00 estimated cost" in preview, but actual send goes to 50 leads.
- **Fix:** Make preview recipient selection logic match executor's `getTargetLeads` logic exactly.

### ISSUE-14: Email Template Rendering During Preview Uses `Handlebars.compile()` Without Sandbox
- **Location:** `campaign.controller.ts` `getCampaignPreview` line ~870
- **Problem:** Uses `require('handlebars')` (synchronous import) with `Handlebars.compile(campaign.body)`. However, the executor service properly escapes template variables (`esc()` function), while the preview does NOT escape them.
- **Impact:** Template injection in preview — a campaign body containing `{{constructor.constructor("...")()}}` could execute arbitrary code during preview but not during actual send. (Note: Handlebars 4.x blocks prototype access by default, reducing severity.)
- **Fix:** Use the same `esc()` helper in preview, or use `noEscape: false` option.

### ISSUE-15: Calendar View Has No Campaign Data Rendering
- **Location:** `CampaignsList.tsx` calendar view section
- **Problem:** The calendar view mode is togglable but the actual calendar rendering doesn't show campaigns on their scheduled dates — it just shows the empty state or falls through to showing nothing meaningful.
- **Impact:** Users switch to calendar view and see an empty experience.
- **Fix:** Implement proper calendar rendering with campaigns plotted on start dates.

### ISSUE-16: Grid View Duplicates Row Menu Logic
- **Location:** `CampaignsList.tsx` lines ~840-1100
- **Problem:** The context menu (edit, duplicate, pause, resume, send, archive, delete) is duplicated between list and grid views with identical code. This causes maintenance burden and potential divergence.
- **Impact:** Not user-facing directly, but increases likelihood of one view getting a fix while the other doesn't.
- **Fix:** Extract action menu into a shared `CampaignActionMenu` component.

### ISSUE-17: `CampaignEdit` Doesn't Handle A/B Test or Recurring Fields
- **Location:** `CampaignEdit.tsx`
- **Problem:** The edit form only handles `name, type, status, subject, body, previewText, startDate, endDate, budget, spent` — missing: `isABTest, abTestData, isRecurring, frequency, recurringPattern, maxOccurrences, attachments, mediaUrl, sendTimeOptimization`.
- **Impact:** Users who create campaigns with A/B testing or recurring settings from CampaignCreate can't edit those settings afterward. They'd have to delete and recreate.
- **Fix:** Add all remaining fields to the edit form.

### ISSUE-18: `CampaignSchedule` Page Filters Out SOCIAL Type But Not Others
- **Location:** `CampaignSchedule.tsx` line ~65
- **Problem:** `campaigns.filter(c => c.type !== 'SOCIAL')` — arbitrary filter. PHONE campaigns (coming soon) are still included.
- **Impact:** Minor inconsistency. PHONE campaigns appear in schedule view but can't actually be sent.
- **Fix:** Also filter out unsupported types, or show them with a badge.

---

## 5. LOW SEVERITY / POLISH ISSUES (P3)

### ISSUE-19: Campaign Creation Creates Draft Then Previews → Orphaned Drafts
- **Location:** `CampaignCreate.tsx` `handleCreate` and `handleCancelPreview`
- **Problem:** When user clicks "Create Campaign", a DRAFT is created in the DB, then preview is shown. If user cancels, `handleCancelPreview` tries to delete the draft. But if the user simply closes the tab or navigates away, the draft is orphaned.
- **Impact:** Database accumulates orphaned draft campaigns over time.
- **Fix:** Either don't create until confirmed, or add a cleanup job for zero-metric drafts older than 24h.

### ISSUE-20: No Unsubscribe Count Shown in Frontend
- **Backend:** `Campaign` model has `unsubscribed` field, tracked in `CampaignLead`
- **Frontend:** `CampaignDetail` doesn't display unsubscribe count or rate anywhere
- **Impact:** Users have no visibility into how many recipients unsubscribed from their campaigns.
- **Fix:** Add unsubscribe rate card to CampaignDetail stats.

### ISSUE-21: `CampaignReports` Duplicate Fetches
- **Location:** `CampaignReports.tsx` OverviewTab
- **Problem:** Fetches `analyticsApi.getCampaignAnalytics()` and also `campaignsApi.getCampaigns()` separately. The analytics endpoint already returns `topCampaigns`, but the separate fetch is used as a fallback.
- **Impact:** Extra API call on every reports page load.
- **Fix:** Only fetch campaigns list if topCampaigns is empty.

### ISSUE-22: No Loading State for Individual Campaign Actions
- **Location:** `CampaignsList.tsx` row menu actions
- **Problem:** Actions like Pause, Resume, Archive use `mutation.isPending` for button text but the card itself doesn't show any loading indicator. If the API is slow, users may click repeatedly.
- **Impact:** Potential duplicate API calls.
- **Fix:** Disable the entire action menu or show a spinner overlay on the card during mutations.

### ISSUE-23: `CampaignExecutionStatus` Has No Error Recovery
- **Location:** `CampaignExecutionStatus.tsx`
- **Problem:** If the status fetch fails (network error), it shows "Failed to fetch execution status" permanently with no retry button. The polling stops.
- **Impact:** Users stuck on error screen with no way to recover except page refresh.
- **Fix:** Add retry button, or auto-retry after a delay.

### ISSUE-24: Budget Progress Bar Can Show >100%
- **Location:** `CampaignsList.tsx` budget bar: `Math.min(((campaign.spent ?? 0) / campaign.budget) * 100, 100)`
- **Positive:** This IS correctly clamped with `Math.min`. No bug here — good implementation.

### ISSUE-25: Campaign Comparison Table Doesn't Handle 0 Values Well
- **Location:** `CampaignsList.tsx` comparison table
- **Problem:** Revenue shows as `$0`, ROI shows as `0x` for draft campaigns that haven't been sent. This is factually correct but visually misleading — it looks like the campaign failed.
- **Fix:** Show "—" or "N/A" for campaigns that haven't been sent yet.

### ISSUE-26: No Keyboard Navigation for Campaign Action Menus
- **Location:** `CampaignsList.tsx` row menu
- **Problem:** The dropdown menu is built from plain `<button>` elements, not a proper dropdown component with keyboard arrows, Escape to close, and focus trap.
- **Impact:** Accessibility issue — keyboard-only users can't easily navigate the menu.
- **Fix:** Use Radix `DropdownMenu` or similar accessible component.

---

## 6. SECURITY AUDIT

### SEC-1: ✅ Multi-Tenancy / Access Control — GOOD
- ALL campaign operations verify `organizationId: req.user!.organizationId`
- `getCampaigns` uses `getCampaignsFilter(roleFilter)` for role-based scoping
- `updateCampaign` uses a transaction to prevent race conditions
- `deleteCampaign`, `duplicateCampaign`, `archiveCampaign` all verify ownership

### SEC-2: ✅ Input Validation — GOOD
- Zod schemas validate all input on create/update/send operations
- `allowedSortFields` whitelist prevents SQL injection via sort parameter
- Body size limited to 50,000 chars

### SEC-3: ✅ Rate Limiting — GOOD
- `sensitiveLimiter` applied to create, send, track operations
- File upload limited to 5 files, 10MB each

### SEC-4: ✅ Template Injection Protection — GOOD
- Executor's `esc()` function escapes `{{ }}` in lead data to prevent Handlebars injection
- CAN-SPAM compliance with auto-generated unsubscribe links
- Unsubscribe tokens use crypto-random values, not exposed lead IDs

### SEC-5: ✅ XSS Protection — GOOD
- `CampaignDetail` uses `DOMPurify` for HTML content rendering
- `CampaignPreviewModal` uses `DOMPurify.sanitize()` for message preview

### SEC-6: ⚠️ Campaign Status Transition Validation Inconsistency
- `updateCampaign` properly validates transitions with a state machine
- But `pauseCampaign`, `sendCampaign`, `archiveCampaign` have ad-hoc checks or no transition validation
- **Risk:** Low — transition validation in `updateCampaign` is the primary path

### SEC-7: ✅ Monthly Sending Limit Enforcement — GOOD
- `checkMonthlyMessageLimit` in executor prevents abuse
- Plan limits enforced via `enforcePlanLimit('campaigns')` middleware on create

---

## 7. PERFORMANCE AUDIT

### PERF-1: ⚠️ Client-Side Filtering of All Campaigns (P1; see BUG-5)
- No server-side pagination used in the main list view

### PERF-2: ✅ Batch Email Processing — GOOD
- Processes emails in batches of 100
- Parallel batches limited to 3 concurrent to prevent API overload

### PERF-3: ✅ Query Optimization — GOOD  
- Proper `@@index` definitions on Campaign table for all common queries
- `Promise.all` used for parallel DB queries (count + findMany)

### PERF-4: ⚠️ Execution Status Polling Every 3 Seconds
- `CampaignExecutionStatus` polls every 3s even when campaign is idle/completed
- Should stop polling on `draft` phase (currently only stops on `completed`)
- Consider websocket-based updates (websocket infra already exists via `pushCampaignUpdate`)

### PERF-5: ⚠️ `CampaignDetail` Makes 6+ Parallel API Calls
- campaign, analytics, deliverability, timeline, hourly engagement, device breakdown, geo breakdown
- These could be consolidated into 1-2 endpoints to reduce network overhead

---

## 8. FEATURE COMPLETENESS AUDIT

| Feature | Status | Notes |
|---------|--------|-------|
| Campaign CRUD | ✅ Complete | Create, read, update, delete all working |
| Email campaigns | ✅ Complete | Block editor, MJML compilation, CAN-SPAM |
| SMS campaigns | ✅ Complete | Twilio integration, MMS support |
| Phone campaigns | ⚠️ Coming Soon | UI exists but executor rejects |
| Social campaigns | ⚠️ Coming Soon | In schema/validator but not executable |
| Campaign templates | ✅ Complete | 15+ real estate templates |
| A/B testing | ✅ Complete | Split audience, winner evaluation |
| Recurring campaigns | ✅ Complete | Daily/weekly/monthly, max occurrences |
| Send-time optimization | ✅ Complete | Timezone/engagement-based |
| Campaign preview | ✅ Complete | Cost estimate, recipient sample |
| Campaign comparison | ✅ Complete | Multi-select compare table |
| Campaign analytics | ✅ Complete | Funnel, timeline, hourly, device, geo |
| Deliverability stats | ✅ Complete | Bounce/complaint rates |
| Real-time execution | ✅ Complete | Polling-based progress bar |
| Bulk operations | ✅ Complete | Status change, delete, export |
| CSV export | ✅ Complete | Selected or all campaigns |
| Archive/unarchive | ✅ Complete | Soft archive with timestamp |
| Duplicate campaign | ✅ Complete | Copies all settings, resets metrics |
| Email attachments | ✅ Complete | Upload with size validation |
| Unsubscribe tracking | ⚠️ Partial | Backend tracks, frontend doesn't display |
| Calendar view | ⚠️ Incomplete | UI toggle exists, rendering partial |
| Edit A/B test settings | ❌ Missing | CampaignEdit doesn't include A/B fields |
| Edit recurring settings | ❌ Missing | CampaignEdit doesn't include recurring fields |

---

## 9. PRIORITIZED ACTION ITEMS

### Immediate (P0) — Fix These First
1. Add `SENDING` to campaign status validator enum
2. Add `DRAFT` and `CANCELLED` to frontend status filter tabs
3. Add status validation to `pauseCampaign` controller
4. Convert campaign delete to soft-delete or require archive-first

### High Priority (P1) — Next Sprint
5. Implement server-side pagination in CampaignsList
6. Fix search filter to use consistent debounced value
7. Improve bulk operation error reporting (use `Promise.allSettled`)
8. Add A/B test and recurring fields to CampaignEdit
9. Fix ROI display inconsistency (percentage vs multiplier)

### Medium Priority (P2) — Scheduled
10. Match preview recipient logic to executor logic
11. Complete calendar view implementation
12. Show unsubscribe count in CampaignDetail
13. Add keyboard accessibility to action menus
14. Extract shared action menu component (deduplicate list/grid code)
15. Stop execution status polling on `draft` phase

### Low Priority (P3) — Backlog
16. Clean up orphaned draft campaigns
17. Consolidate CampaignDetail API calls
18. Add retry button to CampaignExecutionStatus errors
19. Show "N/A" for zero-value metrics on unsent campaigns
20. Add backend validation to reject SOCIAL campaign creation
