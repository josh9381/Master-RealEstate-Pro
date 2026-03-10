# Master Real Estate Pro — 100% Completion Plan

> **Created:** February 28, 2026
> **Updated:** March 10, 2026 (v35: Phase 15 complete — onboarding tour, notification sounds, recent searches, Coming Soon standardization)
> **Total Estimated Days:** ~51 working days
> **Philosophy: Build everything first, then polish and consolidate. Keep all routes/pages during building so we can see what exists. Admin/Team/Billing/Subscription deferred — decisions pending.**
>
> **Legend:** ⚠️ = Decision point — stop and ask user before proceeding | ✅ = Complete | 🔀 = Deferred
>
> **Progress:** Phase 0 complete (35/35 tasks). Phase 1 complete (12/12 tasks). Phase 2 complete (8/8 tasks). Phase 3A complete (7/7 tasks). Phase 3B complete (8/9 tasks, 1 deferred). Phase 4 complete (14/14 tasks). Phase 5 complete (9/9 tasks). Phase 6 complete (9/9 tasks). Phase 7 complete (8/8 tasks). Phase 8 complete (3/6 tasks, 3 deferred). Phase 9 complete (18/27 tasks done, 9 deferred). Phase 10 complete (13/15 tasks done, 1 deferred, 1 skipped). Phase 11 complete (18/18 done). Phase 12 complete (18/19 done, 1 skipped). Phase 13 in progress (6/20 done). Phase 15 complete (7/7 tasks). DS-1 through DS-15 resolved. DS-11B (Phase 11) resolved.

---

## DECISION SESSIONS

**76 decision points batched into 15 focused sessions.** Instead of stopping 76 times, we resolve related decisions together in one conversation per session. Each session should be completed *before* the corresponding phase begins.

| Session | When | Decisions | Topics to Resolve |
|---------|------|-----------|-------------------|
| **DS-1** | ✅ RESOLVED | 6 | AI: split (prefs=user, scoring/training=admin). Rate limits: all 5 endpoints done. asyncHandler: skipped (Express 5 native). Dead code + upload cleanup: deferred to Phase 14. |
| **DS-2** | ✅ RESOLVED | 2 | Enum values for all String→enum conversions (10 fields) — all UPPERCASE convention. Data retention: RefreshToken=0d, PasswordResetToken=7d, LoginHistory=90d, AIInsight=30d |
| **DS-3** | ✅ RESOLVED | 4 | File upload: 10MB max, jpg/png/webp/gif. Integrations: all "Coming Soon" (no fake OAuth). Deliverability: contextual (campaign detail + email settings). Saved Reports: card grid with edit-in-place. |
| **DS-4** | ✅ RESOLVED | 5 | Pipeline default stages (8 stages incl. Nurturing), pipeline types (Buyer/Seller/Rental/Commercial/General + Custom), follow-up delivery channels (resolved in 3.1), call logging outcomes (resolved in 3.2), lead field columns (deferred) |
| **DS-5** | Before Phase 3B | 5 | Import duplicate criteria, relationship types, lead assignment strategy, real-estate-specific fields, deduplication behavior |
| **DS-6** | ✅ RESOLVED | 5 | Editor: block-based + MJML (not WYSIWYG — clean HTML). Send-time: timezone + historical engagement. Conditions: all 4 (lead field, email opened, link clicked, time elapsed). Delay: minutes/hours/days/weeks + specific date/time. Retry: 1–3 retries, exponential backoff, notify user on failure (no silent skip). |
| **DS-7** | ✅ RESOLVED | 4 | Attribution: all 5 models (first-touch, last-touch, linear, time-decay, U-shaped). Scheduling: Daily/Weekly/Biweekly/Monthly/Quarterly/Yearly/Custom(N days), email PDF + in-app history. Goals: 7 metrics (leads, deals, revenue, conversion, calls, appointments, response time) + custom. Recurrence: same 7 patterns as scheduling. |
| **DS-8** | ✅ RESOLVED | 1 | Terms of Service: placeholder page at /terms-of-service, consent checkbox on registration |
| **DS-9** | ✅ RESOLVED | 3 | AI models: existing 6 tiers (gpt-5.1/5-mini/5-nano/5.2/5.2-pro/4o-mini). Personalization: system prompt + tone (6) + industry (8) + max tokens. Budget: $25 warning / $50 caution / $100 hard limit (adjustable). |
| **DS-10** | ✅ RESOLVED | 4 | Dialer/recording/voicemail: deferred (need Twilio Voice decisions). Document attachments: PDF, images, Office docs, 10MB, 20/lead. Cold Call Hub: smart queue + disposition + stats. |
| **DS-11** | ✅ RESOLVED | 13 | Help pages: wired HelpCenter search, real support tickets, video tutorials "Coming Soon", real documentation. Billing: merged 4-tab BillingPage. Pricing: 5 tiers (STARTER $49 → ENTERPRISE). Proration: Stripe `create_prorations`. Usage metering: hard caps via `enforcePlanLimit` middleware. Settings ownership + stub routes: deferred to Phase 10. |
| **DS-12** | ✅ RESOLVED | 9 | IntegrationsHub: keep "Coming Soon" labels. 501 stubs: leave in place. APIIntegrationsPage: implement real API key management. SocialMediaDashboard: rebuild with real UI + "Coming Soon" banner. ComplianceSettings: deferred — discuss when we reach it. Route redirects: all 3 confirmed. Campaign reports: merge into tabbed page. AI analytics: keep separate pages, add AIAnalytics to sidebar. Campaign types: merge into filter tabs on CampaignsList. |
| **DS-11B** | ✅ RESOLVED | 16 | ConfirmDialog: modal overlay, contextual labels, red destructive buttons, fade+scale animation. Breadcrumbs: below header, collapse 4+ depth, chevron separator, home icon. Page titles: `RealEstate Pro — Page Name`, generic labels, unread count in tab. WebSocket: silent reconnect, fetch missed notifications. Events: all 9 types, silent background refresh. Search: 300ms debounce, min 2 chars. Toasts: max 5, animated slide-out. Export: CSV+PDF, branded, all data. Voicemail: disabled+tooltip. Templates: 4-tier (System→Org→Team→Personal), categories, {{variables}} site-wide. Shortcuts: remove all system-wide. Sidebar nav: no new items — embed Calendar/Tasks/Activity widgets on Dashboard. Campaign chart: replace with pipeline funnel, move opens/clicks to Campaign Reports. Chunk errors: 3 silent retries then error card. |
| **DS-13** | ✅ RESOLVED | 12 | .md files: single timeline doc (`DEVELOPMENT_HISTORY.md`). Root scripts: keep `start-dev.sh`+`stop-dev.sh`, delete 13 test scripts + fix-frontend-enums.sh + 2 logs. Backend scripts: delete all 41 ad-hoc. Compiled .js tests: delete all 14. Mock data: delete `mockData.ts`+`mockData.config.ts`+`MockModeBanner.tsx`, keep `AnalyticsEmptyState.tsx`. Logger: custom thin wrapper `src/lib/logger.ts` (silent prod, logs dev). Unused deps: delete all 8 (redis, node-fetch, nodemon, reactflow, framer-motion, zod, @hookform/resolvers, react-hook-form). Misplaced deps: move `@types/multer`+`typescript` to devDeps, keep `@types/helmet`. Zod mismatch: moot (frontend zod removed). Dev pages: keep `DatabaseMaintenance`+`FeatureFlags`, delete `DemoDataGenerator`+`DebugConsole`+`RetryQueue`. Prisma backups: delete all 3. Build artifacts: remove from git tracking. |
| **DS-14** | ✅ PARTIALLY RESOLVED | 2 | Redis client consolidation: already ioredis-only (redis pkg removed in Phase 12 DS-13). Mobile nav items: deferred to Phase 14. |
| **DS-15** | ✅ RESOLVED | 4 | Onboarding tour: full site walkthrough covering every major section (Dashboard, Leads, Campaigns, Communication, Workflows, AI Hub, Analytics, Settings) with key actions highlighted. Notification sounds: ON by default, per-event granular settings so users toggle sound on/off for each notification type individually. Coming Soon pages: illustration + blurred preview hybrid — greyed/blurred mockup of upcoming feature with polished illustration, description, and optional "Notify me". CI/CD: Lint + TypeScript type-check + Build on every push/PR; E2E (Playwright) on PRs to main only. |

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
| 11 | 16 | ConfirmDialog style, breadcrumb placement/design, page title format, WebSocket reconnect/events, search debounce, toast limits, dashboard export, voicemail button, inbox templates hierarchy, keyboard shortcuts removal, sidebar nav strategy, campaign chart replacement, chunk error handling |
| 12 | 12 | .md grouping strategy, mock data, logger strategy, Zod version, dev pages, script deletion, deps removal, Prisma backups |
| 13 | 1 | Redis client consolidation — **RESOLVED** (already ioredis-only from Phase 12) |
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

## PHASE 2: FEATURE WIRING (Days 3–5) ✅ COMPLETE
*Connect frontend and backend for things that are half-built, so we can build on a solid base.*

> **DS-3 Decisions Resolved:**
> - **2.4 (File uploads):** 10 MB max, jpg/png/webp/gif allowed. Multer v2 disk storage.
> - **2.5 (Integrations):** All third-party integrations marked "Coming Soon" — no fake OAuth/sync.
> - **2.6 (Deliverability):** No standalone page — per-campaign stats on CampaignDetail + suppressed contacts in EmailConfiguration.
> - **2.7 (Saved Reports):** Already wired as card grid. Added edit-in-place (load into builder, update vs create).

| # | Task | Time | Status |
|---|------|------|--------|
| 2.1 | Fetch activities from API in LeadsList — fixed URL mismatch, wired real `activitiesApi.getLeadActivities()` with useQuery | 1.5 hr | ✅ |
| 2.2 | Integrate email service into AI functions — `sendEmail()` now calls real `sendRealEmail()` with HTML/tracking/suppression | 2 hr | ✅ |
| 2.3 | Integrate SMS service into AI functions — `sendSMS()` now calls real Twilio `sendRealSMS()`, limit raised to 1600 chars | 2 hr | ✅ |
| 2.4 | ~~⚠️~~ File upload for profile photos + business logos — created `upload.ts` multer config, wired avatar/logo endpoints + frontend file pickers | 2 hr | ✅ |
| 2.5 | ~~⚠️~~ Integration sync — replaced fake connected statuses with "Coming Soon" labels, sync endpoint returns 501, removed fake API keys section | 1 hr | ✅ |
| 2.6 | ~~⚠️~~ Deliverability — added per-campaign stats row (delivery/bounce/spam) to CampaignDetail + SuppressedContactsCard to EmailConfiguration | 2 hr | ✅ |
| 2.7 | ~~⚠️~~ Saved Reports UI — already wired (list/create/delete). Added edit-in-place: Edit button loads config into builder, Save/Update toggle, Cancel Edit | 1 hr | ✅ |
| 2.8 | Verified `/api/intelligence/*` prefix — already correctly used by IntelligenceInsights.tsx, no changes needed | 10 min | ✅ |

**Phase Total: ~12 hours (1.5 days) — ✅ COMPLETE**

### New Files Created in Phase 2
| File | Purpose |
|------|--------|
| `backend/src/config/upload.ts` | Multer v2 config — avatarUpload/logoUpload middlewares, disk storage with crypto filenames, 10MB limit, cleanup helpers |

### Files Modified in Phase 2
- `src/lib/api.ts` — Fixed `getLeadActivities` URL, added `deliverabilityApi`, added `uploadLogo` to `settingsApi`
- `src/pages/leads/LeadsList.tsx` — Real activities API with useQuery, loading/empty states, query invalidation
- `backend/src/services/ai-functions.service.ts` — Real email/SMS service integration
- `backend/src/controllers/settings/profile.controller.ts` — Multer file handling for avatar uploads
- `backend/src/controllers/settings/business.controller.ts` — New `uploadLogo()` function
- `backend/src/routes/settings.routes.ts` — Multer middleware on avatar/logo routes
- `backend/src/server.ts` — Static file serving for `/uploads`
- `src/pages/settings/ProfileSettings.tsx` — Real file picker + upload flow
- `src/pages/settings/BusinessSettings.tsx` — Logo upload + display
- `src/pages/integrations/IntegrationsHub.tsx` — "Coming Soon" honest status, dynamic stats
- `backend/src/controllers/integration.controller.ts` — Sync returns 501
- `src/pages/campaigns/CampaignDetail.tsx` — Deliverability stats row
- `src/pages/settings/EmailConfiguration.tsx` — SuppressedContactsCard component
- `src/pages/analytics/CustomReports.tsx` — Edit/Update flow for saved reports

---

## PHASE 3A: LEAD MANAGEMENT — CORE PIPELINE (Days 5–9) ✅ COMPLETE
*Core CRM feature — the heart of the product. Split into 3A (core) and 3B (import/merge/automation) with a checkpoint between them.*

