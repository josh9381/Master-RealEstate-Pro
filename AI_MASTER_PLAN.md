# AI Features Master Plan

**Created:** February 26, 2026
**Status:** Planning — No code changes yet

---

## Current State Summary

### Fully Complete (19 features)
| Feature | Key Files |
|---------|-----------|
| AI Chatbot (GPT-4 + function calling, 25+ functions) | `AIAssistant.tsx`, `openai.service.ts`, `ai-functions.service.ts` |
| AI Compose (Phase 1, 2, 3 — compose, variations, streaming) | `AIComposer.tsx`, `ai-compose.service.ts`, `message-context.service.ts` |
| Content Generator Wizard (5 content types) | `ContentGeneratorWizard.tsx` |
| Message Enhancer (6 tone options) | `MessageEnhancerModal.tsx` |
| AI Email Composer | `AIEmailComposer.tsx` |
| AI SMS Composer (static templates + AI regeneration) | `AISMSComposer.tsx` |
| AI Suggested Actions | `AISuggestedActions.tsx` |
| Lead Scoring (algorithmic + AI scoring) | `LeadScoring.tsx`, `leadScoring.service.ts` |
| ML Optimization (per-user weight learning) | `ml-optimization.service.ts` |
| Intelligence Hub (predictions, engagement, dashboard) | `intelligence.service.ts` |
| Predictive Analytics (conversion, revenue, pipeline) | `PredictiveAnalytics.tsx` |
| Segmentation (rule-based CRUD) | `Segmentation.tsx`, `segmentation.service.ts` |
| A/B Testing | `abtest.service.ts` |
| Template AI Personalization | `template-ai.service.ts` |
| AI Streaming (SSE from OpenAI) | `AIComposer.tsx` streaming consumer, `chatStream()` backend |
| User AI Preferences | `user-preferences.service.ts` (in-memory) |
| Per-User AI Personalization (scoring models per user) | `LeadScoringModel.userId @unique` |
| AI Email Composer (standalone) | `AIEmailComposer.tsx` |
| AI SMS Composer (standalone) | `AISMSComposer.tsx` |

### Partially Complete (6 features — pages exist but data is empty)
| Feature | What Works | What's Stub/Empty |
|---------|------------|-------------------|
| AI Hub Dashboard | Stats card, data quality, feature importance (hardcoded) | `getModelPerformance()` → empty, `getTrainingModels()` → empty, `getInsights()` → empty, `getRecommendations()` → empty, `getAIFeatures()` → hardcoded list |
| AI Analytics | Page renders, charts wired | `getModelPerformance()` → empty array, all metrics show 0 |
| Model Training | Recalibration is real ML | `getTrainingModels()` → empty, upload training data is a no-op |
| Intelligence Insights | Dashboard insights, scoring model, trends all real | `getInsights()` → always returns empty array |
| AI Usage Tracking | `UsageTracking` DB model exists, cost tracked per ChatMessage | Not aggregated, not enforced, no dashboard |
| User Preferences Persistence | Service works, endpoints work | Uses in-memory `Map` — data lost on server restart |

### Not Started (4 features)
| Feature | Notes |
|---------|-------|
| Voice AI (Vapi.ai) | `@vapi-ai/server-sdk` installed, `AIAssistant` + `Call` models in schema, no source code |
| Subscription & Billing (Stripe) | `stripe` installed, `Subscription` + `Invoice` models in schema, `stripe.service.ts` exists (298 lines), no enforcement |
| Anthropic Claude Integration | Noted as "Future Enhancement" in build plan |
| Production Polish & Launch | Error monitoring, E2E testing, documentation, deployment |

### Known TODOs in Code
| File | Line | TODO |
|------|------|------|
| `ai-functions.service.ts` | 232 | `// TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)` |
| `ai-functions.service.ts` | 275 | `// TODO: Integrate with SMS service (Twilio, etc.)` |
| `openai.service.ts` | 603 | `// TODO: Implement in Phase 3` — `generateInsights()` throws "Not implemented" |

