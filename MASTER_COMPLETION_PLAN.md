# Master Real Estate Pro — 100% Completion Plan

> **Created:** February 28, 2026
> **Total Estimated Days:** ~51 working days
> **Billing, AI calls, and Social Media are intentionally scheduled last.**

---

## PHASE 0: CODEBASE HYGIENE (Day 1)
*Do this first so every subsequent commit is on a clean base.*

| # | Task | Time | Status |
|---|------|------|--------|
| 0.1 | Delete 143 root `.md` files (keep only README) | 15 min | ☐ |
| 0.2 | Delete 15 root `.sh` scripts + `test-output.log` + `test-results.log` | 10 min | ☐ |
| 0.3 | Delete 44 backend root ad-hoc scripts (`.sh`, `.js`, `.py`, `.bak` files) | 10 min | ☐ |
| 0.4 | Delete 6 compiled `.js` test files in backend root | 5 min | ☐ |
| 0.5 | Remove `src/data/mockData.ts` (820 lines) + `src/config/mockData.config.ts` + all 5 page imports | 30 min | ☐ |
| 0.6 | Replace 92 `console.log/error/warn` statements with proper logger (pino backend / remove in frontend) | 1 hr | ☐ |
| 0.7 | Remove unused deps: `redis`, `node-fetch` from backend; `reactflow` from frontend | 10 min | ☐ |
| 0.8 | Move `@types/multer` to devDeps, remove `@types/helmet` | 5 min | ☐ |
| 0.9 | Add to `.gitignore`: `coverage/`, `playwright-report/`, `test-results/`, `*.tsbuildinfo`, `*.env.local`, `backend/dist/` | 5 min | ☐ |
| 0.10 | Create frontend `.env.example` documenting `VITE_API_URL` | 5 min | ☐ |
| 0.11 | Fix Zod version mismatch (backend has v4, frontend has v3 — pick one) | 15 min | ☐ |
| 0.12 | Replace 10 `window.confirm()` dialogs with styled confirmation modals | 1 hr | ☐ |

**Phase Total: ~4 hours**

---

## PHASE 1: CRITICAL SECURITY FIXES (Days 1-2)
*Fix anything that would be a production vulnerability.*

| # | Task | Time | Status |
|---|------|------|--------|
| 1.1 | **CRITICAL**: Fix token key mismatch — change `localStorage.getItem('token')` → `'accessToken'` in `useSocket.ts`, `NotificationBell.tsx`, `ContentGeneratorWizard.tsx`, `AIComposer.tsx` | 20 min | ☐ |
| 1.2 | **CRITICAL**: Fix WebSocket JWT secret — change `JWT_SECRET` → `JWT_ACCESS_SECRET` in `socket.ts`, remove `'dev-secret'` fallback | 10 min | ☐ |
| 1.3 | **HIGH**: Fix webhook auth bypass — don't skip verification when tokens are unset, return 401 instead | 20 min | ☐ |
| 1.4 | **HIGH**: Remove hardcoded encryption key fallback in `encryption.ts` — fail loudly if `MASTER_ENCRYPTION_KEY` is not set | 10 min | ☐ |
| 1.5 | Add `requireAdmin` to user management routes | 20 min | ☐ |
| 1.6 | Add `requireAdmin` to AI settings routes | 20 min | ☐ |
| 1.7 | Add Zod validation to all AI route request bodies | 1.5 hr | ☐ |
| 1.8 | Add rate limiting to: message send, password change, workflow trigger/test | 1 hr | ☐ |
| 1.9 | Wrap admin route handlers in `asyncHandler` | 30 min | ☐ |
| 1.10 | Add body validation to notification creation | 20 min | ☐ |
| 1.11 | Add Zod validation to lead merge endpoint | 20 min | ☐ |
| 1.12 | Add `validateParams` to inline campaign route handlers | 30 min | ☐ |
| 1.13 | Add rate limiting to unsubscribe + team invite endpoints | 30 min | ☐ |
| 1.14 | Wire authorization middleware (defined but never used) or remove dead code | 30 min | ☐ |
| 1.15 | Add frontend role guards to 7 admin pages (`FeatureFlags`, `DebugConsole`, `DatabaseMaintenance`, `SystemSettings`, `HealthCheckDashboard`, `RetryQueue`, `DataExportWizard`) | 45 min | ☐ |
| 1.16 | Fix `$queryRawUnsafe` in admin controller — parameterize queries | 30 min | ☐ |
| 1.17 | Fix CORS mismatch — `socket.ts` uses `CORS_ORIGIN` but `.env` has `FRONTEND_URL` | 10 min | ☐ |
| 1.18 | Clean up localStorage on logout — clear `emailSignature`, `autoAppendSignature`, `email-template-settings`, `feature-flags` | 15 min | ☐ |
| 1.19 | Fix localStorage keys to be user-specific (prefix with userId) for `emailSignature`, `autoAppendSignature`, `email-template-settings` | 30 min | ☐ |
| 1.20 | Remove `console.log` of Twilio SID in `sms.controller.ts` and `req.body` in `message.controller.ts` — security-sensitive data leaks | 10 min | ☐ |

