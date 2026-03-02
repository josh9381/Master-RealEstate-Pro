# Master Real Estate Pro — 100% Completion Plan

> **Created:** February 28, 2026
> **Updated:** March 2, 2026 (reordered: build features first, polish/consolidate last)
> **Total Estimated Days:** ~45 working days
> **Philosophy: Build everything first, then polish and consolidate. Keep all routes/pages during building so we can see what exists. Admin/Team/Billing/Subscription deferred — decisions pending.**

---

## PHASE 0: CODEBASE HYGIENE (Day 1)
*Clean the junk so every subsequent commit is on a clean base.*

| # | Task | Time | Status |
|---|------|------|--------|
| 0.1 | Delete 144 root `.md` files (keep only README + MASTER_COMPLETION_PLAN) | 15 min | ☐ |
| 0.2 | Delete 15 root `.sh` scripts + `test-output.log` + `test-results.log` | 10 min | ☐ |
| 0.3 | Delete 42 backend root ad-hoc scripts (`.sh`, `.js`, `.py`, `.bak` files — keep `jest.config.js` and `jest.config.regression.js`) | 10 min | ☐ |
| 0.4 | Delete 11 compiled `.js` test files in `backend/tests/` (activity, analytics, auth, campaign, jest.setup, lead, middleware, note, setup, tag, task) | 5 min | ☐ |
| 0.5 | Remove `src/data/mockData.ts` (820 lines) + `src/config/mockData.config.ts` + all page imports | 30 min | ☐ |
| 0.6 | Replace 451 `console.log/error/warn` statements (342 backend, 109 frontend) with proper logger (pino already installed in backend — use it; remove from frontend) | 4 hr | ☐ |
| 0.7 | Remove unused deps: `redis`, `node-fetch` from backend; `reactflow` from frontend | 10 min | ☐ |
| 0.8 | Move `@types/multer` to devDeps, remove `@types/helmet` | 5 min | ☐ |
| 0.9 | Fix `.gitignore`: add `coverage/`, `playwright-report/`, `test-results/`, `*.tsbuildinfo`, `*.env.local`, `backend/dist/`; **remove** `prisma/migrations/` and `package-lock.json` from backend `.gitignore` (both must be committed) | 10 min | ☐ |
| 0.10 | `git rm -r --cached playwright-report/` to remove already-committed build artifacts | 5 min | ☐ |
| 0.11 | Create frontend `.env.example` documenting `VITE_API_URL` | 5 min | ☐ |
| 0.12 | Update backend `.env.example` — add ~16 undocumented vars: `SENDGRID_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `SENTRY_DSN`, `FROM_EMAIL`, `FROM_NAME`, `APP_URL`, `LOG_LEVEL`, `CORS_ORIGIN`, `ENCRYPTION_KEY`, etc. | 15 min | ☐ |
| 0.13 | Fix Zod version mismatch (backend `^4.1.12`, frontend `^3.23.8` — pick one) | 15 min | ☐ |
| 0.14 | Delete 5 dev-only pages that should not ship to production: `DemoDataGenerator`, `DebugConsole`, `DatabaseMaintenance`, `RetryQueue`, `FeatureFlags` (~2,093 lines of fake UI) + remove their routes from `App.tsx` | 30 min | ☐ |

**Phase Total: ~7 hours**

---

## PHASE 1: CRITICAL SECURITY FIXES (Days 2–3)
*Fix anything that would be a production vulnerability or crash.*

| # | Task | Time | Status |
|---|------|------|--------|
| 1.1 | **CRITICAL**: Fix token key mismatch — change `localStorage.getItem('token')` → `'accessToken'` in `useSocket.ts` (3 occurrences), `NotificationBell.tsx`, `ContentGeneratorWizard.tsx`, `AIComposer.tsx` | 20 min | ☐ |
| 1.2 | **CRITICAL**: Fix WebSocket JWT secret — change `JWT_SECRET` → `JWT_ACCESS_SECRET` in `socket.ts`, remove `'dev-secret'` fallback | 10 min | ☐ |
| 1.3 | **HIGH**: Fix webhook auth bypass — `webhookAuth.ts` calls `next()` when tokens unset; change to return 401 | 20 min | ☐ |
| 1.4 | **HIGH**: Remove hardcoded encryption key fallback `'default-32-byte-key-change-this!'` in `encryption.ts` — fail loudly if `MASTER_ENCRYPTION_KEY` is not set | 10 min | ☐ |
| 1.5 | **HIGH**: Add `process.on('uncaughtException')` and `process.on('unhandledRejection')` handlers in `server.ts` — log, alert, and exit gracefully (currently zero crash handlers) | 30 min | ☐ |
| 1.6 | Add `requireAdmin` to user management routes (`PATCH /:id/role`, `DELETE /:id` in `user.routes.ts` — currently only `authenticate`) | 20 min | ☐ |
| 1.7 | Add `requireAdmin` to AI settings routes (`ai.routes.ts` has no `requireAdmin` anywhere) | 20 min | ☐ |
| 1.8 | Add Zod validation to all AI route request bodies (30+ endpoints with no validation) | 1.5 hr | ☐ |
| 1.9 | Add Zod validators for 4 unvalidated route groups: notification, admin/system-settings, segmentation, savedReport (no validator files exist) | 1.5 hr | ☐ |
| 1.10 | Add rate limiting to: message send, password change, workflow trigger/test (infrastructure exists in `rateLimiter.ts`, just needs wiring) | 1 hr | ☐ |
| 1.11 | Wrap route handlers in `asyncHandler` — missing from 10 route files: abtest, admin, ai, billing, export, intelligence, savedReport, subscription, user, webhook | 2 hr | ☐ |
| 1.12 | Add Zod validation to lead merge endpoint | 20 min | ☐ |
| 1.13 | Add `validateParams` to inline campaign route handlers | 30 min | ☐ |
| 1.14 | Add rate limiting to unsubscribe + team invite endpoints | 30 min | ☐ |
| 1.15 | Wire authorization middleware (defined in `middleware/auth.ts` and `middleware/admin.ts` but inconsistently applied) or remove dead code | 30 min | ☐ |
| 1.16 | Add frontend role guards to admin pages: `SystemSettings`, `HealthCheckDashboard`, `DataExportWizard` | 30 min | ☐ |
| 1.17 | Fix `$queryRawUnsafe` in admin controller — 7 usages including string interpolation; parameterize queries | 30 min | ☐ |
| 1.18 | Fix CORS mismatch — `socket.ts` uses `CORS_ORIGIN` but `.env` defines `FRONTEND_URL`; socket falls back to hardcoded localhost | 10 min | ☐ |
| 1.19 | Clean up localStorage on logout — clear `emailSignature`, `autoAppendSignature`, `email-template-settings`, `feature-flags` | 15 min | ☐ |
| 1.20 | Fix localStorage keys to be user-specific (prefix with userId) for `emailSignature`, `autoAppendSignature`, `email-template-settings` | 30 min | ☐ |
| 1.21 | Remove `console.log` of Twilio SID in `sms.controller.ts` and `req.body` in `message.controller.ts` — security-sensitive data leaks | 10 min | ☐ |
| 1.22 | Add `/tmp/uploads` cleanup — cron job to purge old files (multer writes message attachments to disk with no cleanup) | 30 min | ☐ |

**Phase Total: ~11 hours**

---

## PHASE 2: DATA & SCHEMA INTEGRITY (Days 3–4)
*Fix the data layer before building features on top of it.*

| # | Task | Time | Status |
|---|------|------|--------|
| 2.1 | **HIGH**: Add `organizationId` to `Note` model — every other model has it for multi-tenant isolation; without it, cross-org data leakage is possible | 1 hr | ☐ |
| 2.2 | Add `@relation` + `onDelete: Cascade` to `RefreshToken.organizationId` — currently a plain String with no FK; orphaned tokens survive org deletion | 30 min | ☐ |
| 2.3 | Add `@relation` to `WorkflowExecution.leadId` — currently a plain String; orphaned references if leads are deleted | 30 min | ☐ |
| 2.4 | Add `organizationId` to `ABTestResult` model for direct org-scoped queries | 30 min | ☐ |
| 2.5 | Convert inconsistent String status fields to enums: `CustomFieldDefinition.type`, `Notification.type`, `Integration.syncStatus`, `Segment.matchType`, `Message.bounceType` | 1.5 hr | ☐ |
| 2.6 | Add composite indexes for high-frequency queries: `Notification(userId, read)`, `Message(organizationId, type)`, `LoginHistory(userId, isActive)` | 30 min | ☐ |
| 2.7 | Add stale data cleanup cron jobs: prune expired `RefreshToken`, `PasswordResetToken`, `LoginHistory`, and `AIInsight` (has `expiresAt` field but nothing ever deletes expired records) | 2 hr | ☐ |

**Phase Total: ~7 hours (1 day)**

> **Note:** `SystemSettings` Prisma model creation moved to Phase 10 (Admin) — depends on admin panel design decisions.

---

## PHASE 3: FEATURE WIRING (Days 4–6)
*Connect frontend and backend for things that are half-built, so we can build on a solid base.*

| # | Task | Time | Status |
|---|------|------|--------|
| 3.1 | Fetch activities from API in LeadsList (currently TODO) | 1.5 hr | ☐ |
| 3.2 | Integrate email service into AI functions | 2 hr | ☐ |
| 3.3 | Integrate SMS service into AI functions | 2 hr | ☐ |
| 3.4 | Implement local disk file upload with cleanup for profile photos + business logos (S3/R2 deferred to Phase 16) | 2 hr | ☐ |
| 3.5 | Implement integration sync logic (per provider) | 4 hr | ☐ |
| 3.6 | Wire `/api/deliverability/*` endpoints into a Deliverability Dashboard (9 endpoints exist with no UI) | 3 hr | ☐ |
| 3.7 | Wire `/api/reports/saved/*` into a saved reports UI | 2 hr | ☐ |
| 3.8 | Ensure `/api/intelligence/*` prefix is correctly used by `IntelligenceInsights.tsx` | 30 min | ☐ |

**Phase Total: ~17 hours (2 days)**

---

## PHASE 4: LEAD MANAGEMENT FEATURES (Days 6–14)
*Core CRM feature — the heart of the product.*

| # | Task | Time | Status |
|---|------|------|--------|
| 4.1 | Follow-up reminders (email/push/in-app delivery) | 6 hr | ☐ |
| 4.2 | Call logging on lead detail (outcome, duration, notes) | 4 hr | ☐ |
| 4.3 | Communication history tab on lead detail | 4 hr | ☐ |
| 4.4 | Custom pipeline stages (no `Pipeline` model exists — needs schema + UI) | 4 hr | ☐ |
| 4.5 | Multiple pipelines (buyer/seller/rental) | 6 hr | ☐ |
| 4.6 | Saved filter views on leads list | 3 hr | ☐ |
| 4.7 | Column customization on leads list | 3 hr | ☐ |
| 4.8 | Lead import column mapping UI | 4 hr | ☐ |
| 4.9 | Lead import duplicate detection | 3 hr | ☐ |
| 4.10 | Lead import Excel/vCard support | 4 hr | ☐ |
| 4.11 | Lead merge field-level resolution | 3 hr | ☐ |
| 4.12 | Lead merge backend endpoint (verify + fix 404 handling) | 2 hr | ☐ |
| 4.13 | Related contacts on leads — simple join table for spouse, co-buyer, attorney, lender | 3 hr | ☐ |
| 4.14 | Lead assignment automation (round-robin) | 3 hr | ☐ |
| 4.15 | Real-estate-specific lead fields (property type, beds, budget, pre-approval) | 4 hr | ☐ |
| 4.16 | Intra-org lead deduplication tool | 3 hr | ☐ |

**Phase Total: ~59 hours (7.5 days)**

---

## PHASE 5: CAMPAIGNS & WORKFLOWS (Days 14–19)

| # | Task | Time | Status |
|---|------|------|--------|
| 5.1 | Rich text / WYSIWYG email editor (TipTap or Quill — no editor library currently installed) | 6 hr | ☐ |
| 5.2 | Template responsive preview (desktop/mobile) | 3 hr | ☐ |
| 5.3 | Email attachment support in campaigns | 3 hr | ☐ |
| 5.4 | SMS STOP-word handling for TCPA compliance (email opt-out already built — unsubscribe routes, `emailOptOutAt`, `unsubscribeToken` all exist; just need SMS STOP keyword processing in Twilio webhook) | 1 hr | ☐ |
| 5.5 | CAN-SPAM compliance auto-insertion | 2 hr | ☐ |
| 5.6 | MMS support | 4 hr | ☐ |
| 5.7 | Per-recipient campaign activity log | 3 hr | ☐ |
| 5.8 | Send-time optimization | 4 hr | ☐ |
| 5.9 | Campaign A/B auto-winner | 2 hr | ☐ |
| 5.10 | Conditional branching in workflows (if/else) | 6 hr | ☐ |
| 5.11 | Wait/delay steps in workflows | 3 hr | ☐ |
| 5.12 | Webhook trigger | 3 hr | ☐ |
| 5.13 | Workflow execution logs per rule | 3 hr | ☐ |
| 5.14 | Workflow error retry configuration | 2 hr | ☐ |

**Phase Total: ~45 hours (5.5 days)**

---

## PHASE 6: ANALYTICS + CALENDAR (Days 19–23)

| # | Task | Time | Status |
|---|------|------|--------|
| 6.1 | Multi-touch attribution | 5 hr | ☐ |
| 6.2 | Period-over-period comparison | 4 hr | ☐ |
| 6.3 | Automated report scheduling | 4 hr | ☐ |
| 6.4 | Goal setting & tracking | 4 hr | ☐ |
| 6.5 | Lead velocity metrics | 3 hr | ☐ |
| 6.6 | Source ROI calculation | 3 hr | ☐ |
| 6.7 | Add ICS export / "Add to Calendar" links for appointments and follow-ups (lightweight alternative to full calendar sync) | 2 hr | ☐ |
| 6.8 | Recurring follow-ups | 3 hr | ☐ |
| 6.9 | Follow-up analytics (completion rate, response time) | 3 hr | ☐ |

**Phase Total: ~31 hours (4 days)**

---

## PHASE 7: AUTH FEATURES (Days 23–24)

| # | Task | Time | Status |
|---|------|------|--------|
| 7.1 | MFA challenge step on login — backend 2FA fully built (speakeasy, QR codes, enable/disable all work); just need: (1) check `twoFactorEnabled` in `login()`, (2) return `requires2FA` flag, (3) `/auth/verify-2fa` endpoint, (4) frontend 2FA input | 2 hr | ☐ |
| 7.2 | Password strength indicator | 1 hr | ☐ |
| 7.3 | Email verification on register — `emailVerified` field exists on User (defaults `false`), security score checks it, but `register()` never sends verification email | 3 hr | ☐ |
| 7.4 | Terms of Service checkbox on register | 30 min | ☐ |
| 7.5 | Add proactive JWT refresh before expiry + idle timeout/session expiry warning | 2 hr | ☐ |

**Phase Total: ~9 hours (1 day)**

---

## PHASE 8: AI FEATURES (Days 24–27)
*Uses your OpenAI key as default. Teams/orgs can optionally provide their own key and personalize their AI.*

| # | Task | Time | Status |
|---|------|------|--------|
| 8.1 | AI model selection (GPT-4o / 4o-mini / o3-mini / Claude — per decided model list) | 4 hr | ☐ |
| 8.2 | Team/org custom API key support (optional override of default platform key) | 3 hr | ☐ |
| 8.3 | AI personalization per team (system prompts, tone, industry context) | 4 hr | ☐ |
| 8.4 | AI cost tracking dashboard ($ amounts, not just counts) | 3 hr | ☐ |
| 8.5 | AI insight feedback loop (thumbs up/down on responses) | 2 hr | ☐ |
| 8.6 | AI-powered lead enrichment | 4 hr | ☐ |
| 8.7 | AI cost/budget alerts per team | 2 hr | ☐ |

**Phase Total: ~22 hours (3 days)**

> **Note:** AI response streaming (SSE) is already implemented in `ai.controller.ts` with proper `text/event-stream` headers — no work needed.

---

## PHASE 9: TELEPHONY (Days 27–30)

| # | Task | Time | Status |
|---|------|------|--------|
| 9.1 | Phone campaigns / power dialer | 8 hr | ☐ |
| 9.2 | Call recording & transcription | 6 hr | ☐ |
| 9.3 | Voicemail drop (real implementation) | 3 hr | ☐ |
| 9.4 | Real-time WebSocket push (new leads, messages, notifications — replace polling) | 4 hr | ☐ |
| 9.5 | Document attachments on leads | 3 hr | ☐ |

**Phase Total: ~24 hours (3 days)**

---

> **MILESTONE: All features built — Day 30**

---

## PHASE 10: ADMIN, TEAM, BILLING & SUBSCRIPTION (Days 30–36)
*Deferred here intentionally — many design and scope decisions still pending (e.g., help page layout, billing page structure, admin panel features, team management flow). Build once decisions are finalized.*

### 10A: Admin Panel

| # | Task | Time | Status |
|---|------|------|--------|
| 10.1 | Create `SystemSettings` Prisma model — currently stored in an in-memory JS object (`Record<string, any>` in `admin.controller.ts`), lost on every restart | 1 hr | ☐ |
| 10.2 | Wire `ServiceConfiguration` page to real settings API (depends on SystemSettings model) | 2 hr | ☐ |
| 10.3 | Wire `SystemSettings` page — remaining sections that don't save (depends on SystemSettings model) | 1.5 hr | ☐ |
| 10.4 | Admin audit trail (full activity logging) | 4 hr | ☐ |
| 10.5 | Data backup & restore UI (button exists, not wired) | 4 hr | ☐ |
| 10.6 | Add `createdById` audit trail to `Task`, `Segment`, `Workflow`, `Tag` models | 2 hr | ☐ |
| 10.7 | Help pages — review current design, decide what to keep/change/remove (currently 4 pages with stat cards, 1,431 lines of hardcoded content — user likes current look, needs final decision) | TBD | ☐ |

### 10B: Team Management

| # | Task | Time | Status |
|---|------|------|--------|
| 10.8 | Send real invitation emails on team invite | 2 hr | ☐ |
| 10.9 | Fix `BusinessSettings` / `Integration` / `EmailConfig` / `SMSConfig` ownership — tied to User instead of Organization (schema design debt) | 4 hr | ☐ |

### 10C: Billing & Subscription

| # | Task | Time | Status |
|---|------|------|--------|
| 10.10 | Decide billing page structure — merge 3 pages (`BillingPage`, `BillingSubscriptionPage`, `admin/Subscription`) into 1 tabbed page, or keep separate | 3 hr | ☐ |
| 10.11 | BillingPage — replace hardcoded mock invoices with real data or honest empty state | 30 min | ☐ |
| 10.12 | Remove/fix fake `setTimeout` operations in `BillingPage` | 15 min | ☐ |
| 10.13 | Implement or remove stub billing/subscription backend routes that return 501 | 1 hr | ☐ |
| 10.14 | Extract inline billing business logic into `billing.controller.ts` | 40 min | ☐ |
| 10.15 | Wire Stripe checkout session creation | 4 hr | ☐ |
| 10.16 | Wire Stripe billing portal | 2 hr | ☐ |
| 10.17 | Wire Stripe payment methods retrieval | 2 hr | ☐ |
| 10.18 | Implement usage recording for metered billing | 3 hr | ☐ |
| 10.19 | Replace hardcoded invoices with real Stripe invoice API | 2 hr | ☐ |
| 10.20 | Subscription upgrade/downgrade flow | 3 hr | ☐ |
| 10.21 | Subscription tier sync — add consistency checks or DB triggers for the 3 cached `subscriptionTier` fields | 2 hr | ☐ |

**Phase Total: ~43 hours (5.5 days)**

---

## PHASE 11: FIX BROKEN PAGES + CONSOLIDATION (Days 36–37)
*Now that everything is built, fix dishonest pages and consolidate overlapping features.*

### 11A: Fix Broken/Fake Pages

| # | Task | Time | Status |
|---|------|------|--------|
| 11.1 | **Integrations Hub** — Remove fake connect/disconnect buttons for Salesforce/HubSpot/etc. (no real OAuth); keep the real email/SMS config status checks that already call the API | 1 hr | ☐ |
| 11.2 | **Fix CampaignsList error swallowing** — remove `catch { return null }`, let errors propagate to ErrorBoundary + toast | 30 min | ☐ |
| 11.3 | **Fix all 38+ silent `catch {}` blocks** — add error logging/toasts throughout frontend and backend | 3 hr | ☐ |
| 11.4 | **SecuritySettings** — Wire real session management (LoginHistory table exists); sessions list is still hardcoded | 1 hr | ☐ |
| 11.5 | Replace all hardcoded placeholder URLs (`crm.yourcompany.com`, `acmecorp.com`, `support@company.com`) with config-driven values or env vars | 30 min | ☐ |
| 11.6 | Remove or implement stub backend routes that return 501 | 30 min | ☐ |

### 11B: Consolidate Overlapping Pages

| # | Task | Time | Status |
|---|------|------|--------|
| 11.7 | Fix duplicate routes — redirect: `/analytics/report-builder` → `/analytics/custom-reports`, `/communication` → `/communication/inbox`, `/settings/team` → `/admin/team` | 30 min | ☐ |
| 11.8 | Merge `CampaignReports` + `CampaignAnalytics` into 1 "Campaign Performance" page (nearly identical metrics) | 2 hr | ☐ |
| 11.9 | Merge `AIAnalytics` + `IntelligenceInsights` + `PredictiveAnalytics` into 1 tabbed "AI Insights" page | 2 hr | ☐ |
| 11.10 | Convert `EmailCampaigns`, `SMSCampaigns`, `PhoneCampaigns` from separate pages to filter tabs on `CampaignsList` | 2 hr | ☐ |

**Phase Total: ~14 hours (1.5 days)**

---

## PHASE 12: UX POLISH (Days 37–39)
*Now that features are built, polish the user experience.*

| # | Task | Time | Status |
|---|------|------|--------|
| 12.1 | Fix dark mode persistence — add Zustand `persist` middleware to `uiStore.ts` (theme currently resets on every page refresh — not even in localStorage) | 15 min | ☐ |
| 12.2 | Fix sidebar state persistence (collapsed/expanded) — same `persist` middleware | 15 min | ☐ |
| 12.3 | Replace 21 `window.confirm()` dialogs across 19 files with a reusable styled `ConfirmDialog` component | 2.5 hr | ☐ |
| 12.4 | Add breadcrumb navigation (no breadcrumb component exists) | 2 hr | ☐ |
| 12.5 | Add page title management — `useDocumentTitle` hook, set unique title per page (browser tab currently shows same title everywhere) | 1.5 hr | ☐ |
| 12.6 | Fix WebSocket connection — verify real-time notifications flow end-to-end | 1.5 hr | ☐ |
| 12.7 | Wire frontend to consume WebSocket events for campaign updates, workflow events, lead updates (backend emits but nothing listens) | 2 hr | ☐ |
| 12.8 | Import existing `LoadingSkeleton` component into Calendar and Tasks pages | 15 min | ☐ |
| 12.9 | Add search debounce to `GlobalSearchModal` | 30 min | ☐ |
| 12.10 | Add toast maximum limit | 20 min | ☐ |
| 12.11 | Fix Dashboard export — raw JSON → CSV/PDF | 2 hr | ☐ |
| 12.12 | Fix CallCenter voicemail button (currently toast-only) | 1 hr | ☐ |
| 12.13 | Move Inbox templates/quick replies to API | 2 hr | ☐ |
| 12.14 | Verify keyboard shortcuts are wired | 1 hr | ☐ |
| 12.15 | Fix setTimeout memory leaks — add cleanup in `CommunicationInbox` (6 leaks), `LeadScoring`, `WorkflowBuilder`, `Login`, `Register` | 1 hr | ☐ |

**Phase Total: ~19 hours (2.5 days)**

---

## PHASE 13: CODE QUALITY + TESTING (Days 39–43)
*Split mega-files, set up testing, enforce standards.*

| # | Task | Time | Status |
|---|------|------|--------|
| 13.1 | Split `CommunicationInbox.tsx` (2,240 lines) into composable modules | 3 hr | ☐ |
| 13.2 | Split `LeadsList.tsx` (2,199 lines) into composable modules | 3 hr | ☐ |
| 13.3 | Fix rampant `any` types in backend (20+ instances in controllers) | 2 hr | ☐ |
| 13.4 | Extract inline business logic from route files into proper controllers: `billing.controller.ts`, `export.controller.ts`, `segmentation.controller.ts` | 2 hr | ☐ |
| 13.5 | Add consistent pagination to all list endpoints: segments, saved reports, billing invoices, deliverability lists | 1.5 hr | ☐ |
| 13.6 | Set up ESLint for backend (frontend already has it configured; backend has zero linting) | 1 hr | ☐ |
| 13.7 | Add pre-commit hooks with husky + lint-staged (lint + type-check on commit) | 1 hr | ☐ |
| 13.8 | Set up Vitest for frontend (zero test tooling currently installed — no vitest, no @testing-library) | 1.5 hr | ☐ |
| 13.9 | Write tests for critical paths: auth flow, lead CRUD, campaign CRUD | 4 hr | ☐ |
| 13.10 | Add backend integration tests for untested route groups: billing, export, segmentation, savedReport, deliverability, intelligence, webhook, team, AI, custom-field, subscription | 6 hr | ☐ |
| 13.11 | Add error boundaries around modals/drawers (AI Composer, Workflow Builder canvas, Calendar sidebar) | 1.5 hr | ☐ |
| 13.12 | Consolidate Redis clients — remove `redis` package, standardize on `ioredis` | 1 hr | ☐ |
| 13.13 | Upgrade vulnerable dependencies (axios, react-router-dom, vite/rollup, express/qs) | 2 hr | ☐ |
| 13.14 | API documentation polish (verify Swagger) | 2 hr | ☐ |

**Phase Total: ~32 hours (4 days)**

---

## PHASE 14: ACCESSIBILITY + MOBILE (Days 43–44)

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
| 14.9 | Add mobile bottom navigation bar | 3 hr | ☐ |
| 14.10 | Optimize large tables for mobile (responsive cards) | 3 hr | ☐ |
| 14.11 | Detect `prefers-color-scheme: dark` for initial theme | 30 min | ☐ |

**Phase Total: ~12 hours (1.5 days)**

---

## PHASE 15: ONBOARDING + FINAL POLISH (Days 44–45)

| # | Task | Time | Status |
|---|------|------|--------|
| 15.1 | Build real onboarding tour (not Getting Started cards) | 4 hr | ☐ |
| 15.2 | Add "Show Getting Started" in settings | 30 min | ☐ |
| 15.3 | Add guided tooltips/spotlight for new users | 3 hr | ☐ |
| 15.4 | Add notification sounds/indicators | 1.5 hr | ☐ |
| 15.5 | Add recent searches/history to GlobalSearchModal | 1.5 hr | ☐ |
| 15.6 | Standardize all "Coming Soon" pages with consistent design | 2 hr | ☐ |

**Phase Total: ~13 hours (1.5 days)**

---

> **MILESTONE: 100% complete — ~45 days**

---

## PHASE 16: DEFERRED + ENTERPRISE (Days 45+)
*Build based on customer demand. Items moved here from earlier phases as non-essential for v1.*

| # | Task | Time | Status |
|---|------|------|--------|
| 16.1 | S3/R2 cloud file upload (local disk works for v1) | 4 hr | ☐ |
| 16.2 | Google Calendar 2-way sync (requires Google Cloud Console setup + OAuth consent) | 6 hr | ☐ |
| 16.3 | Outlook Calendar 2-way sync (requires Microsoft app registration) | 5 hr | ☐ |
| 16.4 | Google OAuth login flow | 4 hr | ☐ |
| 16.5 | DNS verification endpoint for custom sending domains | 2 hr | ☐ |
| 16.6 | Email template drag-and-drop builder (Unlayer/react-email-editor) | 8 hr | ☐ |
| 16.7 | AI templates migration to database (hardcoded defaults work fine) | 2 hr | ☐ |
| 16.8 | Third-party lead sources (Zillow, Realtor.com) | 8 hr | ☐ |
| 16.9 | Client portal | TBD | ☐ |
| 16.10 | Mobile app / PWA | TBD | ☐ |
| 16.11 | White-labeling | TBD | ☐ |
| 16.12 | Multi-language / i18n | TBD | ☐ |
| 16.13 | Social login (Google/Microsoft) | TBD | ☐ |
| 16.14 | Social Media Dashboard — real API connections | TBD | ☐ |

---

## ADDITIONAL FINDINGS

These were discovered during deep codebase analysis and are incorporated into the phases above:

| # | Finding | Severity | Phase |
|---|---------|----------|-------|
| A | **Token key mismatch** — `useSocket.ts` (3 occurrences), `NotificationBell.tsx`, `AIComposer.tsx`, `ContentGeneratorWizard.tsx` read `'token'` but auth stores as `'accessToken'`. WebSocket + AI streaming completely broken. | CRITICAL | 1.1 |
| B | **WebSocket JWT_SECRET vs JWT_ACCESS_SECRET** — socket.ts uses wrong env var, falls back to `'dev-secret'`. | CRITICAL | 1.2 |
| C | **`prisma/migrations/` gitignored** — migrations must be committed for reproducible deploys. | CRITICAL | 0.9 |
| D | **Webhook signature bypass** — when Twilio/SendGrid tokens aren't configured, verification is skipped. | HIGH | 1.3 |
| E | **Hardcoded encryption key fallback** — `'default-32-byte-key-change-this!'` if env var missing. | HIGH | 1.4 |
| F | **No uncaughtException/unhandledRejection handlers** — server crashes silently. | HIGH | 1.5 |
| G | **`package-lock.json` gitignored** — builds are non-reproducible. | HIGH | 0.9 |
| H | **`Note` model missing `organizationId`** — multi-tenant data isolation gap. | HIGH | 2.1 |
| I | **`$queryRawUnsafe`** in admin controller — 7 usages with string interpolation. | MEDIUM | 1.17 |
| J | **`asyncHandler` missing from 10 route files** — not 4 as originally estimated. | MEDIUM | 1.11 |
| K | **21 `window.confirm()` dialogs** across 19 files — not 3 as originally counted. | MEDIUM | 12.3 |
| L | **451 `console.*` statements** — not 92 as originally counted (342 BE + 109 FE). | MEDIUM | 0.6 |
| M | **Admin pages with no frontend role guard** — pages render for regular users. | MEDIUM | 1.16 |
| N | **localStorage not cleaned on logout** — settings leak between users. | MEDIUM | 1.19 |
| O | **localStorage keys not user-scoped** — user A's data shows for user B. | MEDIUM | 1.20 |
| P | **SystemSettings in-memory store** — lost on restart, no Prisma model. | MEDIUM | 10.1 |
| Q | **No stale data cleanup** — 4 tables with expirable data, no pruning cron. | MEDIUM | 2.7 |
| R | **Missing composite indexes** — 3+ high-frequency query patterns. | MEDIUM | 2.6 |
| S | **`/tmp/uploads` never cleaned** — disk exhaustion risk. | MEDIUM | 1.22 |
| T | **Backend `.env.example` missing ~16 vars**. | MEDIUM | 0.12 |
| U | **5 dev-only pages shipping to production** — DemoDataGenerator, DebugConsole, DatabaseMaintenance, RetryQueue, FeatureFlags. | MEDIUM | 0.14 |
| V | **Feature overload** — 84 pages / 91 routes (~4x competing CRMs). Consolidation in Phase 11B after features built. | DESIGN | 11B |
| W | **3 billing pages with significant overlap** — decision deferred. | DESIGN | 10.10 |
| X | **AI SSE streaming already implemented** — removed from plan (was 4 wasted hours). | INFO | — |
| Y | **HealthCheckDashboard already wired** to real API — removed from plan. | INFO | — |
| Z | **Newsletter already has "Coming Soon" banner** — removed from plan. | INFO | — |
| AA | **LoadingSkeleton component already exists** — just needs importing in 2 more files. | INFO | 12.8 |
| BB | **2FA backend fully implemented** (speakeasy) — only login flow gap remains. | INFO | 7.1 |
| CC | **Email opt-out infrastructure exists** — only SMS STOP keyword handling needed. | INFO | 5.4 |

---

## TIMELINE SUMMARY

| Phase | Focus | Days | Cumulative |
|-------|-------|------|------------|
| 0 | Codebase hygiene | 1 | 1 |
| 1 | Critical security | 1.5 | 2.5 |
| 2 | Data & schema integrity | 1 | 3.5 |
| **MILESTONE** | **Foundation solid** | | **3.5 days** |
| 3 | Feature wiring | 2 | 5.5 |
| 4 | Lead management | 7.5 | 13 |
| 5 | Campaigns & workflows | 5.5 | 18.5 |
| 6 | Analytics + calendar | 4 | 22.5 |
| 7 | Auth features | 1 | 23.5 |
| 8 | AI features | 3 | 26.5 |
| 9 | Telephony | 3 | 29.5 |
| **MILESTONE** | **All features built** | | **~30 days** |
| 10 | Admin, Team, Billing & Subscription | 5.5 | 35 |
| 11 | Fix broken pages + consolidation | 1.5 | 36.5 |
| 12 | UX polish | 2.5 | 39 |
| 13 | Code quality + testing | 4 | 43 |
| 14 | Accessibility + mobile | 1.5 | 44.5 |
| 15 | Onboarding + final polish | 1.5 | 46 |
| **MILESTONE** | **100% complete** | | **~45 days** |
| 16 | Deferred + Enterprise | TBD | — |

---

## AUDIT CHANGELOG

**March 2, 2026 — Reordered: build first, polish last:**

*Reordering rationale:*
- Build all features first so we can see what we have
- Keep all routes/pages/buttons during building — shows what exists and avoids premature removal
- Consolidate overlapping pages AFTER everything is built, when we can actually evaluate what's redundant vs. what to keep
- UX polish, accessibility, mobile optimization, onboarding, and code quality come at the end
- Admin/Team/Billing/Subscription stays near the end — design decisions still pending

*New order:*
- Phases 0–2: Foundation (hygiene, security, database) — unchanged
- Phases 3–9: BUILD FEATURES (wiring, leads, campaigns, analytics, auth, AI, telephony)
- Phase 10: Admin/Team/Billing/Subscription (decisions pending)
- Phases 11–15: POLISH (fix broken pages, consolidate overlaps, UX, code quality, testing, accessibility, mobile, onboarding)
- Phase 16: Deferred/Enterprise — unchanged

*Tasks moved:*
- `window.confirm()` replacement (was Phase 0.14) → Phase 12.3 (UX polish)
- Feature Wiring (was Phase 7) → Phase 3 (build early)
- Lead Management (was Phase 9) → Phase 4
- Campaigns & Workflows (was Phase 10) → Phase 5
- Analytics + Calendar (was Phase 11) → Phase 6
- Auth features (was Phase 12) → Phase 7
- AI Features (was Phase 13) → Phase 8
- Telephony (was Phase 15) → Phase 9
- Broken pages + consolidation (was Phase 3) → Phase 11 (polish phase)
- UX Essentials (was Phase 4) → Phase 12 (polish phase)
- Code Quality + Testing (was Phase 5) → Phase 13 (polish phase)
- Accessibility + Mobile (was Phase 6) → Phase 14 (polish phase)
- Onboarding (was Phase 8) → Phase 15 (polish phase)
- JWT refresh (was Phase 4.16) → Phase 7.5 (auth features)

---

**March 2, 2026 — Admin/Team/Billing/Subscription deferral:**

*Deferred to Phase 10 (decisions pending):*
- Help pages — user likes current design with stat cards; needs final decision before changing
- SystemSettings Prisma model
- ServiceConfiguration page wiring
- SystemSettings page wiring
- BillingPage mock invoice fix
- BillingPage setTimeout fix
- Billing page consolidation
- Billing controller extraction
- Team invite emails
- BusinessSettings/Integration ownership fix
- Admin audit trail
- Data backup & restore UI
- Subscription tier sync
- `createdById` audit trails

---

**March 1, 2026 — Post-audit revision:**

*Removed (already done):*
- Newsletter "Coming Soon" banner — already implemented with real API call
- HealthCheckDashboard wiring — already calls `adminApi.healthCheck()` with auto-refresh
- AI response streaming (SSE) — fully implemented in `ai.controller.ts`
- Loading skeleton creation — component already exists, just needs 2 imports (reduced to 15 min)

*Removed (unnecessary work):*
- Help Center rebuild (3 hr) → replaced with delete + single link page (1 hr)
- Support Ticket System build (3 hr) → deleted (use external tool)
- Video Tutorial Library (1 hr) → deleted
- DemoDataGenerator wiring (1.5 hr) → deleted (dev tool, shouldn't ship)
- DebugConsole wiring (2 hr) → deleted (use Sentry/Datadog)
- RetryQueue wiring (1.5 hr) → deleted (ops tool, not user-facing)
- Drag-and-drop email builder (8 hr) → deferred to Phase 16 (overkill for CRM v1)
- Google/Outlook Calendar 2-way sync (11 hr) → deferred; replaced with ICS export (2 hr)
- Google OAuth (4 hr) → deferred to Phase 16
- Social Media Dashboard + campaigns (10 hr) → dropped (not a CRM feature)
- DNS verification (2 hr) → deferred (SendGrid handles deliverability)
- AI templates to DB (2 hr) → deferred (hardcoded defaults work)
- Feature flags backend (2 hr) → dropped (over-engineered for CRM)
- Dark mode API persistence (1.5 hr) → Zustand persist middleware (15 min)

*Corrected counts:*
- `window.confirm()`: 3 → **21 across 19 files** (time: 30 min → 2.5 hr)
- `console.*` statements: 92 → **451** (time: 1 hr → 4 hr)
- Compiled `.js` test files: 9 → **11**
- `asyncHandler` missing: 4 route files → **10 route files** (time: 1 hr → 2 hr)
- Root `.md` files: 143 → **144**
- Backend ad-hoc scripts: 44 → **42** (2 are legit jest configs)

*Added:*
- Phase 0.14: Delete 5 dev-only pages (~2,093 lines)
- Phase 11B: Consolidation sub-phase (merge campaign, analytics, AI overlapping pages) — done AFTER features built
- Phase 2.5: Correct enum fields (5 models using plain strings instead of enums)

*Net savings from March 1 audit: ~51 hours (~6.5 working days). Total: 57 days → 45 days.*