### Dead Code
- `scoreLeadWithAI()` in `aiService.ts` calls `POST /ai/score-lead` but this route doesn't exist (backend has `GET /ai/lead-score/:leadId` instead)

---

## 7 Backend Stub Endpoints That Need Real Implementations

These are why 4 AI pages appear empty to users:

| Endpoint | Current Return | What It Should Do | Pages Affected |
|----------|---------------|-------------------|----------------|
| `GET /ai/models/performance` | Empty array `[]` | Track model accuracy over time per recalibration run | AI Hub, AI Analytics, Lead Scoring |
| `GET /ai/models/training` | Empty array `[]` | List trained models with status, accuracy, date | AI Hub, Model Training |
| `POST /ai/models/training/upload` | "Queued" (no-op) | Process uploaded training data | Model Training |
| `GET /ai/insights` | Empty array `[]` | Generate actionable insights from lead/engagement data | AI Hub, Intelligence Insights |
| `GET /ai/recommendations` | Empty array `[]` | Generate recommendations (next best actions, optimizations) | AI Hub |
| `GET /ai/stats` | Mostly zeros | Return real counts for AI messages sent, models trained, etc. | AI Hub |
| `GET /ai/features` | Hardcoded 5-item list | Dynamic feature list with real enabled/disabled status | AI Hub |

---

## Current AI Configuration

| Item | Current Value |
|------|--------------|
| **API Key** | Single key in `backend/.env` (`OPENAI_API_KEY=sk-proj-...`) |
| **Model** | `gpt-4-turbo-preview` (OUTDATED — needs updating) |
| **Org-level keys** | Not supported |
| **Rate limiting** | 100 req/min/user (flat, no tier differentiation) |
| **Cost tracking** | Per-ChatMessage only, not aggregated |
| **Usage enforcement** | None |

### Current Token Limits (hardcoded per method in `openai.service.ts`)

| Method | max_tokens | Temperature |
|--------|-----------|-------------|
| `chat()` — chatbot | 1,000 | 0.7 |
| `chatWithFunctions()` — function calling | 1,000 | 0.7 |
| `analyzeLeadScore()` | 10 | 0.3 |
| `enhanceMessage()` | 500 | 0.7 |
| `generateEmailSequence()` | 2,000 | 0.8 |
| `generateSMS()` | 100 | 0.8 |
| `generatePropertyDescription()` | 500 | 0.8 |
| `generateSocialPosts()` | 1,000 | 0.8 |
| `generateListingPresentation()` | 1,500 | 0.7 |
| `chatStream()` — streaming | *not set* | 0.7 |

---

## Model Strategy

### Full OpenAI Model Catalog & Pricing (Feb 2026)

| Model | Input / 1M | Cached Input / 1M | Output / 1M | Notes |
|-------|-----------|-------------------|-------------|-------|
| **gpt-5.2** | $1.75 | $0.175 | $14.00 | Best non-pro model, agentic tasks |
| **gpt-5.1** | $1.25 | $0.125 | $10.00 | Great quality, cheaper than 4o |
| **gpt-5** | $1.25 | $0.125 | $10.00 | Solid, same price as 5.1 |
| **gpt-5-mini** | $0.25 | $0.025 | $2.00 | Fast, cheap, well-defined tasks |
| **gpt-5-nano** | $0.05 | $0.005 | $0.40 | Ultra-cheap, simple tasks |
| **gpt-5.2-pro** | $21.00 | — | $168.00 | Smartest, most precise (premium) |
| **gpt-5-pro** | $15.00 | — | $120.00 | Premium tier, slightly cheaper |
| **gpt-4.1** | $2.00 | $0.50 | $8.00 | Long context specialist |
| **gpt-4.1-mini** | $0.40 | $0.10 | $1.60 | Long context, budget |
| **gpt-4.1-nano** | $0.10 | $0.025 | $0.40 | Long context, ultra-cheap |
| **gpt-4o** | $2.50 | $1.25 | $10.00 | Reliable all-rounder |
| **gpt-4o-mini** | $0.15 | $0.075 | $0.60 | Cheapest 4o-class |
| **gpt-realtime** | $4.00 | $0.40 | $16.00 | Voice/realtime |
| **gpt-realtime-mini** | $0.60 | $0.06 | $2.40 | Voice/realtime budget |
| `gpt-4-turbo-preview` | $10.00 | — | $30.00 | **CURRENT — REMOVE** |

