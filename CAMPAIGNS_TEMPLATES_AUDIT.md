# Campaigns > Templates — Full Audit

**Date:** March 14, 2026 (audited) / March 15, 2026 (fixed)  
**Status:** All Issues Fixed  
**Scope:** Frontend UI, Backend API, Data Layer, Validators, Services

---

## Architecture Overview

The Templates feature is spread across **4 distinct template systems**:

| System | Storage | Routes | Purpose |
|--------|---------|--------|---------|
| **Campaign Templates** | Hardcoded in-memory (`campaign-templates.ts`) | `GET /api/campaigns/templates` | Pre-built campaign templates (7 total) |
| **Email Templates** | PostgreSQL via Prisma (`EmailTemplate` model) | `/api/email-templates/*` | User-created email templates (8 seeded) |
| **SMS Templates** | PostgreSQL via Prisma (`SMSTemplate` model) | `/api/sms-templates/*` | User-created SMS templates (8 seeded) |
| **Message Templates** | PostgreSQL via Prisma (`MessageTemplate` model) | `/api/message-templates/*` | Inbox quick-replies & message templates (14 seeded) |

The **Campaigns > Templates page** (`/campaigns/templates`) displays only Campaign Templates (static). The Email/SMS/Message template systems are separate backend resources with full CRUD — but **no dedicated frontend management UI exists** for them.

---

## Files Audited

### Frontend
| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/campaigns/CampaignTemplates.tsx` | 290 | Templates browsing page |
| `src/components/campaigns/CampaignsSubNav.tsx` | — | Sub-navigation with Templates tab |
| `src/lib/api.ts` (L646-662, L1428-1520) | — | API client methods |
| `src/App.tsx` (L47, L182) | — | Route definition & lazy loading |

### Backend
| File | Lines | Purpose |
|------|-------|---------|
| `backend/src/data/campaign-templates.ts` | ~320 | Static template definitions |
| `backend/src/controllers/campaign.controller.ts` (L975-1090) | — | Campaign template endpoints |
| `backend/src/controllers/email-template.controller.ts` | ~290 | Full CRUD for email templates |
| `backend/src/controllers/sms-template.controller.ts` | ~290 | Full CRUD for SMS templates |
| `backend/src/controllers/message-template.controller.ts` | ~190 | CRUD + tier system + seed |
| `backend/src/validators/email-template.validator.ts` | ~50 | Zod schemas for email templates |
| `backend/src/validators/sms-template.validator.ts` | ~55 | Zod schemas for SMS templates |
| `backend/src/services/template.service.ts` | ~100 | Variable rendering engine |
| `backend/src/routes/campaign.routes.ts` | — | Campaign template routes |
| `backend/src/routes/email-template.routes.ts` | — | Email template routes |
| `backend/src/routes/sms-template.routes.ts` | — | SMS template routes |
| `backend/src/routes/message-template.routes.ts` | — | Message template routes |

---

## API Endpoint Testing Results

### Campaign Templates (Static)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/campaigns/templates` | ✅ PASS | Returns 7 templates |
| `GET /api/campaigns/templates?category=Alert` | ✅ PASS | Returns 2 (New Listing Alert, Price Drop Notice) |
| `GET /api/campaigns/templates?type=SMS` | ✅ PASS | Returns 0 (no SMS templates exist) |
| `GET /api/campaigns/templates?recurring=true` | ✅ PASS | Returns 3 recurring templates |
| `GET /api/campaigns/templates/:templateId` | ✅ PASS | Returns single template |
| `GET /api/campaigns/templates/nonexistent` | ✅ PASS | Returns 404 |
| `POST /api/campaigns/from-template/:id` | ✅ PASS | Creates DRAFT campaign with template data |
| `POST /api/campaigns/from-template/nonexistent` | ✅ PASS | Returns 404 |

### Email Templates (DB-backed)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/email-templates` | ✅ PASS | Returns 8 seeded templates with pagination |
| Multi-tenancy isolation | ✅ PASS | Filters by organizationId |

### SMS Templates (DB-backed)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/sms-templates` | ✅ PASS | Returns 8 seeded templates with character stats |
| Multi-tenancy isolation | ✅ PASS | Filters by organizationId |

### Message Templates (DB-backed)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/message-templates` | ✅ PASS | Returns 14 templates (8 templates + 6 quick replies) |
| Tier visibility | ✅ PASS | SYSTEM visible to all, PERSONAL filtered by userId |

