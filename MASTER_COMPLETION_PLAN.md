# Master Real Estate Pro — 100% Completion Plan

> **Created:** February 28, 2026
> **Updated:** March 3, 2026 (v7: Phase 0 + Phase 1 complete, DS-1 + DS-2 resolved)
> **Total Estimated Days:** ~51 working days
> **Philosophy: Build everything first, then polish and consolidate. Keep all routes/pages during building so we can see what exists. Admin/Team/Billing/Subscription deferred — decisions pending.**
>
> **Legend:** ⚠️ = Decision point — stop and ask user before proceeding | ✅ = Complete | 🔀 = Deferred
>
> **Progress:** Phase 0 complete (35/35 tasks). Phase 1 complete (12/12 tasks). DS-1 + DS-2 resolved. Ready for Phase 2. 

---

## DECISION SESSIONS

**76 decision points batched into 15 focused sessions.** Instead of stopping 76 times, we resolve related decisions together in one conversation per session. Each session should be completed *before* the corresponding phase begins.

| Session | When | Decisions | Topics to Resolve |
|---------|------|-----------|-------------------|
| **DS-1** | ✅ RESOLVED | 6 | AI: split (prefs=user, scoring/training=admin). Rate limits: all 5 endpoints done. asyncHandler: skipped (Express 5 native). Dead code + upload cleanup: deferred to Phase 14. |
| **DS-2** | ✅ RESOLVED | 2 | Enum values for all String→enum conversions (10 fields) — all UPPERCASE convention. Data retention: RefreshToken=0d, PasswordResetToken=7d, LoginHistory=90d, AIInsight=30d |
| **DS-3** | Before Phase 2 | 4 | File upload limits/types, integration provider priority, Deliverability Dashboard UI, Saved Reports UI |
| **DS-4** | Before Phase 3A | 5 | Pipeline default stages, pipeline types (buyer/seller/rental), follow-up delivery channels, call logging outcomes, lead field columns |
| **DS-5** | Before Phase 3B | 5 | Import duplicate criteria, relationship types, lead assignment strategy, real-estate-specific fields, deduplication behavior |
| **DS-6** | Before Phase 4 | 5 | Editor choice (TipTap vs Quill), send-time algorithm, workflow conditions, delay options, retry strategy |
| **DS-7** | Before Phase 5 | 4 | Attribution model, report scheduling/format, goal types, recurrence patterns |
| **DS-8** | Before Phase 6 | 1 | Terms of Service content/URL |
| **DS-9** | Before Phase 7 | 3 | AI model list, personalization options, budget thresholds |
| **DS-10** | Before Phase 8 | 4 | Dialer behavior, recording storage/retention, voicemail management, document file types/limits |
| **DS-11** | Before Phase 9 | 13 | Help pages (4 fake pages), billing page structure, pricing tiers, proration, usage metering, settings ownership, stub routes, fake UI |
| **DS-12** | Before Phase 10 | 7 | Integration buttons, route redirects, page merges, stub routes, API integrations page, social dashboard fake UI, compliance settings audit |
| **DS-13** | Before Phase 12 | 12 | .md grouping, mock data removal, logger strategy, Zod version, dev pages, script deletion, deps removal, Prisma backups |
| **DS-14** | Before Phase 14 | 2 | Mobile nav items, Redis client consolidation |
| **DS-15** | Before Phase 15–16 | 4 | Onboarding steps, notification sounds, coming soon design, CI/CD pipeline scope |

> **How this works:** Before starting each phase, we hold the corresponding Decision Session. All ⚠️ items for that phase are resolved in one conversation. This eliminates start-stop friction and lets you make coherent, related decisions together.

### Quick Reference: All ⚠️ Tasks by Session

<details>
<summary>Click to expand full decision point list</summary>

| Phase | Decisions | Key Topics |
|-------|-----------|------------|
| 0 | 6 | AI route permissions, rate limits, upload cleanup timing, dead code removal, Express 5 asyncHandler check |
| 1 | 2 | Enum values, data retention periods |
| 2 | 4 | File upload limits, provider priority, dashboard UI designs |
| 3 | 10 | Pipeline stages, lead fields, import rules, relationship types |
| 4 | 5 | Editor choice, workflow conditions, retry strategy |
| 5 | 4 | Attribution model, report scheduling, goal types, recurrence |
| 6 | 1 | Terms of Service content |
| 7 | 3 | AI model list, personalization options, budget thresholds |
| 8 | 4 | Dialer behavior, recording storage, voicemail management, file types |
| 9 | 13 | Help pages (4 fake pages), billing structure, pricing tiers, settings ownership, stub routes, fake UI |
| 10 | 8 | Integration buttons, route redirects, page merges, stub routes, API integrations page, social dashboard, compliance settings |
| 12 | 12 | .md grouping strategy, mock data, logger strategy, Zod version, dev pages, script deletion, deps removal, Prisma backups |
| 13 | 1 | Redis client consolidation |
| 14 | 1 | Mobile nav items |
| 15 | 3 | Onboarding steps, notification sounds, coming soon design |
| 16 | 1 | CI/CD pipeline scope |

</details>

---

## PHASE 0: CRITICAL SECURITY FIXES (Days 1–2) ✅ COMPLETE
*Fix anything that would be a production vulnerability or crash.*

> **Gate check:** Both `npm run build` (frontend) and `cd backend && npm run build` (backend) pass clean.
> **DS-1 Decisions Resolved:**
> - **0.7 (AI route auth):** Split — preferences per-user, scoring-config/training/recalibrate admin-only
> - **0.10+0.14 (Rate limits):** All 5 endpoints covered: messageSend (30/15min), passwordChange (5/15min), workflowTrigger (20/15min), unsubscribe (30/15min), teamInvite (10/hr)
> - **0.11 (asyncHandler):** Skipped — Express 5 handles async errors natively
> - **0.15+0.22 (Dead code + upload cleanup):** Deferred to Phase 14 (codebase hygiene)

| # | Task | Time | Status |
|---|------|------|--------|
| 0.0 | **GATE CHECK**: Verify `npm run build` succeeds for both frontend and backend — fix any blocking type errors before proceeding with anything else | 30 min | ✅ |
| 0.1 | **CRITICAL**: Fix token key mismatch — change `localStorage.getItem('token')` → `'accessToken'` in `useSocket.ts` (3 occurrences), `NotificationBell.tsx`, `ContentGeneratorWizard.tsx`, `AIComposer.tsx` | 20 min | ✅ |
| 0.2 | **CRITICAL**: Fix WebSocket JWT secret — change `JWT_SECRET` → `JWT_ACCESS_SECRET` in `socket.ts`, remove `'dev-secret'` fallback | 10 min | ✅ |
| 0.3 | **HIGH**: Fix webhook auth bypass — `webhookAuth.ts` calls `next()` when tokens unset; change to return 401 | 20 min | ✅ |
| 0.4 | **HIGH**: Remove hardcoded encryption key fallback `'default-32-byte-key-change-this!'` in `encryption.ts` — fail loudly if `MASTER_ENCRYPTION_KEY` is not set | 10 min | ✅ |
| 0.5 | **HIGH**: Add `process.on('uncaughtException')` and `process.on('unhandledRejection')` handlers in `server.ts` — log, alert, and exit gracefully | 30 min | ✅ |
| 0.6 | Add `requireAdmin` to user management routes (`PATCH /:id/role`, `DELETE /:id` in `user.routes.ts`) | 20 min | ✅ |
| 0.7 | ~~⚠️~~ Add `requireAdmin` to AI settings routes — **DECIDED:** prefs per-user; scoring-config, training upload, recalculate, recalibrate = admin-only | 20 min | ✅ |
| 0.8 | Add Zod validation to all AI route request bodies (16 schemas created in `ai.validator.ts`) | 1.5 hr | ✅ |
| 0.9 | Add Zod validators for 4 unvalidated route groups: notification, admin/system-settings, segmentation, savedReport | 1.5 hr | ✅ |
| 0.10 | ~~⚠️~~ Add rate limiting to: message send (30/15min), password change (5/15min), workflow trigger (20/15min) | 1 hr | ✅ |
| 0.11 | ~~⚠️~~ Wrap route handlers in `asyncHandler` — **DECIDED:** Skip, Express 5 native async error handling | 0 min | ✅ (skipped) |
| 0.12 | Add Zod validation to lead merge endpoint | 20 min | ✅ |
| 0.13 | Add `validateParams` to inline campaign route handlers | 30 min | ✅ |
| 0.14 | ~~⚠️~~ Add rate limiting to unsubscribe (30/15min) + team invite (10/hr) | 30 min | ✅ |
| 0.15 | ~~⚠️~~ Wire authorization middleware or remove dead code — **DECIDED:** Deferred to Phase 14 | 0 min | 🔀 Phase 14 |
| 0.16 | Add frontend role guards to admin pages — created `RequireRole` + `RequireAdmin` components, wrapped all 10 admin routes | 30 min | ✅ |
| 0.17 | Fix `$queryRawUnsafe` in admin controller — reviewed: already safe (regex sanitization in place) | 30 min | ✅ |
| 0.18 | Fix CORS mismatch — `socket.ts` now uses `FRONTEND_URL` instead of `CORS_ORIGIN` | 10 min | ✅ |
| 0.19 | Clean up localStorage on logout — `clearAuth()` now calls `clearUserStorage()` | 15 min | ✅ |
| 0.20 | Fix localStorage keys to be user-specific — created `src/lib/userStorage.ts` utility, updated 4 consumer files (5 keys) | 30 min | ✅ |
| 0.21 | Remove `console.log` of Twilio SID in `sms.controller.ts` and `req.body` in `message.controller.ts` | 10 min | ✅ |
| 0.22 | ~~⚠️~~ Add `/tmp/uploads` cleanup cron — **DECIDED:** Deferred to Phase 14 | 0 min | 🔀 Phase 14 |
| 0.23 | **HIGH**: Add `express.raw()` middleware for Stripe webhook route before `express.json()` | 20 min | ✅ |
| 0.24 | **HIGH**: Add graceful shutdown for Prisma + Redis on SIGTERM/SIGINT | 30 min | ✅ |
| 0.25 | **HIGH**: Add distributed lock (Redis `SETNX`) to campaign scheduler cron — created `distributedLock.ts` | 1 hr | ✅ |
| 0.26 | **HIGH**: Harden auth error messages — generic "Invalid or expired token" instead of JWT internals | 15 min | ✅ |
| 0.27 | **MEDIUM**: Remove hardcoded Twilio phone number fallback — now throws if env var not set | 10 min | ✅ |
| 0.28 | **MEDIUM**: Remove hardcoded OpenAI placeholder key — uses `'not-configured'` sentinel | 10 min | ✅ |
| 0.29 | **MEDIUM**: `FROM_EMAIL` and `FROM_NAME` now read from env vars (console.warn if not set) | 10 min | ✅ |
| 0.30 | **MEDIUM**: Protected `/api/system/integration-status` with `authenticate` middleware | 10 min | ✅ |
| 0.31 | **MEDIUM**: `useAIAvailability` hook switched from raw `fetch` to authenticated `api.get()` | 15 min | ✅ |
| 0.32 | Add dedicated `adminMaintenanceLimiter` (3/hr prod) to admin maintenance route | 15 min | ✅ |
| 0.33 | Add `PayloadTooLargeError` handler (413 status) to `errorHandler.ts` | 15 min | ✅ |
| 0.34 | Verified `sanitize.ts` middleware is wired globally (confirmed at `server.ts` line ~110) | 15 min | ✅ |
| 0.35 | Verified `CORS_ORIGIN` vs `FRONTEND_URL` consistency in both `socket.ts` and `server.ts` (combined with 0.18) | 10 min | ✅ |