### Optimal 5-Tier Model Routing

#### Tier 1: `mainModel` — User-Facing Intelligence
**Model: `gpt-5.1`**

Why gpt-5.1 over gpt-4o:
- **Cheaper input:** $1.25 vs $2.50 (50% savings)
- **Same output cost:** $10.00
- **Newer model:** Better quality, better instruction following
- **Better cached input:** $0.125 vs $1.25 (10x cheaper cached)

This is where users judge your platform. Every dollar saved here goes straight to margin.

| Feature | Model | Why |
|---------|-------|-----|
| AI Chatbot (`chat()`) | gpt-5.1 | Real-time conversation, users see every word |
| Function calling (`chatWithFunctions()`) | gpt-5.1 | Reliable tool use, 25+ functions |
| Email sequences (`generateEmailSequence()`) | gpt-5.1 | Users read and send this content |
| Property descriptions (`generatePropertyDescription()`) | gpt-5.1 | Client-facing, must be polished |
| Social posts (`generateSocialPosts()`) | gpt-5.1 | Public-facing content |
| Listing presentations (`generateListingPresentation()`) | gpt-5.1 | High-value output agents show clients |
| AI Compose (`generateContextualMessage()`) | gpt-5.1 | Users read, edit, and send this |
| Streaming chat (`chatStream()`) | gpt-5.1 | Real-time UX, latency matters |
| Web search (normal Q&A) | gpt-5.1 | Users see the synthesized answer |

#### Tier 2: `fastModel` — Background Brain
**Model: `gpt-5-mini`**

For tasks that need decent quality but run frequently. At $0.25/$2.00, it's the sweet spot between quality and cost.

| Feature | Model | Why |
|---------|-------|-----|
| Message enhancement (`enhanceMessage()`) | gpt-5-mini | Short rewrite, needs decent quality |
| SMS generation (`generateSMS()`) | gpt-5-mini | Users read this but it's short |
| Template personalization | gpt-5-mini | Light rewrite with context |
| Suggested actions | gpt-5-mini | Short blurbs, decent quality needed |
| Subject line variations | gpt-5-mini | Users see these |
| "Next best action" blurbs | gpt-5-mini | Displayed to users, needs to sound smart |

#### Tier 3: `nanoModel` — Ultra-Cheap Background Work
**Model: `gpt-5-nano`**

At **$0.05 input / $0.40 output per 1M tokens**, this is essentially free. A lead scoring call (~500 input tokens, 10 output tokens) costs **$0.000029**. You could run 34,000 of these for $1.

| Feature | Model | Why |
|---------|-------|-----|
| Lead scoring (`analyzeLeadScore()`) | gpt-5-nano | 10 tokens output, pure classification |
| Tag suggestions | gpt-5-nano | Simple categorization |
| Data cleanup / formatting | gpt-5-nano | Background automation |
| Sentiment analysis | gpt-5-nano | Short classification output |
| Lead status recommendations | gpt-5-nano | Simple decision |
| Batch insight generation (overnight) | gpt-5-nano | High volume, simple patterns |

#### Tier 4: `deepModel` — Complex Analysis
**Model: `gpt-5.2`**

For features that need deep reasoning, large context, or multi-step analysis. At $1.75/$14.00, it's the best non-pro model.

| Feature | Model | Why |
|---------|-------|-----|
| "Analyze this entire lead history" | gpt-5.2 | Large context + reasoning |
| "Audit my whole pipeline" | gpt-5.2 | Multi-step analysis |
| Full research mode with web search | gpt-5.2 | Complex synthesis |
| Campaign performance deep-dives | gpt-5.2 | Pattern analysis across data |
| Long document processing | gpt-5.2 | Contracts, market reports |
| AI coaching / strategy advice | gpt-5.2 | Needs thoughtful reasoning |