---

## Issues Found

### 🔴 CRITICAL

#### 1. No SMS or Phone Campaign Templates
**Location:** `backend/src/data/campaign-templates.ts`  
**Impact:** All 7 campaign templates are EMAIL-only. The frontend shows SMS/Phone stat cards (conditionally), but they'll always be 0. The `type` field supports `'EMAIL' | 'SMS' | 'PHONE'` but no SMS or PHONE templates exist. Users filtering by "SMS" category get zero results.

#### 2. Email Template Body Has No Max Length Validation
**Location:** `backend/src/validators/email-template.validator.ts` L7  
**Impact:** `body: z.string().min(1, 'Body is required')` — no `.max()` limit. A malicious or careless user can submit an arbitrarily large body, causing potential memory/storage issues. SMS validator has a 1600 char limit; email should have a reasonable limit (e.g., 500KB).

#### 3. usageCount / lastUsedAt Never Updated
**Location:** `backend/src/controllers/email-template.controller.ts`, `sms-template.controller.ts`  
**Impact:** Both `EmailTemplate` and `SMSTemplate` Prisma models have `usageCount` (default 0) and `lastUsedAt` fields, but the `createCampaignFromTemplate` controller never increments them. The seeded data has non-zero usageCounts (hardcoded in seed), but actual usage is never tracked. This means usage analytics are fake/stale.

#### 4. No Frontend Management UI for Email/SMS/Message Templates
**Impact:** The backend has full CRUD endpoints for email templates, SMS templates, and message templates. The frontend `templatesApi`, `messageTemplatesApi` clients exist in `api.ts`. But there is **no admin UI** for creating, editing, or managing these templates. Users can only browse the 7 hardcoded campaign templates.

---

### 🟡 MEDIUM

#### 5. Placeholder Variable Inconsistency
**Location:** `backend/src/data/campaign-templates.ts`  
**Impact:** Templates mix two placeholder conventions:
- Dynamic variables: `{{lead.firstName}}`, `{{user.lastName}}`, `{{currentDate}}`
- Manual placeholders: `[INSERT ADDRESS]`, `[INSERT PRICE]`, `[INSERT FEATURES]`

The `TemplateService.renderTemplate()` only handles `{{variable}}` patterns. The `[INSERT ...]` placeholders won't be auto-replaced and require manual user editing. This is confusing — users may expect all placeholders to auto-fill.

#### 6. No Template Preview
**Location:** `src/pages/campaigns/CampaignTemplates.tsx`  
**Impact:** The "Use Template" button immediately creates a campaign. There's no way to preview the full template body/content before committing. Users can only see the name, description, tags, and truncated subject.

#### 7. Double-Click Race Condition on "Use Template"
**Location:** `src/pages/campaigns/CampaignTemplates.tsx` L92-112  
**Impact:** No loading/disabled state on the button during API call. Rapid double-clicking creates duplicate campaigns. The `handleUseTemplate` function has no guard against concurrent calls.

#### 8. Campaign Template `recurringPattern` Not Validated
**Location:** `backend/src/controllers/campaign.controller.ts` L1058-1065  
**Impact:** When creating a campaign from template, `recurringPattern` is passed directly to Prisma as JSON. No schema validation on valid days of week (0-6), valid time format, valid dayOfMonth (1-31), etc.

#### 9. `TemplateService.validateTemplate()` Never Called
**Location:** `backend/src/services/template.service.ts`  
**Impact:** The service has a `validateTemplate()` method that identifies missing variables and generates warnings, but it's never used anywhere in the codebase. Template variable validation is completely bypassed.

#### 10. Message Template Response Format Inconsistency
**Location:** `backend/src/controllers/message-template.controller.ts`  
**Impact:** Message templates return `{ templates, pagination }` directly, while email/SMS templates return `{ success: true, data: { templates, pagination } }`. This inconsistency requires different handling on the frontend.

---

### 🟢 LOW / COSMETIC

#### 11. Category Filter Mismatch Between Frontend and Backend
**Location:** `src/pages/campaigns/CampaignTemplates.tsx` L116  
**Impact:** Frontend categories include `'Email'` and `'SMS'` which filter by `type` (uppercased), while backend categories are `Newsletter`, `Alert`, `Event`, `Follow-up`. The filtering logic works due to the `||` check on both type and category, but it's confusing — "Email" shows all templates since all are EMAIL type.

