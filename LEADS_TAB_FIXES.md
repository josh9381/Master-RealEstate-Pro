# Leads Tab — Fix Plan & Decisions

> Generated from user-focused audit on March 10, 2026

---

## No-Decision Fixes (Ready to Implement)

### 1. Sort field mapping broken
- **File**: `src/pages/leads/LeadsList.tsx` ~line 108
- **Problem**: Clicking "sort by Company", "Status", or "Source" columns all sort by `createdAt` instead of the correct field
- **Fix**: Map each sort field to its correct DB column (`company`, `status`, `source`)

### 2. Page doesn't reset on search/filter change
- **File**: `src/pages/leads/LeadsList.tsx`
- **Problem**: Searching while on page 3 can show empty results because page number doesn't reset
- **Fix**: Add `setCurrentPage(1)` when `searchQuery` or `filters` change

### 3. Client-side double filtering after server search
- **File**: `src/pages/leads/LeadsList.tsx` ~lines 216-218
- **Problem**: Search is sent to the API AND then re-filtered client-side on the response — redundant work, causes pagination mismatches
- **Fix**: Remove the client-side search filter since the server already handles it

### 4. Merge sends wrong field names
- **File**: `src/pages/leads/LeadsMerge.tsx`
- **Problem**: Frontend sends `primaryId` / `secondaryId` but backend expects `primaryLeadId` / `secondaryLeadIds` (array)
- **Fix**: Update frontend field names to match backend schema

### 5. Budget min > max not validated on create
- **File**: `src/pages/leads/LeadCreate.tsx`
- **Problem**: User can enter $500k min and $200k max with no error
- **Fix**: Add validation that budgetMin <= budgetMax

### 6. Server-side Excel export button missing error handling
- **File**: `src/pages/leads/LeadsExport.tsx` ~line 181
- **Problem**: `exportApi.download()` call has no try/catch — errors silently fail
- **Fix**: Wrap in try/catch with toast error

### 7. No loading skeleton on detail page tabs
- **File**: `src/pages/leads/LeadDetail.tsx`
- **Problem**: Switching tabs shows blank content for 1-2 seconds while data loads
- **Fix**: Add skeleton/spinner per tab while data is fetching

### 8. Empty pipeline shows no guidance
- **File**: `src/pages/leads/LeadsPipeline.tsx`
- **Problem**: Empty columns show nothing — new user thinks the feature is broken
- **Fix**: Add empty state with prompt like "No leads in this stage. Drag leads here or add from the Leads list."

### 9. Export capped at 1000 with no warning
- **File**: `src/pages/leads/LeadsExport.tsx`
- **Problem**: `limit: 1000` hardcoded — silently truncates large exports
- **Fix**: Show warning if total leads exceeds 1000, or paginate the export

### 10. "Mark Complete" on follow-ups overwrites description
- **File**: `src/pages/leads/LeadsFollowups.tsx` ~line 188
- **Problem**: Completion writes `description: 'Completed follow-up'` — destroys original description
- **Fix**: Update status field only, preserve description

---

## Decision-Required Fixes

### 11. Search debounce
- **Decision**: **300ms debounce**, trigger at 1+ characters
- **File**: `src/pages/leads/LeadsList.tsx` ~line 575
- **Problem**: Every keystroke fires an API call (typing "mitchell" = 8 requests)
- **Fix**: Add 300ms debounce on `setSearchQuery`. Use a `debouncedSearchQuery` for the query key, keep instant UI feedback on the input.

### 12. Filter state persistence via URL params
- **Decision**: **URL query params** (`/leads?status=NEW&score=60-100`)
- **Files**: `src/pages/leads/LeadsList.tsx`, routing
- **Problem**: Navigating to lead detail and back resets all filters; refresh loses everything
- **Fix**: Sync all filter state (status, source, score range, date range, tags, assignedTo, search, page, sort) to URL query params. Read from URL on mount. Update URL on filter change. Back navigation and refresh both preserve filters. URLs become shareable/bookmarkable.

