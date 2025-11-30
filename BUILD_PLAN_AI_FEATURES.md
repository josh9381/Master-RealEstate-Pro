# 🚀 BUILD PLAN - AI Features Implementation
**Complete Roadmap for All Incomplete Features**

---

## 📊 **CURRENT STATUS**

### ✅ **What's Already Done:**
- Backend API with 165+ endpoints
- Frontend UI with 89 pages
- Complete Leads System (CRUD, search, filter, import/export)
- Multi-tenant database architecture
- Authentication & authorization (JWT)
- User management system
- Basic dashboard

### ⏳ **What We Need to Build:**
- All AI features (scoring, chatbot, intelligence, voice calls)
- Subscription & billing system
- Voice campaign system
- Communications inbox (voice calls)
- Message enhancer
- A/B testing for campaigns

---

## 🎯 **BUILD PHASES**

---

## **PHASE 1: CORE AI FEATURES (Week 1-2)**
**Goal:** Get AI working and providing value to users

### **1.1 OpenAI Integration Setup**
**Priority:** CRITICAL (Foundation for all AI features)  
**Time Estimate:** 2-3 days

### **1.1 OpenAI Integration Setup**
**Priority:** CRITICAL (Foundation for all AI features)  
**Time Estimate:** 2-3 days

**Note:** Initial implementation uses OpenAI (GPT-4). Future enhancement will allow users to choose between OpenAI GPT and Anthropic Claude models.

#### **Backend Tasks:**
- [ ] Install `openai` npm package
- [ ] Add to `.env`: `OPENAI_API_KEY`, `OPENAI_ORG_ID`
- [ ] Create OpenAI service wrapper (`/backend/src/services/openai.service.ts`)
  ```typescript
  class OpenAIService {
    async chat(messages: ChatMessage[], userId: string): Promise<string>
    async analyzeLeadScore(leadData: any, userId: string): Promise<number>
    async enhanceMessage(text: string, tone: string): Promise<string>
    async generateInsights(userData: any, userId: string): Promise<Insight[]>
  }
  ```
- [ ] Add error handling and retry logic
- [ ] Add cost tracking per request
- [ ] Create usage logging system

#### **Future Enhancement (Post-Launch):**
- [ ] Add Anthropic Claude integration alongside OpenAI
- [ ] Create unified AI service interface that supports both providers
- [ ] Add user preference setting: "AI Provider: GPT-4 / Claude"
- [ ] Update pricing based on model costs (Claude may be cheaper/faster)
- [ ] A/B test which model performs better for real estate use cases

#### **Testing:**
- [ ] Test basic chat completion
- [ ] Test with rate limiting
- [ ] Test error handling
- [ ] Verify cost tracking works

**Deliverable:** OpenAI API ready to use throughout app

---

### **1.2 AI Chatbot Assistant**
**Priority:** HIGH (Immediate user value)  
**Time Estimate:** 5-7 days

#### **Backend Tasks:**
- [ ] Create Prisma schema for chat history
  ```prisma
  model ChatMessage {
    id        String   @id @default(cuid())
    userId    String
    role      String   // "user" or "assistant"
    content   String   @db.Text
    tokens    Int?
    createdAt DateTime @default(now())
    user      User     @relation(fields: [userId], references: [id])
    
    @@index([userId, createdAt])
  }
  ```

- [ ] Build chatbot endpoints:
  - `POST /api/chat/message` - Send message, get response
  - `GET /api/chat/history` - Get conversation history
  - `DELETE /api/chat/clear` - Clear chat history

- [ ] Implement function calling for tasks:
  ```typescript
  const functions = [
    {
      name: "get_lead_count",
      description: "Get count of leads matching criteria",
      parameters: { status: string, score?: string }
    },
    {
      name: "create_task",
      description: "Create a follow-up task",
      parameters: { leadId: string, description: string, dueDate: string }
    },
    {
      name: "update_lead_status",
      description: "Update a lead's status",
      parameters: { leadId: string, status: string }
    },
    // ... more functions
  ]
  ```

- [ ] Build context builder:
  - Load user's recent leads
  - Load recent activities
  - Load subscription info
  - Build prompt with context

- [ ] Add usage tracking (increment on each message)
- [ ] Add rate limiting per tier

#### **Frontend Tasks:**
- [ ] Create chatbot widget component
  - Floating button (bottom-right)
  - Collapsible chat window
  - Message bubbles (user vs assistant)
  - Typing indicator
  - Auto-scroll to bottom

- [ ] Add chatbot to all pages (global component)
- [ ] Create chat history view
- [ ] Add "suggested questions" on first open
- [ ] Add error handling UI