> **DS-4 Decisions Resolved:**
> - **3.4 (Default pipeline stages):** New → Contacted → Nurturing → Qualified → Proposal → Negotiation → Closed Won / Closed Lost
> - **3.5 (Pipeline types):** Buyer, Seller, Rental, Commercial, General (5 types + Custom type for user-created)
> - **3.7 (Lead columns):** Deferred — will expand upon when we build the actual column customization UI

| # | Task | Time | Status |
|---|------|------|--------|
| 3.1 | ~~⚠️~~ Follow-up reminders — **DECIDED:** In-app + push notification + email channels. Created `FollowUpReminder` model, `reminder.routes.ts`, `reminderProcessor.ts` cron, `FollowUpReminders` component on lead detail, push subscription via service worker | 6 hr | ✅ |
| 3.2 | ~~⚠️~~ Call logging on lead detail — **DECIDED:** 9 outcomes (Answered, Voicemail, Left Message, No Answer, Busy, Wrong Number, Callback Scheduled, Not Interested, DNC Request). Made `vapiCallId` optional, added `CallOutcome` enum, `outcome`/`notes`/`followUpDate`/`calledById` fields. Created `call.routes.ts`, `call.controller.ts`, `LogCallDialog` component, wired into LeadDetail + CommunicationHistory | 4 hr | ✅ |
| 3.3 | Communication history tab on lead detail — **Already fully implemented:** `CommunicationHistory` component (504 lines) with merged messages + calls timeline, type filtering, search, stats summary, expandable cards, quick actions. Wired into LeadDetail with all props connected. | 0 hr | ✅ (already done) |
| 3.4 | ~~⚠️~~ Custom pipeline stages — **DECIDED:** 8 default stages (New → Contacted → Nurturing → Qualified → Proposal → Negotiation → Closed Won / Closed Lost). Added `NURTURING` to `LeadStatus` enum. Full stage CRUD: create, update, delete (with lead reassignment), reorder. Backend endpoints + `PipelineManager` UI component. | 4 hr | ✅ |
| 3.5 | ~~⚠️~~ Multiple pipelines — **DECIDED:** 5 types (Buyer, Seller, Rental, Commercial, General) + Custom. Added `COMMERCIAL` + `CUSTOM` to `PipelineType` enum. Relaxed unique constraint for multiple custom pipelines. Full pipeline CRUD: create, update, delete, duplicate. Updated default stage configs per type incl. new Commercial pipeline. | 6 hr | ✅ |
| 3.6 | Saved filter views on leads list — **Already fully implemented:** `SavedFilterViews` component with create/delete/load views, backend CRUD at `/api/saved-filters`, wired into LeadsList. | 0 hr | ✅ (already done) |
| 3.7 | ~~⚠️~~ Column customization on leads list — **DECIDED:** Deferred to expand upon later when we build the actual UI | 0 hr | 🔀 (deferred) |

**Phase 3A Total: ~30 hours (4 days) — ✅ COMPLETE**

### New Files Created in Phase 3A
| File | Purpose |
|------|--------|
| `src/components/leads/PipelineManager.tsx` | Full pipeline & stage management UI — create/edit/delete pipelines, add/edit/delete/reorder stages, color picker, duplicate pipeline, set default |

### Schema Changes in Phase 3A
| Change | Details |
|--------|---------|
| `PipelineType` enum | Added `COMMERCIAL`, `CUSTOM` values |
| `LeadStatus` enum | Added `NURTURING` value |
| `Pipeline` model | Relaxed `@@unique([organizationId, type])` to `@@index` — allows multiple pipelines of same type |

### Backend Files Modified in Phase 3A
- `backend/src/controllers/pipeline.controller.ts` — Added `createPipeline`, `updatePipeline`, `deletePipeline`, `createStage`, `updateStage`, `deleteStage`, `reorderStages`, `duplicatePipeline` handlers. Updated default stages with Nurturing. Added Commercial pipeline defaults.
- `backend/src/routes/pipeline.routes.ts` — Wired all new CRUD endpoints
- `backend/src/validators/lead.validator.ts` — Added `NURTURING` to status schema
- `backend/src/controllers/ai.controller.ts` — Added `NURTURING` to stage order arrays
- `backend/src/controllers/analytics.controller.ts` — Added `NURTURING` to stages array
- `backend/src/config/swagger.ts` — Added `NURTURING` to LeadStatus enum docs

### Frontend Files Modified in Phase 3A
- `src/lib/api.ts` — Added `createPipeline`, `updatePipeline`, `deletePipeline`, `duplicatePipeline`, `createStage`, `updateStage`, `deleteStage`, `reorderStages` to `pipelinesApi`. Added `COMMERCIAL` + `CUSTOM` to `PipelineData.type`.
- `src/pages/leads/LeadsPipeline.tsx` — Added "Manage" button with `PipelineManager` modal
- `src/pages/leads/LeadsList.tsx` — Added `nurturing`, `won`, `lost` to `getStatusVariant`
- `src/types/index.ts` — Added `nurturing` to Lead status union
- `src/components/campaigns/AdvancedAudienceFilters.tsx` — Added `nurturing` to status options
- `src/components/filters/AdvancedFilters.tsx` — Added `Nurturing`, `Negotiation` to status options
- `src/components/bulk/BulkActionsBar.tsx` — Added `Nurturing`, `Negotiation` to status options

> **Checkpoint:** Phase 3A complete. All core pipeline features working — pipeline CRUD, stage management, Kanban board, communication history, call logging, follow-up reminders, saved filter views. Ready to proceed to Phase 3B.

---

## PHASE 3B: LEAD MANAGEMENT — IMPORT, MERGE & AUTOMATION (Days 9–13)

| # | Task | Time | Status |
|---|------|------|--------|
| 3.8 | Lead import column mapping UI — 4-step wizard (Upload → Map → Duplicates → Results) | 4 hr | ✅ |
| 3.9 | Lead import duplicate detection — **DS-5.1: Email OR Phone OR (First+Last Name)** | 3 hr | ✅ |
| 3.10 | Lead import Excel/vCard support — CSV, XLSX, XLS, VCF parsers | 4 hr | ✅ |
| 3.11 | Lead merge field-level resolution — side-by-side picker UI with clickable field selection | 3 hr | ✅ |
| 3.12 | Lead merge backend — transfers ALL relations (notes, tasks, activities, messages, appointments, calls, follow-ups, workflows), field-level selection | 2 hr | ✅ |
| 3.13 | Related contacts on leads — **DS-5.2: DEFERRED** to a later phase | 3 hr | ⏭️ |
| 3.14 | Lead assignment — **DS-5.3: Manual only for now** (already had assignedToId + team member dropdowns; fixed BulkActionsBar hardcoded names) | 3 hr | ✅ |
| 3.15 | Real-estate-specific lead fields — **DS-5.4: Full 9 columns** (propertyType, transactionType, budgetMin/Max, preApprovalStatus, moveInTimeline, desiredLocation, bedsMin, bathsMin) + DB migration + create/edit/detail UI | 4 hr | ✅ |
| 3.16 | Intra-org lead deduplication tool — **DS-5.5: Review & merge manually** — server-side scanning endpoint + server-side merge with field resolution | 3 hr | ✅ |

**Phase 3B Total: ~29 hours (3.5 days)**

### DS-5 Decisions Resolved
| Decision | Choice |
|----------|--------|
| DS-5.1 Duplicate detection criteria | Email OR Phone OR (First+Last Name) — most aggressive matching |
| DS-5.2 Related contacts | **Deferred** — user wants explanation later; decided to skip for now |
| DS-5.3 Lead assignment strategy | Manual only for now, auto-assign later |
| DS-5.4 Real-estate fields | Full 9 columns added to schema |
| DS-5.5 Deduplication behavior | Review & merge manually (side-by-side comparison) |

### Files Created/Modified in Phase 3B
**New files:**
- `backend/src/services/import.service.ts` — CSV/Excel/vCard parsing, auto-column-mapping, duplicate detection, batch import
- `backend/src/types/vcf.d.ts` — TypeScript declarations for vcf module

**Modified files:**
- `backend/prisma/schema.prisma` — Added 9 RE-specific fields to Lead model
- `backend/src/controllers/lead.controller.ts` — `previewImport`, `checkImportDuplicates`, `mergeLeads`, `scanDuplicates` endpoints; RE fields in create
- `backend/src/routes/lead.routes.ts` — New import/merge/scan routes, expanded multer config
- `backend/src/validators/lead.validator.ts` — RE fields in create/update schemas, `fieldSelections` in merge schema
- `src/pages/leads/LeadsImport.tsx` — Complete rewrite: 4-step import wizard
- `src/pages/leads/LeadsMerge.tsx` — Complete rewrite: server-side scanning, field-level merge resolution UI
- `src/pages/leads/LeadCreate.tsx` — RE fields in form and submission
- `src/pages/leads/LeadDetail.tsx` — RE fields in detail view card and edit form
- `src/lib/api.ts` — `CreateLeadData` RE fields, `previewImport`, `checkImportDuplicates`, `scanDuplicates` methods
- `src/types/index.ts` — RE fields on Lead interface
- `src/components/bulk/BulkActionsBar.tsx` — Removed hardcoded assign names, simplified to direct button

> **Checkpoint:** Phase 3B complete. Lead import supports CSV/Excel/vCard with column mapping and duplicate detection. Merge has server-side field-level resolution. 9 RE-specific fields added across schema/API/UI. Server-side dedup scanning. Ready to proceed to Phase 4.

**Phase 3 Combined Total: ~59 hours (7.5 days)**

---

## PHASE 4: CAMPAIGNS & WORKFLOWS (Days 13–18)

| # | Task | Time | Status |
|---|------|------|--------|
| 4.1 | ✅ Block-based email editor + MJML compilation (clean, cross-client HTML — no WYSIWYG bloat) | 6 hr | ✅ |
| 4.2 | ✅ Responsive template preview (desktop/tablet/mobile viewport toggle + iframe rendering) | 3 hr | ✅ |
| 4.3 | ✅ Email attachment support (file upload, S3 storage, SendGrid integration) | 3 hr | ✅ |
| 4.4 | ✅ SMS STOP-word handling — TCPA compliance (inbound webhook, auto opt-out, STOP footer) | 1 hr | ✅ |
| 4.5 | ✅ CAN-SPAM compliance auto-insertion (unsubscribe link, physical address, List-Unsubscribe header) | 2 hr | ✅ |
| 4.6 | ✅ MMS support (media URL input, Twilio mediaUrl passthrough, preview) | 4 hr | ✅ |
| 4.7 | ✅ Per-recipient campaign activity log (CampaignLead rows, API endpoint, recipient timeline UI) | 3 hr | ✅ |
| 4.8 | ✅ Send-time optimization (timezone + historical engagement scoring, deferred sends, scheduler pickup) | 4 hr | ✅ |
| 4.9 | ✅ Campaign A/B auto-winner (scheduler evaluator, statistical significance, auto-deploy winner) | 2 hr | ✅ |
| 4.10 | ✅ Conditional branching (4 condition types: lead field, email opened, link clicked, time elapsed + visual config) | 6 hr | ✅ |
| 4.11 | ✅ Wait/delay steps (relative + absolute date/time, delay recovery on server restart) | 3 hr | ✅ |
| 4.12 | ✅ Webhook trigger (inbound webhook endpoint, auto-generated keys, signature verification) | 3 hr | ✅ |
| 4.13 | ✅ Workflow execution logs per step (WorkflowExecutionStep model, per-action logging, timeline UI) | 3 hr | ✅ |
| 4.14 | ✅ Retry config + user notification (1–3 retries, exponential backoff, notify on persistent failure) | 2 hr | ✅ |

**Phase Total: ~45 hours (5.5 days)**

---

## PHASE 5: ANALYTICS + CALENDAR (Days 18–22) ✅ COMPLETE

> **DS-7 Decisions Resolved:**
> - **5.1 (Attribution models):** All 5 — first-touch, last-touch, linear, time-decay, U-shaped. Engine calculates revenue attribution per model with `applyAttributionModel` helper.
> - **5.3 (Report scheduling):** Daily/Weekly/Biweekly/Monthly/Quarterly/Yearly/Custom(N days). Delivery: email PDF + saved in-app ReportHistory.
> - **5.4 (Goal types):** 7 metrics (LEADS_GENERATED, DEALS_CLOSED, REVENUE, CONVERSION_RATE, CALLS_MADE, APPOINTMENTS_SET, RESPONSE_TIME) + CUSTOM. Auto-calculated from live DB.
> - **5.8 (Recurrence patterns):** Same 7 patterns (DAILY/WEEKLY/BIWEEKLY/MONTHLY/QUARTERLY/YEARLY/CUSTOM). Optional end date + max occurrence count.

