# Continued Audit Work Plan

This document tracks all remaining open items from the audit. P0/P1 critical issues have been resolved.
All remaining work is **medium priority** unless otherwise noted.

---

## Phase 1 — Quick Data & Logic Fixes (High-impact, low-effort)

These are targeted one-liner or small code fixes in specific files.

### 1.1 LeadCreate — `notes` field never sent to API
**File:** `src/pages/leads/LeadCreate.tsx`
- The `notes` state is collected and bound to the textarea but stripped before the API call.
- Fix: ensure `notes: formData.notes || undefined` is included in the `leadsApi.createLead()` payload.

### 1.2 ABTesting — `duration` and `confidence` never sent to API
**File:** `src/pages/campaigns/ABTesting.tsx`
- `createForm.duration` and `createForm.confidence` are controlled inputs but not included in the create payload.
- Fix: add `durationHours: Number(createForm.duration)` and `confidenceThreshold: Number(createForm.confidence)` to the `campaignsApi.createABTest()` call.

### 1.3 CommunicationInbox — tautological `handleMarkUnread` condition
**File:** `src/pages/communication/CommunicationInbox.tsx`
- The condition inside `handleMarkUnread` compares `selectedThread.id === selectedThread.id` (always true — copy-paste bug).
- Fix: change condition to compare against the *thread's read state*, e.g. `!thread.isUnread` or the correct field name from the Thread type.

### 1.4 CampaignDetail — raw `fetch` bypasses auth interceptors
**File:** `src/pages/campaigns/CampaignDetail.tsx`
- A/B test data is fetched with a raw `fetch()` call, skipping the API client's auth headers and error interceptors.
- Fix: replace with `campaignsApi.getABTests(id)` (or equivalent) using the project's `apiClient`.

### 1.5 WorkflowsList — missing fallback response shape
**File:** `src/pages/workflows/WorkflowsList.tsx` around line 74
- Only checks `response.data.workflows`; if the API returns `response.workflows` directly it silently shows empty.
- Fix: `workflowsResponse?.data?.workflows || workflowsResponse?.workflows || []`

### 1.6 AnalyticsDashboard — Pipeline Value shows wrong metric
**File:** `src/pages/analytics/AnalyticsDashboard.tsx` around line 78
- "Pipeline Value" is labeled as open pipeline but is calculated as closed revenue.
- Fix: use `qualifiedLeads * avgDealSize` (already in code as `pipelineValue`) and confirm it is rendering in the Pipeline Value card, NOT the Revenue card. Verify labeling is consistent.

---

## Phase 2 — Non-functional Buttons

These buttons render and are clickable but have no `onClick` handler or the handler does nothing meaningful.

### 2.1 WorkflowBuilder secondary toolbar buttons
**File:** `src/pages/workflows/WorkflowBuilder.tsx`
- **Duplicate Workflow**: should deep-clone the current workflow object, strip the `id`, and call `workflowsApi.createWorkflow()` with the cloned payload, then navigate to the new workflow.
- **Export JSON**: should `JSON.stringify` the workflow (nodes + edges + metadata) and trigger a browser download via a `<a>` blob URL.
- **View Debug Console**: should toggle a drawer/panel showing `executionLogs`. Wire `executionLogs` state to `workflowsApi.getWorkflowRuns(workflowId)` on load.

### 2.2 WorkflowBuilder Recent Runs / `executionLogs` always empty
**File:** `src/pages/workflows/WorkflowBuilder.tsx`
- `executionLogs` is initialized as `[]` and never populated.
- Fix: on page load (after workflow data loads), call `workflowsApi.getWorkflowRuns(workflowId)` and set the result into `executionLogs`.

### 2.3 EmailTemplatesLibrary — grid/list toggle and Settings buttons
**File:** `src/pages/communication/EmailTemplatesLibrary.tsx`
- Grid/List view toggle buttons have no `onClick` — no `viewMode` state.
- "Template Settings" fields (delivery time, tracking, etc.) are uncontrolled inputs wired to nothing.
- "Save Settings" button does nothing.
- Fix: add `viewMode` state (`'grid' | 'list'`), toggle on click. Wire settings to a controlled `settings` state object. On "Save Settings" call the appropriate API endpoint (or `toast.success('Settings saved')` if no endpoint exists yet).

