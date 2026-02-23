# Comprehensive Audit Report — 7 Tabs

## Build Status
- **TypeScript**: 0 compile errors
- **Vite build**: Succeeds, but the bundle is **2,081 KB** (should be <500 KB per chunk). Code-splitting with dynamic `import()` is strongly recommended.

---

## 1. DASHBOARD

### Critical / High
| Issue | Location |
|-------|----------|
| Dead filter button — `showFilters` state toggles but **no filter UI renders** | Dashboard.tsx#L58 |
| No error states for 7 API queries — silently shows empty data on failure | Dashboard.tsx#L88-L142 |
| Missing `aria-label` on date range `<select>` | Dashboard.tsx#L443 |

### Medium
- Only `statsLoading` gates the loading skeleton — chart/activity sections show empty rather than loaders while fetching
- Unlabeled task checkboxes, icon-only `<ArrowUpRight>` button without `aria-label`
- Hardcoded conversion rate change (`'-2.4%'`), stat card targets are magic numbers
- Heavy use of `any` types throughout (bypasses type safety)
- `handleTaskComplete` catches errors but only logs to console — no user-visible toast

---

## 2. LEADS (9 pages)

### Critical / High
| Issue | Location |
|-------|----------|
| `handleSaveEdit` in LeadsList has **type mismatch** — `assignedTo` can be string or object, not handled like in LeadDetail | LeadsList.tsx#L567 |
| Drop zone says "Drop your CSV file here" but **no drag-and-drop handlers exist** | LeadsImport.tsx |
| Pipeline drag-and-drop is **not keyboard accessible** | LeadsPipeline.tsx |

### Medium
- **LeadsList** (2,104 lines): Modals use raw `<div>` overlays without focus trapping, `role="dialog"`, or Escape key; row action menus lack `role="menu"` and keyboard nav; `showRowMenu` has no click-outside handler; edit lead modal has no validation; mock data imports inflate bundle
- **LeadCreate**: `notes` field collected in form but **never sent to API**; email/phone format not validated; `<label>` not associated with inputs via `htmlFor`/`id`
- **LeadDetail**: AI data managed with `useState` instead of `useQuery` (not cached, re-fetches every mount); edit modal has no validation
- **LeadsPipeline**: Uses `useState`/`useEffect` instead of `useQuery`; no loading skeleton; drag-drop moves leads without confirmation
- **LeadsFollowups**: No loading skeleton; allows scheduling follow-ups in the past; completes follow-ups without confirmation
- **LeadHistory**: API errors silently swallowed (console.error only, no toast); no loading skeleton; duplicate state arrays (`timeline`/`allTimeline`) should be `useMemo`
- **LeadsMerge/LeadsExport**: `useState`/`useEffect` pattern instead of `useQuery`; export history lost on navigation

---

## 3. CAMPAIGNS (11 pages)

### Critical / High
| Issue | Location |
|-------|----------|
| **XSS vulnerability** — `dangerouslySetInnerHTML` renders campaign body with **no sanitization** | CampaignPreviewModal.tsx#L160 |
| SMSCampaigns Quick Send: Recipients input is **completely non-functional** — campaigns send with no audience | SMSCampaigns.tsx |
| EmailCampaigns search input is **purely decorative** — not wired to any state | EmailCampaigns.tsx#L156 |

### Medium
- **CampaignCreate**: Template loading error silently swallowed (`.catch(() => {})`); lead count queries silently return 0 on failure; no loading skeleton; no validation for email subject, schedule date in future, or budget positivity; `as any` on template response
- **CampaignDetail**: Raw `fetch` call bypasses API client's auth/interceptors for A/B test data; edit modal has no form validation; `editForm.content` written but never sent to API
- **CampaignSchedule**: `confirm()` native dialogs used (not accessible/styleable); reschedule modal lacks focus trap
- **ABTesting**: `createForm.duration` and `createForm.confidence` collected but **never sent** to API; no validation for variants being different; "View Details" button scrolls to non-existent element IDs
- Most sub-pages use `useState`/`useEffect` instead of `useQuery` (inconsistent with CampaignsList)
- No loading skeletons on: EmailCampaigns, SMSCampaigns, PhoneCampaigns, ABTesting, CampaignSchedule, CampaignReports

---

## 4. AI HUB (7 pages)

### Critical / High
| Issue | Location |
|-------|----------|
| **5 of 6 navigation links are broken (404)** — routes generated from titles don't match actual routes | AIHub.tsx#L292 |
| Revenue/Conversion charts **always empty** — data arrays hardcoded to `[]` | PredictiveAnalytics.tsx#L82-L83 |
| Potential **crash** on unknown insight categories — `categoryIcons[category]` returns `undefined`, rendered as `<undefined className=...>` | IntelligenceInsights.tsx#L356 |
| `modelComparison` data is always **hardcoded** — never reflects real models | AIAnalytics.tsx#L50-L55 |