| # | Task | Time | Status |
|---|------|------|--------|
| 5.1 | ~~⚠️~~ Multi-touch attribution — **DECIDED:** All 5 models. Backend attribution engine + `AttributionReport.tsx` with model selector, revenue by channel/source charts, campaign table, conversion journeys | 5 hr | ✅ |
| 5.2 | Period-over-period comparison — Backend `getPeriodComparison` endpoint (auto-computes previous period) + `PeriodComparison.tsx` with KPI grid, change indicators, side-by-side bar chart | 4 hr | ✅ |
| 5.3 | ~~⚠️~~ Automated report scheduling — **DECIDED:** All 7 frequencies, email PDF + in-app. Backend controller + cron job (every 5 min, distributed lock) + real CRUD UI in `CustomReports.tsx` replacing fake static data | 4 hr | ✅ |
| 5.4 | ~~⚠️~~ Goal setting & tracking — **DECIDED:** 7 metrics + custom. Backend controller with `calculateMetricValue()` auto-refresh from live DB + `GoalTracking.tsx` with CRUD form, progress bars, active/completed sections | 4 hr | ✅ |
| 5.5 | Lead velocity metrics — Backend `getLeadVelocity` endpoint (avg days-to-close, stage durations, monthly velocity) + `LeadVelocity.tsx` with KPI cards and charts | 3 hr | ✅ |
| 5.6 | Source ROI calculation — Backend `getSourceROI` endpoint (revenue/conversion per source) + `SourceROI.tsx` with summary cards, horizontal bar chart, detailed table | 3 hr | ✅ |
| 5.7 | ICS export / "Add to Calendar" — Backend `GET /api/appointments/:id/ics` generating valid ICS files with VEVENT + VALARM. "Add to Calendar" download button added to `CalendarPage.tsx` event modal | 2 hr | ✅ |
| 5.8 | ~~⚠️~~ Recurring follow-ups — **DECIDED:** All 7 patterns + custom N days. Zod schemas updated, `reminderProcessor.ts` spawns next occurrence on fire (with end date + max count checks), `FollowUpReminders.tsx` has recurrence pattern selector UI | 3 hr | ✅ |
| 5.9 | Follow-up analytics — Backend `getFollowUpAnalytics` endpoint (completion rate, response time, priority breakdown, channel usage) + `FollowUpAnalytics.tsx` with KPI cards, status pie, channel bar, monthly trend line | 3 hr | ✅ |

**Phase Total: ~31 hours (4 days) — ✅ COMPLETE**

### New Files Created in Phase 5
| File | Purpose |
|------|---------|
| `src/pages/analytics/AttributionReport.tsx` | Multi-touch attribution UI — 5-model selector, revenue charts, campaign table, conversion journeys |
| `src/pages/analytics/PeriodComparison.tsx` | Period-over-period comparison — KPI grid with change indicators, side-by-side bar chart |
| `src/pages/analytics/GoalTracking.tsx` | Goal CRUD — create/edit form, metric type selector, progress bars, active + completed sections |
| `src/pages/analytics/LeadVelocity.tsx` | Pipeline velocity — avg days-to-close, stage duration chart, monthly velocity line chart |
| `src/pages/analytics/SourceROI.tsx` | Revenue per lead source — summary cards, horizontal bar chart, source performance table |
| `src/pages/analytics/FollowUpAnalytics.tsx` | Follow-up metrics — completion rate, response time, status pie, channel usage, trend chart |
| `backend/src/controllers/reportSchedule.controller.ts` | CRUD for automated report schedules with `calculateNextRun()` helper |
| `backend/src/routes/reportSchedule.routes.ts` | Report schedule API routes |
| `backend/src/jobs/reportScheduler.ts` | Cron job (every 5 min) — finds due schedules, generates report data, stores in ReportHistory |
| `backend/src/controllers/goal.controller.ts` | Goal CRUD with `calculateMetricValue()` auto-refresh from live DB data |
| `backend/src/routes/goal.routes.ts` | Goal API routes |

### Schema Changes in Phase 5
| Change | Details |
|--------|---------|
| `RecurrencePattern` enum | DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM |
| `GoalMetricType` enum | LEADS_GENERATED, DEALS_CLOSED, REVENUE, CONVERSION_RATE, CALLS_MADE, APPOINTMENTS_SET, RESPONSE_TIME, CUSTOM |
| `GoalPeriod` enum | WEEKLY, MONTHLY, QUARTERLY, YEARLY |
| `ReportSchedule` model | Linked to SavedReport/User/Org, frequency/timing/recipients/nextRunAt |
| `ReportHistory` model | Stores generated report data + delivery status |
| `Goal` model | Metric type, target/current values, period, progress, completion tracking |
| `FollowUpReminder` model | Added: isRecurring, recurrencePattern, recurrenceInterval, recurrenceEndDate, recurrenceCount, occurrenceNumber, parentReminderId |

### Backend Files Modified in Phase 5
- `backend/src/controllers/analytics.controller.ts` — Added 6 new endpoints: getAttributionReport, getLeadTouchpoints, getPeriodComparison, getLeadVelocity, getSourceROI, getFollowUpAnalytics
- `backend/src/routes/analytics.routes.ts` — 6 new routes with cacheResponse(300)
- `backend/src/controllers/appointment.controller.ts` — Added `exportAppointmentICS` with ICS generation
- `backend/src/routes/appointment.routes.ts` — Added GET /:id/ics route
- `backend/src/controllers/reminder.controller.ts` — Added recurrence fields to Zod schemas and create/update handlers
- `backend/src/jobs/reminderProcessor.ts` — Added `spawnNextRecurrence()` and `calculateNextDueDate()` for recurring follow-ups
- `backend/src/server.ts` — Mounted reportSchedule + goal routes, wired reportScheduler cron lifecycle
- `backend/prisma/schema.prisma` — All new models, enums, and FollowUpReminder recurrence fields

### Frontend Files Modified in Phase 5
- `src/App.tsx` — Added lazy imports + routes for AttributionReport, GoalTracking, LeadVelocity, SourceROI, FollowUpAnalytics, PeriodComparison
- `src/lib/api.ts` — Added analyticsApi methods (6), reportSchedulesApi, goalsApi, appointmentsApi.exportICS, recurrence fields on FollowUpReminder/CreateReminderData
- `src/pages/analytics/CustomReports.tsx` — Replaced fake scheduled reports with real `ScheduledReportsSection` component using reportSchedulesApi CRUD
- `src/pages/calendar/CalendarPage.tsx` — Added "Add to Calendar" ICS download button in event modal
- `src/components/leads/FollowUpReminders.tsx` — Added recurrence pattern selector UI (toggle, pattern dropdown, custom interval, end date, max count)

> **Checkpoint:** Phase 5 complete. All analytics features (attribution, comparison, velocity, ROI, follow-up analytics), report scheduling with cron, goal tracking with auto-metric calculation, ICS export, and recurring follow-ups are implemented and verified. Both frontend (Vite build) and backend (tsc) compile cleanly. Ready to proceed to Phase 6.

---

## PHASE 6: AUTH FEATURES (Days 22–23) ✅ COMPLETE

| # | Task | Time | Status |
|---|------|------|--------|
| 6.1 | MFA challenge step on login (backend 2FA already built with speakeasy) | 2 hr | ✅ |
| 6.2 | Password strength indicator | 1 hr | ✅ |
| 6.3 | Email verification on register | 3 hr | ✅ |
| 6.4 | Terms of Service checkbox on register — placeholder `/terms-of-service` page | 30 min | ✅ |
| 6.5 | Add proactive JWT refresh before expiry + idle timeout/session expiry warning | 2 hr | ✅ |
| 6.6 | Implement "Remember me" on login — short (1d) vs long (7d) refresh token expiry | 1 hr | ✅ |
| 6.7 | Wire SecuritySettings features: 2FA setup wizard with QR, session revocation, sign-out-all, account deletion | 4 hr | ✅ |
| 6.8 | Fix ForgotPassword/ResetPassword double-layout | 20 min | ✅ |
| 6.9 | Fix dual token storage sync — consolidated to localStorage (single source of truth) | 30 min | ✅ |

**Phase Total: ~14.5 hours (2 days)**

> **Checkpoint:** Phase 6 complete. All auth features implemented: MFA login flow with pending token + TOTP verification, password strength indicator component, email verification (send/verify/resend), ToS consent with placeholder page, proactive JWT refresh (useSessionManager hook) with 30-min idle timeout + warning at 25 min, remember-me with short/long token expiry, fully wired SecuritySettings (2FA setup wizard with QR code, real sessions from API, session revocation, terminate-all, account deletion with password confirmation), double-layout fix, and token storage consolidation. Both frontend (tsc) and backend (tsc) compile cleanly with zero errors. Ready to proceed to Phase 7.

---

## PHASE 7: AI FEATURES (Days 23–26)
*Uses your OpenAI key as default. Teams/orgs can optionally provide their own key and personalize their AI.*

| # | Task | Time | Status |
|---|------|------|--------|
| 7.1 | AI model selection — 6 model tiers (gpt-5.1, gpt-5-mini, gpt-5-nano, gpt-5.2, gpt-5.2-pro, gpt-4o-mini), selectable per org via OrgAISettings page | 4 hr | ✅ |
| 7.2 | Team/org custom API key support — encrypted key storage, masked display, toggle for own-key mode. Bypasses tier limits when enabled | 3 hr | ✅ |
| 7.3 | AI personalization per team — system prompt, tone (6 options), industry context (8 verticals), max tokens slider. OrgAISettings page at /ai/org-settings | 4 hr | ✅ |
| 7.4 | AI cost tracking dashboard — per-model and per-user cost breakdown, cost history bar chart, budget progress bar. AICostDashboard at /ai/cost-dashboard | 3 hr | ✅ |
| 7.5 | AI insight feedback loop — thumbs up/down on assistant chat messages (AIAssistant.tsx), feedback stored on ChatMessage + AIInsight models | 2 hr | ✅ |
| 7.6 | AI-powered lead enrichment — "AI Enrich" button on LeadDetail, GPT infers missing fields from lead context, selective apply | 4 hr | ✅ |
| 7.7 | AI cost/budget alerts — $25 warning / $50 caution / $100 hard limit (configurable), hard limit enforced in aiUsageLimit middleware (429), budget section in OrgAISettings | 2 hr | ✅ |
| 7.8 | Verified `aiUsageLimit.ts` middleware is wired to ALL AI generation routes — already fully operational | 20 min | ✅ |

**Phase Total: ~22.5 hours (3 days)**

> **Note:** AI response streaming (SSE) is already implemented in `ai.controller.ts` with proper `text/event-stream` headers — no work needed.

> **Checkpoint:** Phase 7 complete. All 8 tasks done. Backend: 11 new controller endpoints, 5 Zod validators, 10 new routes, schema additions (5 Org fields, 4 ChatMessage fields, 3 AIInsight fields), budget hard-limit enforcement in aiUsageLimit middleware. Frontend: OrgAISettings page (/ai/org-settings) with model picker, API key management, personalization, and budget configuration; AICostDashboard page (/ai/cost-dashboard) with cost charts, per-model/per-user breakdown, and budget progress bar; thumbs up/down feedback on chatbot messages; AI Enrich button on LeadDetail. DS-9 resolved: models=existing 6 tiers, tone/industry/prompt personalization, budgets $25/$50/$100 (adjustable). Both frontend and backend compile cleanly with zero errors. Ready to proceed to Phase 8.

## PHASE 8: TELEPHONY & REAL-TIME (Days 26–29)

> **DS-10 Decisions Resolved:**
> - **8.1/8.2/8.3 (Power dialer, recording, voicemail):** 🔀 Deferred — requires Twilio Voice/VoIP integration decisions. Will revisit when telephony provider is finalized.
> - **8.5 (Document attachments):** PDF, images (jpg/png/webp), Office docs (.doc/.docx/.xls/.xlsx), 10 MB max per file, 20 files max per lead.
> - **8.6 (Cold Call Hub):** Smart queue with priority scoring (callback boost +200, never-contacted +50, stale 7d+ +30), 9 disposition outcomes, auto-DNC flagging, native `tel:` dialer integration.

| # | Task | Time | Status |
|---|------|------|--------|
| 8.1 | ~~⚠️~~ Phone campaigns / power dialer — **DEFERRED:** Needs Twilio Voice integration decisions | 0 hr | 🔀 Deferred |
| 8.2 | ~~⚠️~~ Call recording & transcription — **DEFERRED:** Needs telephony provider decisions | 0 hr | 🔀 Deferred |
| 8.3 | ~~⚠️~~ Voicemail drop — **DEFERRED:** Needs telephony provider decisions | 0 hr | 🔀 Deferred |
| 8.4 | Real-time WebSocket push (new leads, messages, notifications — replace polling) — `useRealtimeUpdates` hook wired in MainLayout, subscribes to `lead:update`, `campaign:update`, `workflow:event`, `message:update`. Backend emitters called from lead/campaign/workflow/webhook controllers. | 4 hr | ✅ |
| 8.5 | ~~⚠️~~ Document attachments on leads — **DECIDED:** PDF, images, Office docs, 10 MB max, 20 files/lead. `LeadDocument` model, `documentUpload` multer middleware, upload/list/delete endpoints on `/api/leads/:id/documents`, Documents tab on LeadDetail with upload/download/delete | 3 hr | ✅ |
| 8.6 | Cold Call Hub — rebuilt `CallCenter.tsx` into productivity workspace: smart call queue (priority algorithm: callback +200, never-contacted +50, stale 7d+ +30, excludes DNC/won/lost/called-in-24h, top 25 leads), lead context panel (full info + property interests + budget + last call + callback badge), 5-metric stats dashboard (total/connected/rate/talk-time/avg-duration), quick disposition buttons (9 outcomes with color coding), auto-DNC flagging on DNC_REQUEST, call timer with duration tracking, call notes textarea, recent calls history (10 latest), skip/next navigation with auto-advance after disposition | 6 hr | ✅ |

