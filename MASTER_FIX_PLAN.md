# MASTER FIX & BUILD PLAN — Real Estate CRM

> **Generated:** 2025-11-13  
> **Safety Audit:** 2026-02-17 — Every item verified against codebase. Corrections and safety warnings added.  
> **Scope:** 116 items across Phase 0 + 14 sidebar tabs + Cleanup  
> **Estimated Total:** ~329 hours (revised from ~347 after November work verification)  
> **Stack:** React 18 / TypeScript / Vite / Tailwind / Zustand / TanStack Query (frontend) — Express / Prisma / PostgreSQL / OpenAI GPT-4 (backend)  
> **Architecture:** Multi-tenant SaaS with `organizationId`-based data isolation

### Safety Audit Results (2026-02-17)

> Every item in this plan has been cross-referenced against the live codebase. Where the plan had errors or risks, corrections have been added inline with a ⚠️ marker. Here is the summary:
>
> **Errors found and corrected:**
> - `campaignAnalytics.service.ts` was listed as dead but is **actively used** by 8 campaign analytics endpoints — **removed from deletion list**
> - Phase 0C Task model "current code" block had wrong field names/enums — **corrected**
> - Phase 0C Fix 3 (remove `subscriptionTier` from User/Team) would break 50+ code references — **changed to "keep but add sync logic" approach**
> - Item 49 (workflow engine) said "build from scratch" but an execution engine already exists — **corrected to "wire existing engine"**
> - `template.routes.ts` and its controllers are still **mounted in server.ts** — not truly dead, must remove mount FIRST
>
> **Safety warnings added:**
> - Phase 0C: Making required FK fields nullable changes TypeScript types everywhere — grep before migrating
> - Phase 0D: 5 additional cross-tenant vulnerabilities discovered and added
> - Item 2: Pipeline status values must match backend LeadStatus enum (NEGOTIATION stage is missing from frontend)
> - Item 24: CommunicationInbox refactor (2,095 lines) is high-risk — must be done incrementally
> - Item 41: Database maintenance buttons must NEVER be wired to real destructive operations without admin auth
>
> **Existing backends the plan should leverage (not rebuild):**
> - AI email compose: `POST /ai/compose` already exists and works
> - AI SMS generate: `POST /ai/generate/sms` already exists
> - AI suggest actions: `POST /ai/suggest-actions` already exists
> - Email sending: `POST /api/messages/email` already exists
> - SMS sending: `POST /api/messages/sms` already exists
> - Workflow execution engine: `workflowExecutor.service.ts` already exists
>
> **Additional issues discovered:**
> - `/settings` route is duplicated in App.tsx (L216 and L269)
> - ServiceConfiguration.tsx has 7 dead buttons (plan said 5)
> - AnalyticsDashboard.tsx always uses mock revenue data even when API returns real data
> - LeadsPipeline.tsx is missing the NEGOTIATION stage and has no LOST column

### November 2025 Work Cross-Reference (2026-02-17)

> The codebase contains 21 documentation files from November 2025 claiming various features were completed. Each claim was verified against actual code. Here is what's real vs. what's still broken:
>
> **ALREADY DONE — Plan items that are actually complete (reduce scope):**
> - ✅ **AI Compose system exists and works** — `ai-compose.service.ts`, `message-context.service.ts`, `prediction.service.ts`, `suggestions.service.ts`, `AIComposer.tsx` (753 lines), `VariationsPanel.tsx` all exist with real GPT-4 integration. Items 34-36 need **much less work** than stated.
> - ✅ **Workflows page is wired to backend** — `WorkflowsList.tsx` calls real API, toggle/delete/edit buttons work. Item 49 scope is reduced.
> - ✅ **Intelligence Hub + A/B Testing exist** — `intelligence.controller.ts`, `abtest.controller.ts`, routes mounted in server.ts. These are NOT mentioned in the plan at all.
> - ✅ **Role-based permissions exist** — `roleFilters.ts`, `user.controller.ts`, `user.routes.ts` all working.
> - ✅ **Schema migrations applied** — Organization model, ChatMessage, LeadScoringModel, APIKeyAudit all exist. Multi-tenancy schema is in place.
> - ✅ **AI mock data removed** from `ai.service.ts` — returns zeros/real counts.
> - ✅ **Integrations page exists** — `src/pages/settings/Integrations.tsx` (310 lines) with real status detection for SendGrid/Twilio.
>
> **CLAIMED DONE BUT STILL BROKEN — Plan items the docs say are fixed but are NOT:**
> - ❌ **Phase 0D cross-tenant security** — Nov docs claim "ALL controllers updated with organizationId filtering." **Verified FALSE.** All 12 functions in Phase 0D are still unfiltered. The docs lie.
> - ❌ **Phase 0B PrismaClient sprawl** — Nov docs claim "Prisma client regenerated, 0 TypeScript errors." **All 8 files still have `new PrismaClient()`.** Not fixed.
> - ❌ **Tasks page CRUD** — Nov error analysis (ERROR_ANALYSIS_2025-11-07) explicitly confirms create/update/delete/toggle mutations are all `_`-prefixed placeholders. Not wired.
> - ❌ **Campaign pause/send buttons** — Same error analysis confirms `_pauseCampaignMutation` and `_sendCampaignMutation` are unused placeholders.
> - ❌ **Frontend pages (Calendar, Activity, Pipeline)** — Not mentioned in ANY November doc. Still hardcoded.
> - ❌ **72 TypeScript/ESLint errors** — Documented in ERROR_ANALYSIS_2025-11-07 but never fixed.
>
> **Impact on this plan:**
> - Phase 0B, 0D: **Still fully required** — nothing was fixed
> - Phase 0C: Schema has Organization model and most FKs, but Task still lacks `organizationId` and onDelete rules are still missing
> - Tab 6 (AI Hub): **Scope reduced ~60%** — backend endpoints exist, just need frontend polish and edge case fixes
> - Tab 9 (Workflows): **Scope reduced ~30%** — list page works, execution engine exists, security fixes still needed
> - Tab 3 (Leads), Tab 4 (Calendar/Activity/Tasks), Tab 5 (Campaigns): **Still fully required** — nothing was fixed

### What is this plan? (Plain English overview)

This is a complete roadmap for fixing and finishing your Real Estate CRM application. Here's the situation in simple terms:

**The app looks finished, but most of it is fake behind the scenes.** The pages, buttons, and forms all render beautifully — but when you click "Save," "Send," or "Create," most of them either do nothing, show a fake success message, or only change things temporarily in your browser (gone when you refresh).

**This plan fixes everything in a smart order:**

1. **Phase 0 — Fix the foundation** (~36 hr): Clean up dead files, fix database issues, patch security holes. Nothing visible changes, but everything that follows depends on this being done first.

2. **AI Features first** (~20 hr): Wire up the AI email composer, SMS composer, and smart suggestions to your real GPT-4 backend. This is your competitive advantage, so we knock it out first.

3. **Complete existing features** (~112 hr): The Leads, Campaigns, Calendar, Tasks, Activity, and Communication pages are mostly built but half-working. We make every button, form, and chart actually work with real data.

4. **Build missing features** (~92 hr): Some features (forgot password, workflow engine, OAuth integrations, admin tools) need to be built from scratch because they don't exist at all yet.

5. **Billing (Stripe) last** (~32 hr): Payment processing is saved for the end because you need a working product before charging for it.

6. **Final cleanup** (~8 hr): Remove developer debug messages, add code quality rules, and do a final check that everything compiles cleanly.

**How to read each item:** Every item has a "In plain English" block explaining what the issue is in normal language, followed by the technical details for whoever is implementing the fix.

---

## Table of Contents