### Medium
- **AIHub**: Mock insights shown despite `USE_MOCK_DATA=false`; stats use `||` fallback to mock values (masks real zeros); `handleUploadData` sends `data: []` — non-functional; all 8 state variables typed as `any`
- **LeadScoring**: `modelStatus` hardcoded to `'active'` (never from API); score distribution based on only 10 leads (misleading); `confidence` is just the score repeated
- **PredictiveAnalytics**: Typo `revenueForcast`; no real predictive API — just reformats model metadata; multiple `eslint-disable` suppressions
- **ModelTraining**: `trainingMetrics` always empty array; all action buttons disabled/coming soon — page is read-only
- **AIAnalytics**: Uptime shows "—"; no date range selector; "Real-time data" label but no auto-refresh/polling

**Broken route mapping (AI Hub):**

| Link Text | Generated Path | Actual Route | Result |
|-----------|---------------|-------------|--------|
| Customer Segmentation | `/ai/customer-segmentation` | `/ai/segmentation` | **404** |
| Predictive Analytics | `/ai/predictive-analytics` | `/ai/predictive` | **404** |
| Model Training | `/ai/model-training` | `/ai/training` | **404** |
| Intelligence Insights | `/ai/intelligence-insights` | `/ai/insights` | **404** |
| Performance Analytics | `/ai/performance-analytics` | `/ai/analytics` | **404** |

---

## 5. ANALYTICS (7 pages)

### Critical / High
| Issue | Location |
|-------|----------|
| **Team Performance** section never calls `getTeamPerformance()` — always shows empty state | AnalyticsDashboard.tsx#L91 |
| `avgDealSize` divides by **all leads** instead of won leads — incorrect calculation | AnalyticsDashboard.tsx#L70 |
| **Time to Convert** pie chart permanently empty — `timeToConvert = []` hardcoded | ConversionReports.tsx#L174 |
| **Source Conversion** bars always show 0% — `converted` hardcoded to `0` | ConversionReports.tsx#L84-L88 |
| **UsageAnalytics**: `usageData` and `featureUsage` hardcoded empty — 2 sections **permanently blank** | UsageAnalytics.tsx#L49,L62 |
| **ReportBuilder**: Shows **fabricated mock data** when API returns empty | ReportBuilder.tsx#L87-L89 |
| **CustomReports**: 9 buttons with **no click handlers** — all non-functional | CustomReports.tsx |

### Medium
- **Export Report** buttons on LeadAnalytics and ConversionReports have **no `onClick`** handler
- ConversionReports, UsageAnalytics, CustomReports, ReportBuilder have **no loading spinners**
- ConversionReports funnel shows distribution percentage mislabeled as "conversion rate"
- LeadAnalytics labels lead score as "Conv. rate" — misleading
- Pipeline Value on AnalyticsDashboard shows closed revenue instead of open pipeline value
- `Promise.all` in ConversionReports/UsageAnalytics/CustomReports/ReportBuilder has no individual `.catch()` — one failure tanks all data
- Potential `.data` accessor mismatch across 4 pages (API nesting inconsistency)
- Available API endpoints never called: `getTeamPerformance`, `getConversionFunnel`, `getPipelineMetrics`
- **ReportBuilder**: Drag-and-drop has **no keyboard alternative**; "Save Report" button does nothing

---

## 6. COMMUNICATIONS (6 pages)

### Critical / High
| Issue | Location |
|-------|----------|
| **XSS vulnerability** — `dangerouslySetInnerHTML` renders template body with **no sanitization** | EmailTemplatesLibrary.tsx#L532 |
| Attachment upload: file input fires toast but **does nothing with the file** | CommunicationInbox.tsx#L2009-L2027 |
| Pin/Trash/Archive are **local-only** — no API persistence, lost on refresh | CommunicationInbox.tsx#L614,L639,L760 |
| **CallCenter**: Dialer pad numbers don't type, "Call" button does nothing, "Make Call" button does nothing | CallCenter.tsx#L66,L139 |
| **SMSCenter**: "New SMS" button has no `onClick`; search input uncontrolled; "Reply" button does nothing | SMSCenter.tsx#L93,L206,L244 |

### Medium
- **CommunicationInbox**: `_emailSubject` state set but never rendered (subject from AI composer silently lost); `handleMarkUnread` has tautological condition `selectedThread.id === selectedThread.id` (copy-paste bug); compose modal has no email/phone format validation; hardcoded `templates` and `quickReplies` arrays; date filters in state but never applied
- **EmailTemplatesLibrary**: Grid/List toggle buttons have no click handlers; "Template Settings" section entirely uncontrolled (none wired to state/API); `Save Settings` button does nothing
- **SocialMediaDashboard**: `socialPosts` initialized with hardcoded mock data that persists on API error; filter/edit/delete buttons non-functional; character counter not wired to state
- **NewsletterManagement**: `newsletters` initialized with hardcoded mock data (persists on error); 5+ buttons per newsletter (View Report, Duplicate, Edit, Send, Delete) all **non-functional**; template cards clickable but no handler