#### **Testing:**
- [ ] Test basic Q&A ("How many leads do I have?")
- [ ] Test task execution ("Create a task for Lead #123")
- [ ] Test complex queries ("Show hot leads from California")
- [ ] Test error scenarios
- [ ] Test rate limiting
- [ ] Test across different subscription tiers

**Deliverable:** Working AI chatbot that answers questions and executes tasks

---

### **1.3 AI Lead Scoring**
**Priority:** HIGH (Foundation for intelligence)  
**Time Estimate:** 4-5 days

#### **Backend Tasks:**
- [ ] Create Prisma schema for scoring models
  ```prisma
  model LeadScoringModel {
    id                String   @id @default(cuid())
    userId            String
    factors           Json     // Weighted factors learned from conversions
    accuracy          Float?   // Model accuracy percentage
    lastTrainedAt     DateTime?
    trainingDataCount Int      @default(0)
    createdAt         DateTime @default(now())
    updatedAt         DateTime @updatedAt
    user              User     @relation(fields: [userId], references: [id])
    
    @@unique([userId])
  }
  ```

- [ ] Add `score` field to Lead model:
  ```prisma
  model Lead {
    // ... existing fields
    score     Int?     // 0-100
    scoreUpdatedAt DateTime?
  }
  ```

- [ ] Build default scoring algorithm:
  - Recent activity = 30 points
  - Engagement (calls, emails opened) = 25 points
  - Budget match = 20 points
  - Timeline (buying soon) = 15 points
  - Source quality = 10 points

- [ ] Build scoring endpoints:
  - `POST /api/leads/:id/calculate-score` - Calculate single lead
  - `POST /api/leads/recalculate-all` - Recalculate all scores
  - `GET /api/scoring/model` - Get user's scoring model

- [ ] Build learning engine:
  - Analyze closed deals (status = "CLOSED_WON")
  - Find common patterns using OpenAI
  - Update scoring model in database
  - Triggered when user closes 10+ deals

- [ ] Build background job for score recalculation:
  - Run daily at 2am
  - Recalculate scores for leads with recent activity

#### **Frontend Tasks:**
- [ ] Add score badge to lead cards
  - 🔥 Red badge for Hot (80-100)
  - 🟡 Yellow badge for Warm (50-79)
  - ❄️ Blue badge for Cold (0-49)

- [ ] Add score filter to leads page
- [ ] Add score sort option
- [ ] Create scoring model page (`/settings/ai/scoring`)
  - Show which factors matter most
  - Show model accuracy
  - "Retrain Model" button

#### **Testing:**
- [ ] Test default scoring on new leads
- [ ] Test score updates when lead activity changes
- [ ] Test learning after closing 10 deals
- [ ] Test personalized scoring (User A vs User B)
- [ ] Test performance with 10,000+ leads

**Deliverable:** All leads have scores, scores update automatically, learns from conversions

---

### **1.4 Message Enhancer**
**Priority:** MEDIUM (Quick win)  
**Time Estimate:** 2-3 days

#### **Backend Tasks:**
- [ ] Build enhancement endpoint:
  - `POST /api/ai/enhance-message`
  - Request: `{ text: string, tone: string }`
  - Response: `{ enhanced: string, tokens: number }`

- [ ] Implement tone presets:
  - Professional
  - Friendly
  - Urgent
  - Casual
  - Persuasive
  - Formal

- [ ] Add usage tracking (increment enhancements counter)

#### **Frontend Tasks:**
- [ ] Create "Enhance with AI" button in campaign wizard
- [ ] Create enhancement modal:
  - Original text on left
  - Enhanced text on right
  - Tone selector dropdown
  - "Try Another Tone" button
  - "Apply" and "Cancel" buttons

- [ ] Add to script creation fields

#### **Testing:**
- [ ] Test all tone options
- [ ] Test with various input lengths
- [ ] Test usage limit enforcement

**Deliverable:** Users can enhance messages with one click

---

## **PHASE 2: VOICE INTELLIGENCE (Week 3-5)**
**Goal:** Get AI voice calls working

### **2.1 Vapi.ai Integration**
**Priority:** HIGH (Core differentiator)  
**Time Estimate:** 3-4 days

#### **Setup Tasks:**
- [ ] Create Vapi.ai account
- [ ] Get API key and add to `.env`: `VAPI_API_KEY`
- [ ] Install `@vapi-ai/web` package
- [ ] Read Vapi.ai docs thoroughly