**Phase Total: ~9 hours**

---

## PHASE 2: BROKEN/FAKE PAGES (Days 2-4)
*Everything a user can click that currently does nothing or lies.*

| # | Task | Time | Status |
|---|------|------|--------|
| 2.1 | **Help Center** — Rebuild as real knowledge base with search (or strip to simple FAQ) | 3 hr | ☐ |
| 2.2 | **Support Ticket System** — Wire form to backend (create `support-ticket.routes.ts` + DB model) or remove + link to external support | 3 hr | ☐ |
| 2.3 | **Video Tutorial Library** — Embed real videos or remove page, replace with link to docs site | 1 hr | ☐ |
| 2.4 | **Newsletter Management** — Honest "Coming Soon" banner, remove fake subscriber data and fake delete success | 1 hr | ☐ |
| 2.5 | **Integrations Hub** — Remove fake connect/disconnect buttons for integrations with no real OAuth flow; show honest status | 2 hr | ☐ |
| 2.6 | **Fix CampaignsList error swallowing** — remove `catch { return null }`, let errors propagate to ErrorBoundary + toast | 30 min | ☐ |
| 2.7 | **Fix all 38+ silent `catch {}` blocks** — add error logging/toasts throughout frontend and backend | 3 hr | ☐ |
| 2.8 | **DemoDataGenerator** — Wire to real backend seed endpoint or remove page | 1.5 hr | ☐ |
| 2.9 | **DebugConsole** — Wire to real log streaming API or remove | 2 hr | ☐ |
| 2.10 | **RetryQueue** — Wire to real job queue data or remove | 1.5 hr | ☐ |
| 2.11 | **HealthCheckDashboard** — Wire to real system metrics (CPU/memory/disk from `/api/admin/health`) | 1.5 hr | ☐ |
| 2.12 | **ServiceConfiguration** — Wire remaining 5/6 stub sections to real settings API | 2 hr | ☐ |
| 2.13 | **SystemSettings** — Wire remaining 4/6 sections that don't save | 1.5 hr | ☐ |
| 2.14 | **SecuritySettings** — Wire real session management (LoginHistory table exists, use it) | 2 hr | ☐ |
| 2.15 | **BillingPage invoices** — Replace hardcoded mock invoices with real API call (show "no invoices yet" honestly until Stripe is wired) | 1 hr | ☐ |
| 2.16 | Remove/fix fake `setTimeout` operations in `DemoDataGenerator`, `BillingPage`, `DebugConsole` | 30 min | ☐ |
| 2.17 | Fix duplicate routes — convert duplicate paths to redirects, resolve `/settings/team` vs `/admin/team` auth mismatch | 30 min | ☐ |
| 2.18 | Replace all hardcoded placeholder URLs (`crm.yourcompany.com`, `acmecorp.com`, `support@company.com`) with config-driven values or env vars | 30 min | ☐ |
| 2.19 | Remove or implement stub backend routes (endpoints that return 501) — mark billing stubs honestly | 1 hr | ☐ |