**Phase Total: ~13 hours (2 days) — ✅ COMPLETE**

### New Files Created in Phase 8
| File | Purpose |
|------|--------|
| `backend/src/controllers/document.controller.ts` | Lead document upload/list/delete endpoints (max 20/lead, 10 MB/file) |
| `src/hooks/useRealtimeUpdates.ts` | WebSocket subscription hook — listens for lead/campaign/workflow/message events, auto-invalidates React Query caches |

### Schema Changes in Phase 8
| Change | Details |
|--------|---------|
| `LeadDocument` model | id, leadId, organizationId, uploadedById, filename, storagePath, mimeType, size, description, createdAt |
| `Lead` relation | Added `documents LeadDocument[]` |
| `User` relation | Added `uploadedDocuments LeadDocument[] @relation("LeadDocumentUploader")` |
| `Organization` relation | Added `LeadDocument LeadDocument[]` |

### Backend Files Modified in Phase 8
- `backend/src/controllers/call.controller.ts` — Added `getCallQueue` (smart prioritized queue with priority scoring algorithm), `getTodayStats` (per-user daily stats with connection rate), `getCallStats` (org/lead aggregate stats by outcome/direction). DNC auto-flagging on DNC_REQUEST disposition.
- `backend/src/routes/call.routes.ts` — Added `/queue`, `/today-stats`, `/stats` GET routes
- `backend/src/routes/lead.routes.ts` — Added document routes: `POST/GET /:id/documents`, `DELETE /:id/documents/:documentId`
- `backend/src/config/upload.ts` — Added `documentUpload` multer middleware (PDF, images, Office docs, 10 MB max, 5 files per request)
- `backend/src/config/socket.ts` — Added emit helpers: `emitToUser`, `emitToOrg`, `pushNotification`, `pushCampaignUpdate`, `pushWorkflowEvent`, `pushLeadUpdate`, `pushMessageUpdate`

### Frontend Files Modified in Phase 8
- `src/pages/communication/CallCenter.tsx` — Complete rewrite: Cold Call Hub with smart queue, lead context panel, disposition buttons, real stats
- `src/pages/leads/LeadDetail.tsx` — Added Documents tab with `LeadDocumentsTab` component (upload/download/delete)
- `src/lib/api.ts` — Added `documentsApi` (getDocuments, uploadDocuments, deleteDocument), `callsApi.getQueue`, `callsApi.getTodayStats`
- `src/hooks/useRealtimeUpdates.ts` — WebSocket event subscriptions for real-time UI updates (leads, campaigns, workflows, messages)
- `src/components/layout/MainLayout.tsx` — Wired `useRealtimeUpdates()` for app-wide real-time events

> **Checkpoint:** Phase 8 complete. 3 tasks done (Cold Call Hub, WebSocket push, document attachments), 3 deferred (power dialer, recording, voicemail — need Twilio Voice decisions). **Cold Call Hub:** Full productivity workspace — smart queue with priority scoring algorithm (callback +200, never-contacted +50, stale +30, excludes DNC/won/lost/called-in-24h), lead context panel with property interests + budget + callback badge, 5-metric stats dashboard (total/connected/rate/talk-time/avg-duration), 9 color-coded disposition buttons with auto-advance, call timer + notes, auto-DNC flagging, recent calls history. **Document attachments:** `LeadDocument` model, multer upload (PDF/images/Office, 10 MB, 20/lead), upload/list/delete API + Documents tab on LeadDetail. **WebSocket:** Socket.io emit helpers (`emitToUser`/`emitToOrg`/`pushNotification`/`pushCampaignUpdate`/`pushWorkflowEvent`/`pushLeadUpdate`/`pushMessageUpdate`), `useRealtimeUpdates` hook in MainLayout auto-invalidates React Query caches on real-time events. Both frontend and backend compile cleanly with zero errors. DS-10 resolved. Ready to proceed to Phase 9.

---

> **MILESTONE: All features built — Day 28**

---

## PHASE 9: ADMIN, TEAM, BILLING & SUBSCRIPTION (Days 29–35) ✅ COMPLETE
*Admin panel, help system, billing/subscription with Stripe integration, plan limits enforcement.*

> **DS-11 Decisions Resolved:**
> - **9.4 (Audit trail):** 27-action AuditLog system (login/logout/CRUD/settings/export/bulk/maintenance)
> - **9.5 (Backup):** Per-org JSON export with real PG stats, backup history, download endpoint
> - **9.7 (Help pages):** Kept current design; wired HelpCenter search to docs API
> - **9.7b (Support tickets):** Real backend CRUD with SupportTicket + TicketMessage models
> - **9.7c (Video tutorials):** Converted to "Coming Soon" placeholder (70 lines)
> - **9.7d (Documentation):** Real backend with DocumentationArticle model, API-backed search
> - **9.10 (Billing structure):** Merged into 4-tab BillingPage (Overview/Plans/Invoices/Payment)
> - **9.13 (Stripe stubs):** Full Stripe implementation — checkout, portal, webhooks, invoices
> - **9.15 (Pricing):** 5 tiers — STARTER($49), PROFESSIONAL($119), ELITE($179), TEAM($799), ENTERPRISE(Contact Us)
> - **9.18 (Usage metering):** Hard caps enforced at API level via `enforcePlanLimit` middleware + monthly email/SMS limits
> - **9.20 (Proration):** `create_prorations` behavior on Stripe subscription updates (immediate proration)

### 9A: Admin Panel

| # | Task | Time | Status |
|---|------|------|--------|
| 9.1 | Create `SystemSettings` Prisma model — currently stored in-memory, lost on every restart | 1 hr | 🔀 Phase 10 |
| 9.2 | Wire `ServiceConfiguration` page to real settings API | 2 hr | 🔀 Phase 10 |
| 9.3 | Wire `SystemSettings` page — remaining sections that don't save | 1.5 hr | 🔀 Phase 10 |
| 9.4 | Admin audit trail — 27-action `AuditLog` model + `AuditAction` enum, `audit.service.ts`, `audit.routes.ts`, `AuditTrail.tsx` page at `/admin/audit` | 4 hr | ✅ |
| 9.5 | Data backup & restore — real JSON org export, `DataBackup` model, backup history with download, live PG stats (table sizes, connection pool) | 4 hr | ✅ |
| 9.6 | Add `createdById` audit trail to `Task`, `Segment`, `Workflow`, `Tag` models | 2 hr | 🔀 Phase 10 |
| 9.7 | HelpCenter search wiring — `useQuery` for categories, search navigation to docs | 1.5 hr | ✅ |
| 9.7b | Support ticket system — full CRUD backend (`support.routes.ts`), `SupportTicket` + `TicketMessage` models, API-backed UI | 6 hr | ✅ |
| 9.7c | Video tutorial library — replaced 368-line mock with 70-line "Coming Soon" placeholder | 30 min | ✅ |
| 9.7d | Documentation pages — `DocumentationArticle` model, `docs.routes.ts` (public), API-backed search/browse UI | 4 hr | ✅ |
| 9.7e | HelpCenter search — wired into docs API with navigation | 1 hr | ✅ |

### 9B: Team Management

| # | Task | Time | Status |
|---|------|------|--------|
| 9.8 | Send real invitation emails on team invite | 2 hr | 🔀 Phase 10 |
| 9.9 | Fix settings ownership — move to Organization-level | 4 hr | 🔀 Phase 10 |

### 9C: Billing & Subscription

| # | Task | Time | Status |
|---|------|------|--------|
| 9.10 | Billing merge — 4-tab `BillingPage` (Overview + Plans + Invoices + Payment), all routes point to consolidated page | 3 hr | ✅ |
| 9.11 | Invoices — wired to Stripe API with DB fallback (covered by 9.13) | 30 min | ✅ |
| 9.12 | Fake setTimeout removal — verified: no fake patterns remain, all billing files use real API calls | 15 min | ✅ |
| 9.13 | Stripe implementation — checkout session creation, portal session, webhook handler (checkout.session.completed, subscription.updated/deleted, invoice.payment_failed), invoices from Stripe API | 4 hr | ✅ |
| 9.14 | Billing logic extraction — billing routes already properly structured inline | 40 min | 🔀 Phase 14 |
| 9.15 | Pricing tiers — 5-tier `PLAN_FEATURES` + `AI_PLAN_LIMITS` + `STRIPE_PRICE_IDS` in `config/subscriptions.ts`, removed FREE tier, all frontend refs updated | 4 hr | ✅ |
| 9.16 | Stripe billing portal — wired via `POST /api/billing/portal` (covered by 9.13) | 2 hr | ✅ |
| 9.17 | Stripe payment methods — wired via `GET /api/billing/payment-methods` + portal (covered by 9.13) | 2 hr | ✅ |
| 9.17b | Payment methods write ops — delegated to Stripe billing portal (portal handles add/edit/delete) | 2 hr | ✅ |
| 9.17c | Fix `InvoiceDetail.tsx` — hardcoded fake data | 2 hr | 🔀 Phase 10 |
| 9.17d | Missing Stripe methods — `createCheckoutSession`, `createBillingPortal`, `updateSubscription` all implemented | 2 hr | ✅ |
| 9.18 | Usage metering hard caps — `enforcePlanLimit` middleware on lead/campaign/workflow/pipeline/team-invite routes, `checkMonthlyMessageLimit` for email/SMS in campaign executor, API error message surfacing in frontend | 3 hr | ✅ |
| 9.19 | Real Stripe invoices — `GET /api/billing/invoices` fetches from Stripe if configured (covered by 9.13) | 2 hr | ✅ |
| 9.20 | Proration config — verified `proration_behavior: 'create_prorations'` in `stripe.service.ts` `updateSubscription()`, checkout flow handles both new subs (Checkout) and upgrades (in-place update) | 3 hr | ✅ |
| 9.21 | Subscription tier sync — consistency checks | 2 hr | 🔀 Phase 10 |

**Phase Total: ~55 hours (7 days) — ✅ COMPLETE (18/27 tasks done, 9 deferred)**

### New Files Created in Phase 9
| File | Purpose |
|------|--------|
| `backend/src/services/audit.service.ts` | Audit logging service with `logAudit()` helper + request context extraction |
| `backend/src/routes/audit.routes.ts` | Admin audit trail API (list with filters, export) |
| `backend/src/routes/support.routes.ts` | Support ticket CRUD with auth |
| `backend/src/routes/docs.routes.ts` | Documentation articles API (public, no auth) |
| `backend/src/middleware/planLimits.ts` | Plan usage limit enforcement middleware (`enforcePlanLimit`, `checkMonthlyMessageLimit`) |
| `backend/src/config/subscriptions.ts` | 5-tier plan config (PLAN_FEATURES, AI_PLAN_LIMITS, STRIPE_PRICE_IDS, utility functions) |
| `src/pages/admin/AuditTrail.tsx` | Admin audit trail UI at `/admin/audit` |
| `src/pages/billing/BillingPage.tsx` | Consolidated 4-tab billing page (Overview/Plans/Invoices/Payment) |

### Schema Changes in Phase 9
| Change | Details |
|--------|--------|
| `AuditLog` model | User actions audit trail with 27 `AuditAction` enum values |
| `SupportTicket` + `TicketMessage` models | Help desk ticket system |
| `DocumentationArticle` model | Backend-driven documentation |
| `DataBackup` model | Backup history with Organization relation |
| `SubscriptionTier` enum | Changed to STARTER \| PROFESSIONAL \| ELITE \| TEAM \| ENTERPRISE (removed FREE) |

### Key Backend Changes in Phase 9
- `billing.routes.ts` — Full rewrite: Stripe checkout, portal, invoices, payment methods
- `webhook.routes.ts` — Stripe webhook handler (4 event types)
- `campaign-executor.service.ts` — Monthly email/SMS limit check before sending
- `lead.routes.ts`, `campaign.routes.ts`, `workflow.routes.ts`, `pipeline.routes.ts`, `team.routes.ts` — `enforcePlanLimit` middleware added
- `src/lib/api.ts` — API error message surfacing (server message → Error.message)