#### **Backend Tasks:**
- [ ] Create Vapi service wrapper (`/backend/src/services/vapi.service.ts`)
  ```typescript
  class VapiService {
    async createAssistant(config: AssistantConfig): Promise<string>
    async makeCall(assistantId: string, phoneNumber: string): Promise<string>
    async getCallDetails(callId: string): Promise<CallDetails>
    async getTranscript(callId: string): Promise<Transcript>
  }
  ```

- [ ] Create Prisma schema for AI assistants:
  ```prisma
  model AIAssistant {
    id              String   @id @default(cuid())
    userId          String
    vapiAssistantId String   // Vapi's ID
    name            String
    businessName    String
    greeting        String   @db.Text
    voice           String   // "male-professional", "female-warm", etc.
    knowledgeBase   Json     // Custom instructions
    phoneNumber     String?
    isActive        Boolean  @default(true)
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
    user            User     @relation(fields: [userId], references: [id])
  }

  model Call {
    id              String   @id @default(cuid())
    userId          String
    leadId          String?
    vapiCallId      String   @unique
    direction       String   // "inbound" or "outbound"
    phoneNumber     String
    status          String   // "queued", "ringing", "in-progress", "completed", "failed"
    duration        Int?     // seconds
    cost            Float?
    transcript      String?  @db.Text
    recording       String?  // URL
    sentiment       String?  // "positive", "neutral", "negative"
    appointmentBooked Boolean @default(false)
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
    user            User     @relation(fields: [userId], references: [id])
    lead            Lead?    @relation(fields: [leadId], references: [id])
    
    @@index([userId, createdAt])
  }
  ```

- [ ] Build AI assistant endpoints:
  - `POST /api/ai-assistants/create` - Create personalized assistant
  - `GET /api/ai-assistants` - List user's assistants
  - `PUT /api/ai-assistants/:id` - Update assistant config
  - `DELETE /api/ai-assistants/:id` - Delete assistant

- [ ] Build call endpoints:
  - `POST /api/calls/make` - Initiate outbound call
  - `GET /api/calls` - List call history
  - `GET /api/calls/:id` - Get call details
  - `GET /api/calls/:id/transcript` - Get transcript
  - `GET /api/calls/:id/recording` - Get recording URL

- [ ] Build webhook handler:
  - `POST /api/webhooks/vapi` - Handle Vapi events
  - Handle: `call.started`, `call.ended`, `call.transcription.complete`
  - Update call status in database
  - Link call to lead
  - Update CRM if appointment booked

- [ ] Build phone number provisioning:
  - `POST /api/phone-numbers/provision` - Get new number for user
  - `GET /api/phone-numbers` - List user's numbers

#### **Frontend Tasks:**
- [ ] Create AI assistant setup page (`/settings/ai/assistant`)
  - Business name input
  - Custom greeting textarea
  - Voice selector (with previews)
  - Phone number display
  - "Test Call" button

- [ ] Create "Make Call" button on lead profiles
  - Click → Opens modal
  - Select assistant
  - Preview script
  - "Call Now" button

#### **Testing:**
- [ ] Test assistant creation
- [ ] Test outbound call (call yourself)
- [ ] Test inbound call
- [ ] Test transcript generation
- [ ] Test appointment booking
- [ ] Test CRM updates after call

**Deliverable:** AI can make and receive calls

---

### **2.2 Communications Inbox (Voice)**
**Priority:** MEDIUM  
**Time Estimate:** 3-4 days

#### **Backend Tasks:**
- Already have Call model (created above)
- [ ] Build inbox endpoints:
  - `GET /api/inbox/calls` - List all calls (paginated)
  - `GET /api/inbox/calls/unread` - Unread calls count
  - `PUT /api/inbox/calls/:id/star` - Star/unstar call
  - `PUT /api/inbox/calls/:id/archive` - Archive call
  - `DELETE /api/inbox/calls/:id` - Delete call

#### **Frontend Tasks:**
- [ ] Create inbox page (`/inbox`)
  - Call list (like email inbox)
  - Each row shows: Lead name, phone, duration, status, timestamp
  - Click to expand and see transcript
  - Filter by: All, Answered, Missed, Voicemail
  - Search functionality

- [ ] Create call detail modal:
  - Lead info at top
  - Play recording button
  - Full transcript
  - Sentiment badge
  - Quick actions: Call Back, Create Task, Star, Archive

- [ ] Add "Calls" badge to sidebar (show unread count)

#### **Testing:**
- [ ] Test call list display
- [ ] Test filters
- [ ] Test search
- [ ] Test recording playback
- [ ] Test quick actions

**Deliverable:** Users can view and manage all voice conversations

---

### **2.3 Voice Campaign System**
**Priority:** HIGH  
**Time Estimate:** 5-7 days

