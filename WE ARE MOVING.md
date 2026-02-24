# WE ARE MOVING — Master Plan

**Objective:** Wire every disconnected frontend↔backend pair across the entire system. Fix every logic bug that produces wrong results, crashes, or silently corrupts data. No new features. No new pages. No admin/billing focus. Make AI real. Make everything that exists actually work — *correctly*.

**Rules:**
- Don't build new features — finish what's already built
- Don't skip ahead — complete each sprint before starting the next
- Don't hide AI — make it functional with real logic
- Keep UI clean, don't clutter
- Admin Panel, Team Management (admin), Subscription, Billing — saved for later
- **Every calculation must be mathematically correct** — no division by zero, no NaN propagation
- **Every API call must use the right property names** — audit `as any` casts that hide wrong field access
- **Every multi-tenant query must be org-scoped** — no cross-tenant data leaks
- **Every error must be visible** — no swallowed catches, no silent failures
- **Never hide errors from the user** — no `catch(() => null)`, no `catch(() => {})`, no `console.error`-only catches. If something fails, the user must know. Show `toast.error()`, render an error banner, or trigger `isError` in React Query. Fix the root cause where possible. Fail honestly when you can't.
- **Never fake success** — no `setTimeout` + `toast.success()` without a real API call. If the backend isn't called, don't tell the user it worked.

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

## SPRINT 1 — STOP THE LIES (Days 1–2)

> *Every item here is a place where the UI says "saved" or "done" but the data is lost. These destroy user trust. Fastest fixes, highest urgency.*

### 1.1 Toast-Only Saves → Real API Saves

Each of these has a "Save" button that shows a green toast but never calls the backend.

| # | File | Button | Wire To |
|---|------|--------|---------|
| 1 | `settings/TwilioSetup.tsx` | "Save SMS Settings" | `settingsApi.updateSMSConfig()` — include charLimit, deliveryReceipts, linkShortening, optOut fields |
| 2 | `settings/TwilioSetup.tsx` | "Save Voice Settings" | `settingsApi.updateSMSConfig()` or `updateBusinessSettings()` — include recording, voicemail, forwarding, transcription |
| 3 | `settings/EmailConfiguration.tsx` | Template Settings save | `settingsApi.updateEmailConfig()` — include font, colors, logo, tracking |
| 4 | `settings/EmailConfiguration.tsx` | Delivery Settings save | `settingsApi.updateEmailConfig()` — include rateLimit, retries, bounceHandling |
| 5 | `settings/ComplianceSettings.tsx` | CCPA toggles, consent types, privacy URLs | Convert from `defaultChecked`/`defaultValue` to controlled inputs, include in `settingsApi.updateBusinessSettings()` payload |
| 6 | `settings/ServiceConfiguration.tsx` | Cache, Queue, Search, Analytics, Monitoring saves | Wire each section to `settingsApi.updateServiceConfig()` |
| 7 | `settings/ProfileSettings.tsx` | Phone, jobTitle, company, address fields | Include in `settingsApi.updateProfile()` payload (currently omitted) |

**Verify after:** Change a setting → leave page → come back → setting is still there.

### 1.2 Silent Data Loss Fixes

| # | File | Problem | Fix |
|---|------|---------|-----|
| 8 | `leads/LeadDetail.tsx` | Edit modal saves but drops customFields (address, industry, budget, website) | Add `customFields` object to the `updateData` payload in `handleSaveEdit` |
| 9 | `backend/controllers/message.controller.ts` | `makeCall()` returns mock without DB write | Add `prisma.message.create()` with type CALL before returning response |
| 10 | `communication/CommunicationInbox.tsx` | Attachments upload but aren't linked to replies | Include `_pendingAttachments` array in the `handleSendReply` API payload |
| 11 | `settings/SecuritySettings.tsx` | Session revoke/sign-out-all use `setTimeout` | Wire to real auth API endpoints or remove the simulation |

### 1.3 Build Blocker