### 2.4 ReportBuilder — "Save Report" button does nothing
**File:** `src/pages/analytics/ReportBuilder.tsx`
- The Save Report button exists but has no `onClick` handler.
- Fix: on click, call `analyticsApi.saveReport({ name, fields, filters })` and show a success toast. Navigate to the saved report on success.

---

## Phase 3 — Modal Accessibility (`role="dialog"` + focus trap + Escape key)

The following modals use raw `<div>` overlays without `role="dialog"`, `aria-modal`, focus trapping, or Escape key dismissal. Each needs these four attributes/behaviors added:

```
role="dialog"
aria-modal="true"
aria-labelledby="<modal-heading-id>"
onKeyDown={(e) => { if (e.key === 'Escape') closeModal() }}
```

For focus trapping, add `tabIndex={-1}` on the modal panel and call `.focus()` on mount via `useRef` + `useEffect`.

### Files to update:
| File | Modals to fix |
|------|--------------|
| `src/pages/leads/LeadsList.tsx` | Edit Lead modal (raw `<div>`, no role/trap — row action inline overlays) |
| `src/pages/leads/LeadCreate.tsx` | (no modal — verify form labels via `htmlFor`/`id` pairings) |
| `src/pages/campaigns/CampaignCreate.tsx` | Audience preview overlay |
| `src/pages/campaigns/ABTesting.tsx` | Create A/B Test modal |
| `src/pages/communication/CommunicationInbox.tsx` | Compose modal, Snooze modal |
| `src/pages/communication/NewsletterManagement.tsx` | Create newsletter modal |
| `src/pages/communication/SocialMediaDashboard.tsx` | Create post modal |
| `src/pages/workflows/AutomationRules.tsx` | Create Rule modal |

> **Note:** LeadsList bulk-action modals, CampaignSchedule, and key LeadDetail modals already have `role="dialog"`, `aria-modal`, and Escape key handling as of the P0/P1 pass — verify these are not regressed.

---

## Phase 4 — `useQuery` Migration (27 pages)

Replace `useState` + `useEffect` fetch patterns with `useQuery` from `@tanstack/react-query` for caching, automatic revalidation, and consistent loading/error states.

**Standard pattern to apply:**
```tsx
// Before
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
useEffect(() => {
  api.getData().then(res => setData(res.data)).finally(() => setLoading(false));
}, []);

// After
const { data, isLoading, isError, refetch } = useQuery({
  queryKey: ['keyName', ...deps],
  queryFn: () => api.getData().then(res => res.data),
});
```

### Leads (5 pages — 0/5 migrated)
- [ ] `src/pages/leads/LeadsFollowups.tsx`
- [ ] `src/pages/leads/LeadsPipeline.tsx`
- [ ] `src/pages/leads/LeadsExport.tsx`
- [ ] `src/pages/leads/LeadsMerge.tsx`
- [ ] `src/pages/leads/LeadHistory.tsx`

### Campaigns (6 pages — CampaignCreate, CampaignDetail already migrated; 6 remaining)
- [ ] `src/pages/campaigns/CampaignSchedule.tsx`
- [ ] `src/pages/campaigns/ABTesting.tsx`
- [ ] `src/pages/campaigns/EmailCampaigns.tsx`
- [ ] `src/pages/campaigns/SMSCampaigns.tsx`
- [ ] `src/pages/campaigns/PhoneCampaigns.tsx`
- [ ] `src/pages/campaigns/CampaignReports.tsx`

### Analytics (7 pages — 0/7 migrated)
- [ ] `src/pages/analytics/AnalyticsDashboard.tsx`
- [ ] `src/pages/analytics/ConversionReports.tsx`
- [ ] `src/pages/analytics/UsageAnalytics.tsx`
- [ ] `src/pages/analytics/CustomReports.tsx`
- [ ] `src/pages/analytics/ReportBuilder.tsx`
- [ ] `src/pages/analytics/LeadAnalytics.tsx`
- [ ] `src/pages/analytics/CampaignAnalytics.tsx`