#### **Backend Tasks:**
- [ ] Update Campaign model to support voice:
  ```prisma
  model Campaign {
    // ... existing fields
    type          String   // "voice", "multi-touch"
    callScript    String?  @db.Text
    voiceTone     String?  // "professional", "friendly", etc.
    callStatus    String?  // "scheduled", "in-progress", "completed", "paused"
    callsCompleted Int     @default(0)
    callsAnswered  Int     @default(0)
    avgCallDuration Float?
  }
  ```

- [ ] Build campaign execution service:
  ```typescript
  class CampaignExecutor {
    async executeCampaign(campaignId: string): Promise<void>
    async callNextLead(campaignId: string): Promise<void>
    async pauseCampaign(campaignId: string): Promise<void>
    async resumeCampaign(campaignId: string): Promise<void>
  }
  ```

- [ ] Build campaign endpoints:
  - `POST /api/campaigns/:id/start` - Start campaign
  - `POST /api/campaigns/:id/pause` - Pause campaign
  - `POST /api/campaigns/:id/resume` - Resume campaign
  - `GET /api/campaigns/:id/stats` - Get real-time stats

- [ ] Build rate limiting:
  - Max 1 call per 6 seconds (10 calls/minute)
  - Configurable per campaign

- [ ] Build scheduler:
  - Cron job checks for scheduled campaigns
  - Respects timezone settings
  - Respects "do not call" hours

#### **Frontend Tasks:**
- [ ] Update campaign wizard to support voice:
  - Step 1: Choose "Voice Call Campaign"
  - Step 3: Script editor (instead of email editor)
  - Add voice tone selector
  - Add "Test Call" button

- [ ] Create campaign dashboard:
  - Real-time stats
  - Calls completed progress bar
  - Answer rate graph
  - Appointments booked counter
  - Pause/Resume button

- [ ] Add campaign analytics page

#### **Testing:**
- [ ] Test campaign creation
- [ ] Test scheduled campaign execution
- [ ] Test calling multiple leads in sequence
- [ ] Test rate limiting
- [ ] Test pause/resume
- [ ] Test stats tracking

**Deliverable:** Users can create and run voice campaigns

---

## **PHASE 3: ADVANCED AI (Week 6-7)**
**Goal:** Intelligence Hub and advanced features

### **3.1 AI Intelligence Hub**
**Priority:** MEDIUM  
**Time Estimate:** 5-7 days

#### **Backend Tasks:**
- [ ] Build analytics service:
  ```typescript
  class IntelligenceService {
    async getCloseprobability(leadId: string): Promise<number>
    async getBestContactTime(leadId: string): Promise<string>
    async getRiskyLeads(userId: string): Promise<Lead[]>
    async getRevenueForecast(userId: string): Promise<number>
    async getCampaignPredictions(userId: string): Promise<Prediction[]>
    async getNextBestActions(userId: string): Promise<Action[]>
  }
  ```

- [ ] Build intelligence endpoints:
  - `GET /api/intelligence/dashboard` - Get all insights
  - `GET /api/intelligence/lead/:id/probability` - Close probability
  - `GET /api/intelligence/forecast` - Revenue forecast
  - `GET /api/intelligence/at-risk` - Risky leads
  - `GET /api/intelligence/recommendations` - Next actions

- [ ] Implement prediction algorithms using OpenAI
- [ ] Build background job for daily insights generation

#### **Frontend Tasks:**
- [ ] Create Intelligence Hub page (`/intelligence`)
  - Dashboard with multiple widgets
  - Revenue forecast graph
  - At-risk leads list
  - Best times to call chart
  - Recommended actions cards

- [ ] Add "Close Probability" badge to lead details
- [ ] Add intelligence widget to main dashboard

#### **Testing:**
- [ ] Test predictions with real data
- [ ] Test accuracy improves over time
- [ ] Test with different user patterns

**Deliverable:** AI-powered insights dashboard

---

### **3.2 A/B Testing for Campaigns**
**Priority:** LOW (Advanced feature)  
**Time Estimate:** 4-5 days

#### **Backend Tasks:**
- [ ] Create A/B test schema:
  ```prisma
  model ABTest {
    id              String   @id @default(cuid())
    campaignId      String
    variations      Json     // Array of variations
    splitPercentage Json     // [50, 50] or [33, 33, 34]
    winnerCriteria  String   // "answer_rate", "appointments", "conversions"
    status          String   // "running", "completed"
    winnerId        String?
    createdAt       DateTime @default(now())
    completedAt     DateTime?
    campaign        Campaign @relation(fields: [campaignId], references: [id])
  }
  ```