**Phase Total: ~28 hours (3.5 days)**

---

## PHASE 3: UX ESSENTIALS (Days 4-5)
*Core usability that every user will notice.*

| # | Task | Time | Status |
|---|------|------|--------|
| 3.1 | Fix dark mode persistence (save to user profile API, not just localStorage) | 1.5 hr | ☐ |
| 3.2 | Fix sidebar state persistence (collapsed/expanded) | 30 min | ☐ |
| 3.3 | Add breadcrumb navigation | 2 hr | ☐ |
| 3.4 | Fix WebSocket connection (now works after Phase 1 token fixes) — verify real-time notifications flow end-to-end | 1.5 hr | ☐ |
| 3.5 | Wire frontend to consume WebSocket events for campaign updates, workflow events, lead updates (backend emits but nothing listens) | 2 hr | ☐ |
| 3.6 | Add loading skeletons to Calendar page | 1 hr | ☐ |
| 3.7 | Add loading skeletons to Tasks page | 1 hr | ☐ |
| 3.8 | Add search debounce to `GlobalSearchModal` | 30 min | ☐ |
| 3.9 | Add toast maximum limit | 20 min | ☐ |
| 3.10 | Fix Dashboard export — raw JSON → CSV/PDF | 2 hr | ☐ |
| 3.11 | Fix CallCenter voicemail button (currently toast-only) | 1 hr | ☐ |
| 3.12 | Move Inbox templates/quick replies to API | 2 hr | ☐ |
| 3.13 | Add `aria-live="polite"` to `ToastContainer` | 10 min | ☐ |
| 3.14 | Verify keyboard shortcuts are wired | 1 hr | ☐ |
| 3.15 | Fix setTimeout memory leaks — add cleanup in `CommunicationInbox` (6 leaks), `LeadScoring`, `WorkflowBuilder`, `Login`, `Register` | 1 hr | ☐ |
| 3.16 | Add proactive JWT refresh before expiry + idle timeout/session expiry warning | 2 hr | ☐ |

**Phase Total: ~20 hours (2.5 days)**

---

## PHASE 4: CODE QUALITY + TESTING FOUNDATION (Days 6-8)
*Split mega-files, set up testing, clean types.*

| # | Task | Time | Status |
|---|------|------|--------|
| 4.1 | Split `CommunicationInbox.tsx` (2,240 lines) into composable modules | 3 hr | ☐ |
| 4.2 | Split `LeadsList.tsx` (2,199 lines) into composable modules | 3 hr | ☐ |
| 4.3 | Fix rampant `any` types in backend (20+ instances in controllers) | 2 hr | ☐ |
| 4.4 | Set up Vitest for frontend with proper config | 1.5 hr | ☐ |
| 4.5 | Write tests for critical paths: auth flow, lead CRUD, campaign CRUD | 4 hr | ☐ |
| 4.6 | Add missing backend integration tests | 3 hr | ☐ |
| 4.7 | Add error boundaries around modals/drawers (AI Composer, Workflow Builder canvas, Calendar sidebar) | 1.5 hr | ☐ |
| 4.8 | Consolidate Redis clients — remove `redis` package, standardize on `ioredis` | 1 hr | ☐ |
| 4.9 | Upgrade vulnerable dependencies (axios, react-router-dom, vite/rollup, express/qs) | 2 hr | ☐ |

**Phase Total: ~21 hours (2.5 days)**

---

## PHASE 5: ACCESSIBILITY + MOBILE (Days 8-10)

