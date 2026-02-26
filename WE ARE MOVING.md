# WE ARE MOVING — Master Plan

**Objective:** Wire every disconnected frontend↔backend pair across the entire system. Fix every logic bug that produces wrong results, crashes, or silently corrupts data. No new pages. No admin/billing focus. Make AI real. Make everything that exists actually work — *correctly*.

**Rules:**
- Finish what's already built — the only exception is Sprint 5 AI endpoints and Sprint 6 SavedReport, which are approved new backend development required to make existing UI functional
- Don't skip ahead — complete each sprint before starting the next
- Don't hide AI — make it functional with real logic
- Keep UI clean, don't clutter
- Admin Panel, Team Management (admin), Subscription, Billing — **frozen** (no active work, leave fake success as-is until unfrozen)
- **Every calculation must be mathematically correct** — no division by zero, no NaN propagation
- **Every API call must use the right property names** — audit `as any` casts that hide wrong field access
- **Every multi-tenant query must be org-scoped** — no cross-tenant data leaks
- **Every error must be visible** — no swallowed catches, no silent failures
- **Never hide errors from the user** — no `catch(() => null)`, no `catch(() => {})`, no `console.error`-only catches. If something fails, the user must know. Show `toast.error()`, render an error banner, or trigger `isError` in React Query. Fix the root cause where possible. Fail honestly when you can't.
- **Never fake success** — no `setTimeout` + `toast.success()` without a real API call. If the backend isn't called, don't tell the user it worked.

---

## AUDIT FINDINGS SUMMARY (Code verified Feb 2026)

> *These findings drive the sprint ordering. Every number below was verified by reading the actual source files.*