### 13. Stats cards show filtered vs. total context
- **Decision**: **Show both** — "5 of 76 leads", "3 of 21 qualified"
- **File**: `src/pages/leads/list/LeadStatsCards.tsx`, `src/pages/leads/LeadsList.tsx`
- **Problem**: Stats show global totals regardless of active filters — disconnected from what's on screen
- **Fix**: Fetch global stats separately (one call, cached). Display filtered count alongside global: "Showing X of Y". When no filters active, just show the total.

### 14. Multi-status/source API filtering
- **Decision**: **Backend supports comma-separated values** (`?status=NEW,CONTACTED`)
- **Files**: `backend/src/controllers/lead.controller.ts`, `src/pages/leads/LeadsList.tsx` ~line 117
- **Problem**: Frontend UI allows multi-select but only sends `filters.status[0]` to the API. Backend only accepts single value.
- **Fix**:
  - Backend: Parse comma-separated status/source params into arrays, use Prisma `in` clause
  - Frontend: Send `params.status = filters.status.join(',')` instead of `filters.status[0]`

### 15. Follow-ups page uses Tasks API (hybrid approach)
- **Decision**: **Hybrid** — show tasks filtered by `leadId IS NOT NULL`, with quick follow-up creation flow
- **Files**: `src/pages/leads/LeadsFollowups.tsx`, possibly `backend/src/routes/task.routes.ts`
- **Problem**: Follow-ups page fakes scheduled items from activities. Shows `createdAt` as follow-up date. 100+ real tasks exist in DB but aren't used.
- **Fix**:
  - Fetch from `/api/tasks?hasLead=true` instead of `/api/activities`
  - Show task `dueDate` as the follow-up date
  - "Mark Complete" updates task status to `COMPLETED`
  - "Add Follow-up" creates a real task linked to a lead
  - Filter tabs (Overdue/Today/This Week) filter by `dueDate`
  - Preserve existing quick-follow-up creation UX

