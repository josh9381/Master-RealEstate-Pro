# Tags & Segments Overhaul Plan

## Problem Summary

Tags and Segments are two disconnected systems. Tags are well-integrated into leads, campaigns, and workflows but have data integrity issues. Segments are a powerful dynamic rule engine but are completely isolated — not connected to campaigns, automations, or the leads page. The Segmentation page is misplaced under AI Hub when it's not an AI feature.

---

## Architecture Decision

**Keep Tags and Segments separate but connected.**

- **Tags** = manual labels (like playlists). Static. User explicitly adds/removes them.
- **Segments** = dynamic rule-based groups (like smart playlists). Auto-updating based on criteria.
- **Connection point**: Segments can use tags as a filter field, so the two systems compose together.
- Tags are the zero-friction on-ramp. Segments are the power tool you graduate to.

---

## Phase 1: Foundation Fixes

### 1.1 — Settings Tags Page: Default Tags + Custom Tags

**Current state**: TagsManager at `/settings/tags` shows a flat list. No distinction between system-provided defaults and user-created tags.

**Changes**:
- Add a **Default Tags** section at the top of the Tags settings page with pre-built real estate tags:
  - Lead Type: `Buyer`, `Seller`, `Investor`, `Renter`, `Landlord`
  - Priority: `Hot Lead`, `Warm Lead`, `Cold Lead`
  - Source: `Referral`, `Open House`, `Website`, `Social Media`
  - Status: `VIP`, `Follow-up Needed`, `Do Not Contact`
- Default tags come pre-created for new organizations and cannot be deleted (only hidden/disabled)
- Default tags have a subtle badge/indicator distinguishing them from custom tags
- Add a **Custom Tags** section below where users create/edit/delete their own tags
- Both default and custom tags work identically everywhere else in the system (leads, campaigns, workflows)

### 1.2 — Segment Settings on Tags Page

**Current state**: Segment configuration lives only on the Segmentation page itself. No centralized settings.

**Changes**:
- Rename the Settings page from "Tags" to **"Tags & Segments"** (route stays `/settings/tags`)
- Add a **Segment Settings** section below the tags sections with:
  - **Auto-refresh interval**: How often segment member counts refresh (e.g., every 1h, 6h, 24h, manual only)
  - **Default match type**: Whether new segments default to match ALL or ANY rules
  - **Max segment rules**: Limit on number of rules per segment (prevent performance issues)
  - **Segment color palette**: Default colors available when creating segments

### 1.3 — Fix Hardcoded Tags in Bulk Actions

**File**: `src/pages/leads/list/LeadModals.tsx`

**Current state**: `TagsModal` uses hardcoded array `['Hot Lead', 'Enterprise', 'VIP', 'Follow-up', 'Demo Scheduled', 'Proposal Sent']`.

**Fix**: Fetch tags from the API using React Query (same pattern `AdvancedFilters` already uses). Show loading state while fetching.

### 1.4 — Standardize Color Format

**Current state**: Mixed formats — Tailwind classes (`bg-blue-500`), hex codes (`#3B82F6`), nullable strings.

**Fix**: Standardize everything to **hex codes**:
- `TagsManager` component: use hex color picker instead of Tailwind class dropdown
- `Segmentation` page: already uses hex (no change)
- `workflow.service.ts`: already defaults to hex (no change)
- DB stores hex string or null (null → use a default gray)

### 1.5 — Remove Phantom Fields from TagsManager

**Current state**: `TagsManager` interface references `category`, `usageCount`, `description` fields that don't exist in the DB schema. `category` defaults to `'Priority'`, `description` always `''`.

**Fix**: Remove phantom fields from the component interface. If `usageCount` is useful, compute it from the actual `_count` relation returned by the tags API.

### 1.6 — Add Tag Filtering to GET /api/leads

**Current state**: The main leads endpoint doesn't support filtering by tag in query params.

**Fix**: Add optional `tags` query param (comma-separated tag IDs or names) to `GET /api/leads`. Filter using Prisma `where: { tags: { some: { id: { in: tagIds } } } }`.

---

## Phase 2: Move Segmentation Page + Tags as Segment Rules

### 2.1 — Relocate Segmentation from AI Hub to Leads

