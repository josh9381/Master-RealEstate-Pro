# Leads Tab — UI Audit & Decisions

> Generated from screenshot audit on March 11, 2026

---

## Decisions Made

### Issue #1 — Dashboard: Stats cards use page-level data instead of global totals
- **Severity:** Medium
- **Location:** `src/pages/leads/list/LeadStatsCards.tsx`, `src/pages/leads/LeadsList.tsx`
- **Problem:** Qualified Rate shows "0 of 25 leads qualified" — the 25 is `leads.length` (current page), not the true total (76). Same issue affects Avg Lead Score and Conversion Rate. There is no date filter — this is purely a pagination issue where `leadStats` is computed from the 25-lead page slice.
- **Decision: ✅ Option A — Create a `/api/leads/stats` backend endpoint** that returns aggregate stats (qualified count, avg score, conversion count) across ALL leads. Stats cards will always reflect the full dataset regardless of pagination.

---

### Issue #2 — Dashboard: Pie chart labels overlapping + Lead source options incomplete
- **Severity:** High
- **Location:** `src/pages/leads/list/LeadCharts.tsx`, `src/pages/leads/LeadCreate.tsx`
- **Problem:** Lead Source Breakdown pie chart has ~20+ sources with radial labels that collide and become unreadable. Also, the Create Lead form only has 9 hardcoded source options while the DB has 20+.

**Decision: ✅ Three changes:**

**2a) Chart type:** Replace pie chart with a **horizontal bar chart** — top 5 sources + "Other" bucket. Add a "View All" link that expands to show the full breakdown. Always clean regardless of source count.

**2b) Chart grouping:** On the chart only, roll up LinkedIn, Instagram, Facebook Ads, Google Ads, YouTube, and generic Social Media into a single **"Social Media"** bar. Individual platforms remain available on create/edit forms.

**2c) Source options:** Update standard source list across the app. Remove these from standard options (available via Custom freeform only):
- ~~Lender Referral~~
- ~~Sign Call~~
- ~~Walk-In~~
- ~~Trulia~~
- ~~FSBO~~

**Final standard source list for forms:**
| Category | Options |
|---|---|
| Referral-based | Referral, Past Client, Sphere of Influence |
| Online/Digital | Website, LinkedIn, Instagram, Facebook Ads, Google Ads, YouTube, Social Media |
| Traditional/Outbound | Cold Call, Door Knocking, Open House, Print Ad, Networking Event |
| Other | AI Assistant, Email Campaign, Event, Partner |
| Freeform | Other / Custom (text input) |

---

### Issue #3 — Dashboard: Conversion Rate shows "0 leads in pipeline"
- **Severity:** Medium
- **Location:** `src/pages/leads/list/LeadStatsCards.tsx`, new `/api/leads/stats` endpoint
- **Problem:** Card shows "0%" with "0 leads in pipeline". Currently counts `proposal + negotiation` status leads from the current page only — wrong data source AND questionable metric definition.
- **Decision: ✅ Conversion Rate = `won / total`** — true close rate. Subtitle changes to "X of Y leads closed". Powered by the new stats endpoint from Issue #1. This is the metric real estate agents actually benchmark (industry avg 2-5%).

---

### Issue #4 — Table View: Action menu column has no header
- **Severity:** Low
- **Location:** `src/pages/leads/list/LeadsTable.tsx`
- **Problem:** The "..." three-dot menu column has no column header label.
- **Decision: ✅ Leave as-is.** Common pattern, no header needed.

---

### Issue #5 — Table/Grid View: "Cold 0" score display
- **Severity:** Low
- **Location:** `src/pages/leads/list/LeadsTable.tsx`, `src/pages/leads/list/LeadsGrid.tsx`
- **Problem:** Jason Mitchell shows "Cold 0" score badge — unclear if valid or missing data.
- **Decision: ✅ Leave as-is for now.** 0 is treated as a valid score.

---