| # | Task | Time | Status |
|---|------|------|--------|
| 5.1 | Add skip-to-content link | 20 min | ☐ |
| 5.2 | Add `<nav aria-label>` to sidebar | 15 min | ☐ |
| 5.3 | Add `role="dialog"` and `aria-label` to `GlobalSearchModal` | 15 min | ☐ |
| 5.4 | Add `aria-expanded`/`aria-haspopup` to header dropdown | 15 min | ☐ |
| 5.5 | Add `aria-label` to all icon-only buttons | 2 hr | ☐ |
| 5.6 | Add focus management on mobile sidebar | 1 hr | ☐ |
| 5.7 | Add slide-in animation to sidebar | 1 hr | ☐ |
| 5.8 | Add mobile bottom navigation bar | 3 hr | ☐ |
| 5.9 | Optimize large tables for mobile (responsive cards) | 3 hr | ☐ |
| 5.10 | Detect `prefers-color-scheme: dark` for initial theme | 30 min | ☐ |

**Phase Total: ~12 hours (1.5 days)**

---

## PHASE 6: REAL FEATURE WIRING (Days 10-14)
*Connect frontend and backend for things that are half-built.*

| # | Task | Time | Status |
|---|------|------|--------|
| 6.1 | Wire DNS verification endpoint for email config | 2 hr | ☐ |
| 6.2 | Fetch activities from API in LeadsList (currently TODO) | 1.5 hr | ☐ |
| 6.3 | Integrate email service into AI functions | 2 hr | ☐ |
| 6.4 | Integrate SMS service into AI functions | 2 hr | ☐ |
| 6.5 | Implement S3/R2 file upload for profile photos + business logos | 4 hr | ☐ |
| 6.6 | Send real invitation emails on team invite | 2 hr | ☐ |
| 6.7 | Implement integration sync logic (per provider) | 4 hr | ☐ |
| 6.8 | Migrate AI templates to database (currently in-memory) | 2 hr | ☐ |
| 6.9 | Feature flags — move from localStorage to backend persistence | 2 hr | ☐ |
| 6.10 | Fix `BusinessSettings` / `Integration` / `EmailConfig` / `SMSConfig` ownership — tied to User instead of Organization (schema design debt) | 4 hr | ☐ |
| 6.11 | Wire `/api/deliverability/*` endpoints into a Deliverability Dashboard (9 endpoints exist with no UI) | 3 hr | ☐ |
| 6.12 | Wire `/api/reports/saved/*` into a saved reports UI | 2 hr | ☐ |
| 6.13 | Ensure `/api/intelligence/*` prefix is correctly used by `IntelligenceInsights.tsx` | 30 min | ☐ |

**Phase Total: ~31 hours (4 days)**

---

## PHASE 7: ONBOARDING + POLISH (Days 14-16)

| # | Task | Time | Status |
|---|------|------|--------|
| 7.1 | Build real onboarding tour (not Getting Started cards) | 4 hr | ☐ |
| 7.2 | Add "Show Getting Started" in settings | 30 min | ☐ |
| 7.3 | Add guided tooltips/spotlight for new users | 3 hr | ☐ |
| 7.4 | Add notification sounds/indicators | 1.5 hr | ☐ |
| 7.5 | Add recent searches/history to GlobalSearchModal | 1.5 hr | ☐ |
| 7.6 | Standardize all "Coming Soon" pages with consistent design | 2 hr | ☐ |
| 7.7 | Create a proper frontend `.env.example` | 15 min | ☐ |

**Phase Total: ~13 hours (1.5 days)**

---

## PHASE 8: LEAD MANAGEMENT FEATURES (Days 16-22)

| # | Task | Time | Status |
|---|------|------|--------|
| 8.1 | Follow-up reminders (email/push/in-app delivery) | 6 hr | ☐ |
| 8.2 | Call logging on lead detail (outcome, duration, notes) | 4 hr | ☐ |
| 8.3 | Communication history tab on lead detail | 4 hr | ☐ |
| 8.4 | Custom pipeline stages | 4 hr | ☐ |
| 8.5 | Multiple pipelines (buyer/seller/rental) | 6 hr | ☐ |
| 8.6 | Saved filter views on leads list | 3 hr | ☐ |
| 8.7 | Column customization on leads list | 3 hr | ☐ |
| 8.8 | Lead import column mapping UI | 4 hr | ☐ |
| 8.9 | Lead import duplicate detection | 3 hr | ☐ |
| 8.10 | Lead import Excel/vCard support | 4 hr | ☐ |
| 8.11 | Lead merge field-level resolution | 3 hr | ☐ |
| 8.12 | Lead merge backend endpoint (verify + fix 404 handling) | 2 hr | ☐ |
| 8.13 | Related contacts on leads (spouse, co-buyer, attorney, lender) | 4 hr | ☐ |
| 8.14 | Lead assignment automation (round-robin) | 3 hr | ☐ |
| 8.15 | Real-estate-specific lead fields (property type, beds, budget, pre-approval) | 4 hr | ☐ |
| 8.16 | Intra-org lead deduplication tool | 3 hr | ☐ |