### Communications (6 pages — 0/6 migrated)
- [ ] `src/pages/communication/CommunicationInbox.tsx`
- [ ] `src/pages/communication/EmailTemplatesLibrary.tsx`
- [ ] `src/pages/communication/CallCenter.tsx`
- [ ] `src/pages/communication/SMSCenter.tsx`
- [ ] `src/pages/communication/SocialMediaDashboard.tsx`
- [ ] `src/pages/communication/NewsletterManagement.tsx`

### AI Hub (3 pages — 0/3 migrated)
- [ ] `src/pages/ai/LeadScoring.tsx`
- [ ] `src/pages/ai/PredictiveAnalytics.tsx`
- [ ] `src/pages/ai/AIAnalytics.tsx`

### Workflows (3 pages — 0/3 migrated)
- [ ] `src/pages/workflows/AutomationRules.tsx`
- [ ] `src/pages/workflows/WorkflowBuilder.tsx`
- [ ] `src/pages/workflows/WorkflowsList.tsx`

---

## Phase 5 — Loading Skeletons (15+ pages)

Pages that show empty/zero states during data fetch instead of loading indicators. Add `<LoadingSkeleton />` (already exists at `src/components/shared/LoadingSkeleton.tsx`) gated on `isLoading` (or the equivalent state variable).

### Pages needing skeleton loaders:
| File | Sections to skeleton |
|------|---------------------|
| `src/pages/campaigns/EmailCampaigns.tsx` | Campaign card list |
| `src/pages/campaigns/SMSCampaigns.tsx` | Campaign list |
| `src/pages/campaigns/PhoneCampaigns.tsx` | Campaign list |
| `src/pages/campaigns/ABTesting.tsx` | Test list |
| `src/pages/campaigns/CampaignSchedule.tsx` | Schedule list |
| `src/pages/campaigns/CampaignReports.tsx` | Report charts |
| `src/pages/leads/LeadsFollowups.tsx` | Followup list |
| `src/pages/leads/LeadHistory.tsx` | Timeline |
| `src/pages/leads/LeadsPipeline.tsx` | Pipeline columns |
| `src/pages/ai/LeadScoring.tsx` | Score table |
| `src/pages/ai/PredictiveAnalytics.tsx` | Chart areas |
| `src/pages/ai/AIAnalytics.tsx` | Metrics cards |
| `src/pages/analytics/ConversionReports.tsx` | Charts |
| `src/pages/analytics/UsageAnalytics.tsx` | Stats cards |
| `src/pages/analytics/CustomReports.tsx` | Report list |
| `src/pages/analytics/ReportBuilder.tsx` | Field palette |
| `src/pages/communication/SocialMediaDashboard.tsx` | Post cards |
| `src/pages/communication/NewsletterManagement.tsx` | Newsletter list |
| `src/pages/workflows/AutomationRules.tsx` | Rules list |
| `src/pages/workflows/WorkflowsList.tsx` | Workflow cards |

---

## Phase 6 — Type Safety (`any` → proper types)

~100+ `any` instances across the codebase. Prioritize API response types since those cascade into most components.

### Recommended approach:
1. Add/expand types in `src/lib/types.ts` (or wherever the project keeps shared types) for the main API response shapes: `Lead`, `Campaign`, `Workflow`, `Message`, `Thread`, `AnalyticsData`.
2. Replace `any` in API client files first (`src/lib/api.ts` or similar), since proper return types propagate automatically into calling components.
3. Work through pages tab by tab — Leads → Campaigns → Communications → Analytics → AI → Workflows.

### Highest-impact files:
- `src/pages/ai/AIHub.tsx` — 8 state variables typed as `any`
- `src/pages/campaigns/CampaignCreate.tsx` — `as any` on template response
- `src/pages/analytics/AnalyticsDashboard.tsx` — multiple `any[]` arrays
- All API client method return types

---

## Phase 7 — Keyboard Accessibility

Interactive cards, rows, and drag-and-drop areas that are not keyboard-reachable.

