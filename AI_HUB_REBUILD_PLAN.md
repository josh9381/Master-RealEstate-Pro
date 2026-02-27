# AI Hub Rebuild Plan

## The Vision

**AI should feel like part of the CRM, not a separate destination.** The AI Hub is a **control center** — where you monitor, configure, and understand your AI. You don't go there to use AI features. You go there to tune them, see what they've been doing, and make them smarter.

**The principle:**
- If a feature helps you **DO something** (write a message, enhance text, generate content) → it lives where the work happens
- If a feature helps you **UNDERSTAND or CONFIGURE something** (model accuracy, scoring weights, predictions, insights) → it lives in the AI Hub

---

## Current State (Problems)

- AI Hub is a **13-card feature launcher** where 7 of 13 "Open" buttons lead to 404s
- Features that are embedded components (chatbot, compose, content gen, message enhancer) are shown as if they're standalone pages — they're not
- Route mapping is broken (string vs numeric IDs, stale title mappings, slug generation issues)
- No AI Settings/Profile page exists
- No full Insights page (only top 3 shown on dashboard)
- Lead Scoring page works but could be improved with ML optimization history and better UX
- `comingSoonFeatureIds` checks numeric IDs against string IDs from backend (never matches)
- Icon mapping uses hardcoded numeric IDs that don't match backend string IDs

---

## New AI Hub Structure

```
AI Hub (/ai)
│
├── 1. OVERVIEW DASHBOARD (rebuilt /ai page)
│   ├── AI Health Status cards (models, accuracy, predictions, usage)
│   ├── "Where AI is Working" status bar
│   ├── Top 3 Insights (linked to full insights page)
│   ├── AI Recommendations (with one-click actions)
│   └── Quick Actions (recalculate scores, view usage report)
│
├── 2. LEAD SCORING & MODELS (/ai/lead-scoring) — ENHANCED
│   ├── Score Distribution & Breakdown
│   ├── Model Configuration (weights, factors)
│   ├── ML Optimization History (absorbed from separate feature)
│   ├── Recalibration Controls
│   ├── Feature Importance Chart
│   └── Per-Lead Score Factors drill-down
│
├── 3. INTELLIGENCE & INSIGHTS (/ai/insights) — NEW FULL PAGE
│   ├── All Insights (filterable by priority, type, date)
│   ├── AI Recommendations with one-click actions
│   ├── Insight Preferences (priority thresholds, focus areas)
│   └── Insight History (acted on vs. dismissed)
│
├── 4. PREDICTIVE ANALYTICS (/ai/predictive) — EXISTS, KEEP
│   ├── Conversion Predictions
│   ├── Revenue Forecasts
│   ├── Pipeline Velocity
│   └── At-Risk Lead Identification
│
└── 5. AI SETTINGS (/ai/settings) — NEW PAGE
    ├── My AI Profile (voice, tone, brand, business context)
    ├── Compose & Content Defaults (tone, style, length, CTA)
    ├── API & Usage (key management, usage dashboard, cost)
    └── Feature Toggles (enable/disable AI features)
```

### What Gets Removed from the Hub

These features **disappear as cards** and live where they belong across the CRM:

| Feature | Where It Lives | How Users Access It |
|---|---|---|
| AI Chatbot | Every page (floating button) | Click the bubble in bottom-right corner |
| AI Compose | Communications, Campaign Create, Lead Detail | "AI Compose" button in message editors |
| Content Generation | Campaign Create, Template Editor | "Generate with AI" button in content flows |
| Message Enhancer | Any message composition field | "Enhance" button next to text inputs |
| Template Personalization | Template Editor | Auto-applied when editing templates |
| A/B Testing | `/campaigns/ab-testing` | Campaigns section (already built & routed) |
| Segmentation | `/ai/segmentation` | Stays as a link, or moves under Leads later |
| Voice AI (Vapi) | Not built | Future: Communications section |

---

## Phase 1: Rebuild the AI Hub Overview Dashboard

**File:** `src/pages/ai/AIHub.tsx` (full rewrite ~660 lines → ~500 lines)

### What changes:
1. **Remove the 13-card feature grid entirely**
2. **Replace with a clean 4-section navigation + dashboard layout**