| # | File | Problem | Fix |
|---|------|---------|-----|
| 12 | `campaigns/CampaignSchedule.tsx` | 18 TypeScript compile errors (undefined safety, type mismatches) | Add optional chaining on `campaign.recipients`, `campaign.opened`, `campaign.clicked`; cast `campaign.id` to string where needed |

### 1.4 Logic Fixes — Critical Data Integrity

| # | File | Problem | Fix | Severity |
|---|------|---------|-----|----------|
| L1 | `backend/controllers/message.controller.ts` | `markAllAsRead()` uses `(req as any).user.id` but auth middleware sets `req.user.userId` — userId is `undefined`, so ALL inbound messages across ALL orgs get marked read | Change to `(req as any).user.userId` | **CRITICAL** |
| L2 | `backend/controllers/message.controller.ts` | `markAllAsRead()` query has no `organizationId` filter — multi-tenant data leak | Add `organizationId: req.user.organizationId` to the where clause | **CRITICAL** |
| L3 | `backend/controllers/lead.controller.ts` | CSV import uses `(req as any).user!.id` instead of `.userId` — all imported leads get `assignedToId: undefined` (unassigned) | Change to `(req as any).user!.userId` | **HIGH** |
| L4 | `backend/controllers/lead.controller.ts` | CSV parser uses naive `line.split(',')` — breaks on quoted fields like `"Smith, John"`, misaligns all columns | Replace with a proper CSV parser (csv-parse or papaparse) | **HIGH** |
| L5 | `backend/controllers/lead.controller.ts` | CSV import has no email format validation — invalid emails like `"not-an-email"` imported directly | Add email regex validation before `prisma.lead.create()` | **MEDIUM** |
| L6 | `auth/Register.tsx` vs `settings/PasswordSecurityPage.tsx` | Registration allows 6-char passwords, password change requires 8-char — users can register but can't change to same-length password | Align both to 8-character minimum | **LOW** |

### 1.5 Error Swallowing Fixes — Sprint 1 Scope

| # | File | Problem | Fix |
|---|------|---------|-----|
| E1 | `settings/SecuritySettings.tsx` | `setTimeout` + `toast.success()` for session revoke, sign-out-all, and account deletion — no API calls, always shows success | Wire to real API or remove with `toast.info('Not yet implemented')` — never fake success |
| E2 | `billing/BillingPage.tsx` | `handleDownloadInvoice` uses `setTimeout` + `toast.success('Invoice downloaded')` — no file is actually downloaded | Wire to real download endpoint, or disable button with honest tooltip |
| E3 | `billing/BillingPage.tsx` | `handleCancelSubscription` shows `confirm()` then `toast.success('Subscription cancellation scheduled')` — no API call | Wire to real cancellation API, or remove with honest disabled state |

**Sprint 1 Definition of Done:** Zero toast-only saves remain. Zero silent data loss. Zero cross-tenant data leaks. All `user.id` → `user.userId` mismatches fixed. Zero fake `setTimeout` success toasts. Production build (`tsc && vite build`) passes.

---

## SPRINT 2 — WIRE THE EASY WINS (Days 3–4)

> *Every item here has frontend UI AND backend endpoints that just need to be connected. No new UI, no new endpoints.*

### 2.1 Notifications (the biggest quick win)

| # | Task | Details |
|---|------|---------|
| 13 | Replace mock data with API call | In `NotificationsPage.tsx`, replace hardcoded `mockNotifications` with `useQuery` calling `notificationsApi.getNotifications()` |
| 14 | Wire mark-read | Change local state `markAsRead` to call `notificationsApi.markAsRead(id)` |
| 15 | Wire mark-all-read | Call `notificationsApi.markAllAsRead()` |
| 16 | Wire delete | Call `notificationsApi.deleteNotification(id)` |
| 17 | Add polling | Add `refetchInterval: 30000` to the useQuery for background updates |

### 2.2 One-Line Wires