- [ ] Build A/B test logic:
  - Split audience by percentage
  - Track metrics per variation
  - Calculate statistical significance
  - Auto-declare winner when significant

- [ ] Build A/B test endpoints:
  - `POST /api/campaigns/:id/ab-test` - Create test
  - `GET /api/campaigns/:id/ab-test/results` - Get results
  - `POST /api/campaigns/:id/ab-test/declare-winner` - Manual winner

#### **Frontend Tasks:**
- [ ] Add A/B test option to campaign wizard
- [ ] Create variation editor (add/remove variations)
- [ ] Create A/B test results dashboard
  - Side-by-side comparison
  - Statistical significance indicator
  - Winner badge

#### **Testing:**
- [ ] Test 2-variation test (50/50)
- [ ] Test 4-variation test (25/25/25/25)
- [ ] Test winner selection

**Deliverable:** A/B testing for voice campaigns

---

## **PHASE 4: SUBSCRIPTION & BILLING (Week 8-9)**
**Goal:** Monetization layer - charge users for AI features

### **4.1 Subscription & Billing System** 
**Priority:** HIGH (Needed before public launch)  
**Time Estimate:** 5-7 days

#### **Backend Tasks:**
- [ ] Create Prisma schema for subscriptions
  ```prisma
  model Subscription {
    id              String   @id @default(cuid())
    userId          String   @unique
    tier            String   // FREE, STARTER, PRO, ENTERPRISE
    status          String   // ACTIVE, CANCELED, PAST_DUE
    stripeCustomerId String?
    stripeSubscriptionId String?
    currentPeriodStart DateTime
    currentPeriodEnd   DateTime
    cancelAtPeriodEnd  Boolean @default(false)
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
    user            User     @relation(fields: [userId], references: [id])
  }

  model UsageTracking {
    id              String   @id @default(cuid())
    userId          String
    month           String   // "2025-01"
    aiMessages      Int      @default(0)
    callMinutes     Float    @default(0)
    enhancements    Int      @default(0)
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
    user            User     @relation(fields: [userId], references: [id])
    
    @@unique([userId, month])
  }
  ```

- [ ] Integrate Stripe API
  - Install `stripe` npm package
  - Create Stripe account and get API keys
  - Add to `.env`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

- [ ] Build subscription endpoints:
  - `POST /api/subscriptions/create` - Create new subscription
  - `POST /api/subscriptions/upgrade` - Upgrade tier
  - `POST /api/subscriptions/downgrade` - Downgrade tier
  - `POST /api/subscriptions/cancel` - Cancel subscription
  - `GET /api/subscriptions/current` - Get user's subscription
  - `GET /api/subscriptions/usage` - Get current usage stats

