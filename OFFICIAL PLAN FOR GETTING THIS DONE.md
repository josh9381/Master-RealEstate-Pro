# OFFICIAL PLAN FOR GETTING THIS DONE

**Created:** February 21, 2026
**Source:** WE_ARE_GETTING_THIS_DONE.md (full audit)
**Approach:** Logical dependency order — fix foundations before building on top, stop lying before adding features, connect existing code before writing new code.

---

## How This Plan Is Organized

Every phase depends on the one before it. You can't wire frontend to backend analytics if the backend is returning garbage. You can't show users a "mock mode" banner if the mock mode itself crashes. You can't build onboarding if 7 pages are unreachable. The order exists for a reason.

Each task has:
- **What:** Plain description of the change
- **Where:** Exact file(s) to touch
- **Why now:** Why it belongs in this phase
- **Time:** Honest estimate

**Total estimated time across all phases: ~15–18 working days**

---

## Phase 1: Stop Lying (Day 1)

_Remove everything that shows fake data as real. A user looking at the app after this phase should see real numbers or nothing — never made-up numbers presented as truth._

**Why first:** Everything else we build is pointless if users can't trust what they see. Random numbers, hardcoded alerts, and fabricated stats are actively harmful.

| # | What | Where | Time |
|---|------|-------|------|
| 1.1 | Remove `Math.random()` conversion rates from ConversionReports — call the existing `getConversionFunnel()` endpoint instead | `src/pages/analytics/ConversionReports.tsx` | 30 min |
| 1.2 | ⚠️ **DECISION 1 REQUIRED** — Remove `Math.random()` predictions from PredictiveAnalytics — either connect to `intelligenceService.getAnalyticsTrends()` or replace with "No prediction data yet" empty state. **See Decision 1 below.** | `src/pages/ai/PredictiveAnalytics.tsx` | 1 hr |
| 1.3 | ⚠️ **DECISION 2 REQUIRED** — Remove hardcoded LeadScoring stat cards ("94.2% accuracy", "1,247 leads scored", "342 high-quality") — wire to real queries or empty state? **See Decision 2 below.** | `src/pages/ai/LeadScoring.tsx` | 1 hr |
| 1.4 | ⚠️ **DECISION 4 REQUIRED** — Remove hardcoded Dashboard alerts ("3 leads haven't been contacted", "Q4 Product Launch campaign exceeded targets") — remove entirely or show placeholder? **See Decision 4 below.** | `src/pages/dashboard/Dashboard.tsx` (~L655-L680) | 20 min |
| 1.5 | Fix hardcoded "19% Overall" conversion funnel badge — replace with actual `{conversionData.overallConversionRate}%` | `src/pages/dashboard/Dashboard.tsx` (~L399) | 5 min |
| 1.6 | Remove hardcoded CampaignDetail charts — device breakdown (38/49/13%), geographic data (CA/TX/NY/FL/IL), hourly engagement (bell curve), performance timeline (6-day ramp) — replace with "Analytics available when campaign tracking is configured" empty state (we'll wire real data in Phase 4) | `src/pages/campaigns/CampaignDetail.tsx` | 30 min |
| 1.7 | Remove fake ModelTraining training job ("Churn Prediction Model - Epoch 15/20" at 75%) — show "No training jobs" empty state | `src/pages/ai/ModelTraining.tsx` (~L167-L217) | 15 min |
| 1.8 | Remove hardcoded stats from SMSCenter ("Sent Today: 156", "Delivery Rate: 98.4%") — replace with real message counts from API or zeros | `src/pages/communication/SMSCenter.tsx` | 15 min |
| 1.9 | Remove hardcoded stats from CallCenter ("Calls Today: 47", "Avg Duration: 9m 42s") — replace with real counts or zeros | `src/pages/communication/CallCenter.tsx` | 15 min |
| 1.10 | Remove hardcoded stats from NewsletterManagement ("Total Subscribers: 24,567", "Newsletters Sent: 89") | `src/pages/communication/NewsletterManagement.tsx` | 15 min |
| 1.11 | Remove hardcoded stats from EmailTemplatesLibrary ("Total Templates: 48") — use real count from API | `src/pages/communication/EmailTemplatesLibrary.tsx` | 10 min |
| 1.12 | Remove hardcoded workflow performance metrics ("1,463 executions", "97.3%") from WorkflowBuilder | `src/pages/workflows/WorkflowBuilder.tsx` | 10 min |
| 1.13 | Remove hardcoded Recent Executions from AutomationRules | `src/pages/workflows/AutomationRules.tsx` | 10 min |
| 1.14 | Remove hardcoded SocialMediaDashboard stats ("Total Posts: 145", "Engagement: 23.5K", platform follower counts) | `src/pages/communication/SocialMediaDashboard.tsx` | 15 min |
| 1.15 | Fix LeadAnalytics "Top Performers" label — says "Team members" but shows leads | `src/pages/analytics/LeadAnalytics.tsx` | 5 min |
| 1.16 | Remove duplicate "Avg Lead Score" KPI card in LeadAnalytics | `src/pages/analytics/LeadAnalytics.tsx` | 5 min |
| 1.17 | ⚠️ **DECISION 3 REQUIRED** — Fix hardcoded `+1.2% vs last period` in CampaignAnalytics — remove entirely or hide until real data? **See Decision 3 below.** | `src/pages/analytics/CampaignAnalytics.tsx` | 5 min |
| 1.18 | Remove hardcoded `99.9% Uptime` from AIAnalytics | `src/pages/ai/AIAnalytics.tsx` | 5 min |
| 1.19 | Remove hardcoded "Forecast" (`totalRevenue * 0.25`) from AnalyticsDashboard Pipeline Health | `src/pages/analytics/AnalyticsDashboard.tsx` (~L270) | 5 min |

**Phase 1 total: ~5 hours**

After this phase: Every number the user sees is either real or honestly marked as unavailable. Zero fabrication.

---

## Phase 2: Fix the Foundation (Day 2)

_Fix backend bugs that would cause crashes, data corruption, or duplicate sends. These are the bugs that must be resolved before any API key is added or any real traffic flows through the system._

**Why second:** The backend is the plumbing. Everything — campaigns, communications, workflows, analytics — flows through these services. If the plumbing leaks, nothing downstream works right.

| # | What | Where | Time |
|---|------|-------|------|
| 2.1 | Fix `mockEmailSend()` — add `organizationId` to `createMessageRecord()` call (currently missing, causes Prisma crash) | `backend/src/services/email.service.ts` (~L345) | 5 min |
| 2.2 | Fix `mockSMSSend()` — same missing `organizationId` bug | `backend/src/services/sms.service.ts` (~L300) | 5 min |
| 2.3 | Fix campaign executor — pass `campaign.organizationId` to `sendBulkEmails()` and `sendBulkSMS()` (currently defaults to hardcoded fake ID `clz0000000000000000000000`) | `backend/src/services/campaign-executor.service.ts` | 15 min |
| 2.4 | Fix campaign executor — change `lead.user` to `lead.assignedTo` so agent names actually appear in campaign emails instead of always showing "Team" | `backend/src/services/campaign-executor.service.ts` (~L218) | 5 min |
| 2.5 | Fix campaign scheduler concurrency — set status to `SENDING` before calling `executeCampaign()` to prevent duplicate sends when execution takes >1 minute | `backend/src/services/campaign-scheduler.service.ts` | 15 min |
| 2.6 | Fix `MASTER_ENCRYPTION_KEY` — generate proper 64-char hex key (currently 32 chars, per-user credential decryption fails) | `backend/.env` | 2 min |
| 2.7 | Fix LeadCreate tags bug — add `tags: formData.tags` to the submit payload so tags actually get saved | `src/pages/leads/LeadCreate.tsx` (~L82) | 5 min |
| 2.8 | Fix merge API field mismatch — change frontend to send `{ primaryLeadId, secondaryLeadIds: [secondaryLeadId] }` (array, matching backend expectation) | `src/lib/api.ts` (mergeLeads function) | 5 min |
| 2.9 | Fix template variable syntax — change UI hint from `{firstName}` to `{{lead.firstName}}` to match backend Handlebars engine | `src/pages/campaigns/CampaignCreate.tsx` (~L527) | 10 min |
| 2.10 | Fix AutomationRules delete — add confirmation dialog before deleting workflows (currently deletes immediately with no undo) | `src/pages/workflows/AutomationRules.tsx` (~L141-L150) | 15 min |
| 2.11 | Fix AutomationRules sort — state changes but array is never actually sorted | `src/pages/workflows/AutomationRules.tsx` | 15 min |
| 2.12 | Fix CustomReports duplicate `<CardContent>` layout bug | `src/pages/analytics/CustomReports.tsx` (~L98-L104) | 5 min |

**Phase 2 total: ~2 hours**

After this phase: The backend is safe to use. Adding API keys won't cause crashes, duplicate sends, or orphaned records. Frontend data bugs are fixed.

---

## Phase 3: Make Things Reachable (Day 2–3)

_Add navigation to orphaned pages, remove fake feature labels, and honestly gate features that don't exist yet. Users should be able to find everything that works and not be misled by things that don't._

**Why third:** Can't improve pages nobody can find. Can't build user trust if fake features are still advertised as real.

| # | What | Where | Time |
|---|------|-------|------|
| 3.1 | **Create CampaignsSubNav component** — mirror `LeadsSubNav.tsx` with tabs: All, Templates, Schedule, Reports, Email, SMS, A/B Testing. This unblocks 7 orphaned pages. | Create `src/components/campaigns/CampaignsSubNav.tsx`, add to all 8 campaign pages | 1 hr |
| 3.2 | Remove stale "Coming soon" label from EmailCampaigns scheduled count — scheduling already works | `src/pages/campaigns/EmailCampaigns.tsx` (~L100) | 2 min |
| 3.3 | ⚠️ **DECISION 8 REQUIRED** — Fix "Export for Excel" label — relabel as "CSV" or add UTF-8 BOM for real Excel compatibility? **See Decision 8 below.** | `src/pages/leads/LeadsExport.tsx` (~L152) | 10 min |
| 3.4 | Fix CampaignSchedule "last 7 days" label — code doesn't filter by date, change to "Recently completed" | `src/pages/campaigns/CampaignSchedule.tsx` (~L358) | 5 min |
| 3.5 | ⚠️ **DECISION 5 REQUIRED** — Phone Campaigns: label "Coming Soon" or remove entirely? **See Decision 5 below.** If keeping: add badge and disclaimer to all 3 cards, disable interactive elements, add badge to CampaignCreate type selector. | `src/pages/campaigns/PhoneCampaigns.tsx`, `src/pages/campaigns/CampaignCreate.tsx` | 30 min |
| 3.6 | Label Social Media campaign type as "Coming Soon" — add badge to Social Media option in CampaignCreate step 1 type selector, disable selection with tooltip "Social media campaigns are coming soon" | `src/pages/campaigns/CampaignCreate.tsx` | 10 min |
| 3.7 | ⚠️ **DECISION 6 REQUIRED** — SocialMediaDashboard: label "Coming Soon" or remove entirely? **See Decision 6 below.** If keeping: add banner, disable buttons, replace hardcoded stats with placeholders. | `src/pages/communication/SocialMediaDashboard.tsx` | 15 min |
| 3.8 | ⚠️ **DECISION 6 REQUIRED** — NewsletterManagement: label "Coming Soon" or remove entirely? **See Decision 6 below.** If keeping: add banner, disable buttons, replace hardcoded stats with placeholders. | `src/pages/communication/NewsletterManagement.tsx` | 15 min |
| 3.9 | ⚠️ **DECISION 7 REQUIRED** — ModelTraining: label "Coming Soon" or remove entirely? **See Decision 7 below.** If keeping: add badge to AIHub card and banner on page, disable interactive elements. | `src/pages/ai/AIHub.tsx`, `src/pages/ai/ModelTraining.tsx` | 10 min |
| 3.10 | ⚠️ **DECISION 7 REQUIRED** — Segmentation: label "Coming Soon" or remove entirely? **See Decision 7 below.** If keeping: add badge to AIHub card and banner on page, disable dead buttons. | `src/pages/ai/AIHub.tsx`, `src/pages/ai/Segmentation.tsx` | 10 min |
| 3.11 | Add "Mock Mode" banner — when `SENDGRID_API_KEY` or `TWILIO_*` are missing, show a yellow warning banner on campaign pages and communication inbox: "Email/SMS is in demo mode. Messages are logged but not delivered. Add API keys in Settings to send real messages." | Campaign pages, CommunicationInbox, backend status endpoint | 45 min |
| 3.12 | Add AI graceful degradation — when OpenAI calls fail, disable AI buttons with tooltip "Configure OpenAI API key in Settings to enable AI features" instead of crashing | `src/pages/leads/LeadDetail.tsx`, `src/pages/campaigns/CampaignCreate.tsx`, any AI button locations | 1 hr |
| 3.13 | Label "Auto-Merged" stat in LeadsMerge as "Coming Soon" — always shows 0, no auto-merge feature exists. Add "Coming Soon" tooltip. | `src/pages/leads/LeadsMerge.tsx` (~L212) | 5 min |

**Phase 3 total: ~4.5 hours**

After this phase: Every feature the user can reach either actually works or is clearly labeled "Coming Soon." No more dead ends, silently broken buttons, or fake feature advertisements. Pages stay visible so users know what's on the roadmap.

---

## Phase 4: Connect Existing Code (Days 3–5)

_Wire frontend pages to backend endpoints that already exist but are never called. This is the highest-value phase — lots of functionality unlocked with minimal new code because the backend is already built._

**Why fourth:** Now that the foundation is solid, pages are reachable, and lies are removed, we connect real data to real UI. This is where the app starts feeling real.

### 4A: Dashboard Wiring

| # | What | Where | Time |
|---|------|-------|------|
| 4.1 | Wire Dashboard date range filter to all API calls — pass `startDate`/`endDate` to `analytics/dashboard`, `analytics/leads`, `analytics/campaigns`, `conversion-funnel`, `activity-feed`, `tasks`. Backend already accepts these params. | `src/pages/dashboard/Dashboard.tsx` | 4 hrs |
| 4.2 | Fix Dashboard Refresh button — make it refetch ALL queries, not just stats | `src/pages/dashboard/Dashboard.tsx` | 30 min |
| 4.3 | Make Dashboard task checkboxes functional — add `onChange` handler that calls task update API | `src/pages/dashboard/Dashboard.tsx` (~L593) | 1 hr |

### 4B: Campaign Analytics Wiring

| # | What | Where | Time |
|---|------|-------|------|
| 4.4 | Wire CampaignDetail to real analytics — replace the empty-state charts (from Phase 1) with calls to `GET /api/campaigns/:id/analytics`. Backend already returns device, geographic, hourly, and timeline data when real tracking events exist. | `src/pages/campaigns/CampaignDetail.tsx` | 2 hrs |
| 4.5 | Wire CampaignReports to real analytics — replace fabricated `bounced = sent - delivered` with real data from backend | `src/pages/campaigns/CampaignReports.tsx` | 1 hr |

### 4C: Workflow Action Wiring

| # | What | Where | Time |
|---|------|-------|------|
| 4.6 | Wire workflow `SEND_EMAIL` action to `emailService.sendEmail()` — replace `console.log('Sending email...')` with actual email service call | `backend/src/services/workflow.service.ts` | 1 hr |
| 4.7 | Wire workflow `SEND_SMS` action to `smsService.sendSMS()` — same as above for SMS | `backend/src/services/workflow.service.ts` | 1 hr |

### 4D: Communications Wiring

| # | What | Where | Time |
|---|------|-------|------|
| 4.8 | Wire SMSCenter Quick Send form — bind inputs to state and call `messagesApi.sendSMS()` on submit (API already works) | `src/pages/communication/SMSCenter.tsx` | 1 hr |
| 4.9 | Wire EmailTemplatesLibrary CRUD buttons — connect Create, Preview, Use, Edit, Delete to existing template API | `src/pages/communication/EmailTemplatesLibrary.tsx` | 4 hrs |

### 4E: Analytics Wiring

| # | What | Where | Time |
|---|------|-------|------|
| 4.10 | Add date range picker as shared component for all analytics pages — backend already supports `startDate`/`endDate` on every endpoint | Create shared `DateRangePicker` component, add to all 7 analytics pages | 3 hrs |

**Phase 4 total: ~2.5 days**

After this phase: Dashboard date filter works. Campaign analytics show real data when tracking is active. Workflows actually send emails and SMS. SMS Center can send messages. Templates can be managed. Analytics can be filtered by time.

---

## ⚠️ Phase 4 Corrections — What the Plan Got Wrong

_Discovered during Phase 4 implementation. These inaccuracies affected task estimates and must be documented._

| Task | What the plan claimed | What actually exists | Impact |
|------|----------------------|---------------------|--------|
| 4.1 | "Backend already accepts `startDate`/`endDate`" for activity-feed and tasks | `getActivityFeed` accepts only `limit` and `page`. `getTasks` accepts `page`, `limit`, `status`, `priority`, `assignedToId`, `leadId`, `overdue`, `search`, `sortBy`, `sortOrder`. **Neither accepts date params.** | Must add date filtering to both endpoints before the Dashboard date picker can pass dates to them. Adds ~1 hr backend work. |
| 4.4 | "Backend already returns device, geographic, hourly, and timeline data when real tracking events exist" | `campaignAnalytics.service.ts` has 9 methods. **NONE return device breakdown, geographic data, or hourly engagement.** Only `getCampaignTimeSeries()` exists (daily time series). The route `GET /api/campaigns/:id/analytics` returns basic rate metrics only. | Device breakdown, geographic data, and hourly engagement must be built from scratch in Phase 5. These were incorrectly categorized as "wiring" when they are actually "new infrastructure." |
| 4.1 | `getTaskAnalytics` supports date filtering | `getTaskAnalytics` in analytics.controller.ts does **NOT** accept `startDate`/`endDate`. Only `getDashboardStats`, `getLeadAnalytics`, `getCampaignAnalytics`, and `getConversionFunnel` do. | Must add date filtering to `getTaskAnalytics` if Dashboard date picker should affect task stats. |

---

## Phase 5: Build Missing Infrastructure (Days 6–9)

_Create new backend endpoints and services that don't exist yet but are needed to make the frontend meaningful. This is actual new code, not just wiring._

**Why fifth:** Now that everything existing is connected and working, we build the pieces that are genuinely missing to complete the core loops.

**Code audit context (from Phase 4 backend audit):**

What the analytics backend actually has today:
- `getDashboardStats` — overview counts, leads by status, campaign performance aggregates, task counts, recent activities. Accepts startDate/endDate.
- `getLeadAnalytics` — total, byStatus, bySource, conversionRate, averageScore, topLeads (with `value` field). Accepts startDate/endDate.
- `getCampaignAnalytics` (analytics controller) — total, byType, byStatus, performance aggregates, topCampaigns (with `revenue`). Accepts startDate/endDate.
- `getTaskAnalytics` — total, byStatus, byPriority, completedToday, dueToday, overdue, completionRate. **No date filtering.**
- `getActivityFeed` — paginated activities. **No date filtering.**
- `getConversionFunnel` — funnel stages with stage-to-stage conversion rates. Accepts startDate/endDate.
- `getCampaignTimeSeries` (in campaignAnalytics.service.ts) — daily time series for a single campaign (sent/opened/clicked/converted by day). Already exposed at `GET /api/campaigns/:id/analytics/timeline`.

What does NOT exist and must be built:
- Monthly aggregate data across all campaigns (Performance Trend chart)
- Hourly engagement breakdown (Best Time to Send chart)
- Device/geographic breakdown (these require data not currently tracked — see note)
- Team performance query (per-user lead conversions and activity counts)
- Revenue timeline endpoint
- Shared export service
- Message starred/archived/snoozedUntil persistence
- Dashboard real-time alerts

### 5A: Analytics Backend Expansion

| # | What | Where | Time |
|---|------|-------|------|
| 5.1 | Add `monthlyData` endpoint — aggregate campaign sent/opened/clicked/converted by month across all org campaigns. Uses `prisma.campaign.groupBy` with date truncation or raw SQL `DATE_TRUNC`. Unlocks "Performance Trend" chart on CampaignAnalytics page. | Add `getMonthlyPerformance` to `backend/src/controllers/analytics.controller.ts`, add route to `analytics.routes.ts` | 3 hrs |
| 5.2 | Add `hourlyStats` endpoint — aggregate Activity records by hour-of-day for EMAIL_OPENED/EMAIL_CLICKED events across org campaigns. Unlocks "Best Time to Send" chart. **Note:** This only works when email tracking events exist (from SendGrid webhooks or manual tracking calls). | Add `getHourlyEngagement` to `backend/src/controllers/analytics.controller.ts`, add route to `analytics.routes.ts` | 2 hrs |
| 5.3 | ~~Add `dailyStats` to campaign analytics API~~ **ALREADY EXISTS** as `getCampaignTimeSeries()` in `campaignAnalytics.service.ts`, exposed at `GET /api/campaigns/:id/analytics/timeline`. Wire frontend to use this existing endpoint instead of building a new one. | Wire `CampaignDetail.tsx` and `CampaignReports.tsx` to `GET /api/campaigns/:id/analytics/timeline` | 1 hr |
| 5.4 | Add team performance query — `prisma.lead.groupBy({ by: ['assignedToId'] })` filtered by status='WON', plus `prisma.activity.groupBy({ by: ['userId'] })` for activity counts. Join with User records for names/avatars. Unlocks Dashboard "Team Performance" section. | Add `getTeamPerformance` to `backend/src/controllers/analytics.controller.ts`, add route | 3 hrs |
| 5.5 | ⚠️ **DECISION 9 REQUIRED** — Revenue chart: build real endpoint or remove chart? **See Decision 9 below.** Lead model has `value: Float?` and Campaign model has `revenue`/`spent` fields — building a revenue-timeline endpoint is feasible by aggregating `Lead.value` by `createdAt` month + `Campaign.revenue` by `createdAt` month. | `backend/src/controllers/analytics.controller.ts` or remove from `src/pages/dashboard/Dashboard.tsx` | 4 hrs or 15 min |
| 5.6 | Add `startDate`/`endDate` support to `getActivityFeed` and `getTaskAnalytics` — currently these two endpoints ignore date range params. Add `createdAt` date filter to the Prisma `where` clause, matching the pattern already used by `getDashboardStats`. Also add date filtering to `getTasks` controller. | `backend/src/controllers/analytics.controller.ts` (getActivityFeed ~L310, getTaskAnalytics ~L255), `backend/src/controllers/task.controller.ts` | 1 hr |
| 5.7 | **Device/geographic breakdown — DEFERRED.** These require tracking data that doesn't exist in the schema. Campaign activities don't record user-agent or IP/location. Building this requires: (a) adding IP/UA capture to email open tracking pixel or SendGrid webhook processing, (b) a GeoIP lookup service, (c) UA parsing library. **Recommend deferring to Phase 8 or removing the charts entirely.** | N/A — decision required | 0 (deferred) |

### 5B: Export Service

| # | What | Where | Time |
|---|------|-------|------|
| 5.8 | Build shared export service — generate CSV from any data array with configurable column mapping. Some frontend pages already have inline CSV generation (e.g., `CampaignsList.tsx` `handleExportCSV`). Consolidate into a single reusable utility. Wire to every "Export" button across Analytics, Communications, Campaigns, and Workflows (~10-12 buttons). | Create `src/lib/exportService.ts`, refactor existing inline exports, wire to remaining buttons | 1 day |

### 5C: Inbox Persistence

| # | What | Where | Time |
|---|------|-------|------|
| 5.9 | Persist inbox star/archive/snooze — add `starred Boolean @default(false)`, `archived Boolean @default(false)`, `snoozedUntil DateTime?` fields to Message model (Prisma migration). Add PATCH endpoint for these fields. Wire the existing CommunicationInbox UI handlers (currently local state only) to real API calls. | `backend/prisma/schema.prisma` (Message model at L255), `backend/src/routes/message.routes.ts`, `src/pages/communication/CommunicationInbox.tsx` | 3 hrs |

### 5D: Stale Lead Detection & Dashboard Alerts

| # | What | Where | Time |
|---|------|-------|------|
| 5.10 | Build real Dashboard alerts endpoint — query leads with no activity in 7+ days (`intelligenceService.generateInsights` already identifies at-risk leads, but returns them as part of a larger response — extract and expose as a lightweight endpoint). Also query: campaigns with below-average open rates, tasks overdue, follow-ups due today. Replace the section removed in Phase 1 with real data. | `backend/src/controllers/analytics.controller.ts` (new `getDashboardAlerts`), `src/pages/dashboard/Dashboard.tsx` | 4 hrs |

### 5E: Wire SendGrid Webhooks to Campaign Analytics

| # | What | Where | Time |
|---|------|-------|------|
| 5.11 | **Connect existing SendGrid webhook to campaign analytics tracking.** The webhook handler at `POST /api/webhooks/sendgrid` already exists and processes delivered/open/click/bounce/spamreport events, updating Message records. BUT it does NOT: (a) create Activity records, (b) call `trackEmailOpen`/`trackEmailClick`/`trackConversion` from `campaignAnalytics.service.ts`, (c) update Campaign counters. Wire the webhook handler to call these tracking functions when a message has a `campaignId` (look up via Activity or Message metadata). This makes campaign analytics populate automatically from real email events. | `backend/src/routes/webhook.routes.ts` (SendGrid handler at ~L165), `backend/src/services/campaignAnalytics.service.ts` | 4 hrs |

**Phase 5 total: ~3.5 days** (reduced from 4 days — dailyStats already exists, SendGrid webhook base already exists)

After this phase: Analytics have real time-series and monthly data. Hourly engagement is available. Team performance is queryable. Export works everywhere. Inbox organization persists. Dashboard shows real, actionable alerts. SendGrid email events automatically feed campaign analytics.

---

## Phase 6: Onboarding & Empty States (Days 9–11)

_Build the experience for new users who have zero data. This is the single biggest activation improvement._

**Why sixth:** Only now does it make sense to build onboarding — because now when we guide users to try features, those features actually work. Onboarding into broken features would be worse than no onboarding.

| # | What | Where | Time |
|---|------|-------|------|
| 6.1 | Build Dashboard "Getting Started" wizard — detect when user has 0 leads AND 0 campaigns. Show a 3-step guide: (a) Import or add your first lead → (b) Create and send your first campaign → (c) Review results. Dismiss permanently once completed. | `src/pages/dashboard/Dashboard.tsx`, new `src/components/onboarding/GettingStarted.tsx` | 1 day |
| 6.2 | Add empty-state illustrations and CTAs to Leads list — "No leads yet. Import your contacts or add your first lead." with prominent buttons | `src/pages/leads/LeadsList.tsx` | 2 hrs |
| 6.3 | Add empty-state to Analytics pages — "Add leads and send campaigns to see your analytics here." instead of blank charts | All analytics pages | 2 hrs |
| 6.4 | Add empty-state to Workflows list — already has a decent one ("No workflows yet"), verify the quick-start template cards work end-to-end | `src/pages/workflows/WorkflowsList.tsx` | 1 hr |
| 6.5 | Add tooltips/help text for unexplained metrics — Lead Score (what it means, how to improve), Conversion Rate, Pipeline stages | Various pages | 2 hrs |

**Phase 6 total: ~2 days**

After this phase: A first-time user with zero data gets clear guidance on what to do, and every step they're guided to actually works.

---

## Phase 7: Structural Cleanup (Days 11–14)

_Consolidate overlapping systems, remove dead code, and unify patterns. This improves maintainability and sets up for future feature development._

**Why seventh:** The app is now functional and honest. Time to clean up the technical debt so future work is faster.

**Code audit context (from Phase 4 backend audit):**

Workflow services — 4 files, 2104 lines:
- `workflow.service.ts` (796 lines) — main service with action execution
- `workflow-executor.service.ts` (490 lines) — class `WorkflowExecutorService`
- `workflowExecutor.service.ts` (563 lines) — SECOND class-based executor with different implementation
- `workflow-trigger.service.ts` (255 lines) — trigger evaluation (separate concern, keep)

AI services — 2 files with heavy overlap:
- `ai.service.ts` (531 lines) — 16 exported functions, ~10 return empty/zero/mock data. Real functions: `calculateLeadScore`, `getDataQuality`, `enhanceMessage`, `suggestActions`.
- `intelligence.service.ts` (475 lines) — 4 real ML-style methods: `predictLeadConversion`, `analyzeLeadEngagement`, `suggestNextAction`, `generateInsights`. All produce real analysis from DB data.
- AI routes (`ai.routes.ts`) has 30+ endpoints, many pointing to dead ai.service functions.

| # | What | Where | Time |
|---|------|-------|------|
| 7.1 | Consolidate 3 workflow execution engines into 1 — `workflow.service.ts` (796 lines), `workflow-executor.service.ts` (490 lines), and `workflowExecutor.service.ts` (563 lines) have overlapping action execution logic. Merge into single service. Keep `workflow-trigger.service.ts` (255 lines) separate as it handles a distinct concern (trigger evaluation). Update all imports. | `backend/src/services/workflow*.ts` | 1 day |
| 7.2 | Consolidate AI services — migrate the 4 real functions from `ai.service.ts` (`calculateLeadScore`, `getDataQuality`, `enhanceMessage`, `suggestActions`) into `intelligence.service.ts`. Remove the ~12 dead `ai.service.ts` functions that return empty arrays/zeros (`getAIStats`, `getAIFeatures`, `getModelPerformance`, `getTrainingModels`, `getInsights`, `getRecommendations`, `getInsightById`, `dismissInsight`, `recalculateAllScores`, `getFeatureImportance`, `uploadTrainingData`, `getPredictions`). Update AI Hub pages to use `intelligenceService` directly. Prune dead routes from `ai.routes.ts` (currently 30+ routes, ~20 are dead). | `backend/src/utils/ai.service.ts`, `backend/src/services/intelligence.service.ts`, `backend/src/routes/ai.routes.ts`, `backend/src/controllers/ai.controller.ts`, AI Hub frontend pages | 2 days |
| 7.3 | Fix AutomationRules create modal — currently hardcodes trigger to "Lead Created" and action to "Send Email". Allow real trigger/action/condition selection from the create modal. | `src/pages/workflows/AutomationRules.tsx` | 3 hrs |
| 7.4 | Clean up dead buttons across remaining AI Hub pages — either wire them to real endpoints or remove them. Target the 22 identified dead buttons (Configure Model, View Details, Create Segment, etc.) | Various AI Hub pages | 3 hrs |
| 7.5 | ⚠️ **DECISION 10 REQUIRED** — For each "Coming Soon" page, decide: keep or remove? **See Decision 10 below.** SocialMediaDashboard, NewsletterManagement, ModelTraining, Segmentation, PhoneCampaigns, CallCenter. | Sidebar component, route config, AI Hub nav | 2 hrs |
| 7.6 | ⚠️ **DECISION 11 REQUIRED** — Campaign types: remove Phone/Social Media from selector entirely or keep as disabled? **See Decision 11 below.** | `src/pages/campaigns/CampaignCreate.tsx` | 15 min |

**Phase 7 total: ~4.5 days**

After this phase: Codebase is cleaner, one workflow engine instead of three, one AI service layer, no dead buttons remaining. Any "Coming Soon" pages with no development path are now removed.

---

## Phase 8: Advanced Features (Days 14–18+)

_Build genuinely new capabilities that don't exist yet. These are the "nice to have" features that make the product competitive._

**Why last:** These require the most effort and have the least urgency. The app is fully functional by this point — these are enhancements, not fixes.

**Code audit context (from Phase 4 backend audit):**
- SendGrid webhook handler already exists at `POST /api/webhooks/sendgrid` — was wired to campaign analytics in Phase 5.11, so 8.9 is now redundant.
- Campaign time series (daily) already exists via `getCampaignTimeSeries()` — exposed at `GET /api/campaigns/:id/analytics/timeline`.
- Lead model has `value: Float?` field. Campaign model has `revenue`/`spent`/`roi` fields. Revenue data is available.
- Device breakdown / geographic data requires schema changes + new tracking infrastructure (see note on 8.9 below).

| # | What | Where | Time |
|---|------|-------|------|
| 8.1 | Unify A/B Testing — remove standalone `/campaigns/ab-testing` page. Integrate A/B variant editor into campaign create/edit flow. Update `campaign-executor.service.ts` with actual 50/50 audience splitting logic. Wire results to campaign detail page. | `src/pages/campaigns/ABTesting.tsx`, `CampaignCreate.tsx`, `campaign-executor.service.ts`, `CampaignDetail.tsx` | 3–5 days |
| 8.2 | Build real-time campaign execution feedback — show queued → sending (X/Y) → completed with progress bar. WebSocket or polling. Mock-mode indicator visible. | New campaign status component, backend WebSocket or polling endpoint | 2–3 days |
| 8.3 | Build real customer segmentation (rule-based) — create/save segments with filter criteria, view segment members, use segments as campaign audiences | New segmentation service, `src/pages/ai/Segmentation.tsx` rebuild | 3 days |
| 8.4 | Implement job queue for workflow delays — replace `setTimeout`/comments with Bull/BullMQ for proper delay handling and retry logic | `backend/src/services/workflow.service.ts`, new queue setup | 2 days |
| 8.5 | Add conditional branching to workflow builder — if/else paths based on lead properties or action outcomes | `src/pages/workflows/WorkflowBuilder.tsx`, backend executor | 2 days |
| 8.6 | Build Report Builder with real drag-and-drop — currently has `draggable` attribute but no `onDrop` handler | `src/pages/analytics/ReportBuilder.tsx` | 5 days |
| 8.7 | Build time-in-stage metrics for pipeline — track how long leads stay in each Kanban column | Backend pipeline analytics, `src/pages/leads/LeadsPipeline.tsx` | 1 day |
| 8.8 | Server-side export for large datasets — `.xlsx` generation with proper formatting | Backend export service | 2 days |
| 8.9 | ~~Real email tracking via SendGrid webhooks~~  **DONE in Phase 5.11.** Remaining work: Add device/geographic tracking — capture User-Agent and IP from SendGrid webhook event data (SendGrid includes `useragent` and `ip` fields in open/click events). Add UA parsing library (e.g., `ua-parser-js`) and GeoIP lookup (e.g., `geoip-lite`). Store parsed device type and country/region on Activity metadata. Build aggregation queries for device breakdown and geographic charts. | `backend/src/routes/webhook.routes.ts`, new `backend/src/utils/geoip.ts`, new `backend/src/utils/useragent.ts`, analytics controller | 1.5 days |
| 8.10 | Add drill-down navigation from analytics charts to detail views | Analytics pages | 2 days |
| 8.11 | ~~Build team performance analytics query~~ **DONE in Phase 5.4.** Remove from Phase 8. | N/A | 0 |

**Phase 8 total: ~4+ days (pick and choose based on priorities — 8.9 and 8.11 already completed in Phase 5)**

---

## Dependency Map

```
Phase 1 (Stop Lying)
    └── Phase 2 (Fix Foundation)
           ├── Phase 3 (Make Reachable)
           │      └── Phase 4 (Connect Existing)
           │             └── Phase 5 (Build Infrastructure)
           │                    └── Phase 6 (Onboarding)
           └── Phase 7 (Structural Cleanup) ← can start after Phase 4
                  └── Phase 8 (Advanced Features)
```

- **Phases 1–6 are sequential** — each depends on the one before it
- **Phase 7 can start in parallel** with Phases 5–6 if you have a second developer
- **Phase 8 items are independent** — can be done in any order after Phase 7

---

## ALL Decision Points — DO NOT SKIP

Every decision below **must** be answered by the human before the AI implements the related task. The AI must not guess on any of these.

---

### BEFORE PHASE 1 (answer these before starting)

#### Decision 1: PredictiveAnalytics data source (Task 1.2)
- [ ] **Decided**
Plan says "either connect to `intelligenceService.getAnalyticsTrends()` **or** replace with 'No prediction data yet' empty state."
- **Option A:** Wire to intelligence service (more work, may still return empty data)
- **Option B:** Replace with "No prediction data yet" empty state (faster, honest)
- **Your answer:** ___

#### Decision 2: LeadScoring real data (Task 1.3)
- [ ] **Decided**
Plan says replace hardcoded stats with real `prisma.lead.count()` queries and `intelligenceService.getScoringModel()` accuracy.
- **Option A:** Wire to real backend queries (shows real zeros/counts — honest but may look empty)
- **Option B:** Replace with empty state like "No scoring data yet" (simpler, cleaner for new users)
- **Your answer:** ___

#### Decision 3: CampaignAnalytics "+1.2% vs last period" (Task 1.17)
- [ ] **Decided**
- **Option A:** Remove the comparison text entirely (delete from UI)
- **Option B:** Hide it (keep code, don't render until real comparison data exists)
- **Your answer:** ___

#### Decision 4: Dashboard alerts gap (Tasks 1.4 → 5.8)
- [ ] **Decided**
Phase 1 removes fake alerts. Phase 5 builds real ones. In between (~Days 1–7), that section is empty/hidden.
- **Option A:** Remove the section entirely until Phase 5 rebuilds it with real data
- **Option B:** Show a placeholder like "Alerts coming soon" or "No alerts yet"
- **Your answer:** ___

---

### BEFORE PHASE 3 (answer these before starting Phase 3)

#### Decision 5: Phone Campaigns / Call Center (Tasks 3.5, 7.5)
- [ ] **Decided**
Zero voice telephony code exists.
- **Option A:** Label as "Coming Soon" now, keep pages visible to show the roadmap
- **Option B:** Remove pages entirely now (saves work in Phase 3 and Phase 7)
- **Your answer:** ___

#### Decision 6: Social Media / Newsletter (Tasks 3.7, 3.8, 7.5)
- [ ] **Decided**
Both pages are 100% fiction — all stats are hardcoded, no backend exists.
- **Option A:** Label as "Coming Soon" now, keep pages in sidebar with clear banners
- **Option B:** Remove pages entirely now (saves work in Phase 3 and Phase 7)
- **Your answer:** ___

#### Decision 7: PredictiveAnalytics / ModelTraining / Segmentation (Tasks 3.9, 3.10, 7.5)
- [ ] **Decided**
Three AI Hub pages are complete fiction.
- **Option A:** Label as "Coming Soon" now, build real segmentation later (Phase 8.3)
- **Option B:** Remove some or all now — specify which to keep and which to remove
- **Your answer:** ___

#### Decision 8: Export format (Task 3.3)
- [ ] **Decided**
"Export for Excel" is just CSV — the label is misleading.
- **Option A:** Relabel honestly as "Export CSV"
- **Option B:** Add UTF-8 BOM so it actually opens correctly in Excel (keep the "Excel" label, it'll be true)
- **Your answer:** ___

---

### BEFORE PHASE 5 (answer these before starting Phase 5)

#### Decision 9: Revenue Chart (Task 5.5)
- [ ] **Decided**
The Dashboard has an always-empty "Revenue & Leads Trend" chart.
- **Option A:** Build a `GET /api/analytics/revenue-timeline` endpoint that aggregates lead `value` fields by month (~4 hrs)
- **Option B:** Remove the chart entirely (~15 min)
- **Your answer:** ___

---

### BEFORE PHASE 7 (answer these before starting Phase 7)

#### Decision 10: "Coming Soon" pages — keep or remove? (Task 7.5)
- [ ] **Decided**
For each page, decide: keep it (has a real development path) or remove it (no backend coming).
- **SocialMediaDashboard:** keep / remove — ___
- **NewsletterManagement:** keep / remove — ___
- **ModelTraining:** keep / remove — ___
- **Segmentation:** keep / remove — ___
- **PhoneCampaigns:** keep / remove — ___
- **CallCenter:** keep / remove — ___

#### Decision 11: Campaign types in CampaignCreate (Task 7.6)
- [ ] **Decided**
If Phone and Social Media have no backend after all prior phases:
- **Option A:** Remove them from the type selector entirely
- **Option B:** Keep them as disabled/Coming Soon options to show the roadmap
- **Your answer:** ___

---

### BEFORE PHASE 8 (answer these before starting Phase 8)

#### Decision 12: Which Phase 8 items do you actually want?
- [ ] **Decided**
Phase 8 has 11 optional items. Check the ones you want built:
- [ ] 8.1 — A/B Testing unification (3–5 days)
- [ ] 8.2 — Real-time campaign execution feedback (2–3 days)
- [ ] 8.3 — Rule-based customer segmentation (3 days)
- [ ] 8.4 — Job queue for workflow delays (2 days)
- [ ] 8.5 — Conditional workflow branching (2 days)
- [ ] 8.6 — Drag-and-drop Report Builder (5 days)
- [ ] 8.7 — Time-in-stage pipeline metrics (1 day)
- [ ] 8.8 — Server-side .xlsx export (2 days)
- [ ] 8.9 — SendGrid webhook email tracking (2 days)
- [ ] 8.10 — Analytics drill-down navigation (2 days)
- [ ] 8.11 — Team performance analytics (1 day)

---

## What Happens When You Add API Keys

After completing **Phases 1–4**, the app is fully ready for real API keys:

| Key | What becomes real | Prerequisites completed in |
|-----|------------------|--------------------------|
| `OPENAI_API_KEY` *(already set)* | AI Chatbot, AI Compose, content generation, AI lead scoring, message enhancement | Phase 2 (error handling), Phase 3 (graceful degradation) |
| `SENDGRID_API_KEY` | Real email delivery from inbox + campaigns, template emails. After Phase 5.11: webhook tracking auto-populates campaign analytics | Phase 2 (mock fix, org ID, scheduler fix), Phase 4 (workflow wiring), Phase 5.11 (webhook→analytics wiring) |
| `TWILIO_ACCOUNT_SID` + `AUTH_TOKEN` + `PHONE_NUMBER` | Real SMS delivery from inbox + campaigns, delivery status tracking via existing Twilio webhook | Phase 2 (mock fix, org ID), Phase 4 (workflow + SMS Center wiring) |

**You don't need to wait for all 8 phases.** After Phase 4, adding keys will work correctly. After Phase 5, SendGrid webhooks will automatically feed campaign analytics data. Phases 6–8 add polish and new features on top of a working system.

---

## Progress Tracker

Use this to mark off tasks as you go:

```
Phase 1: Stop Lying                    [x] Complete (19 tasks)
Phase 2: Fix the Foundation            [x] Complete (12 tasks)
Phase 3: Make Things Reachable         [x] Complete (13 tasks)
Phase 4: Connect Existing Code         [x] Complete (10 tasks)
Phase 5: Build Missing Infrastructure  [ ] Complete (11 tasks — was 8, added date filtering, webhook wiring, device/geo deferral)
Phase 6: Onboarding & Empty States     [ ] Complete (5 tasks)
Phase 7: Structural Cleanup            [ ] Complete (6 tasks — added audit context to AI/workflow consolidation)
Phase 8: Advanced Features             [ ] Complete (9 remaining — 8.9 webhook + 8.11 team perf moved to Phase 5)
```

---

**Bottom line:** Phases 1–4 (about 5 days of work) take the app from "looks nice but full of lies" to "honestly shows real data and every feature actually works." That's the minimum viable honest product. Phase 5 has grown slightly (added webhook→analytics wiring and date filtering fixes that Phase 4 revealed were missing) but also shrank (dailyStats already existed, team perf and webhook tracking moved from Phase 8). Net result: Phase 5 is ~3.5 days instead of the original 3–4. Everything after Phase 5 is building on a complete, honest, data-connected foundation.