| # | File | Wire | Details |
|---|------|------|---------|
| 18 | `communication/SMSCenter.tsx` | Template onClick | Add `onClick` to template cards that inserts template text into compose textarea |
| 19 | `communication/CommunicationInbox.tsx` | Forward | Replace `toast.success('coming soon')` in `handleForward` with `messagesApi.sendEmail()` using forwarded content |
| 20 | `communication/CommunicationInbox.tsx` | Server-side search | Pass search query to `messagesApi.getMessages({ search })` instead of client-side filter |
| 21 | `settings/GoogleIntegration.tsx` | Connected account info | Read email/date from `getIntegrationStatus()` response instead of hardcoded strings |
| 22 | `dashboard/Dashboard.tsx` | Wire filters | Pass `filterSource`, `filterStatus`, `filterPriority` values into useQuery params |
| 23 | `settings/TeamManagement.tsx` | Search input | Add `onChange` handler to search input, filter members client-side |
| 24 | `settings/SecuritySettings.tsx` | Hardcoded values | Read security score, last password change, backup codes from API response instead of hardcoded |

### 2.3 BulkActionsBar & Filter Data Integrity

| # | Task | Details |
|---|------|---------|
| 25 | Dynamic filter options | In `AdvancedFilters.tsx`, fetch `usersApi.getTeamMembers()` for assigned-to options, `tagsApi.getTags()` for tag options. Replace hardcoded arrays. |
| 26 | Wire all filter params to API | In `LeadsList.tsx`, pass `scoreRange`, `dateRange`, `tags`, `assignedTo` from filter state into the `leadsApi.getLeads()` params (backend already accepts `minScore`, `maxScore`, `startDate`, `endDate`, `tags`, `assignedTo`) |
| 27 | Fix BulkActionsBar value passing | Ensure status/assignTo dropdown selections in the bar pass selected values to the callback functions |

### 2.4 Logic Fixes — Dashboard & Inbox Correctness

| # | File | Problem | Fix | Severity |
|---|------|---------|-----|----------|
| L7 | `dashboard/Dashboard.tsx` | Progress calculations use `undefined / target` → `NaN`; rescued by `\|\| 0` but fragile and hides real errors | Use nullish coalescing `(value ?? 0)` before division; add explicit `totalLeads > 0` guards | **MEDIUM** |
| L8 | `analytics/AnalyticsDashboard.tsx` | `Math.round((value / totalLeads) * 100)` — division by zero when totalLeads = 0 → `NaN` or `Infinity` in channel chart | Guard: `totalLeads > 0 ? Math.round(...) : 0` | **MEDIUM** |
| L9 | `analytics/AnalyticsDashboard.tsx` | All four API calls have `.catch(() => ({ data: null }))` — if server is down, dashboard shows all zeros with no error indication | Track error state; show error banner when API calls fail | **MEDIUM** |
| L10 | `communication/CommunicationInbox.tsx` | `useEffect` syncing `threadsData` references `selectedThread` but doesn't include it in dependency array → stale closure, wrong thread may be selected after data refresh | Add `selectedThread?.id` to the dependency array | **MEDIUM** |

### 2.5 Error Swallowing Fixes — Sprint 2 Scope

| # | File | Problem | Fix |
|---|------|---------|-----|
| E4 | `analytics/AnalyticsDashboard.tsx` | Four `.catch(() => ({ data: null }))` calls — server down = all zeros, no error indication | Remove `.catch()` wrappers; let `useQuery` handle errors natively; add `isError` check with error banner |
| E5 | `analytics/CampaignAnalytics.tsx` | Three `.catch(() => ({ data: null }))` — same pattern, same problem | Same fix — remove catches, surface errors |
| E6 | `analytics/LeadAnalytics.tsx` | `.catch(() => ({ data: null }))` — silently returns empty | Remove catch, add error state |
| E7 | `tasks/TasksPage.tsx` | `queryFn` catches error and returns `null` — `isError` never triggers, user sees blank list | Re-throw the error so React Query enters error state |