> **Checkpoint:** Phase 9 complete. Billing fully wired to Stripe (checkout, portal, webhooks). 5-tier pricing enforced at API level for leads, campaigns, workflows, pipelines, users, monthly emails, and SMS. Audit trail, support tickets, documentation, and backup all backed by real database. Ready to proceed to Phase 10.

---

## PHASE 10: FIX BROKEN PAGES + CONSOLIDATION (Days 37–39)
*Now that everything is built, fix dishonest pages and consolidate overlapping features.*

> **DS-12 Decisions Resolved:**
> - **10.1 (IntegrationsHub):** Keep "Coming Soon" labels — already honest from Phase 2, no changes needed.
> - **10.4 (SecuritySettings):** Already wired to real API in Phase 6 (task 6.7) — sessions, revocation, terminate-all, 2FA all working.
> - **10.6 (501 stubs):** Leave 501 stubs in place — they serve as clear documentation of what's not yet built.
> - **10.6b (APIIntegrationsPage):** Implement real API key management — generate/revoke keys, store hashed in DB, audit log, masked display with copy-to-clipboard.
> - **10.6e (SocialMediaDashboard):** Rebuild with real UI framework + "Coming Soon" banner — proper layout/components ready for API wiring later.
> - **10.6f (ComplianceSettings):** Deferred — stop and discuss when we reach this task. Compliance too important to rush.
> - **10.7 (Route redirects):** All 3 confirmed: `/analytics/report-builder` → `/analytics/custom-reports`, `/communication` → `/communication/inbox`, `/settings/team` → `/admin/team`.
> - **10.8 (Campaign reports):** Merge CampaignReports + CampaignAnalytics into one tabbed page ("Overview" + "Detailed Reports").
> - **10.9 (AI analytics):** Keep as separate pages (AIAnalytics=technical metrics, IntelligenceInsights=business intelligence, PredictiveAnalytics=forecasts). Fix: add AIAnalytics (`/ai/analytics`) to sidebar sub-menu.
> - **10.10 (Campaign types):** Merge EmailCampaigns/SMSCampaigns/PhoneCampaigns into filter tabs on CampaignsList ("All | Email | SMS | Phone"). Preserve type-specific UI. Old URLs redirect to `/campaigns?type=email` etc.

### 10A: Fix Broken/Fake Pages

| # | Task | Time | Status |
|---|------|------|--------|
| 10.1 | ~~⚠️~~ **Integrations Hub** — **DECIDED:** Keep "Coming Soon" labels (already done in Phase 2, task 2.5). Verified: disabled buttons, honest status, no fake OAuth. | 0 min | ✅ |
| 10.2 | Fix CampaignsList error swallowing — removed `catch { return null }`, now throws error + added `isError` state with error UI | 30 min | ✅ |
| 10.3 | Fix 38+ silent `catch {}` blocks — added `console.error` to 38 catch blocks across 24 frontend + 14 backend files. Left 22 intentionally-silent catches (JSON parsing, cross-origin, date utilities, sessionStorage, JWT decode). | 3 hr | ✅ |
| 10.4 | ~~⚠️~~ SecuritySettings — **Already done in Phase 6** (task 6.7). Verified: real `authApi.getSessions()`, session revocation, terminate-all, 2FA setup — all wired to real API. | 0 min | ✅ |
| 10.5 | Replace all hardcoded placeholder URLs (`crm.yourcompany.com`, `Your Company Name` in InvoiceDetail, `user@example.com` in Sidebar/Header, `https://api.masterrealestatepro.com/v1` in APIIntegrationsPage, etc.) with config-driven values — created `src/lib/appConfig.ts`, updated 7 files | 1 hr | ✅ |
| 10.6 | ~~⚠️~~ Stub 501 backend routes — **DECIDED:** Leave 501 stubs in place (clear documentation of unbuilt features, obvious vs. silent failure) | 0 min | ✅ |
| 10.6b | ~~⚠️~~ **APIIntegrationsPage** — **DECIDED:** Implemented real API key management — `APIKey` Prisma model with SHA-256 hashed keys, generate/revoke/list endpoints, audit logging, masked display with copy-to-clipboard, removed all fake data | 4 hr | ✅ |
| 10.6c | Fix `feature-flags` stored only in localStorage — moved to backend DB with `FeatureFlag` Prisma model, CRUD API at `/api/admin/feature-flags`, org-scoped with auto-seed of 6 defaults, rewrote FeatureFlags.tsx to use React Query | 1.5 hr | ✅ |
| 10.6d | Fix `email-template-settings` stored in localStorage in `EmailTemplatesLibrary.tsx` — moved to `emailTemplateDefaults` JSON column on Organization model, new GET/PUT endpoints at `/api/settings/email-template-defaults`, rewrote component to use React Query | 1 hr | ✅ |
| 10.6e | ~~⚠️~~ **SocialMediaDashboard** — **DECIDED:** Rebuilt with real UI framework + "Coming Soon" banner. Removed fake API calls/state/hardcoded data. Clean layout with platform cards (features list, disabled Connect), planned features grid, placeholder dashboard preview. Ready for API wiring when platforms are connected. | 2 hr | ✅ |
| 10.6f | ~~⚠️~~ **ComplianceSettings** — **DECIDED:** Deferred — stop and discuss when we reach this task. Compliance too important to rush. | 0 min | ⏭️ |

### 10B: Consolidate Overlapping Pages

| # | Task | Time | Status |
|---|------|------|--------|
| 10.7 | ~~⚠️~~ Fix duplicate routes — **DECIDED:** All 3 redirects confirmed and implemented with `<Navigate replace>`: `/analytics/report-builder` → `/analytics/custom-reports`, `/communication` → `/communication/inbox`, `/settings/team` → `/admin/team`. Also updated Sidebar to link directly to `/communication/inbox`. | 30 min | ✅ |
| 10.8 | ~~⚠️~~ Merge `CampaignReports` + `CampaignAnalytics` into 1 tabbed page — **DONE:** "Overview" tab (analytics API — performance trend, comparison table, best times, top content) + "Detailed Reports" tab (campaign list — stat cards, per-campaign detail cards, funnel, leaderboards). One URL `/campaigns/reports`. `/analytics/campaigns` redirects. Removed `CampaignAnalytics` lazy import. | 2 hr | ✅ |
| 10.9 | ~~⚠️~~ AI Analytics pages — **DECIDED:** Keep as separate pages (each distinct purpose). **Fix:** Added `AIAnalytics` (`/ai/analytics`) to sidebar AI Hub sub-menu with `Activity` icon. | 30 min | ✅ |
| 10.10 | ~~⚠️~~ Campaign type pages → filter tabs — **DONE:** Merged EmailCampaigns/SMSCampaigns/PhoneCampaigns into "All | Email | SMS | Phone" type filter tabs on CampaignsList. Added `typeFilter` state driven by `?type=` URL search params. Phone tab shows Coming Soon banner. CampaignsSubNav updated to use query params. Old URLs (`/campaigns/email`, `/campaigns/sms`, `/campaigns/phone`) redirect via `<Navigate>`. Removed 3 lazy imports from App.tsx. | 3 hr | ✅ |

**Phase Total: ~19.5 hours (2.5 days) — ✅ COMPLETE**

### Files Modified in Phase 10 (10.9–10.10)

**10.9 — AI Analytics sidebar link:**
- `src/components/layout/Sidebar.tsx` — Added `Activity` icon import, added `{ name: 'AI Analytics', href: '/ai/analytics', icon: Activity }` to AI Hub children array

**10.10 — Campaign type filter tabs:**
- `src/pages/campaigns/CampaignsList.tsx` — Added `useSearchParams` for `?type=` URL param, `typeFilter` state, type filter pill tabs (All Types | Email | SMS | Phone) with campaign counts, Phone Coming Soon banner, type-aware campaign filtering
- `src/components/campaigns/CampaignsSubNav.tsx` — Changed Email/SMS/Phone nav links from `/campaigns/email` etc. to `/campaigns?type=email` etc., updated `isActive()` to handle query params
- `src/App.tsx` — Replaced 3 lazy component imports + route definitions for EmailCampaigns/SMSCampaigns/PhoneCampaigns with `<Navigate>` redirects to `/campaigns?type=email` etc.

> **Checkpoint:** Phase 10 complete. All non-deferred tasks done. IntegrationsHub honest (Phase 2). CampaignsList error handling fixed. 38 silent catches fixed. SecuritySettings wired (Phase 6). Hardcoded URLs replaced with appConfig. 501 stubs left in place. API key management real. Feature flags in DB. Email template settings in DB. SocialMediaDashboard rebuilt. Route redirects done. CampaignReports merged. AIAnalytics in sidebar. Campaign type pages merged into filter tabs. ComplianceSettings deferred. Ready to proceed to Phase 11.

### Files Modified in Phase 10 (so far)

**10.2 — CampaignsList error fix:**
- `src/pages/campaigns/CampaignsList.tsx` — Replaced `catch { return null }` with `catch (error) { console.error(...); throw error }`, added `isError` destructuring + error state UI

**10.3 — Silent catch blocks fixed (38 blocks across 28 files):**

Frontend files (24 catches fixed):
- `src/components/filters/AdvancedFilters.tsx` (2) — tag/member fetch fallbacks
- `src/components/email/EmailBlockEditor.tsx` (1) — email compile fallback
- `src/lib/pushNotifications.ts` (1) — subscription check
- `src/lib/exportService.ts` (2) — PDF export fallbacks
- `src/hooks/useAIAvailability.ts` (1) — AI status check
- `src/pages/admin/DatabaseMaintenance.tsx` (1) — backup download
- `src/pages/admin/RetryQueue.tsx` (1) — job cancel
- `src/pages/leads/LeadDetail.tsx` (3) — doc delete, team members, AI enrich
- `src/pages/leads/LeadCreate.tsx` (1) — team members
- `src/pages/leads/LeadsPipeline.tsx` (1) — pipeline leads
- `src/pages/leads/LeadsList.tsx` (2) — team members, note save
- `src/pages/leads/LeadsMerge.tsx` (1) — duplicate scan
- `src/pages/communication/CommunicationInbox.tsx` (1) — forward message
- `src/pages/communication/NewsletterManagement.tsx` (1) — send newsletter
- `src/pages/settings/SecuritySettings.tsx` (3) — 2FA setup/verify/disable
- `src/pages/calendar/CalendarPage.tsx` (1) — ICS export
- `src/pages/auth/ForgotPassword.tsx` (1) — forgot password
- `src/pages/ai/AIHub.tsx` (1) — action execution
- `src/pages/ai/LeadScoring.tsx` (1) — training upload
- `src/pages/campaigns/SMSCampaigns.tsx` (3) — send/schedule/draft
- `src/pages/analytics/CustomReports.tsx` (1) — save report
- `src/pages/analytics/ConversionReports.tsx` (1) — conversion funnel
- `src/pages/notifications/NotificationsPage.tsx` (5) — mark/delete/clear

Backend files (14 catches fixed):
- `backend/src/config/socket.ts` (1) — JWT verification
- `backend/src/services/campaign-executor.service.ts` (2) — activity log, unsubscribe token
- `backend/src/routes/ai.routes.ts` (1) — tier lookup
- `backend/src/routes/billing.routes.ts` (1) — Stripe invoice fetch
- `backend/src/controllers/admin.controller.ts` (2) — DB health check, backup file access
- `backend/src/controllers/goal.controller.ts` (1) — metric calculation

22 catch blocks left intentionally silent (JSON parsing, cross-origin iframe, date utilities, sessionStorage, JWT decode, logout, health check).

**10.5 — Hardcoded placeholder URLs replaced:**
- Created `src/lib/appConfig.ts` — App-wide config constants (`APP_NAME`, `APP_API_BASE_URL`, fallback values)
- `src/components/layout/Sidebar.tsx` — Removed `user@example.com` fallback
- `src/components/layout/Header.tsx` — Removed `user@example.com` fallback
- `src/pages/billing/InvoiceDetail.tsx` — `Your Company Name` → org name from auth store
- `src/pages/integrations/APIIntegrationsPage.tsx` — `api.masterrealestatepro.com` → `APP_API_BASE_URL`
- `src/pages/admin/SystemSettings.tsx` — `Your CRM System` / `crm.yourcompany.com` → `APP_NAME` / `window.location.origin`
- `backend/src/controllers/admin.controller.ts` — Default system name/URL from env vars
- `backend/src/services/template.service.ts` — `companyName` variable from env var

**10.6b — Real API key management:**
- Created `backend/src/controllers/apiKey.controller.ts` — Generate (SHA-256 hashed, `mrep_` prefix), list, revoke, audit log endpoints
- Created `backend/src/routes/apiKey.routes.ts` — CRUD routes at `/api/api-keys`
- `backend/prisma/schema.prisma` — Added `APIKey` model (name, keyHash, keyPrefix, user/org relations)
- `backend/src/server.ts` — Registered apiKey routes
- `src/pages/integrations/APIIntegrationsPage.tsx` — Full rewrite: React Query CRUD, create-once key display with copy, revoke, real audit trail, removed all hardcoded fake data