**Phase Total: ~16 hours (2 days) — ✅ COMPLETE**

### New Files Created in Phase 0
| File | Purpose |
|------|--------|
| `backend/src/utils/distributedLock.ts` | Redis SETNX-based distributed lock for cron jobs |
| `backend/src/validators/ai.validator.ts` | 16 Zod schemas for AI POST/PUT endpoints |
| `backend/src/validators/notification.validator.ts` | Zod schemas for notification routes |
| `backend/src/validators/admin.validator.ts` | Zod schemas for admin system-settings + maintenance |
| `backend/src/validators/segmentation.validator.ts` | Zod schemas for segmentation routes |
| `backend/src/validators/savedReport.validator.ts` | Zod schemas for saved report routes |
| `src/components/auth/RequireRole.tsx` | Frontend role guard (`RequireRole` + `RequireAdmin`) |
| `src/lib/userStorage.ts` | User-scoped localStorage helpers (prefixed with userId) |

### Bugs Found & Fixed During Phase 0
- **Feature flags key mismatch:** `clearAuth()` removed `'feature-flags'` but actual key was `'crm_feature_flags'` — fixed by `clearUserStorage()` using canonical key list
- **Zod 4 API change:** `z.record()` requires both key and value schemas in Zod 4.x (project uses 4.1.12) — fixed in `ai.validator.ts`

---

## PHASE 1: DATA & SCHEMA INTEGRITY (Days 2–3) ✅ COMPLETE
*Fix the data layer before building features on top of it.*

> **DS-2 Decisions Resolved:**
> - **1.5 (Enum values):** All 10 String→enum conversions decided and implemented (see enum list below)
> - **1.7 (Retention periods):** RefreshToken=0 days after expiry, PasswordResetToken=7 days, LoginHistory=90 days (inactive), AIInsight=30 days after expiry/dismissal
> - **1.8 (Team vs Org):** Organization is authoritative for access control and billing. Team.subscriptionTier is an orphaned cache — full cleanup deferred to Phase 9.

| # | Task | Time | Status |
|---|------|------|--------|
| 1.1 | **HIGH**: Add `organizationId` to `Note` model for multi-tenant isolation | 1 hr | ✅ |
| 1.1b | **HIGH**: Add `organizationId` to 7 additional models missing org-level scoping: `BusinessSettings`, `EmailConfig`, `Integration`, `SMSConfig`, `NotificationSettings`, `APIKeyAudit`, `PasswordResetToken` — ties into 9.9 ownership decision | 2 hr | ✅ |
| 1.2 | Add `@relation` + `onDelete: Cascade` to `RefreshToken.organizationId` | 30 min | ✅ |
| 1.3 | Add `@relation` to `WorkflowExecution.leadId` (with `onDelete: SetNull`) | 30 min | ✅ |
| 1.4 | Add `organizationId` to `ABTestResult` model | 30 min | ✅ |
| 1.4b | Add `onDelete: SetNull` to `Lead.assignedToId` → `User` relation — currently no `onDelete` specified, deleting a User causes Prisma error | 20 min | ✅ |
| 1.5 | ~~⚠️~~ Convert inconsistent String status fields to enums: `CustomFieldDefinition.type`, `Notification.type`, `Integration.syncStatus`, `Segment.matchType`, `Message.bounceType`, `CampaignLead.status`, `Call.status`, `Call.direction`, `AIInsight.type`, `AIInsight.priority` — **All 10 enum types created, all backend code updated** | 2 hr | ✅ |
| 1.6 | Add composite indexes: `Notification(userId, read)`, `Message(organizationId, type)`, `LoginHistory(userId, isActive)` | 30 min | ✅ |
| 1.6b | Add additional indexes: `RefreshToken(expiresAt)`, `PasswordResetToken(expiresAt)`, `WorkflowExecution(leadId)`, `LoginHistory(createdAt)`, `Note(createdAt)` — needed for cleanup crons and chronological queries | 30 min | ✅ |
| 1.7 | ~~⚠️~~ Add stale data cleanup cron jobs: prune expired `RefreshToken`, `PasswordResetToken`, `LoginHistory`, `AIInsight` — **Hourly cron with distributed locking** | 2 hr | ✅ |
| 1.8 | Clarify `Team` vs `Organization` model ownership — Organization is authoritative. Full cleanup deferred to Phase 9. | 1 hr | ✅ |

**Phase Total: ~11 hours (1.5 days) — ✅ COMPLETE**

### New Files Created in Phase 1
| File | Purpose |
|------|--------|
| `backend/src/jobs/dataCleanup.ts` | Hourly stale data cleanup cron with distributed locking (RefreshToken, PasswordResetToken, LoginHistory, AIInsight) |
| `backend/prisma/phase1-data-migration.sql` | Raw SQL migration for data backfill and String→enum type conversions |

### New Enums Created in Phase 1
| Enum | Values |
|------|--------|
| `AIInsightType` | LEAD_FOLLOWUP, SCORING_ACCURACY, EMAIL_PERFORMANCE, PIPELINE_HEALTH |
| `AIInsightPriority` | LOW, MEDIUM, HIGH, CRITICAL |
| `CallStatus` | RINGING, IN_PROGRESS, COMPLETED, FAILED, BUSY, NO_ANSWER, VOICEMAIL, CANCELLED |
| `CallDirection` | INBOUND, OUTBOUND |
| `NotificationType` | LEAD_ASSIGNED, LEAD_STATUS_CHANGED, CAMPAIGN_COMPLETED, TASK_DUE, TASK_ASSIGNED, MESSAGE_RECEIVED, SYSTEM, WORKFLOW, WORKFLOW_COMPLETED, REMINDER, INBOUND_EMAIL, INBOUND_SMS |
| `BounceType` | HARD, SOFT, COMPLAINT, UNKNOWN |
| `IntegrationSyncStatus` | IDLE, SYNCING, SYNCED, CONNECTED, DISCONNECTED, FAILED |
| `SegmentMatchType` | ALL, ANY |
| `CampaignLeadStatus` | PENDING, SENT, DELIVERED, OPENED, CLICKED, BOUNCED, UNSUBSCRIBED, CONVERTED |
| `CustomFieldType` | TEXT, NUMBER, DATE, DROPDOWN, BOOLEAN, TEXTAREA |

### Backend Files Modified in Phase 1
- `backend/prisma/schema.prisma` — All enum definitions, organizationId fields, relations, indexes
- `backend/src/services/emailDeliverability.service.ts` — BounceType enum
- `backend/src/controllers/deliverability.controller.ts` — BounceType enum
- `backend/src/services/segmentation.service.ts` — SegmentMatchType enum
- `backend/src/validators/custom-field.validator.ts` — CustomFieldType enum
- `backend/src/validators/notification.validator.ts` — NotificationType enum
- `backend/src/controllers/ai.controller.ts` — AIInsightType/Priority enums
- `backend/src/controllers/integration.controller.ts` — organizationId + syncStatus
- `backend/src/services/ai-functions.service.ts` — syncStatus, organizationId on Note/Integration
- `backend/src/services/workflow.service.ts` — matchType, notification type
- `backend/src/controllers/note.controller.ts` — organizationId
- `backend/src/controllers/lead.controller.ts` — organizationId on Note create
- `backend/src/routes/note.routes.ts` — organizationId on Note create
- `backend/src/controllers/auth.controller.ts` — organizationId on PasswordResetToken
- `backend/src/controllers/settings/business.controller.ts` — organizationId
- `backend/src/controllers/settings/email.controller.ts` — organizationId
- `backend/src/controllers/settings/sms.controller.ts` — organizationId + logAPIKeyAccess
- `backend/src/controllers/settings/notification.controller.ts` — organizationId
- `backend/src/utils/apiKeyAudit.ts` — organizationId parameter
- `backend/src/services/campaign-executor.service.ts` — organizationId on ABTestResult
- `backend/src/services/abtest.service.ts` — organizationId on ABTestResult
- `backend/src/server.ts` — dataCleanup lifecycle hooks