**Sprint 2 Definition of Done:** Notifications live from backend. All one-line wires connected. Filters send real params and show real options. Zero division-by-zero bugs in dashboard/analytics. Zero swallowed errors in analytics pages.

---

## SPRINT 3 — TASKS, CALENDAR, NOTES (Days 5–7)

> *Features that need a small UI addition (modal) to surface existing backend capability.*

### 3.1 Tasks — Complete the Module

| # | Task | Details |
|---|------|---------|
| 28 | Build task creation modal | Replace `window.prompt()` with an AlertDialog modal containing: title (required), description (textarea), dueDate (date picker), priority (select: low/medium/high/urgent), assignedTo (team member dropdown from API). Wire to `tasksApi.createTask()` with all fields. |
| 29 | Build task edit modal | Same modal, pre-populated with existing task data. Wire to `tasksApi.updateTask()`. Add "Edit" button to each task row. |
| 30 | Fix "Due Today" filter | Replace `task.dueDate === 'Today'` with proper date comparison: `new Date(task.dueDate).toDateString() === new Date().toDateString()` |
| 31 | Wire "More" filter button | Either add a dropdown with additional filters (priority, assignee) or remove the button |

### 3.2 Calendar — Make It Real

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
| 40 | Note editing on LeadDetail | Add edit icon on each note → inline edit or modal. Wire to `notesApi.updateNote()`. |
| 41 | Note deletion on LeadDetail | Add delete icon on each note → confirmation → `notesApi.deleteNote()` |
| 42 | Follow-up editing | Add edit button on follow-up cards → modal with all fields. Wire to `activitiesApi.updateActivity()`. |
| 43 | Follow-up deletion | Add delete button → confirmation → `activitiesApi.deleteActivity()` |
| 44 | Follow-up priority persistence | Include priority field in `activitiesApi.createActivity()` payload |

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
| L13 | `campaigns/CampaignCreate.tsx` | `useEffect` depends on `searchParams` which returns a new object reference every render in some React Router versions → potential infinite re-render loop | Use `searchParams.toString()` or `searchParams.get('type')` as dependency instead | **MEDIUM** |

### 3.6 Error Swallowing Fixes — Sprint 3 Scope

| # | File | Problem | Fix |
|---|------|---------|-----|
| E8 | `campaigns/CampaignDetail.tsx` | Two `catch { return null }` blocks in queryFns — campaign detail silently shows empty if API fails | Re-throw so `useQuery` enters error state; show error message |
| E9 | `campaigns/CampaignEdit.tsx` | `catch { }` empty block — edit save failure is invisible | Add `toast.error('Failed to update campaign')` in catch |
| E10 | `campaigns/SMSCampaigns.tsx` | Three `catch { }` empty blocks — SMS send/schedule failures are invisible | Add `toast.error()` for each operation failure |
| E11 | `settings/EmailConfiguration.tsx` | `setTimeout` + `toast.success('DNS records verified')` — no real DNS check | Wire to real verification endpoint or remove with honest message |

**Sprint 3 Definition of Done:** Tasks have a real creation/edit modal. Calendar supports create/edit/delete events across month/week/day views. Notes and follow-ups have full CRUD. Tags persist to database. Zero null-crash bugs in tasks. Zero infinite loop risks. Zero empty catch blocks in campaigns.

---

## SPRINT 4 — COMMUNICATION COMPLETENESS (Days 8–9)

> *Make the inbox a real communication center, not a send-only view.*

### 4.1 Email Templates in Inbox

| # | Task | Details |
|---|------|---------|
| 47 | Add "Insert Template" to compose modal | Add a template selector dropdown in inbox compose that loads from `templatesApi.getEmailTemplates()`. Selecting a template populates subject + body fields. |

### 4.2 LeadHistory Scoping

| # | Task | Details |
|---|------|---------|
| 48 | Per-lead history filtering | Accept optional `leadId` param (from URL or prop). When present, pass to `activitiesApi.getActivities({ leadId })`. Add lead selector dropdown for manual filtering. |