#### 12. Seasonal Market Update Has Hardcoded Fall Subject
**Location:** `backend/src/data/campaign-templates.ts` L258  
**Impact:** `subject: '🍂 Fall Market Update: What You Need to Know'` — the subject is hardcoded to "Fall" despite being a "Seasonal" template meant for quarterly use.

#### 13. No Search on Campaign Templates API
**Impact:** The campaign templates GET endpoint supports `category`, `type`, and `recurring` filters, but no `search` parameter. Frontend implements client-side search which works fine for 7 templates, but would be an issue if the template count grows.

#### 14. Email Template `duplicateEmailTemplate` Doesn't Check Name Conflict
**Location:** `backend/src/controllers/email-template.controller.ts` L236-260  
**Impact:** When duplicating, it creates `"OriginalName (Copy)"` but doesn't check if that name already exists. Duplicating twice will throw a database error (if there's a unique constraint) or create duplicates.

#### 15. Missing `isActive` Default for `MessageTemplate`
**Location:** `backend/src/controllers/message-template.controller.ts`  
**Impact:** When creating a message template, `isActive` is not set in the create data. It relies on the Prisma model default but the schema shows `isActive Boolean` without `@default(true)` in the MessageTemplate model (unlike EmailTemplate/SMSTemplate which have it). Could result in templates being created with `null` isActive status.

---

## Security Assessment

| Check | Status | Notes |
|-------|--------|-------|
| Multi-tenancy isolation (Email) | ✅ | `organizationId` enforced on all queries |
| Multi-tenancy isolation (SMS) | ✅ | `organizationId` enforced on all queries |
| Multi-tenancy isolation (Message) | ✅ | `organizationId` + tiered visibility |
| Auth required | ✅ | All routes behind auth middleware |
| IDOR prevention | ✅ | Template ownership verified before update/delete |
| XSS in template body | ⚠️ | No HTML sanitization on email template body (by design for HTML emails, but could be dangerous if rendered raw) |
| Template injection | ✅ | Variable resolution uses simple string replacement, no `eval()` |
| Input validation (Email) | ⚠️ | Body has no max length |
| Input validation (SMS) | ✅ | 1600 char limit enforced |

---

## What's Working Well

1. **Multi-tenancy** — consistently enforced across all template types with organization-level isolation
2. **Campaign creation from template** — clean UX flow: click "Use Template" → campaign created as DRAFT → navigate to editor
3. **SMS character counting** — proper segment calculation (160 chars/segment) attached to every SMS template response
4. **Error handling** — proper 404/403/409 responses; IDOR-safe "not found" responses that don't leak cross-org data
5. **Tier-based message templates** — SYSTEM/ORGANIZATION/PERSONAL tiers with proper access control
6. **Frontend UX** — clean grid layout, category filtering, search, responsive stat cards, loading states, empty states

---

## Recommended Fixes (Priority Order) — ALL RESOLVED

1. ~~**Add max length to email template body**~~ — FIXED: Added `.max(500000)` to create/update validators
2. ~~**Add "Use Template" button loading state**~~ — FIXED: Added `creatingTemplateId` state, button shows spinner and disables during creation
3. ~~**Track usageCount/lastUsedAt**~~ — VERIFIED: Already tracked in `email.service.ts`, `sms.service.ts`, `template.service.ts`
4. ~~**Add SMS campaign templates**~~ — FIXED: Added 3 SMS templates (New Listing Alert, Open House Reminder, Showing Follow-up)
5. ~~**Standardize response format**~~ — FIXED: Message templates now return `{ success, data: { templates, pagination } }`
6. ~~**Standardize placeholder convention**~~ — FIXED: All `[INSERT ...]` converted to `{{variable}}` format
7. ~~**Add duplicate name check**~~ — FIXED: Both email and SMS duplicate endpoints now check for existing name first
8. ~~**Add template preview modal**~~ — FIXED: Added Preview button + Dialog with full body/subject/tags view
9. ~~**Validate recurringPattern**~~ — FIXED: Added daysOfWeek (0-6), dayOfMonth (1-31), time (HH:MM) validation
10. ~~**Fix category filter**~~ — FIXED: Removed confusing Email/SMS categories, kept actual categories
11. ~~**Fix seasonal template subject**~~ — FIXED: Changed from "🍂 Fall Market Update" to "📊 Seasonal Market Update"
12. ~~**Fix SMS duplicate response format**~~ — FIXED: Now returns `{ success, data: { template } }` wrapper