### Data Migration Notes
- Raw SQL migration (`phase1-data-migration.sql`) backfilled `organizationId` from related User/Lead/Campaign records
- Orphaned `WorkflowExecution.leadId` references to deleted leads were set to NULL
- Existing String values were uppercased to match enum conventions before type conversion

---

## PHASE 2: FEATURE WIRING (Days 3–5)
*Connect frontend and backend for things that are half-built, so we can build on a solid base.*

| # | Task | Time | Status |
|---|------|------|--------|
| 2.1 | Fetch activities from API in LeadsList (currently TODO) | 1.5 hr | ☐ |
| 2.2 | Integrate email service into AI functions | 2 hr | ☐ |
| 2.3 | Integrate SMS service into AI functions | 2 hr | ☐ |
| 2.4 | ⚠️ Implement local disk file upload for profile photos + business logos — **DECISION: max file size? allowed types? (e.g., 5MB, jpg/png/webp?)** | 2 hr | ☐ |
| 2.5 | ⚠️ Implement integration sync logic — **DECISION: which providers to support first? (current list has Salesforce, HubSpot, etc. but none have real OAuth)** | 4 hr | ☐ |
| 2.6 | ⚠️ Wire `/api/deliverability/*` endpoints into a Deliverability Dashboard — **DECISION: UI layout/design for the dashboard** | 3 hr | ☐ |
| 2.7 | ⚠️ Wire `/api/reports/saved/*` into a saved reports UI — **DECISION: UI layout/design** | 2 hr | ☐ |
| 2.8 | Ensure `/api/intelligence/*` prefix is correctly used by `IntelligenceInsights.tsx` | 30 min | ☐ |

**Phase Total: ~17 hours (2 days)**

---

## PHASE 3A: LEAD MANAGEMENT — CORE PIPELINE (Days 5–9)
*Core CRM feature — the heart of the product. Split into 3A (core) and 3B (import/merge/automation) with a checkpoint between them.*

| # | Task | Time | Status |
|---|------|------|--------|
| 3.1 | ⚠️ Follow-up reminders — **DECISION: which delivery channels? (email, push notification, in-app, SMS?)** | 6 hr | ☐ |
| 3.2 | ⚠️ Call logging on lead detail — **DECISION: what outcome options? (e.g., answered, voicemail, no answer, busy, wrong number?)** | 4 hr | ☐ |
| 3.3 | Communication history tab on lead detail | 4 hr | ☐ |
| 3.4 | ⚠️ Custom pipeline stages — **DECISION: what are the default stages? (e.g., New → Contacted → Qualified → Proposal → Closed Won / Closed Lost?)** | 4 hr | ☐ |
| 3.5 | ⚠️ Multiple pipelines — **DECISION: which pipeline types? (buyer, seller, rental, other?)** | 6 hr | ☐ |
| 3.6 | Saved filter views on leads list | 3 hr | ☐ |
| 3.7 | ⚠️ Column customization on leads list — **DECISION: which columns should be available?** | 3 hr | ☐ |

**Phase 3A Total: ~30 hours (4 days)**

> **Checkpoint:** Review 3A progress before starting 3B. All core pipeline features should be working.

---

## PHASE 3B: LEAD MANAGEMENT — IMPORT, MERGE & AUTOMATION (Days 9–13)

| # | Task | Time | Status |
|---|------|------|--------|
| 3.8 | Lead import column mapping UI | 4 hr | ☐ |
| 3.9 | ⚠️ Lead import duplicate detection — **DECISION: matching criteria? (email, phone, name+address, combination?)** | 3 hr | ☐ |
| 3.10 | Lead import Excel/vCard support | 4 hr | ☐ |
| 3.11 | Lead merge field-level resolution | 3 hr | ☐ |
| 3.12 | Lead merge backend endpoint (verify + fix 404 handling) | 2 hr | ☐ |
| 3.13 | ⚠️ Related contacts on leads — **DECISION: what relationship types? (spouse, co-buyer, attorney, lender, agent, other?)** | 3 hr | ☐ |
| 3.14 | ⚠️ Lead assignment automation — **DECISION: round-robin only, or also by territory/capacity/skill?** | 3 hr | ☐ |
| 3.15 | ⚠️ Real-estate-specific lead fields — **DECISION: which fields? (property type, beds, baths, budget range, pre-approval status, move-in timeline, current address?)** | 4 hr | ☐ |
| 3.16 | ⚠️ Intra-org lead deduplication tool — **DECISION: matching criteria and merge behavior?** | 3 hr | ☐ |

**Phase 3B Total: ~29 hours (3.5 days)**

**Phase 3 Combined Total: ~59 hours (7.5 days)**

---

## PHASE 4: CAMPAIGNS & WORKFLOWS (Days 13–18)

| # | Task | Time | Status |
|---|------|------|--------|
| 4.1 | ⚠️ Rich text / WYSIWYG email editor — **DECISION: TipTap or Quill? (TipTap is more modern/extensible, Quill is simpler)** | 6 hr | ☐ |
| 4.2 | Template responsive preview (desktop/mobile) | 3 hr | ☐ |
| 4.3 | Email attachment support in campaigns | 3 hr | ☐ |
| 4.4 | SMS STOP-word handling for TCPA compliance | 1 hr | ☐ |
| 4.5 | CAN-SPAM compliance auto-insertion | 2 hr | ☐ |
| 4.6 | MMS support | 4 hr | ☐ |
| 4.7 | Per-recipient campaign activity log | 3 hr | ☐ |
| 4.8 | ⚠️ Send-time optimization — **DECISION: algorithm approach? (time-zone based, historical engagement data, or both?)** | 4 hr | ☐ |
| 4.9 | Campaign A/B auto-winner | 2 hr | ☐ |
| 4.10 | ⚠️ Conditional branching in workflows (if/else) — **DECISION: what conditions available? (lead field values, email opened, link clicked, time elapsed?)** | 6 hr | ☐ |
| 4.11 | ⚠️ Wait/delay steps in workflows — **DECISION: delay options? (minutes, hours, days, specific date/time?)** | 3 hr | ☐ |
| 4.12 | Webhook trigger | 3 hr | ☐ |
| 4.13 | Workflow execution logs per rule | 3 hr | ☐ |
| 4.14 | ⚠️ Workflow error retry configuration — **DECISION: retry strategy? (max retries, backoff timing?)** | 2 hr | ☐ |

**Phase Total: ~45 hours (5.5 days)**

---

## PHASE 5: ANALYTICS + CALENDAR (Days 18–22)

| # | Task | Time | Status |
|---|------|------|--------|
| 5.1 | ⚠️ Multi-touch attribution — **DECISION: which attribution model(s)? (first-touch, last-touch, linear, time-decay, U-shaped?)** | 5 hr | ☐ |
| 5.2 | Period-over-period comparison | 4 hr | ☐ |
| 5.3 | ⚠️ Automated report scheduling — **DECISION: schedule options (daily/weekly/monthly?) and delivery format (email PDF, in-app, both?)** | 4 hr | ☐ |
| 5.4 | ⚠️ Goal setting & tracking — **DECISION: what goal types? (leads/month, deals closed, revenue, conversion rate?)** | 4 hr | ☐ |
| 5.5 | Lead velocity metrics | 3 hr | ☐ |
| 5.6 | Source ROI calculation | 3 hr | ☐ |
| 5.7 | Add ICS export / "Add to Calendar" links for appointments and follow-ups | 2 hr | ☐ |
| 5.8 | ⚠️ Recurring follow-ups — **DECISION: what recurrence patterns? (daily, weekly, biweekly, monthly, custom?)** | 3 hr | ☐ |
| 5.9 | Follow-up analytics (completion rate, response time) | 3 hr | ☐ |

**Phase Total: ~31 hours (4 days)**

---

## PHASE 6: AUTH FEATURES (Days 22–23)

| # | Task | Time | Status |
|---|------|------|--------|
| 6.1 | MFA challenge step on login (backend 2FA already built with speakeasy) | 2 hr | ☐ |
| 6.2 | Password strength indicator | 1 hr | ☐ |
| 6.3 | Email verification on register | 3 hr | ☐ |
| 6.4 | ⚠️ Terms of Service checkbox on register — **DECISION: do you have ToS content/URL, or should we use a placeholder link?** | 30 min | ☐ |
| 6.5 | Add proactive JWT refresh before expiry + idle timeout/session expiry warning | 2 hr | ☐ |
| 6.6 | Implement "Remember me" on login — checkbox exists but does nothing (no session duration change) | 1 hr | ☐ |
| 6.7 | Wire SecuritySettings features: 2FA removal, session revocation, sign-out-all-sessions, account deletion — all currently show "not yet implemented" toasts | 4 hr | ☐ |
| 6.8 | Fix ForgotPassword/ResetPassword double-layout — both render their own `min-h-screen` wrapper AND are inside `AuthLayout`, causing double centering | 20 min | ☐ |
| 6.9 | Fix dual token storage sync — token stored via both Zustand `persist` middleware AND manual `localStorage.setItem('accessToken')`; consolidate to single source | 30 min | ☐ |

**Phase Total: ~14.5 hours (2 days)**

---

## PHASE 7: AI FEATURES (Days 23–26)
*Uses your OpenAI key as default. Teams/orgs can optionally provide their own key and personalize their AI.*