**10.6c — Feature flags moved to backend/DB:**
- Created `backend/src/controllers/featureFlag.controller.ts` — CRUD with auto-seed of 6 defaults on first access
- `backend/prisma/schema.prisma` — Added `FeatureFlag` model (name, key, description, enabled, environment, rollout, org-scoped, unique key per org)
- `backend/src/routes/admin.routes.ts` — Added feature flag CRUD routes
- `src/pages/admin/FeatureFlags.tsx` — Full rewrite: removed localStorage, uses React Query + mutations, loading state
- `src/lib/userStorage.ts` — Removed `crm_feature_flags` + `email-template-settings` from `USER_SCOPED_KEYS`

**10.6d — Email template settings moved to backend/DB:**
- `backend/prisma/schema.prisma` — Added `emailTemplateDefaults` JSON column to Organization model
- `backend/src/routes/settings.routes.ts` — Added GET/PUT `/api/settings/email-template-defaults` endpoints
- `src/pages/communication/EmailTemplatesLibrary.tsx` — Replaced localStorage with React Query + mutation for settings load/save

### Schema Changes in Phase 10 (10.5–10.6d)
| Change | Details |
|--------|---------|
| `APIKey` model | New model — name, keyHash (unique), keyPrefix, userId, organizationId, lastUsedAt, expiresAt, isActive |
| `FeatureFlag` model | New model — name, key, description, enabled, environment, rollout, organizationId. Unique(organizationId, key) |
| `Organization.emailTemplateDefaults` | New Json? column for org-wide email template defaults |
| `SubscriptionTier` enum | Removed `FREE` value (migrated existing rows to `STARTER`) |

### Files Modified in Phase 10 (10.6e–10.8)

**10.6e — SocialMediaDashboard rebuild:**
- `src/pages/communication/SocialMediaDashboard.tsx` — Full rewrite: removed fake API calls (`messagesApi.getMessages`), removed `useState`/`useQuery`/`useToast`, removed hardcoded zeros and fake "Best Times to Post". Replaced with clean static layout: Coming Soon banner with link to inbox, 4 platform cards with feature lists and disabled Connect buttons, 6 planned feature cards, placeholder dashboard preview. No unused imports.

**10.7 — Duplicate route redirects:**
- `src/App.tsx` — Replaced 3 duplicate route definitions with `<Navigate to="..." replace />`: `/analytics/report-builder` → `/analytics/custom-reports`, `/communication` → `/communication/inbox`, `/settings/team` → `/admin/team`. Also added redirect for `/analytics/campaigns` → `/campaigns/reports` (part of 10.8 merge).
- `src/components/layout/Sidebar.tsx` — Updated Communications nav link from `/communication` to `/communication/inbox` (avoids unnecessary redirect on every click)

**10.8 — Merged CampaignReports + CampaignAnalytics:**
- `src/pages/campaigns/CampaignReports.tsx` — Full rewrite as tabbed page: `OverviewTab` (from CampaignAnalytics — analytics API, DateRangePicker, performance trend, campaign comparison table, best time to send, top content), `DetailedReportsTab` (from CampaignReports — campaigns API, stat cards, per-campaign detail cards with full metrics, funnel visualization, leaderboards). Tab switcher with "Overview" and "Detailed Reports".
- `src/App.tsx` — Removed `CampaignAnalytics` lazy import. `/analytics/campaigns` now redirects to `/campaigns/reports`.
- `src/pages/analytics/CampaignAnalytics.tsx` — No longer imported by router (orphaned, can be removed in Phase 12 cleanup)

---

## PHASE 11: UX POLISH (Days 37–39)
*Now that features are built, polish the user experience.*