### 4.3 Inbox Improvements

| # | Task | Details |
|---|------|---------|
| 49 | Server-side pagination | Pass `page`/`limit` params to `messagesApi.getMessages()`. Add "Load more" or infinite scroll in thread list. |
| 50 | Pin → dedicated field | Either add a `pinned` field to Message model + endpoint, or clearly rename "Pin" to "Star" in UI to match the actual API behavior |

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

## SPRINT 5 — AI BECOMES REAL (Days 10–13)

> *Every AI feature that currently shows disabled buttons or synthetic data gets real logic. No faking. No hiding.*

### 5.1 Lead Scoring Configuration

| # | Task | Details |
|---|------|---------|
| 54 | Backend: Scoring config endpoint | Add GET/PUT `/api/ai/scoring-config` that reads/writes weight factors from `leadScoring.service.ts` (engagement weight, demographic weight, behavior weight, timing weight). Store in DB (new `ScoringConfig` model or in `BusinessSettings`). |
| 55 | Frontend: Scoring config UI | Enable the "Configure Model" button on `LeadScoring.tsx`. Build a panel with weight sliders (0-100) for each scoring factor. Show how changing weights would affect example leads. Save via new endpoint. |
| 56 | Wire recalculate to use custom config | When "Recalculate Scores" runs, pull the saved weight config and apply it |

### 5.2 Predictive Analytics — Real Data

| # | Task | Details |
|---|------|---------|
| 57 | Backend: Real prediction endpoint | Add GET `/api/ai/predictions` that pulls from actual DB data: historical lead conversion rates (by month), pipeline velocity (avg days per stage), deal value trends. Calculate projections using rolling averages and linear regression on real data. |
| 58 | Frontend: Wire PredictiveAnalytics.tsx | Replace synthetic `dataPoints * accuracy` formula with real prediction data from new endpoint. Show actual conversion rate trend with forward projection. Show pipeline velocity with forecast. |
| 59 | Enable "Details" button | Build a detail modal per prediction showing: data points used, confidence range (based on sample size), contributing factors, historical accuracy |

### 5.3 Model Training → Model Recalibration

| # | Task | Details |
|---|------|---------|
| 60 | Backend: Recalibration job endpoint | Add POST `/api/ai/recalibrate` that triggers `ml-optimization.service.ts` optimization run. Store job status (started, running, completed, failed) in DB. Add GET `/api/ai/recalibration-status` for polling. |
| 61 | Frontend: Wire ModelTraining.tsx | Remove "Coming Soon" banner. Wire "Retrain" buttons to POST recalibration. Poll for job status. Show real before/after metrics (old accuracy vs new accuracy from DB). Display actual training timestamps. |

### 5.4 AI Hub Recommendations → Actionable

| # | Task | Details |
|---|------|---------|
| 62 | Wire "Take Action" buttons | Based on recommendation type: "Follow up with lead" → create task via `tasksApi.createTask()`. "Send email" → open compose with pre-filled content via AI. "Update status" → call `leadsApi.updateLead()`. Reuse the same function-call logic the AI chatbot already uses. |
| 63 | Intelligence Insights "Take Action" | Same pattern — execute the suggested action based on insight type |
| 64 | Intelligence Insights "Apply Optimizations" | Wire to `intelligenceService.optimizeScoring()` (already exists) + show results |

### 5.5 Prediction Factor Breakdown

| # | Task | Details |
|---|------|---------|
| 65 | Backend: Factor explanation endpoint | Add GET `/api/ai/lead/:id/score-factors` that returns the breakdown of why a lead has its score (which behaviors, demographics, engagement metrics contributed). Data already tracked in scoring service. |
| 66 | Frontend: Factor breakdown UI | Add a detail panel/modal accessible from lead cards showing score factor visualization (bar chart or list with weights) |

### 5.6 Logic Fixes — AI Calculation Correctness