**Current state**: Segmentation lives at `/ai/segmentation` under AI Hub.

**Changes**:
- Move page to `/leads/segments`
- Add "Segments" item to the Leads section in the sidebar nav (between Pipeline and Follow-ups)
- Remove "Segmentation" from AI Hub nav
- Add redirect from `/ai/segmentation` → `/leads/segments` for bookmarks

### 2.2 — Add Tags as a Segment Rule Field

**Current state**: Segment rules support fields like status, score, source, city, etc. Tags are not available.

**Changes**:
- Backend: Update `buildWhereFromRules()` in `segmentation.service.ts` to handle `tags` field:
  - `includes` → `tags: { some: { name: value } }`
  - `excludes` → `NOT: { tags: { some: { name: value } } }`
  - `includesAll` → multiple `some` conditions
  - `includesAny` → `tags: { some: { name: { in: values } } }`
- Frontend: Add `tags` to the rule builder field dropdown with a tag-picker component (multi-select from existing tags) instead of free text input
- Update segment member count refresh to correctly evaluate tag-based rules

### 2.3 — Quick Filter by Tag on Leads List

**Changes**:
- Make tag badges on lead cards/rows clickable
- Clicking a tag filters the leads list to show only leads with that tag
- URL updates to `/leads?tag=TagName` (shareable/bookmarkable)
- Add a "Clear filter" chip at the top when filtered by tag
- Add a "Tags" quick-filter dropdown in the leads list toolbar (shows all tags with lead counts)

---

## Phase 3: Connect Segments to Campaigns

### 3.1 — Backend: Link Segments to Campaigns

**Changes**:
- Add optional `segmentId` field to Campaign model (FK → Segment)
- When sending/previewing a campaign:
  - If `segmentId` is set → evaluate segment rules to get recipient list
  - If tags are set (existing behavior) → filter by tags
  - Both can be combined (segment AND tags)
- Add `GET /api/campaigns/:id/audience-preview` endpoint that returns matching lead count and sample leads

### 3.2 — Frontend: Segment Selection in Campaign Create

**Current state**: `AdvancedAudienceFilters` accepts `savedSegments` prop but always receives `[]`.

**Changes**:
- Fetch segments and pass them to `AdvancedAudienceFilters`
- Add "By Segment" as an audience type option alongside All/New/Warm/Hot/Custom
- When segment is selected, show live member count and preview of matching leads
- Allow combining segment + additional tag filters for fine-tuning

---

## Phase 4: Connect Segments to Workflows

### 4.1 — Segment Match as Workflow Condition

**Changes**:
- Add `SEGMENT_MATCH` to `WorkflowConditionType` enum
- When evaluating a workflow action, check if the lead matches the segment's rules
- UI: Add "Lead is in segment [dropdown]" condition option in workflow builder
- Implementation: Run `buildWhereFromRules()` with the lead's ID added to the WHERE clause — if result count > 0, condition passes

### 4.2 — Segment Entry as Workflow Trigger (Stretch)

**Changes**:
- Add `SEGMENT_ENTERED` and `SEGMENT_EXITED` to `WorkflowTriggerType` enum
- After any lead create/update, evaluate active segments with entry/exit triggers
- Compare current match state to previous state (requires caching segment membership or last-check timestamp per lead)
- Fire trigger when lead newly matches (entered) or no longer matches (exited)
- This is the most complex feature — defer if needed

---

## Phase 5: Unify SavedFilterView and Segment

### 5.1 — Shared Rule Format

**Current state**: `SavedFilterView` and `Segment` both store JSON filter rules but use different schemas.

**Changes**:
- Migrate `SavedFilterView.filterConfig` to use the same rule format as `Segment.rules`
- Share `buildWhereFromRules()` as the single evaluation engine for both
- SavedFilterView stays user-scoped (personal saved views), Segments stay org-scoped

### 5.2 — "Save as Segment" from Leads List

**Changes**:
- When a user applies filters on the leads list, show a "Save as Segment" button
- This creates a new Segment with the current filter rules
- Replaces the need for separate SavedFilterView creation

---

## Execution Order & Dependencies