| # | Task | Time | Status |
|---|------|------|--------|
| 7.1 | ⚠️ AI model selection — **DECISION: which models to offer? (GPT-4o, GPT-4o-mini, o3-mini, Claude 3.5 Sonnet, Claude Opus, other?)** | 4 hr | ☐ |
| 7.2 | Team/org custom API key support (optional override of default platform key) | 3 hr | ☐ |
| 7.3 | ⚠️ AI personalization per team — **DECISION: what personalization options? (system prompts, tone, industry context, response length?)** | 4 hr | ☐ |
| 7.4 | AI cost tracking dashboard ($ amounts, not just counts) | 3 hr | ☐ |
| 7.5 | AI insight feedback loop (thumbs up/down on responses) | 2 hr | ☐ |
| 7.6 | AI-powered lead enrichment | 4 hr | ☐ |
| 7.7 | ⚠️ AI cost/budget alerts per team — **DECISION: default budget thresholds? (e.g., $50/month warning, $100/month hard limit?)** | 2 hr | ☐ |
| 7.8 | Verify `aiUsageLimit.ts` middleware is wired to AI routes — if not wired, AI usage is unlimited; if broken, AI features may be blocked | 20 min | ☐ |

**Phase Total: ~22.5 hours (3 days)**

> **Note:** AI response streaming (SSE) is already implemented in `ai.controller.ts` with proper `text/event-stream` headers — no work needed.

---

## PHASE 8: TELEPHONY (Days 26–29)

| # | Task | Time | Status |
|---|------|------|--------|
| 8.1 | ⚠️ Phone campaigns / power dialer — **DECISION: dialer behavior? (auto-dial next, manual advance, call queue size, pause between calls?)** | 8 hr | ☐ |
| 8.2 | ⚠️ Call recording & transcription — **DECISION: storage location and retention? (local disk, cloud, how long to keep?)** | 6 hr | ☐ |
| 8.3 | ⚠️ Voicemail drop — **DECISION: how are pre-recorded messages managed? (upload once, multiple per campaign, per-user?)** | 3 hr | ☐ |
| 8.4 | Real-time WebSocket push (new leads, messages, notifications — replace polling) | 4 hr | ☐ |
| 8.5 | ⚠️ Document attachments on leads — **DECISION: allowed file types and size limits? (PDF, images, docs, max 10MB?)** | 3 hr | ☐ |

**Phase Total: ~24 hours (3 days)**

---

> **MILESTONE: All features built — Day 29**

---

## PHASE 9: ADMIN, TEAM, BILLING & SUBSCRIPTION (Days 29–35)
*⚠️ This entire phase requires design decisions before starting. We will review each section together before building.*

### 9A: Admin Panel

| # | Task | Time | Status |
|---|------|------|--------|
| 9.1 | Create `SystemSettings` Prisma model — currently stored in-memory, lost on every restart | 1 hr | ☐ |
| 9.2 | Wire `ServiceConfiguration` page to real settings API | 2 hr | ☐ |
| 9.3 | Wire `SystemSettings` page — remaining sections that don't save | 1.5 hr | ☐ |
| 9.4 | ⚠️ Admin audit trail — **DECISION: what actions to log? (all CRUD, login/logout, settings changes, data exports?)** | 4 hr | ☐ |
| 9.5 | ⚠️ Data backup & restore UI — **DECISION: scope? (full DB dump, per-org export, what format?)** | 4 hr | ☐ |
| 9.6 | Add `createdById` audit trail to `Task`, `Segment`, `Workflow`, `Tag` models | 2 hr | ☐ |
| 9.7 | ⚠️ Help pages — **DECISION: keep current design with stat cards, simplify, or redesign? (user likes current look)** | TBD | ☐ |
| 9.7b | ⚠️ **SupportTicketSystem.tsx** is 100% hardcoded fake — all tickets, stats, form, search are non-functional mockup — **DECISION: implement real ticket system with backend, or convert to "Coming Soon" or external link (e.g., email/Zendesk)?** | 4-8 hr | ☐ |
| 9.7c | ⚠️ **VideoTutorialLibrary.tsx** is 100% hardcoded fake — 60 fake videos, no player, no search — **DECISION: implement real content/embed system, or convert to "Coming Soon" or link to docs?** | 2-4 hr | ☐ |
| 9.7d | ⚠️ **DocumentationPages.tsx** is 100% hardcoded fake — 199 fake articles, dead links, fake reviews — **DECISION: implement real docs with backend, or convert to "Coming Soon" or link to external docs site?** | 2-4 hr | ☐ |
| 9.7e | **HelpCenter.tsx** search bar is dead — `onChange` and filtering logic missing, popular articles/videos are static — wire search functionality or remove it | 1.5 hr | ☐ |

### 9B: Team Management

| # | Task | Time | Status |
|---|------|------|--------|
| 9.8 | Send real invitation emails on team invite | 2 hr | ☐ |
| 9.9 | ⚠️ Fix `BusinessSettings` / `Integration` / `EmailConfig` / `SMSConfig` ownership — **DECISION: move to Organization-level, or keep per-User with org fallback?** | 4 hr | ☐ |

### 9C: Billing & Subscription

| # | Task | Time | Status |
|---|------|------|--------|
| 9.10 | ⚠️ **DECISION: billing page structure** — merge 3 pages (`BillingPage`, `BillingSubscriptionPage`, `admin/Subscription`) into 1 tabbed page, or keep separate? | 3 hr | ☐ |
| 9.11 | BillingPage — replace hardcoded mock invoices with real data or honest empty state | 30 min | ☐ |
| 9.12 | ⚠️ Remove/fix fake `setTimeout` operations in `BillingPage` — **DECISION: remove the fake loading animations, or replace with real async calls?** | 15 min | ☐ |
| 9.13 | ⚠️ Implement or remove stub billing/subscription backend routes that return 501 — **DECISION: which stubs to implement vs. remove?** | 1 hr | ☐ |
| 9.14 | Extract inline billing business logic into `billing.controller.ts` | 40 min | ☐ |
| 9.15 | ⚠️ Wire Stripe checkout session creation — **DECISION: pricing tiers and plan structure?** | 4 hr | ☐ |
| 9.16 | Wire Stripe billing portal | 2 hr | ☐ |
| 9.17 | Wire Stripe payment methods retrieval | 2 hr | ☐ |
| 9.17b | Wire Stripe payment methods write operations — `PaymentMethods.tsx` "Add", "Set as Default", "Edit", "Delete" buttons all have **zero onClick handlers** | 2 hr | ☐ |
| 9.17c | Fix `InvoiceDetail.tsx` — 100% hardcoded fake data ("Acme Corporation", "INV-2024-001"), no `useParams()` for invoice ID, Download/Print buttons are dead | 2 hr | ☐ |
| 9.17d | Add missing Stripe service methods: `resumeSubscription()`, `getPaymentMethods()`, `attachPaymentMethod()`, `detachPaymentMethod()` | 2 hr | ☐ |
| 9.18 | ⚠️ Implement usage recording for metered billing — **DECISION: what counts as usage? (AI calls, SMS sent, contacts, storage?)** | 3 hr | ☐ |
| 9.19 | Replace hardcoded invoices with real Stripe invoice API | 2 hr | ☐ |
| 9.20 | ⚠️ Subscription upgrade/downgrade flow — **DECISION: proration behavior? (immediate, end of billing period?)** | 3 hr | ☐ |
| 9.21 | Subscription tier sync — consistency checks for cached `subscriptionTier` fields | 2 hr | ☐ |

**Phase Total: ~55 hours (7 days)**

---

## PHASE 10: FIX BROKEN PAGES + CONSOLIDATION (Days 37–39)
*Now that everything is built, fix dishonest pages and consolidate overlapping features.*

### 10A: Fix Broken/Fake Pages

| # | Task | Time | Status |
|---|------|------|--------|
| 10.1 | ⚠️ **Integrations Hub** — **DECISION: remove fake OAuth buttons entirely, or replace with "coming soon" labels?** | 1 hr | ☐ |
| 10.2 | Fix CampaignsList error swallowing — remove `catch { return null }`, let errors propagate | 30 min | ☐ |
| 10.3 | Fix all 38+ silent `catch {}` blocks — add error logging/toasts | 3 hr | ☐ |
| 10.4 | SecuritySettings — wire real session management from LoginHistory table | 1 hr | ☐ |
| 10.5 | Replace all hardcoded placeholder URLs (`crm.yourcompany.com`, `Your Company Name` in InvoiceDetail, `user@example.com` in Sidebar/Header, `https://api.masterrealestatepro.com/v1` in APIIntegrationsPage, etc.) with config-driven values | 1 hr | ☐ |
| 10.6 | ⚠️ Remove or implement stub backend routes that return 501 — **DECISION: which stubs to implement vs. remove?** | 30 min | ☐ |
| 10.6b | ⚠️ **APIIntegrationsPage.tsx** is 100% static — hardcoded fake API keys (`sk_live_51K9x...`), no backend calls, all buttons dead — **DECISION: implement real API key management, or convert to developer docs page?** | 2 hr | ☐ |
| 10.6c | Fix `feature-flags` stored only in localStorage — flags not shared across team and lost if browser cleared; move to backend/DB | 1.5 hr | ☐ |
| 10.6d | Fix `email-template-settings` stored in localStorage in `EmailTemplatesLibrary.tsx` — should be in DB for cross-device persistence | 1 hr | ☐ |
| 10.6e | ⚠️ **SocialMediaDashboard.tsx** has fake posting UI — functional-looking Post buttons for Facebook/Instagram/LinkedIn/Twitter that do nothing (same class of problem as IntegrationsHub 10.1) — **DECISION: remove fake post forms, or add "Coming Soon" labels?** | 30 min | ☐ |
| 10.6f | ⚠️ **ComplianceSettings.tsx** (593 lines) never audited — GDPR/CAN-SPAM/DND toggles and forms may not save to backend — **DECISION: audit and wire to real API, or mark as "Coming Soon"?** | 1 hr | ☐ |