#### Tier 5: `premiumModel` — Enterprise "Best AI" Upsell
**Model: `gpt-5.2-pro`**

NOT the default. This is a paid add-on. At $21/$168 per 1M tokens, it MUST be self-funding.

| Feature | Model | Why |
|---------|-------|-----|
| Deep business strategy analysis | gpt-5.2-pro | "What should I change to close more deals?" |
| Multi-step reasoning across full datasets | gpt-5.2-pro | Complex pipeline optimization |
| Advanced market research | gpt-5.2-pro | Full competitive analysis with web search |
| Premium AI coaching mode | gpt-5.2-pro | Detailed, nuanced strategic advice |

**Revenue model:** Enterprise tier or "Pro AI Brain" add-on. Users pay → it funds itself → pure margin.

#### Future: Voice AI Model
**Model: `gpt-realtime-mini`** ($0.60/$2.40)

For when you build the Vapi voice AI feature. Budget-friendly realtime audio model.

### Default System Config (ships with the product)

```
mainModel:     "gpt-5.1"       // user-facing chat, content, compose
fastModel:     "gpt-5-mini"    // enhancements, SMS, suggestions
nanoModel:     "gpt-5-nano"    // scoring, tags, background classification
deepModel:     "gpt-5.2"       // deep analysis, large context
premiumModel:  "gpt-5.2-pro"   // enterprise upsell only
fallbackModel: "gpt-4o-mini"   // emergency fallback if all else fails
voiceModel:    "gpt-realtime-mini"  // future voice AI
```

### Fallback Chains
If a model call fails (rate limit, timeout, outage):

**User-facing calls** (chat, compose, content, web search answers):
1. `premiumModel` (5.2-pro) → `deepModel` (5.2) → `mainModel` (5.1)
2. `deepModel` (5.2) → `mainModel` (5.1)
3. `mainModel` (5.1) → `fastModel` (5-mini)
4. `fastModel` (5-mini) → `fallbackModel` (4o-mini)

**Background calls** (scoring, tags, classification):
1. `nanoModel` (5-nano) → `fallbackModel` (4o-mini)

**Rule: Never fall back to nano for anything the user directly reads.** Nano is only for classification, scoring, and background tasks where the output is a number, tag, or short label — not prose.

### Cost Estimates Per User Per Month

| Tier | Avg messages | Models used | Est. cost/user/month |
|------|-------------|-------------|---------------------|
| FREE (50 msgs) | 50 | gpt-5.1 + gpt-5-nano | **$0.15 - $0.50** |
| STARTER (500 msgs) | 500 | gpt-5.1 + gpt-5-mini + gpt-5-nano | **$2 - $6** |
| PROFESSIONAL (5,000 msgs) | 5,000 | gpt-5.1 + gpt-5-mini + gpt-5-nano + gpt-5.2 | **$20 - $60** |
| ENTERPRISE (unlimited) | 10,000+ | all models including 5.2-pro | **$80+ (offset by $299 price)** |

**Note:** These estimates are significantly lower than the previous plan because:
- gpt-5.1 is 50% cheaper on input than gpt-4o
- gpt-5-nano is 3x cheaper than gpt-4o-mini on input
- Cached input pricing reduces repeated system prompt costs by 10x

### Caching Strategy (reduce costs further)
- **Cache expensive answers** for 24h: market stats, mortgage rates, policy explanations
- **Cache web search results** for 1-6h depending on query type
- **Leverage cached input pricing** — structure system prompts identically across calls to trigger cached rates ($0.125 vs $1.25 for gpt-5.1 = 10x savings)
- **Don't regenerate** if user requests the same content type for the same lead within 1 hour
- **Batch API (50% off)** — for nightly bulk operations: recalculate all lead scores, generate daily insights, campaign analytics

### Processing Tier Notes
- **All pricing in this plan assumes Standard processing tier**
- Priority processing costs ~2x more (e.g., gpt-5.1 jumps to $2.50/$20.00) — do NOT enable unless latency SLAs demand it
- **Batch API** (async, up to 24h) saves 50% — use for nightly lead score recalculations, bulk insight generation, campaign analytics
- **Flex processing** sits between Batch and Standard — consider for semi-urgent background work

