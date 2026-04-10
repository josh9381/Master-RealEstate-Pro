# UI Upgrade Master Plan — 6.9/10 → 10/10

> **Status**: Plan only — no changes executed yet  
> **Baseline**: 217 test files, 685 tests — ALL PASSING  
> **Total .tsx files in project**: 211  
> **Current overall score**: 6.9/10

---

## Table of Contents

1. [How This Plan Works](#how-this-plan-works)
2. [Risk Management Strategy](#risk-management-strategy)
3. [Current Audit Scores](#current-audit-scores)
4. [Phase 1 — Production Bug Fixes (P0)](#phase-1--production-bug-fixes-p0)
5. [Phase 2 — Design Token Foundation](#phase-2--design-token-foundation)
6. [Phase 3 — Color System Cleanup](#phase-3--color-system-cleanup)
7. [Phase 4 — Accessibility Overhaul](#phase-4--accessibility-overhaul)
8. [Phase 5 — Interactive States Polish](#phase-5--interactive-states-polish)
9. [Phase 6 — Consistency Standardization](#phase-6--consistency-standardization)
10. [Phase 7 — Typography Refinement](#phase-7--typography-refinement)
11. [Phase 8 — Visual Hierarchy & Spacing](#phase-8--visual-hierarchy--spacing)
12. [Phase 9 — Performance Optimization](#phase-9--performance-optimization)
13. [Final Audit & Sign-Off](#final-audit--sign-off)

---

## How This Plan Works

### Execution Rules

1. **One step at a time** — never batch unrelated changes together
2. **Automated verification after every step** — run the full test suite
3. **TypeScript check after every step** — catch type errors immediately
4. **Git commit after every step** — so we can revert any single change in isolation
5. **User checkpoints** — at the end of every phase you visually review the site and approve before continuing

### Verification Commands (run after EVERY step)

```bash
# 1. TypeScript compilation — must show 0 errors
npx tsc --noEmit --pretty

# 2. Full test suite — must show 217 passed files, 685 passed tests
npm run test

# 3. Production build — must succeed with no warnings
npm run build
```

If ANY of these fail after a step, we **immediately revert** that step's commit and diagnose before retrying.

### Git Strategy — Complete Branch & Merge Guide

#### The Core Rule

> **Main branch is NEVER touched until you explicitly approve a phase.**  
> All work happens on isolated branches. If anything goes wrong, main is untouched.

#### Branch Naming Convention

Each phase gets its own branch, named consistently:

```
ui-upgrade/phase-1-bugfixes
ui-upgrade/phase-2-tokens
ui-upgrade/phase-3-colors
ui-upgrade/phase-4-accessibility
ui-upgrade/phase-5-interactive
ui-upgrade/phase-6-consistency
ui-upgrade/phase-7-typography
ui-upgrade/phase-8-hierarchy
ui-upgrade/phase-9-performance
```

#### How Branches Flow (Diagram)

```
main ─────────────────────────────────────────────────────────────────────→
  │                 ↑               ↑               ↑               ↑
  │              merge 1         merge 2         merge 3         merge 9
  │                 │               │               │               │
  └─ phase-1 ──────┘               │               │               │
                    │               │               │               │
                    └─ phase-2 ─────┘               │               │
                                    │               │               │
                                    └─ phase-3 ─────┘               │
                                                    │               │
                                                   ...             ...
                                                                    │
                                                    └─ phase-9 ─────┘
```

**KEY POINT**: Each phase branches off from main AFTER the previous phase has been merged. This is a **sequential chain**, not parallel branches. Phase 2 includes everything from Phase 1, Phase 3 includes everything from Phases 1+2, etc.

#### Step-by-Step: Starting a New Phase

```bash
# STEP 1: Make sure you're on main and it's clean
git checkout main
git status                    # Should show "nothing to commit, working tree clean"
                              # If it shows changes, run: git stash

# STEP 2: Create the phase branch FROM main
git checkout -b ui-upgrade/phase-N-description

# STEP 3: Verify you're on the right branch
git branch                    # Should show * ui-upgrade/phase-N-description
```

#### Step-by-Step: Committing Each Step Within a Phase

```bash
# After completing a step and ALL 3 verification commands pass:

# STEP 1: Stage all changes
git add -A

# STEP 2: Review what you're committing (IMPORTANT — catch mistakes)
git diff --cached --stat      # Shows list of files changed
git diff --cached             # Shows actual changes (press q to exit)

# STEP 3: Commit with a descriptive message
git commit -m "Phase N, Step X: [short description of what changed]"

# Example:
git commit -m "Phase 1, Step 1: Fix dynamic Tailwind class purging in AnalyticsDashboard"
git commit -m "Phase 1, Step 2: Fix Badge WCAG contrast failure"
```

#### Step-by-Step: Merging a Phase into Main (After User Checkpoint Approval)

This is the critical moment. Follow these steps EXACTLY:

```bash
# STEP 1: Make sure all changes on the phase branch are committed
git status                    # Must show "nothing to commit"

# STEP 2: Run ALL verification commands one final time
npx tsc --noEmit --pretty     # Must show 0 errors
npm run test                  # Must show 217 files, 685 tests passed
npm run build                 # Must succeed

# STEP 3: Switch to main
git checkout main

# STEP 4: Verify main is clean and unchanged
git status                    # Must show "nothing to commit"
git log --oneline -3          # Confirm main is at the expected commit

# STEP 5: Merge the phase branch into main using --no-ff (creates a merge commit)
git merge --no-ff ui-upgrade/phase-N-description -m "Merge Phase N: [description]"

# USING --no-ff IS IMPORTANT because:
# - It creates a visible merge commit in the history
# - It makes it easy to revert the ENTIRE phase with one command if needed
# - It preserves all individual step commits inside the merge

# STEP 6: Verify the merge worked
npx tsc --noEmit --pretty     # Must still pass
npm run test                  # Must still pass (217 files, 685 tests)
npm run build                 # Must still succeed

# STEP 7: If verification passes — you're done! The phase is on main.
# If verification FAILS — see "Undoing a Bad Merge" below.

# STEP 8 (optional): Delete the phase branch since it's now merged
git branch -d ui-upgrade/phase-N-description
```

#### What If There Are Merge Conflicts?

Merge conflicts should NOT happen with this plan because:
- Each phase branches from main AFTER the previous phase is merged
- No two phases touch the same file at the same time

But IF a conflict somehow occurs:

```bash
# OPTION 1: Abort the merge and investigate (SAFEST)
git merge --abort             # Takes you back to before the merge attempt
                              # Main is untouched, nothing is lost

# OPTION 2: Resolve conflicts (only if you understand what conflicted)
# Git will mark conflicted files. Open each one, look for:
#   <<<<<<< HEAD
#   (code from main)
#   =======
#   (code from the phase branch)
#   >>>>>>> ui-upgrade/phase-N
#
# Choose the correct version, remove the markers, save.
# Then:
git add -A
git commit -m "Merge Phase N: [description] (resolved conflicts)"
#
# Then run ALL 3 verification commands to make sure nothing broke.
```

#### Rollback Procedures (If Something Goes Wrong)

**Scenario 1: A single step within a phase is bad**
```bash
# You're still on the phase branch. Just revert the last commit:
git revert HEAD
# This creates a NEW commit that undoes the bad one.
# Your history is preserved — nothing is lost.
# Run verification commands to confirm the revert fixed things.
```

**Scenario 2: Multiple steps are bad — undo the last N steps**
```bash
# Find how many commits to undo (shows recent commits):
git log --oneline -10

# Revert back to a specific commit (keep everything after it as reverted):
git revert HEAD~N..HEAD       # Reverts the last N commits
# OR interactively revert specific commits:
git revert <commit-hash>      # Revert one specific commit
```

**Scenario 3: The entire phase is bad — throw away the branch**
```bash
# Switch to main (which is still untouched)
git checkout main

# Delete the phase branch entirely
git branch -D ui-upgrade/phase-N-description

# Everything from that phase is gone. Main is exactly as it was.
# Start the phase over fresh if needed:
git checkout -b ui-upgrade/phase-N-description
```

**Scenario 4: A merge into main is bad — undo the merge**
```bash
# Because we used --no-ff, the merge is a single commit we can revert:
git checkout main
git revert -m 1 HEAD          # Reverts the merge commit
                               # -m 1 tells git to revert to the main parent

# Run verification commands to confirm main is back to normal.
```

**Scenario 5: Nuclear option — everything is messed up**
```bash
# WARNING: This destroys ALL local changes and resets to the remote.
# Only use if nothing else works.

git checkout main
git fetch origin
git reset --hard origin/main   # Main is now exactly what's on GitHub

# All local branches still exist but main is clean.
# You can delete branches manually:
git branch -D ui-upgrade/phase-1-bugfixes
git branch -D ui-upgrade/phase-2-tokens
# etc.
```

#### Quick Reference: Commands You'll Use Most

| Situation | Command |
|-----------|---------|
| Start a phase | `git checkout main && git checkout -b ui-upgrade/phase-N-desc` |
| Commit a step | `git add -A && git commit -m "Phase N, Step X: desc"` |
| Merge a phase | `git checkout main && git merge --no-ff ui-upgrade/phase-N-desc -m "Merge Phase N: desc"` |
| Undo last step | `git revert HEAD` |
| Abort a merge | `git merge --abort` |
| Undo a merged phase | `git revert -m 1 HEAD` |
| Throw away a branch | `git checkout main && git branch -D ui-upgrade/phase-N-desc` |
| Nuclear reset | `git checkout main && git reset --hard origin/main` |
| See what branch you're on | `git branch` |
| See recent commits | `git log --oneline -10` |
| See uncommitted changes | `git status` |

#### Phase Dependencies (IMPORTANT)

Phases MUST be merged in order because later phases depend on earlier ones:

```
Phase 1 (bugfixes)      → standalone, no dependencies
Phase 2 (tokens)        → standalone, no dependencies
Phase 3 (colors)        → DEPENDS on Phase 2 (uses the new CSS tokens)
Phase 4 (accessibility) → standalone (can reuse Phase 1 focus patterns)
Phase 5 (interactive)   → standalone
Phase 6 (consistency)   → DEPENDS on Phase 1 Badge fix + Phase 2 tokens
Phase 7 (typography)    → standalone
Phase 8 (hierarchy)     → standalone  
Phase 9 (performance)   → DEPENDS on all previous (splits files that were modified)
```

**What this means**: You cannot skip Phase 2 and do Phase 3, because Phase 3 uses CSS variables that Phase 2 creates. If you want to skip or reorder phases, only the "standalone" ones can be safely reordered.

#### Before You Start: Create a Safety Bookmark

```bash
# Tag the current state of main so you can always get back to "before we started"
git tag ui-upgrade-start-point

# If you EVER need to get back to this exact point:
git checkout main
git reset --hard ui-upgrade-start-point
```

---

## Risk Management Strategy

### Risk Levels Defined

| Level | Meaning | Safeguards |
|-------|---------|------------|
| **ZERO** | CSS-only, adds new properties, no logic changes | Tests + visual check |
| **LOW** | Changes class names or HTML attributes, no logic | Tests + TypeScript + visual check |
| **MEDIUM** | Changes component structure, adds new props | Tests + TypeScript + visual check + targeted manual testing |
| **HIGH** | Refactors component logic, splits files, changes state | Tests + TypeScript + visual + manual test every affected page |

### What Could Go Wrong (and How We Prevent It)

| Risk | Likelihood | Prevention |
|------|-----------|------------|
| Color change makes text unreadable | Medium | We define dark mode variants for every token, test both modes |
| Hover/focus styles overlap or conflict | Low | Using `cn()` which deduplicates classes; only adding, never removing |
| ARIA attributes break tests that match HTML | Low | Run tests after each step; ARIA attrs don't affect rendered content |
| Component library migration changes look/behavior | Medium | Only swap element type + classes; keep all props/handlers identical |
| Code splitting breaks routing | Medium | Test every route after changes; use Suspense fallbacks |
| Tailwind purge removes classes we think are there | Low | Avoid dynamic class construction; use static class maps |
| CSS variable addition causes cascade issues | Very Low | New vars don't override existing; they're additive only |
| **Bad merge corrupts main** | Very Low | Using `--no-ff` merges (revertable) + safety tag + remote backup |
| **Merging phases out of order** | Low | Dependencies documented above; always branch from latest main |
| **Forgetting to switch branches** | Low | Always run `git branch` before making changes to verify |

### Rollback Procedure

See the detailed rollback procedures in the [Git Strategy](#git-strategy--complete-branch--merge-guide) section above. Summary:

| What Went Wrong | Fix | Data Loss |
|----------------|-----|-----------|
| One step is bad | `git revert HEAD` | None |
| Whole phase is bad (not merged) | `git checkout main && git branch -D branch-name` | Phase work lost (main safe) |
| Merged phase is bad | `git revert -m 1 HEAD` | None (creates undo commit) |
| Everything is broken | `git reset --hard ui-upgrade-start-point` | All upgrade work lost (original code restored) |

---

## Current Audit Scores

| Area | Visual | Typo | Color | Spacing | Interactive | Consistency | A11y | Perf | **Avg** |
|------|--------|------|-------|---------|-------------|-------------|------|------|---------|
| Dashboard | 8 | 8 | 5 | 7 | 8 | 8 | 6 | 6 | **7.0** |
| Landing | 8 | 8 | 6 | 8 | 5 | 9 | 5 | 6 | **6.9** |
| Leads | 7 | 7 | 7 | 8 | 8 | 7 | 6 | 7 | **7.1** |
| Communication | 7 | 7 | 8 | 7 | 8 | 7 | 6 | 7 | **7.1** |
| Analytics | 7 | 7 | 6 | 7 | 6 | 6 | 6 | 6 | **6.4** |
| Settings/Admin | 8 | 7 | 5 | 8 | 7 | 6 | 5 | 7 | **6.6** |
| Layout/Shared/UI | 7 | 7 | 7 | 8 | 7 | 6 | 7 | 8 | **7.1** |
| **Column Avg** | **7.4** | **7.3** | **6.3** | **7.6** | **7.0** | **7.0** | **5.9** | **6.7** | **6.9** |

**Worst dimensions**: Accessibility (5.9), Color (6.3), Performance (6.7)

---

## Phase 1 — Production Bug Fixes (P0)

> **Goal**: Fix 4 issues that are actual bugs or WCAG failures in the current code  
> **Risk Level**: LOW  
> **Files touched**: ~5  
> **Score impact**: Fixes critical breakage; +0.3 overall

### Step 1.1 — Fix dynamic Tailwind class purging in AnalyticsDashboard

**The Problem**: `AnalyticsDashboard.tsx` (in `src/pages/analytics/`) uses template literals like `` `bg-${color}-500/10` `` and `` `text-${color}-500` ``. Tailwind's JIT compiler cannot detect these, so the classes are **stripped from the production build**. Colors will be missing when you deploy.

**The Fix**: Replace the dynamic template literal with a static color-map object that maps each color name to its pre-written Tailwind classes. This is a Tailwind-approved pattern.

**Risk**: ZERO — We are only changing how the same classes are referenced, not changing the classes themselves. The visual output is identical (and in production, it will actually START working).

**What could go wrong**: If we miss a color in the map, that one card won't have a color. Easy to catch visually.

**Files changed**: 
- `src/pages/analytics/AnalyticsDashboard.tsx` (1 file)

**Verification**:
```bash
npx tsc --noEmit --pretty       # Must pass
npm run test                     # Must pass: 217 files, 685 tests
npm run build                    # Must succeed
```

---

### Step 1.2 — Fix Badge WCAG contrast failure

**The Problem**: `src/components/ui/Badge.tsx` has `success` and `warning` variants using hardcoded colors:
- `success` → `bg-green-500 text-white` 
- `warning` → `bg-yellow-500 text-white` (contrast ratio ~3.0:1, FAILS WCAG AA which requires 4.5:1)

**The Fix**: Change to soft-fill pattern with high contrast text:
- `success` → `bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400`
- `warning` → `bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400`

**Risk**: LOW — The Badge shape, size, and layout don't change. Only the background and text colors change. This affects every place `<Badge variant="success">` or `<Badge variant="warning">` is used across the site, but the change is purely cosmetic and improves readability.

**What could go wrong**: The new colors might look different from what you expect. You'll see them at the checkpoint.

**Files changed**:
- `src/components/ui/Badge.tsx` (1 file, ~4 lines)

**Verification**: Same 3 commands + visually check any page showing success/warning badges (Leads list, Activity Log)

---

### Step 1.3 — Fix invisible landing page pricing hover

**The Problem**: On the Landing page pricing section, the non-highlighted plan's CTA button has `bg-muted hover:bg-muted` — the hover state is identical to the default state, so it looks like the button is broken/non-interactive.

**The Fix**: Change `hover:bg-muted` to `hover:bg-muted/80` so there's a visible darkening on hover.

**Risk**: ZERO — Adding one class to one button. Purely additive.

**Files changed**:
- `src/pages/LandingPage.tsx` (1 file, 1 line)

**Verification**: Same 3 commands + hover over the pricing CTA on the landing page

---

### Step 1.4 — Fix modal dialog accessibility

**The Problem**: `CustomFieldsManager.tsx` and `TagsManager.tsx` have modal overlays (`fixed inset-0 z-50`) but they're missing:
- `role="dialog"` — screen readers don't know it's a dialog
- `aria-modal="true"` — screen readers don't know it blocks the page
- `aria-label` or `aria-labelledby` — no accessible name
- Focus trapping — keyboard users can Tab behind the modal

**The Fix**: Add the ARIA attributes to the overlay container div. For focus trapping, add `onKeyDown` handler that wraps focus within the modal (or import the same pattern already used in `src/components/ui/Dialog.tsx`).

**Risk**: LOW — We're adding HTML attributes and a keyboard handler. No visual changes. No logic changes. The modal renders exactly the same.

**What could go wrong**: If the focus trap has a bug, pressing Tab might feel different inside the modal. Easy to test manually.

**Files changed**:
- `src/components/settings/CustomFieldsManager.tsx` (1 file)
- `src/components/settings/TagsManager.tsx` (1 file)

**Verification**: Same 3 commands + open a modal in Settings, try pressing Tab to confirm focus stays inside

---

### >>> USER CHECKPOINT 1 <<<

**What to review**:
1. Open the site in your browser
2. Navigate to the **Landing page** → hover over pricing buttons → does the non-highlighted one respond?
3. Navigate to any page showing **Badges** (e.g., Leads list) → do success (green) and warning (amber) badges look good in both light and dark mode?
4. Navigate to **Settings** → open Custom Fields or Tags manager modal → press Tab a few times → does focus stay inside the modal?
5. Run `npm run build` → does it succeed?

**If anything looks wrong**: Tell me exactly what and I'll revert that specific commit.  
**If everything looks good**: I proceed to Phase 2.

---

## Phase 2 — Design Token Foundation

> **Goal**: Add missing CSS variables and Tailwind tokens that all future phases depend on  
> **Risk Level**: ZERO  
> **Files touched**: 2  
> **Score impact**: Enables Phases 3-9; no direct visual change

### Step 2.1 — Add success/warning/info CSS custom properties

**The Problem**: Our design system has `--primary`, `--destructive`, etc., but is missing `--success`, `--warning`, and `--info`. This forces developers to use hardcoded green/yellow/blue classes instead of semantic tokens.

**The Fix**: Add to `src/index.css`:
```css
:root {
  /* ...existing vars... */
  --success: 142 76% 36%;
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%;
  --warning-foreground: 0 0% 100%;
  --info: 199 89% 48%;
  --info-foreground: 0 0% 100%;
}
.dark {
  /* ...existing vars... */
  --success: 142 71% 45%;
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%;
  --warning-foreground: 0 0% 100%;
  --info: 199 89% 48%;
  --info-foreground: 0 0% 100%;
}
```

**Risk**: ZERO — These are brand new CSS variables. Nothing in the codebase references them yet. They have zero effect until we explicitly use them in Phase 3. Existing styles are completely untouched.

**Files changed**:
- `src/index.css` (1 file, ~12 lines added)

---

### Step 2.2 — Register success/warning/info in Tailwind config

**The Fix**: Add to `tailwind.config.js` under `theme.extend.colors`:
```js
success: {
  DEFAULT: 'hsl(var(--success))',
  foreground: 'hsl(var(--success-foreground))',
},
warning: {
  DEFAULT: 'hsl(var(--warning))',
  foreground: 'hsl(var(--warning-foreground))',
},
info: {
  DEFAULT: 'hsl(var(--info))',
  foreground: 'hsl(var(--info-foreground))',
},
```

**Risk**: ZERO — These are new token names that don't conflict with anything existing. Tailwind now recognizes `bg-success`, `text-warning`, etc., but nothing uses them yet.

**Files changed**:
- `tailwind.config.js` (1 file, ~12 lines added)

**Verification for both steps**:
```bash
npx tsc --noEmit --pretty       # Must pass
npm run test                     # Must pass: 217 files, 685 tests
npm run build                    # Must succeed
```

Visual check: Open any page — should look exactly the same. These are invisible foundation changes.

---

### Step 2.3 — Add `prefers-reduced-motion` global rule

**The Fix**: Add to `src/index.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Risk**: ZERO — This only activates when a user has enabled "reduce motion" in their OS accessibility settings. It has zero effect for all other users. It's a CSS-only addition.

**Files changed**:
- `src/index.css` (1 file, ~8 lines added)

**Verification**: Same 3 commands. No visual change for normal users.

---

### >>> USER CHECKPOINT 2 <<<

**What to review**:
1. Open the site → everything should look exactly the same as before (these are invisible foundation changes)
2. Toggle dark mode → everything should still look normal
3. That's it — this phase was purely additive groundwork

**If anything looks different**: Something went wrong — tell me and we revert.  
**If everything looks the same**: Correct! Proceed to Phase 3.

---

## Phase 3 — Color System Cleanup

> **Goal**: Replace all hardcoded colors with semantic tokens — the biggest color score gap  
> **Risk Level**: LOW (cosmetic changes only, all additive class swaps)  
> **Files touched**: ~75  
> **Score impact**: Color 6.3 → 9.5

This is the largest phase. We break it into small sub-groups, each touching files in one area, with verification after each sub-group.

### Step 3.1 — Update Badge to use semantic tokens

**The Fix**: Now that `--success` and `--warning` exist (Phase 2), update Badge.tsx:
- `success` variant → `bg-success/10 text-success hover:bg-success/20 dark:bg-success/20 dark:text-success`
- `warning` variant → `bg-warning/10 text-warning hover:bg-warning/20 dark:bg-warning/20 dark:text-warning`

**Risk**: LOW — Same visual intent, now using the semantic tokens. Every Badge on the site will update.

**What could go wrong**: If the HSL values don't look right, badges might have unexpected colors. Easy to spot.

**Files changed**: `src/components/ui/Badge.tsx` (1 file)

**Verification**: Tests + check badges on Leads list, Activity Log, Dashboard in both light and dark mode.

---

### Step 3.2 — Create centralized chart color system

**The Problem**: `src/lib/chartColors.ts` defines hex colors for all charts. These are hardcoded and don't adapt to dark mode.

**The Fix**: Update the constants in `chartColors.ts` to use CSS-variable-aware values. For Recharts (which needs raw hex, not CSS vars at render time), create a helper function that reads computed CSS variable values at runtime, with static hex fallbacks.

**Risk**: LOW-MEDIUM — Charts could momentarily flash the wrong color if CSS vars aren't computed yet. We mitigate this with the hex fallbacks.

**What could go wrong**: If the helper function has a bug, chart colors might revert to fallbacks (which are the current hex values — so worst case is "no change").

**Files changed**: `src/lib/chartColors.ts` (1 file)

**Verification**: Tests + visually check Dashboard charts, Analytics pages in both modes.

---

### Step 3.3 — Replace hardcoded colors in Dashboard page

**The Fix**: In `src/pages/dashboard/Dashboard.tsx`, replace inline hex colors used for charts/KPIs (like `#3b82f6`, `#10b981`) with values from the centralized `chartColors.ts`.

**Risk**: LOW — Swapping where the color value comes from, not changing the actual value.

**Files changed**: `src/pages/dashboard/Dashboard.tsx` (1 file)

---

### Step 3.4 — Replace hardcoded colors in Analytics pages (10 files)

**The Fix**: Go through each analytics page and replace:
- Raw hex values (`#3b82f6`, `#10b981`, `#f59e0b`, `#ef4444`) → `chartColors` imports
- Hardcoded Tailwind (`text-green-600`, `text-blue-600`, `text-red-600`) → semantic tokens (`text-success`, `text-primary`, `text-destructive`)
- `focus:ring-blue-500` → `focus-visible:ring-ring`

**Files**: 
- `src/pages/analytics/AnalyticsDashboard.tsx`
- `src/pages/analytics/FollowUpAnalytics.tsx`
- `src/pages/analytics/LeadAnalytics.tsx`
- `src/pages/analytics/ConversionReports.tsx`
- `src/pages/analytics/AttributionReport.tsx`
- `src/pages/analytics/GoalTracking.tsx`
- `src/pages/analytics/LeadVelocity.tsx`
- `src/pages/analytics/SourceROI.tsx`
- `src/pages/analytics/PeriodComparison.tsx`
- `src/pages/analytics/CustomReports.tsx`
- `src/pages/analytics/UsageAnalytics.tsx`

**Risk**: LOW — Each file gets the same treatment: swap color references. No logic changes.

**What could go wrong**: A chart might show the wrong color if we map incorrectly. Each file should be verified visually.

**Verification**: Tests + visually spot-check 2-3 analytics pages in both light and dark mode.

---

### Step 3.5 — Replace hardcoded colors in Campaign pages (4 files)

**Files**:
- `src/pages/campaigns/CampaignAnalytics.tsx`
- `src/pages/campaigns/CampaignDetail.tsx`
- `src/pages/campaigns/CampaignReports.tsx`
- `src/pages/campaigns/CampaignsOverview.tsx`

**Risk**: LOW — Same pattern as Step 3.4.

---

### Step 3.6 — Replace hardcoded colors in AI pages (5 files)

**Files**:
- `src/pages/ai/AIAnalytics.tsx`
- `src/pages/ai/AICostDashboard.tsx`
- `src/pages/ai/InsightsTab.tsx`
- `src/pages/ai/LeadScoring.tsx`
- `src/pages/ai/PredictionsTab.tsx`

**Risk**: LOW — Same pattern.

---

### Step 3.7 — Replace hardcoded colors in Leads pages

**Files**:
- `src/pages/leads/LeadsOverview.tsx`
- `src/pages/leads/list/LeadCharts.tsx`
- Any lead-related components with hardcoded activity icon colors

**Risk**: LOW — Same pattern.

---

### Step 3.8 — Replace hardcoded colors in SetupWizard (~30 instances)

**File**: `src/components/onboarding/SetupWizard.tsx`

**The Problem**: This single file has ~30 hardcoded color instances: `bg-blue-600`, `bg-emerald-600`, `bg-amber-500`, `focus:ring-blue-500`, etc.

**The Fix**: Replace each with its semantic equivalent:
- `bg-blue-600` → `bg-primary`
- `bg-emerald-600` → `bg-success`  
- `bg-amber-500` → `bg-warning`
- `focus:ring-blue-500` → `focus-visible:ring-ring`
- `text-blue-600` → `text-primary`
- `text-emerald-600` → `text-success`

**Risk**: LOW — Purely class swaps. The wizard layout and logic don't change at all.

**What could go wrong**: A step indicator or button might change shade slightly. Easy to verify visually.

**Files changed**: `src/components/onboarding/SetupWizard.tsx` (1 file)

---

### Step 3.9 — Replace hardcoded colors in Admin components

**Files**:
- `src/components/admin/ActivityLog.tsx` (green/blue/red status colors)
- `src/components/admin/OrganizationHeader.tsx` (tier badge colors)
- `src/components/admin/SubscriptionStatus.tsx`

**Risk**: LOW — Same class-swap pattern.

---

### Step 3.10 — Replace hardcoded colors in Communication pages

**The Problem**: Enhance/script panels have dark mode issues.

**The Fix**: Replace any hardcoded colors with their semantic + dark-mode-safe equivalents.

**Risk**: LOW — Cosmetic changes only.

**Files**: Communication-related components under `src/components/` and `src/pages/communication/`

---

### Step 3.11 — Replace hardcoded colors in Layout/Shared components

**Files**:
- `src/components/ui/ToastContainer.tsx`
- `src/components/ui/ErrorBanner.tsx`
- Any remaining files in `src/components/shared/` with hardcoded colors

**Risk**: LOW — These are widely-used components, but changes are CSS-class-only.

---

### Step 3.12 — Sweep remaining hardcoded color files

Run a final grep for any remaining hardcoded color patterns:
```bash
grep -rn "bg-\(red\|green\|blue\|yellow\|orange\|purple\|pink\|emerald\|amber\|indigo\|sky\|teal\)-" src/ --include="*.tsx" | grep -v "test" | grep -v "__tests__"
```

Fix any stragglers found.

**Risk**: LOW — Same pattern as all above.

**Verification for entire Phase 3**:
```bash
npx tsc --noEmit --pretty       # Must pass
npm run test                     # Must pass: 217 files, 685 tests
npm run build                    # Must succeed — AND no "unused CSS" warnings
```

---

### >>> USER CHECKPOINT 3 <<<

**What to review** (this is the big one — take your time):

1. **Light Mode Pass**:
   - [ ] Dashboard → Are chart colors visible and distinguishable?
   - [ ] Analytics Dashboard → Do all cards in the "Explore More" grid have colors?
   - [ ] FollowUp Analytics → Do priority colors and KPI text look right?
   - [ ] Leads list → Do badges look correct?
   - [ ] Settings → Do all Setup Wizard steps have colored indicators?
   - [ ] Admin → Do activity log entries have status colors?
   - [ ] Landing page → Do all sections look normal?

2. **Dark Mode Pass** (toggle dark mode, repeat):
   - [ ] Same pages as above — do all colors swap appropriately?
   - [ ] Is any text unreadable against its background?
   - [ ] Do badges still look good?
   - [ ] Do charts still have visible, distinguishable colors?

3. **Production Build**:
   - [ ] Run `npm run build` — no errors
   - [ ] Serve the build locally and spot-check 2-3 pages

**If any colors look wrong**: Tell me the specific page/element and I fix or revert just that step.  
**If everything looks right**: Proceed to Phase 4.

---

## Phase 4 — Accessibility Overhaul

> **Goal**: Bring Accessibility from 5.9 to 10  
> **Risk Level**: LOW (adding HTML attributes and CSS classes — no logic changes)  
> **Files touched**: ~130  
> **Score impact**: Accessibility 5.9 → 10

### Step 4.1 — Add focus-visible rings to UI primitive components

**The Fix**: Update the base interactive components so ALL consumers automatically get focus styles:
- `src/components/ui/Button.tsx` — ensure all variants include `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- `src/components/ui/Input.tsx` — same
- `src/components/ui/Select.tsx` — same
- `src/components/ui/Textarea.tsx` — same
- `src/components/ui/Tabs.tsx` — same for tab triggers

**Risk**: ZERO — `focus-visible` only shows on keyboard navigation, never on mouse click. Adding it won't change any visual appearance for mouse users.

**What could go wrong**: The ring color or offset might look slightly unexpected on some backgrounds. Easy to spot.

**Files changed**: 5 UI primitive files

---

### Step 4.2 — Add focus-visible rings to Landing page elements

**The Problem**: Zero keyboard focus indicators on the entire Landing page.

**The Fix**: Add `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` to:
- All CTA buttons (if not using `<Button>`)
- Feature cards
- Pricing cards
- Navigation links
- Interactive sections

**Risk**: ZERO — Purely additive CSS, only visible on keyboard focus.

**Files changed**: `src/pages/LandingPage.tsx` (1 file)

---

### Step 4.3 — Add focus-visible to interactive non-button elements (Analytics)

**The Problem**: `AttributionReport.tsx` model selector buttons, `LeadAnalytics.tsx` source items, `ConversionReports.tsx` funnel items have `tabIndex={0}` but no focus styling.

**The Fix**: Add `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` and `outline-none` to these elements.

**Risk**: ZERO — CSS-only addition.

**Files changed**: ~3-5 analytics files

---

### Step 4.4 — Add focus-visible to remaining ~90 files

**The Work**: Systematic pass through all files identified in the audit as having interactive elements without focus styles (101 files total minus those already fixed).

**Approach**: For each file:
1. Find all clickable elements (`onClick`, `<a>`, non-`<Button>` buttons)
2. Add `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none`
3. If the element is a `<div>` with `onClick` but no `tabIndex`, add `tabIndex={0}` and `role="button"`

**Risk**: LOW — CSS additions. The `tabIndex` additions make previously non-focusable elements focusable, which is the correct accessibility behavior.

**What could go wrong**: A `tabIndex` in the wrong place could make Tab order confusing. We mitigate by only adding `tabIndex={0}` (document order) and verifying at the checkpoint.

**Files changed**: ~90 files (done methodically in sub-batches of 10-15 files at a time, each committed separately)

---

### Step 4.5 — Add ARIA menu roles to ProfileDropdown and Breadcrumbs

**The Fix**:
- `src/components/layout/ProfileDropdown.tsx`: Add `role="menu"` to dropdown container, `role="menuitem"` to each item, `aria-haspopup="true"` and `aria-expanded` to trigger button
- `src/components/layout/Breadcrumbs.tsx`: Same pattern for the ellipsis dropdown

**Risk**: LOW — HTML attribute additions. No visual changes. No logic changes.

**What could go wrong**: If `role="menu"` is on the wrong element, screen readers might navigate unexpectedly. We test with Tab key and verify the focus flow.

**Files changed**: 2 files

---

### Step 4.6 — Add aria-live regions for dynamic content

**The Fix**: Wrap dynamic content areas with `aria-live="polite"`:
- Communication inbox — new message count / incoming messages
- Leads list — result count after filtering/pagination
- Analytics — chart data region after date range changes
- Any toast/notification system not already covered

**Implementation**: Add a `<div aria-live="polite" className="sr-only">` that announces changes, or add `aria-live` directly to the changing content container.

**Risk**: LOW — `aria-live` has zero visual impact. It only affects screen reader announcements.

**What could go wrong**: If `aria-live="assertive"` is used (instead of `"polite"`), it might interrupt screen reader users aggressively. We use `"polite"` by default.

**Files changed**: ~8-10 files

---

### Step 4.7 — Add accessible labels to DateRangePicker

**The Fix**: In `src/components/ui/DateRangePicker.tsx` (or wherever it lives):
- Add `aria-label="Start date"` and `aria-label="End date"` to the date inputs
- Add `aria-label` to the period select dropdown

**Risk**: ZERO — HTML attributes only.

**Files changed**: 1 file

---

### Step 4.8 — Add aria-pressed to toggle buttons

**The Fix**: In `AttributionReport.tsx` and any other files with toggle-style buttons:
- Add `aria-pressed={isSelected}` to buttons that toggle between states

**Risk**: ZERO — HTML attribute only.

**Files changed**: ~3 files

---

### Step 4.9 — Make Contact List keyboard navigable

**The Fix**: In the Communication contact list component:
- Add `role="listbox"` to the container
- Add `role="option"` to each contact item
- Add `tabIndex={0}` and `onKeyDown` handler for arrow key navigation
- Add `aria-selected` for the active contact

**Risk**: LOW — Adding keyboard interaction where there was none. No existing behavior is changed.

**What could go wrong**: Arrow key navigation might feel unexpected. We test it manually at the checkpoint.

**Files changed**: 1-2 files

---

### Step 4.10 — Fix heading hierarchy across all pages

**The Work**: Audit every page for:
- Skipped heading levels (h1 → h3 with no h2)
- Multiple h1 elements on a single page
- Headings that should be h2 being marked as h3 or div

**Risk**: LOW — Changing `<h3>` to `<h2>` etc. could slightly change default font sizes, but since we use Tailwind text classes, the actual rendered size is unaffected.

**Files changed**: ~5-8 files

---

### Step 4.11 — Ensure 44x44px touch targets on mobile

**The Work**: Audit small icon-only buttons (common pattern: `<button className="w-8 h-8">`) and add:
- `min-w-[44px] min-h-[44px]` (or increase padding)
- Only applies on mobile via `md:min-w-0 md:min-h-0` if desktop spacing is too wide

**Risk**: LOW — May slightly increase spacing on mobile, but that improves usability.

**Files changed**: ~10-15 files

---

**Verification for entire Phase 4**:
```bash
npx tsc --noEmit --pretty       # Must pass
npm run test                     # Must pass: 217 files, 685 tests
npm run build                    # Must succeed
```

---

### >>> USER CHECKPOINT 4 <<<

**What to review** (keyboard testing focus):

1. **Keyboard Navigation Test**:
   - [ ] Open the site, don't touch the mouse
   - [ ] Press Tab repeatedly — do you see a visible blue ring moving through interactive elements?
   - [ ] Does Tab move in a logical order (top to bottom, left to right)?
   - [ ] Do modals trap focus when open? (Settings → Custom Fields → Add Field)
   - [ ] Press Escape to close modals — does it work?

2. **Landing Page Tab Test**:
   - [ ] Navigate to landing page with keyboard only
   - [ ] Tab through all CTAs, pricing cards, navigation
   - [ ] Every interactive element should have a visible focus ring

3. **Communication Contact List**:
   - [ ] Click into a contact, then use arrow keys — does selection move?

4. **Profile Dropdown**:
   - [ ] Tab to the profile icon, press Enter — does the menu open?
   - [ ] Arrow keys should navigate between menu items

5. **Visual Check**: Everything should look identical to mouse users — focus rings only appear on keyboard interaction.

**If Tab order feels wrong or rings are missing somewhere**: Tell me exactly where.  
**If everything works**: Proceed to Phase 5.

---

## Phase 5 — Interactive States Polish

> **Goal**: Every interactive element has hover, focus, active, disabled, and loading states  
> **Risk Level**: LOW (CSS additions only)  
> **Files touched**: ~80  
> **Score impact**: Interactive States 7.0 → 10

### Step 5.1 — Add active:scale press feedback to Button component

**The Fix**: Add `active:scale-[0.98]` to the base Button variant in `src/components/ui/Button.tsx`.

**Risk**: ZERO — Subtle 2% scale reduction on click. Only visible during the press. Every button on the site benefits.

**Files changed**: 1 file

---

### Step 5.2 — Add hover states to 21 files missing them

**The Work**: Each file with clickable items but no `hover:` classes gets:
- List items: `hover:bg-muted/50 transition-colors duration-150`
- Card items: `hover:shadow-md hover:border-primary/20 transition-all duration-200`
- Links: `hover:text-primary`

**Risk**: ZERO — Purely additive CSS. Mouse-only effect.

**Files changed**: ~21 files

---

### Step 5.3 — Add transitions to 54 files with onClick but no transition

**The Fix**: Add `transition-colors duration-150` (or `transition-all duration-200` for elements with transforms) to interactive elements.

**Risk**: ZERO — Adds smooth color transitions instead of instant changes. Purely cosmetic.

**Files changed**: ~54 files (done in sub-batches of 10-15, each committed separately)

---

### Step 5.4 — Ensure consistent disabled states

**The Work**: Audit all buttons, inputs, and form controls for proper `disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none`.

**Risk**: ZERO — Only affects already-disabled elements.

**Files changed**: ~5-10 files

---

### Step 5.5 — Verify error states for data-fetching components

**The Work**: Audit all components using TanStack Query for proper error UI (icon + message + retry button). Add where missing.

**Risk**: LOW — Adding error fallback rendering that only shows when an API call fails.

**Files changed**: ~5-8 files

---

**Verification**:
```bash
npx tsc --noEmit --pretty && npm run test && npm run build
```

---

### >>> USER CHECKPOINT 5 <<<

**What to review**:

1. **Hover Test**:
   - [ ] Mouse over sidebar items — do they highlight smoothly?
   - [ ] Mouse over cards on Dashboard — subtle shadow/border effect?
   - [ ] Mouse over table rows (Leads, Contacts) — do they highlight?
   - [ ] Mouse over buttons — do they darken smoothly?

2. **Press Test**:
   - [ ] Click and hold any button — does it shrink slightly (subtle press effect)?
   - [ ] Release — does it spring back?

3. **Transition Smoothness**:
   - [ ] All hover effects should fade in/out smoothly, not snap instantly
   - [ ] No elements should "jump" or shift position on hover

**If any hover feels wrong or transitions are janky**: Tell me which element.  
**If everything feels smooth**: Proceed to Phase 6.

---

## Phase 6 — Consistency Standardization

> **Goal**: Same elements look and work the same everywhere (including all 9 filter UIs)  
> **Risk Level**: LOW-MEDIUM (replacing HTML elements with component library)  
> **Files touched**: ~57  
> **Score impact**: Consistency 7.0 → 10

### Step 6.1 — Migrate Admin components to design system components

**The Fix**: Replace raw HTML elements with shared components:
- `<button className="...">` → `<Button variant="..." size="...">`
- `<input className="...">` → `<Input className="...">`
- `<select className="...">` → `<Select ...>`

**Files**:
- `src/components/admin/TeamManagement.tsx`
- `src/components/admin/ActivityLog.tsx`
- `src/components/admin/SubscriptionStatus.tsx`

**Risk**: MEDIUM — Changing the DOM element type. The shared components have built-in styling, event handling, and accessibility features. We need to ensure all existing props/handlers are preserved.

**What could go wrong**: 
- A button might look slightly different (padding, font-size) because the `Button` component has its own styles
- An `onChange` handler might need adjustment if `Select` has a different callback signature than raw `<select>`

**Mitigation**: Compare before/after screenshots of each admin page.

**Files changed**: 3 files

---

### Step 6.2 — Migrate Onboarding components to design system

**Files**:
- `src/components/onboarding/SetupWizard.tsx` (the biggest file — many raw inputs/buttons)
- `src/components/onboarding/GettingStarted.tsx`

**Risk**: MEDIUM — Same as Step 6.1. SetupWizard is a complex form with many inputs.

**Mitigation**: Test the full wizard flow end-to-end after changes.

**Files changed**: 2 files

---

### Step 6.3 — Migrate DateRangePicker to design system primitives

**The Fix**: Replace raw `<select>` with `<Select>` and raw `<input type="date">` with `<Input type="date">` in the DateRangePicker component.

**Risk**: LOW-MEDIUM — The DateRangePicker is used in many analytics pages. Changing its internal elements could slightly alter layout.

**Mitigation**: Check 2-3 pages that use DateRangePicker.

**Files changed**: 1 file

---

### Step 6.4 — Standardize page headers to use PageHeader component

**The Work**: Find all pages using raw `<h1>` elements and replace with `<PageHeader>` component (which provides consistent icon, title, action button layout).

**Risk**: LOW — The PageHeader component already exists. We're just using it more widely. Visual change is intentional (consistent headers).

**What could go wrong**: Some pages might look slightly different because PageHeader has its own spacing/layout.

**Files changed**: ~10-15 files

---

### Step 6.5 — Standardize loading states to LoadingSkeleton

**The Fix**: Replace inline `animate-pulse` divs with the existing `LoadingSkeleton` component.

**Risk**: ZERO — Both produce the same visual effect (pulsing gray rectangles). We're just consolidating to one implementation.

**Files changed**: ~8 files

---

### Step 6.6 — Replace `<a href>` with React Router `<Link>`

**The Fix**: Find any `<a href="/...">` tags used for internal navigation and replace with `<Link to="/...">`. This prevents full page reloads.

**Risk**: LOW — Same navigation, just no page reload.

**Files changed**: ~3 files

---

### Step 6.7 — Convert template literal classNames to cn()

**The Fix**: Find ~14 instances of `` className={`...${condition ? 'a' : 'b'}...`} `` and convert to `className={cn('base-classes', condition && 'conditional-classes')}`.

**Risk**: ZERO — Same output, cleaner pattern, better class deduplication.

**Files changed**: ~14 files

---

### Step 6.8 — Standardize filter UIs across all pages

**The Problem**: There are **9 different filter UI patterns** across the app — different containers, button styles, input styling, label styling, and apply/clear button layouts. Full audit:

| # | Location | Current Pattern |
|---|----------|----------------|
| 1 | `src/components/filters/AdvancedFilters.tsx` | Slide-out side panel (`fixed w-80 shadow-xl border-r`) |
| 2 | `src/pages/communication/inbox/FilterModal.tsx` | Centered modal dialog (`fixed inset-0 bg-black/50`, `max-w-md`) |
| 3 | `src/pages/dashboard/Dashboard.tsx` | Collapsible `<Card>` panel with `grid md:grid-cols-3` |
| 4 | `src/pages/admin/AuditTrail.tsx` | Collapsible raw div (`bg-card border border-border rounded-lg p-4 grid md:grid-cols-4`) |
| 5 | `src/pages/activity/ActivityPage.tsx` | Expandable inline row (`flex items-end gap-4 pt-2 border-t`) |
| 6 | `src/pages/tasks/TasksPage.tsx` | Expandable inline row (`mt-4 pt-4 border-t flex items-center gap-4`) |
| 7 | `src/pages/notifications/NotificationsPage.tsx` | Horizontal button tabs (always visible) |
| 8 | `src/pages/leads/LeadsPipeline.tsx` | Absolute dropdown (`absolute w-64 rounded-lg border bg-popover shadow-lg`) |
| 9 | `src/pages/analytics/CustomReports.tsx` | Tab bar + category card grid |

**Key inconsistencies to fix**:

1. **Filter trigger button** — 4 different styles:
   - Dashboard/Activity/Tasks: `<Button variant="outline" size="sm">` (correct)
   - Audit Trail: raw `<button>` with custom classes `px-4 py-2 bg-card border border-border rounded-lg` (should use `<Button>`)
   - Notifications: `<Button>` without `size="sm"` (inconsistent sizing)

2. **Select/Input elements** — 4 different class patterns:
   - Dashboard: `w-full px-3 py-2 text-sm border rounded-md`
   - Audit Trail: `w-full rounded-lg border-border text-sm` (uses `rounded-lg`, missing padding)
   - Activity: `w-full rounded-md border border-input bg-background px-3 py-2 text-sm`
   - Tasks: `text-sm border rounded-md px-2 py-1.5 bg-background` (different padding)

3. **Labels** — 3 different styles:
   - Dashboard: `text-sm font-medium mb-1 block`
   - Audit Trail: `block text-sm font-medium text-foreground mb-1`
   - Activity: `text-xs font-medium text-muted-foreground mb-1 block` (smaller, muted)
   - Tasks: `<Label>` component (correct)

4. **Apply/Clear buttons** — 4 different layouts:
   - AdvancedFilters: stacked full-width (`w-full space-y-2`)
   - Inbox Modal: side-by-side (`flex justify-between gap-2 pt-2 border-t`)
   - Dashboard: side-by-side (`mt-4 flex gap-2`)
   - Activity/Tasks: single inline Clear ghost button
   - Audit Trail: no apply/clear at all

5. **Border radius** — mixed `rounded-md` vs `rounded-lg`

6. **Collapsible panel containers** — Dashboard uses `<Card>`, Audit Trail uses raw div

**The Fix — Standardize to these patterns**:

- **Filter trigger button**: Always `<Button variant="outline" size="sm">` with `<Filter className="h-4 w-4 mr-2" />` icon
- **Collapsible filter panel**: Always `<Card><CardContent className="pt-6">` with consistent grid
- **Select/Input elements**: Always use `<Select>` / `<Input>` design system components (or raw elements with class `w-full rounded-md border border-input bg-background px-3 py-2 text-sm`)
- **Labels**: Always `<Label>` component or `text-sm font-medium text-foreground mb-1 block`
- **Apply/Clear row**: Side-by-side with `flex gap-2 mt-4` — Apply as `<Button size="sm">`, Clear as `<Button size="sm" variant="outline">`
- **Simple category filters** (Notifications, tab bars): Keep as horizontal `<Button>` row with `variant="default"` / `variant="outline"` toggle, always `size="sm"`

**Files changed**:
- `src/pages/dashboard/Dashboard.tsx` — normalize select/label classes
- `src/pages/admin/AuditTrail.tsx` — replace raw button with `<Button>`, raw div with `<Card>`, normalize selects
- `src/pages/activity/ActivityPage.tsx` — normalize labels from `text-xs` to `text-sm`, use `<Label>`, wrap in `<Card>`
- `src/pages/tasks/TasksPage.tsx` — normalize select classes to match standard
- `src/pages/communication/inbox/FilterModal.tsx` — normalize button layout to match standard
- `src/pages/notifications/NotificationsPage.tsx` — add `size="sm"` to filter buttons
- `src/components/filters/AdvancedFilters.tsx` — adjust apply/clear layout to side-by-side

**Risk**: LOW-MEDIUM — Visual changes to filter areas on ~7 pages. All logic and filter behavior stays the same. Only container/styling changes.

**What could go wrong**: Filter panels may look slightly different in width/spacing. Verify each page visually at checkpoint.

---

**Verification**:
```bash
npx tsc --noEmit --pretty && npm run test && npm run build
```

---

### >>> USER CHECKPOINT 6 <<<

**What to review** (this phase has visual changes):

1. **Admin Pages**:
   - [ ] Team Management → do buttons look like the rest of the site's buttons?
   - [ ] Activity Log → do filters and action buttons look consistent?
   - [ ] Subscription Status → does the page look normal?

2. **Setup Wizard**:
   - [ ] Start the onboarding wizard flow
   - [ ] Click through each step — do inputs, buttons, dropdowns look consistent with the rest of the site?
   - [ ] Does the wizard complete successfully?

3. **Page Headers**:
   - [ ] Navigate through several pages — do all page headers have a consistent format?
   - [ ] No pages should have a raw unstyled h1

4. **DateRangePicker**:
   - [ ] On any analytics page, use the date range picker — does it still work correctly?
   - [ ] Do the dropdowns and date inputs match the site's design?

5. **Filter UIs** (new — verify consistency across all filter areas):
   - [ ] Dashboard → click Filter button → does panel use Card container with consistent selects?
   - [ ] Admin → Audit Trail → does filter button match `<Button>` component style? Does panel use Card?
   - [ ] Activity page → click More Filters → are labels `text-sm` (not `text-xs`)? Inputs consistent?
   - [ ] Tasks page → click More Filters → do selects match Activity page selects exactly?
   - [ ] Notifications → are filter buttons all `size="sm"` and uniform?
   - [ ] Inbox → open filter modal → is Apply/Clear button layout consistent with Dashboard?
   - [ ] Leads → Advanced Filters panel → is Apply/Clear layout side-by-side?
   - [ ] **Key test**: Compare any two filter UIs side-by-side — selects, labels, and buttons should look identical

**If anything looks inconsistent or doesn't work**: Tell me which page and element.  
**If everything looks unified**: Proceed to Phase 7.

---

## Phase 7 — Typography Refinement

> **Goal**: Consistent, readable typography across all pages  
> **Risk Level**: LOW (CSS class changes only)  
> **Files touched**: ~30  
> **Score impact**: Typography 7.3 → 10

### Step 7.1 — Standardize heading sizes

**The Rule**:
| Level | Class | Usage |
|-------|-------|-------|
| h1 (page title) | `text-2xl font-semibold` | One per page, in PageHeader |
| h2 (section) | `text-lg font-semibold` | Card/section headers |
| h3 (subsection) | `text-base font-medium` | Sub-section headers |

**The Work**: Audit all headings and normalize to this scale. Admin pages currently use `text-lg` for page-level headings — bump to `text-2xl`.

**Risk**: LOW — Only changes font size classes. Layout may shift slightly if a heading gets larger/smaller.

**Files changed**: ~10 files

---

### Step 7.2 — Add explicit line-height control

**The Fix**: Add `leading-relaxed` (1.625) to body text containers and `leading-tight` (1.25) to headings where missing.

**Risk**: ZERO — May add a few pixels of vertical space.

**Files changed**: ~15-20 files

---

### Step 7.3 — Enforce readable line lengths

**The Fix**: Add `max-w-prose` (~65 characters) to long-form text blocks (help pages, descriptions, onboarding text).

**Risk**: ZERO — Constrains text width. Layout won't break because `max-w-prose` allows the element to be smaller.

**Files changed**: ~5 files

---

**Verification**:
```bash
npx tsc --noEmit --pretty && npm run test && npm run build
```

---

### >>> USER CHECKPOINT 7 <<<

**What to review**:

1. [ ] Navigate to several different pages — do all page headings feel like the same size/weight?
2. [ ] Read a paragraph of text — does it feel comfortable to read (not too wide)?
3. [ ] Compare admin pages to analytics pages — do headings match?

**If any text feels wrong**: Tell me.  
**If typography feels consistent**: Proceed to Phase 8.

---

## Phase 8 — Visual Hierarchy & Spacing

> **Goal**: Clear visual flow, consistent spacing, good use of whitespace  
> **Risk Level**: LOW (CSS spacing changes)  
> **Files touched**: ~30  
> **Score impact**: Visual Hierarchy 7.4 → 10, Spacing 7.6 → 10

### Step 8.1 — Normalize outer page padding

**The Fix**: Ensure all page containers use consistent padding. Standardize to whatever the `MainLayout` wrapper provides, and remove duplicate padding from individual pages.

**Risk**: LOW — May shift content slightly if some pages had extra padding.

**Files changed**: ~5-10 files

---

### Step 8.2 — Improve section spacing with Gestalt proximity

**The Fix**: Add more space between unrelated groups (sections) and less within groups (related items). Replace inconsistent `mb-4`/`mb-8` with `space-y-6` (within section) and `space-y-10` or `space-y-12` (between sections).

**Risk**: LOW — Spacing-only changes. No functionality affected.

**Files changed**: ~10 files

---

### Step 8.3 — Reduce visual noise on Analytics Dashboard

**The Problem**: 4 KPIs + 5 charts + 3 stats + 9 navigation cards all compete for attention.

**The Fix**: 
- Add clear section dividers/headings between groups
- Collapse the "Explore More" grid by default with a toggle
- Ensure primary KPIs have the most visual weight

**Risk**: MEDIUM — Progressive disclosure changes flow. The collapse/expand toggle is a behavior change.

**What could go wrong**: Users might not find the collapsed section initially.

**Mitigation**: Add a clear "Show More Analytics" button with a count badge.

**Files changed**: 1-2 files

---

### Step 8.4 — Improve empty states across list/table views

**The Fix**: Use the `PageEmptyState` component (already exists in `src/components/ui/`) for all empty list states. Add proper icons, descriptions, and CTAs.

**Risk**: ZERO — Only affects empty states (when no data is present).

**Files changed**: ~8 files

---

### Step 8.5 — Responsive audit and fixes

**The Work**: Test every major page at 375px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop). Fix:
- Overflow/horizontal scroll issues
- Text truncation
- Grid collapse behavior
- Sidebar visibility

**Risk**: LOW — CSS breakpoint additions. Desktop view is unaffected.

**Files changed**: ~10-20 files

---

**Verification**:
```bash
npx tsc --noEmit --pretty && npm run test && npm run build
```

---

### >>> USER CHECKPOINT 8 <<<

**What to review**:

1. **Desktop**:
   - [ ] Dashboard — is there clear visual separation between KPIs, charts, and navigation?
   - [ ] Analytics Dashboard — is the layout less cluttered?
   - [ ] Do pages feel well-spaced and organized?

2. **Mobile** (resize browser to ~375px or use DevTools):
   - [ ] Does the sidebar collapse properly?
   - [ ] Do tables become scrollable (not overflow the page)?
   - [ ] Are buttons/inputs large enough to tap?
   - [ ] Is any text cut off or overlapping?

3. **Tablet** (~768px):
   - [ ] Do grids stack from 3-4 columns to 2 columns?
   - [ ] Does navigation still work?

**If any layout is broken at any size**: Tell me the page and viewport width.  
**If everything looks good**: Proceed to Phase 9 (final phase).

---

## Phase 9 — Performance Optimization

> **Goal**: Fast loads, no layout shift, proper code splitting  
> **Risk Level**: MEDIUM-HIGH (structural changes to component files and routing)  
> **Files touched**: ~25  
> **Score impact**: Performance 6.7 → 10

**IMPORTANT**: This is the highest-risk phase. Each step is committed separately, and we verify routing + rendering between each step.

### Step 9.1 — Add route-level code splitting in App.tsx

**The Fix**: The router already uses `React.lazy()` for page imports (confirmed from the subagent research). Verify all routes use `<Suspense>` fallbacks with `<LoadingSkeleton>`.

**Risk**: LOW if lazy imports are already there. We're just adding/improving Suspense fallbacks.

**What could go wrong**: A missing Suspense boundary causes a React error. Caught by tests.

**Files changed**: 1 file (`src/App.tsx`)

---

### Step 9.2 — Split AnalyticsDashboard.tsx (1750 lines)

**The Fix**: Extract logical sections into sub-components:
- KPI cards → `AnalyticsKPICards.tsx`
- Charts section → `AnalyticsCharts.tsx`
- Explore grid → `AnalyticsExploreGrid.tsx`
- Stats section → `AnalyticsStats.tsx`

Each extracted component is loaded via `React.lazy()` with a `<Suspense>` skeleton.

**Risk**: MEDIUM — Component extraction can break if props/state aren't passed correctly. Internal state that was shared between sections needs to be lifted up or passed down.

**What could go wrong**: 
- A section might not render because a prop is missing
- State that was in the parent might not reach a child
- Tests for the page might fail because the component tree changed

**Mitigation**: Extract one section at a time, running tests after each extraction.

**Files changed**: 1 existing + 3-4 new files

---

### Step 9.3 — Split LeadsList.tsx (950 lines)

**The Fix**: Similar extraction:
- Filters panel → `LeadsFilters.tsx`
- Table view → `LeadsTable.tsx`
- Pagination → `LeadsPagination.tsx`
- Charts → already in `LeadCharts.tsx`

**Risk**: MEDIUM — Same risks as Step 9.2. LeadsList has 20+ useState hooks, so state management needs careful attention.

**Mitigation**: Move state into a `useLeadsListState` custom hook that all sub-components consume.

**Files changed**: 1 existing + 3 new files + 1 hook file

---

### Step 9.4 — Lazy-load Recharts

**The Fix**: Create a wrapper component that loads Recharts lazily:
```tsx
const LazyBarChart = React.lazy(() => import('recharts').then(m => ({ default: m.BarChart })));
```

Wrap each chart usage in `<Suspense fallback={<ChartSkeleton />}>`.

**Risk**: MEDIUM — Charts will show a skeleton briefly on first render. If the lazy import fails, the fallback stays forever.

**What could go wrong**: 
- Import path might not work with tree-shaking
- SSR (if ever added) won't work with `React.lazy`
- A slight layout shift if the skeleton isn't the same size as the chart

**Mitigation**: Match skeleton dimensions to chart container dimensions exactly.

**Files changed**: 1 wrapper file + ~22 chart-containing files

---

### Step 9.5 — Consolidate LeadsList state with useReducer

**The Fix**: Replace 20+ `useState` hooks with a `useReducer` + context pattern. This reduces re-renders because changing one piece of state doesn't trigger re-evaluation of all 20+ hooks.

**Risk**: HIGH — This is a logic refactor, not a cosmetic change. Behavior could change if the reducer doesn't exactly replicate the current state transitions.

**What could go wrong**: 
- A state update might not trigger a re-render where it should
- Side effects in `useEffect` that depend on specific state values might fire differently
- Tests that mock individual state values might break

**Mitigation**: 
1. Write the reducer first, mapping each existing `setState` call to a dispatch action
2. Run ALL tests after the change
3. Manually test: filtering, sorting, pagination, bulk actions, search

**Files changed**: 1-2 files

---

### Step 9.6 — Add Suspense boundaries with LoadingSkeleton

**The Fix**: Wrap all lazy-loaded sections in `<Suspense fallback={<LoadingSkeleton />}>` to prevent layout shift during chunk loading.

**Risk**: LOW — Adds fallback rendering. No behavior change when content is already loaded.

**Files changed**: ~10 files

---

**Verification for entire Phase 9** (EXTRA THOROUGH):
```bash
# Standard checks
npx tsc --noEmit --pretty
npm run test
npm run build

# Performance-specific checks
npm run build && ls -la dist/assets/*.js  # Check chunk sizes are reasonable
npx vite preview                          # Serve production build locally

# Manual route testing
# Click through: Dashboard → Analytics → Leads → Settings → Back to Dashboard
# Verify each page loads without errors
# Check Network tab in DevTools — chunks should load on navigation
```

---

### >>> USER CHECKPOINT 9 (FINAL) <<<

**What to review** (most thorough checkpoint — this is the riskiest phase):

1. **Route Navigation**:
   - [ ] Click every sidebar link — does each page load?
   - [ ] Use browser Back/Forward — does navigation work?
   - [ ] Refresh on any page — does it load correctly?
   - [ ] Open a direct URL (e.g., `/analytics`) — does it work?

2. **Analytics Dashboard**:
   - [ ] All KPI cards visible?
   - [ ] All charts render with data?
   - [ ] Explore grid loads (might have a brief skeleton first)?

3. **Leads List**:
   - [ ] Search works?
   - [ ] Filters work?
   - [ ] Pagination works?
   - [ ] Sorting works?
   - [ ] Bulk select works?

4. **Performance Check (DevTools Network tab)**:
   - [ ] When navigating to a new page, do you see small JS chunks loading?
   - [ ] Are there any failed/stuck loads?
   - [ ] Does the page feel faster or the same? (Should never feel slower)

5. **Production Build**:
   - [ ] `npm run build` succeeds
   - [ ] `npx vite preview` serves correctly
   - [ ] Click through 5+ pages in the production build

**If ANY page fails to load or any feature is broken**: STOP and tell me immediately. This phase is the most likely to have regressions.  
**If everything works**: You're done!

---

## Final Audit & Sign-Off

After all 9 phases complete and all checkpoints pass, we run:

### Full Re-Audit

Using the same 8-dimension framework on all 7 areas, verify:

| Dimension | Before | Target | Expected After |
|-----------|--------|--------|----------------|
| Visual Hierarchy | 7.4 | 10 | 9.5+ |
| Typography | 7.3 | 10 | 9.5+ |
| Color Usage | 6.3 | 10 | 9.5+ |
| Spacing & Layout | 7.6 | 10 | 9.5+ |
| Interactive States | 7.0 | 10 | 9.5+ |
| Consistency | 7.0 | 10 | 9.5+ |
| Accessibility | 5.9 | 10 | 9.5+ |
| Performance | 6.7 | 10 | 9.5+ |
| **Overall** | **6.9** | **10** | **9.5+** |

### Final Verification Checklist

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run test` — 217 files, 685+ tests passing
- [ ] `npm run build` — succeeds with no warnings
- [ ] All pages load in light mode
- [ ] All pages load in dark mode
- [ ] Keyboard navigation works site-wide (Tab, Enter, Escape, Arrow keys)
- [ ] Mobile responsive at 375px
- [ ] Tablet responsive at 768px
- [ ] Desktop responsive at 1440px
- [ ] No horizontal scroll on any page at any viewport
- [ ] Console shows zero errors or warnings
- [ ] Network tab shows no failed requests

---

## Summary: Phases At a Glance

| Phase | What | Risk | Files | Key Risk Factor |
|-------|------|------|-------|-----------------|
| **1** | Fix 4 production bugs | LOW | ~5 | Badge colors look different |
| **2** | Add CSS variables + Tailwind tokens | ZERO | 2 | None — invisible foundation |
| **3** | Replace hardcoded colors → tokens | LOW | ~75 | Colors might shift slightly |
| **4** | Accessibility overhaul | LOW | ~130 | Focus rings on wrong elements |
| **5** | Hover + active + transition states | LOW | ~80 | Transitions feel janky |
| **6** | Component library consistency | MEDIUM | ~50 | Admin forms look/work slightly different |
| **7** | Typography standardization | LOW | ~30 | Heading sizes change |
| **8** | Visual hierarchy + spacing + responsive | LOW-MED | ~30 | Mobile layout issues |
| **9** | Code splitting + lazy loading | MEDIUM-HIGH | ~25 | Pages fail to load, state bugs |

**Total time to fully execute all phases**: Depends on pace — each phase is independently safe to pause and resume.

**Safest phases you could approve for immediate execution**: 1 and 2 (near-zero risk, fix actual bugs, enable everything else).

**Phase requiring most caution**: 9 (performance refactors touch component structure and state management).