**Phase Total: ~60 hours (7.5 days)**

---

## PHASE 9: CAMPAIGNS & WORKFLOWS (Days 22-30)

| # | Task | Time | Status |
|---|------|------|--------|
| 9.1 | Rich text / WYSIWYG email editor | 6 hr | ☐ |
| 9.2 | Email template drag-and-drop builder | 8 hr | ☐ |
| 9.3 | Template responsive preview (desktop/mobile) | 3 hr | ☐ |
| 9.4 | Email attachment support in campaigns | 3 hr | ☐ |
| 9.5 | SMS opt-out compliance (TCPA) | 3 hr | ☐ |
| 9.6 | CAN-SPAM compliance auto-insertion | 2 hr | ☐ |
| 9.7 | MMS support | 4 hr | ☐ |
| 9.8 | Per-recipient campaign activity log | 3 hr | ☐ |
| 9.9 | Send-time optimization | 4 hr | ☐ |
| 9.10 | Campaign A/B auto-winner | 2 hr | ☐ |
| 9.11 | Conditional branching in workflows (if/else) | 6 hr | ☐ |
| 9.12 | Wait/delay steps in workflows | 3 hr | ☐ |
| 9.13 | Webhook trigger | 3 hr | ☐ |
| 9.14 | Workflow execution logs per rule | 3 hr | ☐ |
| 9.15 | Workflow error retry configuration | 2 hr | ☐ |

**Phase Total: ~55 hours (7 days)**

---

## PHASE 10: ANALYTICS + CALENDAR (Days 30-34)

| # | Task | Time | Status |
|---|------|------|--------|
| 10.1 | Multi-touch attribution | 5 hr | ☐ |
| 10.2 | Period-over-period comparison | 4 hr | ☐ |
| 10.3 | Automated report scheduling | 4 hr | ☐ |
| 10.4 | Goal setting & tracking | 4 hr | ☐ |
| 10.5 | Lead velocity metrics | 3 hr | ☐ |
| 10.6 | Source ROI calculation | 3 hr | ☐ |
| 10.7 | Google Calendar sync (2-way) | 6 hr | ☐ |
| 10.8 | Outlook Calendar sync | 5 hr | ☐ |
| 10.9 | Recurring follow-ups | 3 hr | ☐ |
| 10.10 | Follow-up analytics (completion rate, response time) | 3 hr | ☐ |

**Phase Total: ~40 hours (5 days)**

---

## PHASE 11: SETTINGS & AUTH (Days 34-38)

| # | Task | Time | Status |
|---|------|------|--------|
| 11.1 | MFA challenge step on login (2FA toggle exists but login never asks for code) | 4 hr | ☐ |
| 11.2 | Password strength indicator | 1 hr | ☐ |
| 11.3 | Email verification on register | 3 hr | ☐ |
| 11.4 | Terms of Service checkbox on register | 30 min | ☐ |
| 11.5 | Google OAuth flow (real redirect, not just a connect button) | 4 hr | ☐ |
| 11.6 | Admin audit trail (full activity logging) | 4 hr | ☐ |
| 11.7 | Data backup & restore UI (button exists, not wired) | 4 hr | ☐ |
| 11.8 | API documentation polish (verify Swagger) | 2 hr | ☐ |
| 11.9 | Subscription tier sync — add consistency checks or DB triggers for the 3 cached `subscriptionTier` fields | 2 hr | ☐ |
| 11.10 | Add `createdById` audit trail to `Task`, `Segment`, `Workflow`, `Tag` models | 2 hr | ☐ |