---

## The Plan

### Key Decision: API Key Architecture
- **Your OpenAI key is the default** for all users
- **Orgs/teams get the option** to use their own OpenAI key
- When orgs use their own key, their AI is personalized how they want (custom tones, system prompts, branding, model selection)
- **We are NOT touching AI API calls right now** — this is infrastructure work only

---

### Phase 1: Fill the Stub Endpoints (3-4 days)
**Goal:** Make AI Hub, Analytics, Training, and Insights pages show real data.

**1A. Model Performance Tracking**
- When `POST /ai/recalibrate` runs, store the result (accuracy before, accuracy after, date, model type) in a new `ModelPerformanceHistory` table or in `LeadScoringModel` fields
- `GET /ai/models/performance` returns this history for charts

**1B. Training Models List**
- `GET /ai/models/training` returns all `LeadScoringModel` records for the user's org with their accuracy, last trained date, status
- No longer returns empty array

**1C. Insights Generation**
- Implement `generateInsights()` in `openai.service.ts` (currently throws "Not implemented")
- `GET /ai/insights` calls `intelligence.service.ts` to analyze lead data and produce actionable insights:
  - "5 leads haven't been contacted in 14+ days"
  - "Your email open rate dropped 15% this week"
  - "Lead scoring model accuracy is below 70% — consider recalibrating"
- These are generated from real DB data, not AI calls (no OpenAI needed)

**1D. Recommendations Engine**
- `GET /ai/recommendations` returns next-best-action suggestions based on pipeline state
- Example: "Follow up with 3 hot leads", "Your Tuesday emails perform 2x better than Monday"

**1E. Real AI Stats**
- `GET /ai/stats` aggregates from `ChatMessage` table: total messages, total tokens, total cost this month
- Count models from `LeadScoringModel`, count insights generated

**1F. Dynamic Feature List**
- `GET /ai/features` reads actual feature availability based on what services are configured (OpenAI key present, Vapi key present, etc.)

---

### Phase 2: Token Limits & Usage Tracking (2-3 days)
**Goal:** Track every AI call, enforce limits by subscription tier, prevent runaway costs.

**2A. Recommended Token Limits by Tier**

| Resource | FREE ($0) | STARTER ($29) | PROFESSIONAL ($99) | ENTERPRISE ($299) |
|----------|-----------|---------------|--------------------|--------------------|
| AI messages/month | 50 | 500 | 5,000 | Unlimited |
| Max tokens/request | 500 | 1,000 | 2,000 | 4,000 |
| Content generations/month | 10 | 100 | 1,000 | Unlimited |
| AI Compose uses/month | 20 | 200 | 2,000 | Unlimited |
| Lead scoring recalculations/month | 5 | 50 | Unlimited | Unlimited |
| Chat history retention | 7 days | 30 days | 90 days | Unlimited |
| Rate limit (req/min) | 10 | 30 | 60 | 100 |

**Cost estimates (GPT-4 Turbo pricing):**
- FREE at 50 messages → ~$0.50-1.00/user/month
- STARTER at 500 messages → ~$5-10/user/month (well within $29 margin)
- PROFESSIONAL at 5,000 messages → ~$50-100/user/month (tight but workable at $99)
- ENTERPRISE unlimited → at $299/mo you have margin
- **Orgs using their own key bypass message count limits** (they pay OpenAI directly)

**2B. Wire Up `UsageTracking` Table**
- `UsageTracking` model already exists: `aiMessages`, `callMinutes`, `enhancements` fields
- Create `usage-tracking.service.ts`:
  - `incrementAIUsage(subscriptionId, type)` — called after every AI request
  - `getMonthlyUsage(subscriptionId)` — returns current month's totals
  - `checkUsageLimit(subscriptionId, type)` → `{ allowed, used, limit, remaining }`
- Add middleware that checks usage before every AI route handler
- Return 429 with upgrade message when limit hit