```
Phase 1 (Foundation)          ← No dependencies, start here
  ├── 1.1 Default + Custom Tags on Settings page
  ├── 1.2 Segment Settings on Tags page  
  ├── 1.3 Fix hardcoded tags
  ├── 1.4 Standardize colors
  ├── 1.5 Remove phantom fields
  └── 1.6 Tag filtering in leads API
         │
Phase 2 (Core Architecture)   ← Needs 1.6 for tag-based segment rules
  ├── 2.1 Move Segmentation to /leads/segments
  ├── 2.2 Tags as segment rule field
  └── 2.3 Quick filter by tag
         │
Phase 3 (Campaigns)           ← Needs Phase 2 (segments must be functional)
  ├── 3.1 Backend segment → campaign link
  └── 3.2 Frontend segment audience picker
         │
Phase 4 (Workflows)           ← Needs Phase 2
  ├── 4.1 Segment match condition
  └── 4.2 Segment entry/exit triggers (stretch)
         │
Phase 5 (Cleanup)             ← Needs Phase 2
  ├── 5.1 Unify SavedFilterView rule format
  └── 5.2 "Save as Segment" from leads list
```

---

## Files Affected (Key)

### Backend
- `backend/prisma/schema.prisma` — Campaign.segmentId FK, default tags seed, segment settings
- `backend/src/services/segmentation.service.ts` — `buildWhereFromRules()` tag support
- `backend/src/controllers/lead.controller.ts` — Tag query param filtering
- `backend/src/controllers/campaign.controller.ts` — Segment-based audience resolution
- `backend/src/services/workflow.service.ts` — SEGMENT_MATCH condition, SEGMENT_ENTERED trigger
- `backend/src/routes/segmentation.routes.ts` — No route changes needed
- `backend/src/routes/lead.routes.ts` — Tag filter param

### Frontend
- `src/pages/leads/list/LeadModals.tsx` — Replace hardcoded tags with API fetch
- `src/pages/leads/segments/` — New home for Segmentation page (move from `src/pages/ai/`)
- `src/pages/settings/TagsManager.tsx` — Default/custom tags sections, segment settings, hex colors, remove phantom fields
- `src/pages/campaigns/CampaignCreate.tsx` — Wire up segment audience selection
- `src/components/layout/Sidebar.tsx` — Add Segments nav item under Leads, remove from AI Hub
- `src/App.tsx` — Route change `/ai/segmentation` → `/leads/segments`
- `src/pages/leads/list/` — Clickable tag badges, quick filter toolbar

---
---

# AI Hub Audit Findings

Separate from the Tags & Segments work above. These are issues found across the AI Hub that need attention.

## AI Hub Inventory

**9 pages** (~5,400 lines), **12 components** (~3,800 lines), **70+ backend endpoints**, **12 backend services**.

| Page | Route | Lines | Status |
|------|-------|-------|--------|
| AIHub (Dashboard) | `/ai` | 571 | Functional |
| Lead Scoring | `/ai/lead-scoring` | 1023 | Most complete |
| Segmentation | `/ai/segmentation` | 541 | Moving to `/leads/segments` (see plan above) |
| Intelligence & Insights | `/ai/insights` | 845 | Functional, fragile normalization |
| Predictive Analytics | `/ai/predictive` | 408 | Clean, best error handling |
| AI Analytics | `/ai/analytics` | 287 | Fabricates data when API sparse |
| AI Cost Dashboard | `/ai/cost` | 295 | Functional, no error handling |
| AI Settings | `/ai/settings` | 874 | Fully functional |
| Org AI Settings | `/ai/org-settings` | 570 | Fully functional |

---

## Critical Issues

### C1 — Fake model data in AI Analytics

**File**: `src/pages/ai/AIAnalytics.tsx` (lines 52–68)

When `currentModels` isn't returned by the API, the page fabricates 4 fake model entries ("Segmentation", "Predictive", "Churn Model") by multiplying average accuracy by magic numbers (0.95, 0.97, 0.93). Users see this as real performance data.

**Fix**: Show an empty state ("No model data available") instead of manufacturing fake entries. Only render the model comparison chart when real `currentModels` data exists.

### C2 — Missing Property/PropertyView schema

**File**: `backend/src/services/message-context.service.ts` (lines 190–303)