**Phase Total: ~27 hours (3.5 days)**

---

## PHASE 12: AI FEATURES (Days 38-42)
*Uses your OpenAI key as default. Teams/orgs can optionally provide their own key and personalize their AI.*

| # | Task | Time | Status |
|---|------|------|--------|
| 12.1 | AI model selection (GPT-4o / 4o-mini / o3-mini / Claude — per decided model list) | 4 hr | ☐ |
| 12.2 | Team/org custom API key support (optional override of default platform key) | 3 hr | ☐ |
| 12.3 | AI personalization per team (system prompts, tone, industry context) | 4 hr | ☐ |
| 12.4 | AI response streaming (SSE for chat — feels faster) | 4 hr | ☐ |
| 12.5 | AI cost tracking dashboard ($ amounts, not just counts) | 3 hr | ☐ |
| 12.6 | AI insight feedback loop (thumbs up/down on responses) | 2 hr | ☐ |
| 12.7 | AI-powered lead enrichment | 4 hr | ☐ |
| 12.8 | AI cost/budget alerts per team | 2 hr | ☐ |

**Phase Total: ~26 hours (3.5 days)**

---

## PHASE 13: BILLING / STRIPE (Days 42-45)

| # | Task | Time | Status |
|---|------|------|--------|
| 13.1 | Wire Stripe checkout session creation | 4 hr | ☐ |
| 13.2 | Wire Stripe billing portal | 2 hr | ☐ |
| 13.3 | Wire Stripe payment methods retrieval | 2 hr | ☐ |
| 13.4 | Implement usage recording for metered billing | 3 hr | ☐ |
| 13.5 | Replace hardcoded invoices with real Stripe invoice API | 2 hr | ☐ |
| 13.6 | Subscription upgrade/downgrade flow | 3 hr | ☐ |

**Phase Total: ~16 hours (2 days)**

---

## PHASE 14: SOCIAL MEDIA + TELEPHONY + REMAINING (Days 45-50)

| # | Task | Time | Status |
|---|------|------|--------|
| 14.1 | Social Media Dashboard — real API connections (or honest "Coming Soon") | 6 hr | ☐ |
| 14.2 | Social media campaigns in create wizard | 4 hr | ☐ |
| 14.3 | Phone campaigns / power dialer | 8 hr | ☐ |
| 14.4 | Call recording & transcription | 6 hr | ☐ |
| 14.5 | Voicemail drop (real implementation) | 3 hr | ☐ |
| 14.6 | Real-time WebSocket push (new leads, messages, notifications — replace polling) | 4 hr | ☐ |
| 14.7 | Third-party lead sources (Zillow, Realtor.com) | 8 hr | ☐ |
| 14.8 | Document attachments on leads | 3 hr | ☐ |

**Phase Total: ~42 hours (5+ days)**

---

## PHASE 15: ENTERPRISE / NICE-TO-HAVES (Days 50+)
*Build based on customer demand.*

| # | Task | Time | Status |
|---|------|------|--------|
| 15.1 | Client portal | TBD | ☐ |
| 15.2 | Mobile app / PWA | TBD | ☐ |
| 15.3 | White-labeling | TBD | ☐ |
| 15.4 | Multi-language / i18n | TBD | ☐ |
| 15.5 | Social login (Google/Microsoft) | TBD | ☐ |

---

## ADDITIONAL FINDINGS (Not in Original Audit)

These were discovered during deep codebase analysis and are incorporated into the phases above:

| # | Finding | Severity | Phase |
|---|---------|----------|-------|
| A | **Token key mismatch** — `useSocket.ts`, `NotificationBell.tsx`, `AIComposer.tsx`, `ContentGeneratorWizard.tsx` read `'token'` but auth stores as `'accessToken'`. WebSocket + AI streaming completely broken. | CRITICAL | 1.1 |
| B | **WebSocket JWT_SECRET vs JWT_ACCESS_SECRET** — socket.ts uses wrong env var, falls back to `'dev-secret'`. | CRITICAL | 1.2 |
| C | **Webhook signature bypass** — when Twilio/SendGrid tokens aren't configured, verification is skipped (anyone can spoof). | HIGH | 1.3 |
| D | **Hardcoded encryption key fallback** — `'default-32-byte-key-change-this!'` if env var missing. | HIGH | 1.4 |
| E | **`$queryRawUnsafe`** in admin controller — 6 usages with string interpolation. | MEDIUM | 1.16 |
| F | **7 admin pages with no frontend role guard** — pages render for regular users. | MEDIUM | 1.15 |
| G | **localStorage not cleaned on logout** — signatures, settings, flags leak between users. | MEDIUM | 1.18 |
| H | **localStorage keys not user-scoped** — user A's data shows for user B on same browser. | MEDIUM | 1.19 |
| I | **3 WebSocket event types emitted but never consumed** (campaign updates, workflow events, lead updates). | LOW | 3.5 |
| J | **9 deliverability endpoints** with no dedicated UI. | LOW | 6.11 |
| K | **Saved reports API** exists but no UI. | LOW | 6.12 |
| L | **Settings models tied to User instead of Org** — cascade delete risk. | DESIGN | 6.10 |
| M | **Subscription tier cached in 3 places** with no sync guarantee. | DESIGN | 11.9 |
| N | **No `createdById` on Task, Segment, Workflow, Tag**. | DESIGN | 11.10 |
| O | **Zod version mismatch** — frontend v3, backend v4. | LOW | 0.11 |
| P | **10 `window.confirm()` dialogs** — unprofessional for paid SaaS. | UX | 0.12 |
| Q | **CORS mismatch** — `socket.ts` reads `CORS_ORIGIN`, `.env` has `FRONTEND_URL`. | BUG | 1.17 |
| R | **5+ setTimeout memory leaks** — no cleanup on unmount. | BUG | 3.15 |
| S | **npm audit vulnerabilities** — 12 frontend + 7 backend (HIGH severity). | SECURITY | 4.9 |
| T | **Console.log leaking sensitive data** — Twilio SID, full req.body. | SECURITY | 1.20 |
| U | **Rampant `any` types** — 20+ in backend controllers. | CODE QUALITY | 4.3 |
| V | **No frontend `.env.example`** — `VITE_API_URL` undocumented. | DX | 0.10 |
| W | **Intra-org lead deduplication** — no dedup tool despite unique constraint. | FEATURE GAP | 8.16 |

---

## TIMELINE SUMMARY

| Phase | Focus | Days | Cumulative |
|-------|-------|------|------------|
| 0 | Codebase hygiene | 0.5 | 0.5 |
| 1 | Critical security | 1.5 | 2 |
| 2 | Broken/fake pages | 3.5 | 5.5 |
| 3 | UX essentials | 2.5 | 8 |
| **MILESTONE** | **Launchable product** | | **8 days** |
| 4 | Code quality + testing | 2.5 | 10.5 |
| 5 | Accessibility + mobile | 1.5 | 12 |
| 6 | Real feature wiring | 4 | 16 |
| 7 | Onboarding + polish | 1.5 | 17.5 |
| **MILESTONE** | **Professional quality** | | **17.5 days** |
| 8 | Lead management | 7.5 | 25 |
| 9 | Campaigns & workflows | 7 | 32 |
| 10 | Analytics + calendar | 5 | 37 |
| 11 | Settings & auth | 3.5 | 40.5 |
| **MILESTONE** | **Feature complete** | | **40.5 days** |
| 12 | AI features | 3.5 | 44 |
| 13 | Billing (Stripe) | 2 | 46 |
| 14 | Social media + remaining | 5+ | 51 |
| **MILESTONE** | **100% complete** | | **~51 days** |
| 15 | Enterprise features | TBD | — |