**2C. Add AI Limits to Subscription Config**
- Extend `subscriptions.ts` `PlanFeatures` interface with:
  - `maxMonthlyAIMessages`
  - `maxTokensPerRequest`
  - `maxContentGenerations`
  - `maxComposeUses`
  - `maxScoringRecalculations`
  - `chatHistoryDays`
  - `aiRateLimit` (req/min)

**2D. Cost Tracking Dashboard**
- Aggregate ChatMessage token/cost data into monthly view
- Admin dashboard widget: "AI Cost This Month" (total tokens, total cost, breakdown by feature)
- Users see: "X of Y AI messages used this month" in AI Hub

**2E. Org-Key Bypass Rule**
- If org uses their own OpenAI key → skip message count limits (they pay their own bill)
- Still enforce rate limits (protect server) and `maxTokensPerRequest` (prevent abuse)

---

### Phase 3: Org-Level API Key Management & AI Personalization (2-3 days)
**Goal:** Let orgs use their own OpenAI key and customize their AI behavior.

**3A. Schema Changes — Add to `Organization` model:**
- `openaiApiKey` (String?, encrypted at rest)
- `openaiOrgId` (String?)
- `useOwnAIKey` (Boolean, default false)
- `aiSystemPrompt` (String?) — custom instructions for the org's AI
- `aiDefaultTone` (String, default "professional")
- `aiDefaultModel` (String, default "gpt-4-turbo-preview")
- `aiMaxTokensPerRequest` (Int, default 1000)
- `aiMonthlyTokenBudget` (Int?) — optional hard cap

**3B. Key Resolution Service (`ai-config.service.ts`)**
- Resolves which OpenAI key + config to use per request:
  1. If org has `useOwnAIKey = true` AND `openaiApiKey` is set → use their key
  2. Otherwise → use platform key from `process.env.OPENAI_API_KEY`
- Create/cache OpenAI client instances per org so different orgs use different keys simultaneously

**3C. AI Personalization per Org**
- When building system prompts, prepend the org's `aiSystemPrompt` and `aiDefaultTone`
- Example: org sets instructions to "Always mention we specialize in luxury condos in Miami" → every AI response includes that context
- Org admins get a settings page: **"AI Settings"** where they can:
  - Set default tone
  - Write custom AI instructions
  - Paste their own OpenAI API key
  - Set their AI model preference
  - Set monthly token budget

**3D. Encrypt API Keys at Rest**
- Use AES-256 encryption (Node `crypto` module) for storing org OpenAI keys
- Decrypt only at request time in the key resolution service
- Add `AI_KEY_ENCRYPTION_SECRET` to env config

---

### Phase 4: User Preferences to Database (0.5 day)
**Goal:** Stop losing user preferences on server restart.

- `UserAIPreferences` Prisma model already exists with: `chatbotTone`, `autoSuggestActions`, `enableProactive`, `preferredContactTime`, `aiInsightsFrequency`, `customInstructions`
- Rewrite `user-preferences.service.ts` to use Prisma CRUD instead of in-memory `Map`
- Add missing fields to schema if needed: `defaultLength`, `defaultCTA`, `defaultPersonalization`
- Frontend already calls `/api/ai/preferences` endpoints — just need backend to persist

---

### Phase 5: Production Hardening (1-2 days)
**Goal:** Make the AI system production-safe.

- **Retry logic:** Wrap all OpenAI calls with exponential backoff (3 retries)
- **Fallback model:** If GPT-4 Turbo fails/rate-limited, auto-fallback to `gpt-3.5-turbo`
- **Key rotation:** Ability to rotate platform OpenAI key without downtime
- **Structured logging:** Every AI call logs model, tokens, latency, cost, org, user
- **Spend alerts:** Alert if monthly platform AI spend exceeds threshold
- **Dead code cleanup:** Remove `scoreLeadWithAI()` and other broken references

---

### Phase 6: Voice AI — Vapi.ai (5+ days) — DEFER
**Goal:** AI-powered voice calls for leads.