- [ ] Build Stripe webhook handler:
  - `POST /api/webhooks/stripe` - Handle Stripe events
  - Handle: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`

- [ ] Build usage tracking middleware:
  - Increment `aiMessages` on chatbot API calls
  - Increment `callMinutes` on voice call completion
  - Increment `enhancements` on message enhance API calls
  - Check limits before allowing actions

- [ ] Build monthly reset job:
  - Cron job that runs on 1st of month
  - Reset all usage counters to 0
  - Generate invoices for overages

#### **Frontend Tasks:**
- [ ] Create subscription selection page (signup flow)
- [ ] Create subscription management page (`/settings/subscription`)
  - Show current plan
  - Show usage stats with progress bars
  - Upgrade/downgrade buttons
  - Cancel subscription button
- [ ] Create usage dashboard widget (show in main dashboard)
- [ ] Add payment method management (Stripe Elements)
- [ ] Create billing history page

#### **Testing:**
- [ ] Test free tier signup
- [ ] Test paid tier signup with test card
- [ ] Test upgrade/downgrade flows
- [ ] Test usage tracking increments correctly
- [ ] Test monthly reset
- [ ] Test overage calculation
- [ ] Test webhook handling

**Deliverable:** Users can sign up, pay, and see their subscription status

### Subscription Tier Breakdown (what each tier includes — now vs later)

Below is a concrete, implementation-focused breakdown of suggested subscription tiers. For each tier we mark which features are available immediately ("Included - Now") and which are gated for future release or require upgrade/enterprise ("Allowed Later / Enterprise"). Use these as defaults we can tweak during pricing validation.

- Free (trial)
  - Included - Now:
    - Access to core CRM features (leads, contacts, basic dashboard)
    - Chatbot: 50 AI messages/month (read-only answers, no function-calls)
    - Call minutes: 0 (no Vapi calls)
    - Message Enhancer: 5 enhancements/month
    - Lead scoring: Display only (no retraining)
    - Basic inbox view (no call recordings)
  - Allowed Later / Upgrade:
    - Increase AI messages & enhancements
    - Add outbound AI calls and test number provisioning
    - Enable lead-scoring retraining
    - Access to campaign features

- Starter ($) — small teams / solo agents
  - Included - Now:
    - Chatbot: 1,000 AI messages/month (includes function-calls, limited rate)
    - Call minutes: 60 min/month (outbound via Vapi.ai)
    - Message Enhancer: 100 enhancements/month
    - Lead scoring: default scoring + recalculation (daily)
    - Communications Inbox with transcripts (7-day retention)
    - Create 1 AI Assistant (Vapi) and test calls
  - Allowed Later / Upgrade:
    - A/B testing for voice campaigns (limited to 1 active test)
    - Intelligence Hub widgets (read-only insights)
    - Multi-AI provider selection (post-launch)

- Pro ($$) — growing teams
  - Included - Now:
    - Chatbot: 10,000 AI messages/month
    - Call minutes: 600 min/month
    - Message Enhancer: 1,000 enhancements/month
    - Lead scoring: personalized model + retraining after 10 closed deals
    - Communications Inbox with 30-day transcript retention + recordings
    - Create up to 3 AI Assistants (Vapi) and provision phone numbers
    - Voice Campaigns (limited concurrency) and basic analytics
    - Usage dashboard & alerts
  - Allowed Later / Upgrade:
    - A/B testing (full feature set)
    - Intelligence Hub (full interactive widgets)
    - Priority support

- Enterprise ($$$) — large teams / custom
  - Included - Now:
    - Custom quotas (negotiable AI messages & call minutes)
    - SSO / advanced security
    - Dedicated onboarding & SLA
    - Full access to voice campaigns, A/B testing, intelligence hub
    - Longer transcript/recording retention and S3 export
    - Dedicated account manager & priority support
  - Allowed Later / Optional Add-ons:
    - On-premise data options / SOC2 support
    - Custom model tuning (paid consulting)
    - White-glove migration & custom integrations

Notes on enforcement and migration:
- Usage tracking is implemented via the `UsageTracking` model (see schema). Middleware will count `aiMessages`, `callMinutes`, and `enhancements` per API call and reject/soft-block actions when quotas are exceeded.
- During initial launch (billing deferred), we will track usage for all users but not enforce limits. When enabling billing we will:
  1. Notify users 14 days before limits/enforcement go live.
  2. Offer an automatic trial conversion to Starter/Pro tiers.
  3. Provide one-click upgrade paths in the app.
- Multi-AI provider and Claude support are slated as post-launch enhancements (see Future Enhancements). For tiers, "Allowed Later" flags features that will be gated until after Phase 4 (billing) or implemented as paid add-ons for Enterprise.

---

## **PHASE 5: POLISH & LAUNCH (Week 10)**
**Goal:** Final touches and launch preparation

### **5.1 Performance Optimization**
- [ ] Add database indexes for slow queries
- [ ] Implement caching (Redis) for frequently accessed data
- [ ] Optimize OpenAI API calls (reduce tokens)
- [ ] Add CDN for frontend assets
- [ ] Compress images and assets

### **5.2 Error Handling & Monitoring**
- [ ] Set up Sentry for error tracking
- [ ] Add comprehensive logging
- [ ] Create error recovery mechanisms
- [ ] Add health check endpoints
- [ ] Set up uptime monitoring

### **5.3 Testing & QA**
- [ ] Full end-to-end testing
- [ ] Cross-browser testing
- [ ] Mobile responsiveness check
- [ ] Load testing (simulate 100+ concurrent users)
- [ ] Security audit

### **5.4 Documentation**
- [ ] User onboarding guide
- [ ] Video tutorials
- [ ] API documentation (for Enterprise users)
- [ ] Admin documentation

### **5.5 Launch Preparation**
- [ ] Set up production environment
- [ ] Configure domain and SSL
- [ ] Set up email service (transactional emails)
- [ ] Create pricing page
- [ ] Create landing page
- [ ] Set up analytics (Google Analytics, Mixpanel)
- [ ] Create support system (Intercom or similar)

---

## 📅 **DETAILED TIMELINE**

### **Week 1-2: Core AI Features**
- Days 1-2: OpenAI integration setup
- Days 3-7: AI Chatbot backend + function calling
- Days 8-10: Chatbot frontend
- Days 11-12: AI Lead Scoring backend
- Day 13: Lead Scoring frontend
- Day 14: Message Enhancer

### **Week 3-4: Voice Intelligence Part 1**
- Days 15-17: Vapi.ai integration + assistant setup
- Days 18-20: Call endpoints + webhooks
- Days 21-23: Communications inbox
- Day 24-28: Voice campaign system

### **Week 5: Voice Intelligence Part 2**
- Days 29-33: Voice campaign frontend + testing
- Days 34-35: End-to-end voice testing

### **Week 6-7: Advanced AI**
- Days 36-40: Intelligence Hub backend
- Days 41-42: Intelligence Hub frontend
- Days 43-46: A/B Testing backend
- Day 47-49: A/B Testing frontend

### **Week 8-9: Subscription & Billing**
- Days 50-52: Stripe integration + subscription backend
- Days 53-55: Subscription frontend
- Days 56-59: Usage tracking + billing system
- Days 60-63: Testing payment flows

### **Week 10: Polish & Launch**
- Days 64-66: Performance optimization
- Days 67-68: Final testing
- Day 69: Documentation
- Day 70: LAUNCH! 🚀

---

## 💰 **COST BREAKDOWN**

### **Development Costs:**
- **Stripe:** Free (only transaction fees)
- **OpenAI API:** ~$100-200/month during development
- **Vapi.ai:** ~$100-200/month for testing
- **Server:** $50-100/month (Digital Ocean or AWS)
- **Database:** Included in server
- **Domain & SSL:** $15/year
- **Monitoring/Tools:** $50/month (Sentry, etc.)

**Total Monthly Dev Cost:** ~$300-500/month

### **Post-Launch Operating Costs (1,000 users):**
- **Server:** $200/month (larger server)
- **OpenAI:** ~$15,000/month (usage from users)
- **Vapi.ai:** ~$5,000/month (call costs)
- **Stripe fees:** ~$350/month (2.9% of revenue)
- **Tools:** $100/month

**Total Operating Cost:** ~$20,650/month  
**Revenue at 1,000 users:** ~$45,350/month  
**NET PROFIT:** ~$25,000/month ✅

---

## 🎯 **SUCCESS METRICS**

### **Technical Metrics:**
- [ ] API response time < 200ms (p95)
- [ ] Uptime > 99.9%
- [ ] AI chatbot accuracy > 90%
- [ ] Lead scoring accuracy > 80%
- [ ] Voice call success rate > 85%

### **Business Metrics:**
- [ ] 100 beta users in Month 1
- [ ] 500 users by Month 3
- [ ] 1,000 users by Month 6
- [ ] 25% free-to-paid conversion rate
- [ ] < 5% monthly churn

### **User Satisfaction:**
- [ ] NPS score > 50
- [ ] 4.5+ star rating
- [ ] < 24hr support response time

---

## 🚨 **RISKS & MITIGATION**

### **Risk 1: OpenAI costs spiral**
**Mitigation:**
- Strict rate limiting per tier
- Cache frequent queries
- Use GPT-3.5 instead of GPT-4 where possible
- Monitor costs daily
- **Future:** Add Claude option (potentially cheaper)

### **Risk 2: OpenAI downtime or rate limits**
**Mitigation:**
- Implement retry logic with exponential backoff
- Queue requests during high load
- **Future:** Multi-provider support (failover to Claude if OpenAI down)
- Show graceful error messages to users

### **Risk 2: Vapi.ai call quality issues**
**Mitigation:**
- Extensive testing before launch
- Backup: Build Twilio integration
- Clear user expectations
- Collect feedback early

### **Risk 3: Users abuse free tier**
**Mitigation:**
- Very limited free tier (50 leads, 10 msgs/day)
- Require credit card for trial
- Auto-upgrade prompts

### **Risk 4: Slow development**
**Mitigation:**
- Focus on MVP first
- Cut non-essential features
- Hire contractor if needed
- Use AI coding assistants (Cursor, Copilot)

---

## 🛠️ **TECHNICAL STACK SUMMARY**

### **Backend:**
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT authentication

### **Frontend:**
- React 18
- Vite
- TailwindCSS
- React Query (data fetching)
- Zustand (state management)

### **External APIs:**
- OpenAI (GPT-4) - *Primary AI provider*
- **Future:** Anthropic Claude - *Alternative AI provider (user choice)*
- Vapi.ai (voice calls)
- Stripe (payments)

### **Infrastructure:**
- Digital Ocean Droplet (or AWS EC2)
- PostgreSQL database
- Redis cache (optional)
- S3 for file storage

### **Dev Tools:**
- Git + GitHub
- VS Code + Cursor
- Postman (API testing)
- Prisma Studio (DB viewer)

---

## 🔮 **FUTURE ENHANCEMENTS (Post-Launch)**

### **AI Provider Choice:**
```
Users can select their preferred AI model in Settings:

┌─────────────────────────────────────┐
│ AI Settings                         │
├─────────────────────────────────────┤
│                                     │
│ AI Model Provider:                  │
│ ⚪ OpenAI GPT-4 (Recommended)       │
│    • Best for complex reasoning    │
│    • Most accurate                 │
│    • Cost: Medium                  │
│                                     │
│ ⚫ Anthropic Claude                 │
│    • Faster responses              │
│    • Good for conversations        │
│    • Cost: Lower                   │
│                                     │
│ [Save Preferences]                  │
└─────────────────────────────────────┘

Implementation:
- Add `aiProvider` field to User model
- Create unified AI interface:
  interface AIProvider {
    chat(messages): Promise<string>
    analyze(data): Promise<any>
  }
- Implement: OpenAIProvider, ClaudeProvider
- Route requests based on user preference
```

### **Why Add This Later:**

**Pros:**
- Lower costs for budget-conscious users
- Redundancy if one provider is down
- Better performance (Claude is faster for some tasks)
- Competitive advantage (most CRMs only offer one)

**Cons:**
- More complexity to maintain
- Need to test both providers
- Different prompts might work better for each
- Extra API costs during development

**When to Add:**
- After 1,000+ users (justify the complexity)
- If OpenAI costs become prohibitive
- If users specifically request it
- If Claude proves significantly better for real estate

**Estimated Development Time:** 1-2 weeks
- Week 1: Claude integration + unified interface
- Week 2: Testing, prompt optimization, user settings UI

---

## ✅ **PHASE 1 CHECKLIST (START HERE)**

Ready to begin? Here's your Week 1 checklist:

**Day 1:**
- [ ] Create OpenAI account (if not already)
- [ ] Get OpenAI API key
- [ ] Add `OPENAI_API_KEY` to `.env`
- [ ] Install `openai` npm package
- [ ] Create OpenAI service wrapper

**Day 2:**
- [ ] Test basic OpenAI chat completion
- [ ] Add error handling and retry logic
- [ ] Create cost tracking system
- [ ] Test with different prompts

**Day 3:**
- [ ] Create Prisma schema for chat messages
- [ ] Run `npx prisma migrate dev`
- [ ] Build `/api/chat/message` endpoint
- [ ] Build `/api/chat/history` endpoint

**Day 4:**
- [ ] Implement function calling for tasks
- [ ] Build context builder
- [ ] Test chatbot Q&A functionality
- [ ] Test task execution

**Day 5:**
- [ ] Create chatbot widget component (frontend)
- [ ] Add floating button to all pages
- [ ] Style chat interface
- [ ] Test end-to-end chatbot

**Day 6-7:**
- [ ] Add lead scoring schema to Prisma
- [ ] Build default scoring algorithm
- [ ] Create scoring endpoints
- [ ] Add score badges to lead cards

**After Week 1, you'll have:**
✅ OpenAI integrated and working  
✅ AI Chatbot answering questions  
✅ Chatbot executing tasks  
✅ Lead scoring displaying  
✅ Core AI features functional  

---

## 🎯 **WHY WE MOVED BILLING TO THE END**

### **Benefits of Building AI First:**

1. **Faster Value Delivery**
   - Users see AI features immediately
   - Can demo to potential customers sooner
   - Get feedback on AI quality early

2. **Easier Testing**
   - Test AI without payment flow complexity
   - Iterate on features without billing concerns
   - Use test accounts freely

3. **Better Product-Market Fit**
   - Validate AI features work well first
   - Confirm users want to pay AFTER seeing value
   - Adjust pricing based on actual usage patterns

4. **Reduced Complexity**
   - Focus on one thing at a time
   - Billing is complex - do it when everything else works
   - Avoid building billing for features that might change

5. **Launch Flexibility**
   - Can soft-launch without billing (invite-only beta)
   - Get real users testing AI features
   - Add billing when ready to monetize

### **When to Add Billing:**

- ✅ After all AI features are working
- ✅ After testing with beta users
- ✅ Before public launch
- ✅ When ready to charge real money

### **Temporary Workaround:**

While building without billing:
- Everyone uses "PRO" tier features
- No usage limits enforced
- Track usage for future pricing validation
- Can always add limits retroactively  

---

## 🚀 **READY TO BUILD?**

Start with Phase 1, Task 1.1: Subscription & Billing System

Would you like me to:
1. Generate the exact OpenAI service wrapper code?
2. Create the chatbot endpoint specifications?
3. Build the lead scoring algorithm?
4. Design the chatbot UI component?

**Let's build AI features first, billing later! �**
