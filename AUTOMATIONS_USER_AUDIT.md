# Automations Tab — User-Focused Audit

**Date:** March 20, 2026  
**Scope:** Complete user experience audit of the Automations tab — navigation, pages, workflows, builder, configuration, accessibility, and end-to-end user journeys.  
**Auditor:** GitHub Copilot  
**Files reviewed:** 10 frontend files, 7 backend files, 3 Prisma models, 1 sidebar, routing config

---

## Table of Contents

1. [Navigation & Information Architecture](#1-navigation--information-architecture)
2. [Page-by-Page UX Audit](#2-page-by-page-ux-audit)
   - 2a. WorkflowsList (`/workflows`)
   - 2b. AutomationRules (`/workflows/automation`)
   - 2c. WorkflowBuilder (`/workflows/builder`)
3. [Component-Level UX Issues](#3-component-level-ux-issues)
4. [User Journey Walkthroughs](#4-user-journey-walkthroughs)
5. [Accessibility Audit](#5-accessibility-audit)
6. [Data & API Integrity](#6-data--api-integrity)
7. [Performance & Responsiveness](#7-performance--responsiveness)
8. [Issue Summary & Priority Matrix](#8-issue-summary--priority-matrix)
9. [Recommendations](#9-recommendations)

---

## 1. Navigation & Information Architecture

### Sidebar Entry
- **Label:** "Automation" (singular) — `Sidebar.tsx:33`
- **Route:** `/workflows`
- **Icon:** `Zap` (lightning bolt)

### Route Structure
| Route | Page | Purpose |
|-------|------|---------|
| `/workflows` | WorkflowsList | Main list of all workflows with stats |
| `/workflows/builder` | WorkflowBuilder | Visual drag-and-drop builder |
| `/workflows/builder?id={id}` | WorkflowBuilder | Edit existing workflow |
| `/workflows/automation` | AutomationRules | Simple rule creator + templates |

### Issues Found

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| NAV-1 | **MEDIUM** | **No sub-navigation between the 3 pages.** Users landing on `/workflows` have no visible way to reach `/workflows/automation` (the Automation Rules page) unless they use the empty state's "Use a Template" card link. There is no tab bar, breadcrumb, or sidebar sub-menu connecting the three pages. | `WorkflowsList.tsx`, `Sidebar.tsx` |
| NAV-2 | **LOW** | **Sidebar label says "Automation" (singular)** but the WorkflowsList page title says "Workflows" and AutomationRules says "Automation Rules". Inconsistent naming across the three surfaces. | `Sidebar.tsx:33`, `WorkflowsList.tsx:171`, `AutomationRules.tsx:472` |
| NAV-3 | **LOW** | **No breadcrumbs.** When inside the builder (`/workflows/builder`), there's no way to navigate back to the list other than the browser back button. | `WorkflowBuilder.tsx` |
| NAV-4 | **MEDIUM** | **AutomationRules and WorkflowsList fetch the same data differently.** Both call `workflowsApi.getWorkflows()` and `workflowsApi.getStats()`, but map data differently, potentially showing different counts to the user visiting both pages. | `WorkflowsList.tsx:57-73`, `AutomationRules.tsx:76-119` |

---

## 2. Page-by-Page UX Audit

### 2a. WorkflowsList (`/workflows`) — Main Workflows Page

**Purpose:** Dashboard showing all workflows with stats and management actions.

#### Positives
- Clean header with gradient icon, clear title and description
- List/grid view toggle with visual button states
- Stats cards with progress bars (Total Workflows, Total Executions, Success Rate, Failed Executions)
- Excellent empty state with 3 quick-start options (Start from Scratch, Use a Template, Follow a Guide)
- Workflow flow preview chips showing trigger → actions chain
- FeatureGate and UsageBadge for subscription enforcement
- Proper confirmation dialog before deletion via `useConfirm()`
- Cannot delete active workflows (good safety check with clear error message)

#### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| WL-1 | **MEDIUM** | **"Follow a Guide" card is locked as "Coming Soon"** with no interactivity. Users see 3 options but only 2 work. This is misleading for new users. | `WorkflowsList.tsx:380-390` |
| WL-2 | **MEDIUM** | **Grid view has no implementation.** The `viewMode` state toggles but grid view renders the same list layout — there's no actual grid rendering path in the JSX (only list rendering). Clicking "Grid" yields no visual change. | `WorkflowsList.tsx:49, 186-197` |
| WL-3 | **LOW** | **Analytics modal shows stale data.** `viewAnalytics()` merges fresh analytics into the workflow object but only updates `executions`, `successRate`, and `lastRunAt` — if the API returns `dailyStats`, they're discarded. The modal itself is not shown in the code visible (the `analyticsWorkflow` state is set but no `<Dialog>` renders it). | `WorkflowsList.tsx:145-163` |
| WL-4 | **LOW** | **No pagination on workflow list.** All workflows load at once. With 50+ workflows this will cause performance issues. | `WorkflowsList.tsx:57` |
| WL-5 | **LOW** | **No search/filter on WorkflowsList.** Unlike AutomationRules which has search + status filter, this page has none. Users with many workflows have no way to find specific ones. | `WorkflowsList.tsx` |

---

### 2b. AutomationRules (`/workflows/automation`) — Simplified Rule Creator

**Purpose:** Quick rule creation with templates and reference sections.

#### Positives
- Simple modal for creating rules (Name, Description, Trigger, Action)
- Debounced search with backend filtering
- Status filters (All/Active/Paused) with server-side filtering
- Sort by Name/Executions/Last Run
- Bulk actions (Activate/Pause/Delete) with confirmation dialog
- CSV export functionality
- 6 pre-built templates with "Use Template" buttons
- Reference sections showing all 10 triggers and 8 actions
- Recent Executions feed at the bottom
- Good empty states (context-aware: changes message if search/filter active)
- Pro Tips banner shown when user has 1-2 rules (progressive disclosure)

#### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| AR-1 | **HIGH** | **Create Rule modal creates rule as immediately active.** The `createRule()` function sends `isActive: true` without any confirmation or waiting for user to configure details. A real-estate agent could accidentally trigger email sends to leads the moment they create a basic rule. | `AutomationRules.tsx:277` |
| AR-2 | **MEDIUM** | **Create Rule modal only allows ONE action.** The modal uses a single `<select>` for action type, but workflows support multiple actions. The modal doesn't communicate this limitation or guide users to the builder for multi-step workflows (there's a small text link at the bottom, but it's easy to miss). | `AutomationRules.tsx:437-455` |
| AR-3 | **MEDIUM** | **Sort state resets data via local override.** `handleSort()` sets `automationRulesLocal` with client-side sorted data, but this breaks the next refetch because `useEffect` clears `automationRulesLocal` when `rulesData` changes. The sort preference is not persisted. | `AutomationRules.tsx:342-358` |
| AR-4 | **MEDIUM** | **Delete button has no guard against active workflows.** Unlike WorkflowsList which checks `workflow.isActive` before deletion, AutomationRules' `deleteRule()` just opens confirmation and calls API. The backend enforces this, but the user gets a generic "Failed to delete rule" error instead of a clear message. | `AutomationRules.tsx:161-172` |
| AR-5 | **LOW** | **Templates don't actually create workflows with template data.** `applyTemplate()` just opens the Create Modal with a pre-filled name and default trigger/action. The template descriptions promise specific behavior (e.g., "Lead Scoring" → score leads + assign) but the modal only creates a single trigger+action rule. | `AutomationRules.tsx:316-338` |
| AR-6 | **LOW** | **Filter panel requires clicking "Filter" button to show.** The filter UI is hidden by default and toggled via button — no indication of current filter state unless panel is open. | `AutomationRules.tsx:644-672` |
| AR-7 | **LOW** | **"Est. Time Saved" stat is a rough estimate.** Calculated as `successfulExecutions * 2 / 60` (2 minutes per successful execution) — this is hardcoded and may not reflect reality. | `AutomationRules.tsx:114-115` |
| AR-8 | **LOW** | **Select All checkbox doesn't clearly distinguish from "Select All Visible".** If filters are active, "Select All" selects all rules in filtered result but the label just says "Select All". | `AutomationRules.tsx:722-729` |

---

### 2c. WorkflowBuilder (`/workflows/builder`) — Visual Builder

**Purpose:** Full-featured drag-and-drop workflow builder with canvas, component library, test panel, and execution logs.

#### Positives
- Two interaction modes: Drag-and-Drop and Click (good flexibility for different users)
- Mode indicator card clearly explains current mode behavior
- Visual canvas with SVG connection lines between nodes (n8n-style)
- Pan (space + drag) and zoom (scroll wheel) on canvas
- Real-time workflow status indicator (idle/active/paused/running)
- 9 pre-built templates with search and category filter
- Inline validation warnings (checks for triggers, disconnected nodes)
- Auto-arrange button for clean layout
- Per-step execution logs with status icons
- Performance metrics panel
- Retry settings (1-3) and failure notification toggle
- Test panel with sample data input
- Duplicate workflow and export JSON quick actions
- Node delete requires double-click confirmation with 3s timeout (prevents accidents)

#### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| WB-1 | **HIGH** | **Test Run fails for new (unsaved) workflows.** `runTest()` checks if `workflowId` exists from URL params. If user builds a new workflow and clicks "Test Run" before saving, they get `toast.warning('Please save the workflow before testing')`. This is correct behavior, but the "Test Run" button should be disabled or clearly labeled when no workflow ID exists. | `WorkflowBuilder.tsx:559-573` |
| WB-2 | **HIGH** | **No "unsaved changes" warning.** If a user builds a complex workflow with multiple nodes and navigates away (via sidebar, browser back, etc.), all work is silently lost. No `beforeunload` handler or route-change interceptor. | `WorkflowBuilder.tsx` (missing) |
| WB-3 | **MEDIUM** | **NodeConfigPanel is incomplete for several action types.** The `renderActionConfig()` switches on `actionType.includes(...)` but only handles: email, sms, tag, update, task. **Missing config UIs for:** Assign Lead (no user picker), Send Notification (no title/message fields), Add to Campaign (no campaign picker), Update Score (no score input), Webhook (no URL/method/headers). These actions show a blank config panel. | `NodeConfigPanel.tsx:354-530` |
| WB-4 | **MEDIUM** | **Workflow name uses an unstyled Input that looks like plain text.** The `<Input>` for the workflow name has `border-none p-0 h-auto focus-visible:ring-0` making it invisible as an editable field until the user clicks on it. Many users won't realize they can change the name. | `WorkflowBuilder.tsx:614-619` |
| WB-5 | **MEDIUM** | **Save workflow sends undefined `triggerType` for workflows without trigger nodes.** If user only adds action nodes, `saveWorkflow()` sends `triggerType: 'MANUAL'` as fallback. However, unconfigured action nodes send `type: 'UNKNOWN'` which backend rejects. The validation warnings show but don't prevent save. | `WorkflowBuilder.tsx:525-555` |
| WB-6 | **MEDIUM** | **Canvas is not accessible in click mode.** While click mode provides a simpler list layout, the nodes still lack keyboard focus indicators, and there's no way to add/remove/reorder nodes via keyboard alone. | `WorkflowCanvas.tsx:210-260` |
| WB-7 | **LOW** | **Component library hides when config panel opens.** When user clicks "Edit" on a node, the component library disappears and the config panel takes its place. If user wants to add more nodes while configuring, they must close config first. | `WorkflowBuilder.tsx:1093-1095` |
| WB-8 | **LOW** | **Duplicate workflow uses `window.location.search` instead of React router.** After duplicating, it does `window.location.search = '?id=...'` causing a full page reload instead of a smooth SPA navigation. | `WorkflowBuilder.tsx:1187` |
| WB-9 | **LOW** | **Performance metrics panel shows hardcoded "No data yet" text for all 4 metrics** even when `analyticsData` is available. The metrics panel doesn't use `analyticsData` at all. | `WorkflowBuilder.tsx:663-689` |
| WB-10 | **LOW** | **Template import replaces ALL nodes without warning.** If user has built 5 nodes and clicks "Import" on a template, all existing nodes are silently replaced. No confirmation dialog. | `WorkflowBuilder.tsx:600-609` |

---

## 3. Component-Level UX Issues

### WorkflowCanvas (`WorkflowCanvas.tsx`)

| # | Severity | Issue |
|---|----------|-------|
| WC-1 | **MEDIUM** | **Connection lines only draw between consecutive nodes** (node[i] → node[i+1]). If user reorders or has conditional branches, connections won't reflect the actual flow. |
| WC-2 | **LOW** | **No mini-map** for large workflows. Users with 10+ nodes can lose orientation on the canvas. |
| WC-3 | **LOW** | **Canvas minimum height is 600px** but doesn't grow with content. Workflows with many vertically-spaced nodes may overflow without scroll indication in drag mode. |

### WorkflowNode (`WorkflowNode.tsx`)

| # | Severity | Issue |
|---|----------|-------|
| WN-1 | **LOW** | **All action nodes use the same Mail icon** regardless of action type (Send Email, Send SMS, Create Task). Only triggers and tag-related actions have distinct icons. The `getNodeIcon()` function only checks for specific icon names, not action types. |
| WN-2 | **LOW** | **"Configured" indicator shows for ANY config**, even if only defaults. A node with `{ triggerType: 'LEAD_CREATED' }` shows "✓ Configured" even though the user hasn't actually configured anything beyond the default. |

### NodeConfigPanel (`NodeConfigPanel.tsx`)

| # | Severity | Issue |
|---|----------|-------|
| NC-1 | **HIGH** | **5 action types have NO config UI** — when user opens config for Assign Lead, Send Notification, Add to Campaign, Update Score, or Webhook, `renderActionConfig()` returns `null`. The panel shows only the label field and save button with nothing to configure. |
| NC-2 | **MEDIUM** | **Tag config is shared between Add Tag and Remove Tag.** Remove Tag doesn't need a color picker, but the panel shows one since both match `actionType.includes('tag')`. |
| NC-3 | **MEDIUM** | **"Update Lead" config doesn't match backend field names.** The panel uses `updateField`/`updateValue` in config but the backend `UPDATE_LEAD` action expects an `updates` JSON object. This mismatch means configured updates won't execute correctly. |
| NC-4 | **LOW** | **Create Task config uses `taskTitle`/`taskDescription`/`taskDueDate`** but backend expects `title`/`description`/`dueDate`. Field name mismatch. |

### WorkflowComponentLibrary (`WorkflowComponentLibrary.tsx`)

| # | Severity | Issue |
|---|----------|-------|
| CL-1 | **LOW** | **Library height is `calc(100vh - 12rem)`** which doesn't account for the header/status bar area. On smaller screens, the bottom components may be cut off or require excessive scrolling. |

---

## 4. User Journey Walkthroughs

### Journey 1: New User Creates First Automation

1. User clicks "Automation" in sidebar → lands on `/workflows` (WorkflowsList)
2. Sees empty state with 3 options: "Start from Scratch", "Use a Template", "Follow a Guide"
3. "Follow a Guide" is disabled (Coming Soon) — **ISSUE: WL-1**
4. Clicks "Use a Template" → navigated to `/workflows/automation` (AutomationRules)
5. Scrolls down to templates → clicks "Use Template" on "Lead Nurturing"
6. Create Modal opens with name "Lead Nurturing" and defaults → **ISSUE: AR-5** (template doesn't pre-configure the full workflow)
7. Fills in name/description, selects trigger and action
8. Clicks "Create Rule" → rule is immediately active → **ISSUE: AR-1** (no option to create as draft/paused)
9. **Result:** User has a single trigger+action rule running. Functional but underwhelming vs. the template promise.

### Journey 2: Power User Builds Complex Workflow

1. User navigates to `/workflows/builder` (directly or via "Create Workflow" button)
2. Sees getting started guide with 3 options
3. Clicks "Build from Scratch" → component library opens
4. Drags "Lead Created" trigger onto canvas → appears as node
5. Drags "Check Lead Field" condition → SVG connection drawn
6. Clicks condition node → config panel opens (library hides) → **ISSUE: WB-7**
7. Configures condition (field: score, operator: greaterThan, value: 80) → saves
8. Wants to add another node → must close config panel first
9. Drags "Send Notification" action → clicks to configure → **ISSUE: NC-1** (blank config, no fields!)
10. Saves workflow → test button → works (if saved) → **ISSUE: WB-1** (confusing if not saved)
11. Closes tab → all node positions lost if not saved → **ISSUE: WB-2**

### Journey 3: User Wants to Find a Specific Workflow

1. User has 20 workflows and visits `/workflows`
2. No search bar on this page → **ISSUE: WL-5**
3. No way to filter by active/paused or trigger type
4. Must scroll through entire list to find desired workflow
5. Alternatively, visits `/workflows/automation` which has search → different data presentation

### Journey 4: User Manages Workflows in Bulk

1. User visits `/workflows/automation`, sees list of rules
2. Checks several rules via checkboxes
3. Clicks "Delete All" → confirmation dialog
4. Backend rejects active workflows → **ISSUE: AR-4** (error message is generic instead of explaining active workflow constraint)
5. Bulk action only deletes paused ones, warns about active ones ← **GOOD** (fix was applied in previous audit)

---

## 5. Accessibility Audit

### WCAG 2.1 Compliance Issues

| Level | Issue | Location |
|-------|-------|----------|
| **A** | Icon-only buttons (Edit, Delete, Pause, Play) in WorkflowNode lack `aria-label`. Only sr-only text added for Edit/Delete within WorkflowNode, but NOT for actions in WorkflowsList and AutomationRules. | `WorkflowsList.tsx:460-505`, `AutomationRules.tsx:776-820` |
| **A** | Canvas region lacks `role="region"` and `aria-label`. Screen readers cannot identify the canvas area. | `WorkflowCanvas.tsx:211` |
| **A** | Custom `<select>` elements (native HTML) lack `aria-describedby` for error/help text. | `NodeConfigPanel.tsx`, `AutomationRules.tsx` |
| **A** | Bulk action checkbox inputs have no associated `<label>` (the label is a separate element). | `AutomationRules.tsx:722-729` |
| **AA** | No focus management when modals open/close. Focus doesn't trap inside Dialog components. | Throughout |
| **AA** | Space key is hijacked for canvas panning. Users using space to scroll or activate buttons will have unexpected behavior when canvas is focused. Mitigated (checks for input/textarea), but any unfocused state on the page could trigger panning. | `WorkflowCanvas.tsx:54-56` |
| **AA** | Color-only status indicators (green dot = active, gray dot = paused). No text alternative alongside the dot in some places. | `AutomationRules.tsx:996` |
| **AA** | No skip links to jump past the component library or canvas. | `WorkflowBuilder.tsx` |
| **AAA** | Keyboard-only users cannot add/delete/reorder workflow nodes in drag mode. Click mode provides better keyboard access but still has gaps. | `WorkflowCanvas.tsx` |

### What's Already Good
- `<span className="sr-only">` used for Edit/Delete in WorkflowNode component
- Semantic HTML generally used (headings, buttons, lists)
- DOMPurify used for HTML sanitization in email preview
- Disabled button states properly communicated
- Dark mode color contrast appears adequate

---

## 6. Data & API Integrity

### Frontend-Backend Field Mismatches

| Frontend Config Key | Backend Expected Key | Action | Impact |
|--------------------|--------------------|--------|--------|
| `taskTitle` | `title` | CREATE_TASK | Task created with wrong/missing title |
| `taskDescription` | `description` | CREATE_TASK | Task has no description |
| `taskDueDate` | `dueDate` | CREATE_TASK | Due date not set |
| `updateField` + `updateValue` | `updates` (JSON object) | UPDATE_LEAD | Lead update silently fails |
| `tagName` + `tagColor` | `tagName` + `tagColor` | ADD_TAG | ✅ Matches |
| `subject` + `body` | `subject` + `body` | SEND_EMAIL | ✅ Matches |
| `message` | `message` | SEND_SMS | ✅ Matches |
| (no UI) | `userId` | ASSIGN_LEAD | Cannot configure assignee |
| (no UI) | `title` + `message` | SEND_NOTIFICATION | Cannot configure notification |
| (no UI) | `campaignId` | ADD_TO_CAMPAIGN | Cannot select campaign |
| (no UI) | `scoreChange` | UPDATE_SCORE | Cannot set score amount |
| (no UI) | `url` + `method` + `headers` | WEBHOOK | Cannot configure webhook |

### API Response Handling
- Both WorkflowsList and AutomationRules handle multiple response shapes gracefully (`response?.data?.workflows || response?.workflows || Array.isArray(...)`) — **GOOD**
- React Query cache keys properly include search/filter params — **GOOD**
- Optimistic updates in AutomationRules via `automationRulesLocal` — partially good (cleared on refetch)

---

## 7. Performance & Responsiveness

### Current Performance Characteristics
- **Lazy loading:** All 3 pages lazy-loaded via `lazyWithRetry()` — **GOOD**
- **Debounced search:** 300ms debounce on AutomationRules search — **GOOD**
- **Conditional polling:** Execution logs poll every 5s only when panel visible — **GOOD**
- **No pagination:** WorkflowsList and AutomationRules fetch all workflows at once — **ISSUE** at scale

### Mobile/Responsive
- Stats grids use `md:grid-cols-4` → stack on mobile — **GOOD**
- Template grids use `md:grid-cols-3` → stack on mobile — **GOOD**
- Canvas drag mode is not optimized for touch — **ISSUE** (no touch event handlers)
- Bulk action bar may overflow on small screens — **LOW**
- WorkflowBuilder's 3-column layout (`lg:grid-cols-3`) stacks well — **GOOD**

---

## 8. Issue Summary & Priority Matrix

### HIGH Priority (User-Impacting, Should Fix)

| ID | Issue | Page |
|----|-------|------|
| AR-1 | Rules created as immediately active with no draft option | AutomationRules |
| WB-2 | No unsaved changes warning — work can be silently lost | WorkflowBuilder |
| NC-1 | 5 action types have blank config panels (no UI) | NodeConfigPanel |
| WB-1 | Test Run button not disabled for unsaved workflows | WorkflowBuilder |

### MEDIUM Priority (UX Friction)

| ID | Issue | Page |
|----|-------|------|
| NAV-1 | No sub-navigation between the 3 automation pages | All |
| NAV-4 | Two pages fetch same data with different mapping | WorkflowsList, AutomationRules |
| WL-2 | Grid view toggle does nothing (no grid rendering) | WorkflowsList |
| AR-2 | Create modal limits to single action | AutomationRules |
| AR-3 | Sort doesn't persist across refetches | AutomationRules |
| AR-4 | Delete of active rule shows generic error vs clear message | AutomationRules |
| WB-3 | 5 action types missing config fields | NodeConfigPanel |
| WB-4 | Workflow name input looks like plain text | WorkflowBuilder |
| WB-5 | Unconfigured actions send UNKNOWN type to backend | WorkflowBuilder |
| WB-6 | Canvas not keyboard accessible | WorkflowBuilder |
| NC-2 | Remove Tag shows unnecessary color picker | NodeConfigPanel |
| NC-3 | Update Lead config has wrong field names for backend | NodeConfigPanel |
| NC-4 | Create Task config has wrong field names for backend | NodeConfigPanel |
| WC-1 | Connection lines only between consecutive nodes | WorkflowCanvas |

### LOW Priority (Polish)

| ID | Issue | Page |
|----|-------|------|
| NAV-2 | Inconsistent naming (Automation vs Workflows) | Sidebar, Pages |
| NAV-3 | No breadcrumbs in builder | WorkflowBuilder |
| WL-1 | "Follow a Guide" Coming Soon placeholder | WorkflowsList |
| WL-3 | Analytics modal may not render | WorkflowsList |
| WL-4 | No pagination | WorkflowsList |
| WL-5 | No search on WorkflowsList | WorkflowsList |
| AR-5 | Templates don't pre-configure full workflows | AutomationRules |
| AR-6 | Hidden filter panel with no filter indicator | AutomationRules |
| AR-7 | Hardcoded "Est. Time Saved" estimate | AutomationRules |
| AR-8 | "Select All" ambiguity with active filters | AutomationRules |
| WB-7 | Component library hides when config opens | WorkflowBuilder |
| WB-8 | Duplicate uses page reload instead of SPA nav | WorkflowBuilder |
| WB-9 | Metrics panel doesn't use available analytics data | WorkflowBuilder |
| WB-10 | Template import replaces nodes without warning | WorkflowBuilder |
| WN-1 | All action nodes use same Mail icon | WorkflowNode |
| WN-2 | "Configured" shows for default config | WorkflowNode |
| CL-1 | Library height calculation may cut off on small screens | ComponentLibrary |
| WC-2 | No canvas mini-map | WorkflowCanvas |
| WC-3 | Canvas doesn't grow with content | WorkflowCanvas |

---

## 9. Recommendations

### Immediate Fixes (High impact, low effort)

1. **AR-1: Default new rules to `isActive: false`** — Change `AutomationRules.tsx:277` from `isActive: true` to `isActive: false` and toast "Rule created as draft. Activate when ready."
2. **WB-1: Disable "Test Run" when no workflow ID** — Add `disabled={!workflowId}` to the Test Run button and show tooltip "Save workflow first"
3. **NC-1 + WB-3: Add missing config UIs** — Add config fields for Assign Lead, Send Notification, Add to Campaign, Update Score, Webhook
4. **NC-3 + NC-4: Fix field name mappings** — Align `taskTitle`→`title`, `updateField`→`updates` etc. to match backend expectations

### Short-term Improvements

5. **NAV-1: Add sub-navigation tabs** — Add a tab bar or secondary nav linking Workflows List / Automation Rules / Builder across all 3 pages
6. **WB-2: Add unsaved changes guard** — Add `window.onbeforeunload` handler when nodes state has changed since last save
7. **WL-2: Implement grid view or remove toggle** — Either build the grid rendering path or hide the toggle button
8. **AR-4: Show specific delete error** — Catch backend "active workflow" error and display "Please pause the workflow before deleting"

### Medium-term Enhancements

9. **WL-5: Add search to WorkflowsList** — Bring parity with AutomationRules search
10. **WC-1: Implement proper edge connections** — Allow nodes to define input/output ports for non-linear flows
11. **Accessibility: Add aria-labels, focus management, and keyboard handlers** — See Section 5 for full list
12. **WB-9: Wire metrics panel to analytics data** — Replace hardcoded zeros with `analyticsData` values

---

## Appendix: File Inventory

### Frontend (7 files)
| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/workflows/WorkflowsList.tsx` | ~800 | Main workflows list dashboard |
| `src/pages/workflows/AutomationRules.tsx` | ~1,080 | Simple rule creator + templates |
| `src/pages/workflows/WorkflowBuilder.tsx` | ~1,300 | Visual drag-and-drop builder |
| `src/components/workflows/WorkflowCanvas.tsx` | ~420 | Interactive 2D canvas with pan/zoom |
| `src/components/workflows/WorkflowNode.tsx` | ~150 | Individual workflow step node UI |
| `src/components/workflows/WorkflowComponentLibrary.tsx` | ~400 | Sidebar component palette |
| `src/components/workflows/NodeConfigPanel.tsx` | ~640 | Node configuration form |

### Backend (7 files)
| File | Purpose |
|------|---------|
| `backend/src/routes/workflow.routes.ts` | 12 API endpoints |
| `backend/src/controllers/workflow.controller.ts` | Request handlers |
| `backend/src/services/workflow.service.ts` | Core business logic (~1,500 LOC) |
| `backend/src/services/workflowExecutor.service.ts` | Queue and execution engine |
| `backend/src/services/workflow-trigger.service.ts` | Event detection and trigger matching |
| `backend/src/jobs/workflowProcessor.ts` | Background jobs (4 scheduled tasks) |
| `backend/src/validators/workflow.validator.ts` | Zod input validation schemas |

### Database (3 models)
| Model | Purpose |
|-------|---------|
| `Workflow` | Core workflow config (trigger, actions, settings) |
| `WorkflowExecution` | Execution runs with status tracking |
| `WorkflowExecutionStep` | Per-step execution detail with duration/error |

---

**Total Issues Found: 34**  
- **HIGH:** 4  
- **MEDIUM:** 14  
- **LOW:** 16  

**Overall User Experience Rating: 7.5/10**  
The Automations tab is feature-rich with a solid foundation. The main pain points are: missing config panels for 5 action types preventing real workflow configuration, no navigation between sub-pages, risk of data loss in the builder, and new rules being immediately active. Addressing the 4 HIGH items would bring this to 8.5/10.