- `@vapi-ai/server-sdk` is installed, `AIAssistant` + `Call` models exist
- Requires: real Vapi API key, webhook setup, phone number provisioning, significant new UI
- **Recommendation: Park this for after launch.** It's a separate product feature, not a blocker.

---

## Build Order & Priority

| Priority | Phase | Effort | Why This Order |
|----------|-------|--------|----------------|
| **1** | Phase 2 — Token limits & usage tracking | 2-3 days | Protects your wallet before real users hit AI endpoints |
| **2** | Phase 1 — Fill stub endpoints | 3-4 days | Makes 4 empty pages show real data — huge perceived completeness |
| **3** | Phase 3 — Org key management & personalization | 2-3 days | Core business differentiator, self-serve for teams |
| **4** | Phase 4 — User preferences to DB | 0.5 day | Quick win, prevents data loss on restart |
| **5** | Phase 5 — Production hardening | 1-2 days | Required before real users |
| **6** | Phase 6 — Voice AI (Vapi) | 5+ days | Separate feature, do after everything else is solid |

**Total estimated effort: ~14-18 days**

---

## Web Search Integration

### Model Routing for Web Search

| Search Type | Model | Why |
|-------------|-------|-----|
| Normal web Q&A ("What are mortgage rates?") | `gpt-5.1` + web search tool | Fast, quality answer, users see it |
| Quick fact lookup | `gpt-5-mini` + web search tool | Cheap but still good at synthesizing results — nano is too brittle for nuanced summaries |
| Full research report (premium) | `gpt-5.2` + web search tool | Deep synthesis across multiple sources |
| Premium research (Enterprise only) | `gpt-5.2-pro` + web search tool | Most thorough analysis possible |

**Note:** Do NOT use gpt-5-nano for web search answers. Search results often need careful synthesis that nano can't reliably do. Nano is fine for *extracting/classifying* data from search results, but the final user-facing answer should always be gpt-5-mini or above.

### Web Search Usage Limits by Tier

| Tier | Web search calls/month |
|------|----------------------|
| FREE | 10 |
| STARTER | 100 |
| PROFESSIONAL | 1,000 |
| ENTERPRISE | Unlimited |

### Implementation Notes
- Web search is a **tool** (not a model) — enabled per API call
- Don't enable on every call — detect keywords ("current", "latest", "today's", "right now") or let the model decide
- Web search adds 2-5 seconds latency + extra tokens (search results injected into context)
- Budget ~2-5x token cost of a normal message when search is involved
- Cache web search results for 1-6 hours depending on query type
- `max_tokens` should be higher for search requests (2,000-3,000) so model can summarize findings

---

## Cost Optimization Recommendations

1. **4-tier model routing** — Use gpt-4o for user-facing, gpt-5-mini for background, gpt-5.2 for deep analysis, gpt-5.2-pro for premium only. This alone cuts costs 60-80% vs running gpt-5.2 on everything.

2. **Set a platform-wide monthly budget alarm** — OpenAI API dashboard lets you set spending limits. Set a hard cap (e.g., $500/month) so you can never get a surprise bill.

3. **Cache expensive answers** — Property descriptions for the same listing, market stats, mortgage rates, policy explanations. Don't regenerate every time. Cache for 1-24h depending on staleness tolerance.

4. **Leverage cached input pricing** — Structure system prompts to stay identical across calls. OpenAI charges 10x less for cached input ($0.175 vs $1.75 for gpt-5.2). Keeping system instructions stable triggers this automatically.

5. **Token estimation before calling API** — Use `tiktoken` (OpenAI's tokenizer) to estimate input tokens before sending. Reject requests that would exceed the user's remaining budget without burning tokens.

6. **Prompt compression** — System prompts in `ai-functions.service.ts` (3,000+ lines) are token-heavy. Trim function definitions to only include ones relevant to the user's current context. Could save 50-70% on input tokens per chat call.

7. **Batch API for non-urgent work** — OpenAI Batch API saves 50% and runs async over 24 hours. Perfect for nightly lead score recalculations, bulk insight generation, and campaign analytics. Not for real-time features.