### New layout sections:

#### A. Navigation Cards (top row — 4 cards linking to sub-pages)
Small cards that navigate to the 4 sub-sections:
- **Lead Scoring & Models** → `/ai/lead-scoring` — icon, brief stat ("1 active model, 78.5% accuracy")
- **Intelligence & Insights** → `/ai/insights` — icon, brief stat ("3 active insights, 2 high priority")
- **Predictive Analytics** → `/ai/predictive` — icon, brief stat ("Pipeline: $7M")
- **AI Settings** → `/ai/settings` — icon, brief label ("Configure your AI profile")

#### B. "Where AI is Working" Status Bar
A compact horizontal section showing AI activity across the platform:
```
AI is active across your CRM:
Lead Scoring (76 scored) · Chatbot (25+ functions) · Compose (streaming) · 
Content Gen (5 types) · Message Enhancer (6 tones) · Template AI (active)
```
Each item shows status (active/inactive) and a brief stat. No "Open" buttons — these aren't destinations. This section tells users "AI is everywhere, not just here."

#### C. AI Health Overview (keep & clean up existing stats cards)
Keep the 4 stat cards (Active Models, Avg Accuracy, Predictions Today, Active Insights) — they work well.

#### D. Recent Insights + Quick Actions (keep, clean up)
- Keep the top 3 insights section, add "View All →" link to `/ai/insights`
- Keep AI Recommendations with action buttons
- Remove: Model Accuracy Trend chart (move to Lead Scoring page)
- Remove: Feature Importance pie chart (move to Lead Scoring page)
- Remove: Training Progress section (move to Lead Scoring page)
- Remove: Data Quality Metrics (move to Lead Scoring page)
- Remove: Monthly Predictions bar chart (move to Predictive Analytics page)

### Backend changes for Phase 1:
- Update `getAIFeatures` endpoint to return **only hub-relevant data** (or keep it for the status bar — just change frontend consumption)
- No new endpoints needed, just different frontend rendering

### Files to modify:
- `src/pages/ai/AIHub.tsx` — Full rewrite
- `src/App.tsx` — Add route for `/ai/settings`, clean up unused routes

### Existing infrastructure used:
- `aiApi.getStats()` → stats cards
- `aiApi.getFeatures()` → "Where AI is Working" status bar
- `aiApi.getInsights()` → top 3 insights
- `aiApi.getRecommendations()` → recommendations section

---

## Phase 2: Build the AI Settings Page

**File:** `src/pages/ai/AISettings.tsx` (NEW)

### Sections:

#### A. My AI Profile
User-level personalization that affects all AI behavior across the platform.

| Setting | Type | What it affects | Existing backend support |
|---|---|---|---|
| Default Tone | Select (professional, casual, friendly, direct, luxury, warm) | Compose, content gen, message enhancer | YES — `UserAIPreferences.composerDefaultTone` + `Organization.aiDefaultTone` |
| Default Message Length | Select (concise, standard, detailed) | Compose, content gen | YES — `UserAIPreferences.composerDefaultLength` |
| Always Include CTA | Toggle | Compose, content gen | YES — `UserAIPreferences.composerDefaultCTA` |
| Personalization Level | Select (minimal, standard, deep) | How much lead context AI uses | YES — `UserAIPreferences.composerDefaultPersonalization` |
| Brand Guidelines | Textarea | All AI-generated content follows brand voice | PARTIAL — `Organization.aiSystemPrompt` exists but needs expansion |
| Business Context | Textarea (market, focus, price range) | AI understands your niche | NEW — needs new field on `UserAIPreferences` or `Organization` |
| Working Hours | Time range picker | AI timing suggestions | PARTIAL — `UserAIPreferences.preferredContactTime` exists |

#### B. Compose & Content Defaults
- Default email structure (formal greeting / casual / direct)
- Property description style (luxury verbose / clean minimal / feature-focused)
- Social media preferences (platforms, hashtag style, emoji usage)
- Enhancement level for Message Enhancer (light touch / moderate / full rewrite)

#### C. API & Usage
- API key management (show masked key, option to use own key)
- Current month usage: messages, content generations, compose uses, scoring recalculations
- Usage vs. limits (progress bars per category)
- Cost estimate this month
- Spending alerts (future)