> **DS-11B Decisions Resolved:**
> - **11.3 (ConfirmDialog):** Modal overlay with clean design, contextual button labels ("Delete/Cancel", "Remove/Keep"), red/danger button for destructive actions, primary button for neutral, smooth fade-in + subtle scale transition
> - **11.4 (Breadcrumbs):** Below header (above page content), collapse middle segments at 4+ depth, chevron `›` separator, Home icon as first breadcrumb item
> - **11.5 (Page titles):** Format: `RealEstate Pro — Page Name`, generic labels (not entity names), unread notification count in tab `(3) RealEstate Pro — Dashboard`
> - **11.6 (WebSocket):** Silent auto-reconnect (no banner), fetch missed notifications from API on reconnect
> - **11.7 (WebSocket events):** All 9 event types (lead assigned, lead status changed, new message, campaign completed, campaign status change, workflow completed, task due/overdue, inbound call, follow-up reminder due). Silent background refresh when viewing relevant data.
> - **11.9 (Search debounce):** 300ms delay, minimum 2 characters before searching
> - **11.10 (Toast limit):** Max 5 visible toasts, oldest slides out with animation when exceeded
> - **11.11 (Dashboard export):** Both CSV and PDF (user picks from dropdown), branded PDF (logo, colors, headers), includes all dashboard data (stats, charts, pipeline, campaigns, activity)
> - **11.12 (Voicemail button):** Disabled button with "Coming Soon" tooltip (real voicemail deferred to Phase 17 with Twilio Voice)
> - **11.13 (Inbox templates):** 4-tier hierarchy: System (we provide) → Organization (brokerage-wide) → Team (team-specific) → Personal (agent's own). Organized by categories (Greetings, Follow-ups, Scheduling, Closing, etc.). `{{variable}}` placeholder support standardized site-wide.
> - **11.14 (Keyboard shortcuts):** Remove ALL keyboard shortcuts system-wide. No shortcut help modal.
> - **11.16 (Missing nav items):** No new sidebar items. Embed Calendar, Tasks, and Activity widgets on Dashboard with "View full" links to dedicated pages. Integrations stays under Settings.
> - **11.17 (Campaign chart):** Replace campaign opens/clicks chart with pipeline funnel mini-chart (leads per stage). Ensure opens/clicks data is properly shown on Campaign Reports page.
> - **11.18 (Chunk errors):** Silent auto-retry 3 times, then show clean error card with "Reload page" button

| # | Task | Time | Status |
|---|------|------|--------|
| 11.1 | Fix dark mode + sidebar persistence — added Zustand `persist` middleware to `uiStore.ts`, persists `theme` and `sidebarOpen` to localStorage key `ui-preferences`, `onRehydrateStorage` applies dark class on page load | 15 min | ✅ |
| 11.2 | Fix sidebar state persistence (collapsed/expanded) — **covered by 11.1** (same `persist` middleware, `sidebarOpen` included in `partialize`) | 15 min | ✅ |
| 11.3 | Replace 21 `window.confirm()` dialogs across 19 files with a reusable styled `ConfirmDialog` component — created `confirmStore.ts` Zustand store, `ConfirmDialog.tsx` component (uses existing Dialog), `useConfirm` hook. Replaced all 21 bare `confirm()`/`window.confirm()` calls across 19 files with async `showConfirm()` — contextual titles, destructive variant with red button, fade+scale animation | 2.5 hr | ✅ |
| 11.4 | Add breadcrumb navigation — created `Breadcrumbs.tsx` component in layout. Below header, Home icon first, chevron `›` separators, auto-generates from URL path with label map, collapses middle segments at 4+ depth, hidden on Dashboard | 2 hr | ✅ |
| 11.5 | Add page title management — created `usePageTitle` hook. Format: `(N) RealEstate Pro — Page Name`. 80+ route-to-title mappings, unread notification count from API (60s polling via react-query), dynamic ID routes show "Detail" suffix | 1.5 hr | ✅ |
| 11.6 | Fix WebSocket connection — **DECIDED:** silent auto-reconnect, fetch missed notifications on reconnect. Upgraded to infinite reconnect attempts (was 10), max delay 30s (was 10s), token refresh on reconnect. Added `onReconnect` callback registry. On reconnect, `useRealtimeUpdates` silently invalidates all active query caches (notifications, leads, tasks, appointments, campaigns, workflows, messages). | 1.5 hr | ✅ |
| 11.7 | Wire frontend to consume WebSocket events — **DECIDED:** all 9 event types complete. Added 3 new backend emit helpers (`pushTaskUpdate`, `pushCallUpdate`, `pushReminderDue`) to `socket.ts`. Added emit calls in `task.controller.ts` (create/update/delete/complete), `call.controller.ts` (logCall), `reminderProcessor.ts` (due reminders). Frontend `useRealtimeUpdates` now handles `task:update`, `call:update`, `reminder:due` events with appropriate query invalidation. | 2 hr | ✅ |
| 11.8 | Import existing `LoadingSkeleton` component into Calendar and Tasks pages — added `isLoading` destructure from useQuery, `LoadingSkeleton` import, loading guard before error guard on both pages | 15 min | ✅ |
| 11.9 | Add search debounce to `GlobalSearchModal` — **DECIDED:** 300ms delay, min 2 characters. Added `debouncedQuery` state with 300ms setTimeout, queries only fire when debounced query has 2+ chars, static page filtering uses raw query for instant local results, empty state shows "Type at least 2 characters" hint | 30 min | ✅ |
| 11.10 | Add toast maximum limit — **DECIDED:** max 5 visible, oldest slides out with animation. Added `MAX_TOASTS=5` constant, `exiting` flag on Toast interface, overflow eviction marks oldest as exiting (300ms slide-out animation via `translate-x-full` + `opacity-0` transition), auto-remove also uses exit animation, `removeToast` animated | 20 min | ✅ |
| 11.11 | Fix Dashboard export — **DECIDED:** CSV + PDF dropdown, branded PDF styling, all dashboard data included. Replaced single JSON export with dropdown menu (CSV/PDF). CSV includes all dashboard sections (stats, quick stats, pipeline, campaigns, revenue, activities, tasks) with proper escaping. PDF uses jsPDF with branded header (blue logo text, date, range), structured sections, auto-pagination, page numbering footer. Both formats include complete dashboard data. | 2 hr | ✅ |
| 11.12 | Fix CallCenter voicemail button — **DECIDED:** disabled button with "Coming Soon" tooltip, grey styling, small "Coming Soon" label below button text (real voicemail deferred to Phase 17 with Twilio Voice) | 30 min | ✅ |
| 11.13 | Move Inbox templates/quick replies to API — **DECIDED:** 4-tier hierarchy (System → Organization → Team → Personal), organized by categories, `{{variable}}` placeholder support standardized site-wide. Created `MessageTemplate` Prisma model with `MessageTemplateTier` enum, backend CRUD controller + routes at `/api/message-templates`, seed-defaults endpoint auto-populates 8 message templates + 6 quick replies on first load. Frontend fetches via react-query with fallback arrays, auto-seeds on empty. | 3 hr | ✅ |
| 11.14 | Remove all keyboard shortcuts system-wide — **DECIDED:** stripped all shortcut listeners. Removed `?` key handler + `KeyboardShortcutsModal` from MainLayout, removed `Cmd+K` search shortcut + `⌘K` kbd badge from Header, removed 7 inbox shortcuts (mark read/unread, archive, star, bulk select, delete, mark all read) from CommunicationInbox. `KeyboardShortcutsModal.tsx` file left in place (orphaned, no imports). | 1 hr | ✅ |
| 11.15 | Fix setTimeout memory leaks in `CommunicationInbox` (6 leaks), `LeadScoring`, `WorkflowBuilder`, `Login`, `Register` — added `useRef` + `useEffect` cleanup for all timer refs across all 5 files: CommunicationInbox (timersRef array for 6 timers), Login (navTimerRef for 2 timers), Register (navTimerRef), WorkflowBuilder (deleteConfirmTimerRef), LeadScoring (recalcTimerRef) | 1 hr | ✅ |
| 11.16 | Embed Calendar, Tasks, Activity widgets on Dashboard — **DECIDED:** no new sidebar items, add widgets with "View full" links, Integrations stays under Settings. Added `appointmentsApi.getUpcoming` query, Upcoming Appointments card with loading/error/empty states, appointment type badges, lead names, clickable rows navigate to /calendar. Grid upgraded to 3-column layout (Activity + Tasks + Calendar). | 2 hr | ✅ |
| 11.17 | Replace Dashboard campaign chart with pipeline funnel — **DECIDED:** remove opens/clicks chart, add pipeline funnel mini-chart (leads per stage), ensure opens/clicks data on Campaign Reports page. Conversion Funnel section with horizontal bar chart, overall conversion rate, help tooltip. | 1.5 hr | ✅ |
| 11.18 | Add chunk load error handling — **DECIDED:** silent auto-retry 3 times, then clean error card with "Reload page" button. Created `src/lib/lazyWithRetry.ts` utility wrapping `React.lazy` with 3-retry exponential backoff (1s/2s/4s) for chunk errors. All 83 lazy imports in `App.tsx` converted to `lazyWithRetry`. `PageErrorBoundary` enhanced with chunk error detection showing "Update Available" card with reload button. | 30 min | ✅ |

**Phase Total: ~22.5 hours (3 days) — ✅ COMPLETE**

### New Files Created in Phase 11
| File | Purpose |
|------|---------|
| `src/store/confirmStore.ts` | Zustand store for global confirm dialog state (promise-based API) |
| `src/components/ui/ConfirmDialog.tsx` | Reusable styled confirm dialog using existing Dialog component |
| `src/hooks/useConfirm.ts` | Convenience hook wrapping confirmStore.confirm |
| `src/components/layout/Breadcrumbs.tsx` | Auto-generated breadcrumb navigation from URL path |
| `src/hooks/usePageTitle.ts` | Sets `document.title` per route with unread notification count prefix |
| `backend/src/controllers/message-template.controller.ts` | CRUD + seed-defaults for 4-tier message templates (System/Org/Team/Personal) |
| `backend/src/routes/message-template.routes.ts` | Routes for `/api/message-templates` — GET list, GET categories, POST create, POST seed-defaults, PUT update, DELETE |
| `src/lib/lazyWithRetry.ts` | Wraps `React.lazy` with 3-retry exponential backoff for chunk load errors (11.18) |

### Files Modified in Phase 11
- `src/components/layout/MainLayout.tsx` — Added Breadcrumbs, ConfirmDialog, usePageTitle
- **ConfirmDialog replacements (19 files):** `TasksPage`, `DebugConsole`, `RetryQueue`, `FeatureFlags`, `DatabaseMaintenance`, `CalendarPage`, `SecuritySettings`, `Segmentation`, `GoogleIntegration`, `DemoDataGenerator`, `TwilioSetup`, `TagsManager`, `CustomFieldsManager`, `ActivityTimeline`, `WorkflowsList`, `CustomReports`, `GoalTracking`, `LeadsFollowups`, `LeadDetail`
- `src/hooks/useSocket.ts` — Infinite reconnect, token refresh on reconnect, `onReconnect` callback registry
- `src/hooks/useRealtimeUpdates.ts` — Reconnect handler invalidates all caches; 3 new event listeners (task:update, call:update, reminder:due)
- `backend/src/config/socket.ts` — Added `pushTaskUpdate`, `pushCallUpdate`, `pushReminderDue` emit helpers
- `backend/src/controllers/task.controller.ts` — Added `pushTaskUpdate` calls on create/update/delete/complete
- `backend/src/controllers/call.controller.ts` — Added `pushCallUpdate` call on logCall
- `backend/src/jobs/reminderProcessor.ts` — Added `pushReminderDue` call when reminders fire
- `src/pages/calendar/CalendarPage.tsx` — Added LoadingSkeleton loading state
- `src/pages/tasks/TasksPage.tsx` — Added LoadingSkeleton loading state
- `src/components/search/GlobalSearchModal.tsx` — Added 300ms debounced search with min 2 chars (11.9)
- `src/store/toastStore.ts` — Added MAX_TOASTS=5 limit, `exiting` flag, animated eviction of oldest toasts (11.10)
- `src/components/ui/ToastContainer.tsx` — Added exit animation (opacity-0 + translate-x-full transition) for exiting toasts (11.10)
- `src/pages/dashboard/Dashboard.tsx` — Replaced mock JSON export with CSV+PDF dropdown, branded PDF via jsPDF, complete data export (11.11)
- `src/pages/communication/CallCenter.tsx` — Voicemail button disabled with "Coming Soon" tooltip + grey styling (11.12)
- `src/pages/communication/CommunicationInbox.tsx` — Replaced hardcoded MESSAGE_TEMPLATES/QUICK_REPLIES with API-fetched data via react-query, auto-seeds system defaults on first load, `{{variable}}` support, removed 7 keyboard shortcut listeners (11.13, 11.14)
- `src/lib/api.ts` — Added `messageTemplatesApi` with CRUD + seedDefaults + getCategories (11.13)
- `src/components/layout/MainLayout.tsx` — Removed `?` key handler useEffect, removed KeyboardShortcutsModal import/usage (11.14)
- `src/components/layout/Header.tsx` — Removed Cmd+K search shortcut useEffect, removed `⌘K` kbd badge from search button (11.14)
- `src/pages/communication/CommunicationInbox.tsx` — Added `timersRef` array with `useEffect` cleanup for all 6 setTimeout calls (11.15)
- `src/pages/auth/Login.tsx` — Added `navTimerRef` with useEffect cleanup for 2 navigation setTimeout calls (11.15)
- `src/pages/auth/Register.tsx` — Added `navTimerRef` with useEffect cleanup for navigation setTimeout (11.15)
- `src/pages/workflows/WorkflowBuilder.tsx` — Added `deleteConfirmTimerRef` with useEffect cleanup + clearTimeout on re-trigger (11.15)
- `src/pages/ai/LeadScoring.tsx` — Added `recalcTimerRef` with useEffect cleanup for refetch setTimeout (11.15)
- `src/pages/dashboard/Dashboard.tsx` — Added Upcoming Appointments widget with `appointmentsApi.getUpcoming` query, 3-column layout for Activity/Tasks/Calendar (11.16)
- `src/App.tsx` — Replaced all 83 `lazy()` imports with `lazyWithRetry()` for chunk error auto-retry (11.18)
- `src/components/PageErrorBoundary.tsx` — Added chunk error detection with `isChunkError` state, shows "Update Available" card for chunk failures vs generic error card (11.18)

### New Schema Changes in Phase 11
| Change | Details |
|--------|---------|
| `MessageTemplate` model | id, name, content, category, tier (enum), isQuickReply, variables (JSON), isActive, usageCount, lastUsedAt, organizationId, teamId, userId |
| `MessageTemplateTier` enum | SYSTEM, ORGANIZATION, TEAM, PERSONAL |
| Organization relation | Added `MessageTemplate[]` |
| User relation | Added `messageTemplates MessageTemplate[]` |

---

## PHASE 12: CODEBASE HYGIENE (Days 39–40)
*Moved to end per philosophy: build first, clean up last.*

> **DS-13 Decisions Resolved:**
> - **12.1 (.md grouping):** Single timeline doc — merge all 144 into `DEVELOPMENT_HISTORY.md` with sections
> - **12.2 (Root scripts):** Keep `start-dev.sh` + `stop-dev.sh`, delete 13 test scripts + `fix-frontend-enums.sh` + 2 log files
> - **12.3 (Backend scripts):** Delete all 41 ad-hoc scripts (keep `jest.config.js` + `jest.config.regression.js`)
> - **12.4 (Compiled tests):** Delete all 14 `.js` duplicates in `backend/tests/`
> - **12.5 (Mock data):** Delete `mockData.ts` + `mockData.config.ts` + `MockModeBanner.tsx`. Keep `AnalyticsEmptyState.tsx` (real UI component)
> - **12.6 (Logger):** Custom thin wrapper `src/lib/logger.ts` — silent in prod, logs in dev, zero dependencies
> - **12.7 (Unused deps):** Delete all 8 confirmed unused (redis, node-fetch, nodemon, reactflow, framer-motion, zod, @hookform/resolvers, react-hook-form)
> - **12.8 (Misplaced deps):** Move `@types/multer` + `typescript` to devDeps. Keep `@types/helmet` (helmet is used in server.ts)
> - **12.10 (Build artifacts):** Remove from git tracking (playwright-report, test-results, e2e/screenshots, e2e/e2e/screenshots)
> - **12.13 (Zod mismatch):** Moot — frontend `zod` removed in 12.7
> - **12.14 (Dev pages):** Keep `DatabaseMaintenance` + `FeatureFlags` (real admin tools). Delete `DemoDataGenerator`, `DebugConsole`, `RetryQueue` (fake/mock)
> - **12.15 (Prisma backups):** Delete all 3 backup files

| # | Task | Time | Status |
|---|------|------|--------|
| 12.1 | ~~⚠️~~ Consolidate 144 root `.md` files into single `DEVELOPMENT_HISTORY.md` timeline doc with sections — **DECIDED: single timeline doc** — Merged 143 files (chronological timeline with 7 month sections, TOC, summaries), deleted originals, kept `MASTER_COMPLETION_PLAN.md` | 1 hr | ✅ |
| 12.2 | ~~⚠️~~ Delete 13 root `test-*.sh` scripts + `fix-frontend-enums.sh` + `test-output.log` + `test-results.log` — **DECIDED: keep `start-dev.sh` + `stop-dev.sh`, delete rest** — Deleted 15 files (12 test-*.sh + fix-frontend-enums.sh + 2 logs) | 10 min | ✅ |
| 12.3 | ~~⚠️~~ Delete 42 backend root ad-hoc scripts (`.sh`, `.js`, `.py` — keep `jest.config.js` and `jest.config.regression.js`) — **DECIDED: delete all** — Deleted 42 scripts (1 more than originally counted) | 10 min | ✅ |
| 12.4 | ~~⚠️~~ Delete 14 compiled `.js` test files in `backend/tests/` — **DECIDED: confirmed duplicates of .ts sources, delete all** — Deleted 11 .js files (all had .ts counterparts, jest config runs .ts only) | 5 min | ✅ |
| 12.5 | ~~⚠️~~ Remove `src/data/mockData.ts` + `src/config/mockData.config.ts` + `MockModeBanner.tsx` + all page imports — **DECIDED: delete mock files, keep `AnalyticsEmptyState.tsx` (real UI component)** — Deleted 3 mock files, cleaned 7 consumer files (LeadDetail, LeadsList, CommunicationInbox, AIHub, CampaignCreate, CampaignsList, CampaignEdit), removed empty `src/data/` dir | 30 min | ✅ |
| 12.6 | ~~⚠️~~ Replace 451 `console.log/error/warn` with proper logger — **DECIDED: custom thin wrapper `src/lib/logger.ts` (silent in prod, logs in dev, zero deps)** — Created `src/lib/logger.ts` frontend wrapper (silent prod, logs dev). Backend: wrapped existing pino logger in `backend/src/lib/logger.ts` with console-compatible variadic API. Replaced 565 console.* calls (148 frontend + 417 backend) across ~120 files, added logger imports to all consumer files. Zero console.* calls remain. | 4 hr | ✅ |
| 12.7 | ~~⚠️~~ Remove 8 unused deps: `redis`, `node-fetch`, `nodemon` (backend); `reactflow`, `framer-motion`, `zod`, `@hookform/resolvers`, `react-hook-form` (frontend) — **DECIDED: all 8 confirmed unused, delete all** — Removed from package.json files, ran `npm install` to update lockfiles, both builds verified clean | 15 min | ✅ |
| 12.8 | ~~⚠️~~ Move `@types/multer` + `typescript` to devDeps in backend — **DECIDED: `@types/helmet` is actually used (helmet imported in server.ts), keep it. Move `@types/multer` + `typescript` to devDeps.** — Done, both moved to devDependencies | 5 min | ✅ |
| 12.9 | Fix `.gitignore`: add `coverage/`, `playwright-report/`, `test-results/`, `e2e/screenshots/`, `*.tsbuildinfo`, `backend/dist/`, `e2e/e2e/` to root; **remove** `prisma/migrations/` and `package-lock.json` from backend `.gitignore` (both must be committed) — Done, both gitignore files updated | 10 min | ✅ |
| 12.10 | ~~⚠️~~ `git rm -r --cached playwright-report/ test-results/ e2e/screenshots/ e2e/e2e/screenshots/` — **DECIDED: confirmed build output, remove from git tracking** — Removed 235 files from git index, .gitignore already covers them | 5 min | ✅ |
| 12.11 | Create frontend `.env.example` documenting `VITE_API_URL`, `VITE_API_BASE_URL`, `VITE_APP_NAME` — 3 vars with descriptions | 5 min | ✅ |
| 12.12 | Update backend `.env.example` — rewrote with all 37 env vars organized into 11 sections (Server, Database, Auth, URLs, Encryption, AI, Voice, Email, SMS, Billing, Push, Redis, Monitoring) — added 20 previously undocumented vars | 15 min | ✅ |
| 12.13 | ~~⚠️~~ Fix Zod version mismatch — **DECIDED: moot — frontend `zod` removed in 12.7, no mismatch remains** | 0 min | ✅ (skipped) |
| 12.14 | ~~⚠️~~ Delete 3 dev-only pages: `DemoDataGenerator`, `DebugConsole`, `RetryQueue` + remove routes — **DECIDED: keep `DatabaseMaintenance` + `FeatureFlags` (real admin tools with API integration), delete 3 fake/mock pages** — Deleted 3 files, removed lazy imports + Route elements from App.tsx, removed breadcrumb/page-title entries, removed AdminPanel quick links, removed 3 e2e tests | 30 min | ✅ |
| 12.15 | ~~⚠️~~ Delete 3 Prisma schema backup files: `schema.prisma.backup`, `schema.prisma.pulled`, `schema_broken.prisma` — **DECIDED: confirmed safe, delete all 3** — Deleted all 3 files | 5 min | ✅ |
| 12.16 | Fix `start-dev.sh` hardcoded Codespace URL (`probable-fiesta-v65j576gg6qgfpp79`) — made environment-agnostic using `$CODESPACE_NAME` + `$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN` env vars, falls back to `localhost` when not in Codespace | 10 min | ✅ |
| 12.17 | Create `.prettierrc` config file — Prettier set as default formatter in devcontainer but no config exists to enforce style — **Created** with 2-space indent, single quotes, no trailing semi (frontend), semi override for `backend/**/*.ts`, ES5 trailing commas, 100 char print width | 10 min | ✅ |
| 12.18 | Fix `.devcontainer/devcontainer.json` Node version — specifies Node 18/20 but runtime is Node 22 — **Fixed** image from `1-20-bullseye` → `1-22-bookworm`, removed redundant `features` block (was installing Node 18 on top of Node 20 image) | 10 min | ✅ |
| 12.19 | Add `README.md` at project root — currently does not exist (critical for any project) — **Created** with tech stack table, feature list (8 categories), prerequisites, 5-step getting started guide, project structure tree, scripts reference table, env vars summary, license | 1 hr | ✅ |

**Phase Total: ~9 hours (1 day) — ✅ COMPLETE**

### New Files Created in Phase 12
| File | Purpose |
|------|---------|
| `DEVELOPMENT_HISTORY.md` | Consolidated 143 `.md` files into single chronological timeline |
| `src/lib/logger.ts` | Frontend logger wrapper — silent in prod, logs in dev |
| `backend/src/lib/logger.ts` | Backend pino wrapper with console-compatible variadic API |
| `.env.example` | Frontend env vars documentation (3 vars) |
| `.prettierrc` | Prettier config — 2-space, single quotes, semi override for backend |
| `README.md` | Project README with tech stack, features, setup guide, structure |

### Files Modified in Phase 12
- `.devcontainer/devcontainer.json` — Node 20→22, bullseye→bookworm, removed redundant features block
- `.gitignore` — Added coverage, build artifacts, screenshots; removed erroneous entries
- `backend/.gitignore` — Removed `prisma/migrations/` and `package-lock.json` (must be committed)
- `backend/.env.example` — Rewrote with all 37 env vars in 11 sections
- `backend/package.json` — Removed 3 unused deps, moved 2 to devDeps
- `package.json` — Removed 5 unused frontend deps
- `src/App.tsx` — Removed 3 fake dev page routes + imports
- ~120 files — Replaced 565 `console.*` calls with logger

---

## PHASE 13: CODE QUALITY + TESTING (Days 40–44)
*Split mega-files, set up testing, enforce standards.*

| # | Task | Time | Status |
|---|------|------|--------|
| 13.1 | Split `CommunicationInbox.tsx` (2,224→824 lines) into 7 modules under `inbox/`: `types.ts`, `ChannelSidebar.tsx`, `ThreadList.tsx`, `ConversationView.tsx`, `ComposeModal.tsx`, `FilterModal.tsx`, `AttachmentModal.tsx`, `SignatureEditorModal.tsx` + barrel `index.ts` | 3 hr | ✅ |
| 13.2 | Split `LeadsList.tsx` (2,257→764 lines) into 6 modules under `list/`: `types.ts` (shared types + utilities), `LeadStatsCards.tsx` (4 stat cards), `LeadCharts.tsx` (pie/bar charts), `LeadModals.tsx` (6 modals), `LeadsTable.tsx` (table + expanded row + shared RowMenu), `LeadsGrid.tsx` (grid/card view) | 3 hr | ✅ |
| 13.3 | Fix rampant `any` types in backend — replaced 169 `any` usages (catch blocks → `error: unknown` + `getErrorMessage()` helper, `req: any` → `Request`, `where: any` → `Record<string, any>`); 6 justified remainders (Prisma Json fields). TS errors 361→314. | 2 hr | ✅ |
| 13.4 | Extract inline business logic from route files → 4 new controllers: `billing.controller.ts` (5 handlers), `webhook.controller.ts` (6 handlers + 2 helpers, 892→26 lines in routes), `export.controller.ts`, `segmentation.controller.ts`. All route files rewritten as thin wrappers. | 2.5 hr | ✅ |
| 13.5 | Add pagination to unpaginated list endpoints: goals (`page/limit` + count), message templates (`page/limit` + count), tasks-by-lead (`page/limit` + count). All return `pagination: { page, limit, total, pages }`. | 1.5 hr | ✅ |
| 13.6 | Set up ESLint for backend (frontend already has it configured; backend has zero linting) | 1 hr | ☐ |
| 13.7 | Add pre-commit hooks with husky + lint-staged (lint + type-check on commit) | 1 hr | ☐ |
| 13.8 | Set up Vitest for frontend (zero test tooling currently installed) | 1.5 hr | ☐ |
| 13.9 | Write tests for critical paths: auth flow, lead CRUD, campaign CRUD | 4 hr | ☐ |
| 13.10 | Add backend integration tests for untested route groups | 6 hr | ☐ |
| 13.11 | Add error boundaries around modals/drawers (AI Composer, Workflow Builder canvas, Calendar sidebar) | 1.5 hr | ☐ |
| 13.12 | ~~⚠️~~ Consolidate Redis clients — **ALREADY DONE:** `redis` package was removed in Phase 12 (DS-13). Project is already `ioredis`-only with a single centralized client in `config/redis.ts`. No work needed. | 0 min | ✅ |
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

## PHASE 14: ACCESSIBILITY (Days 44–45) ✅ COMPLETE

| # | Task | Time | Status |
|---|------|------|--------|
| 14.1 | Add skip-to-content link | 20 min | ✅ |
| 14.2 | Add `<nav aria-label>` to sidebar | 15 min | ✅ |
| 14.3 | Add `role="dialog"` and `aria-label` to `GlobalSearchModal` | 15 min | ✅ |
| 14.4 | Add `aria-expanded`/`aria-haspopup` to header dropdown + sidebar profile menu + AI Hub toggle | 15 min | ✅ |
| 14.5 | Add `aria-label` to all icon-only buttons (Header, Sidebar, ToastContainer, GlobalSearchModal, AIAssistant, MessageEnhancerModal, CampaignEdit, CampaignsList, LeadDetail, LeadsFollowups, LeadsTable, LeadsGrid, LeadModals) | 2 hr | ✅ |
| 14.6 | Add `aria-live="polite"` to `ToastContainer` | 10 min | ✅ |
| 14.7 | Detect `prefers-color-scheme: dark` for initial theme | 30 min | ✅ |

**Phase Total: ~4 hours (0.5 days) — DONE**

---

## PHASE 15: ONBOARDING + FINAL POLISH (Days 45–46)

| # | Task | Time | Status |
|---|------|------|--------|
| 15.0 | Audit existing `GettingStarted.tsx` onboarding component — check if it's functional, shown to new users, or dead code, before building anything new | 15 min | ✅ |
| 15.1 | Build real onboarding tour — full site walkthrough covering Dashboard, Leads, Campaigns, Communication, Workflows, AI Hub, Analytics, Settings with key actions highlighted | 4 hr | ✅ |
| 15.2 | Add "Show Getting Started" in settings | 30 min | ✅ |
| 15.3 | Add guided tooltips/spotlight for new users | 3 hr | ✅ |
| 15.4 | Add notification sounds/indicators — ON by default, per-event granular settings (users toggle sound on/off per notification type in Settings) | 1.5 hr | ✅ |
| 15.5 | Add recent searches/history to GlobalSearchModal | 1.5 hr | ✅ |
| 15.6 | Standardize all "Coming Soon" pages — illustration + blurred preview hybrid (greyed/blurred mockup of upcoming feature with polished illustration, description, and optional "Notify me" button) | 2 hr | ✅ |

**Phase Total: ~13 hours (1.5 days)**

---

> **MILESTONE: 100% complete — ~51 days**

---

## PHASE 16: CI/CD + DEPLOYMENT (Days 49–51)
*Without this, there's no way to deploy to production or ensure quality on every push.*

| # | Task | Time | Status |
|---|------|------|--------|
| 16.1 | Set up GitHub Actions CI pipeline — Lint + TypeScript type-check + Build on every push/PR; E2E (Playwright) on PRs to main only | 4 hr | ✅ |
| 16.2 | Create `Dockerfile` for backend (Node + Prisma + migrations) | 2 hr | ⏭️ DEFERRED — not ready for deployment |
| 16.3 | Create `Dockerfile` for frontend (Vite build + static serve via nginx) | 1.5 hr | ⏭️ DEFERRED — not ready for deployment |
| 16.4 | Create `docker-compose.yml` for local full-stack dev (backend, frontend, Postgres, Redis) | 2 hr | ⏭️ DEFERRED — not ready for deployment |
| 16.5 | Add CSRF protection middleware to backend | 1 hr | ⏭️ DEFERRED — not ready for deployment |
| 16.6 | Add per-route request size limits — AI routes, file uploads, and webhooks should have different limits than default 10MB | 30 min | ⏭️ DEFERRED — not ready for deployment |
| 16.7 | Add developer documentation: architecture overview, API reference, setup guide in `docs/` | 3 hr | ⏭️ DEFERRED — not ready for deployment |

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
| 17.16 | Add focus management on mobile sidebar (deferred from Phase 14) | 1 hr | ☐ |
| 17.17 | Add slide-in animation to sidebar (deferred from Phase 14) | 1 hr | ☐ |
| 17.18 | ⚠️ Add mobile bottom navigation bar — **DECISION: which items in bottom nav? (Home, Leads, Messages, Tasks, More?)** (deferred from Phase 14) | 3 hr | ☐ |
| 17.19 | Optimize large tables for mobile — responsive cards (deferred from Phase 14) | 3 hr | ☐ |

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
| AAAA | ✅ **`GettingStarted.tsx` audited** — existing 3-step card wizard retained on Dashboard; new `OnboardingTour` added as full-site walkthrough overlay. | LOW | 15.0 |
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
| DS-14 | Decision Session: Quality/Mobile — Redis resolved | (included) | |
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

**March 10, 2026 (v36) — Phase 16 partial (1/7 tasks, 6 deferred):**

- **DS-16 resolved** — Only 16.1 (CI pipeline) needed now; 16.2–16.7 (Dockerfiles, docker-compose, CSRF, request size limits, developer docs) deferred until ready for deployment
- **16.1** — Created `.github/workflows/ci.yml`: GitHub Actions CI pipeline with 3 jobs:
  - **Frontend job**: npm ci → lint → tsc + vite build (every push)
  - **Backend job**: npm ci → prisma generate → prisma migrate deploy → tsc build, with Postgres 16 + Redis 7 services (every push)
  - **E2E job**: Full stack startup + Playwright chromium tests, only on PRs to main. Uploads report artifact on failure
  - Node 22, concurrency groups with cancel-in-progress, proper health checks on services

**March 10, 2026 (v35) — Phase 15 complete (7/7 tasks):**

- **DS-15 resolved** — All 4 decisions made: full site walkthrough tour, sounds ON by default with per-event settings, Coming Soon illustration+blurred preview hybrid, CI/CD lint+typecheck+build on push with E2E on PRs to main only
- **15.0** — Audited `GettingStarted.tsx`: functional 3-step card wizard on Dashboard, retained alongside new tour
- **15.1 + 15.3** — Built `OnboardingTour.tsx`: 10-step full site walkthrough with spotlight overlay, step-by-step navigation, progress dots, back/next/skip controls. Auto-shows for new users, persists progress per-user via `userStorage`
- **15.2** — Added "Show Getting Started Tour" button in SettingsHub quick actions, triggers tour overlay on demand
- **15.4** — Built `notificationSounds.ts`: Web Audio API tone generator with unique sounds per event type. Sound settings card added to NotificationSettings with master toggle, volume slider, per-event checkboxes, and preview play buttons. Sounds trigger on real-time Socket.io notifications via `NotificationBell`
- **15.5** — Added recent search history to `GlobalSearchModal`: stores last 8 searches per-user, shows on modal open, click to re-search, clear all button
- **15.6** — Built `ComingSoon.tsx` shared component: illustration + blurred preview hybrid with "Notify Me" button. Updated `VideoTutorialLibrary`, `SocialMediaDashboard`, `NewsletterManagement`, `PhoneCampaigns`, `CampaignsList` to use standardized component
- Updated `userStorage.ts` with 4 new user-scoped keys
- Finding AAAA resolved — GettingStarted.tsx audited and new tour built alongside it

*New files:* `OnboardingTour.tsx`, `notificationSounds.ts`, `ComingSoon.tsx`
*Modified files:* `MainLayout.tsx`, `NotificationBell.tsx`, `GlobalSearchModal.tsx`, `NotificationSettings.tsx`, `SettingsHub.tsx`, `userStorage.ts`, `VideoTutorialLibrary.tsx`, `SocialMediaDashboard.tsx`, `NewsletterManagement.tsx`, `PhoneCampaigns.tsx`, `CampaignsList.tsx`

---

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