| # | File | Problem | Fix | Severity |
|---|------|---------|-----|----------|
| L15 | `backend/services/leadScoring.service.ts` | `SCORE_WEIGHTS.EMAIL_OPEN * (weights.activityWeight / 0.3)` — if `weights.activityWeight` is `undefined` (schema evolution, corrupted config), `undefined / 0.3` → `NaN` propagates through entire score | Add defaults: `(weights.activityWeight ?? 0.3)` for all weight access | **MEDIUM** |
| L16 | `backend/services/leadScoring.service.ts` | Frequency calculation uses `daysSinceLastActivity` for `weeksSinceOldestActivity` — a lead active 2 days ago but spanning 90 days gets frequency inflated by 45x | Use actual span from oldest to newest activity for the denominator | **MEDIUM** |
| L17 | `backend/controllers/ai.controller.ts` | `getFeatureImportance` returns hardcoded static weights (`Email Engagement: 28`, `Response Time: 22`) regardless of actual model | Calculate from real `SCORE_WEIGHTS` or training data | **MEDIUM** |
| L18 | `ai/ModelTraining.tsx` | `Math.random()` used in render to compute `trainLoss`/`valLoss` — values flicker every re-render, formula `1 - accuracy * 0.01` is nonsensical | Use `useMemo` with stable computation, or fetch real metrics from API | **MEDIUM** |
| L19 | `backend/services/leadScoring.service.ts` | `EMAIL_OPT_OUT: -50` penalty is never scaled by custom weights — all other weights are scaled by user factors but opt-out stays hardcoded | Either scale proportionally or document as intentionally constant | **LOW** |

### 5.7 Error Swallowing Fixes — Sprint 5 Scope

| # | File | Problem | Fix |
|---|------|---------|-----|
| E12 | `ai/AIHub.tsx` | Eight `.catch(() => ({ data: ... }))` calls — falls back to mock data or empty arrays on failure, user never knows AI is broken | Remove catch wrappers; let errors propagate; show "AI services unavailable" banner when API fails |
| E13 | `ai/IntelligenceInsights.tsx` | Four `.catch(() => null)` / `.catch(() => ({ insights: [] }))` — insights page shows empty instead of error | Remove catches; add error state rendering |
| E14 | `ai/LeadScoring.tsx` | Two `catch { }` empty blocks — scoring recalculation failures are invisible | Add `toast.error('Failed to recalculate scores')` |

**Sprint 5 Definition of Done:** Lead scoring is configurable with real weights. Predictive analytics shows actual trend projections from real data. Model recalibration triggers real jobs with real metrics. All "Take Action" buttons execute real actions. Score explanations visible per lead. Zero NaN-producing weight calculations. Feature importance reflects real model. Zero silent AI failures.

---

## SPRINT 6 — SYSTEM INTEGRITY (Days 14–15)

> *Cross-cutting concerns that affect reliability and data quality.*

### 6.1 Error Boundaries

| # | Task | Details |
|---|------|---------|
| 67 | Add PageErrorBoundary to unprotected routes | Wrap Communication, Workflows, Settings, Billing, Help, Integrations routes in `<PageErrorBoundary>` — same pattern already used by Leads, Campaigns, AI, Analytics |

### 6.2 Reports & Analytics Persistence

| # | Task | Details |
|---|------|---------|
| 68 | Backend: Saved reports model + CRUD | Add Prisma model `SavedReport { id, name, config, userId, organizationId, createdAt, updatedAt }`. Add GET/POST/PUT/DELETE on `/api/reports`. |
| 69 | Frontend: Wire ReportBuilder save/load | Replace localStorage save with `apiClient.post('/reports')`. Load saved reports from API. |
| 70 | Wire CustomReports "Generate Report" | Connect metric/groupBy selections to actual `analyticsApi` calls. Render real chart/table results instead of showing toast. |
| 71 | Wire "Run Report" on saved reports | Load saved config, execute API calls, display results |
| 72 | Implement PDF export | Use jsPDF or html2canvas for analytics pages that currently show toast on "Export PDF" |

### 6.3 Real-Time Polling