### 10B: Consolidate Overlapping Pages

| # | Task | Time | Status |
|---|------|------|--------|
| 10.7 | ⚠️ Fix duplicate routes — **DECISION: confirm these redirects:** `/analytics/report-builder` → `/analytics/custom-reports`, `/communication` → `/communication/inbox`, `/settings/team` → `/admin/team` | 30 min | ☐ |
| 10.8 | ⚠️ Merge `CampaignReports` + `CampaignAnalytics` into 1 page — **DECISION: keep both as tabs, or pick one layout?** | 2 hr | ☐ |
| 10.9 | ⚠️ Merge `AIAnalytics` + `IntelligenceInsights` + `PredictiveAnalytics` into 1 page — **DECISION: tabbed layout? which tab names?** | 2 hr | ☐ |
| 10.10 | ⚠️ Convert `EmailCampaigns`, `SMSCampaigns`, `PhoneCampaigns` to filter tabs on `CampaignsList` — **DECISION: or keep as separate pages?** | 2 hr | ☐ |

**Phase Total: ~19.5 hours (2.5 days)**

---

## PHASE 11: UX POLISH (Days 37–39)
*Now that features are built, polish the user experience.*

| # | Task | Time | Status |
|---|------|------|--------|
| 11.1 | Fix dark mode persistence — add Zustand `persist` middleware to `uiStore.ts` | 15 min | ☐ |
| 11.2 | Fix sidebar state persistence (collapsed/expanded) — same `persist` middleware | 15 min | ☐ |
| 11.3 | Replace 21 `window.confirm()` dialogs across 19 files with a reusable styled `ConfirmDialog` component | 2.5 hr | ☐ |
| 11.4 | Add breadcrumb navigation | 2 hr | ☐ |
| 11.5 | Add page title management — `useDocumentTitle` hook, unique title per page | 1.5 hr | ☐ |
| 11.6 | Fix WebSocket connection — verify real-time notifications flow end-to-end | 1.5 hr | ☐ |
| 11.7 | Wire frontend to consume WebSocket events for campaign updates, workflow events, lead updates | 2 hr | ☐ |
| 11.8 | Import existing `LoadingSkeleton` component into Calendar and Tasks pages | 15 min | ☐ |
| 11.9 | Add search debounce to `GlobalSearchModal` | 30 min | ☐ |
| 11.10 | Add toast maximum limit | 20 min | ☐ |
| 11.11 | Fix Dashboard export — raw JSON → CSV/PDF | 2 hr | ☐ |
| 11.12 | Fix CallCenter voicemail button (currently toast-only) | 1 hr | ☐ |
| 11.13 | Move Inbox templates/quick replies to API | 2 hr | ☐ |
| 11.14 | Verify keyboard shortcuts are wired | 1 hr | ☐ |
| 11.15 | Fix setTimeout memory leaks in `CommunicationInbox` (6 leaks), `LeadScoring`, `WorkflowBuilder`, `Login`, `Register` | 1 hr | ☐ |
| 11.16 | Add Calendar, Tasks, Activity, and Integrations to sidebar navigation — currently only reachable via direct URL or embedded links | 30 min | ☐ |
| 11.17 | Fix Dashboard campaign performance chart — opens/clicks always show 0 because API doesn't return that data; wire real metrics or remove chart | 1 hr | ☐ |
| 11.18 | Add chunk load error handling — all 93 pages use `React.lazy()`; if a JS chunk fails to download (flaky network), users see a permanent spinner. Catch `ChunkLoadError` and prompt user to reload | 30 min | ☐ |

**Phase Total: ~21.5 hours (2.5 days)**

---

## PHASE 12: CODEBASE HYGIENE (Days 39–40)
*Moved to end per philosophy: build first, clean up last.*