#### D. Feature Toggles
Simple on/off switches for each embedded AI feature:
- Lead Scoring, AI Compose, Content Generation, Message Enhancer, Template Personalization, AI Insights
- When off, the AI buttons/features hide across the platform

### Backend changes for Phase 2:

**Schema additions** (new fields on `UserAIPreferences`):
```prisma
model UserAIPreferences {
  // ... existing fields ...
  
  // NEW: My AI Profile fields
  brandGuidelines        String?    // User's brand voice guidelines text
  businessContext         String?    // Market, focus area, price range, etc.
  defaultEmailStructure  String     @default("professional")  // formal, casual, direct
  propertyDescStyle      String     @default("balanced")      // luxury, minimal, feature-focused
  socialMediaPrefs       Json?      // { platforms: [], hashtagStyle: '', emojiUsage: '' }
  enhancementLevel       String     @default("moderate")      // light, moderate, full
  
  // NEW: Feature toggles (user-level)
  enableCompose          Boolean    @default(true)
  enableContentGen       Boolean    @default(true)
  enableMessageEnhancer  Boolean    @default(true)
  enableTemplateAI       Boolean    @default(true)
  enableInsights         Boolean    @default(true)
}
```

**New/updated endpoints:**
- `GET /ai/preferences` — already exists, expand to return all new fields
- `POST /ai/preferences` — already exists, expand to accept all new fields
- `GET /ai/usage` — already exists, keep as-is
- `GET /ai/usage/limits` — already exists, keep as-is

**New API key management endpoints (if not already on settings page):**
- Check if existing Settings page already handles API key — if so, link to it from AI Settings

### Files to create:
- `src/pages/ai/AISettings.tsx` — The full settings page

### Files to modify:
- `backend/prisma/schema.prisma` — Add new fields to `UserAIPreferences`
- `backend/src/services/user-preferences.service.ts` — Handle new fields
- `backend/src/controllers/ai.controller.ts` — Expand getPreferences/savePreferences
- `src/App.tsx` — Register `/ai/settings` route
- `src/lib/api.ts` — Ensure `aiApi.getPreferences()` / `aiApi.savePreferences()` exist (they likely do already through the existing endpoints)

---

## Phase 3: Build the Intelligence & Insights Full Page

**File:** `src/pages/ai/IntelligenceInsights.tsx` (EXISTS — needs enhancement, currently 437 lines)

### What exists vs what's needed:

The existing page already has insights display. Enhancements:

#### A. Filterable Insights List
- Filter by: priority (critical, high, medium, low), type (opportunity, warning, info), date range
- Sort by: newest, priority, impact
- Search within insights

#### B. Expanded Recommendations
- Show all recommendations (not just 3)
- Group by category (follow-up, scoring, campaigns, pipeline)
- One-click action buttons (already implemented in hub, move logic here)

#### C. Insight Preferences (inline config)
- Toggle which insight types to see
- Set priority threshold ("only show high+ priority")
- Digest preference (real-time / daily / weekly)

#### D. Insight History
- Tab: "Active" vs "Acted On" vs "Dismissed"
- Show what action was taken on each insight

### Backend changes for Phase 3:
- `GET /ai/insights` — already supports `limit` param, need to add `priority`, `type`, `status` filters
- `POST /ai/insights/:id/dismiss` — already exists
- May need: `POST /ai/insights/:id/act` to mark an insight as acted upon

### Files to modify:
- `src/pages/ai/IntelligenceInsights.tsx` — Add filters, tabs, expanded recommendations
- `backend/src/controllers/ai.controller.ts` — Add filter params to `getInsights`
- `backend/src/routes/ai.routes.ts` — May need new route for marking insights acted upon

---

## Phase 4: Enhance the Lead Scoring Page

**File:** `src/pages/ai/LeadScoring.tsx` (EXISTS — 615 lines, already good)

### What's good already:
- Score distribution
- Model configuration with adjustable weights
- Recalculate/recalibrate buttons
- Per-lead score display

### Enhancements:

#### A. Absorb ML Optimization
- Add a tab/section: "Optimization History"
- Show past recalibrations: date, accuracy before/after, weights changed
- The `ModelPerformanceHistory` table already captures this data