| # | Task | Details |
|---|------|---------|
| 73 | Inbox polling | Add `refetchInterval: 30000` to inbox messages query |
| 74 | Dashboard polling | Add `refetchInterval: 60000` to dashboard stats queries |
| 75 | Notification badge polling | Add a lightweight notification count query with `refetchInterval: 30000` in the main layout sidebar/header |

### 6.4 Compliance & Security Cleanup

| # | Task | Details |
|---|------|---------|
| 76 | ComplianceSettings badges | Make compliance badges reflect actual setting state (green when enabled, red when disabled) instead of always green |
| 77 | ComplianceSettings audit logs | Wire to `activitiesApi.getActivities({ type: 'compliance' })` or create dedicated endpoint. Replace hardcoded log entries. |
| 78 | SecuritySettings security score | Calculate from actual state: has 2FA (+25), recent password change (+25), active sessions <3 (+25), strong password policy (+25) |

### 6.5 Logic Fixes — Analytics & Reporting Correctness

| # | File | Problem | Fix | Severity |
|---|------|---------|-----|----------|
| L20 | `analytics/ConversionReports.tsx` | Per-source conversion rates calculated by applying the global average to each source — every source shows the same rate, which is wrong | Fetch or compute per-source conversion counts from backend; don't distribute total proportionally | **HIGH** |
| L21 | `backend/controllers/analytics.controller.ts` | Conversion funnel stage-to-stage rate can exceed 100% (50 Qualified / 30 Contacted = 167%) because leads can skip stages | Cap at 100% with `Math.min(rate, 100)`, or use cumulative funnel logic | **MEDIUM** |
| L22 | `backend/controllers/admin.controller.ts` | System health dashboard returns hardcoded `apiResponseTime: 142`, `uptime: '99.98%'`, `errorRate: '0.02%'` — all fake | Query from actual monitoring infrastructure or compute from recent request metrics | **MEDIUM** |

### 6.6 Error Swallowing Fixes — Sprint 6 Scope

| # | File | Problem | Fix |
|---|------|---------|-----|
| E15 | `analytics/ConversionReports.tsx` | Two `.catch(console.error → return null)` + one `catch { }` — conversion page shows empty on failure | Remove catches; add error state |
| E16 | `analytics/CustomReports.tsx` | Three `.catch(console.error → return null)` + one `catch { }` — custom reports fail silently | Remove catches; add error state |
| E17 | `analytics/ReportBuilder.tsx` | Three `.catch(console.error → return null)` — report builder data fails silently | Remove catches; add error state |
| E18 | `analytics/UsageAnalytics.tsx` | Two `.catch(console.error → return null)` — usage analytics fails silently | Remove catches; add error state |
| E19 | `backend/services/workflow.service.ts` | `.catch(err => console.error(...))` — scheduled workflow actions fail silently, no retry, no notification | Add retry logic; log to DB; create notification on repeated failure |

**Sprint 6 Definition of Done:** All routes have error boundaries. Reports persist to backend. Real-time polling active. Compliance/security data reflects reality. Analytics calculations are mathematically correct. No rates exceeding 100%. Zero `console.error`-only catches in analytics. All error paths surface to the user.

---

## SPRINT 7 — INBOUND COMMUNICATION (Days 16–18)

> *The architectural work that transforms the inbox from send-only to a real communication hub.*

### 7.1 Inbound Email

| # | Task | Details |
|---|------|---------|
| 79 | Backend: SendGrid Inbound Parse webhook | Add POST `/api/webhooks/sendgrid/inbound` route. Parse incoming email (from, to, subject, body, attachments). Match sender email to existing lead. Create `Message` record with type EMAIL, direction INBOUND. |
| 80 | Frontend: Display inbound emails | Already handled — inbox fetches from `getMessages()` which returns all messages. Inbound emails will appear automatically once stored. Add visual indicator for inbound vs outbound direction. |

### 7.2 Inbound SMS