### Issue #6 — Table Pagination: Wrong total count
- **Severity:** Medium
- **Location:** `src/pages/leads/LeadsList.tsx` (pagination section)
- **Problem:** Footer shows "Showing 1 to 25 of 25 results" instead of "of 76". The pagination component receives `leads.length` (25) instead of the API's `pagination.total` (76).
- **Decision: ✅ Fix it.** Use `pagination.total` from the API response for the total count display. Fix alongside Issue #1.

---

### Issue #7 — Grid View: "Unassigned" text not visually differentiated
- **Severity:** Low
- **Location:** `src/pages/leads/list/LeadsGrid.tsx`
- **Problem:** "Unassigned" displays in the same style as real agent names — doesn't stand out as a missing assignment.
- **Decision: ✅ Gray out / italicize "Unassigned"** so it's visually distinct from real names.

---

### Issue #8 — Pipeline View: All stages show 0 leads
- **Severity:** High
- **Location:** `src/pages/leads/LeadsPipeline.tsx`, backend pipeline/lead controllers
- **Problem:** Pipeline tab shows 0 leads in every stage despite 76 leads existing. Pipeline stages and lead statuses are separate systems — leads must be manually added to pipelines, which no one does.
- **Decision: ✅ General Pipeline auto-syncs with lead status; specialized pipelines remain independent.**
  - **General Pipeline:** Reads directly from lead status. Changing a lead's status moves it in the General Pipeline automatically. Dragging a lead in the General Pipeline updates the lead's status. No separate pipeline assignment needed — this pipeline always has leads.
  - **Specialized Pipelines (Buyer, Seller, Rental, Commercial, Custom):** Manual assignment. User adds leads via drag/drop or bulk assign. Pipeline stage is independent of status. Prompt on win/lost: "Also update lead status to WON/LOST?"

---

### Issue #9 — Create Lead Form: Long form, no visible submit button at bottom
- **Severity:** Medium
- **Location:** `src/pages/leads/LeadCreate.tsx`
- **Problem:** Form spans 5 cards with many fields. The "Create Lead" button only exists in the sidebar, which scrolls off screen. On mobile, sidebar stacks below all form content.
- **Decision: ✅ Redesign the Create Lead page.**

**New layout:**

| Main (2/3 width) | Sidebar (1/3 width, **sticky**) |
|---|---|
| **Card 1: Contact Info** — First/Last Name, Email, Phone, Company, Job Title (merged Personal + Company) | Lead Details (source, status, assigned to) |
| **Card 2: Real Estate Details** — collapsible, starts **collapsed**. Property Type, Transaction Type, Budget Min/Max, Pre-Approval, Timeline, Location, Beds, Baths, Deal Value | Tags |
| **Card 3: Address** — collapsible, starts **collapsed**. Street, City, State, ZIP, Country | Actions (Create / Cancel) |
| **Card 4: Notes** — textarea | |

**Key changes:**
1. Merge Personal Info + Company into one **"Contact Info"** card (6 fields, 2-col grid)
2. Move **Deal Value** from Company section into Real Estate Details
3. Make **Real Estate Details** and **Address** collapsible — collapsed by default
4. Sidebar becomes **sticky** on desktop (`sticky top-6`)
5. Add **duplicate Create/Cancel buttons at the bottom** of the form for mobile (hidden on desktop via `lg:hidden`)
6. Result: 4 cards instead of 5, 2 collapsed — initial form fits one screen

---

## Decisions Pending

### Issue #10 — Follow-ups: All items show "Unknown Lead · No Company"
- **Severity:** High
- **Location:** `src/pages/leads/LeadsFollowups.tsx`
- **Problem:** Every follow-up header shows "Unknown Lead · No Company" even though the description text correctly mentions the lead name (e.g., "Task related to Maria Roberts's real estate transaction"). The lead name/company isn't being resolved from the associated lead record.
- **Decision: ✅ Fix it.** Ensure the follow-ups query joins/includes the lead data and displays `lead.firstName lead.lastName` and `lead.company` in the header.

---