#### B. Move charts here from Hub
- Model Accuracy Trend (line chart) — currently on AIHub, move here
- Feature Importance (pie chart) — currently on AIHub, move here
- Data Quality Metrics — currently on AIHub, move here

#### C. Training Data Management
- Move "Upload Training Data" button here (from AIHub)
- Show training model progress/status here
- Training history list

#### D. Better Score Factor Drill-Down
- Click any lead's score to see breakdown
- Compare two leads' score factors side-by-side (future nice-to-have)

### Backend changes for Phase 4:
- No new endpoints — everything needed already exists
- `aiApi.getModelPerformance()` — for accuracy trend
- `aiApi.getFeatureImportance()` — for feature chart
- `aiApi.getDataQuality()` — for quality metrics
- `aiApi.getTrainingModels()` — for training status
- `aiApi.uploadTrainingData()` — for upload

### Files to modify:
- `src/pages/ai/LeadScoring.tsx` — Add tabs for charts, optimization history, training management

---

## Phase 5: Clean Up Routing & Dead Links

### Routes to ADD to `src/App.tsx`:
```tsx
<Route path="/ai/settings" element={<AISettings />} />
```

### Routes to KEEP:
```tsx
/ai                → AIHub (rebuilt)
/ai/lead-scoring   → LeadScoring (enhanced)
/ai/segmentation   → Segmentation (keep)
/ai/predictive     → PredictiveAnalytics (keep)
/ai/training       → ModelTraining (keep or absorb into lead-scoring)
/ai/insights       → IntelligenceInsights (enhanced)
/ai/analytics      → AIAnalytics (keep)
/ai/settings       → AISettings (new)
```

### Routes to consider removing or redirecting:
- `/ai/training` — If training is absorbed into Lead Scoring page, redirect to `/ai/lead-scoring`

### Backend `getAIFeatures` endpoint:
- Keep returning all features (chatbot, compose, etc.) — the frontend "Where AI is Working" status bar uses this
- Features no longer need routes or "Open" buttons — they're status indicators

### Files to modify:
- `src/App.tsx` — Add new route, clean up
- `src/pages/ai/AIHub.tsx` — Already rewritten in Phase 1
- `backend/src/controllers/ai.controller.ts` — Optionally clean up features response

---

## Phase 6: Side Navigation Update

The left sidebar currently shows "AI Hub" as a single nav item. Consider updating to show sub-pages:

```
AI Hub
  ├── Overview        (/ai)
  ├── Lead Scoring    (/ai/lead-scoring)
  ├── Insights        (/ai/insights)
  ├── Predictions     (/ai/predictive)
  └── AI Settings     (/ai/settings)
```

Or keep it collapsed and let the Hub overview page be the navigation hub. Either approach works — the key is that the overview page has clear nav cards to each sub-section.

### Files to modify:
- `src/components/layout/Sidebar.tsx` (or wherever nav is defined)

---

## Existing Infrastructure Summary

Everything we need is mostly built. Here's what exists and is ready to use:

### Backend Services (10,249 lines of AI code):
| Service | Lines | Status |
|---|---|---|
| `ai-functions.service.ts` (chatbot) | 3,041 | Built, working |
| `ai.controller.ts` | 2,358 | Built, working |
| `intelligence.service.ts` | 810 | Built, working |
| `openai.service.ts` | 766 | Built, working |
| `leadScoring.service.ts` | 576 | Built, working |
| `abtest.service.ts` | 399 | Built, working |
| `ml-optimization.service.ts` | 392 | Built, working |
| `ai-config.service.ts` | 341 | Built, working |
| `message-context.service.ts` | 366 | Built, working |
| `ai-compose.service.ts` | 325 | Built, working |
| `segmentation.service.ts` | 250 | Built, working |
| `prediction.service.ts` | 225 | Built, working |
| `suggestions.service.ts` | 213 | Built, working |
| `template-ai.service.ts` | 187 | Built, working |