| # | Task | Details |
|---|------|---------|
| 81 | Backend: Twilio inbound SMS webhook | Add POST `/api/webhooks/twilio/inbound` route. Parse incoming SMS (From, Body). Match phone to existing lead. Create `Message` record with type SMS, direction INBOUND. |
| 82 | Frontend: Display inbound SMS | Same as email — already handled by existing message fetch. Add direction indicator. |

### 7.3 Auto-Notification on Inbound

| # | Task | Details |
|---|------|---------|
| 83 | Create notification on inbound message | In both webhook handlers, also create a `Notification` record ("New email from John Smith", "New SMS from 555-1234"). Frontend notification polling (from Sprint 6) picks it up automatically. |

**Sprint 7 Definition of Done:** Users receive emails and SMS in their inbox. Inbound messages create notifications. The inbox is now a true two-way communication center.

---

## PROGRESS TRACKER

| Sprint | Focus | Wiring Items | Logic Fixes | Error Fixes | Status |
|--------|-------|-------------|----------------|--------|
| **Sprint 1** | Stop the lies | #1–12 | L1–L6 | E1–E3 | ⬜ Not Started |
| **Sprint 2** | Easy wires | #13–27 | L7–L10 | E4–E7 | ⬜ Not Started |
| **Sprint 3** | Tasks, Calendar, Notes | #28–46 | L11–L13 | E8–E11 | ⬜ Not Started |
| **Sprint 4** | Communication completeness | #47–53 | L14 | — | ⬜ Not Started |
| **Sprint 5** | AI becomes real | #54–66 | L15–L19 | E12–E14 | ⬜ Not Started |
| **Sprint 6** | System integrity | #67–78 | L20–L22 | E15–E19 | ⬜ Not Started |
| **Sprint 7** | Inbound communication | #79–83 | — | — | ⬜ Not Started |

**Total: 83 wiring items + 22 logic fixes + 19 error-swallowing fixes = 124 items across 7 sprints (~18 working days)**

### Logic Fix Severity Summary

| Severity | Count | Examples |
|----------|-------|----------|
| **CRITICAL** | 2 | Multi-tenant data leak in markAllAsRead, wrong userId property |
| **HIGH** | 6 | CSV parser breaks on commas, null crash in tasks, wrong conversion rates |
| **MEDIUM** | 12 | Division by zero, NaN propagation, swallowed errors, stale closures |
| **LOW** | 2 | Inconsistent password policy, unscaled opt-out weight |

### Error Swallowing Summary

| Pattern | Count | Where |
|---------|-------|-------|
| `.catch(() => null/{ data: null })` | 22 instances | Analytics (4 pages), AI Hub, Intelligence, Tasks, Campaigns |
| `catch { }` empty blocks | 11 instances | Campaigns, Lead Scoring, Leads, CallCenter |
| `console.error` only (no user notification) | 11 instances | Analytics (4 pages), Workflow service |
| `setTimeout` + fake `toast.success()` | 8 instances | Security, Billing, Email Config, Admin |
| **Total swallowed errors found** | **52 instances** | Across 20+ files |

---

## WHAT WE'RE NOT TOUCHING (FOR NOW)

- Admin Panel, Team Management (admin tab), Subscription page, Billing module
- Social Media Dashboard (Coming Soon feature)
- Newsletter Management (Coming Soon feature)  
- Phone Campaigns / Twilio Voice calling (Coming Soon feature)
- WYSIWYG email editor (enhancement, not wiring)
- Workflow branching (enhancement, not wiring)
- Integrations Hub pages (static shells — real integrations live in Settings)
- DemoDataGenerator (not a user-facing feature)
- Mobile responsiveness
- i18n / localization

---

## THE PRINCIPLE

**If it has a Save button, it saves. If it has a button, it does something. If it shows data, the data is real. If it claims AI, AI is running. If it does math, the math is right. If it queries data, it queries the right tenant's data. If something fails, the user knows it failed.**

Nothing else gets built until everything that exists is wired, working, honest, logically correct, and *transparent about its failures*.