### Issue #11 — Follow-ups: Completed task visual distinction is weak
- **Severity:** Low
- **Location:** `src/pages/leads/LeadsFollowups.tsx`
- **Problem:** Completed tasks (e.g., Raj Carter, LOW priority) look nearly identical to pending tasks. The "Complete" button is hidden, but the card style is the same. Hard to scan which items are done vs. pending. Real issue is cards are too tall stacked in a single column — wastes space.
- **Decision: ✅ Switch to grid layout.** Display follow-up cards in a 2-3 column responsive grid with more compact cards. More items visible at a glance without scrolling.

---

### Issue #12 — History: Activity count mismatch (50 total, all subcategories show 0)
- **Severity:** High
- **Location:** `src/pages/leads/LeadHistory.tsx`
- **Problem:** Recent Activity Overview shows "50 Total Activities" but "0 Status Changes", "0 Emails Sent", "0 Notes Added", "0 Tasks Completed", "0 Phone Calls". The subcategory counts don't add up to the total.
- **Decision: ✅ Option A — Fix the subcategory count logic** to properly categorize activities by type so the breakdown matches the total.

---

### Issue #13 — History: Timeline entries all titled "Activity"
- **Severity:** Medium
- **Location:** `src/pages/leads/LeadHistory.tsx`
- **Problem:** Every timeline entry shows "Activity" as the title. Should show a meaningful description as the primary text.
- **Decision: ✅ Option B — Title = action type, subtitle = lead name + details.** E.g., "Status Changed" / "Josh Seep — from CONTACTED to QUALIFIED".

---

### Issue #14 — History: Filter tab counts all show 0
- **Severity:** Medium
- **Location:** `src/pages/leads/LeadHistory.tsx`
- **Problem:** Filter tabs show "Status Changes (0)", "Emails (0)", "Notes (0)", "Tasks (0)", "Calls (0)" but the timeline clearly has SMS delivered, email sent, and status changed entries. The filter count logic doesn't match the activity types that exist.
- **Decision: ✅ Option C — Fix filter counts to properly match activity type strings in the data AND add missing activity types to filters** (e.g., "SMS" tab).

---

### Issue #15 — Merge View: Two duplicate scan buttons
- **Severity:** Low
- **Location:** `src/pages/leads/LeadsMerge.tsx`
- **Problem:** "Scan for Duplicates" button in the top-right header AND "Run Duplicate Scan" button below the detection settings. Redundant and potentially confusing.
- **Decision: ✅ Option A — Remove the header button, keep only "Run Duplicate Scan" below settings.** Contextually makes more sense (adjust settings → scan).

---

## Summary

| # | Issue | Severity | Decision |
|---|---|---|---|
| 1 | Stats cards use page data | Medium | ✅ New `/api/leads/stats` endpoint |
| 2 | Pie chart overlap + sources | High | ✅ Horizontal bar (top 5 + Other), View All, grouped social media, updated source list |
| 3 | Conversion Rate metric | Medium | ✅ `won / total` = close rate |
| 4 | Action column no header | Low | ✅ Leave as-is |
| 5 | Cold 0 score display | Low | ✅ Leave as-is |
| 6 | Pagination total wrong | Medium | ✅ Fix — use `pagination.total` |
| 7 | Unassigned not styled | Low | ✅ Gray/italic |
| 8 | Pipeline empty | High | ✅ General Pipeline = auto-sync with status; others = independent |
| 9 | Create form too long | Medium | ✅ Redesign — merge cards, collapsible sections, sticky sidebar |
| 10 | Follow-ups "Unknown Lead" | High | ✅ Fix — join lead data into follow-ups query |
| 11 | Completed task styling | Low | ✅ Grid layout with compact cards |
| 12 | History count mismatch | High | ✅ Fix subcategory count logic to match activity types |
| 13 | History generic titles | Medium | ✅ Title = action type, subtitle = lead name + details |
| 14 | History filter counts | Medium | ✅ Fix counts + add missing activity type filters (SMS, etc.) |
| 15 | Merge duplicate buttons | Low | ✅ Remove header button, keep settings button only |