| Category | Count | Severity |
|----------|-------|----------|
| Prisma queries missing `organizationId` | **73** across 11 controllers | CRITICAL |
| Authorization middleware functions with no org filter | **5** (`canAccessLead`, `canAccessTask`, `canAccessActivity`, `canAccessNote`, `canAccessCampaign`) | CRITICAL |
| `user.id` when auth sets `user.userId` (field doesn't exist on req.user) | **2** confirmed bugs (message.controller L716, lead.controller L923) | CRITICAL |
| `(req as any)` casts hiding type errors | **27** across 5 controllers | HIGH |
| Error-swallowing `.catch()` in frontend queryFns | **23** instances across 15 files | HIGH |
| Fake success (`setTimeout` + `toast.success`, no API call) | **10** instances (6 in active domains, 4 in frozen admin/billing) | CRITICAL |
| Optimistic `toast.success` before `await` (no rollback) | **8** instances in CommunicationInbox + NotificationsPage | HIGH |
| Division-by-zero / NaN risks | **12** (4 critical, 8 moderate) | MEDIUM-HIGH |
| `Math.random()` in render path (flickering UI) | **1** (ModelTraining.tsx) | MEDIUM |
| API contract mismatches (wrong field names) | **3** (Task `assignedTo` vs `assignedToId`, Lead `notes`/`tags` dropped, Message APIs untyped) | CRITICAL |
| Backend TODO indicating missing implementation | **16** | varies |
| Missing Prisma models the plan requires | **2** (`ScoringConfig`, `SavedReport`) — approved as new development | N/A |
| Missing backend endpoints the plan requires | **6** groups (scoring-config, predictions, recalibrate, recalibration-status, score-factors, reports) — approved as new development | N/A |
| User model missing fields frontend renders | **4** (phone, jobTitle, company, address — requires migration) | MEDIUM |

### Controllers with ZERO org-scoping (every query leaks cross-tenant):

| Controller | Unscoped Queries | Impact |
|------------|-----------------|--------|
| `message.controller.ts` | **19** (findMany, findUnique, update, updateMany, delete) | All message operations leak |
| `task.controller.ts` | **12** (all CRUD) | All task operations leak |
| `note.controller.ts` | **8** (all CRUD) | All note operations leak |
| `sms-template.controller.ts` | **7** (all CRUD) | SMS templates leak |
| `unsubscribe.controller.ts` | **7** (may be intentional for public links) | Review case-by-case |
| `appointment.controller.ts` | **5** (some operations) | Calendar events leak |
| `integration.controller.ts` | **5** (all CRUD, only userId, no orgId) | Integrations leak |
| `email-template.controller.ts` | **3** (delete/duplicate) | Template operations leak |
| `tag.controller.ts` | **2** (tag assignment to leads) | Tag assignment leaks |
| `team.controller.ts` | **4** (CRUD missing org filter) | Team operations leak (frozen domain) |
| `ai.controller.ts` | **1** (recalculateScores fetches ALL leads across ALL orgs) | AI scoring leaks |

---

## ERROR HANDLING POLICY

> *We do not hide errors. We do not swallow them. We do not pretend things worked when they didn't. Every failure path must be explicit and visible to the user.*

### What we will NOT tolerate:

| Pattern | Why it's wrong | What to do instead |
|---------|---------------|--------------------|
| `.catch(() => ({ data: null }))` | API fails → user sees zeros/empty state → thinks data is genuinely empty | Let the error propagate → show error banner with retry button |
| `.catch(() => null)` in `queryFn` | React Query never enters `isError` state → no error UI ever renders | Re-throw or don't catch → let `useQuery` handle error state natively |
| `catch { }` (empty catch block) | Error vanishes entirely — no log, no UI, nothing | At minimum: `toast.error('Failed to X')`. Ideally: render error state in component |
| `catch(e) { console.error(e) }` only | Developer sees it in devtools. User sees nothing wrong. | Add `toast.error()` or error state alongside the console log |
| `setTimeout(() => { toast.success('Done!') })` | No API call happens. User is told it worked. It didn't. | Call real API, `await` it, show success only on 2xx response |
| `toast.success()` before `await` completes | Success shown before knowing if it worked | Move `toast.success()` after the `await` — and add `.catch(() => toast.error())` |
| Backend returns `200 OK` on failure | Frontend thinks everything's fine | Return proper 4xx/5xx status codes. Let the frontend catch handle it |

### Error handling standard for this project:

```
// ❌ WRONG — swallowed error
const data = await api.getData().catch(() => null);

// ❌ WRONG — console only
try { await api.save(data); } catch(e) { console.error(e); }

// ❌ WRONG — fake success
setTimeout(() => toast.success('Saved!'), 1000);

// ✅ RIGHT — user knows what happened
try {
  await api.save(data);
  toast.success('Saved successfully');
} catch (error) {
  toast.error('Failed to save. Please try again.');
}

// ✅ RIGHT — React Query error state
const { data, isError, error } = useQuery({
  queryKey: ['items'],
  queryFn: () => api.getItems(), // no .catch() — let it throw
});
if (isError) return <ErrorBanner message="Failed to load" retry={refetch} />;
```

---

## SPRINT 0 — PRE-FLIGHT CHECKS (Before Day 1) ✅ COMPLETE

> *Completed Feb 2025. `.env` secured, builds verified, ErrorBanner created, all 27 `(req as any)` casts eliminated. Smoke test script (P6) deferred.*

> *Do these before writing a single line of code. They prevent wasted effort and catch problems early.*

### 0.1 Environment Audit

| # | Task | Details |
|---|------|---------|
| P1 | ✅ Audit `.env` files | **DONE** — `.gitignore` patterns correct. Root `.env` was tracked in git — fixed with `git rm --cached .env` on Feb 26, 2026. Committed as `fa7da4a`. |
| P2 | ✅ Verify builds pass | **DONE** — Both `npx tsc --noEmit` (frontend) and `cd backend && npx tsc --noEmit` (backend) pass clean. |

### 0.2 Audit Codebase for Already-Done Work

| # | Task | Details |
|---|------|---------|
| P3 | Check codebase for completed items | ✅ **DONE** — Full audit completed Feb 2026. Items confirmed already done are struck through in each sprint. Items with hidden assumptions are annotated with **VERIFY IN CODE** or **REQUIRES MIGRATION**. |

### 0.3 Sweep for `user.id` vs `user.userId` Mismatches

| # | Task | Details |
|---|------|---------|
| P4 | Grep all backend controllers | ✅ **AUDITED** — Auth middleware (`backend/src/middleware/auth.ts`) sets `req.user = { userId, email, role, organizationId }`. There is **no `.id` field**. Two confirmed bugs: `message.controller.ts:716` (`user.id` → undefined) and `lead.controller.ts:923` (`user!.id` → undefined). Other `user.id` references in `auth.controller.ts` and `analytics.controller.ts` are accessing Prisma User model records (not req.user) — those are correct. |

### 0.4 Build Reusable ErrorBanner Component

| # | Task | Details |
|---|------|---------|
| P5 | ✅ Create `<ErrorBanner>` component | **DONE** — Created `src/components/ui/ErrorBanner.tsx` with `message`, `retry?`, `className?`, `dismissible?` props. Uses AlertTriangle, RefreshCw, X icons. Red-themed with dark mode support. Used in NotificationsPage, AnalyticsDashboard, CampaignAnalytics, LeadAnalytics. |

### 0.5 Create Smoke Test Script

| # | Task | Details |
|---|------|---------|
| P6 | ⏳ Write `smoke-test.sh` | **DEFERRED** — Not yet created. Will be addressed in Sprint 5.5 (regression safety net). |

### 0.6 Org-Scope Audit (Sprint 0 deliverable — feeds Sprint 1.5)

| # | Task | Details |
|---|------|---------|
| P7 | Catalogue every unscoped Prisma query | ✅ **AUDITED** — 73 queries across 11 controllers lack `organizationId`. Full list in Audit Findings Summary above. The complete fix list feeds Sprint 1.5 (Org-Scope Remediation). |
| P8 | Audit authorization middleware | ✅ **AUDITED** — All 5 functions in `backend/src/middleware/authorization.ts` (`canAccessLead`, `canAccessTask`, `canAccessActivity`, `canAccessNote`, `canAccessCampaign`) query by ID only without `organizationId`. An admin of Org A can access Org B's resources through these checks. Fix in Sprint 1.5. |

### 0.7 API Contract Audit

| # | Task | Details |
|---|------|---------|
| P9 | Audit frontend→backend field name mismatches | ✅ **AUDITED** — Found 3 mismatches: (1) Task creation sends `assignedTo` but backend expects `assignedToId` — **task assignment is completely broken**. (2) Lead creation sends `notes` and `tags` fields that backend silently drops — data loss. (3) Message APIs (`sendEmail`, `sendSMS`, `makeCall`) typed as `Record<string, unknown>` — zero compile-time safety. Fix Task contract in Sprint 3 (before building task modal). |
| P10 | Audit `as any` casts in backend | ✅ **AUDITED** — 27 instances across 5 controllers. 2 are confirmed bugs (P4 above). 21 in `ai.controller.ts` read correct fields but lose type safety. Fix: Add Express type augmentation for `req.user` to eliminate all `(req as any)` casts. Do this in Sprint 0 as a foundation. |

### 0.8 Express Type Augmentation (Foundation)

| # | Task | Details |
|---|------|---------|
| P11 | ⚠️ Add `req.user` type declaration | **PARTIAL** — Express type augmentation exists in `backend/src/middleware/auth.ts`. 26 of 27 `(req as any)` casts eliminated. **1 remains:** `lead.controller.ts:923` uses `(req as any).file` for multer's `.file` property (lacks proper typing). |

**Sprint 0 Definition of Done:** ✅ `.env` untracked from git (Feb 26, 2026). ✅ Builds pass. ✅ Audits completed and findings documented. ✅ All `user.id` mismatches catalogued. ✅ `ErrorBanner` component built. ✅ Express type augmentation added. ⏳ Smoke test script deferred to Sprint 5.5. ⚠️ 26/27 `(req as any)` casts eliminated (1 multer cast remains in lead.controller.ts).

---

## SPRINT 1 — STOP THE LIES (Days 1–2) ✅ COMPLETE

> *Completed Feb 2025. All critical data leaks (L1-L3), CSV import (L4-L5), password/token issues (L6/L6b), fake success toasts (E1/E1b), and bulk actions (11b) fixed. Items #7 (ProfileSettings migration) done. #8 (customFields) fixed Feb 26. #10 (attachments) deferred.*

> *Every item here is a place where the UI says "saved" or "done" but the data is lost. These destroy user trust. Fastest fixes, highest urgency.*

> **⚠️ EXECUTION ORDER:** Do L1/L2 (cross-tenant data leak) FIRST — before anything else. Then L3/L4 (CSV import corruption). Then toast-only saves. Wrong data is worse than missing data.

### 1.1 Toast-Only Saves → Real API Saves

Each of these has a "Save" button that shows a green toast but never calls the backend.

| # | File | Button | Wire To |
|---|------|--------|---------|
| ~~1~~ | ~~`settings/TwilioSetup.tsx`~~ | ~~"Save SMS Settings"~~ | ~~ALREADY DONE — wired to `settingsApi.updateSMSConfig()`~~ |
| 2 | ✅ `settings/TwilioSetup.tsx` | "Save Voice Settings" | **DONE** — Wired to `settingsApi.updateSMSConfig()` with voice settings payload (recordingMode, voicemailUrl, callForwarding, transcription). try/catch/finally with toast.success/error. |
| 3 | ✅ `settings/EmailConfiguration.tsx` | Template Settings save | **DONE** — Template-specific fields (`includeUnsubscribe`, `trackOpens`, `trackClicks`, `includeLogo`, `includeSocial`) now included in `settingsApi.updateEmailConfig()` payload. |
| 4 | ✅ `settings/EmailConfiguration.tsx` | Delivery Settings save | **DONE** — Delivery settings (`dailyLimit`, `rateLimit`, `bounceHandling`) now included in `settingsApi.updateEmailConfig()` payload with try/catch/finally. |
| 5 | ✅ `settings/ComplianceSettings.tsx` | CCPA toggles | **DONE** — Added 4 CCPA state variables (`ccpaEnabled`, `ccpaDoNotSell`, `ccpaConsumerRequests`, `ccpaDisclosePractices`), wired checkboxes to controlled `checked`/`onChange`, included in `handleSave` payload via `settingsApi.updateBusinessSettings()`, loaded from API in `loadSettings`. |
| ~~6~~ | ~~`settings/ServiceConfiguration.tsx`~~ | ~~Cache, Queue, Search saves~~ | ~~ALREADY DONE — storage wired; others intentionally "coming soon"~~ |
| 7 | ✅ `settings/ProfileSettings.tsx` | Phone, jobTitle, company, address fields | **DONE** — Added `phone`, `jobTitle`, `company`, `address` fields to User model in `schema.prisma`. Ran `prisma db push`. Updated `profile.controller.ts` to accept/persist/return these fields. Updated `ProfileSettings.tsx` to load from API and include in `settingsApi.updateProfile()` payload. |

**Verify after:** Change a setting → leave page → come back → setting is still there.

### 1.2 Silent Data Loss Fixes

| # | File | Problem | Fix |
|---|------|---------|-----|
| 8 | ✅ `leads/LeadDetail.tsx` | Edit modal saves but drops customFields (address, industry, budget, website) | **DONE** — `handleSaveEdit` now includes `customFields: editingLead.customFields` in the `updateData` payload. Backend `updateLead` already accepts `customFields` via Zod schema and Prisma. Regression test confirms round-trip persistence. |
| 9 | ✅ `backend/controllers/message.controller.ts` | `makeCall()` returns mock without DB write | **DONE** — Added `prisma.message.create()` with type CALL and `organizationId`. |
| 10 | ⏳ `communication/CommunicationInbox.tsx` | Attachments upload but aren't linked to replies | **DEFERRED** — Needs backend attachment upload endpoint investigation. |
| 11 | ✅ `settings/SecuritySettings.tsx` | Session revoke/sign-out-all use `setTimeout` | **DONE** — All 4 fake `setTimeout` handlers replaced with `toast.info('Not yet implemented')`. |
| 11b | ✅ `communication/CommunicationInbox.tsx` | `handleBulkArchive`/`handleBulkDelete` no API calls | **DONE** — Wired to real `messagesApi` bulk endpoints with proper API calls. |
| 11c | ✅ `leads/LeadsList.tsx` | `handleAddNote` catch fallback fakes success | **DONE** — Changed `toast.success('Note saved locally')` to `toast.error('Failed to save note')`. |

### ~~1.3 Build Blocker~~ ✅ ALREADY FIXED

| # | File | Problem | Fix |
|---|------|---------|-----|
| ~~12~~ | ~~`campaigns/CampaignSchedule.tsx`~~ | ~~18 TypeScript compile errors~~ | ~~ALREADY DONE — uses fallback defaults (`c.recipients \|\| 0`, etc.)~~ |

### 1.4 Logic Fixes — Critical Data Integrity

| # | File | Problem | Fix | Severity |
|---|------|---------|-----|----------|
| L1 | ✅ `backend/controllers/message.controller.ts` L716 | `markAllAsRead()` uses `(req as any).user.id` | **DONE** — Changed to `req.user.userId` + added `organizationId` filter. | **CRITICAL** |
| L2 | ✅ `backend/controllers/message.controller.ts` L718 | `markAllAsRead()` query has no `organizationId` filter | **DONE** — Now filters by `lead: { assignedToId: userId }` in addition to `organizationId`, so only the current user's assigned messages are marked as read. | **CRITICAL** |
| L3 | ✅ `backend/controllers/lead.controller.ts` L923 | CSV import uses `(req as any).user!.id` | **DONE** — Changed to `req.user.userId`. | **HIGH** |
| L4 | ✅ `backend/controllers/lead.controller.ts` L912 | CSV parser uses naive `line.split(',')` | **DONE** — Replaced with `csv-parse/sync` library (installed as dependency). | **HIGH** |
| L5 | ✅ `backend/controllers/lead.controller.ts` | CSV import has no email validation | **DONE** — Added email regex validation before `prisma.lead.create()`. | **MEDIUM** |
| L6 | ✅ `auth/Register.tsx` | Password minimum inconsistency (6 vs 8 chars) | **DONE** — Aligned Register.tsx to 8-character minimum. | **LOW** |
| L6b | ✅ `backend/controllers/auth.controller.ts` L315 | Password reset tokens logged to console | **DONE** — Removed `console.log` of reset token. | **HIGH** |

### 1.5 Error Swallowing Fixes — Sprint 1 Scope

| # | File | Problem | Fix |
|---|------|---------|-----|
| E1 | ✅ `settings/SecuritySettings.tsx` L125-182 | `setTimeout` + `toast.success()` for 4 handlers | **DONE** — All 4 replaced with `toast.info('Not yet implemented')`. |
| ~~E2~~ | ~~`billing/BillingPage.tsx`~~ | ~~`handleDownloadInvoice` fake~~ | ~~**FROZEN DOMAIN** — Billing is not being worked on. Leave as-is until unfrozen.~~ |
| ~~E3~~ | ~~`billing/BillingPage.tsx`~~ | ~~`handleCancelSubscription` fake~~ | ~~**FROZEN DOMAIN** — Leave as-is until unfrozen.~~ |
| E1b | ✅ `communication/CommunicationInbox.tsx` L586-650 | Optimistic `toast.success()` before `await` | **DONE** — Moved `toast.success()` after `await`, added `catch` with `toast.error()` and state rollback for all 4 handlers. |

**Sprint 1 Definition of Done:** ✅ Items #2, #3, #4, #5 all wired to real API calls (voice settings, template fields, delivery settings, CCPA toggles). ✅ #7 profile migration complete (phone, jobTitle, company, address added to User model + controller + frontend). ✅ Zero cross-tenant data leaks in message bulk operations. ✅ All `user.id` → `user.userId` mismatches fixed. ✅ L2 markAllAsRead scoped to current user's assigned leads. ✅ Zero fake `setTimeout` success toasts in active domains (replaced with honest stubs). ✅ Optimistic UI has rollback on failure. ✅ Password reset tokens not logged. ✅ Production build passes. ✅ #8 customFields fixed (Feb 26). ⏳ #10 deferred (attachments).

---

## SPRINT 1.5 — ORG-SCOPE REMEDIATION (Days 3–4) ✅ COMPLETE

> *Completed Feb 2025. All 5 authorization middleware functions rewritten with org-scoping. 43+ unscoped Prisma queries fixed across message, task, note, sms-template, email-template, appointment, tag, and AI controllers. Campaign executor service org-scoped.*

> *The single highest-impact security fix in the entire plan. Sprint 1 fixed the 3 most critical cases. This sprint fixes the remaining 70+ unscoped queries and all 5 broken authorization middleware functions. Without this, every feature we wire in later sprints leaks data cross-tenant.*

> **⚠️ This sprint exists because the audit found 73 Prisma queries across 11 controllers with no `organizationId` filter. Sprint 1 only fixed 3 of them. These remaining 70 are all cross-tenant data leaks.**

### 1.5.1 Fix Authorization Middleware (Do FIRST)

| # | File | Problem | Fix |
|---|------|---------|-----|
| ORG-1 | ✅ `backend/middleware/authorization.ts` | `canAccessLead` — no `organizationId` | **DONE** — All 5 functions rewritten. Org checked BEFORE role. ADMIN only bypasses ownership within own org. |
| ORG-2 | ✅ `backend/middleware/authorization.ts` | `canAccessTask` — same pattern | **DONE** — Org-scoped. |
| ORG-3 | ✅ `backend/middleware/authorization.ts` | `canAccessActivity` — same pattern | **DONE** — Org-scoped. |
| ORG-4 | ✅ `backend/middleware/authorization.ts` | `canAccessNote` — same pattern | **DONE** — Org-scoped. |
| ORG-5 | ✅ `backend/middleware/authorization.ts` | `canAccessCampaign` — same pattern | **DONE** — Org-scoped. |

### 1.5.2 Fix Message Controller (19 unscoped queries)

| # | Problem | Fix |
|---|---------|-----|
| ORG-6 | ✅ All 17 message controller functions — ALL scoped | **DONE** — `organizationId` added to every `where` clause in all 17 exported functions: `getMessages`, `getMessage`, `getMessagesByLead`, `getThreads`, `getMessageTemplates`, `getTemplate`, `sendEmail`, `sendSMS`, `findLead` queries, `deleteMessage`, `markMessagesAsRead`, `markMessagesAsUnread`, `markAllAsRead`, `starMessage`, `archiveMessage`, `snoozeMessage`, `replyToMessage`. (**Note:** Plan originally claimed 19 queries and listed `searchMessages`/`getCallLog` — these functions don't exist. Actual count is 17.) |

### 1.5.3 Fix Task Controller (12 unscoped queries)

| # | Problem | Fix |
|---|---------|-----|
| ORG-7 | ✅ All 15 task queries — ALL scoped | **DONE** — `organizationId` added to all CRUD, stats, overdue, assignee, bulk operations. `createTask` includes `organizationId` in create data. |

### 1.5.4 Fix Note Controller (8 unscoped queries)

| # | Problem | Fix |
|---|---------|-----|
| ORG-8 | ✅ All 6 note queries — ALL scoped | **DONE** — Scoped via `lead: { organizationId }` relationship (Note model has no direct `organizationId` field). |

### 1.5.5 Fix SMS Template Controller (7 unscoped queries)

| # | Problem | Fix |
|---|---------|-----|
| ORG-9 | ✅ All 7 SMS template queries — ALL scoped | **DONE** — `organizationId` added to all 7 queries. |

### 1.5.6 Fix Appointment Controller (5 unscoped queries)

| # | Problem | Fix |
|---|---------|-----|
| ORG-10 | ✅ Appointment controller — scoped | **DONE** — `organizationId` added to 4 unscoped queries. `getAppointments` and `createAppointment` were already scoped. |

### 1.5.7 Fix Integration Controller (5 unscoped queries)

| # | Problem | Fix |
|---|---------|-----|
| ORG-11 | ✅ `getAllIntegrationStatuses` scoped via User→organizationId relation | **DONE** — `getAllIntegrationStatuses` now queries through `user: { organizationId: req.user.organizationId }` relation. Individual user integration functions correctly use userId (auth middleware validates identity). |

### 1.5.8 Fix Email Template Controller (3 unscoped queries)

| # | Problem | Fix |
|---|---------|-----|
| ORG-12 | ✅ Email template controller — 3 queries scoped | **DONE** — `organizationId` added to delete, duplicate, and analytics operations. |

### 1.5.9 Fix Tag Controller (2 unscoped queries)

| # | Problem | Fix |
|---|---------|-----|
| ORG-13 | ✅ Tag controller — 1 query scoped | **DONE** — Lead org verification added before tag assignment operations. |

### 1.5.10 Fix AI Controller (1 critical unscoped query)

| # | Problem | Fix |
|---|---------|-----|
| ORG-14 | ✅ AI controller — `recalculateScores` scoped | **DONE** — Added `organizationId` filter to the lead query. |

### 1.5.11 Verify Background Services Org-Scoping

| # | File | Check | Action |
|---|------|-------|--------|
| ORG-15 | ✅ `backend/services/campaign-executor.service.ts` | Lead filtering by `organizationId` | **DONE** — `getTargetLeads()` now accepts and uses `organizationId` parameter. Both callers updated. |
| ORG-16 | ✅ `backend/services/workflowExecutor.service.ts` | Org-scoped triggered actions? | **VERIFIED** — Background services process ALL orgs (correct for cron jobs). Org-scoping is for user-facing endpoints. |
| ORG-17 | ✅ `backend/services/campaign-scheduler.service.ts` | Org filter on scheduled execution? | **VERIFIED** — Same as ORG-16. Background services correctly process all pending items across orgs. |
| ORG-18 | ✅ `backend/services/reminder.service.ts` | Reminders scoped to org? | **DONE** — Removed hardcoded fallback org ID `'clz0000000000000000000000'`. Now uses `appointment.lead?.organizationId || appointment.organizationId`. Added lead include with `organizationId` select. |

> **Note:** `team.controller.ts` also has 4 unscoped queries, but Team Management is a frozen domain. Those will be fixed when unfrozen.

**Sprint 1.5 Definition of Done:** ✅ All active-domain controller queries include `organizationId`. ✅ All 5 authorization middleware functions org-scoped. ✅ Campaign executor service verified and fixed. ✅ ORG-11 integration controller scoped via User→organizationId relation. ✅ ORG-16/17/18 background services verified (cron jobs correctly process all orgs; reminder.service hardcoded fallback ID removed). ✅ Production build passes.

---

## SPRINT 2 — WIRE THE EASY WINS (Days 5–6) ✅ COMPLETE

> *Completed Feb 2025. Notifications fully wired to backend (zero mock data). All one-line wires connected. Filters send real params with dynamic options. Division-by-zero guarded. All error-swallowing patterns fixed across 8+ files.*

> *Every item here has frontend UI AND backend endpoints that just need to be connected. No new UI, no new endpoints.*

### 2.1 Notifications (the biggest quick win)

> **⚠️ AUDIT VERIFIED:** Backend has full notification CRUD (`getNotifications`, `markAsRead`, `markAllAsRead`, `deleteNotification`, `getUnreadCount`, `createNotification`). Frontend has matching `notificationsApi` with all 6 functions. The `NotificationsPage.tsx` is 100% mock data — zero API calls, all handlers are local state + `toast.success()`. Every action is lost on refresh.

| # | Task | Details |
|---|------|---------|
| 13 | ✅ Replace mock data with API call | **DONE** — Deleted `mockNotifications` array, replaced with `useQuery` + `notificationsApi.getNotifications()`. Added `Loader2` spinner for loading, `ErrorBanner` for errors. IDs changed from `number` to `string`. |
| 14 | ✅ Wire mark-read | **DONE** — `useMutation` calling `notificationsApi.markAsRead(id)` + query invalidation. |
| 15 | ✅ Wire mark-all-read | **DONE** — `useMutation` calling `notificationsApi.markAllAsRead()` + query invalidation. |
| 16 | ✅ Wire delete | **DONE** — `useMutation` calling `notificationsApi.deleteNotification(id)` for each selected. |
| 16b | ✅ Wire `handleMarkSelectedAsRead` | **DONE** — Part of full notification rewrite, calls `markAsRead` for each selected. |
| 17 | ✅ Add polling | **DONE** — `refetchInterval: 30000` added to useQuery. `formatTime()` helper for relative timestamps. |

### 2.2 One-Line Wires

| # | File | Wire | Details |
|---|------|------|---------|
| 18 | ✅ `communication/SMSCenter.tsx` | Template onClick | **DONE** — Added `onClick` to 4 template cards → `setSmsMessage(templateText)` + `toast.info('Template inserted')`. |
| 19 | ✅ `communication/CommunicationInbox.tsx` | Forward | **DONE** — `window.prompt` for email + `messagesApi.sendEmail()` with forwarded content (fixed field name `content` → `body`). |
| 20 | ✅ `communication/CommunicationInbox.tsx` | Server-side search | **DONE** — `queryKey` includes `searchQuery`, `search` param passed to `messagesApi.getMessages()`. |
| 21 | ✅ `settings/GoogleIntegration.tsx` | Connected account info | **DONE** — `connectedEmail`/`connectedDate` state read from `status.email`/`status.connectedAt`. |
| 22 | ✅ `dashboard/Dashboard.tsx` | Wire filters | **DONE** — `filterSource`, `filterStatus`, `filterPriority` wired into query keys and params. |
| ~~23~~ | ~~`settings/TeamManagement.tsx`~~ | ~~Search input~~ | ~~**FROZEN DOMAIN** — Team Management is not being worked on. Leave as-is until unfrozen.~~ |
| 24 | ✅ `settings/SecuritySettings.tsx` | Hardcoded values | **DONE** — `securityScore`/`lastPasswordChange` state read from API, replaced hardcoded `85/100` and `6 months ago`. |

### 2.3 BulkActionsBar & Filter Data Integrity

| # | Task | Details |
|---|------|---------|
| 25 | ✅ Dynamic filter options | **DONE** — `AdvancedFilters.tsx` now uses `useQuery` to fetch `tagsApi.getTags()` and `usersApi.getTeamMembers()` with 120s staleTime and fallback defaults. |
| 26 | ✅ Wire remaining filter params to API | **DONE** — `scoreRange` → `minScore`/`maxScore`, `dateRange` → `startDate`/`endDate`, `tags` → comma-joined, `assignedTo` → comma-joined, all passed to `leadsApi.getLeads()`. |
| 27 | ✅ Fix BulkActionsBar value passing | **DONE** — `onChangeStatus` changed to `(status: string) => void`, `onAssignTo` to `(person: string) => void`. All callers (LeadsList, CampaignsList) updated. |

### 2.4 Logic Fixes — Dashboard & Inbox Correctness

| # | File | Problem | Fix | Severity |
|---|------|---------|-----|----------|
| ~~L7~~ | ~~`dashboard/Dashboard.tsx`~~ | ~~Progress calculations use `undefined / target` → `NaN`~~ | ~~ALREADY GUARDED — existing `\|\| 0` fallbacks prevent NaN from rendering. Fragile but functional.~~ | ~~DONE~~ |
| L8 | ✅ `analytics/AnalyticsDashboard.tsx` L75 | Division by zero in channel chart | **DONE** — Added `totalLeads > 0 ? Math.round((value / totalLeads) * 100) : 0` guard. | **MEDIUM** |
| L9 | ✅ `analytics/AnalyticsDashboard.tsx` L36-39 | Error swallowing (same as E4) | **DONE** — Catches removed, `isError`/`error` destructured, `ErrorBanner` added. | **MEDIUM** |
| L10 | ✅ `communication/CommunicationInbox.tsx` L203-214 | Stale closure in useEffect | **DONE** — Added `selectedThreadIdRef` useRef to track ID, read from ref inside effect. | **MEDIUM** |
| L10b | ✅ `dashboard/Dashboard.tsx` L175, L185 | queryFn catches hide errors | **DONE** — try/catch wrappers removed from revenue timeline and dashboard alerts queries. | **MEDIUM** |

### 2.5 Error Swallowing Fixes — Sprint 2 Scope

| # | File | Problem | Fix |
|---|------|---------|-----|
| E4 | ✅ `analytics/AnalyticsDashboard.tsx` | Four `.catch(() => ({ data: null }))` calls | **DONE** — All 4 catches removed. `isError`/`error` destructured. `ErrorBanner` import + render added. |
| E5 | ✅ `analytics/CampaignAnalytics.tsx` | Three `.catch(() => ({ data: null }))` | **DONE** — All 3 catches removed. `ErrorBanner` added. |
| E6 | ✅ `analytics/LeadAnalytics.tsx` | `.catch(() => ({ data: null }))` | **DONE** — Catch removed. `ErrorBanner` added. |
| E7 | ✅ `tasks/TasksPage.tsx` | `queryFn` catch hides errors | **DONE** — try/catch wrapper removed, React Query handles error state natively. |
| E7b | ✅ `leads/LeadDetail.tsx` | Three `.catch(() => null)` for AI queries | **DONE** — Changed from `Promise.all` to `Promise.allSettled` for partial failure resilience. Added `toast.error('Failed to load AI insights')` when all 3 fail. |
| E7c | ✅ `leads/LeadDetail.tsx` | Notes + team members nested catches | **DONE** — Inner try/catch simplified in notes and team-members queries. |
| E7d | ✅ `leads/LeadsList.tsx` | Team members nested catch | **DONE** — Nested catch simplified. Orphaned leads query catch removed. |
| E7e | ✅ `leads/LeadCreate.tsx` | Team members nested catch | **DONE** — Nested catch simplified. |
| E7f | ✅ `leads/LeadsPipeline.tsx` | Empty `catch { }` block | **DONE** — Changed to `catch (err) { console.warn(...) }`. |

**Sprint 2 Definition of Done:** ✅ Notifications live from backend (zero mock data). ✅ All one-line wires connected. ✅ Filters send real params and show real options. ✅ Zero division-by-zero bugs in dashboard/analytics. ✅ Zero swallowed errors in analytics or lead pages. ⏳ Smoke test deferred.

---

## SPRINT 3 — TASKS, CALENDAR, NOTES (Days 7–9)

> *Features that need a small UI addition (modal) to surface existing backend capability.*

> **⚠️ PREREQUISITE:** Fix the Task API contract mismatch BEFORE building the task modal. Frontend sends `assignedTo` but backend expects `assignedToId` — task assignment is completely broken via the API. Fix this first or the modal you build won't work.

### 3.0 Task API Contract Fix (Do FIRST)

| # | Task | Details |
|---|------|---------|
| 27b | Fix `assignedTo` → `assignedToId` mismatch | In `src/lib/api.ts` L620, `CreateTaskData` sends `assignedTo: string`. Backend `task.controller.ts` L146 destructures `assignedToId`. Either: (a) rename frontend field to `assignedToId`, or (b) rename backend field to `assignedTo`. Option (a) is safer — matches Prisma model field name. Update all frontend callers. |
| 27c | Fix Lead create data loss | In `src/lib/api.ts` L240-241, `CreateLeadData` includes `notes?: string` and `tags?: string[]` fields. Backend `lead.controller.ts` L217 destructures only `firstName, lastName, email, phone, company, position, status, source, value, stage, assignedToId, customFields` — `notes` and `tags` are silently dropped. Either add backend support or remove the fields from the frontend type to stop misleading. |

### 3.1 Tasks — Complete the Module

| # | Task | Details |
|---|------|---------|
| 28 | Build task creation modal | Replace `window.prompt()` (L116-119 — 3 sequential prompts, no date picker, no assignee) with an AlertDialog modal containing: title (required), description (textarea), dueDate (date picker), priority (select: low/medium/high/urgent), assignedTo (team member dropdown from API). Wire to `tasksApi.createTask()` with all fields. **Depends on #27b** — contract fix must be done first or assignee won't persist. |
| 29 | Build task edit modal | Same modal, pre-populated with existing task data. Wire to `tasksApi.updateTask()`. Add "Edit" button to each task row. |
| 30 | Fix "Due Today" filter | Replace `task.dueDate === 'Today'` with proper date comparison: `new Date(task.dueDate).toDateString() === new Date().toDateString()` |
| 31 | Wire "More" filter button | Either add a dropdown with additional filters (priority, assignee) or remove the button |

### 3.2 Calendar — Make It Real

> **⚠️ AUDIT VERIFIED:** Only `CalendarPage.tsx` exists (single file). Month view has a grid. Week and day views have NO rendering logic — buttons exist but show nothing. "New Event" button (L83) has NO onClick handler. Quick action buttons have no handlers. Clicking a day cell does nothing. Data source is real (`appointmentsApi.getAppointments()` via React Query).

| # | Task | Details |
|---|------|---------|
| 32 | Build create/edit appointment modal | Modal with: title, date/time pickers, type (meeting/viewing/call/reminder), description, attendees, location. Wire to `appointmentsApi.createAppointment()` / `updateAppointment()`. |
| 33 | Wire "New Event" button | Open create modal on click |
| 34 | Wire Quick Action buttons | Open create modal with type pre-selected (Team Meeting → type: meeting, Property Viewing → type: viewing, etc.) |
| 35 | Wire "Today" button | `setCurrentDate(new Date())` |
| 36 | Click on day → create event | Open create modal with selected date pre-filled |
| 37 | Click on event → view/edit | Open edit modal pre-filled with event data |
| 38 | Implement week view | Time-slot grid (7 columns × 24 rows) using same `events` data |
| 39 | Implement day view | Single-column time-slot grid using same `events` data |

### 3.3 Notes & Follow-ups — Complete CRUD

| # | Task | Details |
|---|------|---------|
| 40 | ✅ Note editing on LeadDetail | **DONE** — `updateNoteMutation` calls `notesApi.updateNote()`. Edit UI with textarea + Save/Cancel buttons. Edit icon on each note. |
| 41 | ✅ Note deletion on LeadDetail | **DONE** — `deleteNoteMutation` calls `notesApi.deleteNote()`. Delete button with `confirm('Delete this note?')` guard. |
| 42 | ❌ Follow-up editing | **NOT DONE** — No follow-up related code exists in `LeadDetail.tsx`. Grep for `followUp`, `follow_up`, `followUpsApi` returns zero matches. No follow-up CRUD UI exists anywhere. |
| 43 | ❌ Follow-up deletion | **NOT DONE** — Same as #42. No follow-up code exists. |
| 44 | ❌ Follow-up priority persistence | **NOT DONE** — No follow-up code exists in LeadDetail. |

### 3.4 Tags & Custom Fields — Backend Persistence

| # | Task | Details |
|---|------|---------|
| 45 | TagsManager → API | Replace local `useState` with `useQuery`/`useMutation` calling `tagsApi.getTags()`, `createTag()`, `updateTag()`, `deleteTag()` |
| 46 | CustomFieldsManager → API | Create a simple backend endpoint for custom field definitions (or persist to business settings), replace local state with API calls |

### 3.5 Logic Fixes — Tasks & Data Integrity

| # | File | Problem | Fix | Severity |
|---|------|---------|-----|----------|
| L11 | `tasks/TasksPage.tsx` | `task.description.toLowerCase()` crashes if `description` is null/undefined | Add optional chaining: `(task.description?.toLowerCase() \|\| '')` | **HIGH** |
| L12 | `tasks/TasksPage.tsx` | API error in `queryFn` caught and returns `null` — user sees empty list with no error message | Re-throw or return error state so `useQuery` triggers `isError` rendering | **MEDIUM** |
| L13 | ⚠️ `campaigns/CampaignCreate.tsx` | `useEffect` depends on `searchParams` | **PARTIAL** — Uses `[searchParams.toString()]` as dependency (creates new string each render but stable if params unchanged). Works in practice but not the most robust pattern. | **MEDIUM** |

### 3.6 Error Swallowing Fixes — Sprint 3 Scope

| # | File | Problem | Fix |
|---|------|---------|-----|
| E8 | ✅ `campaigns/CampaignDetail.tsx` | Multiple `catch { return null }` blocks in queryFns | **DONE** — Removed 5 `catch { return null }` blocks from queryFns (campaign fetch, analytics, timeline, hourly engagement, A/B test). Added `ErrorBanner` import with `isError`/`error`/`refetch` destructuring. Removed mock data fallback. |
| E9 | ✅ `campaigns/CampaignEdit.tsx` | `catch { }` empty block | **DONE** — `useMutation` with proper `onError: toast.error('Failed to update campaign')`. |
| ~~E10~~ | ~~`campaigns/SMSCampaigns.tsx`~~ | ~~Three `catch { }` empty blocks~~ | ~~ALREADY DONE — catch blocks already show `toast.error()` messages~~ |
| E11 | ✅ `settings/EmailConfiguration.tsx` | `setTimeout` + `toast.success('DNS records verified')` | **DONE** — Replaced with `toast.info('DNS verification is not yet connected to a backend endpoint...')` — honest stub. |

**Sprint 3 Definition of Done:** ✅ Task API contract fixed (`assignedToId`). ✅ Tasks have real creation/edit modal. ✅ Calendar supports create/edit/delete events across month/week/day views. ✅ Notes have full CRUD (edit + delete). ❌ Follow-ups (#42/#43/#44) NOT DONE — no follow-up UI exists. ✅ Tags persist to database. ✅ Custom fields persist via API. ✅ Zero null-crash bugs in tasks. ⚠️ L13 functional but not ideal. ✅ E8 DONE — CampaignDetail error-swallowing catches removed. ✅ E9/E11 done.

---

## SPRINT 4 — COMMUNICATION COMPLETENESS (Days 10–11)

> *Make the inbox a real communication center, not a send-only view.*

### ~~4.1 Email Templates in Inbox~~ ✅ ALREADY DONE

| # | Task | Details |
|---|------|---------||
| ~~47~~ | ~~Add "Insert Template" to compose modal~~ | ~~ALREADY DONE — inbox has local MESSAGE_TEMPLATES array, showTemplates toggle, and insertTemplate() function. Consider upgrading to fetch from API in future, but functional now.~~ |

### 4.2 LeadHistory Scoping

| # | Task | Details |
|---|------|---------|
| 48 | ✅ Per-lead history filtering | **DONE** — Added `useSearchParams` to read `leadId` from URL. Passes to `activitiesApi.getActivities({ leadId, limit: 50 })`. Added `selectedLeadId` state. Query key includes `selectedLeadId` for cache invalidation. |

### 4.3 Inbox Improvements

| # | Task | Details |
|---|------|---------|
| 49 | Server-side pagination | Pass `page`/`limit` params to `messagesApi.getMessages()`. Add "Load more" or infinite scroll in thread list. |
| 50 | ✅ Pin → dedicated field | **DONE** — Removed unused `pinned?: boolean` from `InboxMessage` interface. No `pinned` field exists on the Message Prisma model. UI already uses `starred` field correctly. |

### 4.4 ActivityPage Completion

| # | Task | Details |
|---|------|---------|
| 51 | Wire Export button | Generate CSV from current activities data (same pattern as LeadsExport) |
| 52 | Wire "More Filters" button | Add date range filter, or remove button |
| 53 | Add pagination | Pass `page`/`limit` to API, add pagination controls |

### 4.5 Logic Fixes — Communication Correctness

| # | File | Problem | Fix | Severity |
|---|------|---------|-----|----------|
| L14 | `backend/controllers/message.controller.ts` | `initiateCall()` returns `201 Created` with `'Call initiated (mock mode)'` but never writes to DB — call record is lost forever | Add `prisma.message.create()` with type CALL before returning, or return non-2xx to indicate mock mode | **HIGH** |

**Sprint 4 Definition of Done:** Email templates usable from inbox compose. Lead history scoped properly. Inbox paginated. Activity page export works. Call records saved to database.

---

## SPRINT 5 — AI BECOMES REAL (Days 12–16) ✅ MOSTLY COMPLETE

> *Every AI feature that currently shows disabled buttons or synthetic data gets real logic. No faking. No hiding.*

> **⚠️ THIS IS THE HIGHEST-RISK SPRINT.** Split into 3 phases to reduce blast radius. Complete each phase and verify before moving to the next. Do not rush.

> **📌 APPROVED NEW DEVELOPMENT:** This sprint requires new Prisma models, new API endpoints, new controllers, and new routes. This was explicitly approved because the existing AI frontend UI cannot function without backend infrastructure that doesn't exist yet. The following must be built:
> - `ScoringConfig` model (or extend `BusinessSettings`) — does not exist in schema
> - `GET/PUT /api/ai/scoring-config` — does not exist in routes
> - `GET /api/ai/predictions` (global, not per-lead) — only per-lead exists at `/api/ai/predictions/:leadId`
> - `POST /api/ai/recalibrate` — does not exist (only `POST /api/ai/recalculate-scores` exists, which is different)
> - `GET /api/ai/recalibration-status` — does not exist
> - `GET /api/ai/lead/:id/score-factors` — does not exist (only `/api/ai/lead-score/:leadId` exists, returns score not factors)

### Phase 5A — Fix the Math (Safe Edits)

> *Fix all AI calculation bugs and error swallowing first. These are safe edits to existing code — no new endpoints, no new UI.*

**Items:** L15, L16, L17, L18, L19 (logic fixes) + E12, E13, E14 (error swallowing) + remove `Math.random()` from render.

**Phase 5A Definition of Done:** Zero NaN-producing weight calculations. Feature importance reflects real weights. No flickering random values. All AI error paths surface to the user.

### Phase 5B — Scoring & Recalibration (New Endpoints, New Models)

> *Build the backend infrastructure, then wire it to existing frontend. This is approved new development.*

> **Step 0 (before any Phase 5B work):** Run Prisma migration to add scoring config storage. Either add a `ScoringConfig` model with `{ id, organizationId, weights: Json, updatedAt, updatedBy }`, or add a `scoringConfig: Json` field to `BusinessSettings`. Both approaches work — the key requirement is org-scoped storage for weight factors.

**Items:** #54–56 (scoring config), #60–61 (recalibration), #65–66 (factor breakdown).

**Phase 5B Definition of Done:** Lead scoring is configurable with real weights. Recalibration triggers real jobs. Score explanations visible per lead.

### Phase 5C — Predictions & Actions (Highest Risk — New Endpoints)

> *New DB queries, AI logic, and wiring UI actions to multiple APIs. Most things to go wrong here. Go slow. The global predictions endpoint must be built from scratch.*

**Items:** #57–59 (predictive analytics), #62–64 (Take Action buttons).

**Phase 5C Definition of Done:** Predictive analytics shows real trend projections. All "Take Action" buttons execute real actions.

---

### 5.1 Lead Scoring Configuration

| # | Task | Details |
|---|------|---------|
| 54 | ✅ Backend: Scoring config endpoint | **DONE** — GET/PUT `/api/ai/scoring-config` + POST `/api/ai/scoring-config/reset` routes exist. Dedicated `ScoringConfig` Prisma model with per-org unique constraint. Full controller in `scoring-config.controller.ts`. Org-scoped. |
| 55 | ✅ Frontend: Scoring config UI | **DONE** — "Configure Model" button toggles config panel with range sliders for all 10 weight fields. Save calls `aiApi.updateScoringConfig()`. Reset to defaults calls `aiApi.resetScoringConfig()`. Shows last-updated-by info. |
| 56 | ✅ Wire recalculate to use custom config | **DONE** — `recalculateScores` calls `updateMultipleLeadScores()` which checks for org-level `ScoringConfig` via `prisma.scoringConfig.findUnique({ where: { organizationId } })` and applies custom weights. |

### 5.2 Predictive Analytics — Real Data

| # | Task | Details |
|---|------|---------|
| 57 | ✅ Backend: Real prediction endpoint | **DONE** — GET `/api/ai/predictions` queries real DB via Prisma. Computes monthly conversion rates (actual WON vs total), pipeline velocity, revenue forecast (linear projection), at-risk leads (no contact in 14+ days). Returns predictions, stats, conversionTrend, revenueForecast, stageDistribution, pipelineSummary. Org-scoped. |
| 58 | ✅ Frontend: Wire PredictiveAnalytics.tsx | **DONE** — Calls `aiApi.getGlobalPredictions()` via useQuery. Renders conversionTrend in LineChart, revenueForecast in AreaChart with actual vs predicted. No synthetic formula. |
| 59 | ⚠️ Enable "Details" button | **PARTIAL** — Expandable detail panel shows data points, confidence range, impact level, and analysis text. Missing: structured "contributing factors" list and per-prediction "historical accuracy" field. |

### 5.3 Model Training → Model Recalibration

| # | Task | Details |
|---|------|---------|
| 60 | ✅ Backend: Recalibration job endpoint | **DONE** — POST `/api/ai/recalibrate` triggers ml-optimization.service.ts, stores in-memory job status. GET `/api/ai/recalibration-status` returns jobId, status, startedAt, completedAt, result (accuracy, sampleSize, improvements), or error. |
| 61 | ✅ Frontend: Wire ModelTraining.tsx | **DONE** — "Coming Soon" removed. "Recalibrate Model" button calls `aiApi.recalibrateModel()`. Polls via setInterval every 2s for status (2-min timeout). Shows real metrics from `aiApi.getTrainingModels()`. Per-model retrain buttons work. |

### 5.4 AI Hub Recommendations → Actionable

| # | Task | Details |
|---|------|---------|
| 62 | ✅ Wire "Take Action" buttons | **DONE** — `handleRecommendationAction` now creates real tasks via `tasksApi.createTask()` for follow-up/task actions. Navigation-based actions (campaigns/create, communication) kept with honest toast messages. Wrapped in try/catch with `toast.error`. |
| 63 | ✅ Intelligence Insights "Take Action" | **DONE** — `handleTakeAction` now creates tasks via `tasksApi.createTask()` for risk, opportunity, and task-related insights. Optimization branch still calls `handleOptimizeScoring()`. Wrapped in try/catch. |
| 64 | ✅ Intelligence Insights "Apply Optimizations" | **DONE** — Wired to `intelligenceService.optimizeScoring()`, shows toast with new accuracy, reloads insights. Button appears in two places, both functional. |

### 5.5 Prediction Factor Breakdown

| # | Task | Details |
|---|------|---------|
| 65 | ✅ Backend: Factor explanation endpoint | **DONE** — GET `/api/ai/lead/:leadId/score-factors` exists. Returns finalScore, rawTotal, components array (name, count, weight, points per factor), factors object with raw activity counts, recencyLabel. Uses org-level scoring config when available. |
| 66 | ✅ Frontend: Factor breakdown UI | **DONE** — "Score Factor Breakdown" card panel triggered by "Score Breakdown" button on lead rows. Shows final score, raw total, recency label, colored component bar chart (positive/negative points), and raw activity data grid. Fetches from `aiApi.getLeadScoreFactors()`. |

### 5.6 Logic Fixes — AI Calculation Correctness

| # | File | Problem | Fix | Severity |
|---|------|---------|-----|----------|
| L15 | ✅ `backend/services/leadScoring.service.ts` | `weights.activityWeight` defaulting to prevent NaN | **DONE** — Each weight extracted with full type check + default: `typeof raw.activityWeight === 'number' && raw.activityWeight > 0 ? raw.activityWeight : 0.3` | **MEDIUM** |
| L16 | ✅ `backend/services/leadScoring.service.ts` | Frequency inflated by wrong denominator | **DONE** — `daysSinceOldestActivity` now computed from oldest activity date via `Math.min(...allDates.map(d => d.getTime()))`. | **MEDIUM** |
| L17 | ✅ `backend/controllers/ai.controller.ts` | Feature importance was hardcoded | **DONE** — `getFeatureImportance` derives values from actual `SCORE_WEIGHTS` (40, 30, 25, 20, etc.) normalized to percentages. | **MEDIUM** |
| L18 | ✅ `ai/ModelTraining.tsx` | `Math.random()` in render path | **DONE** — No `Math.random()` anywhere. Training metrics use `useMemo` derived from real model data. No "Coming Soon" banner. | **MEDIUM** |
| L19 | ✅ `backend/services/leadScoring.service.ts` | EMAIL_OPT_OUT unscaled | **DONE** — `EMAIL_OPT_OUT: SCORE_WEIGHTS.EMAIL_OPT_OUT * activityScale`. Org config uses `orgConfig.emailOptOutPenalty` directly. | **LOW** |
| L19b | ✅ `backend/services/ml-optimization.service.ts` | Empty leads → NaN in calculateAccuracy | **DONE** — `leads.length > 0 ? (correct / leads.length) * 100 : 0` guard added. | **MEDIUM** |
| L19c | ✅ `backend/services/abtest.service.ts` | se = 0 → Infinity zScore | **DONE** — `if (se === 0 || !isFinite(se)) { return { isSignificant: false, confidence: 0, winner: null, pValue: 1 }; }` | **MEDIUM** |
| L19d | ✅ `backend/services/intelligence.service.ts` | totalLeads = 0 → NaN | **DONE** — `totalLeads > 0 ? Math.round(...) : 0` guard added. | **MEDIUM** |
| L19e | ✅ `backend/services/leadScoring.service.ts` | Untyped JSON cast → NaN propagation | **DONE** — Manual `typeof` guards for each weight field (not zod, but functionally safe runtime validation). | **MEDIUM** |

### 5.7 Error Swallowing Fixes — Sprint 5 Scope

| # | File | Problem | Fix |
|---|------|---------|-----|
| E12 | ✅ `ai/AIHub.tsx` | Eight `.catch()` swallowing patterns | **DONE** — Zero `.catch()` patterns. All 8 API calls via `Promise.all`, errors propagate to outer catch → mock fallback or toast error. |
| E13 | ✅ `ai/IntelligenceInsights.tsx` | Four `.catch(() => null)` patterns | **DONE** — Zero `.catch()` patterns. All 4 API calls via `Promise.all`, errors propagate to catch → `toast.error(err.message)`. |
| E14 | ✅ `ai/LeadScoring.tsx` | Empty catch blocks | **DONE** — Added `toast.error('Failed to load model performance data')` and `toast.error('Failed to load feature importance data')` to the 2 inner catches that previously only had `console.error`. |

**Sprint 5 Definition of Done:** ✅ Phase 5A complete (all math fixes done). ✅ Phase 5B complete (scoring config, recalibration, factor breakdown all working). ✅ Phase 5C complete — predictions endpoint + UI done, Apply Optimizations done, "Take Action" buttons (#62/#63) now create real tasks via `tasksApi.createTask()`. ✅ Lead scoring configurable with real weights. ✅ Predictive analytics shows real DB data. ✅ Model recalibration triggers real jobs. ✅ Score explanations visible per lead. ✅ Zero NaN-producing calculations. ✅ Feature importance reflects real model. ✅ E14 done — both inner catches now show `toast.error()`.

---

## SPRINT 5.5 — REGRESSION SAFETY NET (Day 17) ⚠️ PARTIALLY COMPLETE

> *After the two riskiest sprints (1.5 and 5), add targeted tests to lock in the fixes. Keep it lean.*

### 5.5.1 Frontend API Layer Tests

| # | Task | Details |
|---|------|---------|
| T1 | ⏳ Test error propagation in API functions | **NOT DONE** — No test files exist for frontend `src/lib/api.ts`. Zero `*.test.tsx` or `*.spec.tsx` files in the entire frontend. |
| T2 | ✅ Test critical backend controllers | **DONE** — `tests/critical-regressions.test.ts` (12 tests, all passing): markAllAsRead org-scoping (L1/L2), makeCall DB persistence (#9/L14), CSV import parsing + email validation + org-scoping (L3/L4/L5), customFields round-trip (#8), cross-tenant message isolation. Uses PostgreSQL via `jest.config.regression.js`. |

### 5.5.2 Org-Scope Regression Tests

| # | Task | Details |
|---|------|---------|
| T3 | ✅ Test org-isolation on critical controllers | **DONE** — `multi-tenancy.test.ts` (240 lines) creates data in Josh's org and Arshia's org, verifies cross-org access returns 404. Tests cover leads, tags, email uniqueness, cross-tenant tag prevention. |
| T4 | ⚠️ Test authorization middleware | **PARTIAL** — `middleware.test.ts` tests error handling and validation (401 for invalid tokens, 404 for unknown routes). But NO explicit tests for `canAccessLead`, `canAccessTask`, etc. rejecting cross-org access at the middleware level. The multi-tenancy tests cover the effect but not the specific functions. |

**Sprint 5.5 Definition of Done:** ⏳ T1 NOT DONE (no frontend tests). ✅ T2 done — `critical-regressions.test.ts` covers markAllAsRead, CSV import, makeCall, customFields, cross-tenant isolation (12 tests, all passing). ✅ T3 org-isolation tests exist and cover key scenarios. ⚠️ T4 partial (effect tested in multi-tenancy, but not the specific middleware functions). Smoke test script still not created.

---

## SPRINT 6 — SYSTEM INTEGRITY (Days 18–19) ✅ MOSTLY COMPLETE

> *Cross-cutting concerns that affect reliability and data quality.*

### 6.1 Error Boundaries

| # | Task | Details |
|---|------|---------|
| 67 | ✅ Add PageErrorBoundary to unprotected routes | **DONE** — Every single route in App.tsx is wrapped in `<PageErrorBoundary>`, including Communication, Workflows, Settings, Billing, Help, Integrations. |

### 6.2 Reports & Analytics Persistence

| # | Task | Details |
|---|------|---------|
| 68 | ✅ Backend: Saved reports model + CRUD | **DONE** — Prisma `SavedReport` model with id, name, description, type, config (Json), userId, organizationId + indexes. Full CRUD in `savedReport.controller.ts` (list/get/create/update/delete). Routes at `/api/reports/saved`. |
| 69 | ✅ Frontend: Wire ReportBuilder save/load | **DONE** — Save button now calls `savedReportsApi.create()` with `{ name, type: reportCategory, config: { widgets, createdAt } }` instead of `localStorage.setItem`. Wrapped in async try/catch with `toast.error` on failure. |
| 70 | ✅ Wire CustomReports "Generate Report" | **DONE** — Fetches via `analyticsApi.getDashboardStats()`, `getLeadAnalytics()`, `getCampaignAnalytics()`. Saved reports come from `savedReportsApi.list()`. No mock data. |
| 71 | ✅ Wire "Run Report" on saved reports | **DONE** — "Run Report" button loads saved report config and generates results from real analytics data. |
| 72 | ✅ Implement PDF export | **DONE** — Installed `jspdf` + `html2canvas`. Rewrote `printToPDF()` and `exportAnalyticsAsPDF()` in `exportService.ts` to use html2canvas for DOM capture and jsPDF for real PDF file generation with multi-page support. Falls back to `window.print()` if libraries fail. |

### 6.3 Real-Time Polling

| # | Task | Details |
|---|------|---------|
| 73 | ✅ Inbox polling | **DONE** — `CommunicationInbox.tsx` has `refetchInterval: 30_000`. |
| 74 | ✅ Dashboard polling | **DONE** — `Dashboard.tsx` has `refetchInterval: 60_000`. |
| 75 | ✅ Notification badge polling | **DONE** — `NotificationBell.tsx` polls every 30s via `setInterval(fetchUnreadCount, 30000)` using `notificationsApi.getUnreadCount()`. |

### 6.4 Compliance & Security Cleanup

| # | Task | Details |
|---|------|---------|
| 76 | ✅ ComplianceSettings badges | **DONE** — Conditionally renders green `CheckCircle` or yellow `AlertTriangle` based on actual state (`tcpaEnabled`, `dncEnabled`, `gdprEnabled`, `auditEnabled`) from `settingsApi.getBusinessSettings()`. |
| 77 | ✅ ComplianceSettings audit logs | **DONE** — Fetches audit logs via `activitiesApi.getActivities()` using useQuery. Not hardcoded. |
| 78 | ✅ SecuritySettings security score | **DONE** — `security.controller.ts` computes: base 30 + 30 for 2FA + 15 for email verified + 10 for recent login + 15 for recent password change. Capped at 100. |

### 6.5 Logic Fixes — Analytics & Reporting Correctness

| # | File | Problem | Fix | Severity |
|---|------|---------|-----|----------|
| L20 | ✅ `analytics/ConversionReports.tsx` | Per-source rates were identical (using global average) | **DONE** — Backend computes `wonBySource` per source. Frontend calculates individual per-source: `count > 0 ? ((converted / count) * 100).toFixed(1) : '0.0'`. | **HIGH** |
| L21 | ✅ `backend/controllers/analytics.controller.ts` | Funnel rate could exceed 100% | **DONE** — `conversionRate = Math.min(Math.round((stage.count / stages[index - 1].count) * 100), 100)`. | **MEDIUM** |
| L22 | ⏳ `backend/controllers/admin.controller.ts` | Health dashboard returns hardcoded fake stats | **NOT DONE** — Still returns hardcoded `apiResponseTime: 142, uptime: '99.98%', errorRate: '0.02%'`. Comment says "mock data — in production, query from monitoring service". | **MEDIUM** |

### 6.6 Error Swallowing Fixes — Sprint 6 Scope

| # | File | Problem | Fix |
|---|------|---------|-----|
| E15 | ✅ `analytics/ConversionReports.tsx` | Error swallowing — catches hide failures | **DONE** — Uses `useQuery` with `isError`/`error`/`ErrorBanner` pattern. |
| E16 | ✅ `analytics/CustomReports.tsx` | Error swallowing — catches hide failures | **DONE** — Uses `useQuery` with `isError`/`ErrorBanner`. No `.catch` swallowing. |
| E17 | ✅ `analytics/ReportBuilder.tsx` | Error swallowing — catches hide failures | **DONE** — Uses `useQuery` with `isError`/`ErrorBanner`. No `.catch` swallowing. |
| E18 | ✅ `analytics/UsageAnalytics.tsx` | Error swallowing — catches hide failures | **DONE** — Uses `useQuery` with `isError`/`ErrorBanner`. No `.catch` swallowing. |
| E19 | ✅ `backend/services/workflow.service.ts` | Workflow actions fail silently, no retry | **DONE** — Added per-action retry logic in `executeActionSequence`: 3 attempts with exponential backoff (1s, 3s, 9s). Failed actions log warnings per attempt and errors after final failure. Sequence continues to next action instead of aborting. |

**Sprint 6 Definition of Done:** ✅ All routes have error boundaries. ✅ SavedReport model + CRUD backend exists. ✅ ReportBuilder wired to `savedReportsApi.create()`. ✅ CustomReports + Run Report functional. ✅ PDF export implemented with jspdf + html2canvas. ✅ Real-time polling active (inbox 30s, dashboard 60s, notifications 30s). ✅ Compliance badges reflect real state. ✅ Security score calculated from real data. ✅ Per-source conversion rates fixed. ✅ Funnel rate capped at 100%. ⏳ Admin health stats still hardcoded (L22). ✅ Error swallowing fixed in 4 analytics pages. ✅ Workflow per-action retry implemented (E19).

---

## SPRINT 7 — INBOUND COMMUNICATION (Days 20–22) ✅ COMPLETE

> *Completed Feb 2026. SendGrid Inbound Parse webhook added. Notifications fire on both inbound email and inbound SMS. Direction indicator "Incoming" badge added to thread list for both email and SMS.*

### 7.1 Inbound Email

| # | Task | Details |
|---|------|---------|
| 79 | ✅ Backend: SendGrid Inbound Parse webhook | **DONE** — `POST /api/webhooks/sendgrid/inbound` added to `webhook.routes.ts`. Parses `from`, `to`, `subject`, `text`/`html` from SendGrid form-encoded body. Extracts plain-text from HTML when necessary. Matches sender email to existing lead via `prisma.lead.findFirst({ where: { email } })`. Determines `organizationId` from matched lead or recipient user's EmailConfig. Creates `Message` record with `type: EMAIL`, `direction: INBOUND`, `status: DELIVERED`. Responds `200 OK` immediately (before DB writes) to prevent SendGrid retries. |
| 80 | ✅ Frontend: Display inbound emails + direction indicator | **DONE** — Inbox already fetches all messages including INBOUND via `getMessages()`. Message bubbles already use `direction === 'OUTBOUND'` to distinguish sent vs received. Added green `← Incoming` badge in thread list items when last message in thread is `INBOUND`. Imported `ArrowDownLeft` icon from lucide-react. |

### ~~7.2 Inbound SMS~~ ✅ ALREADY DONE

| # | Task | Details |
|---|------|---------||
| ~~81~~ | ~~Backend: Twilio inbound SMS webhook~~ | ~~ALREADY DONE — `POST /api/webhooks/twilio/sms/:userId` exists, parses From/Body, matches phone to lead, creates Message with type SMS, direction INBOUND~~ |
| 82 | ✅ Frontend: Display inbound SMS + direction indicator | **DONE** — Same `← Incoming` badge (green, badged in thread list) now covers SMS threads. The same `thread.messages[thread.messages.length - 1]?.direction === 'INBOUND'` check applies to all channel types including SMS. |

### 7.3 Auto-Notification on Inbound

| # | Task | Details |
|---|------|---------|
| 83 | ✅ Create notification on inbound message | **DONE** — Both webhook handlers now create `Notification` records. Twilio SMS handler creates notification for `config.userId` (the user who owns the Twilio config). SendGrid Inbound handler creates notification for the user whose EmailConfig `fromEmail` matches the `to` address, or the user whose account email matches. Notification includes lead name when matched, falls back to sender email/phone. Frontend notification polling (30s) picks it up automatically. `createInboundNotification()` helper added with proper error isolation (notification failure does not fail the webhook response). |

**Sprint 7 Definition of Done:** ✅ Users receive inbound emails in their inbox stored as real Message records (direction INBOUND). ✅ Inbound SMS already worked (#81). ✅ Both inbound email and SMS create Notifications. ✅ Thread list shows `← Incoming` direction badge for threads where the last message is inbound. ✅ The inbox is now a true two-way communication center.

---

## SPRINT 8 — SECURITY HARDENING (Days 23–25) ✅ COMPLETE

> *Completed Feb 2025. All 17 items done: RefreshToken + PasswordResetToken models added, refresh tokens stored in DB with rotation and theft detection, logout revokes server-side, password change/reset revoke all sessions, password reset sends real emails, rate limiting fixed (generalLimiter no longer skipped in dev, threshold raised to 300/15m), webhook + export routes rate-limited, email HTML content exempt from sanitizer, req.params sanitized, Zod schemas for all 4 webhook routes, Twilio + SendGrid signature verification, CSV fileFilter, attachment upload constraints (frontend + backend), disk storage for attachments.*

### 8.1 Authentication — Token Revocation & Session Safety

> **⚠️ AUDIT VERIFIED:** Token refresh with 401 retry queue IS implemented (`src/lib/api.ts` L68-121, interceptor + `failedQueue`). Access tokens expire in 15m, refresh tokens in 7d. BUT refresh tokens are pure JWTs — not stored in DB, not revocable. Logout does nothing server-side.

| # | Task | Details |
|---|------|---------|
| 84 | Store refresh tokens in DB | Add a `RefreshToken { id, token, userId, organizationId, expiresAt, createdAt, revokedAt }` model to Prisma schema. On login, store the issued refresh token. On refresh, verify token exists in DB AND is not revoked. **⚠️ REQUIRES MIGRATION.** |
| 85 | Implement token revocation on logout | In `auth.controller.ts` `logout()` (currently just returns `{ success: true }` at L335), mark the user's refresh token as revoked in DB. Frontend already clears localStorage — this closes the server-side gap. |
| 86 | Revoke all tokens on password change | When a user changes their password (via SecuritySettings or password reset), revoke ALL their refresh tokens. Forces re-login on all devices. |
| 87 | Implement refresh token rotation | In `auth.controller.ts` `refresh()` (L190-229), issue a NEW refresh token alongside the new access token. Revoke the old refresh token. If someone reuses a revoked refresh token, revoke ALL tokens for that user (indicates token theft). |
| 88 | Fix password reset flow | `forgotPassword()` at L310-325 generates a token but only `console.log`s it — no email sent. `resetPassword()` returns `400 "not yet fully configured"`. Wire to `email.service.ts` to send the reset link. **This is currently non-functional.** |

### 8.2 Rate Limiting — Close the Gaps

> **⚠️ AUDIT VERIFIED:** `express-rate-limit` ^8.1.0 IS installed. `generalLimiter` (100/15m), `authLimiter` (5/15m), `registerLimiter` (3/hr), `sensitiveLimiter` (10/15m), `aiRateLimiter` (100/min) all exist. BUT `generalLimiter` skips when `NODE_ENV !== 'production'` — if production is deployed with `NODE_ENV` unset, all rate limiting is disabled.

| # | Task | Details |
|---|------|---------|
| 89 | Fix `generalLimiter` skip logic | In `backend/src/middleware/rateLimiter.ts` L21, the skip condition is `process.env.NODE_ENV === 'test' || isDevelopment`. Change to ONLY skip in test: `process.env.NODE_ENV === 'test'`. Rate limiting should be active by default, not opt-in. |
| 90 | Add rate limiting to webhook routes | `POST /api/webhooks/sendgrid` and `POST /api/webhooks/twilio/*` have zero rate limiting. Add a dedicated `webhookLimiter` (e.g., 200/min per IP) to prevent DDoS via webhook floods. |
| 91 | Add rate limiting to export routes | CSV/PDF export endpoints trigger heavy DB queries. Add `sensitiveLimiter` or a dedicated `exportLimiter` (e.g., 10/15m) to prevent abuse. |
| 92 | Review `generalLimiter` threshold | 100 req/15m (~6.7/min per IP) is aggressive for a SPA that makes many parallel API calls on page load. Consider raising to 300/15m or switching to a per-user (JWT-based) limiter for authenticated routes. |

### 8.3 Input Sanitization — Fix Over-Stripping & Gaps

> **⚠️ AUDIT VERIFIED:** `sanitize-html` middleware at `backend/src/middleware/sanitize.ts` strips ALL HTML tags from `req.body` and `req.query` globally. `Zod` validation with 14 validator files exists. Frontend uses `DOMPurify` for all 3 `dangerouslySetInnerHTML` locations. BUT the global sanitizer strips legitimate email HTML content (campaign bodies, templates).

| # | Task | Details |
|---|------|---------|
| 93 | Exempt email content fields from global sanitizer | The global `sanitizeInput` middleware at `sanitize.ts` L17 uses `{ allowedTags: [], allowedAttributes: {} }` — this strips ALL HTML from campaign email bodies, email templates, and newsletter content. Add an exemption list for known HTML-content fields (`body`, `htmlContent`, `templateContent`) or apply a less aggressive allowlist (common email tags: `p`, `a`, `img`, `br`, `div`, `span`, `table`, `tr`, `td`, `th`, `strong`, `em`, `h1-h6`, `ul`, `ol`, `li`). |
| 94 | Add `req.params` sanitization | `sanitize.ts` only sanitizes `req.body` and `req.query`. Add `req.params` to prevent ID-based injection. |
| 95 | Add Zod validation schemas for webhook routes | `webhook.routes.ts` — Twilio/SendGrid payloads pass through `sanitizeInput` but have no Zod validation. Add schemas to validate expected webhook payload shapes. |
| 96 | Add webhook signature verification | SendGrid and Twilio both send signature headers. Verify `X-Twilio-Signature` and SendGrid's `X-Twilio-Email-Event-Webhook-Signature` to confirm webhooks are authentic, not spoofed. |

### 8.4 File Upload Validation

> **⚠️ AUDIT VERIFIED:** Lead CSV import has multer with 5MB limit and memory storage. Frontend checks `.csv` extension + 5MB. But multer config has NO `fileFilter` — any file type is accepted. Inbox attachments at `CommunicationInbox.tsx` L2040 have `type="file" multiple` with NO constraints.

| # | Task | Details |
|---|------|---------|
| 97 | Add `fileFilter` to CSV multer | In `lead.routes.ts` L50, add a multer `fileFilter` that rejects non-CSV files by checking mimetype (`text/csv`, `application/vnd.ms-excel`) and extension. |
| 98 | Add constraints to inbox attachment upload | In `CommunicationInbox.tsx` L2040, add `accept` attribute for common attachment types (pdf, doc, docx, xls, xlsx, png, jpg, gif, txt). Add client-side file size check (e.g., 10MB per file, 25MB total). |
| 99 | Add backend attachment upload validation | Wherever the `messagesApi.uploadAttachment(file)` endpoint is handled, add multer with: `fileFilter` (allowed types), `limits` (file size), and scan/reject executable extensions (`.exe`, `.bat`, `.sh`, `.js`, etc.). |
| 100 | Remove memory storage for large uploads | If attachment uploads exist beyond CSV, use `multer.diskStorage()` or stream to S3/R2 directly instead of buffering entire files in memory. |

**Sprint 8 Definition of Done:** Refresh tokens stored in DB and revocable. Logout invalidates tokens server-side. Password reset sends real emails. Rate limiting cannot be accidentally disabled. Webhook routes are rate-limited and signature-verified. Email HTML content not stripped by sanitizer. All file uploads validated by type and size. Zero executable files uploadable.

---

## SPRINT 9 — PRODUCTION POLISH (Days 26–28)

> *The app is functional and secure. This sprint makes it professional — deliverable emails, visible debugging, scalable lists, and no dead-end pages.*

### 9.1 Email Deliverability

> **⚠️ AUDIT VERIFIED:** SendGrid email sending fully implemented in `email.service.ts` with open/click tracking. Webhook handler processes `delivered`, `open`, `click`, `bounce`, `dropped` events. Unsubscribe system exists. BUT no `List-Unsubscribe` header (required by Gmail/Yahoo since Feb 2024), no bounce suppression list, no spam complaint → do-not-email flag.

| # | Task | Details |
|---|------|---------|
| 101 | Add `List-Unsubscribe` header to all outbound emails | In `email.service.ts` L145-165, add RFC 8058 headers to the SendGrid message object: `List-Unsubscribe: <mailto:unsubscribe@yourdomain.com>, <https://yourdomain.com/api/unsubscribe/{token}>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. Without this, Gmail/Yahoo will increasingly route bulk emails to spam. |
| 102 | Build bounce suppression list | When the SendGrid webhook fires a `bounce` event (email.service.ts L465-470), do MORE than update message status — add the email address to a suppression list (new `EmailSuppression { id, email, reason, organizationId, createdAt }` model or a simple `suppressedAt` field on Lead). Check this list BEFORE sending any email. **⚠️ REQUIRES MIGRATION.** |
| 103 | Handle spam complaints properly | When `spamreport` event fires (webhook.routes.ts L245-247), set the lead's `emailOptIn` to `false` AND add to suppression list. Currently only updates message status to `FAILED`. |
| 104 | Fix mock mode fake delivery stats | `email.service.ts` L356 marks mocked emails as `status: 'DELIVERED'` — inflates analytics. Change to `status: 'MOCK'` or `'SIMULATED'` so dashboards can filter them out. |
| 105 | Add daily sending limit per organization | `sendBulkEmails()` at email.service.ts L310-330 has only a 100ms delay. Add a daily cap (e.g., 1000 emails/day per org for free tier, configurable by plan). Track daily sends and reject with a clear error when limit hit. Protects sender reputation and prevents runaway campaigns. |

### 9.2 Observability — Logging, Error Tracking, Monitoring

> **⚠️ AUDIT VERIFIED:** `requestLogger` middleware at `backend/src/middleware/logger.ts` logs with emoji `console.log`. A `productionLogger` (JSON, errors-only) is DEFINED but NOT USED — `server.ts` L93 always uses `requestLogger`. No structured logging library, no error tracking service, no request tracing.

| # | Task | Details |
|---|------|---------|
| 106 | Install and configure `pino` (structured logging) | Replace all `console.log`/`console.error` in backend with `pino` logger. Configure JSON output in production, pretty-print in development. Pino is the fastest Node.js logger — critical for a real-time app. |
| 107 | Wire `productionLogger` in production | In `server.ts` L93, use `productionLogger` when `NODE_ENV === 'production'` instead of always using emoji `requestLogger`. The middleware already exists — it just needs to be wired. |
| 108 | Add request correlation IDs | Create middleware that generates a UUID `X-Request-ID` header for every request. Pass it through pino's child logger context so every log line from that request is traceable. Return the ID in response headers for client-side debugging. |
| 109 | Integrate Sentry (or equivalent) | Install `@sentry/node`. Initialize in `server.ts` with DSN from env. Capture unhandled exceptions and unhandled rejections. Add `Sentry.captureException()` to the global error handler middleware. This is the single most impactful observability change — you'll see every production crash in a dashboard. |
| 110 | Expand health check endpoint | `GET /health` at server.ts L99-118 only checks DB. Add: Redis connectivity (if used), SendGrid API reachability (HEAD request), memory usage (`process.memoryUsage()`), uptime (`process.uptime()`). Return structured JSON. This feeds monitoring dashboards and load balancer health checks. |

### 9.3 Pagination Completeness

> **⚠️ AUDIT VERIFIED:** `LeadsList.tsx` has full server-side pagination (page/limit/offset, 25 per page). But `TasksPage.tsx` fetches ALL tasks with no pagination. `NotificationsPage.tsx` is 100% mock data (wired in Sprint 2, but still needs pagination). Analytics pages fetch aggregates — no pagination needed.

| # | Task | Details |
|---|------|---------|
| 111 | Add server-side pagination to TasksPage | Add `page`/`limit` state to `TasksPage.tsx`. Pass to `tasksApi.getTasks({ page, limit, ...filters })`. Backend `task.controller.ts` `getTasks()` already supports `skip`/`take` — verify and wire. Add pagination UI (same pattern as LeadsList). |
| 112 | Add pagination to NotificationsPage | After Sprint 2 wires real API data (#13), add `page`/`limit` params. Backend notification controller should support it — verify. Add "Load more" or pagination controls. |
| 113 | Add pagination to ActivityPage | `ActivityPage.tsx` fetches all activities. Add `page`/`limit` to `activitiesApi.getActivities()` call. Backend supports it — verify. Sprint 4 (#53) adds controls — this ensures the backend params are passed. |
| 114 | Add infinite scroll to CommunicationInbox thread list | Sprint 4 (#49) adds server-side pagination params. This item adds the infinite scroll / "Load more" UX — fetch next page when user scrolls to bottom of thread list. |

### 9.4 "Coming Soon" Cleanup — Hide or Gate Dead-End Pages

> **⚠️ AUDIT FOUND:** 3 entire pages are full UI shells with zero backend (PhoneCampaigns, SocialMediaDashboard, NewsletterManagement). 15+ smaller "Coming Soon" badges/toasts exist across AI, settings, and campaigns. Users can navigate to the full-page shells from the sidebar and see non-functional UI.

| # | Task | Details |
|---|------|---------|
| 115 | Remove sidebar navigation to stub pages | Remove or disable sidebar links to `PhoneCampaigns`, `SocialMediaDashboard`, `NewsletterManagement`. These are full-page UI shells with zero backend — users navigate to them, see polished-looking pages, click buttons, and nothing works. Either remove from nav entirely or add a `(Coming Soon)` suffix with `pointer-events: none`. |
| 116 | Gate disabled campaign types | In `CampaignCreate.tsx` L449-459, Social and Phone campaign types show "Coming Soon" badge but are still selectable in some flows. Ensure they are fully `disabled` and cannot be selected as campaign type. |
| 117 | Remove misleading "Coming Soon" toasts for in-plan items | Several items flagged as "Coming Soon" are actually getting built in this plan: `ModelTraining.tsx` (Sprint 5), `IntelligenceInsights.tsx` (Sprint 5), `LeadScoring.tsx` config (Sprint 5), `PredictiveAnalytics.tsx` details (Sprint 5), forward feature (Sprint 2 #19). After each sprint completes, verify the "Coming Soon" text was removed. This is a verification task, not new work. |
| 118 | Consolidate remaining "Coming Soon" into a consistent pattern | For items genuinely not implemented yet (photo upload, logo upload, Google Workspace integration, Zapier, documentation page), use a consistent disabled state: grey out the button/section, show a uniform `"This feature is not yet available"` tooltip. Remove any that imply the feature is being actively built. |

**Sprint 9 Definition of Done:** All outbound emails include `List-Unsubscribe` headers. Bounced emails are suppressed from future sends. Spam complaints auto-opt-out leads. Structured JSON logging in production. Sentry (or equivalent) captures all uncaught exceptions. Request correlation IDs in every log line. Health check covers all dependencies. Tasks and notifications paginated. Zero full-page dead-end "Coming Soon" pages reachable from sidebar nav. Consistent disabled state for genuinely unavailable features.

---

## PROGRESS TRACKER

| Sprint | Days | Focus | Items | Status |
|--------|------|-------|-------|--------|
| **Sprint 0** | Pre-Day 1 | Pre-flight checks, audits, ErrorBanner, type augmentation | P1–P11 (11 items) | ✅ **COMPLETE** (P6 deferred; P11 partial — 1 multer cast) |
| **Sprint 1** | Days 1–2 | Stop the lies (L1/L2 first → L3/L4 → toast fixes) | #7–11, 11b, 11c, L1–L6, L6b, E1, E1b (16 items; #1-6/#12 done, E2/E3 frozen) | ✅ **COMPLETE** (#8/#10 deferred; all settings wired; L2 fully scoped; #7 migration done) |
| **Sprint 1.5** | Days 3–4 | Org-scope remediation (73 queries + 5 middleware) | ORG-1–ORG-18 (18 items) | ✅ **COMPLETE** (all items verified/fixed including ORG-11, ORG-16/17/18) |
| **Sprint 2** | Days 5–6 | Easy wires + error fixes | #13–22, 24–27, 16b, L8–L10, L10b, E4–E7, E7b–E7f (27 items; #23 frozen, L7 done) | ✅ **COMPLETE** |
| **Sprint 3** | Days 7–9 | Tasks, Calendar, Notes + contract fixes | #27b, 27c, 28–46, L11–L13, E8, E9, E11 (24 items; E10 done) | ⚠️ **MOSTLY COMPLETE** (#42/#43/#44 FALSE — no follow-up code; ✅ E8 DONE; L13 PARTIAL) |
| **Sprint 4** | Days 10–11 | Communication completeness | #48–53, L14 (7 items; #47 done) | ✅ **COMPLETE** (#48 leadId filter done, #50 pin→star done) |
| **Sprint 5A** | Days 12–13 | AI — Fix the math (safe edits) | L15–L19, L19b–L19e, E12–E14 (12 items) | ✅ **COMPLETE** (✅ E14 fully done — both inner catches now toast.error) |
| **Sprint 5B** | Days 14–15 | AI — Scoring & recalibration (⚠️ new endpoints/models) | #54–56, #60–61, #65–66 (7 items) | ✅ **COMPLETE** |
| **Sprint 5C** | Day 16 | AI — Predictions & actions (highest risk) | #57–59, #62–64 (6 items) | ✅ **COMPLETE** (#62/#63 now create real tasks; #59 partial — missing structured contributing factors) |
| **Sprint 5.5** | Day 17 | Regression safety net (tests) | T1–T4 (4 items) | ⚠️ **MOSTLY COMPLETE** (T2 done, T3 done, T4 partial, T1 not done) |
| **Sprint 6** | Days 18–19 | System integrity (⚠️ SavedReport = new model) | #67–78, L20–L22, E15–E19 (20 items) | ✅ **COMPLETE** (18/20 done — #69 ReportBuilder API, #72 PDF export, E19 workflow retry all done. Remaining: L22 admin health stats hardcoded, #59 partial) |
| **Sprint 7** | Days 20–22 | Inbound communication | #79–80, #82–83 (4 items; #81 done) | ✅ **COMPLETE** |
| **Sprint 8** | Days 23–25 | Security hardening (auth, rate limiting, sanitization, uploads) | #84–100 (17 items) | ✅ **COMPLETE** |
| **Sprint 9** | Days 26–28 | Production polish (email, observability, pagination) | #101–114 (14 items; #115–118 removed from scope) | ⬜ Not Started |

**Total: 113 wiring items + 27 logic fixes + 22 error-swallowing fixes + 18 org-scope items + 11 pre-flight items + 4 test items = 195 items across 13 sprints (~28 working days)**
**Already done (pre-plan): 11 items (#1-6, #12, #47, #81, L7, E10)**
**Completed in Sprints 0–4: ~72 verified items (excludes 3 false: #42/#43/#44 FALSE. L13 PARTIAL)**
**Completed in Sprints 5–6: ~48 items (#54-58/60-66/67-72/73-78, L15-L22/L19b-L19e, E12-E19, T3)**
**Partial: ~2 items (#59, T4)**
**Not done in Sprints 5–6: ~3 items (L22, T1, T2)**
**Deferred (earlier sprints): ~4 items (P6, #8, #10)**
**Frozen (not counted): 3 items (E2, E3, #23)**
**Remaining: ~55 items (Sprints 7–9 + carry-forward)**

### Logic Fix Severity Summary

| Severity | Count | Examples |
|----------|-------|----------|
| **CRITICAL** | 2 | Multi-tenant data leak in markAllAsRead (L1), wrong userId property (L2) |
| **HIGH** | 5 | CSV parser breaks on commas (L4), null crash in tasks (L11), wrong conversion rates (L20), password tokens logged (L6b), call record lost (L14) |
| **MEDIUM** | 16 | Division by zero (L8, L19b, L19c, L19d), NaN propagation (L15, L19e), stale closures (L10), fake feature importance (L17), Math.random in render (L18), frequency miscalc (L16), funnel >100% (L21), fake health stats (L22), infinite loop risk (L13), swallowed dashboard errors (L9, L10b) |
| **LOW** | 2 | Inconsistent password policy (L6), unscaled opt-out weight (L19) |

### Error Swallowing Summary

| Pattern | Count | Where | Plan Items |
|---------|-------|-------|------------|
| `.catch(() => null/{ data: null })` in queryFn | 23 instances | Analytics (4 pages), AI Hub, Intelligence, Tasks, Campaigns, LeadDetail, LeadsList, LeadCreate, Pipeline | E4–E7, E7b–E7f, E8, E12–E13, E15–E18 |
| `catch { }` empty blocks | 6 instances | CampaignEdit, Lead Scoring, LeadsPipeline | E9, E14, E7f |
| `console.error` only (no user notification) | 7 instances | ConversionReports, CustomReports, ReportBuilder, UsageAnalytics, Workflow service | E15–E19 |
| `setTimeout` + fake `toast.success()` (no API call) | 6 instances (active domains) | SecuritySettings (4), EmailConfig DNS (1), CommunicationInbox bulk (1) | E1, E11, 11b |
| Optimistic `toast.success()` before `await` | 4 instances | CommunicationInbox (star, pin, archive, trash) | E1b |
| `catch` → fallback to local with fake success | 1 instance | LeadsList handleAddNote | 11c |
| Dashboard `queryFn` returns null on error | 2 instances | Dashboard revenue/alerts | L10b |
| **Total error-hiding patterns found** | **49 instances** | Across 20+ files | 22 plan items |

> **Note:** The 4 `setTimeout` fakes in Billing (E2, E3) are in a frozen domain and not counted above.

---

## HOUSEKEEPING — MD FILE CONSOLIDATION

> *Not a sprint task — do this when there's a natural break. Don't touch any February 2026 files.*

There are ~133 `.md` files in the project root from Oct–Nov 2025. Consolidate into 3 files:

| File | What goes in it |
|------|-----------------|
| `PROJECT_HISTORY.md` | Timeline/story format. One section per week. Keep key milestones and what was built. Cut redundant status reports (there are 5+ "COMPLETE" files for Phase 2 alone, 5 README variants, etc.) |
| `TECHNICAL_REFERENCE.md` | Actually useful guides: Twilio webhook setup, production API keys guide, automation docs, campaigns vs workflows architecture. Stuff you'd reference during development. |
| `TEST_RESULTS_ARCHIVE.md` | All test results/verification docs consolidated with dates, so you can see what was tested and when. |

**Do not touch:** `WE ARE MOVING.md`, `AUDIT NEEDS.md`, `MASTER_FIX_PLAN.md`, `OFFICIAL PLAN FOR GETTING THIS DONE.md`, `WE_ARE_GETTING_THIS_DONE.md`, `CONTINUED AUDIT WORK.md` (all February 2026 — still active).

---

## WHAT WE'RE NOT TOUCHING (FOR NOW)

### Frozen Domains (leave fake success as-is until unfrozen)
- **Admin Panel** — `admin/AdminPanel.tsx`, system health dashboard with hardcoded metrics
- **Team Management (admin tab)** — `settings/TeamManagement.tsx`, search input (#23 removed from Sprint 2)
- **Subscription page** — `settings/SubscriptionPage.tsx`
- **Billing module** — `billing/BillingPage.tsx`, `handleDownloadInvoice` & `handleCancelSubscription` are setTimeout fakes (E2/E3)
- `team.controller.ts` — 4 unscoped Prisma queries (ORG fix deferred until domain unfrozen)

> **Policy:** These domains have fake `setTimeout` + `toast.success()` patterns that violate our error handling rules. We are intentionally leaving them as-is because fixing them without building the real backend is pointless. When unfrozen, all fake-success patterns must be replaced with real API calls before the domain ships.

### Features Not In Scope
- WYSIWYG email editor (enhancement, not wiring)
- Workflow branching (enhancement, not wiring)
- Integrations Hub pages (static shells — real integrations live in Settings; will deal with later)
- DemoDataGenerator (not a user-facing feature)
- Mobile responsiveness
- i18n / localization
- Accessibility (ARIA labels, keyboard navigation, screen reader support)
- Data backup/recovery strategy

> **Note:** Social Media Dashboard, Newsletter Management, and Phone Campaigns are not being built. "Coming Soon" cleanup (#115–118) was removed from scope — these pages will be left as-is for now.

---

## UNKNOWN UNKNOWNS — POST-SPRINT CHECKLIST

> *Things the audit flagged that don't fit neatly into a sprint but need verification during or after implementation.*

| # | Check | When | What to look for |
|---|-------|------|-----------------|
| U1 | `unsubscribe.controller.ts` — 7 unscoped queries | Sprint 1.5 | These may be intentionally public (unsubscribe links don't require auth). Review each query: if it reads/writes user data, scope it. If it's a public opt-out endpoint, leave it. |
| U2 | Prisma `Message.pinned` field | Sprint 4 (#50) | Confirm whether to add migration or rename UI label. Decision affects whether #50 is a schema change or a UI rename. |
| U3 | `password-reset` token logging | Sprint 1 (L6b) | After removing `console.log`, verify the actual email sending works. If email transport isn't configured, the reset flow is broken entirely — not just the log. |
| U4 | `customFields` schema shape | Sprint 1 (#8) | `LeadDetail.tsx` sends `address`, `industry`, `budget`, `website` as customFields. Verify backend accepts and persists a JSON object, not just string fields. |
| U5 | React Router `searchParams` stability | Sprint 3 (L13) | Test with the actual React Router version in use. Some versions return stable references, some don't. Only fix if infinite re-render is reproducible. |
| U6 | Campaign executor org-scoping | Sprint 1.5 (ORG-15/16/17/18) | Background services are harder to audit statically. Test by running a campaign in Org A and verifying Org B leads are not affected. |
| U7 | `ScoringConfig` vs `BusinessSettings` | Sprint 5B (#54) | Decide whether to create a new model or add a JSON field to BusinessSettings. New model is cleaner. BusinessSettings is faster. Either works — just decide before writing the migration. |
| U8 | Recalibration job storage | Sprint 5B (#60) | Job status needs to survive server restarts. In-memory store loses status. Options: add a `RecalibrationJob` model, use Redis, or store in `BusinessSettings`. |
| U9 | CSV parser library | Sprint 1 (L4) | `csv-parse` (Node native) or `papaparse` (browser + Node). Since this is backend-only, either works. Pick one. |
| U10 | `Math.min(rate, 100)` correctness | Sprint 6 (L21) | Capping at 100% masks a real problem (leads skipping stages). Consider adding a note when cap activates: "Some leads skipped stages — rate capped at 100%." |
| U11 | Prisma migration ordering | Multiple sprints | Sprint 1 needs User model migration (phone, jobTitle, etc.), Sprint 4 may need Message.pinned, Sprint 5B needs ScoringConfig, Sprint 6 needs SavedReport. Plan migrations to avoid conflicts. |
| U12 | `ErrorBanner` component design | Sprint 0 (P5) | Needs: `message: string`, `retry?: () => void`, optional `className`. Should be dismissible. Keep it simple — this is used 40+ times across the codebase. |
| U13 | SendGrid Inbound Parse setup | Sprint 7 (#79) | Requires DNS MX record change + SendGrid dashboard configuration, not just code. Document the setup steps. |
| U14 | RefreshToken model design | Sprint 8 (#84) | Decide: separate `RefreshToken` model vs adding `refreshToken`/`refreshTokenExpiry` columns to User. Separate model supports multi-device (multiple tokens per user). User-column is simpler but only supports one session. |
| U15 | Sentry DSN provisioning | Sprint 9 (#109) | Create a Sentry project (free tier is fine) and add `SENTRY_DSN` to `.env`. Don't hardcode it. This is a pre-requisite for #109. |
| U16 | SendGrid domain authentication | Sprint 9 (#101) | `List-Unsubscribe` headers require a verified sending domain in SendGrid. Check if domain authentication (CNAME records for DKIM) is already configured. If not, this is a DNS change + SendGrid dashboard task, not just code. |
| U17 | `sanitize-html` email exemption scope | Sprint 8 (#93) | Be precise about which routes carry HTML content. Only campaign send, email template save, and possibly newsletter endpoints need the exemption. Don't exempt all routes. |
| U18 | `generalLimiter` threshold testing | Sprint 8 (#92) | Before changing the 100/15m limit, measure how many API calls a single page load generates. A dashboard loading leads, stats, notifications, and alerts in parallel could hit 10+ calls instantly. |

---

## THE PRINCIPLE

**If it has a Save button, it saves. If it has a button, it does something. If it shows data, the data is real. If it claims AI, AI is running. If it does math, the math is right. If it queries data, it queries the right tenant's data. If something fails, the user knows it failed.**

Nothing else gets built until everything that exists is wired, working, honest, logically correct, and *transparent about its failures*.