### Database Models:
- `UserAIPreferences` — exists, has composer prefs + some chatbot prefs (needs expansion for new profile fields)
- `Organization` — has `aiDefaultTone`, `aiSystemPrompt`, `openaiApiKey`, `useOwnAIKey`, `aiDefaultModel`, `aiMaxTokensPerRequest`
- `LeadScoringModel` — per-user ML models
- `ModelPerformanceHistory` — recalibration history
- `AIInsight` — insights with priority, type, dismissed status
- `UsageTracking` — monthly usage counters per subscription
- `ABTest` — A/B test records

### Frontend Components (3,713 lines of AI components):
| Component | Lines | Status | Where it's embedded |
|---|---|---|---|
| `AIComposer.tsx` | 756 | Built | Communications, will use profile defaults |
| `ContentGeneratorWizard.tsx` | 727 | Built | Campaign Create |
| `AIAssistant.tsx` (chatbot) | 632 | Built | Global floating button |
| `AISMSComposer.tsx` | 294 | Built | SMS composition |
| `AISuggestedActions.tsx` | 290 | Built | Lead Detail |
| `AIEmailComposer.tsx` | 258 | Built | Email composition |
| `MessageEnhancerModal.tsx` | 212 | Built | Message editing flows |
| `VariationsPanel.tsx` | 171 | Built | Compose variations |
| `PredictionBadge.tsx` | 133 | Built | Lead cards |
| `MessagePreview.tsx` | 121 | Built | Message composition |
| `ScoreBadge.tsx` | 77 | Built | Lead cards |
| `FloatingAIButton.tsx` | 42 | Built | Global layout |

### API Endpoints (already built):
- `GET /ai/stats` — hub stats
- `GET /ai/features` — feature list with status
- `GET /ai/models/performance` — model accuracy history
- `GET /ai/models/training` — training models status
- `POST /ai/models/training/upload` — upload training data
- `GET /ai/data-quality` — data quality metrics
- `GET /ai/insights` — insights list
- `POST /ai/insights/:id/dismiss` — dismiss insight
- `GET /ai/recommendations` — AI recommendations
- `GET /ai/feature-importance` — feature importance data
- `GET /ai/usage` — usage stats
- `GET /ai/usage/limits` — usage limits
- `GET /ai/preferences` — user AI preferences
- `POST /ai/preferences` — save preferences
- `POST /ai/preferences/reset` — reset to defaults
- `GET /ai/scoring-config` — scoring configuration
- `PUT /ai/scoring-config` — update scoring config

---

## Implementation Order

| Phase | What | Effort | New Files | Modified Files |
|---|---|---|---|---|
| **Phase 1** | Rebuild AI Hub Overview | Medium | 0 | `AIHub.tsx`, `App.tsx` |
| **Phase 2** | Build AI Settings Page | Large | `AISettings.tsx` | `schema.prisma`, `user-preferences.service.ts`, `ai.controller.ts`, `App.tsx`, `api.ts` |
| **Phase 3** | Enhance Insights Page | Medium | 0 | `IntelligenceInsights.tsx`, `ai.controller.ts` |
| **Phase 4** | Enhance Lead Scoring Page | Medium | 0 | `LeadScoring.tsx` |
| **Phase 5** | Fix Routing & Dead Links | Small | 0 | `App.tsx`, `AIHub.tsx` |
| **Phase 6** | Update Side Navigation | Small | 0 | Sidebar component |

**Recommended build order:** Phase 1 → Phase 5 → Phase 2 → Phase 4 → Phase 3 → Phase 6

Rationale: Phase 1 + 5 together give the immediate visual transformation and fix all broken links. Phase 2 builds the new settings foundation. Phase 4 and 3 enhance existing working pages. Phase 6 is polish.

---

## Success Criteria

When this is done:
- [ ] AI Hub overview is a clean dashboard, not a feature launcher
- [ ] Zero 404s from any link on the AI Hub
- [ ] Users can see "Where AI is Working" across their CRM
- [ ] AI Settings page lets users set tone, brand voice, content preferences once — applied everywhere
- [ ] Lead Scoring page is the definitive model management experience (charts, optimization history, training, config)
- [ ] Insights page shows all insights with filters, not just top 3
- [ ] Embedded AI features (chatbot, compose, content gen, enhancer) have no cards/links in the Hub
- [ ] My AI Profile preferences are read by compose, content gen, and enhancer features