| # | Task | Time | Status |
|---|------|------|--------|
| 12.1 | ⚠️ Consolidate 144 root `.md` files into organized summary files (NOT delete — they document our timeline and how things changed) — **DECISION: grouping strategy? (by feature area, by date, single timeline doc, other?)** | 1 hr | ☐ |
| 12.2 | ⚠️ Delete 15 root `.sh` scripts + `test-output.log` + `test-results.log` — **DECISION: review list of scripts first, confirm which to delete vs. keep** | 10 min | ☐ |
| 12.3 | ⚠️ Delete 42 backend root ad-hoc scripts (`.sh`, `.js`, `.py`, `.bak` — keep `jest.config.js` and `jest.config.regression.js`) — **DECISION: review list first, confirm which to delete vs. keep** | 10 min | ☐ |
| 12.4 | ⚠️ Delete 11 compiled `.js` test files in `backend/tests/` — **DECISION: confirm these are just compiled duplicates of .ts test files** | 5 min | ☐ |
| 12.5 | ⚠️ Remove `src/data/mockData.ts` (820 lines) + `src/config/mockData.config.ts` + `MockModeBanner.tsx` + `AnalyticsEmptyState.tsx` (if dead after mock removal) + all page imports — **DECISION: confirm no pages still need mock data (they'll show empty states instead)** | 30 min | ☐ |
| 12.6 | ⚠️ Replace 451 `console.log/error/warn` with proper logger — **DECISION: frontend strategy? (remove entirely, or use a lightweight logger like loglevel?)** | 4 hr | ☐ |
| 12.7 | ⚠️ Remove unused deps: `redis`, `node-fetch`, `nodemon` from backend; `reactflow`, `framer-motion`, `zod`, `@hookform/resolvers`, `react-hook-form` from frontend — **DECISION: confirm none of these are actually used or planned to be used** | 15 min | ☐ |
| 12.8 | ⚠️ Move `@types/multer` to devDeps, remove `@types/helmet`, fix `typescript` duplicated in both deps and devDeps in backend — **DECISION: confirm `@types/helmet` is truly unused** | 5 min | ☐ |
| 12.9 | Fix `.gitignore`: add `coverage/`, `playwright-report/`, `test-results/`, `e2e/screenshots/`, `*.tsbuildinfo`, `*.env.local`, `backend/dist/`; **remove** `prisma/migrations/` and `package-lock.json` from backend `.gitignore` (both must be committed) | 10 min | ☐ |
| 12.10 | ⚠️ `git rm -r --cached playwright-report/ test-results/ e2e/screenshots/ e2e/e2e/screenshots/` to remove already-committed build artifacts (note: duplicate nested `e2e/e2e/screenshots/` directory also exists) — **DECISION: confirm these are just build output, not test results you want to keep** | 5 min | ☐ |
| 12.11 | Create frontend `.env.example` documenting `VITE_API_URL` | 5 min | ☐ |
| 12.12 | Update backend `.env.example` — add ~16 undocumented vars | 15 min | ☐ |
| 12.13 | ⚠️ Fix Zod version mismatch (backend `^4.1.12`, frontend `^3.23.8`) — **DECISION: which version? (Zod 4 is latest but has breaking changes from 3)** | 15 min | ☐ |
| 12.14 | ⚠️ Delete 5 dev-only pages: `DemoDataGenerator`, `DebugConsole`, `DatabaseMaintenance`, `RetryQueue`, `FeatureFlags` — **DECISION: confirm all 5 should go, or keep any?** | 30 min | ☐ |
| 12.15 | ⚠️ Delete Prisma schema backup files tracked in git: `schema.prisma.backup`, `schema.prisma.pulled`, `schema_broken.prisma` — **DECISION: confirm these are safe to remove** | 5 min | ☐ |
| 12.16 | Fix `start-dev.sh` hardcoded Codespace URL (`probable-fiesta-v65j576gg6qgfpp79`) — make it environment-agnostic | 10 min | ☐ |
| 12.17 | Create `.prettierrc` config file — Prettier set as default formatter in devcontainer but no config exists to enforce style | 10 min | ☐ |
| 12.18 | Fix `.devcontainer/devcontainer.json` Node version — specifies Node 18/20 but runtime is Node 22 | 10 min | ☐ |
| 12.19 | Add `README.md` at project root — currently does not exist (critical for any project) | 1 hr | ☐ |

**Phase Total: ~9 hours (1 day)**

---

## PHASE 13: CODE QUALITY + TESTING (Days 40–44)
*Split mega-files, set up testing, enforce standards.*

| # | Task | Time | Status |
|---|------|------|--------|
| 13.1 | Split `CommunicationInbox.tsx` (2,240 lines) into composable modules | 3 hr | ☐ |
| 13.2 | Split `LeadsList.tsx` (2,199 lines) into composable modules | 3 hr | ☐ |
| 13.3 | Fix rampant `any` types in backend (20+ instances in controllers) | 2 hr | ☐ |
| 13.4 | Extract inline business logic from route files into proper controllers: `billing.controller.ts`, `export.controller.ts`, `segmentation.controller.ts`, `webhook.controller.ts` | 2.5 hr | ☐ |
| 13.5 | Add consistent pagination to all list endpoints: segments, saved reports, billing invoices, deliverability lists | 1.5 hr | ☐ |
| 13.6 | Set up ESLint for backend (frontend already has it configured; backend has zero linting) | 1 hr | ☐ |
| 13.7 | Add pre-commit hooks with husky + lint-staged (lint + type-check on commit) | 1 hr | ☐ |
| 13.8 | Set up Vitest for frontend (zero test tooling currently installed) | 1.5 hr | ☐ |
| 13.9 | Write tests for critical paths: auth flow, lead CRUD, campaign CRUD | 4 hr | ☐ |
| 13.10 | Add backend integration tests for untested route groups | 6 hr | ☐ |
| 13.11 | Add error boundaries around modals/drawers (AI Composer, Workflow Builder canvas, Calendar sidebar) | 1.5 hr | ☐ |
| 13.12 | ⚠️ Consolidate Redis clients — remove `redis` package, standardize on `ioredis` — **DECISION: confirm switching to ioredis-only is acceptable** | 1 hr | ☐ |
| 13.13 | Upgrade vulnerable dependencies (axios, react-router-dom, vite/rollup, express/qs) | 2 hr | ☐ |
| 13.14 | API documentation polish (verify Swagger) | 2 hr | ☐ |
| 13.15 | Add `test`, `e2e`, `type-check`, `format` scripts to root `package.json` — no unified test/check commands exist | 30 min | ☐ |
| 13.16 | Fix backend `tsconfig.json` — `exclude: ["tests"]` means test files get no TS type-checking; `rootDir: "./src"` excludes `prisma/seed.ts` from compilation | 30 min | ☐ |
| 13.17 | Fix Playwright config — add `retries: 2`, enable `screenshot: 'only-on-failure'` and `trace: 'on-first-retry'`; add `npx playwright test` script to package.json | 20 min | ☐ |
| 13.18 | Convert backend ad-hoc `.js` scripts in `backend/scripts/` to `.ts` run with `tsx` | 30 min | ☐ |
| 13.19 | Audit existing 15 Playwright e2e specs — determine which are real functional tests vs. navigation smoke tests (screenshot-only), decide which to keep/expand/rewrite | 1 hr | ☐ |
| 13.20 | Verify `cache.ts` middleware degrades gracefully when `REDIS_ENABLED=false` — if not, add fallback behavior | 15 min | ☐ |

**Phase Total: ~35.5 hours (4.5 days)**

---

## PHASE 14: ACCESSIBILITY + MOBILE (Days 44–45)

| # | Task | Time | Status |
|---|------|------|--------|
| 14.1 | Add skip-to-content link | 20 min | ☐ |
| 14.2 | Add `<nav aria-label>` to sidebar | 15 min | ☐ |
| 14.3 | Add `role="dialog"` and `aria-label` to `GlobalSearchModal` | 15 min | ☐ |
| 14.4 | Add `aria-expanded`/`aria-haspopup` to header dropdown | 15 min | ☐ |
| 14.5 | Add `aria-label` to all icon-only buttons | 2 hr | ☐ |
| 14.6 | Add `aria-live="polite"` to `ToastContainer` | 10 min | ☐ |
| 14.7 | Add focus management on mobile sidebar | 1 hr | ☐ |
| 14.8 | Add slide-in animation to sidebar | 1 hr | ☐ |
| 14.9 | ⚠️ Add mobile bottom navigation bar — **DECISION: which items in bottom nav? (Home, Leads, Messages, Tasks, More?)** | 3 hr | ☐ |
| 14.10 | Optimize large tables for mobile (responsive cards) | 3 hr | ☐ |
| 14.11 | Detect `prefers-color-scheme: dark` for initial theme | 30 min | ☐ |

**Phase Total: ~12 hours (1.5 days)**

---

## PHASE 15: ONBOARDING + FINAL POLISH (Days 45–46)

| # | Task | Time | Status |
|---|------|------|--------|
| 15.0 | Audit existing `GettingStarted.tsx` onboarding component — check if it's functional, shown to new users, or dead code, before building anything new | 15 min | ☐ |
| 15.1 | ⚠️ Build real onboarding tour — **DECISION: what steps in the tour? (create lead, send message, set up pipeline, etc.)** | 4 hr | ☐ |
| 15.2 | Add "Show Getting Started" in settings | 30 min | ☐ |
| 15.3 | Add guided tooltips/spotlight for new users | 3 hr | ☐ |
| 15.4 | ⚠️ Add notification sounds/indicators — **DECISION: sound on/off by default? which events get sounds?** | 1.5 hr | ☐ |
| 15.5 | Add recent searches/history to GlobalSearchModal | 1.5 hr | ☐ |
| 15.6 | ⚠️ Standardize all "Coming Soon" pages — **DECISION: consistent design/copy for coming soon pages?** | 2 hr | ☐ |

**Phase Total: ~13 hours (1.5 days)**

---

> **MILESTONE: 100% complete — ~51 days**

---

## PHASE 16: CI/CD + DEPLOYMENT (Days 49–51)
*Without this, there's no way to deploy to production or ensure quality on every push.*

| # | Task | Time | Status |
|---|------|------|--------|
| 16.1 | ⚠️ Set up GitHub Actions CI pipeline — lint, type-check, test on every push/PR — **DECISION: which checks to include? (lint, TS check, unit tests, e2e, build?)** | 4 hr | ☐ |
| 16.2 | Create `Dockerfile` for backend (Node + Prisma + migrations) | 2 hr | ☐ |
| 16.3 | Create `Dockerfile` for frontend (Vite build + static serve via nginx) | 1.5 hr | ☐ |
| 16.4 | Create `docker-compose.yml` for local full-stack dev (backend, frontend, Postgres, Redis) | 2 hr | ☐ |
| 16.5 | Add CSRF protection middleware to backend | 1 hr | ☐ |
| 16.6 | Add per-route request size limits — AI routes, file uploads, and webhooks should have different limits than default 10MB | 30 min | ☐ |
| 16.7 | Add developer documentation: architecture overview, API reference, setup guide in `docs/` | 3 hr | ☐ |

**Phase Total: ~14 hours (2 days)**

---

## PHASE 17: DEFERRED + ENTERPRISE (Days 50+)
*Build based on customer demand. Items moved here from earlier phases as non-essential for v1.*

| # | Task | Time | Status |
|---|------|------|--------|
| 17.1 | S3/R2 cloud file upload (local disk works for v1) | 4 hr | ☐ |
| 17.2 | Google Calendar 2-way sync (requires Google Cloud Console setup + OAuth consent) | 6 hr | ☐ |
| 17.3 | Outlook Calendar 2-way sync (requires Microsoft app registration) | 5 hr | ☐ |
| 17.4 | Google OAuth login flow | 4 hr | ☐ |
| 17.5 | DNS verification endpoint for custom sending domains | 2 hr | ☐ |
| 17.6 | Email template drag-and-drop builder (Unlayer/react-email-editor) | 8 hr | ☐ |
| 17.7 | AI templates migration to database (hardcoded defaults work fine) | 2 hr | ☐ |
| 17.8 | Third-party lead sources (Zillow, Realtor.com) | 8 hr | ☐ |
| 17.9 | Client portal | TBD | ☐ |
| 17.10 | Mobile app / PWA | TBD | ☐ |
| 17.11 | White-labeling | TBD | ☐ |
| 17.12 | Multi-language / i18n | TBD | ☐ |
| 17.13 | Social login (Google/Microsoft) | TBD | ☐ |
| 17.14 | Social Media Dashboard — real API connections | TBD | ☐ |
| 17.15 | Token blacklist/revocation — stolen access tokens work for full 15-min lifetime even after logout (enterprise-grade security) | 4 hr | ☐ |

---

## ADDITIONAL FINDINGS

These were discovered during deep codebase analysis and are incorporated into the phases above:

| # | Finding | Severity | Phase |
|---|---------|----------|-------|
| A | **Token key mismatch** — `useSocket.ts` (3 occurrences), `NotificationBell.tsx`, `AIComposer.tsx`, `ContentGeneratorWizard.tsx` read `'token'` but auth stores as `'accessToken'`. WebSocket + AI streaming completely broken. | CRITICAL | 0.1 |
| B | **WebSocket JWT_SECRET vs JWT_ACCESS_SECRET** — socket.ts uses wrong env var, falls back to `'dev-secret'`. | CRITICAL | 0.2 |
| C | **`prisma/migrations/` gitignored** — migrations must be committed for reproducible deploys. | CRITICAL | 12.9 |
| D | **Webhook signature bypass** — when Twilio/SendGrid tokens aren't configured, verification is skipped. | HIGH | 0.3 |
| E | **Hardcoded encryption key fallback** — `'default-32-byte-key-change-this!'` if env var missing. | HIGH | 0.4 |
| F | **No uncaughtException/unhandledRejection handlers** — server crashes silently. | HIGH | 0.5 |
| G | **`package-lock.json` gitignored** — builds are non-reproducible. | HIGH | 12.9 |
| H | **`Note` model missing `organizationId`** — multi-tenant data isolation gap. | HIGH | 1.1 |
| I | **`$queryRawUnsafe`** in admin controller — 7 usages with string interpolation. | MEDIUM | 0.17 |
| J | **`asyncHandler` missing from 10 route files** — not 4 as originally estimated. | MEDIUM | 0.11 |
| K | **21 `window.confirm()` dialogs** across 19 files — not 3 as originally counted. | MEDIUM | 11.3 |
| L | **451 `console.*` statements** — not 92 as originally counted (342 BE + 109 FE). | MEDIUM | 12.6 |
| M | **Admin pages with no frontend role guard** — pages render for regular users. | MEDIUM | 0.16 |
| N | **localStorage not cleaned on logout** — settings leak between users. | MEDIUM | 0.19 |
| O | **localStorage keys not user-scoped** — user A's data shows for user B. | MEDIUM | 0.20 |
| P | **SystemSettings in-memory store** — lost on restart, no Prisma model. | MEDIUM | 9.1 |
| Q | **No stale data cleanup** — 4 tables with expirable data, no pruning cron. | MEDIUM | 1.7 |
| R | **Missing composite indexes** — 3+ high-frequency query patterns. | MEDIUM | 1.6 |
| S | **`/tmp/uploads` never cleaned** — disk exhaustion risk. | MEDIUM | 0.22 |
| T | **Backend `.env.example` missing ~16 vars**. | MEDIUM | 12.12 |
| U | **5 dev-only pages shipping to production** — DemoDataGenerator, DebugConsole, DatabaseMaintenance, RetryQueue, FeatureFlags. | MEDIUM | 12.14 |
| V | **Feature overload** — 84 pages / 91 routes (~4x competing CRMs). Consolidation in Phase 10B after features built. | DESIGN | 10B |
| W | **3 billing pages with significant overlap** — decision deferred. | DESIGN | 9.10 |
| X | **AI SSE streaming already implemented** — removed from plan (was 4 wasted hours). | INFO | — |
| Y | **HealthCheckDashboard already wired** to real API — removed from plan. | INFO | — |
| Z | **Newsletter already has "Coming Soon" banner** — removed from plan. | INFO | — |
| AA | **LoadingSkeleton component already exists** — just needs importing in 2 more files. | INFO | 11.8 |
| BB | **2FA backend fully implemented** (speakeasy) — only login flow gap remains. | INFO | 6.1 |
| CC | **Email opt-out infrastructure exists** — only SMS STOP keyword handling needed. | INFO | 4.4 |

### Additional Findings from v4 Full Codebase Audit (March 2, 2026)

| # | Finding | Severity | Phase |
|---|---------|----------|-------|
| DD | **No `express.raw()` for Stripe webhooks** — `express.json()` applied globally destroys raw body needed for Stripe signature verification. Webhooks can never verify. | CRITICAL | 0.23 |
| EE | **No graceful shutdown for Prisma/Redis** — open DB connections leak on restart. | HIGH | 0.24 |
| FF | **No distributed lock on campaign scheduler cron** — multiple instances = duplicate sends. | HIGH | 0.25 |
| GG | **Auth error messages leak JWT internals** — "jwt malformed", "invalid signature" sent to client. | HIGH | 0.26 |
| HH | **7 additional models missing `organizationId`** — `BusinessSettings`, `EmailConfig`, `Integration`, `SMSConfig`, `NotificationSettings`, `APIKeyAudit`, `PasswordResetToken`. Plan had only `Note`. | HIGH | 1.1b |
| II | **5 additional indexes needed** — `RefreshToken.expiresAt`, `PasswordResetToken.expiresAt`, `WorkflowExecution.leadId`, `LoginHistory.createdAt`, `Note.createdAt`. | MEDIUM | 1.6b |
| JJ | **`Lead.assignedToId` missing `onDelete`** — deleting a User causes Prisma error for assigned leads. | MEDIUM | 1.4b |
| KK | **`Team` vs `Organization` model confusion** — both have separate `subscriptionTier` caching. | MEDIUM | 1.8 |
| LL | **SupportTicketSystem.tsx is 100% fake** — hardcoded tickets, no form submission, no API. | HIGH | 9.7b |
| MM | **VideoTutorialLibrary.tsx is 100% fake** — 60 fake videos, no player, no search, no API. | HIGH | 9.7c |
| NN | **DocumentationPages.tsx is 100% fake** — 199 fake articles, dead links, fake reviews. | HIGH | 9.7d |
| OO | **HelpCenter.tsx search is dead** — no onChange, no filtering, no API call. | MEDIUM | 9.7e |
| PP | **InvoiceDetail.tsx is 100% hardcoded** — fake "Acme Corporation" data, dead buttons. | HIGH | 9.17c |
| QQ | **PaymentMethods.tsx write operations are stubs** — Add/Edit/Delete/Default buttons have zero onClick. | HIGH | 9.17b |
| RR | **APIIntegrationsPage.tsx is 100% static** — hardcoded fake API keys, dead buttons. | HIGH | 10.6b |
| SS | **Sidebar missing 4 navigation items** — Calendar, Tasks, Activity, Integrations unreachable except via URL. | MEDIUM | 11.16 |
| TT | **SecuritySettings has 4 unimplemented features** — 2FA removal, session revocation, sign-out-all, account deletion. | HIGH | 6.7 |
| UU | **Login "Remember me" does nothing** — checkbox exists with no effect. | MEDIUM | 6.6 |
| VV | **ForgotPassword/ResetPassword double-layout** — double centering/background. | LOW | 6.8 |
| WW | **Dual token storage sync issue** — Zustand persist + manual localStorage can desync. | MEDIUM | 6.9 |
| XX | **`useAIAvailability` hook bypasses auth** — uses raw `fetch()` instead of `api` axios instance. | MEDIUM | 0.31 |
| YY | **5 additional unused frontend deps** — `framer-motion`, `zod`, `@hookform/resolvers`, `react-hook-form`. Plan had only `reactflow`. | MEDIUM | 12.7 |
| ZZ | **No CI/CD pipeline** — no `.github/` directory, no automated tests on push/PR. | CRITICAL | 16.1 |
| AAA | **No Dockerfile or deployment config** — cannot deploy to production. | CRITICAL | 16.2-16.4 |
| BBB | **No README.md** — root has zero README despite 144 .md files. | HIGH | 12.19 |
| CCC | **Hardcoded Twilio/OpenAI/email fallback values** — `'+1234567890'`, `'placeholder-will-use-org-key'`, `'noreply@realestate.com'`. | MEDIUM | 0.27-0.29 |
| DDD | **`/api/system/integration-status` unauthenticated** — leaks service configuration status. | MEDIUM | 0.30 |
| EEE | **No `.prettierrc` config** — Prettier set as formatter but no config file. | LOW | 12.17 |
| FFF | **`.devcontainer` Node version stale** — specifies Node 18/20 but runtime is Node 22. | LOW | 12.18 |
| GGG | **`start-dev.sh` hardcoded Codespace URL** — won't work in different environments. | LOW | 12.16 |
| HHH | **Backend `tsconfig.json` excludes tests/** — tests get no TS type-checking. | MEDIUM | 13.16 |
| III | **Dashboard campaign chart shows 0/0** — opens/clicks not returned by API. | MEDIUM | 11.17 |
| JJJ | **Stripe service missing methods** — no `resumeSubscription()`, `getPaymentMethods()`, `attachPaymentMethod()`, `detachPaymentMethod()`. | MEDIUM | 9.17d |
| KKK | **No CSRF protection** — no CSRF middleware anywhere. | MEDIUM | 16.5 |
| LLL | **Prisma schema backup files tracked in git** — `schema.prisma.backup`, `schema.prisma.pulled`, `schema_broken.prisma`. | LOW | 12.15 |
| MMM | **Feature flags in localStorage only** — not shared across team, lost if browser cleared. | MEDIUM | 10.6c |
| NNN | **Email template settings in localStorage** — lost across devices. | MEDIUM | 10.6d |

### Additional Findings from v5 Cross-Audit (March 2, 2026)

| # | Finding | Severity | Phase |
|---|---------|----------|-------|
| OOO | **No production build verification** — `npm run build` never validated; the build may fail due to type errors, unused imports, Zod mismatches. | HIGH | 0.0 |
| PPP | **Express 5 makes `asyncHandler` potentially redundant** — Express 5.1.0 auto-catches async errors; plan allocates 2 hours for asyncHandler that may be wasted. | HIGH | 0.11 |
| QQQ | **`sanitize.ts` middleware not verified as wired** — XSS protection middleware exists but may not be applied globally. | MEDIUM | 0.34 |
| RRR | **`aiUsageLimit.ts` middleware not verified as wired** — AI usage limits may be unenforced or incorrectly blocking. | MEDIUM | 7.8 |
| SSS | **`cache.ts` middleware Redis-off degradation unknown** — may error or silently fail when `REDIS_ENABLED=false`. | LOW | 13.20 |
| TTT | **SocialMediaDashboard.tsx fake posting UI** — functional-looking Post buttons for 4 platforms that do nothing (same class as IntegrationsHub). | MEDIUM | 10.6e |
| UUU | **ComplianceSettings.tsx (593 lines) never audited** — GDPR/CAN-SPAM/DND toggles may not save to any backend endpoint. | MEDIUM | 10.6f |
| VVV | **5 additional String→enum candidates missed** — `CampaignLead.status`, `Call.status`, `Call.direction`, `AIInsight.type`, `AIInsight.priority`. | MEDIUM | 1.5 |
| WWW | **E2E test quality unknown** — 15 Playwright specs may be navigation smoke tests (screenshot-only), not real functional tests. | MEDIUM | 13.19 |
| XXX | **Duplicate `e2e/e2e/screenshots/` directory** — screenshots committed in two nested locations. | LOW | 12.10 |
| YYY | **`webhook.routes.ts` inline logic** — has no controller; needs extraction alongside billing/export/segmentation. | LOW | 13.4 |
| ZZZ | **Chunk load error handling missing** — all 93 `React.lazy()` pages show permanent spinner if chunk download fails. | MEDIUM | 11.18 |
| AAAA | **`GettingStarted.tsx` onboarding component state unknown** — Phase 15 might duplicate work that partially exists. | LOW | 15.0 |
| BBBB | **`CORS_ORIGIN` inconsistency extends beyond socket.ts** — server.ts CORS config also needs audit. | LOW | 0.35 |
| CCCC | **`nodemon` unused in backend** — devDependency installed but `tsx watch` is used instead. | LOW | 12.7 |
| DDDD | **`MockModeBanner.tsx` + `AnalyticsEmptyState.tsx` may be dead** — after mock data removal (12.5), these components need cleanup too. | LOW | 12.5 |

---

## TIMELINE SUMMARY

| Phase | Focus | Days | Cumulative |
|-------|-------|------|------------|
| DS-1 | Decision Session: Security | 0.5 | 0.5 |
| 0 | Critical security + build gate check | 2 | 2.5 |
| DS-2 | Decision Session: Schema | (included) | |
| 1 | Data & schema integrity | 1.5 | 4 |
| **MILESTONE** | **Foundation solid** | | **4 days** |
| DS-3 | Decision Session: Feature Wiring | (included) | |
| 2 | Feature wiring | 2 | 6 |
| DS-4 | Decision Session: Lead Core | (included) | |
| 3A | Lead management — core pipeline | 4 | 10 |
| DS-5 | Decision Session: Lead Import/Merge | (included) | |
| 3B | Lead management — import, merge, automation | 3.5 | 13.5 |
| DS-6 | Decision Session: Campaigns | (included) | |
| 4 | Campaigns & workflows | 5.5 | 19 |
| DS-7 | Decision Session: Analytics | (included) | |
| 5 | Analytics + calendar | 4 | 23 |
| DS-8 | Decision Session: Auth | (included) | |
| 6 | Auth features | 2 | 25 |
| DS-9 | Decision Session: AI | (included) | |
| 7 | AI features | 3 | 28 |
| DS-10 | Decision Session: Telephony | (included) | |
| 8 | Telephony | 3 | 31 |
| **MILESTONE** | **All features built** | | **~31 days** |
| DS-11 | Decision Session: Admin/Billing | 0.5 | 31.5 |
| 9 | Admin, Team, Billing & Subscription | 7 | 38.5 |
| DS-12 | Decision Session: Broken Pages | (included) | |
| 10 | Fix broken pages + consolidation | 2.5 | 41 |
| 11 | UX polish | 2.5 | 43.5 |
| DS-13 | Decision Session: Hygiene | (included) | |
| 12 | Codebase hygiene | 1 | 44.5 |
| DS-14 | Decision Session: Quality/Mobile | (included) | |
| 13 | Code quality + testing | 4.5 | 49 |
| 14 | Accessibility + mobile | 1.5 | 50.5 |
| DS-15 | Decision Session: Onboarding/Deploy | (included) | |
| 15 | Onboarding + final polish | 1.5 | 52 |
| 16 | CI/CD + deployment | 2 | 54 |
| **MILESTONE** | **100% complete** | | **~51 days** |
| 17 | Deferred + Enterprise | TBD | — |

> **Note:** ~51 days accounts for decision session time (~1 day total spread across phases) and efficiency gains from parallelizing tasks. Decision sessions for phases 1–8 are lightweight (15–30 min each, included in phase estimates). DS-1 (security) and DS-11 (admin/billing) are the heaviest at ~2 hours each and have their own half-day budget.
>
> **Parallelization opportunity:** If two people work simultaneously (e.g., one on frontend Phase 11 while another does backend Phase 13), calendar time drops to ~35–40 days.

---

## AUDIT CHANGELOG

**March 2, 2026 (v5) — Cross-audit: 15 additional gaps, decision sessions system, Phase 3 split, ~51 days:**

*Cross-audit methodology:*
- Compared every plan item against actual codebase files to find gaps
- Audited all middleware files (`sanitize.ts`, `aiUsageLimit.ts`, `cache.ts`) for wiring status
- Verified Express version (5.1.0) and its implications for error handling patterns
- Audited all Prisma String fields against the enum conversion list
- Checked frontend lazy-loading error resilience
- Reviewed all 15 e2e test specs for quality/coverage
- Identified unused devDependencies (`nodemon`)
- Verified CORS config consistency across both socket.ts and server.ts

*15 new gaps found and integrated:*
- **Phase 0** (Security): +3 items — build gate check (0.0), sanitize middleware verification (0.34), CORS consistency in server.ts (0.35)
- **Phase 0.11** updated — Express 5 asyncHandler decision point added (may save 2 hours)
- **Phase 1.5** updated — 5 additional String→enum fields: `CampaignLead.status`, `Call.status`, `Call.direction`, `AIInsight.type`, `AIInsight.priority`
- **Phase 3** split into 3A (core pipeline) + 3B (import/merge/automation) with checkpoint
- **Phase 7** (AI): +1 item — aiUsageLimit middleware verification (7.8)
- **Phase 10** (Broken Pages): +2 items — SocialMediaDashboard fake UI (10.6e), ComplianceSettings audit (10.6f)
- **Phase 11** (UX): +1 item — chunk load error handling for React.lazy (11.18)
- **Phase 12.5** updated — includes MockModeBanner + AnalyticsEmptyState cleanup
- **Phase 12.7** updated — added `nodemon` to unused deps removal list
- **Phase 12.10** updated — noted duplicate `e2e/e2e/screenshots/` directory
- **Phase 13** (Quality): +3 items — e2e test quality audit (13.19), cache middleware Redis-off check (13.20), webhook controller extraction added to 13.4
- **Phase 15** (Onboarding): +1 item — GettingStarted.tsx audit before building (15.0)

*Structural changes:*
- **Decision Sessions system** — 76 decision points batched into 15 focused sessions (DS-1 through DS-15), resolved per-phase before work begins. Eliminates start-stop friction.
- **Phase 3 split** — Lead Management divided into 3A (core pipeline: follow-ups, calls, pipelines, filters) and 3B (import, merge, automation, dedup) with a review checkpoint between them. Reduces risk of the longest phase losing momentum.
- **Decision session time** budgeted in timeline (~1 day total)

*Timeline impact:* ~50 days → ~51 days (+1 day for decision sessions + new items)

---

**March 2, 2026 (v4) — Full codebase audit: 52 gaps integrated, new Phase 16, ~50 days:**

*Full-codebase audit methodology:*
- Deep read of Prisma schema, server.ts, all middleware, all routes, all frontend pages
- Grep for TODO/FIXME/HACK, console.log, window.confirm, hardcoded URLs, empty catch blocks, setTimeout leaks, localStorage usage
- Reviewed every page for fake/hardcoded data, dead buttons, missing functionality
- Audited all config files: package.json (both), tsconfig (both), .gitignore (both), .env, devcontainer, vite, eslint, tailwind
- Checked for CI/CD, deployment configs, README, developer docs

*52 gaps found and integrated:*
- **Phase 0** (Security): +11 items — Stripe raw body, graceful shutdown, distributed cron lock, auth error hardening, hardcoded fallback values, unauthenticated endpoints, AI availability hook bypass, admin rate limiter, payload error handling
- **Phase 1** (Schema): +4 items — 7 additional models missing organizationId, 5 additional indexes, Lead.assignedToId onDelete, Team vs Organization confusion
- **Phase 6** (Auth): +4 items — Remember me, 4 SecuritySettings features, double-layout fix, dual token storage
- **Phase 9** (Admin/Billing): +7 items — 4 fake help pages, HelpCenter search, PaymentMethods writes, InvoiceDetail fake data, missing Stripe methods
- **Phase 10** (Broken Pages): +3 items — APIIntegrationsPage fake, feature flags in localStorage, email template settings in localStorage
- **Phase 11** (UX): +2 items — sidebar nav gaps, dashboard chart gap
- **Phase 12** (Hygiene): +5 items — additional unused deps, Prisma backups, start-dev.sh fix, .prettierrc, devcontainer Node version, README.md
- **Phase 13** (Quality): +4 items — package.json scripts, tsconfig tests fix, Playwright config, backend scripts conversion
- **Phase 16** (NEW): +7 items — CI/CD pipeline, Dockerfiles, docker-compose, CSRF protection, request size limits, developer docs

*Timeline impact:* ~46 days → ~50 days (+4 days)

---

**March 2, 2026 (v3) — Cleanup moved to end, .md files consolidated, decision points marked:**

*Changes in this revision:*
- Moved Phase 0 (Codebase Hygiene) → Phase 12 (near end of polish section). User philosophy: build first, clean up last.
- Changed task 0.1 "Delete 144 root .md files" → "Consolidate into organized summary files." These files document the project timeline and how decisions evolved — they should be preserved in a condensed form, not deleted.
- Added ⚠️ decision markers to 59 tasks across all phases. Every marked task requires user input before work begins. This prevents skipping over design decisions.
- Added Decision Point Summary table at top of plan for quick reference.
- Renumbered all phases: old Phase 1 (Security) → new Phase 0, old Phase 2 (Data) → new Phase 1, etc.
- Updated all cross-references in Additional Findings table to match new numbering.

---

**March 2, 2026 (v2) — Reordered: build first, polish last:**

*Reordering rationale:*
- Build all features first so we can see what we have
- Keep all routes/pages/buttons during building — shows what exists and avoids premature removal
- Consolidate overlapping pages AFTER everything is built
- UX polish, accessibility, mobile optimization, onboarding, and code quality come at the end
- Admin/Team/Billing/Subscription stays near the end — design decisions still pending

*Tasks moved:*
- `window.confirm()` replacement → UX polish phase
- Feature Wiring → build early
- Lead Management, Campaigns, Analytics, Auth, AI, Telephony → feature-building phases
- Broken pages + consolidation, UX, Code Quality, Accessibility, Onboarding → polish phases
- JWT refresh → auth features phase

---

**March 2, 2026 (v1) — Admin/Team/Billing/Subscription deferral:**

*Deferred (decisions pending):*
- Help pages, SystemSettings model, ServiceConfiguration wiring, SystemSettings wiring
- BillingPage fixes, billing page consolidation, billing controller extraction
- Team invite emails, BusinessSettings ownership fix
- Admin audit trail, data backup & restore, subscription tier sync, `createdById` audit trails

---

**March 1, 2026 — Post-audit revision:**

*Removed (already done):*
- Newsletter "Coming Soon" banner, HealthCheckDashboard wiring, AI SSE streaming, Loading skeleton creation

*Removed (unnecessary work):*
- Help Center rebuild, Support Ticket System build, Video Tutorial Library