### 16. Pipeline ↔ status: independent with optional prompt
- **Decision**: **Mix of B and C** — status and pipeline stage are independent concepts, but offer a prompt when relevant
- **Files**: `src/pages/leads/LeadsPipeline.tsx`, `src/pages/leads/LeadDetail.tsx`, `backend/src/controllers/lead.controller.ts`
- **Problem**: Status and pipeline stage have no relationship. Changing one doesn't affect the other.
- **Fix**:
  - Keep them independent by default (a lead can be "CONTACTED" in any pipeline stage)
  - When dragging to a win/lost stage in pipeline → prompt "Also update lead status to WON/LOST?"
  - When changing status to WON/LOST on detail page → prompt "Also move to [Win/Lost] pipeline stage?"
  - No auto-sync for intermediate statuses (they don't map 1:1)

### 17. Bulk pipeline assignment from both entry points
- **Decision**: **Both list and pipeline views** (as long as not redundant)
- **Files**: `src/pages/leads/LeadsList.tsx` (bulk actions), `src/pages/leads/LeadsPipeline.tsx`
- **Fix**:
  - **Leads List**: Add "Add to Pipeline" to bulk actions menu → modal with pipeline + stage dropdowns → updates selected leads
  - **Pipeline View**: Add "+" button per stage column → opens search/select modal to pick existing leads → assigns them to that pipeline + stage
  - Not redundant: list view is for "I selected 20 leads, put them somewhere" and pipeline view is for "I'm looking at this stage and want to add to it"

### 18. Lead scoring — implement with available factors, expand later
- **Decision**: **Start with what's available now**, expand as more data sources come online
- **Files**: `backend/src/services/` (scoring service), `backend/src/controllers/lead.controller.ts`
- **Current problem**: Avg score is 24/100, 67% of leads score 0-25. Scoring is too conservative or not using enough signals.
- **Fix — Phase 1 (now)**:
  - Score factors from existing data:
    - Has email: +5
    - Has phone: +5
    - Has company: +5
    - Has deal value set: +10
    - Deal value > $500k: +5
    - Has property preferences (propertyType, budget, beds/baths): +5 each (up to 15)
    - Has been contacted (lastContactAt not null): +10
    - Contacted in last 7 days: +5
    - Contacted in last 30 days: +3
    - Has notes: +5
    - Has activities (>5): +5, (>10): +10
    - Status progression: NEW=0, CONTACTED=+5, QUALIFIED=+10, PROPOSAL=+15, NEGOTIATION=+20
    - Has tags: +3
    - Email opt-in: +2
    - SMS opt-in: +2
  - Auto-recalculate: on status change, on note/activity creation, nightly batch job
  - Max score: 100 (normalize if factors exceed)
- **Phase 2 (later)**: Add email open/click rates, call outcomes, response time, campaign engagement, property match scoring

### 19. Import wizard — pipeline assignment step
- **Decision**: **Add a step in the wizard** between duplicate check and results
- **File**: `src/pages/leads/LeadsImport.tsx`, `backend/src/controllers/lead.controller.ts` (import handler)
- **Problem**: Imported leads never get `pipelineId` or `pipelineStageId`, so they never appear in Pipeline view
- **Fix**: Add Step 3.5 "Pipeline Assignment" (optional):
  - Dropdown: "Assign to pipeline" (default: None / Skip)
  - If pipeline selected → dropdown: "Starting stage" (defaults to first stage)
  - All imported leads get the selected pipeline + stage
  - Step is skippable

### 20. Edit modal with sectioned tabs
- **Decision**: **Tabbed modal** — "Basic Info" / "Real Estate" / "Address"
- **File**: `src/pages/leads/list/LeadModals.tsx` (EditLeadModal)
- **Problem**: Edit modal is missing address fields and all real-estate specific fields (propertyType, budget, beds/baths, pre-approval, timeline, desired location)
- **Fix**:
  - Tab 1 — Basic Info: First Name, Last Name, Email, Phone, Company, Job Title, Deal Value, Status, Source
  - Tab 2 — Real Estate: Property Type, Transaction Type, Budget Min/Max, Pre-Approval Status, Move-In Timeline, Desired Location, Min Beds, Min Baths
  - Tab 3 — Address: Street, City, State, ZIP, Country

### 21. Single export button with format dropdown
- **Decision**: **One "Export" button with format picker**
- **File**: `src/pages/leads/LeadsExport.tsx`
- **Problem**: 4 confusing export buttons ("Professional Excel", "Spreadsheet CSV", "CSV", "JSON") with misleading behavior
- **Fix**:
  - Single "Export Leads" button
  - Format dropdown: Excel (.xlsx), CSV (.csv), JSON (.json)
  - Remove "Spreadsheet CSV" entirely
  - Excel option uses server-side export if available, falls back to CSV with BOM
  - Keep filter options (status, assigned, date range) and field selection above the button

### 22. Full activity/timeline logging for all actions
- **Decision**: **Log all action types**
- **Files**: `backend/src/controllers/` (all controllers that touch leads), `backend/src/services/` (activity logging service)
- **Problem**: Only status changes are logged as activities. Timeline is useless with just "Lead status changed" entries.
- **Fix**: Create activity records for:
  - Email sent / received
  - Call logged (with outcome)
  - Note created / edited / deleted
  - Task created / completed
  - Document uploaded / deleted
  - Pipeline stage changed
  - Lead score changed (significant changes, e.g., >5 points)
  - Tag added / removed
  - Lead assigned / reassigned
  - Lead merged
  - Lead imported
- Each activity record includes: `type`, `title`, `description`, `userId`, `leadId`, `metadata` (JSON with details)

---

## Implementation Order

### Wave 1 — Quick fixes (no architectural changes)
1. Fix sort field mapping
2. Add search debounce (300ms)
3. Reset page to 1 on search/filter change
4. Remove client-side double filtering
5. Fix merge field name mismatch
6. Add budget min/max validation
7. Wrap Excel export in try/catch
8. Fix "Mark Complete" to update status not description
9. Add export count warning
10. Add empty state to pipeline columns

### Wave 2 — Filter & stats improvements
11. Sync filters to URL query params
12. Stats cards show "X of Y" context
13. Backend multi-status/source filter support
14. Single export button with format dropdown
15. Edit modal with tabs (Basic/RE/Address)

### Wave 3 — System integration
16. Follow-ups page → Tasks API (hybrid)
17. Bulk pipeline assignment (list + pipeline views)
18. Import wizard pipeline step
19. Pipeline ↔ status prompt on win/lost

### Wave 4 — Scoring & timeline
20. Lead scoring algorithm (Phase 1 factors)
21. Full activity logging across all controllers
22. Loading skeletons on detail page tabs