1. [Phase 0: Backend Infrastructure](#phase-0-backend-infrastructure) (~36 hr)
   - [0A: Delete Dead Files](#0a-delete-dead-files-13-files-2715-lines)
   - [0B: Fix PrismaClient Sprawl](#0b-fix-prismaclient-sprawl-8-files)
   - [0C: Schema Fixes](#0c-schema-fixes)
   - [0D: Cross-Tenant Security](#0d-cross-tenant-security-12-functions)
   - [0E: API Response Standardization](#0e-api-response-standardization)
   - [0F: Security Hardening](#0f-security-hardening)
2. [Tab 6: AI Hub](#tab-6-ai-hub) (~20 hr) ⭐ AI FEATURES
3. [Tab 3: Leads](#tab-3-leads) (~40 hr) — Complete existing
4. [Tab 5: Campaigns](#tab-5-campaigns) (~28 hr) — Complete existing
5. [Tab 4: Calendar / Activity / Tasks](#tab-4-calendar--activity--tasks) (~24 hr) — Complete existing
6. [Tab 8: Communications](#tab-8-communications) (~20 hr) — Complete existing
7. [Tab 9: Automation / Workflows](#tab-9-automation--workflows) (~16 hr) — Build missing
8. [Tab 1: Auth](#tab-1-auth) (~24 hr) — Build missing
9. [Tab 10: Settings](#tab-10-settings) (~16 hr) — Complete existing
10. [Tab 12: Admin](#tab-12-admin) (~24 hr) — Build missing
11. [Tab 7: Analytics](#tab-7-analytics) (~12 hr) — Complete existing
12. [Tab 14: Integrations](#tab-14-integrations) (~20 hr) — Build missing
13. [Tab 11: Help](#tab-11-help) (~8 hr) — Build missing
14. [Tab 2: Dashboard](#tab-2-dashboard) (0 hr — works correctly)
15. [Tab 13: Billing](#tab-13-billing) (~32 hr) — Stripe (last)
16. [Phase Last: Cleanup](#phase-last-cleanup) (~8 hr)

---

## Phase 0: Backend Infrastructure

**Priority:** CRITICAL — Must be completed before any tab work  
**Estimated Time:** ~36 hours

> **In plain English:** Phase 0 is like cleaning up and fixing the foundation of a house before you start renovating rooms. None of the visible features (pages, buttons, etc.) get touched here — instead we're fixing hidden problems in the "engine room" (the server code and database) that would cause bugs later if left unfixed. Think of it as making sure the plumbing and wiring are safe before painting walls.

### 0A: Delete Dead Files (13 files, ~2,715 lines)

> **In plain English:** Over time, old versions of files were created but never cleaned up. The app doesn't actually use them, but they sit in the codebase like old boxes in a garage — confusing anyone who opens them because some contain wrong prices and broken settings. We're throwing them away so nobody accidentally looks at the wrong file.

These files are **not imported by any active code**. They contain bugs (wrong pricing, wrong FREE tier limits) that DON'T affect the running app because they're never loaded — but they cause confusion during development.

> ⚠️ **SAFETY AUDIT (2026-02-17):** Original plan listed 14 files. `campaignAnalytics.service.ts` has been **removed from this list** — it is actively used by `campaign.controller.ts` via 8 dynamic `await import()` calls. Deleting it would crash campaign analytics endpoints. Additionally, some of these files import each other (e.g., `adminController.ts` is imported by `adminRoutes.ts`), so they form dependency chains that must be deleted together. The deletion order below is safe.

#### Step-by-step:

**1. Remove `template.routes.ts` from `server.ts` (MUST DO FIRST)**

> ⚠️ **SAFETY:** `template.routes.ts` is currently mounted and serving `/api/templates/*` requests. The import at L23 and mount at L157 MUST be removed from `server.ts` before deleting the file or its controllers, or the server will crash on startup.

- **File:** `backend/src/server.ts`
- **Line 23** — delete the import:
  ```ts
  // DELETE THIS LINE:
  import templateRoutes from './routes/template.routes'
  ```
- **Line 157** — delete the mount:
  ```ts
  // DELETE THIS LINE:
  app.use('/api/templates', templateRoutes)
  ```
- **Why:** `template.routes.ts` is the insecure version (no org filtering). The secure replacements (`email-template.routes.ts` at L158 and `sms-template.routes.ts` at L159) are already mounted.

**2. Delete the 13 dead files**

> ⚠️ **SAFETY:** Delete in this order. Controllers/services that are imported by dead routes must be deleted at the same time as (or after) their importing route file.

Run from project root:
```bash
# Backend dead controllers (imported only by dead routes below — delete together)
rm backend/src/controllers/adminController.ts          # 132 lines — imported by adminRoutes.ts (also dead)
rm backend/src/controllers/subscriptionController.ts   # 286 lines — imported by subscriptionRoutes.ts (also dead)
rm backend/src/controllers/emailTemplate.controller.ts # 169 lines — imported by template.routes.ts (removed in step 1)
rm backend/src/controllers/smsTemplate.controller.ts   # 177 lines — imported by template.routes.ts (removed in step 1)

# Backend dead routes
rm backend/src/routes/adminRoutes.ts                   # 27 lines — NOT mounted in server.ts (admin.routes.ts is used instead)
rm backend/src/routes/subscriptionRoutes.ts            # 27 lines — NOT mounted in server.ts (subscription.routes.ts is used instead)
rm backend/src/routes/template.routes.ts               # 101 lines — unmounted in step 1

# Backend dead services
rm backend/src/services/abTesting.service.ts           # 436 lines — replaced by abtest.service.ts, zero references
rm backend/src/services/vapi.service.ts                # 207 lines — stub, all methods throw, zero references
rm backend/src/services/automation.service.ts          # 467 lines — zero references anywhere

# NOTE: DO NOT DELETE campaignAnalytics.service.ts — it is actively used by campaign.controller.ts (8 dynamic imports)

# Backend dead middleware
rm backend/src/middleware/featureAccess.ts              # 161 lines — never imported by any route

# Frontend dead files
rm src/pages/campaigns/CampaignsListOld.tsx            # 122 lines — replaced by CampaignsList.tsx
rm src/pages/leads/LeadsList.tsx.backup                # 403 lines — backup file
```

> ⚠️ **ORPHANED FILE:** Deleting `template.routes.ts` also orphans `backend/src/validators/template.validator.ts` — its only consumer is `template.routes.ts` (L10). The active routes use separate `email-template.validator.ts` and `sms-template.validator.ts`. Add `template.validator.ts` to the deletion list:
> ```bash
> rm backend/src/validators/template.validator.ts
> ```

**3. Remove 6 dead API methods from `src/lib/api.ts`**

These methods call the old `/api/templates` routes we just removed:

| Method | Lines | What it does |
|--------|-------|-------------|
| `useEmailTemplate` | L867-869 | `POST /api/templates/email/:id/use` |
| `getEmailTemplateStats` | L871-874 | `GET /api/templates/email/:id/stats` |
| `useSMSTemplate` | L903-905 | `POST /api/templates/sms/:id/use` |
| `getSMSTemplateStats` | L907-910 | `GET /api/templates/sms/:id/stats` |
| `getAllEmailTemplates` | L915-918 | `GET /api/email-templates` (name misleading; calls old route) |
| `getAllSMSTemplates` | L920-923 | `GET /api/sms-templates` (name misleading; calls old route) |

Delete these 6 functions from `src/lib/api.ts`. Then grep the entire frontend to confirm nothing imports them:
```bash
grep -rn "useEmailTemplate\|getEmailTemplateStats\|useSMSTemplate\|getSMSTemplateStats\|getAllEmailTemplates\|getAllSMSTemplates" src/
```

**4. Verification**

```bash
# Backend should still compile
cd backend && npx tsc --noEmit

# Frontend should still compile
cd .. && npx tsc --noEmit

# No dangling imports
grep -rn "adminController\|subscriptionController\|emailTemplate\.controller\|smsTemplate\.controller\|adminRoutes\|subscriptionRoutes\|template\.routes\|abTesting\.service\|campaignAnalytics\.service\|vapi\.service\|automation\.service\|featureAccess\|CampaignsListOld\|LeadsList\.tsx\.backup" backend/src/ src/
```

---

### 0B: Fix PrismaClient Sprawl (8 files)

> **In plain English:** The database is like a phone line to your data. Right now, 8 different files each open their own separate phone line instead of sharing one. This wastes resources and can crash the app if too many connections pile up — like plugging too many things into one power outlet. The fix is simple: make all 8 files share the single connection that already exists.

**Problem:** 8 active backend files create their own `new PrismaClient()` instead of importing the shared singleton from `backend/src/config/database.ts`. This causes multiple database connections and potential connection pool exhaustion.

**The correct import:** `import { prisma } from '../config/database'`

#### File 1: `backend/src/controllers/intelligence.controller.ts`

**Current (5 instances):** Uses dynamic `await import('@prisma/client')` pattern at L24-25, L69-70, L113-114, L229-230, L345-346:
```ts
const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient()
```

**Fix:** Add at top of file:
```ts
import { prisma } from '../config/database'
```
Delete all 5 occurrences of the dynamic import pattern. Keep any type imports from `@prisma/client` if needed (e.g., `import type { ... } from '@prisma/client'`).

#### File 2: `backend/src/controllers/admin.controller.ts`

**Current (L2+L4):**
```ts
import { PrismaClient, Role, ActivityType } from '@prisma/client'
// ...
const prisma = new PrismaClient()
```

**Fix:**
```ts
import { Role, ActivityType } from '@prisma/client'
import { prisma } from '../config/database'
```
Delete the `const prisma = new PrismaClient()` line.

#### File 3: `backend/src/controllers/subscription.controller.ts`

**Current (L2+L10):**
```ts
import { PrismaClient, SubscriptionTier } from '@prisma/client'
// ...
const prisma = new PrismaClient()
```

**Fix:**
```ts
import { SubscriptionTier } from '@prisma/client'
import { prisma } from '../config/database'
```
Delete the `const prisma = new PrismaClient()` line.

#### File 4: `backend/src/services/abtest.service.ts`

**Current (L6+L8):**
```ts
import { PrismaClient, ABTestType, ABTestStatus, Prisma } from '@prisma/client'
// ...
const prisma = new PrismaClient()
```

**Fix:**
```ts
import { ABTestType, ABTestStatus, Prisma } from '@prisma/client'
import { prisma } from '../config/database'
```

#### File 5: `backend/src/services/message-context.service.ts`

**Current (L1+L3):**
```ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
```

**Fix:**
```ts
import { prisma } from '../config/database'
```

#### File 6: `backend/src/services/ml-optimization.service.ts`

**Current (L1+L4):**
```ts
import { PrismaClient } from '@prisma/client'
// ...
const prisma = new PrismaClient()
```

**Fix:**
```ts
import { prisma } from '../config/database'
```

#### File 7: `backend/src/services/intelligence.service.ts`

**Current (L1+L3):**
```ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
```

**Fix:**
```ts
import { prisma } from '../config/database'
```

#### File 8: `backend/src/services/ai-functions.service.ts`

**Current (L1+L5):**
```ts
import { PrismaClient, Prisma, TaskPriority, LeadStatus } from '@prisma/client'
// ...
const prisma = new PrismaClient()
```

**Fix:**
```ts
import { Prisma, TaskPriority, LeadStatus } from '@prisma/client'
import { prisma } from '../config/database'
```

#### Verification

```bash
# No more rogue PrismaClient instantiations
grep -rn "new PrismaClient" backend/src/ --include="*.ts" | grep -v node_modules | grep -v database.ts
# Should return 0 results

# Backend still compiles
cd backend && npx tsc --noEmit
```

---

### 0C: Schema Fixes

> **In plain English:** The "schema" is the blueprint of your database — it defines what kind of data you store and how it's connected (e.g., "a Task belongs to a Lead"). Right now, three things are wrong:
> 1. **Tasks don't know which company they belong to** — so there's no way to keep Company A's tasks separate from Company B's tasks.
> 2. **Deleting a user or lead can crash the app** because the database tries to protect linked records (like notes or appointments tied to that person) but has no instructions on what to do with them.
> 3. **The subscription plan level is stored in 4 different places** instead of one, so they can get out of sync — like having 4 copies of your phone number written down and some are outdated.

**File:** `backend/prisma/schema.prisma`

#### Fix 1: Task model — add `organizationId` and relations (L373-391)

> ⚠️ **SAFETY AUDIT (2026-02-17):** The "Current" code block in the original plan had incorrect field names. The actual schema uses `status TaskStatus @default(PENDING)` (enum, not string), `assignedToId String?` (not `assignedTo`), and `@relation("TaskAssignedTo")` (not `"assignedTasks"`). The corrected version below uses the real field names from the schema.

**Current (actual schema):**
```prisma
model Task {
  id           String       @id @default(cuid())
  title        String
  description  String?
  dueDate      DateTime?
  priority     TaskPriority @default(MEDIUM)
  status       TaskStatus   @default(PENDING)
  assignedToId String?
  leadId       String?
  completedAt  DateTime?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  assignedTo   User?        @relation("TaskAssignedTo", fields: [assignedToId], references: [id])

  @@index([assignedToId])
  @@index([dueDate])
  @@index([priority])
  @@index([status])
}
```

**Change to:**
```prisma
model Task {
  id             String       @id @default(cuid())
  title          String
  description    String?
  status         TaskStatus   @default(PENDING)
  priority       TaskPriority @default(MEDIUM)
  dueDate        DateTime?
  leadId         String?
  lead           Lead?        @relation(fields: [leadId], references: [id], onDelete: SetNull)
  assignedToId   String?
  assignedTo     User?        @relation("TaskAssignedTo", fields: [assignedToId], references: [id], onDelete: SetNull)
  completedAt    DateTime?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([organizationId])
  @@index([leadId])
  @@index([assignedToId])
  @@index([dueDate])
  @@index([priority])
  @@index([status])
}
```

**Then add back-references to:**
- **Lead model:** Add `tasks Task[]`
- **Organization model:** Add `tasks Task[]` (if not already present)

#### Fix 2: Add `onDelete` to 13 relations

> ⚠️ **SAFETY WARNING:** Making required FK fields nullable (`String` → `String?`) changes the generated TypeScript types from `string` to `string | null`. After running `prisma generate`, any code that accesses these fields without null checks will get TypeScript compile errors. **Before making each field nullable, grep the codebase for usages:**
> ```bash
> # Example: before making Campaign.createdById nullable
> grep -rn "createdById" backend/src/ --include="*.ts"
> # Check every hit — if it does `campaign.createdById.something`, you need to add null guards
> ```

Each of these relations currently has no `onDelete` rule, which defaults to `Restrict` and will throw errors when trying to delete parent records.

| # | Model | Field | Relation | Rule | Notes |
|---|-------|-------|----------|------|-------|
| 1 | Activity | user | `@relation(fields: [userId], references: [id])` | `onDelete: SetNull` | Make `userId` optional (`String?`) if not already |
| 2 | Appointment | lead | `@relation(fields: [leadId], references: [id])` | `onDelete: SetNull` | Make `leadId` optional (`String?`) if not already |
| 3 | Campaign | createdBy/user | `@relation(fields: [createdById], references: [id])` | `onDelete: SetNull` | **Must make `createdById` nullable first** (`String?`) |
| 4 | Lead | assignedTo | `@relation(fields: [assignedToId], references: [id])` | `onDelete: SetNull` | Make `assignedToId` optional if not already |
| 5 | Message | lead | `@relation(fields: [leadId], references: [id])` | `onDelete: SetNull` | Make `leadId` optional if not already |
| 6 | Message | organization | `@relation(fields: [organizationId], references: [id])` | `onDelete: Cascade` | Org deletion cascades messages |
| 7 | Note | author | `@relation(fields: [authorId], references: [id])` | `onDelete: SetNull` | **Must make `authorId` nullable first** (`String?`) |
| 8 | Task | assignedTo | `@relation(fields: [assignedToId], references: [id])` | `onDelete: SetNull` | Already optional |
| 9 | ABTest | creator | `@relation(fields: [createdBy], references: [id])` | `onDelete: SetNull` | **Must make `createdBy` nullable first** (`String?`) |
| 10 | ABTestResult | campaign | `@relation(fields: [campaignId], references: [id])` | `onDelete: SetNull` | Make optional if not already |
| 11 | ABTestResult | lead | `@relation(fields: [leadId], references: [id])` | `onDelete: SetNull` | Make optional if not already |
| 12 | Call | aiAssistant | `@relation(fields: [aiAssistantId], references: [id])` | `onDelete: SetNull` | Make optional if not already |
| 13 | Call | lead | `@relation(fields: [leadId], references: [id])` | `onDelete: SetNull` | Make optional if not already |

**Pattern for each fix:**
```prisma
// BEFORE:
leadId String
lead   Lead @relation(fields: [leadId], references: [id])

// AFTER:
leadId String?
lead   Lead?  @relation(fields: [leadId], references: [id], onDelete: SetNull)
```

#### Fix 3: Consolidate `SubscriptionTier` (REVISED — do NOT remove fields)

`SubscriptionTier` enum is used on 4 models: `Team` (L398), `User` (L436), `Organization` (L682), `Subscription` (L714).

> ⚠️ **SAFETY AUDIT (2026-02-17):** The original plan said to remove `subscriptionTier` from User and Team models. **This would break 50+ code references** across 6+ backend files including auth, subscription management, feature access gating, and admin endpoints. **DO NOT remove these fields.**

**REVISED Action (safe approach):**
1. **Keep all 4 fields** — they serve as caches for quick access without joins
2. **Add a sync mechanism:** When `Subscription.tier` is updated (upgrade/downgrade), also update `Organization.subscriptionTier`, `User.subscriptionTier` (for all users in that org), and `Team.subscriptionTier` (for all teams in that org)
3. **Add a comment to schema.prisma** on each cached field: `// Cached from Subscription.tier — kept in sync by subscription update logic`
4. **Add a one-time data consistency check:** Build a script that compares all 4 fields across related records and fixes any mismatches
5. **Long-term:** Once all code paths use the sync mechanism, the cached fields can gradually be deprecated. But this is NOT safe to do now.

#### Migration

After all schema changes:
```bash
cd backend
npx prisma migrate dev --name "fix-task-org-ondelete-tier-dedup"
npx prisma generate
```

**If migration fails** due to existing data missing `organizationId` on Task:
```sql
-- Set all existing tasks to the first organization (adjust as needed)
UPDATE tasks SET "organizationId" = (SELECT id FROM organizations LIMIT 1) WHERE "organizationId" IS NULL;
```

---

### 0D: Cross-Tenant Security (12 functions)

> **In plain English:** This is a **serious security issue**. Your CRM is designed so that multiple companies ("tenants") share the same app, but each company should only see their own data. Right now, 12 functions forgot to ask "which company does this user belong to?" before returning data. That means Company A could theoretically see or edit Company B's leads, workflows, and analytics. We're adding the "which company?" check to every one of these functions.

> ⚠️ **SAFETY AUDIT (2026-02-17):** The original plan listed 7 functions. 5 additional vulnerabilities were discovered during verification and added as Fixes 8–12 below.

**Critical:** These functions query the database without filtering by `organizationId`, allowing users from one organization to access/modify another organization's data.

#### Fix 1: `bulkUpdateLeads` — `backend/src/controllers/lead.controller.ts` L545-549

**Current:**
```ts
const results = await prisma.lead.updateMany({
  where: { id: { in: leadIds } },
  data: updateData,
})
```

**Fix:**
```ts
const results = await prisma.lead.updateMany({
  where: {
    id: { in: leadIds },
    organizationId: req.user!.organizationId,
  },
  data: updateData,
})
```

#### Fix 2: `testWorkflow` — `backend/src/controllers/workflow.controller.ts` L213

**Current:**
```ts
const workflow = await prisma.workflow.findUnique({ where: { id } })
```

**Fix:**
```ts
const workflow = await prisma.workflow.findFirst({
  where: { id, organizationId: req.user!.organizationId }
})
```

#### Fix 3: `triggerWorkflow` — `backend/src/controllers/workflow.controller.ts` L345-348

**Current:** No ownership check before `manualTriggerWorkflow(id, leadId)`.

**Fix:** Add before the trigger call:
```ts
const workflow = await prisma.workflow.findFirst({
  where: { id, organizationId: req.user!.organizationId }
})
if (!workflow) throw new NotFoundError('Workflow not found')

// Also verify lead belongs to same org
const lead = await prisma.lead.findFirst({
  where: { id: leadId, organizationId: req.user!.organizationId }
})
if (!lead) throw new NotFoundError('Lead not found')
```

#### Fix 4: `getWorkflowStats` — `backend/src/controllers/workflow.controller.ts` L293-307

**Current:** 6 counts with zero org filtering:
```ts
const totalWorkflows = await prisma.workflow.count()
const activeWorkflows = await prisma.workflow.count({ where: { isActive: true } })
// ... etc
```

**Fix:** Add `organizationId: req.user!.organizationId` to every `where` clause:
```ts
const orgId = req.user!.organizationId
const totalWorkflows = await prisma.workflow.count({ where: { organizationId: orgId } })
const activeWorkflows = await prisma.workflow.count({ where: { isActive: true, organizationId: orgId } })
const totalExecutions = await prisma.workflowExecution.count({
  where: { workflow: { organizationId: orgId } }
})
const successfulExecutions = await prisma.workflowExecution.count({
  where: { status: 'SUCCESS', workflow: { organizationId: orgId } }
})
const failedExecutions = await prisma.workflowExecution.count({
  where: { status: 'FAILED', workflow: { organizationId: orgId } }
})
```

#### Fix 5: `getTaskAnalytics` — `backend/src/controllers/analytics.controller.ts` L315-341

**Current:** 7 task queries with no org filter.

**Fix:** Add `organizationId: req.user!.organizationId` to every task query `where` clause.

> **BLOCKED:** This fix requires the Task schema fix from step 0C first (Task model needs `organizationId` field).

#### Fix 6: `getActivityFeed` — `backend/src/controllers/analytics.controller.ts` L378-408

**Current:**
```ts
const activities = await prisma.activity.findMany({
  // No where clause at all!
  take: limit,
  orderBy: { createdAt: 'desc' },
  include: { user: true }
})
const total = await prisma.activity.count()
```

**Fix:**
```ts
const activities = await prisma.activity.findMany({
  where: { organizationId: req.user!.organizationId },
  take: limit,
  orderBy: { createdAt: 'desc' },
  include: { user: true }
})
const total = await prisma.activity.count({
  where: { organizationId: req.user!.organizationId }
})
```

#### Fix 7: `getConversionFunnel` — `backend/src/controllers/analytics.controller.ts` L503-507

> ⚠️ **SAFETY NOTE:** The actual code does have a `where: whereDate` clause (date filtering), but `whereDate` never includes `organizationId`. The fix is to add org filtering INTO `whereDate`.

**Current:**
```ts
const leads = await prisma.lead.groupBy({
  by: ['status'],
  where: whereDate,  // only has date filter, no org filter
  _count: true,
})
```

**Fix:**
```ts
const leads = await prisma.lead.groupBy({
  by: ['status'],
  where: { ...whereDate, organizationId: req.user!.organizationId },
  _count: true,
})
```

#### Fix 8: `getWorkflowExecutions` — `backend/src/controllers/workflow.controller.ts` L254 *(NEW)*

> ⚠️ **DISCOVERED IN SAFETY AUDIT (2026-02-17)**

**Problem:** Uses `findUnique({ where: { id } })` without org check — any user can view any workflow's execution history.

**Fix:**
```ts
// BEFORE:
const workflow = await prisma.workflow.findUnique({ where: { id } })

// AFTER:
const workflow = await prisma.workflow.findFirst({
  where: { id, organizationId: req.user!.organizationId }
})
if (!workflow) throw new NotFoundError('Workflow not found')
```

#### Fix 9: `getWorkflowAnalytics` — `backend/src/controllers/workflow.controller.ts` L326-337 *(NEW)*

> ⚠️ **DISCOVERED IN SAFETY AUDIT (2026-02-17)**

**Problem:** Calls `getWorkflowAnalyticsService(id, ...)` without verifying the workflow belongs to the user's org.

**Fix:** Add ownership check before calling service:
```ts
const workflow = await prisma.workflow.findFirst({
  where: { id, organizationId: req.user!.organizationId }
})
if (!workflow) throw new NotFoundError('Workflow not found')
// Then proceed with analytics call
```

#### Fix 10: `triggerWorkflowsForLead` — `backend/src/controllers/workflow.controller.ts` L358-376 *(NEW)*

> ⚠️ **DISCOVERED IN SAFETY AUDIT (2026-02-17)**

**Problem:** No verification that `leadId` belongs to user's org before triggering workflows.

**Fix:**
```ts
const lead = await prisma.lead.findFirst({
  where: { id: leadId, organizationId: req.user!.organizationId }
})
if (!lead) throw new NotFoundError('Lead not found')
```

#### Fix 11: `getDashboardStats` (task portion) — `backend/src/controllers/analytics.controller.ts` L58-72 *(NEW)*

> ⚠️ **DISCOVERED IN SAFETY AUDIT (2026-02-17)**

**Problem:** Task queries within the dashboard stats are unfiltered. Same root cause as Fix 5 — Task model lacks `organizationId`.

**Fix:** Same as Fix 5. **BLOCKED** by Phase 0C Fix 1 (Task schema).

#### Fix 12: `calculateTaskCompletionRate` — `backend/src/controllers/analytics.controller.ts` L483-484 *(NEW)*

> ⚠️ **DISCOVERED IN SAFETY AUDIT (2026-02-17)**

**Problem:** Helper function with unfiltered `prisma.task.count()` calls.

**Fix:** Pass `organizationId` as parameter and filter. **BLOCKED** by Phase 0C Fix 1.

#### Verification

```bash
# Search for any remaining unfiltered queries in controllers
grep -n "prisma\.\w\+\.find\|prisma\.\w\+\.count\|prisma\.\w\+\.groupBy\|prisma\.\w\+\.updateMany\|prisma\.\w\+\.deleteMany" backend/src/controllers/*.ts | grep -v organizationId
```

---

### 0E: API Response Standardization

> **In plain English:** When the frontend (what users see) asks the backend (the server) for data, the server sends back a response. Right now, some parts of the server send responses in Format A (`{ success: true, data: ... }`) and other parts use Format B (`{ stats: ... }`). This is like some employees writing memos in English and others in French — the frontend doesn't always know how to read the response. We're making everything use the same consistent format so nothing gets lost in translation.

**Problem:** Two different response formats coexist:
- **Pattern A** (most controllers): `{ success: true, data: { ... } }` / `{ success: false, message: '...', error: '...' }`
- **Pattern B** (admin, subscription): `{ stats: { ... } }` / `{ error: '...' }`

**Fix:** Standardize `admin.controller.ts`, `subscription.controller.ts`, and `abtest.controller.ts` to use Pattern A.

> ⚠️ **SAFETY AUDIT (2026-02-17):** The original plan listed 2 controllers. `abtest.controller.ts` also uses Pattern B (41 response calls, zero with `success: true`). All 3 must be standardized. The dead controllers (`emailTemplate.controller.ts`, `smsTemplate.controller.ts`) also use Pattern B but will be deleted in Phase 0A.

**Example change in `admin.controller.ts`:**
```ts
// BEFORE:
res.json({ stats })

// AFTER:
res.json({ success: true, data: { stats } })
```

```ts
// BEFORE:
res.status(400).json({ error: 'Invalid input' })

// AFTER:
res.status(400).json({ success: false, message: 'Invalid input' })
```

**Apply the same pattern to every response in all 3 controllers.** Then update frontend code that consumes these responses (search `adminApi`, `subscriptionApi`, and `abtestApi` calls in `src/`).

---

### 0F: Security Hardening

> **In plain English:** We're adding protective layers to the server, like adding locks and alarms to a house:
> 1. **Input sanitization** — When users type into forms, we clean the input to prevent hackers from injecting malicious code (like someone trying to slip a lockpick through your mail slot).
> 2. **Body size limits** — We cap how much data someone can send in a single request, preventing attacks that try to crash the server by sending huge payloads (like someone trying to stuff a mattress through your mailbox).
> 3. **AI rate limiting** — We limit how many AI requests a user can make per minute, so nobody can spam the expensive GPT-4 API and run up your bill (like putting a limit on how many free samples one person can take).

#### 1. Install missing security packages

> ⚠️ **NOTE:** `express-rate-limit` is **already installed** (`^8.1.0`) and used in `server.ts` (general limiter) and `auth.routes.ts` (auth limiter). Only `sanitize-html` needs to be installed. `express-validator` may or may not be installed — check first.

```bash
cd backend
npm install sanitize-html
npm install -D @types/sanitize-html
# express-rate-limit is already installed — do NOT reinstall
```

#### 2. Add body size limit

In `backend/src/server.ts`, find `app.use(express.json())` and change to:
```ts
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
```

#### 3. Add rate limiter to AI routes

**File:** `backend/src/routes/ai.routes.ts`

**Current (top of file):**
```ts
import express from 'express'
import * as aiController from '../controllers/ai.controller'
import { authenticate } from '../middleware/auth'

const router = express.Router()
router.use(authenticate)
```

**Add rate limiter:**
```ts
import express from 'express'
import rateLimit from 'express-rate-limit'
import * as aiController from '../controllers/ai.controller'
import { authenticate } from '../middleware/auth'

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,             // 20 requests per minute per user
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { success: false, message: 'Too many AI requests. Please wait a moment.' }
})

const router = express.Router()
router.use(authenticate)
router.use(aiRateLimiter)
```

#### 4. Add input sanitization middleware

Create `backend/src/middleware/sanitize.ts`:
```ts
import { Request, Response, NextFunction } from 'express'
import sanitizeHtml from 'sanitize-html'

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body)
  }
  next()
}

function sanitizeObject(obj: any) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeHtml(obj[key], { allowedTags: [], allowedAttributes: {} })
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key])
    }
  }
}
```

Apply in `server.ts` after `express.json()`:
```ts
import { sanitizeInput } from './middleware/sanitize'
app.use(sanitizeInput)
```

---

## Tab 3: Leads

**Priority:** 2 — Complete existing features  
**Estimated Time:** ~40 hours

> **In plain English:** Leads are the bread and butter of your CRM — they're your potential customers. The Leads tab already has pages for importing leads, a visual pipeline (Kanban board), merging duplicates, tracking follow-ups, and viewing lead details. The problem is that many of these features are "cosmetic only" — they look functional but don't actually save anything. For example, dragging a lead from "New" to "Contacted" on the pipeline board looks like it works, but when you refresh the page, it snaps back. We're making all these features actually work and save data to the database.

### Item 1: LeadsImport.tsx — Build real import functionality

> **In plain English:** There's a page that says you can upload a CSV file (a spreadsheet) of leads, but it's completely fake. The upload zone is just a picture — you can't actually drag a file onto it. Clicking the upload button waits 2 seconds and says "success" without doing anything. We're building a real file uploader that actually reads your spreadsheet, validates the data, and creates real leads in your database.

**File:** `src/pages/leads/LeadsImport.tsx` (86 lines)  
**Problem:** 100% fake. No file input, no drag-and-drop, no API calls.

#### Backend work:
Create `POST /api/leads/import` endpoint in `backend/src/controllers/lead.controller.ts`:
```ts
export const importLeads = async (req: Request, res: Response) => {
  // Accept CSV/Excel file via multer
  // Parse rows → validate each row (email format, required fields)
  // Bulk create leads with organizationId
  // Return { success: true, data: { imported: N, skipped: N, errors: [...] } }
}
```

Install `multer` and `csv-parse`:
```bash
cd backend
npm install multer csv-parse
npm install -D @types/multer
```

Add route in `backend/src/routes/lead.routes.ts`:
```ts
import multer from 'multer'
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
router.post('/import', authenticate, upload.single('file'), leadController.importLeads)
```

#### Frontend work:
Rewrite `src/pages/leads/LeadsImport.tsx`:
1. Add real `<input type="file" accept=".csv,.xlsx">` hidden input
2. Add drag-and-drop zone with `onDrop`, `onDragOver`, `onDragLeave` handlers
3. Parse CSV client-side to show preview (first 5 rows)
4. Column mapping UI (map CSV columns to lead fields)
5. Call `leadsApi.importLeads(formData)` on submit
6. Show progress bar and results (imported/skipped/errors)

Add to `src/lib/api.ts`:
```ts
importLeads: (formData: FormData) =>
  apiClient.post('/leads/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),
```

#### `handleDownloadTemplate`:
Create a CSV template file and serve it:
```ts
const handleDownloadTemplate = () => {
  const csv = 'firstName,lastName,email,phone,company,status,source\n'
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'lead-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}
```

---

### Item 2: LeadsPipeline.tsx — Persist drag-and-drop

> **In plain English:** The pipeline is a Kanban board (like Trello) where you drag leads between stages (New → Contacted → Qualified → Won). Dragging works visually, but it's only stored in the browser's memory. Refresh the page and everything resets. We're adding a save-to-server call so moves stick permanently.

> ⚠️ **SAFETY AUDIT (2026-02-17) — ENUM MISMATCH:** The backend `LeadStatus` enum has 7 values: `NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST`. But the pipeline only has 5 columns (missing NEGOTIATION, and LOST has no column). This means:
> 1. Leads with status `NEGOTIATION` silently fall into the `NEW` column (wrong!)
> 2. Leads with status `LOST` are fetched but never displayed
> 
> **Before wiring the pipeline to the API, you MUST:**
> - Add a `NEGOTIATION` stage column between PROPOSAL and WON
> - Add a `LOST` column (collapsed/minimized) or a separate "Lost leads" section
> - Add `NEGOTIATION` to the `statusMap` in the pipeline component
> - The stage IDs passed to `updateLead` must be UPPERCASE to match the Prisma enum (e.g., `NEW` not `new`). The pipeline currently uses lowercase IDs but converts with `.toLowerCase()` — this needs to be reconciled.

**File:** `src/pages/leads/LeadsPipeline.tsx`  
**Problem:** `handleDrop` (L181-217) updates local state only — stage changes are lost on refresh.

**Fix in `handleDrop`:** After updating local state, call the API:
```ts
const handleDrop = async (e: React.DragEvent, toStageId: string) => {
  e.preventDefault()
  if (!draggedLead) return
  const { lead, fromStage } = draggedLead
  if (fromStage === toStageId) { setDraggedLead(null); return }

  // Optimistic local state update (keep existing code)
  setPipelineStages((prev: Stage[]) => { /* ...existing... */ })

  // Persist to backend
  try {
    await leadsApi.updateLead(lead.id, { status: toStageId })
    toast.success(`${lead.firstName} ${lead.lastName} moved to ${pipelineStages.find((s: Stage) => s.id === toStageId)?.name}`)
  } catch (error) {
    // Revert optimistic update on failure
    setPipelineStages((prev: Stage[]) => { /* reverse the move */ })
    toast.error('Failed to update lead stage')
  }
  setDraggedLead(null)
}
```

---

### Item 3: LeadsMerge.tsx — Build merge endpoint + wire frontend

> **In plain English:** When two leads are duplicates (same person entered twice), you should be able to merge them into one. The merge page already detects duplicates by comparing emails and phone numbers, but clicking "Merge" just shows a success message and removes the item from the list — the two leads actually stay separate in the database. We're building a real merge function that combines all their data (notes, emails, tasks) into one lead and deletes the duplicate.

> ⚠️ **SAFETY WARNING: DESTRUCTIVE OPERATION.** Merging deletes a lead record permanently. The merge endpoint MUST:
> 1. Use a database transaction (`prisma.$transaction`) so if any step fails, nothing is partially applied
> 2. Verify both leads belong to the same organization
> 3. Move ALL related records (activities, notes, messages, tasks, appointments) before deletion
> 4. Consider soft-delete instead of hard-delete for recoverability

**File:** `src/pages/leads/LeadsMerge.tsx`  
**Problem:** `handleMerge` (L137-149) shows a toast and removes from local state. Comment on L143 says *"In a real implementation, you'd call an API endpoint to merge"*.

#### Backend:
Create `POST /api/leads/merge` in `lead.controller.ts`:
```ts
export const mergeLeads = async (req: Request, res: Response) => {
  const { primaryLeadId, secondaryLeadId, mergeStrategy } = req.body
  const orgId = req.user!.organizationId

  // Verify both leads belong to this org
  const [primary, secondary] = await Promise.all([
    prisma.lead.findFirst({ where: { id: primaryLeadId, organizationId: orgId } }),
    prisma.lead.findFirst({ where: { id: secondaryLeadId, organizationId: orgId } }),
  ])
  if (!primary || !secondary) throw new NotFoundError('Lead not found')

  // Merge: move all activities, notes, messages, tasks from secondary → primary
  await prisma.$transaction([
    prisma.activity.updateMany({ where: { leadId: secondaryLeadId }, data: { leadId: primaryLeadId } }),
    prisma.note.updateMany({ where: { leadId: secondaryLeadId }, data: { leadId: primaryLeadId } }),
    prisma.message.updateMany({ where: { leadId: secondaryLeadId }, data: { leadId: primaryLeadId } }),
    prisma.task.updateMany({ where: { leadId: secondaryLeadId }, data: { leadId: primaryLeadId } }),
    // Merge fields based on strategy (keep primary / keep non-null / keep newest)
    prisma.lead.update({ where: { id: primaryLeadId }, data: { /* merged fields */ } }),
    prisma.lead.delete({ where: { id: secondaryLeadId } }),
  ])

  res.json({ success: true, data: { mergedLeadId: primaryLeadId } })
}
```

Add route: `router.post('/merge', authenticate, leadController.mergeLeads)`

#### Frontend:
Update `handleMerge` to call the API:
```ts
const handleMerge = async (duplicateId: number) => {
  const duplicate = duplicates.find(d => d.id === duplicateId)
  if (!duplicate) return
  try {
    await leadsApi.mergeLeads({
      primaryLeadId: duplicate.lead1.id,
      secondaryLeadId: duplicate.lead2.id,
    })
    toast.success(`Merged leads #${duplicate.lead1.id} and #${duplicate.lead2.id}`)
    setDuplicates(prev => prev.filter(d => d.id !== duplicateId))
    setStats(prev => ({ ...prev, potential: prev.potential - 1, mergedMonth: prev.mergedMonth + 1 }))
  } catch (error) {
    toast.error('Failed to merge leads')
  }
}
```

---

### Item 4: LeadsFollowups.tsx — Wire `handleComplete` to API

> **In plain English:** There's a follow-ups page showing upcoming tasks like "Call John back." You can click to mark them complete, but it only updates on your screen — refresh and it's unchecked again. We're making the "complete" action actually save to the server.

**File:** `src/pages/leads/LeadsFollowups.tsx`  
**Problem:** `handleComplete` (L122-128) only updates local state.\n\n> ⚠️ **Line numbers corrected in safety audit:** Originally stated L134-139, actual is L122-128.\n> **Note:** This page already loads real data from `activitiesApi.getActivities()` — only the \"complete\" action is fake.

**Fix:**
```ts
const handleComplete = async (id: number) => {
  try {
    await activitiesApi.updateActivity(String(id), { status: 'completed' })
    setFollowups((prev: FollowUp[]) =>
      prev.map((f: FollowUp) => f.id === id ? { ...f, status: 'completed' } : f)
    )
    const followup = followups.find((f: FollowUp) => f.id === id)
    toast.success(`Follow-up with ${followup?.lead} marked as complete`)
  } catch (error) {
    toast.error('Failed to complete follow-up')
  }
}
```

---

### Item 5: LeadDetail.tsx — Replace hardcoded notes

> **In plain English:** When you view a lead's detail page, there's a section showing notes like "Very interested in our enterprise features." These notes are fake — they're the same for every lead and can't be edited or added to. We're replacing them with real notes that are fetched from the database and letting users add new ones.

**File:** `src/pages/leads/LeadDetail.tsx`  
**Problem:** Notes at L155-157 are a hardcoded array.

**Fix:**
1. Add `useQuery` to fetch notes for this lead:
```ts
const { data: notes = [] } = useQuery({
  queryKey: ['lead-notes', leadId],
  queryFn: () => notesApi.getLeadNotes(leadId),
})
```
2. Add create note mutation:
```ts
const createNoteMutation = useMutation({
  mutationFn: (content: string) => notesApi.createNote({ leadId, content }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['lead-notes', leadId] })
    toast.success('Note added')
  },
})
```
3. Delete the hardcoded `const notes = [...]` array.

---

### Item 6: LeadDetail.tsx — Replace hardcoded assignedTo dropdown

> **In plain English:** When assigning a lead to a team member, the dropdown shows "Sarah Johnson, Mike Chen, David Lee, Emma Rodriguez" — four made-up names that never change. We're replacing this with a real list of your actual team members pulled from the database.

**File:** `src/pages/leads/LeadDetail.tsx`  
**Problem:** L779-791 has hardcoded dropdown with 4 fake names.

**Fix:**
1. Fetch team members:
```ts
const { data: teamMembers = [] } = useQuery({
  queryKey: ['team-members'],
  queryFn: () => usersApi.getTeamMembers(),
})
```
2. Replace hardcoded options:
```tsx
<select
  className="w-full mt-1 p-2 border rounded-md"
  value={editingLead.assignedTo || ''}
  onChange={(e) => setEditingLead({...editingLead, assignedTo: e.target.value || null})}
>
  <option value="">Unassigned</option>
  {teamMembers.map((member: User) => (
    <option key={member.id} value={member.id}>{member.name}</option>
  ))}
</select>
```

---

## Tab 1: Auth

**Priority:** 7 — Build missing features  
**Estimated Time:** ~24 hours

> **In plain English:** "Auth" covers everything related to user accounts — logging in, signing up, resetting passwords, etc. Login and signup work fine, but several essential features are completely missing or faked:
> - **Forgot password:** Shows a "success" message after 1 second but never actually sends any email.
> - **Reset password:** The page renders, but the button literally does nothing — no click handler, no form submission.
> - **Change password:** The settings page validates your input but doesn't actually change anything.
> - **Email verification:** Doesn't exist at all.
> - **Logout:** Only clears the browser — the server still thinks you're logged in.
>
> We need to build all of these from scratch.

### Item 7: Build `POST /api/auth/forgot-password` endpoint

> **In plain English:** When a user clicks "Forgot Password," they should get an email with a special link to reset it. Right now, no email is ever sent — the page just pretends it worked. We're building the full flow: generate a secure token, store it in the database (expires in 1 hour), and send a real email with the reset link.

**Problem:** `ForgotPassword.tsx` has a `handleSubmit` that uses `setTimeout` to fake success. No backend endpoint exists.

#### Backend:

Install `nodemailer`:
```bash
cd backend
npm install nodemailer
npm install -D @types/nodemailer
```

Create password reset token schema (add to `schema.prisma`):
```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@map("password_reset_tokens")
}
```

Add to `auth.controller.ts`:
```ts
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body
  // Always return success (don't reveal if email exists)
  const user = await prisma.user.findFirst({ where: { email } })
  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      }
    })
    // Send email with reset link containing `token` (not hashed)
    await sendPasswordResetEmail(user.email, token)
  }
  res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' })
}
```

Add route: `router.post('/forgot-password', authController.forgotPassword)`

#### Frontend:
Update `ForgotPassword.tsx` `handleSubmit`:
```ts
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!email) { toast.error('Email required'); return }
  setLoading(true)
  try {
    await authApi.forgotPassword(email)
    toast.success('Email sent!', 'Check your inbox for password reset instructions')
  } catch (error) {
    toast.error('Something went wrong. Please try again.')
  } finally {
    setLoading(false)
  }
}
```

---

### Item 8: Build `POST /api/auth/reset-password` endpoint + wire ResetPassword.tsx

> **In plain English:** This is the page users land on when they click the reset link from their email. Currently, the password fields don't even save what you type into them, and the "Reset Password" button has no code behind it at all. We're rebuilding the entire page to actually accept a new password, verify the reset link is valid, and update the user's password in the database.

**Problem:** `ResetPassword.tsx` — button has no `onClick`, password fields have no `value`/`onChange`, the `_navigate` is unused dead code.

#### Backend:
Add to `auth.controller.ts`:
```ts
export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: { token: hashedToken, expiresAt: { gt: new Date() }, usedAt: null },
    include: { user: true },
  })
  if (!resetToken) throw new BadRequestError('Invalid or expired reset token')
  
  const hashedPassword = await bcrypt.hash(password, 12)
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { password: hashedPassword } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ])
  res.json({ success: true, message: 'Password reset successfully' })
}
```

Add route: `router.post('/reset-password', authController.resetPassword)`

#### Frontend:
Rewrite `ResetPassword.tsx`:
1. Extract token from URL: `const { token } = useParams()`
2. Add state for `password` and `confirmPassword` with `onChange` handlers
3. Wire password requirements to real-time validation (check length, uppercase, number, special char)
4. Add `handleSubmit` that calls `authApi.resetPassword(token, password)`
5. On success, navigate to `/login` with success message
6. Remove the `_navigate` dead code — use the actual `navigate` properly

---

### Item 9: Build `POST /api/auth/change-password` endpoint

> **In plain English:** In Settings, there's a page to change your password. It checks that your new password meets requirements (good!), but then it fakes the save. We're building the actual server endpoint that verifies your current password is correct and then updates to the new one.

**Backend:**
```ts
export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  const isValid = await bcrypt.compare(currentPassword, user!.password)
  if (!isValid) throw new BadRequestError('Current password is incorrect')
  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: req.user!.id }, data: { password: hashedPassword } })
  res.json({ success: true, message: 'Password changed successfully' })
}
```

Add route: `router.post('/change-password', authenticate, authController.changePassword)`

This endpoint will be used by `PasswordSecurityPage.tsx` (see Tab 10, Item 5).

---

### Item 10: Build email verification flow

> **In plain English:** After signing up, users should get an email saying "click here to verify your email address." This prevents people from signing up with fake emails. This entire feature doesn't exist yet — we need to build it from scratch.

**Backend:**
1. Add `emailVerified Boolean @default(false)` to User model *(NOTE: this field already exists at schema.prisma L429 — no schema change needed)*
2. Add `EmailVerificationToken` model (similar to PasswordResetToken) *(this model does NOT exist yet — must be created)*
3. Send verification email on registration
4. `GET /api/auth/verify-email?token=xxx` endpoint to verify

**Frontend:**
1. After registration, show "Check your email" page
2. Verification link opens app, calls API, shows success

---

### Item 11: Build server-side logout

> **In plain English:** Currently, "logout" only deletes the login token from your browser. But the server still considers that token valid, so if anyone copied it, they could keep using it. We're adding server-side logout that invalidates the token entirely.

**Backend:**
Add token blacklist (or use Redis):
```ts
export const logout = async (req: Request, res: Response) => {
  // If using refresh tokens stored in DB:
  await prisma.refreshToken.deleteMany({ where: { userId: req.user!.id } })
  res.json({ success: true, message: 'Logged out successfully' })
}
```

Add route: `router.post('/logout', authenticate, authController.logout)`

---

## Tab 13: Billing

**Priority:** 13 (last) — Deferred until core features are complete  
**Estimated Time:** ~32 hours  
**Dependency:** Stripe account and API keys

> **In plain English:** Billing is how users pay for the CRM — subscribing to plans, managing credit cards, viewing invoices, and tracking usage. This is being saved for last because it requires a Stripe account (a payment processor), and it makes more sense to have a fully working product before asking people to pay for it. Right now, the billing pages are all static mockups: hardcoded credit cards (Visa ending in 4242), a fake invoice, and made-up usage charts. We'll integrate with Stripe to make everything real — upgrade/downgrade plans, add/remove payment methods, and view real invoices.

### Item 12: Stripe integration setup

> **In plain English:** Stripe is the payment processor (like PayPal but designed for software businesses). We need to install the Stripe library, add your API keys, and create the core configuration file.

> ⚠️ **SAFETY AUDIT (2026-02-17):** The `stripe` npm package is **already installed** (`stripe@^19.3.0` in package.json). Also, `backend/src/services/stripe.service.ts` already exists with some Stripe integration code. Check what's already implemented there before building from scratch — you may be able to extend it rather than create a separate `config/stripe.ts`.
> `STRIPE_SECRET_KEY` is already in `.env.example`.

```bash
# stripe package already installed — skip this
# cd backend && npm install stripe
```

Create `backend/src/config/stripe.ts` (unless `stripe.service.ts` already covers this):
```ts
import Stripe from 'stripe'
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})
```

Add to `.env`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Item 13: Build billing controller

> **In plain English:** This is the server-side code that talks to Stripe on your behalf — creating checkout pages, listing invoices, handling payment method changes. It also handles webhooks (when Stripe sends your server a notification like "hey, a payment just went through").

Create `backend/src/controllers/billing.controller.ts`:
- `createCheckoutSession` — creates Stripe Checkout for plan upgrade
- `createBillingPortalSession` — opens Stripe Customer Portal for subscription management
- `handleWebhook` — processes Stripe webhook events (subscription.created, updated, deleted, invoice.paid, payment_method.attached)
- `getSubscriptionStatus` — returns current plan, usage, billing date
- `getInvoices` — lists past invoices from Stripe
- `getPaymentMethods` — lists saved payment methods

Create `backend/src/routes/billing.routes.ts` and mount in `server.ts`.

### Item 14: BillingSubscriptionPage.tsx — Wire to Stripe

> **In plain English:** The subscription page currently shows three plan tiers side-by-side but has no way to actually upgrade or downgrade. We're adding real buttons that redirect users to Stripe Checkout to subscribe/change plans.

**File:** `src/pages/billing/BillingSubscriptionPage.tsx` (204 lines)  
**Problem:** Static plan comparison. No upgrade/downgrade functionality.

**Fix:**
1. Fetch current subscription: `useQuery(['subscription'], billingApi.getSubscription)`
2. Add `handleUpgrade(planId)` → calls `billingApi.createCheckoutSession(planId)` → redirects to Stripe Checkout
3. Add `handleManageSubscription()` → calls `billingApi.createBillingPortalSession()` → redirects to Stripe Billing Portal
4. Show current plan with real data, highlight active plan

### Item 15: PaymentMethods.tsx — Wire to Stripe

> **In plain English:** The payment methods page shows two fake credit cards (Visa and Mastercard) that can't be added, removed, or changed. We're integrating Stripe Elements (Stripe's secure card input form) so users can manage their real payment methods.

**File:** `src/pages/billing/PaymentMethods.tsx` (377 lines)  
**Problem:** Hardcoded 2 cards (Visa, Mastercard). No interactivity at all.

**Fix:**
1. Install `@stripe/react-stripe-js` and `@stripe/stripe-js` in frontend:
   ```bash
   npm install @stripe/react-stripe-js @stripe/stripe-js
   ```
2. Fetch real payment methods: `useQuery(['payment-methods'], billingApi.getPaymentMethods)`
3. Add Stripe Elements form for adding new cards
4. Add `handleSetDefault(methodId)`, `handleDelete(methodId)` mutations

### Item 16: UsageDashboard.tsx — Wire to real usage data

> **In plain English:** The usage dashboard shows pretty charts of how much of the plan you're using (leads created, campaigns sent, etc.), but the data is all fake — 6 months of made-up numbers. We're replacing it with real usage data from your actual account.

**File:** `src/pages/billing/UsageDashboard.tsx` (310 lines)  
**Problem:** Hardcoded 6 months of fake `usageData`. Plan is hardcoded.

**Fix:**
1. Build `GET /api/billing/usage` backend endpoint
2. Fetch real data: leads count, campaigns sent, API calls, storage used
3. Show real limits based on subscription tier
4. Keep `recharts` charts but feed them real data

### Item 17: InvoiceDetail.tsx — Wire to Stripe invoices

> **In plain English:** The invoice page shows one hardcoded invoice (always "INV-2024-001" for "Acme Corporation" at $107.91). We're making it fetch real invoices from Stripe so users can see their actual billing history and download PDF receipts.

**File:** `src/pages/billing/InvoiceDetail.tsx` (350 lines)  
**Problem:** Single hardcoded invoice.

**Fix:**
1. Get invoice ID from URL params: `const { invoiceId } = useParams()`
2. Fetch from API: `useQuery(['invoice', invoiceId], () => billingApi.getInvoice(invoiceId))`
3. Add "Download PDF" button that gets PDF URL from Stripe

---

## Tab 5: Campaigns

**Priority:** 3 — Complete existing features  
**Estimated Time:** ~28 hours

> **In plain English:** Campaigns are how you send marketing messages (emails, texts, phone calls) to groups of leads at once. The pages for this exist and look great, but almost nothing works behind the scenes. The charts show fake data (hardcoded numbers that never change), the "Create Campaign" buttons do nothing when clicked, and the reports page literally generates random revenue numbers using `Math.random()`. We're rebuilding all of this to use real data and make every button actually do something.

### Item 18: CampaignDetail.tsx — Replace hardcoded chart data

> **In plain English:** When you open a campaign, there are beautiful charts showing opens, clicks, and conversions. But they show the exact same numbers every time for every campaign because they're hardcoded. We're replacing them with real analytics from actual campaign performance.

**File:** `src/pages/campaigns/CampaignDetail.tsx`  
**Problem:** 5 hardcoded chart arrays at L29-L77 (`performanceData`, `funnelData`, `hourlyEngagementData`, `deviceData`, `geoData`).

**Fix:**
1. Build `GET /api/campaigns/:id/analytics` backend endpoint that returns real engagement data
2. Replace hardcoded arrays with `useQuery` calls
3. Show "No data yet" state for campaigns that haven't been sent

### Item 19: CampaignReports.tsx — Replace fabricated metrics

> **In plain English:** The reports page takes real campaign names but then makes up all the numbers — it always says 99.1% delivery rate, 32% open rate, and generates random revenue with `Math.random()`. Every time you refresh, the revenue changes to a different random number. We're replacing all of this with real metrics computed from actual campaign data.

**File:** `src/pages/campaigns/CampaignReports.tsx`  
**Problem:** L47-60 fabricates metrics with hardcoded rates (99.1% delivery, 32% open rate) and `Math.random()` revenue.

**Fix:**
1. Build `GET /api/campaigns/reports` backend endpoint
2. Compute real metrics from actual campaign execution data
3. If no real data exists, show zeros with "Send your first campaign to see metrics here"

### Item 20: CampaignsList.tsx — Wire `_`-prefixed mutations

> **In plain English:** The campaigns list page has code that was written to create, pause, and send campaigns — but it was "turned off" by the developer (prefixed with an underscore `_` to suppress warnings). The buttons on the page aren't connected to this code. We're turning it back on and connecting each button to the right action.

**File:** `src/pages/campaigns/CampaignsList.tsx`  
**Problem:** 3 unused mutations: `_createCampaignMutation` (L80-88), `_pauseCampaignMutation` (L118-127), `_sendCampaignMutation` (L130-139).

**Fix:**
1. Remove underscore prefix from all three
2. Wire `createCampaignMutation` to "Create Campaign" button with a create modal/form
3. Wire `pauseCampaignMutation` to pause buttons on each campaign row
4. Wire `sendCampaignMutation` to send/launch buttons on each campaign row

### Item 21: EmailCampaigns.tsx — Fix broken create button + mock stats

> **In plain English:** The "Create Email Campaign" button on the email campaigns page looks clickable but does absolutely nothing — there's no code behind it. Same for the stats showing "32% open rate" — that's a fake number. We're adding a campaign creation form and pulling real statistics.

**File:** `src/pages/campaigns/EmailCampaigns.tsx`  
**Problem:** "Create Email Campaign" button at L70-73 has no `onClick`. Mock stats at L42-45.

**Fix:**
1. Add create campaign modal/drawer
2. Wire `onClick` to open the modal
3. Replace mock stats with real data from campaign analytics endpoint

### Item 22: SMSCampaigns.tsx — Fix dead buttons + mock stats

> **In plain English:** The SMS campaigns page has buttons for "Create SMS Campaign," "Send Now," "Schedule," and "Save as Draft" — none of them do anything. Not a single one has any code attached. We're wiring them all up to real functionality.

**File:** `src/pages/campaigns/SMSCampaigns.tsx`  
**Problem:** "Create SMS Campaign" (L67-70), "Send Now", "Schedule", "Save as Draft" (L115-143) — all have no `onClick`.

**Fix:**
1. Wire "Create SMS Campaign" to campaign creation flow
2. Wire "Quick Send SMS" buttons to actual SMS sending API
3. Replace mock delivery/click rates with real data

### Item 23: PhoneCampaigns.tsx — Fix dead buttons + mock stats

> **In plain English:** Same story as email and SMS campaigns — the phone campaigns page has multiple "Create" buttons, plus "View Report" and "Edit" buttons on each campaign, and none of them respond to clicks. The stats (like "66.7% answer rate") are made up. We're making it all functional.

**File:** `src/pages/campaigns/PhoneCampaigns.tsx`  
**Problem:** "Create Phone Campaign" (L66-69), 3 campaign type "Create" buttons (L128-155), "View Report" and "Edit" buttons — all no `onClick`.

**Fix:**
1. Build phone campaign creation flow
2. Wire all buttons to appropriate actions
3. Replace mock answer rate/duration/conversions with real data (when voice integration is built)

---

## Tab 8: Communications

**Priority:** 5 — Complete existing features  
**Estimated Time:** ~20 hours

> **In plain English:** The Communications inbox is the messaging center of the CRM where you see all emails, texts, and calls with leads. It actually works fairly well — the main issue is that it's a single monster file with 2,096 lines of code, which makes it very hard to update or fix bugs. We're breaking it into smaller, organized pieces (like organizing a messy closet into labeled bins) so we can maintain and improve it going forward.

### Item 24: CommunicationInbox.tsx — Decompose monolith

> **In plain English:** Imagine a 50-page document where everything — the table of contents, chapters, glossary, and index — is all in one long run-on paragraph. That's this file. We're splitting it into logical sections (thread list, message view, compose form, filters) so each part can be worked on independently.

> ⚠️ **SAFETY WARNING — HIGH-RISK REFACTOR:** This is a 2,095-line file. Breaking it apart carries significant risk of introducing bugs. To do this safely:
> 1. **Do NOT rewrite from scratch.** Extract one component at a time, moving code verbatim.
> 2. **Test after each extraction.** Verify the inbox still loads, threads still display, messages still send.
> 3. **Keep the original as backup** until all extractions are verified working.
> 4. **Extract in this safe order:** ThreadItem (simplest, self-contained) → MessageFilters → ThreadList → MessageDetail → ComposePanel (most complex, last)

**File:** `src/pages/communication/CommunicationInbox.tsx` (2,096 lines)  
**Problem:** Single massive component. Only 1 sub-component imported (`AIComposer`). Difficult to maintain.

**Fix:** Extract into separate components:
1. `ThreadList.tsx` — sidebar list of message threads with search/filter
2. `MessageDetail.tsx` — selected thread's messages display
3. `ComposePanel.tsx` — new message composition form
4. `MessageFilters.tsx` — filter/sort controls
5. `ThreadItem.tsx` — individual thread list item

Keep `CommunicationInbox.tsx` as the layout orchestrator that composes these.

### Item 25: Remove 11 `console.log` statements

> **In plain English:** `console.log` is something developers use to test code — it prints messages to a hidden developer panel. There are 11 of these left in the inbox file like forgotten Post-it notes from development. They should be cleaned up before users see the app.

**File:** `src/pages/communication/CommunicationInbox.tsx`  
Clean up all 11 `console.log` calls (highest count of any file).

---

## Tab 4: Calendar / Activity / Tasks

**Priority:** 4 — Complete existing features  
**Estimated Time:** ~24 hours

> **In plain English:** These three pages (Calendar, Activity Feed, and Tasks) are the most frustrating case in the app. The backend (server) already has fully working APIs for appointments, activities, and tasks — all the hard work is done. But the frontend pages completely ignore these APIs and instead show fake hardcoded data. It's like having a fully stocked kitchen but the waiter brings out plastic food. We just need to connect the pages to the existing server endpoints.

### Item 26: CalendarPage.tsx — Wire to appointment API

> **In plain English:** The calendar shows 5 fake events ("Meeting with John Doe," "Property Viewing," etc.) that are the same for every user every day. Meanwhile, the backend has 9 fully working calendar endpoints ready to go. We're replacing the fake events with real appointments from the database and adding the ability to create new ones.

**File:** `src/pages/calendar/CalendarPage.tsx`  
**Problem:** 100% hardcoded. 5 fake events at L46-52. Backend has full appointment CRUD at `/api/appointments` (9 endpoints) but none are called.

**Fix:**
1. Import `appointmentsApi` from `@/lib/api`
2. Fetch events:
```ts
const { data: appointments } = useQuery({
  queryKey: ['appointments', currentMonth],
  queryFn: () => appointmentsApi.getCalendarView({ month: currentMonth, year: currentYear }),
})
```
3. Delete hardcoded `events` array
4. Add create appointment modal → `appointmentsApi.createAppointment(data)`
5. Add click handler on events → navigate to detail or open edit modal
6. Add drag-to-reschedule if desired

**Backend endpoints already exist:**
- `GET /api/appointments/calendar` → `getCalendarView`
- `GET /api/appointments/upcoming` → `getUpcomingAppointments`
- `POST /api/appointments` → `createAppointment`
- `PUT /api/appointments/:id` → `updateAppointment`
- `DELETE /api/appointments/:id` → `cancelAppointment`

### Item 27: ActivityPage.tsx — Wire to activity API

> **In plain English:** The activity feed shows 6 fake entries like "Sarah updated a lead 2 hours ago" that never change. The backend has 8 working activity endpoints. We're replacing the static entries with a live feed of real actions your team has taken.

**File:** `src/pages/activity/ActivityPage.tsx`  
**Problem:** 100% hardcoded. 6 fake activities at L12-73. Backend has full activity CRUD at `/api/activities` (8 endpoints) but none are called.

**Fix:**
1. Import `activitiesApi` from `@/lib/api`
2. Fetch activities:
```ts
const { data: activities } = useQuery({
  queryKey: ['activities'],
  queryFn: () => activitiesApi.getActivities({ limit: 50 }),
})
```
3. Delete hardcoded `activities` array
4. Add real-time timestamps (replace static "2 hours ago" strings)
5. Wire filter buttons to API query parameters

### Item 28: TasksPage.tsx — Wire `_`-prefixed mutations

> **In plain English:** The tasks page already has code written to create, edit, delete, and complete tasks — but it was all "disabled" by the developer (underscore prefix). The page shows tasks from the database (that part works!) but you can't interact with them. We're enabling the existing code and connecting the buttons.

**File:** `src/pages/tasks/TasksPage.tsx`  
**Problem:** 3 mutations and 1 handler are `_`-prefixed and never called from UI:
- `_createTaskMutation` (L133-141)
- `_updateTaskMutation` (L144-153)
- `_deleteTaskMutation` (L156-164)
- `_handleToggleComplete` (L178-184)

Note: `completeTaskMutation` (L167-175) is properly defined but only called from the dead `_handleToggleComplete`.

**Fix:**
1. Remove `_` prefix from all four
2. Wire `createTaskMutation` to "Add Task" button/form
3. Wire `updateTaskMutation` to task edit functionality
4. Wire `deleteTaskMutation` to delete buttons on task rows
5. Wire `handleToggleComplete` to checkbox/toggle on each task

---

## Tab 10: Settings

**Priority:** 8 — Complete existing features  
**Estimated Time:** ~16 hours

> **In plain English:** The Settings tab has pages for compliance settings, demo data, Google integration, service configurations, and password changes. Many of these pages load properly and look polished, but their "Save" buttons are all fake — they wait 1 second, show a "Saved!" message, but don't actually save anything. One page even fetches real data from the server but then throws it away without displaying it. We're connecting every Save button to a real server call so settings actually persist.

### Item 29: ComplianceSettings.tsx — Fix `handleSave` + use loaded data

> **In plain English:** This page reaches out to the server to get your compliance settings (good!), but then completely ignores the response and shows default values instead. And clicking Save waits 1 second then says "Saved!" without doing anything. We're fixing both: display the real data AND save your changes for real.

**File:** `src/pages/settings/ComplianceSettings.tsx`  
**Problem:** `loadSettings` calls real API but ignores the returned data. `handleSave` (L49) is 100% fake (`setTimeout`).

**Fix `loadSettings`:**
```ts
const loadSettings = async (isRefresh = false) => {
  try {
    const settings = await settingsApi.getBusinessSettings()
    // Actually USE the returned data:
    setComplianceSettings(settings)  // Set state with real data
    if (isRefresh) toast.success('Settings refreshed')
  } catch (error) {
    toast.error('Failed to load settings, using defaults')
  }
}
```

**Fix `handleSave`:**
```ts
const handleSave = async () => {
  setSaving(true)
  try {
    await settingsApi.updateComplianceSettings(complianceSettings)
    toast.success('Compliance settings saved')
  } catch (error) {
    toast.error('Failed to save compliance settings')
  } finally {
    setSaving(false)
  }
}
```

Build `PUT /api/settings/compliance` backend endpoint if it doesn't exist.

### Item 30: DemoDataGenerator.tsx — Wire `handleGenerate` + `handleClearAll`

> **In plain English:** This tool is supposed to let admins generate sample data for testing (like 50 fake leads) and clear it when done. Both buttons are fake — they wait, show success, but create/delete nothing. We're building the actual server endpoints to generate and clean up test data.

**File:** `src/pages/settings/DemoDataGenerator.tsx`  
**Problem:** Both handlers (L16-44) are 100% fake (`setTimeout`).

**Fix:**
1. Build `POST /api/admin/demo-data/generate` endpoint
2. Build `DELETE /api/admin/demo-data` endpoint
3. Wire `handleGenerate` to call generate API with type and count
4. Wire `handleClearAll` to call clear API

### Item 31: GoogleIntegration.tsx — Fix `handleSaveSettings`

> **In plain English:** The "Connect to Google" button actually works (rare!). But after connecting, if you change any settings and click Save, it's fake. We're making the Save button actually persist your Google integration preferences.

**File:** `src/pages/settings/GoogleIntegration.tsx`  
**Problem:** `handleConnect` makes a real API call (good!). `handleSaveSettings` (L82-91) is fake (`setTimeout`).

**Fix:**
```ts
const handleSaveSettings = async () => {
  setSaving(true)
  try {
    await settingsApi.updateIntegrationSettings('google', googleSettings)
    toast.success('Google integration settings saved')
  } catch (error) {
    toast.error('Failed to save settings')
  } finally {
    setSaving(false)
  }
}
```

### Item 32: ServiceConfiguration.tsx — Fix 9 broken save/test handlers

> **In plain English:** This page configures external services (like email servers, SMS providers). There are 9 Save/Test/Action buttons total — the first two are fake (wait + "success!") and the other seven literally have no code behind them at all. We're wiring all 9 to real functionality.

> ⚠️ **SAFETY AUDIT (2026-02-17):** Original plan said 5 dead buttons. Actual count is **7 dead buttons** (Save Cache, Flush Cache, Save Queue, Save Search, Reindex All Data, Save Analytics, Save Monitoring) plus 2 fake handlers = 9 total broken interactions.

**File:** `src/pages/settings/ServiceConfiguration.tsx`  
**Problem:** `handleSaveSettings` and `handleTestConnection` (L38-63) are fake. 7 more buttons at L246, L247, L297, L352, L353, L406, L451 have **no `onClick` at all**.

**Fix:**
1. Wire `handleSaveSettings` to `settingsApi.updateServiceConfig(config)`
2. Wire `handleTestConnection` to `settingsApi.testConnection(service)` (build endpoint)
3. Add `onClick` handlers to all 7 dead buttons

### Item 33: PasswordSecurityPage.tsx — Wire to change-password API

> **In plain English:** This is the "change your password" page. It properly checks that your new password is long enough and that both entries match (good!), but the actual password change is fake — it never talks to the server. We're connecting it to the real change-password endpoint built in Auth Item 9.

**File:** `src/pages/settings/PasswordSecurityPage.tsx`  
**Problem:** `handleSubmit` (L15-49) has good client-side validation but the actual save is fake (`setTimeout`).

**Fix:** (Depends on Auth Item 9 — `POST /api/auth/change-password` endpoint)
```ts
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  // Keep existing validation...
  setLoading(true)
  try {
    await authApi.changePassword(currentPassword, newPassword)
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    toast.success('Password updated successfully')
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Failed to update password')
  } finally {
    setLoading(false)
  }
}
```

---

## Tab 6: AI Hub

**Priority:** 1 (highest) ⭐ AI FEATURES FIRST  
**Estimated Time:** ~8 hours (reduced from ~20 — backends already built)

> **In plain English:** The AI Hub is where your CRM's "smart assistant" features live — things like automatically writing emails, composing text messages, and suggesting what to do next with a lead. Right now, all of these are fake: the email composer just fills in a canned template after a fake delay, the SMS composer picks a random pre-written message, and the suggested actions are hardcoded with no real intelligence. We're wiring all of these to your actual GPT-4 AI backend so they generate real, personalized content based on each lead's data.

> ⚠️ **NOVEMBER 2025 CROSS-REFERENCE:** Significant AI work was completed in November:
> - `AIComposer.tsx` (753 lines) already exists in the Communication Hub with real GPT-4 integration via `ai-compose.service.ts`
> - `VariationsPanel.tsx` exists with 3-variation A/B comparison
> - `prediction.service.ts` and `suggestions.service.ts` provide response rate predictions and smart suggestions
> - Intelligence Hub (`intelligence.controller.ts`, `/api/intelligence`) and A/B Testing (`abtest.controller.ts`, `/api/ab-tests`) are mounted and working
> - `ai-functions.service.ts` has 7 real function handlers including `compose_email`, `compose_sms`, `compose_script`
>
> **What's STILL broken despite November work:**
> - `AIEmailComposer.tsx` (standalone component, different from `AIComposer.tsx`) — still has fake `setTimeout` + `alert()`
> - `AISMSComposer.tsx` — still has fake random template picker + `alert()`
> - `AISuggestedActions.tsx` — still has 4 hardcoded suggestions with `console.log` handlers
> - The November `AIComposer.tsx` is only embedded in CommunicationInbox — the standalone email/SMS composers used elsewhere in the app are NOT fixed

### Item 34: AIEmailComposer.tsx — Wire to AI API

> **In plain English:** When you click "Generate" to write an email for a lead, the app currently waits 1.5 seconds and then shows the same pre-written template every time. And clicking "Send" just shows a browser popup saying "Email would be sent" — it doesn't actually send anything. We're connecting this to the real AI so it writes a unique, personalized email each time, and the Send button will actually deliver the email.

> ⚠️ **SAFETY AUDIT (2026-02-17) — USE EXISTING ENDPOINTS:** The backend already has working AI compose and email sending endpoints. DO NOT build new ones:
> - **AI compose:** `POST /api/ai/compose` — calls `generateContextualMessage` service (real GPT-4 integration). Also: `POST /api/ai/compose/variations` and `POST /api/ai/compose/stream` (SSE streaming).
> - **Email sending:** `POST /api/messages/email` — calls `sendEmail` controller in message.routes.ts.
> - The frontend just needs to call these existing endpoints.

**File:** `src/components/ai/AIEmailComposer.tsx`  
**Problem:** `handleGenerate` (L50-80) is fake (`setTimeout` with hardcoded template). `handleSend` (L87-90) just calls `alert()`.

**Fix `handleGenerate`:**
```ts
const handleGenerate = async () => {
  setIsGenerating(true)
  try {
    const result = await aiApi.composeEmail({
      leadName,
      leadEmail,
      tone,
      purpose,
      context,
    })
    setEmailData({ subject: result.subject, body: result.body })
  } catch (error) {
    toast.error('Failed to generate email')
  } finally {
    setIsGenerating(false)
  }
}
```

**Fix `handleSend`:**
```ts
const handleSend = async () => {
  try {
    await messagesApi.sendEmail({
      to: leadEmail,
      subject: emailData.subject,
      body: emailData.body,
      leadId,
    })
    toast.success('Email sent successfully')
    onClose()
  } catch (error) {
    toast.error('Failed to send email')
  }
}
```

### Item 35: AISMSComposer.tsx — Wire to AI API

> **In plain English:** Same problem as the email composer above, but for text messages. The "regenerate" button just picks a random template from a small list, and "send" shows a popup instead of actually texting anyone. We'll connect it to the AI for smart message writing and to a real SMS service for actual delivery.

> ⚠️ **SAFETY AUDIT (2026-02-17) — USE EXISTING ENDPOINTS:** The backend already has:
> - **AI SMS generate:** `POST /api/ai/generate/sms` — exists in ai.routes.ts
> - **SMS sending:** `POST /api/messages/sms` — exists in message.routes.ts
> - **Note:** Line numbers are slightly off from original plan. `handleRegenerate` is at L59-66 (not L52-59), `handleSend` is at L68-71 (not L62-65).

**File:** `src/components/ai/AISMSComposer.tsx`  
**Problem:** `handleRegenerate` (L59-66) picks random local template. `handleSend` (L68-71) just calls `alert()`.

**Fix:** Same pattern as email — call existing `POST /api/ai/generate/sms` for generation, call existing `POST /api/messages/sms` for sending.

### Item 36: AISuggestedActions.tsx — Wire to AI API

> **In plain English:** On a lead's page, there's a section called "AI Suggested Actions" that's supposed to tell you things like "Call this person at 2 PM — they're 82% likely to respond." Right now, those suggestions are fake — the same 4 suggestions appear for every single lead, and clicking them just logs a message to the developer console (invisible to users). We'll make it so the AI actually analyzes each lead's history and gives real, personalized suggestions.

> ⚠️ **SAFETY AUDIT (2026-02-17) — USE EXISTING ENDPOINT:** `POST /api/ai/suggest-actions` already exists in ai.routes.ts. The frontend just needs to call it. Also note: hardcoded suggestions are at L28-61 (not L25-62 as originally stated).

**File:** `src/components/ai/AISuggestedActions.tsx`  
**Problem:** 4 hardcoded suggestions (L28-61) with `console.log` click handlers. Component takes no `leadId` prop.

**Fix:**
1. Accept `leadId` as prop
2. Fetch real suggestions: `useQuery(['ai-suggestions', leadId], () => aiApi.suggestActions(leadId))` — uses existing `POST /api/ai/suggest-actions`
3. Wire click handlers to actual actions (open email composer, schedule call, etc.)

### Item 37: Add rate limiter to AI routes

> **In plain English:** Every time someone uses an AI feature, it costs money because it calls OpenAI's GPT-4. Right now there's no limit — a user could spam the button 1,000 times in a minute. We're adding a speed bump: max 20 AI requests per minute per user. If they exceed that, they get a friendly "slow down" message.

**File:** `backend/src/routes/ai.routes.ts`  
**Problem:** No rate limiting on any of the 30+ AI endpoints.

**Fix:** Already detailed in Phase 0F, Step 3. Apply rate limiter middleware to all AI routes.

---

## Tab 12: Admin

**Priority:** 9 — Build missing features  
**Estimated Time:** ~24 hours

> **In plain English:** The Admin panel is where system administrators manage the CRM itself — system settings, feature toggles, server health monitoring, and database maintenance. Every single page here is a pure mockup: the settings are hardcoded, the health dashboard shows fake server statuses with randomly jittering numbers, and the database maintenance buttons (backup, optimize, etc.) all just wait a few seconds and say "Done!" without doing anything. We're building real backends for all of these.

### Item 38: SystemSettings.tsx — Wire to settings API

> **In plain English:** This page shows system-wide settings like company name, timezone, password requirements, and session timeout. All 15 values are hardcoded (the company is always "Your CRM System" in New York timezone). The Save buttons show "Saved!" without saving. We're building real storage and retrieval for these settings.

**File:** `src/pages/admin/SystemSettings.tsx` (457 lines)  
**Problem:** 15 hardcoded state values. 2 save handlers that just show toasts.

**Fix:**
1. Build `GET /api/admin/system-settings` and `PUT /api/admin/system-settings` endpoints
2. Fetch settings on mount: `useQuery(['system-settings'], adminApi.getSystemSettings)`
3. Wire `handleSaveGeneralSettings` to `adminApi.updateSystemSettings(generalSettings)`
4. Wire `handleSaveSecuritySettings` to `adminApi.updateSystemSettings(securitySettings)`

### Item 39: FeatureFlags.tsx — Wire to feature flags API

> **In plain English:** Feature flags let admins turn features on/off without deploying new code (like a light switch for each feature). Currently, the toggles only work in browser memory — refresh the page and they reset. We're building a database-backed system so flag changes persist and affect all users immediately.

**File:** `src/pages/admin/FeatureFlags.tsx` (397 lines)  
**Problem:** 6 hardcoded feature flags. All CRUD is local state only.

**Fix:**
1. Build feature flags CRUD API:
   - `GET /api/admin/feature-flags`
   - `POST /api/admin/feature-flags`
   - `PUT /api/admin/feature-flags/:id`
   - `DELETE /api/admin/feature-flags/:id`
2. Store feature flags in database (add `FeatureFlag` model to schema)
3. Wire all handlers to API calls

### Item 40: HealthCheckDashboard.tsx — Wire to real health checks

> **In plain English:** This dashboard shows green/yellow/red status for services like the database, email service, and cache. But the statuses are hardcoded — the database always says "12ms latency, 99.9% uptime" whether it's actually running or not. Clicking refresh just adds random jitter to the numbers (dirty trick!). We're building a real health check that actually pings each service and reports true status.

**File:** `src/pages/admin/HealthCheckDashboard.tsx` (356 lines)  
**Problem:** 6 hardcoded services with fake latency. Refresh handler uses `Math.random()`.

**Fix:**
1. Build `GET /api/admin/health` endpoint that actually checks:
   - Database: `SELECT 1` with timing
   - Redis: `PING` with timing (if redis is set up)
   - External APIs: HTTP HEAD requests with timing
2. Wire frontend to fetch from this endpoint
3. Auto-refresh on interval (e.g., every 30 seconds)

### Item 41: DatabaseMaintenance.tsx — Wire to real maintenance ops

> **In plain English:** This page has 12 maintenance buttons (Backup, Optimize, Reindex, Clear Data, etc.). Every single one is fake — they wait between 1.5 and 3.5 seconds and then say "Done!" Even the scary ones like "Drop Database" and "Truncate All Tables" do nothing (luckily!). We're wiring the useful ones to real database operations and keeping the dangerous ones properly locked down.

> ⚠️ **SAFETY WARNING — DESTRUCTIVE OPERATIONS:** The `handleTruncateAll` and `handleDropDatabase` buttons MUST NEVER be wired to real destructive database operations in production. These should either:
> - Be **removed entirely** from the UI, OR
> - Be restricted to a **development-only mode** that is completely disabled in production via environment variable check
> - NEVER just require `confirm()` dialogs — a misclick could destroy all data
>
> The safe maintenance operations (backup, vacuum, reindex, stats) should require the `ADMIN` role AND an additional server-side authorization check.

**File:** `src/pages/admin/DatabaseMaintenance.tsx` (440 lines)  
**Problem:** 12 fake handlers, all `setTimeout` + toast.

**Fix:**
1. Build admin maintenance endpoints (with proper authorization — admin-only):
   - `POST /api/admin/db/backup` — triggers pg_dump
   - `POST /api/admin/db/vacuum` — runs VACUUM ANALYZE
   - `POST /api/admin/db/reindex` — runs REINDEX
   - `GET /api/admin/db/stats` — returns table sizes, row counts
2. Wire the useful handlers (`handleBackup`, `handleVacuum`, `handleReindex`, `handleOptimize`)
3. **REMOVE** `handleTruncateAll` and `handleDropDatabase` buttons from the UI entirely (or hide behind `NODE_ENV === 'development'` check)

---

## Tab 7: Analytics

**Priority:** 10 — Complete existing features  
**Estimated Time:** ~12 hours

> **In plain English:** The Analytics tab shows dashboards with charts and numbers about your business — task completions, activity feeds, conversion funnels, etc. The backend code for generating these analytics exists but has two problems: (1) the security holes from Phase 0D where data from all companies leaks together, and (2) some frontend pages may still show hardcoded data instead of calling the real APIs. We're fixing both.

### Item 42: Fix `getTaskAnalytics` org filtering

> **In plain English:** The task analytics endpoint (which tells you things like "you completed 15 tasks this week") currently counts tasks from ALL companies combined. We're adding the company filter so you only see your own numbers.

**File:** `backend/src/controllers/analytics.controller.ts` L315-341  
**Fix:** Add `organizationId` filter to all 7 task queries (requires Task schema fix from Phase 0C).

### Item 43: Fix `getActivityFeed` org filtering

> **In plain English:** The activity feed ("who did what") currently shows actions from ALL companies. Same fix as above — filter by your company.

**File:** `backend/src/controllers/analytics.controller.ts` L378-408  
**Fix:** Already detailed in Phase 0D, Fix 6.

### Item 44: Fix `getConversionFunnel` org filtering

> **In plain English:** The conversion funnel (showing how many leads move from New → Contacted → Qualified → Won) counts leads from ALL companies. Same fix — filter by your company.

**File:** `backend/src/controllers/analytics.controller.ts` L505-509  
**Fix:** Already detailed in Phase 0D, Fix 7.

### Item 45: Fix analytics dashboard frontend — replace mock data with real API data

> **In plain English:** Audit all analytics pages to make sure they're pulling real data from the server instead of showing hardcoded numbers.

> ⚠️ **SAFETY AUDIT (2026-02-17) — MORE WORK THAN EXPECTED:** The analytics pages have extensive mock data issues:
> - **AnalyticsDashboard.tsx** (392 lines) — Calls real APIs for some data, but `getMockRevenueData()`, `getMockChannelData()`, `getMockConversionFunnel()`, `getMockTeamPerformance()` are hardcoded functions. The revenue chart ALWAYS uses `getMockRevenueData()` regardless of API response — the real data is fetched then ignored.
> - **LeadAnalytics.tsx** (269 lines) — Calls `analyticsApi.getLeadAnalytics()` but falls back to hardcoded values (`totalLeads || 4567`, `conversionRate || 26.2`). The `leadTrends` chart data (6 months) is always hardcoded.
> - **CampaignAnalytics.tsx, ConversionReports.tsx, UsageAnalytics.tsx, CustomReports.tsx** — All contain hardcoded arrays (`campaignPerformance`, `hourlyPerformance`, `timeToConvert`, `usageData`, `topUsers`, `featureUsage`, `savedReports`).
>
> **Fix:** Replace all `getMock*()` calls and hardcoded arrays with actual data from the API responses. Show "No data yet" empty states instead of fake numbers when there's no real data.

---

## Tab 9: Automation / Workflows

**Priority:** 6 — Build missing features  
**Estimated Time:** ~10 hours (reduced from ~16 — list page already wired)

> **In plain English:** Workflows are automated sequences — like "when a new lead comes in, wait 1 day, then send a welcome email, wait 3 days, then create a follow-up task." The visual workflow builder exists and you can design these flows, but there's no engine to actually run them. Pressing "Test" always says "Success!" without running any steps, and there are security holes where Company A could trigger Company B's workflows. We need to build the actual automation engine and lock down security.

> ⚠️ **NOVEMBER 2025 CROSS-REFERENCE:** WorkflowsList.tsx was wired to backend API in November 2025:
> - `WorkflowsList.tsx` calls `workflowsApi.getWorkflows()` and `workflowsApi.getStats()` — real data, not hardcoded
> - Toggle button calls `workflowsApi.toggleWorkflow()` — works
> - Delete button calls `workflowsApi.deleteWorkflow()` — works with confirmation
> - Edit button navigates to WorkflowBuilder — works (load bug was also fixed)
> - `api.ts` has full `workflowsApi` object with all methods
>
> **What's STILL broken despite November work:**
> - `testWorkflow` controller instantly writes SUCCESS without executing anything
> - `getWorkflowStats` has no organizationId filtering (Phase 0D Fix 4)
> - `triggerWorkflow` has no ownership check (Phase 0D Fix 3)
> - `getWorkflowExecutions`, `getWorkflowAnalytics`, `triggerWorkflowsForLead` — no org filters (Phase 0D Fixes 8-10)

### Item 46: Fix `testWorkflow` — Actually execute workflow

> **In plain English:** When you click "Test" on a workflow, it's supposed to run through all the steps to make sure they work. Instead, it immediately writes "Success!" in the database without doing anything — like a teacher giving every student an A without reading their papers. We're making it actually execute each step and report real results.

**File:** `backend/src/controllers/workflow.controller.ts` L209-248  
**Problem:** Always writes `SUCCESS` without executing any actions. Pollutes execution log.

**Fix:**
1. Import the workflow execution engine
2. Actually execute each action in the workflow's action list with `testData`
3. Mark as `SUCCESS` or `FAILED` based on actual results
4. Add a `test: true` flag to prevent real side effects (e.g., don't actually send emails, but validate the template)

### Item 47: Fix `getWorkflowStats` org filtering

> **In plain English:** The workflow stats page (showing counts like "5 active workflows, 100 executions") currently shows numbers from ALL companies combined instead of just yours. Fixing this (details in Phase 0D).

Already detailed in Phase 0D, Fix 4.

### Item 48: Fix `triggerWorkflow` ownership check

> **In plain English:** Right now, if you know another company's workflow ID, you can trigger it. There's no "does this workflow belong to you?" check. We're adding that check.

Already detailed in Phase 0D, Fix 3.

### Item 49: Wire existing workflow execution engine

> **In plain English:** This is the "brain" that actually does the work in a workflow. When a workflow says "send an email," something needs to actually send that email. Right now the `testWorkflow` function ignores the engine and just says "Success!" — but the engine framework actually exists and just needs to be connected.

> ⚠️ **SAFETY AUDIT (2026-02-17) — ENGINE ALREADY EXISTS:** The original plan said to "build from scratch." This is WRONG. An execution engine framework already exists:
> - `backend/src/services/workflowExecutor.service.ts` — In-memory execution queue with priority levels, retry logic (1s, 5s, 15s delays), `enqueueWorkflow()`, `processQueue()`, queue status tracking
> - `backend/src/services/workflow.service.ts` — Has `executeWorkflow()` and `triggerWorkflowsForLead()`
> - `backend/src/jobs/workflowProcessor.ts` — Time-based workflow processing job
>
> **What actually needs to happen:**
> 1. Wire `testWorkflow` controller to call the existing `executeWorkflow()` service instead of instantly writing `SUCCESS`
> 2. Verify the existing engine handles all action types (send email, send SMS, update lead status, create task, wait/delay, conditional branching)
> 3. Add any missing action type handlers to the existing engine
> 4. Add a `test: true` flag to prevent real side effects during testing (validate templates but don't actually send)
>
> This reduces the estimated effort from ~16 hr to ~8 hr since the framework is already built.

---

## Tab 14: Integrations

**Priority:** 11 — Build missing features  
**Estimated Time:** ~20 hours

> **In plain English:** Integrations connect your CRM to external services like Google Workspace, Outlook, and third-party tools. Right now there's a routing bug (two pages fight for the same URL), and the actual OAuth flows (the "Sign in with Google" type connections) haven't been built. We also need calendar sync so your CRM appointments show up in Google Calendar and vice versa.

### Item 50: Fix duplicate `/integrations` and `/settings` routes in App.tsx

> **In plain English:** Two different pages are both trying to load at the same URL (`/integrations`). Only the first one wins, so the second page can never be seen. We need to pick one or give them different URLs.

> ⚠️ **SAFETY AUDIT (2026-02-17):** There are actually **two** duplicate routes, not one:
> 1. `/integrations` — at L231 (`Integrations`) and L265 (`IntegrationsHub`) — different components
> 2. `/settings` — at L216 (`SettingsHub`) and L269 (`SettingsHub`) — same component, redundant declaration

**File:** `src/App.tsx`  
**Problem:** Two routes for `/integrations`:
- L231: `<Integrations />` (from `src/pages/settings/Integrations.tsx`)
- L265: `<IntegrationsHub />` (from `src/pages/integrations/IntegrationsHub.tsx`)

And duplicate `/settings` route:
- L216: `<SettingsHub />`
- L269: `<SettingsHub />` (redundant, safe to remove)

React Router matches the first, so `IntegrationsHub` never renders.

**Fix:**
1. For `/integrations`: Decide which component should be used, remove the other route. If both are needed, give them different paths (e.g., `/integrations` and `/integrations/hub`).
2. For `/settings`: Remove the duplicate at L269 (it's the same component, just redundant).

### Item 51: Build OAuth flows

> **In plain English:** OAuth is the standard "Sign in with Google" / "Connect your Outlook" flow where users authorize the CRM to access their external accounts securely (without sharing passwords). This needs to be built from scratch — generating the authorization URL, handling the callback when Google/Outlook redirects back, and securely storing the access tokens.

For Google, Outlook, and other integrations:
1. Build `GET /api/integrations/:provider/auth-url` — returns OAuth URL
2. Build `GET /api/integrations/:provider/callback` — handles OAuth callback
3. Store tokens securely in database
4. Build token refresh logic

### Item 52: Build calendar sync

> **In plain English:** Two-way calendar sync means if you create an appointment in the CRM, it automatically shows up in your Google Calendar, and vice versa. This requires handling conflicts (what if you change the same appointment in both places?) and listening for real-time updates.

Sync appointments with Google Calendar / Outlook Calendar:
1. Build 2-way sync service
2. Handle conflicts (local vs remote changes)
3. Webhook listeners for real-time updates from Google/Outlook

---

## Tab 11: Help

**Priority:** 12 — Build missing features  
**Estimated Time:** ~8 hours

> **In plain English:** The Help section should give users a way to learn how to use the app — things like searchable documentation, tooltips that explain what buttons do, a getting-started wizard for new users, and an FAQ page. Most of this doesn't exist yet.

### Item 53: Build help/documentation system

> **In plain English:** Build out the help pages so new users can actually learn how to use the CRM without needing someone to show them. This includes searchable articles, contextual tooltips throughout the app, and a "first-time user" walkthrough.

Current help pages are likely static or placeholder. Build:
1. Searchable help articles
2. In-app tooltips for complex features
3. Getting started wizard for new users
4. FAQ section

---

## Tab 2: Dashboard

**Priority:** 14 (lowest — already works)  
**Estimated Time:** 0 hours

> **In plain English:** Good news! The main dashboard (the first page you see when you log in) is actually working correctly. It pulls real data from the server and displays accurate stats. No work needed here.

> ⚠️ **SAFETY AUDIT NOTE (2026-02-17):** The Dashboard is the most complete page — it uses `useQuery` with real API calls for stats, lead analytics, campaign analytics, conversion funnels, activity feeds, tasks, and campaigns. However, after Phase 0C/0D fixes are applied, the task-related numbers will change (currently showing cross-tenant data). This is expected and correct — the numbers will become accurate to the user's organization.

**No work needed.** Dashboard was verified to be working correctly with real data from the API.

---

## Phase Last: Cleanup

**Priority:** After all tabs  
**Estimated Time:** ~8 hours

> **In plain English:** This is the final polish pass. We're removing developer debugging messages that got left in the code (like Post-it notes that should've been thrown away), adding automated rules to prevent these issues from happening again, and doing one final check to make sure everything compiles, builds, and runs cleanly.

### Item 54: Remove all `console.log` statements

> **In plain English:** `console.log` statements are how developers debug code — they print invisible messages to a developer panel. They're harmless but unprofessional in production code and can occasionally leak sensitive information. There are 44+ of them scattered across the codebase. We're removing them all.

Top offenders by file:

| File | Count |
|------|-------|
| `src/pages/communication/CommunicationInbox.tsx` | 11 |
| `src/pages/settings/TwilioSetup.tsx` | 8 |
| `src/pages/auth/Register.tsx` | 7 |
| `src/components/workflows/WorkflowComponentLibrary.tsx` | 4 |
| `src/components/ai/AISuggestedActions.tsx` | 4 |
| `src/pages/workflows/WorkflowBuilder.tsx` | 2 |
| `src/pages/settings/EmailConfiguration.tsx` | 2 |
| `src/pages/tasks/TasksPage.tsx` | 1 |
| `src/pages/leads/LeadsList.tsx` | 1 |
| `src/pages/leads/LeadDetail.tsx` | 1 |
| `src/pages/campaigns/CampaignsList.tsx` | 1 |
| `src/pages/campaigns/CampaignDetail.tsx` | 1 |
| `src/pages/ai/LeadScoring.tsx` | 1 |

**Fix:** Replace with proper logging or remove entirely:
```bash
# Find all console.log in frontend
grep -rn "console\.log" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules
```

Replace `console.log` with either:
- Nothing (delete the line) for debug logging
- A proper logger for production-worthy logging

### Item 55: Remove duplicate routes in App.tsx

> **In plain English:** Same as Item 50 — cleaning up the routing conflicts. Included here as a reminder in case it wasn't done during the Integrations work.

Already detailed in Tab 14, Item 50. Remove the dead `/integrations` route at L265 AND the duplicate `/settings` route at L269.

### Item 56: Add ESLint rule to prevent future issues

> **In plain English:** ESLint is an automated code checker (like spell-check for code). We're adding rules that automatically warn developers when they leave `console.log` statements or unused variables in the code, so these issues don't pile up again.

Add to `.eslintrc`:
```json
{
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
```

### Item 57: Final verification sweep

> **In plain English:** One final automated check to make sure everything is clean: no rogue database connections, no data leaking between companies, no debugging messages, no unused code, and the entire app compiles and builds without errors.

```bash
# No rogue PrismaClient
grep -rn "new PrismaClient" backend/src/ --include="*.ts" | grep -v database.ts

# No unfiltered queries in controllers
grep -rn "prisma\." backend/src/controllers/*.ts | grep -v organizationId | grep -v "where"

# No console.log in production code
grep -rn "console\.log" src/ --include="*.tsx" --include="*.ts" | wc -l

# No dead imports
npx tsc --noEmit 2>&1 | grep "declared but"

# Build succeeds
npm run build
cd backend && npm run build
```

---

## Execution Order Summary

> ⚠️ **Updated 2026-02-17 after November docs cross-reference.** Hour estimates reduced for AI Hub (~20→~8) and Workflows (~16→~10) based on work already completed in November 2025. Total reduced from ~347 to ~329 hours.

```
Phase 0A: Delete 13 dead files + 1 orphan               (~2 hr)
Phase 0B: Fix PrismaClient in 8 files                   (~2 hr)
Phase 0C: Schema fixes (Task, onDelete, tier)            (~4 hr)
Phase 0D: Cross-tenant security (12 functions)           (~4 hr)
Phase 0E: API response standardization                   (~2 hr)
Phase 0F: Security hardening                             (~4 hr)
─────────────────────────────────────────── ⭐ AI FIRST ─
Tab 6:  AI Hub (polish existing + fix standalone)        (~8 hr)  ← reduced: backends done Nov '25
───────────────────────────── COMPLETE EXISTING FEATURES ─
Tab 3:  Leads (import, pipeline, merge, followups, etc.) (~40 hr)
Tab 5:  Campaigns (charts, reports, wire mutations)      (~28 hr)
Tab 4:  Calendar/Activity/Tasks (wire to existing API)   (~24 hr)
Tab 8:  Communications (decompose monolith)              (~20 hr)
──────────────────────────────── BUILD MISSING FEATURES ─
Tab 9:  Workflows (security fixes + test execution)      (~10 hr) ← reduced: list page wired Nov '25
Tab 1:  Auth (forgot/reset password, email verify, etc.) (~24 hr)
Tab 10: Settings (wire fake saves to real API)           (~16 hr)
Tab 12: Admin (system settings, health, maintenance)     (~24 hr)
Tab 7:  Analytics (org filtering + frontend wiring)      (~12 hr)
Tab 14: Integrations (OAuth, calendar sync)              (~20 hr)
Tab 11: Help (documentation system)                      (~8 hr)
──────────────────────────────────────────────── LAST ─
Tab 13: Billing (Stripe, subscriptions, invoices)        (~32 hr)
─────────────────────────────────────────────────────────
Phase Last: Cleanup (console.log, ESLint, final verify)  (~8 hr)
═════════════════════════════════════════════════════════
TOTAL                                                   ~329 hr
```

### Critical Path (AI-first approach):

```
Phase 0 → Tab 6 (AI Hub) → Tab 3 (Leads) → Tab 5 (Campaigns) = ~120 hr
```

AI features are differentiated first. Then complete existing features, build missing ones, and save Billing (Stripe) for last.

---

> **Note:** All line numbers and file paths were originally verified against the codebase as of 2025-11-13, then re-verified in a safety audit on 2026-02-17, and cross-referenced against 21 November 2025 documentation files. Most line numbers match exactly or are within 1-5 lines. The biggest discrepancy found was Item 4 (LeadsFollowups `handleComplete`) which is at L122-128, not L134-139 as originally stated. Line numbers may shift as changes are made — always verify before editing.
> 
> **WARNING about November .md files:** Several claim "PRODUCTION READY" or "COMPLETE" for features that are demonstrably still broken (cross-tenant security, PrismaClient sprawl). Always verify claims against actual code before assuming any work item is done.