---

## 7. AUTOMATIONS / WORKFLOWS (3 pages + 4 components)

### Critical / High
| Issue | Location |
|-------|----------|
| **AutomationRules**: API response shape mismatch — `loadRules` checks `Array.isArray(response)` but API returns object; mock data **persists** as "real" rules on failure | AutomationRules.tsx#L46-L73,L100 |
| **AutomationRules**: State type expects `{ trigger, actions: string[] }` but API returns `{ triggerType, actions: [{type,config}] }` — **UI breaks** with real data | AutomationRules.tsx#L92 |
| **WorkflowBuilder**: `saveWorkflow` sends `{ name, nodes }` but backend expects `{ name, triggerType, actions }` — wrong payload shape | WorkflowBuilder.tsx |
| **WorkflowCanvas**: Space key handler prevents default **globally** — **blocks typing spaces** in the workflow name input | WorkflowCanvas.tsx#L55-L65 |
| **WorkflowBuilder**: Duplicate Node Configuration card — inline card (no `onClick` on Save) vs `NodeConfigPanel` (proper save) — **conflicting UIs** | WorkflowBuilder.tsx#L1090,L1122 |
| **NodeConfigPanel**: `dangerouslySetInnerHTML` for email body preview — **XSS vulnerability** | NodeConfigPanel.tsx#L210 |

### Medium
- **WorkflowsList**: Placeholder URL `https://docs.example.com/workflows`; interface name `Workflow` shadows lucide-react icon import; response data access pattern may cause workflows to never load (`response.data.workflows` double-nesting)
- **WorkflowBuilder**: `executionLogs` always empty (Recent Runs never populated); `runTest` has race condition (setTimeout fires success regardless of API timing); template data defined twice (~200 lines duplicated); "Duplicate Workflow", "Export JSON", "View Debug Console" buttons do nothing; no save loading indicator; no undo/redo; no node delete confirmation
- **AutomationRules**: `editRule` uses `window.location.href` (full page reload) instead of React Router `navigate()`; create modal uses raw `<div>` overlay without focus trapping; dynamic Tailwind classes (`bg-${color}-100`) **won't work** after CSS purging; no loading state on Create button during API call
- **WorkflowCanvas**: "Scroll to zoom" tooltip but **no `onWheel` handler** exists; stale closure risk in `handleMouseMove`

---

## Cross-Cutting Issues (All Tabs)

| Category | Affected Pages | Count |
|----------|---------------|-------|
| **`any` types** — no proper typing for API data | All tabs, 30+ files | ~100+ instances |
| **Raw `<div>` modal overlays** without `role="dialog"`, focus trap, Escape key | Leads, Campaigns, Comms, Workflows, AI | ~15 modals |
| **`useState`/`useEffect` instead of `useQuery`** — no caching/revalidation | Leads(5), Campaigns(6), AI(4), Analytics(5), Comms(4), Workflows(3) | ~27 pages |
| **Non-functional buttons** (no `onClick`) | Analytics(12), Comms(20+), Workflows(3) | ~35 buttons |
| **Charts with permanently empty data** | AI(3), Analytics(5) | 8 charts |
| **XSS vulnerabilities** (`dangerouslySetInnerHTML` without sanitization) | CampaignPreviewModal, EmailTemplatesLibrary, NodeConfigPanel | 3 files |
| **Mock data persists on API failure** as if real | AIHub, AutomationRules, SocialMedia, Newsletter, ReportBuilder | 5 pages |
| **Missing loading skeletons** | 15+ pages show empty/zero states during load | |
| **Clickable elements not keyboard-accessible** | Nearly every page with interactive cards/rows | |
| **Bundle size**: 2,081 KB single chunk | All | Should code-split |

---

## Priority Fix Recommendations

1. **P0 — Fix 5 broken AI Hub navigation links** (5 of 6 sub-pages unreachable)
2. **P0 — Fix 3 XSS vulnerabilities** (add DOMPurify sanitization)
3. **P0 — Fix WorkflowCanvas space key blocking input typing**
4. **P1 — Fix API response shape mismatches** in AutomationRules, WorkflowsList, WorkflowBuilder (data likely never loads correctly)
5. **P1 — Wire up non-functional core buttons** (CallCenter dialer, SMSCenter New SMS, attachment upload, Export buttons)
6. **P1 — Remove mock data that persists on API failure** (5 pages showing fake data as real)
7. **P1 — Fix permanently empty charts** (PredictiveAnalytics, ConversionReports, UsageAnalytics)
8. **P2 — Add loading skeletons** to 15+ pages
9. **P2 — Add focus trapping + `role="dialog"`** to ~15 custom modals
10. **P2 — Code-split the 2MB bundle** with lazy imports