References `Property` and `PropertyView` tables in a raw SQL query, but neither model exists in the Prisma schema. This query will throw at runtime, meaning AI Compose silently loses all property context for every message.

**Fix**: Either create the Property/PropertyView models in the schema, or remove the raw query and return an empty array with a log warning until properties are implemented.

### C3 — Template storage is in-memory only

**File**: `backend/src/services/template-ai.service.ts` (line 5)

Templates are stored in a `Map<>` with an explicit `TODO Phase 4: Migrate to database`. Any templates saved by users are lost on every server restart.

**Fix**: Use the existing `MessageTemplate` model in the Prisma schema (it already exists at line 526). Replace the in-memory Map with Prisma CRUD operations.

---

## High Priority Issues

### H1 — Error handling missing on 7 of 9 pages

Only `PredictiveAnalytics.tsx` uses `ErrorBanner` with `isError` checking. All other pages silently swallow errors:

| Page | Error behavior |
|------|---------------|
| AIHub | Shows "—" and "No data" text, no retry button |
| AIAnalytics | Catches error, shows toast, renders empty charts |
| AICostDashboard | No error handling at all — crashes or shows nothing |
| LeadScoring | Catch-and-toast, renders empty |
| IntelligenceInsights | Catch-and-toast, renders empty |
| AISettings | Catch-and-toast, renders empty |
| OrgAISettings | No error handling |

**Fix**: Add `isError` / `ErrorBanner` with retry to each page, following the pattern already used in `PredictiveAnalytics.tsx`.

### H2 — AISuggestedActions uses hardcoded fallbacks

**File**: `src/components/ai/AISuggestedActions.tsx` (line 67)

When the API fails, hardcoded fallback suggestions are displayed. Users see stale/generic suggestions and never know the AI is actually down.

**Fix**: Show an error state or "suggestions unavailable" message instead of fake suggestions.

---

## Medium Priority Issues

### M1 — Fragile response normalization in IntelligenceInsights

**File**: `src/pages/ai/IntelligenceInsights.tsx` (lines 90–115)

Chains 5+ fallback property accesses (`md.factors ?? md.weights ?? md.defaultWeights`) suggesting the backend response shape is unstable/inconsistent.

**Fix**: Standardize the backend response shape for the scoring model endpoint. Remove the cascading fallbacks once the response is stable.

### M2 — No A/B testing integration

The schema has `ABTest` and `ABTestResult` models and a user guide exists (`docs/AB_TESTING_USER_GUIDE.md`), but there is zero A/B testing UI in the AI Hub. Content generation (email sequences, SMS, social posts) is a natural fit for A/B testing variations.

**Fix**: Deferred — consider adding A/B test creation from the Content Generator Wizard.

### M3 — No empty-state guidance

Pages show "No X yet" messages but don't tell users how to generate their first data. For example, "No scored leads yet" doesn't say "Import leads and run scoring to see results here."

**Fix**: Add actionable CTAs to empty states (e.g., link to import leads, link to run scoring, link to send a message).

---

## Low Priority Issues

### L1 — No loading vs error distinction

Most pages show `LoadingSkeleton` during loading. If the query silently fails (catch → empty fallback), the skeleton disappears and users see an empty page with no explanation of what went wrong.

### L2 — Cost dashboard has no inline budget editing

The cost dashboard shows budget status but budget editing requires navigating to Org AI Settings. Consider adding inline edit or a direct link.

---

## What's Working Well (No Changes Needed)

- **Lead Scoring** — Most complete end-to-end feature (score → factors → config → recalibrate → optimize → upload training data)
- **AI Compose with streaming** — Production-quality real-time generation
- **Content Generator Wizard** — 5 content types with proper forms (email sequence, SMS, property description, social posts, listing presentation)
- **Usage tracking** — Tier-based limits fully wired with progress bars
- **Org settings** — Encrypted API key management, model selection with pricing
- **AI Chatbot** — GPT-4 with 25+ functions, feedback thumbs, history
- **Message Enhancer** — 6-tone rewriting modal
- **70+ backend endpoints** — All validated with Zod schemas on POST/PUT routes
- `src/pages/leads/list/` — Clickable tag badges, quick filter toolbar
