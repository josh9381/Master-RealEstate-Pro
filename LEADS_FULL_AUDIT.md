# Leads Tab — Full Code + UI/UX Audit

**Date:** 2026-03-13  
**Scope:** All Leads pages, subpages, modals, previews, and shared components  
**Files audited:** ~10,090 lines across 18 files

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [LeadsList (Main Hub)](#1-leadslist-main-hub)
3. [LeadsTable & LeadsGrid](#2-leadstable--leadsgrid)
4. [LeadModals (6 modals)](#3-leadmodals)
5. [LeadDetail](#4-leaddetail)
6. [LeadCreate](#5-leadcreate)
7. [LeadsPipeline](#6-leadspipeline)
8. [LeadsFollowups](#7-leadsfollowups)
9. [LeadsImport](#8-leadsimport)
10. [LeadsExport](#9-leadsexport)
11. [LeadHistory](#10-leadhistory)
12. [LeadsMerge](#11-leadsmerge)
13. [Stats, Charts & SubNav](#12-stats-charts--subnav)
14. [Cross-Cutting Issues](#13-cross-cutting-issues)
15. [Prioritized Action Items](#14-prioritized-action-items)

---

## Executive Summary

The Leads tab is a mature, feature-rich module (~10K lines) with solid architecture: server-side pagination, URL-persisted filters, bulk operations, AI integration, and 9 dedicated subpages. Previous audits (LEADS_TAB_FIXES.md, LEADS_UI_AUDIT.md) already catalogued 37 issues. This audit covers **new findings** not addressed previously, focused on code quality and user experience.

### Severity Legend
- 🔴 **Critical** — Broken functionality or data loss risk
- 🟠 **High** — Significant UX degradation or code defect
- 🟡 **Medium** — Usability friction or maintainability concern
- 🟢 **Low** — Polish, cosmetic, or nice-to-have

---

## 1. LeadsList (Main Hub)

**File:** `src/pages/leads/LeadsList.tsx` (~620 lines)

### Code Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 1.1 | 🟠 | **Excessive state in one component** | 25+ `useState` calls. Bulk-action state (email subject/body, tags, status, assign user, pipeline) should live in the modal components, not the parent. This causes unnecessary re-renders of the entire list on every keystroke in any modal. |
| 1.2 | 🟡 | **Score filter is client-side only** | `scoreFilter` (ALL/HOT/WARM/COOL/COLD) filters after the server returns data, meaning pagination counts are wrong when this filter is active. Should be passed as a query param. |
| 1.3 | 🟡 | **Dual sort logic (server + client)** | `filteredAndSortedLeads` has both server-side and client-side sort paths. When pagination comes from the server, sorting is already done server-side, but the client-side sort code still exists as dead code in that branch. |
| 1.4 | 🟡 | **`handleRemoveChip` doesn't actually update filters** | Removing an active filter chip only removes it from the `activeFilterChips` display array — it does NOT update the underlying `filters` state. The filter still applies. User thinks they removed a filter but it's still active. |
| 1.5 | 🟢 | **Missing loading state for SubNav** | When navigating to LeadsList, the SubNav is not rendered during loading skeleton. User sees a flash of content shift when data arrives. |

### UX Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 1.6 | 🟠 | **No empty state for zero leads** | When there are no leads at all (new account), users see an empty table with no guidance. Should show an onboarding CTA ("Import your first leads" or "Create your first lead"). |
| 1.7 | 🟡 | **Search + filter change doesn't communicate loading** | When typing in search, there's a 300ms debounce but no visual indicator that the list is updating. Users may think nothing happened. Need a subtle loading indicator on the search input or table. |
| 1.8 | 🟡 | **Bulk action bar is always rendered** | `BulkActionsBar` renders even with 0 selected leads. It should appear only when `selectedLeads.length > 0` (or be visually hidden), reducing visual clutter. |
| 1.9 | 🟡 | **View mode toggle not persisted** | Switching between table/grid resets on page reload. Should persist to localStorage. |


---

## 2. LeadsTable & LeadsGrid

**Files:** `src/pages/leads/list/LeadsTable.tsx` (~600 lines), `LeadsGrid.tsx` (~350 lines)

### Code Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 2.1 | 🟠 | **Row menu uses absolute positioning without portal** | The `RowMenu` dropdown (`position: absolute`) can be clipped by table overflow or card boundaries. Should use a portal or a library like Radix/Headless UI for proper drop-down positioning. |
| 2.2 | 🟡 | **`onKeyPress` is deprecated** | Quick-note input uses `onKeyPress` which is deprecated. Should use `onKeyDown` instead. |
| 2.3 | 🟡 | **Checkbox "select all" only selects current page** | The "select all" checkbox selects only the visible page of leads but the bulk action bar says "X leads selected"— users may think they're acting on all matching leads. Should clarify "X of Y selected" or offer "Select all matching leads". |
| 2.4 | 🟡 | **Duplicate RowMenu close logic** | Both `LeadsTable` and `LeadsGrid` independently implement click-outside logic for `RowMenu`. This should be encapsulated in the `RowMenu` component itself. |
| 2.5 | 🟢 | **Tags show max 2 + count** | Grid cards show all tags without a cap, but table shows max 2. Inconsistent between views. |

### UX Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|

| 2.7 | 🟡 | **Row menu opens in wrong direction at bottom of table** | When clicking the action menu on the last rows, the dropdown opens below the button and can go off-screen. Needs boundary-aware positioning. |
| 2.8 | 🟡 | **Expanded row activity shows same data for all rows** | `expandedActivitiesData` is keyed to `expandedRow`, but if you expand row A, then row B, row B shows row A's cached activity data until the new query resolves. |
| 2.9 | 🟡 | **Grid view has no sorting** | Grid view doesn't expose sort controls. Users lose sorting ability when switching to grid. |
| 2.10 | 🟢 | **No hover state preview** | Unlike modern CRMs, hovering over a lead doesn't show a quick-preview tooltip with key info (score, last contact, next action). |

---

## 3. LeadModals

**File:** `src/pages/leads/list/LeadModals.tsx` (~1000 lines)

### Code Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 3.1 | 🔴 | **All modals use custom overlay without focus trap** | Modals use a `<div className="fixed inset-0 ...">` with `onKeyDown` for Escape, but there's **no focus trap**. Users can Tab to elements behind the modal. This is a WCAG 2.1 violation (2.4.3 Focus Order). |
| 3.2 | 🟠 | **Edit modal spreads entire Lead object via `onLeadChange`** | Every field change in the Edit modal calls `onLeadChange({...editingLead, field: value})`, creating a new object on every keystroke. With 40+ fields on the Lead type, this is wasteful. Should use field-level updates or `useReducer`. |
| 3.3 | 🟠 | **No confirmation before closing modals with unsaved changes** | Clicking outside or pressing Escape closes the Edit modal immediately, losing all edits. Should prompt "Discard changes?" if the form is dirty. |
| 3.4 | 🟡 | **Native `<select>` elements throughout** | Status, Source, Assigned To, Pipeline dropdowns all use native `<select>` elements. These can't be styled consistently across browsers and don't support search/filter for long lists (e.g., team members). |
| 3.5 | 🟡 | **Mass email sends sequentially via `Promise.allSettled`** | Each selected lead gets an individual API call. For 100+ leads this could take minutes and might hit rate limits. Should use a backend bulk-email endpoint. |
| 3.6 | 🟡 | **Tags modal: hardcoded tag list** | The 6 preset tags ('Hot Lead', 'Enterprise', 'VIP', etc.) are hardcoded. There's no API call to fetch existing tags. Users can't see or reuse tags they've previously created. |
| 3.7 | 🟢 | **Bulk delete has no undo** | Deleting leads is permanent. Consider a soft-delete or undo mechanism. |

### UX Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|

| 3.9 | 🟡 | **Email template preview** | Selecting a template fills subject/body but there's no visual preview of what the email will look like with merge tags expanded. |
| 3.10 | 🟡 | **Status modal lacks visual status progression** | The status dropdown is a plain `<select>`. A visual pipeline-style selector (New → Contacted → Qualified → ...) would make the status flow clearer. |
| 3.11 | 🟡 | **No loading/success state for bulk actions** | After clicking "Apply Tags" or "Update Status", the modal closes immediately. There's no loading spinner during the API call or success animation. If the mutation fails, the user already closed the modal. |

---

## 4. LeadDetail

**File:** `src/pages/leads/LeadDetail.tsx` (~800+ lines)

### Code Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 4.1 | 🟠 | **`window.confirm` used for pipeline stage prompts** | When changing status to WON/LOST, `window.confirm()` is used. This blocks the thread, can't be styled, and breaks in non-browser environments. Should use the existing `useConfirm` hook. |
| 4.2 | 🟠 | **AI insights load in `useEffect` without cleanup** | The `loadAIInsights` async function runs in a `useEffect` but doesn't handle component unmounting. If user navigates away mid-load, state updates on unmounted component cause memory leaks and React warnings. |
| 4.3 | 🟡 | **Duplicate edit/validation logic** | `handleEditLead`, `validateEditForm`, and `handleSaveEdit` in LeadDetail duplicate nearly identical logic from LeadsList's edit flow. Should share a single `useLeadEditForm` hook. |
| 4.4 | 🟡 | **Note author display logic is overly complex** | Lines 900-940 have a deeply nested ternary chain to display the note author. Should be extracted to a helper function. |
| 4.5 | 🟡 | **Documents tab: `apiBase` construction is fragile** | `const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || ''` — this assumes the API URL ends with `/api`. If the env var is different (e.g., `/v1/api`), the download links break. |
| 4.6 | 🟢 | **Inline `onClick` async handler for AI Enrich** | The "AI Enrich" button has a large inline async handler (~15 lines). Should be extracted to a named function for readability. |

### UX Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|

| 4.8 | 🟠 | **No breadcrumb or context** | Users navigating directly to `/leads/123` see the lead name but have no breadcrumb showing they're in Leads > Lead Detail. The "Back to Leads" button is the only way back. |
| 4.9 | 🟡 | **Delete button is too prominent** | The Delete button sits next to Edit in the header actions. Accidental clicks are easy. Should require a destructive confirmation or be moved to a "..." menu. |
| 4.10 | 🟡 | **Score ring animation is static** | The SVG score ring is a static render. A brief fill animation on load would draw attention to the score. |
| 4.11 | 🟡 | **Real estate details card hidden when empty** | The RE details card only renders if any RE field exists. New leads show no indication that RE data *can* be added. Should show the card with "No real estate details — Edit to add" prompt. |
| 4.12 | 🟡 | **Quick actions: two "Phone" buttons** | "Call" and "Log Call" both show the same Phone icon. Visually confusing. "Log Call" should use a different icon (e.g., PhoneCall or ClipboardList). |
| 4.13 | 🟢 | **"AI-powered" sparkle text on buttons** | "✨ AI-powered" text on Email/SMS buttons uses a plain emoji. Should use a consistent Sparkles icon component. |

---

## 5. LeadCreate

**File:** `src/pages/leads/LeadCreate.tsx` (~350 lines)

### Code Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 5.1 | 🟡 | **No duplicate detection before create** | Creating a lead with an existing email succeeds without warning. Should check for duplicates before submission (the import page already has this capability). |
| 5.2 | 🟡 | **Budget fields use native `<input type="number">`** | Number inputs allow negative values and scientific notation (e.g., "1e5"). Should validate for positive integers/decimals only. |
| 5.3 | 🟢 | **No auto-save or draft** | Long forms get lost if user navigates away accidentally. Consider auto-saving to sessionStorage. |

### UX Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 5.4 | 🟠 | **Form resets silently on navigation** | Clicking a SubNav link (e.g., "Pipeline") while filling out the create form navigates away without warning. All data is lost. |
| 5.5 | 🟡 | **Sidebar summary is not sticky** | The right sidebar (with Source, Status, Tags, Assigned To) scrolls with the page. On long forms it should be `sticky top-6` so it's always visible. |
| 5.6 | 🟡 | **Collapsed sections don't indicate content** | Real Estate and Address sections are collapsed by default. There's no visual cue when they contain data (e.g., a check mark or filled indicator). |
| 5.7 | 🟢 | **"Add a new lead to your pipeline" subtitle** | The subtitle says "pipeline" but the create form doesn't have a pipeline assignment step. Misleading copy. |

---

## 6. LeadsPipeline

**File:** `src/pages/leads/LeadsPipeline.tsx` (~400 lines)

### Code Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 6.1 | 🔴 | **`setTimeout(() => setSelectedPipelineId(...), 0)` in render** | Setting state via setTimeout during render is a React anti-pattern that can cause infinite re-render loops. Should use `useEffect` for auto-selecting the first pipeline. |
| 6.2 | 🟠 | **`window.confirm` for status sync on specialized pipelines** | When dropping a lead on a Win/Lost stage, `window.confirm()` blocks the UI. Should use the `useConfirm` hook like other parts of the app. |
| 6.3 | 🟠 | **Status sync errors fail silently** | Multiple `catch { /* status sync failed silently */ }` blocks. If lead status fails to update, the pipeline view shows the lead in the new stage but the status is stale. User has no awareness of the failure. |

| 6.5 | 🟡 | **Fallback grouping logic is duplicated** | The stage-to-status mapping (`stageToStatuses` and `stageToStatus`) is defined twice with slightly different structures. Should be a shared constant. |

### UX Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 6.6 | 🟠 | **No stage deal value totals visible without hover** | Total pipeline value per stage is computed but only shown in a compact format. Key metric should be more prominent. |
| 6.7 | 🟡 | **Pipeline dropdown lacks visual hierarchy** | Multiple pipelines are listed as plain text buttons. Active pipeline should be visually distinct (e.g., checkmark, bold, accent color). |
| 6.8 | 🟡 | **No horizontal scroll indicator for many stages** | Pipelines with 7+ stages overflow horizontally. No scroll indicator or arrow buttons guide users. |
| 6.9 | 🟡 | **"Add Lead" to stage requires 2+ chars search** | The modal only searches when `leadSearchQuery.length >= 2`. Users must type before seeing any leads, even if there are only a few. Should show recent leads by default. |
| 6.10 | 🟢 | **Lead cards are very compact** | Pipeline lead cards show name, score, and value but not status, source, or last contact date — info that's useful for pipeline management. |

---

## 7. LeadsFollowups

**File:** `src/pages/leads/LeadsFollowups.tsx` (~450 lines)

### Code Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 7.1 | 🟡 | **Heavy data fetching on load** | Fetches ALL tasks (limit: 100) + ALL leads (limit: 200) on every render to join them client-side. This is expensive and should be a single server-side query with lead data joined. |
| 7.2 | 🟡 | **Validation rejects same-day follow-ups** | `scheduledDate <= new Date()` rejects follow-ups scheduled for later today if the time has already passed by seconds during form fill. Should compare only the date portion. |
| 7.3 | 🟢 | **No recurring follow-ups** | Users can only create one-off follow-ups. Recurring follow-ups (e.g., every week) are a common CRM need. |

### UX Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 7.4 | 🟠 | **Overdue follow-ups have no notification/alert** | Overdue items only show a red badge. There's no browser notification, email alert, or prominent banner saying "You have X overdue follow-ups". |
| 7.5 | 🟡 | **Filter tabs don't show count for "This Week"** | "Overdue" and "Today" show badge counts, but "This Week" doesn't. Inconsistent. |
| 7.6 | 🟡 | **No calendar/timeline view** | All follow-ups are listed as cards. A calendar or timeline visualization would help users see scheduling density and conflicts. |
| 7.7 | 🟢 | **Lead search in Add modal not debounced** | No issue currently with small data, but at scale the lead dropdown could stutter. |

---

## 8. LeadsImport

**File:** `src/pages/leads/LeadsImport.tsx` (~500 lines)

### Code Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 8.1 | 🟡 | **File validation accepts .vcf but no vCard parsing exists** | `ACCEPTED_EXTENSIONS` includes `.vcf` but there's no indication the backend handles vCard parsing. Users can upload .vcf files that may silently fail. |
| 8.2 | 🟡 | **No progress indicator for large file uploads** | The `loading` state shows a generic spinner. For 10MB files, there's no upload progress bar. |
| 8.3 | 🟢 | **Pipeline assignment step is optional without guidance** | The pipeline step exists in the wizard but users may not understand its purpose. A tooltip explaining "Assign imported leads to a pipeline stage" would help. |

### UX Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 8.4 | 🟡 | **Column mapping has no auto-detection feedback** | The backend returns `suggestedMappings` but it's unclear to users which mappings were auto-detected vs. manual. Should visually distinguish auto-mapped columns. |
| 8.5 | 🟡 | **No sample file download** | Users unfamiliar with the expected format have no way to download a CSV template. |
| 8.6 | 🟢 | **Duplicate action explanation is technical** | "Skip", "Overwrite", "Create" options have no tooltips explaining what each does in plain language. |

---

## 9. LeadsExport

**File:** `src/pages/leads/LeadsExport.tsx` (~400 lines)

### Code Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 9.1 | 🟡 | **Excel export falls back to CSV** | Format selector shows "Excel (.xlsx)" but the actual export is CSV. There's no XLSX generation library. The file is named `.csv` not `.xlsx`. Users expecting an actual Excel file get a CSV. |
| 9.2 | 🟡 | **Export limit hardcoded to 1000** | `const EXPORT_LIMIT = 1000` — users with 5000+ leads can only export the first 1000 with no warning. Should paginate through all results or warn about the limit. |
| 9.3 | 🟢 | **JSON export doesn't respect field selection** | The `selectedFields` filter only applies to CSV export. JSON export dumps the full lead objects regardless of field selection. |

### UX Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 9.4 | 🟡 | **No export preview** | Users can't see what the exported data will look like before downloading. A preview table of the first 5 rows would build confidence. |
| 9.5 | 🟢 | **Export history is in-memory only** | The `exportHistory` state resets on page reload. Users can't see past exports. |

---

## 10. LeadHistory

**File:** `src/pages/leads/LeadHistory.tsx` (~400 lines)

### Code Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 10.1 | 🟡 | **Client-side filtering applied to paged data** | Activity filter by category (status/email/sms/etc.) is applied client-side to the current page only. If page 1 has mostly email activities and user filters to "Calls", they see nothing — but calls may exist on other pages. Should be a server-side filter. |
| 10.2 | 🟢 | **No date range filter** | Users can filter by type but not by date range. Useful for investigating "what happened last week". |

### UX Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 10.3 | 🟡 | **Timeline icons are small at 12×12** | The colored circles with icons are `h-12 w-12` which is good, but inner icons at `h-6 w-6` can be hard to distinguish at a glance. |
| 10.4 | 🟡 | **No lead name linking** | Activity descriptions mention lead names but they're not clickable links to the lead detail page. |


---

## 11. LeadsMerge

**File:** `src/pages/leads/LeadsMerge.tsx` (~450 lines)

### Code Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 11.1 | 🟡 | **Query key doesn't match invalidation** | `queryKey: ['lead-duplicates', mergeSettings]` but invalidation uses `['lead-duplicates']` (without mergeSettings). May cause stale data after merging. |
| 11.2 | 🟡 | **Merge settings trigger automatic re-scan** | Changing any checkbox (matchEmail, matchPhone, etc.) immediately fires the query due to `mergeSettings` being in the queryKey. Should require explicit "Run Scan" button click. |
| 11.3 | 🟢 | **"Auto-Merged: Coming Soon" placeholder** | The auto-merge stat card shows "Coming Soon" which looks unfinished. Either implement or remove. |

### UX Issues

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 11.4 | 🟡 | **Field-by-field selection is tedious for 19 fields** | Each merge requires selecting primary/secondary for 19 fields. Should have "Use all from Lead A" / "Use all from Lead B" quick buttons. |
| 11.5 | 🟡 | **No preview of merged result** | Before confirming merge, users can't see what the final merged lead will look like. |
| 11.6 | 🟢 | **Similarity threshold slider has no visual breakpoints** | The range slider from 50–100% has no tick marks or labeled thresholds. |

---

## 12. Stats, Charts & SubNav

### LeadStatsCards
| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 12.1 | 🟡 | **"Conversion Rate" uses total as denominator** | Conversion = WON / total. But "total" includes won + lost + new + contacted leads. Industry standard is WON / (WON + LOST). Current metric is always misleadingly low. |
| 12.2 | 🟢 | **Stats don't animate on change** | When filters change, numbers jump instantly. A count-up animation would feel more polished. |

### LeadCharts
| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 12.3 | 🟡 | **Chart data computed from current page only** | `sourceData` and `scoreData` are computed from `leads` (the current page), not all leads. With pagination, charts show distribution of 25 leads, not the full database. Misleading. |
| 12.4 | 🟡 | **Score distribution starts at 60** | Score ranges are `60-70, 71-80, 81-90, 91-100`. Leads scoring 0–59 are all bucketed into `60-70`, giving wrong counts. |
| 12.5 | 🟢 | **No chart interactivity** | Clicking a bar in the source chart could filter leads by that source. Currently charts are display-only. |

### LeadsSubNav
| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 12.6 | 🟢 | **Active state comparison uses `startsWith`** | `/leads/history` would also match if a route like `/leads/historyV2` were added. Minor but worth noting. |

---

## 13. Cross-Cutting Issues

### Accessibility (A11y)

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 13.1 | 🔴 | **No focus trap in any modal** | All 6+ modals (MassEmail, Tags, Status, Assign, Delete, Edit, Pipeline, AddFollowup, LogCall, AddLead) lack focus trapping. This is a WCAG 2.1 Level A violation. |

| 13.3 | 🟠 | **Native `<select>` elements are inconsistent** | Some dropdowns use custom styled components, others use native `<select>`. Screen readers handle both but the experience is inconsistent. |
| 13.4 | 🟡 | **Color-only status indicators** | Score badges and status badges rely on color alone. Users with color-vision deficiency may not distinguish Hot (green) from Cold (gray). Need text labels or patterns. |
| 13.5 | 🟡 | **Missing `aria-label` on icon-only buttons** | Most icon-only buttons have `aria-label` (good!), but some (e.g., chart toggle, pipeline dropdown) are missing them. |

### Performance

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 13.6 | 🟡 | **LeadsList re-renders on every modal keystroke** | Since modal state (email body, tags, etc.) lives in the parent `LeadsList`, typing in a modal re-renders the entire lead list. With 25+ rows and charts, this causes jank on slower devices. |
| 13.7 | 🟡 | **No virtualization for large lists** | Both table and grid render all `pageSize` items. With page sizes of 50-100, DOM nodes could be significant. Consider `react-window` or `@tanstack/react-virtual` for table rows. |
| 13.8 | 🟢 | **Chart library loaded eagerly** | Recharts is imported at the top level. For users who never scroll to the charts section, this is wasted bundle. Consider lazy loading. |

### Consistency

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 13.9 | 🟡 | **Inconsistent toast messages** | Some actions say "successfully" (e.g., "Lead deleted successfully"), others don't (e.g., "Filters applied"). Tone should be uniform. |
| 13.10 | 🟡 | **Inconsistent ID types** | Lead IDs are `number` in some places, `string` in others. Pipeline IDs are always `string`. Bulk operations require `String(id)` conversions scattered throughout. Should standardize. |
| 13.11 | 🟡 | **Mixed casing for status values** | Status is stored as UPPERCASE in the backend (WON, LOST) but displayed as lowercase in `<select>` options (won, lost). The `.toUpperCase()` conversion before API calls is a common source of bugs. |

### Data Integrity

| # | Sev | Issue | Detail |
|---|-----|-------|--------|
| 13.12 | 🟠 | **Optimistic updates in pipeline don't roll back fully** | The optimistic update in `moveLead` updates the `queryClient` cache, but on error only `invalidateQueries` is called. Between the error and re-fetch, the UI shows stale data. Should restore the previous cache state. |
| 13.13 | 🟡 | **Mass email doesn't handle partial failures** | `Promise.allSettled` is used but all results show "Email sent to X leads!" regardless. Should report "Sent to X, failed for Y". |

---

## 14. Prioritized Action Items

### 🔴 Critical (Fix Immediately)

1. **Add focus trapping to ALL modals** (3.1, 13.1) — Use `<FocusTrap>` or Radix Dialog. this is an accessibility blocker.
2. **Remove `setTimeout` state update in render** (6.1) — Move pipeline auto-select into `useEffect`.

### 🟠 High (Fix This Sprint)

3. **Lift modal state out of LeadsList** (1.1, 13.6) — Move email/tags/status/assign state into respective modal components.
4. **Fix filter chip removal to update actual filters** (1.4) — Sync `activeFilterChips` and `filters` state.
5. **Replace `window.confirm` with `useConfirm`** (4.1, 6.2) — 3 occurrences in LeadDetail and LeadsPipeline.
6. **Add empty state for new accounts** (1.6) — Show onboarding CTA when lead count is 0.
7. **Add cleanup to AI insights `useEffect`** (4.2) — Use AbortController or return cleanup function.
8. **Fix score distribution chart buckets** (12.4) — Add 0-59 range.

### 🟡 Medium (Next Sprint)

9. Fix charts to use global stats, not current page data (12.3)
10. Replace native `<select>` with a searchable combobox component (3.4)
11. Send score filter as server-side param (1.2)
12. Add loading indicator during search debounce (1.7)
13. Persist view mode (table/grid) to localStorage (1.9)
14. Unify ID types to string throughout (13.10)
15. Server-side activity filtering for History page (10.1)
16. Export: warn about 1000-record limit or paginate (9.2)
17. Fix conversion rate calculation to WON/(WON+LOST) (12.1)
18. Add "Discard changes?" prompt for dirty modal forms (3.3)
19. Follow-ups: add "This Week" count badge (7.5)
20. Remove duplicate stage-to-status mapping (6.5)
21. Add duplicate detection on lead create (5.1)
22. Report partial mass email failures (13.13)
23. Use portal for RowMenu dropdown (2.1)
24. Fix optimistic update rollback in pipeline (13.12)

### 🟢 Low (Backlog)

25. Auto-save draft on LeadCreate (5.3)
26. Add hover preview for leads (2.10)
27. Add calendar view for follow-ups (7.6)
28. Add download template for import (8.5)
29. Animate stat counters (12.2)
30. Make charts interactive (12.5)
31. Lazy-load Recharts (13.8)
32. Implement recurring follow-ups (7.3)

---

*This audit supersedes LEADS_UI_AUDIT.md and LEADS_TAB_FIXES.md for any overlapping items. Items from those documents that are still outstanding should be cross-referenced with this list.*