### 7.1 LeadsPipeline — drag-and-drop keyboard alternative
**File:** `src/pages/leads/LeadsPipeline.tsx`
- Drag-and-drop between columns is mouse-only.
- Fix: add `tabIndex={0}` + `onKeyDown` (Enter/Space to "pick up" a card, arrow keys to move between columns, Enter/Space to "drop") OR add a "Move to…" dropdown button on each card as a keyboard-accessible alternative.

### 7.2 ReportBuilder — drag-and-drop keyboard alternative
**File:** `src/pages/analytics/ReportBuilder.tsx`
- Same issue as pipeline — field palette drag to report is mouse-only.
- Fix: add "Add" button on each field row as an accessible alternative.

### 7.3 Row action menus in LeadsList
**File:** `src/pages/leads/LeadsList.tsx`
- Row kebab menus lack `role="menu"`, `role="menuitem"`, and arrow key navigation.
- Fix: add proper ARIA roles and `onKeyDown` arrow navigation. Alternatively wrap in a Radix UI `DropdownMenu` component if available.

### 7.4 `showRowMenu` click-outside handler missing
**File:** `src/pages/leads/LeadsList.tsx`
- Menus opened via row action button don't close on outside click.
- Fix: add a `useEffect` with a `mousedown` / `click` document listener that calls `setShowRowMenu(null)` when the click target is outside the menu ref.

---

## Phase 8 — Validation

### 8.1 Lead forms missing format validation
| File | Fields to validate |
|------|--------------------|
| `src/pages/leads/LeadCreate.tsx` | Email format (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), phone format (digits + allowed chars), required name |
| `src/pages/leads/LeadsList.tsx` (edit modal) | Same as above |
| `src/pages/leads/LeadDetail.tsx` (edit modal) | Same as above |

### 8.2 Campaign forms
| File | Fields to validate |
|------|--------------------|
| `src/pages/campaigns/CampaignCreate.tsx` | Email subject required, schedule date must be in the future, budget must be > 0 |
| `src/pages/campaigns/CampaignDetail.tsx` (edit modal) | Same |
| `src/pages/campaigns/ABTesting.tsx` | Variant A and B must not be identical |

### 8.3 Follow-up scheduling
**File:** `src/pages/leads/LeadsFollowups.tsx`
- Allow scheduling follow-ups in the past — add a validation check that the selected date/time is after `new Date()`.

---

## Phase 9 — Minor Hardcoded / Mock Data Cleanup

| Issue | File | Fix |
|-------|------|-----|
| Conversion rate change hardcoded to `'-2.4%'` | `src/pages/dashboard/Dashboard.tsx` | Calculate from actual previous-period stats or hide if unavailable |
| Stat card targets are magic numbers | `src/pages/dashboard/Dashboard.tsx` | Move to named constants or derive from subscription plan config |
| `AIHub` stats use `\|\|` fallback to mock values (masks real zeros) | `src/pages/ai/AIHub.tsx` | Use `?? null` and show "—" when truly no data |
| `WorkflowsList` placeholder URL `https://docs.example.com/workflows` | `src/pages/workflows/WorkflowsList.tsx` | Replace with the real docs URL or remove the link |
| `LeadScoring` confidence is just the score repeated | `src/pages/ai/LeadScoring.tsx` | Use a distinct confidence field from the API or remove the column |
| `AIAnalytics` uptime shows "—" | `src/pages/ai/AIAnalytics.tsx` | Fetch uptime from health/metrics API or model metadata |

---

## Summary Checklist

| Phase | Items | Est. Effort |
|-------|-------|-------------|
| 1 — Data & Logic Fixes | 6 items | 1–2 hours |
| 2 — Non-functional Buttons | 4 items | 2–3 hours |
| 3 — Modal Accessibility | 8 files | 2–3 hours |
| 4 — `useQuery` Migration | 27 pages | 4–8 hours |
| 5 — Loading Skeletons | 20 pages | 2–3 hours |
| 6 — Type Safety | ~100 instances | 4–6 hours |
| 7 — Keyboard Accessibility | 4 items | 2–3 hours |
| 8 — Form Validation | 3 areas | 1–2 hours |
| 9 — Hardcoded Cleanup | 6 items | 1 hour |
| **Total** | | **~20–30 hours** |

**Recommended order:** Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 4 → Phase 8 → Phase 7 → Phase 6 → Phase 9
