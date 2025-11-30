# 🧪 Phase 2 Features - Testing Guide

**All services are running and ready for testing!**

---

## 🚀 Service Status

✅ **Backend API:** Running on port 8000 (http://localhost:8000)  
✅ **Frontend:** Running on port 3000 (https://probable-fiesta-v65j576gg6qgfpp79-3000.app.github.dev)  
✅ **Prisma Studio:** Running on port 5555 (https://probable-fiesta-v65j576gg6qgfpp79-5555.app.github.dev)

**Schedulers Active:**
- ✅ Lead Scoring: Daily at 2 AM
- ✅ ML Optimization: Weekly on Sundays at 3 AM
- ✅ Campaign Scheduler: Every minute

---

## 🎯 Features Ready to Test

### 1. Intelligence Hub (Days 15-19)

**What's New:**
- Lead conversion probability predictions (0-100%)
- Deal value estimation ($5K-$25K)
- Engagement analysis with trends (increasing/stable/declining)
- Churn risk detection (Low/Medium/High)
- Next best action suggestions
- ML model optimization (manual and automatic)

**How to Test:**

1. **Access Intelligence Hub:**
   ```
   Frontend URL → AI Hub → Intelligence Insights
   ```

2. **View Dashboard:**
   - Check ML Model Performance widget
   - View accuracy, training data count, last optimized date
   - See model weights visualization

3. **Check Lead Predictions:**
   ```
   Navigate to: Leads → Leads List
   ```
   - Look for prediction badges below score badges
   - High-scoring leads (70+) show probability and value
   - Badges are color-coded (green/yellow/blue/red)

4. **View Full AI Insights:**
   ```
   Click any lead → Lead Detail page
   ```
   - Scroll to "AI Insights" card
   - See conversion probability with confidence
   - View estimated deal value
   - Check engagement score and trend
   - See churn risk indicator
   - Read next best action suggestion

5. **Trigger ML Optimization:**
   ```
   Intelligence Hub → Click "Optimize Model" button
   ```
   - Requires at least 20 WON/LOST leads
   - Will show accuracy improvement
   - Updates model weights

**API Endpoints to Test:**
```bash
# Get lead prediction
GET http://localhost:8000/api/intelligence/leads/:leadId/prediction

# Get engagement analysis
GET http://localhost:8000/api/intelligence/leads/:leadId/engagement

# Get next action
GET http://localhost:8000/api/intelligence/leads/:leadId/next-action

# Trigger optimization
POST http://localhost:8000/api/intelligence/optimize-scoring

# Get dashboard insights
GET http://localhost:8000/api/intelligence/insights/dashboard
```

---

### 2. A/B Testing System (Days 20-22)

**What's New:**
- Create and manage A/B tests
- 5 test types: Email Subject, Email Content, Email Timing, SMS Content, Landing Page
- Real-time performance tracking
- Statistical significance calculation (Chi-square test)
- P-values and confidence intervals
- Automatic winner declaration

**How to Test:**

1. **Access A/B Testing:**
   ```
   Frontend URL → Campaigns → A/B Testing
   ```

2. **View Existing Tests:**
   - See active tests with performance charts
   - Check completed tests with results
   - View stats dashboard (active tests, avg improvement)

3. **Create New Test:**
   ```
   Click "Create New Test" button
   ```
   - Enter test name: "Welcome Email Subject Test"
   - Select type: Email Subject
   - Control variant: "Welcome to Your New Home Journey"
   - Test variant: "Your Dream Home Awaits"
   - Start test

4. **Monitor Test Progress:**
   - View participant counts for each variant
   - See open rate, click rate, conversion rate
   - Watch for statistical significance indicator
   - Check p-value (significant if < 0.05)

5. **Stop Test and Review Results:**
   ```
   Click "Stop Test" button
   ```
   - System calculates final statistics
   - Declares winner if significant
   - Shows lift percentage and confidence intervals

**API Endpoints to Test:**
```bash
# Create test
POST http://localhost:8000/api/ab-tests
{
  "name": "Subject Line Test",
  "type": "EMAIL_SUBJECT",
  "controlVariant": "Original",
  "testVariant": "New Version"
}

# Get all tests
GET http://localhost:8000/api/ab-tests

# Get test results
GET http://localhost:8000/api/ab-tests/:id/results

# Start test
POST http://localhost:8000/api/ab-tests/:id/start

# Stop test
POST http://localhost:8000/api/ab-tests/:id/stop

# Record interaction
POST http://localhost:8000/api/ab-tests/:id/interaction
{
  "leadId": "lead_123",
  "variant": "test",
  "interactionType": "open"
}
```

---

### 3. AI Content Generation (Days 23-24)

**What's New:**
- Generate email sequences (3-7 emails)
- Generate SMS messages (160 chars)
- Generate property descriptions (150-250 words)
- Generate social media posts (multi-platform)
- Generate listing presentations (5 sections)
- Beautiful wizard interface
- Integrated into campaign creation

**How to Test:**

1. **Access Content Generator (Campaign Flow):**
   ```
   Frontend URL → Campaigns → Create Campaign
   ```
   - Select "Email Campaign"
   - Fill in campaign name and details
   - Click "Generate with AI" button

2. **Use Content Generator Wizard:**

   **Step 1: Select Content Type**
   - Choose from 5 options:
     - Email Sequence
     - SMS Message
     - Property Description
     - Social Media Posts
     - Listing Presentation

   **Step 2: Enter Details**
   - Fill in context fields (lead name, property type, goal, etc.)
   - Select tone (professional, friendly, urgent, etc.)
   - Configure options (sequence length, platforms, etc.)

   **Step 3: Review Generated Content**
   - View AI-generated content
   - Copy to clipboard or apply to campaign
   - Regenerate if needed

3. **Test Each Content Type:**

   **Email Sequence:**
   - Lead name: "John Smith"
   - Goal: "nurture new leads"
   - Tone: Friendly
   - Length: 5 emails
   - Should generate 5 emails with subjects and bodies

   **SMS Message:**
   - Goal: "confirm showing appointment"
   - Should generate message under 160 characters

   **Property Description:**
   - Address: "123 Oak Street"
   - Property type: "Single Family Home"
   - Add bedrooms, price, features
   - Should generate 150-250 word description

   **Social Posts:**
   - Topic: "new listing announcement"
   - Platforms: Facebook, Instagram, Twitter
   - Should generate platform-specific posts

   **Listing Presentation:**
   - Address: "456 Main Street"
   - Property type: "Condo"
   - Should generate 5-section presentation

4. **Apply Generated Content:**
   - Click "Use This Content" button
   - Content should populate campaign fields
   - Campaign should be ready to send

**API Endpoints to Test:**
```bash
# Generate email sequence
POST http://localhost:8000/api/ai/generate/email-sequence
{
  "leadName": "Sarah",
  "goal": "nurture new leads",
  "tone": "friendly",
  "sequenceLength": 5
}

# Generate SMS
POST http://localhost:8000/api/ai/generate/sms
{
  "goal": "confirm appointment",
  "tone": "friendly"
}

# Generate property description
POST http://localhost:8000/api/ai/generate/property-description
{
  "address": "123 Oak Street",
  "propertyType": "Single Family Home",
  "bedrooms": 4,
  "bathrooms": 2,
  "price": 500000
}

# Generate social posts
POST http://localhost:8000/api/ai/generate/social-posts
{
  "topic": "new listing",
  "platforms": ["facebook", "instagram"],
  "tone": "engaging"
}

# Generate listing presentation
POST http://localhost:8000/api/ai/generate/listing-presentation
{
  "address": "456 Main Street",
  "propertyType": "Condo",
  "estimatedValue": 350000
}
```

---

## 🔍 Testing Checklist

### Intelligence Hub
- [ ] Dashboard loads with model performance widget
- [ ] Model weights display correctly
- [ ] "Optimize Model" button works
- [ ] Prediction badges show on leads list
- [ ] Probability and value badges color-coded
- [ ] Lead detail shows full AI Insights card
- [ ] Conversion probability displays with confidence
- [ ] Engagement score shows with trend indicator
- [ ] Churn risk badge appears (Low/Medium/High)
- [ ] Next best action suggestion displays

### A/B Testing
- [ ] A/B Testing page loads
- [ ] Can create new test
- [ ] Test types available in dropdown
- [ ] Can enter control and test variants
- [ ] Can start test
- [ ] Participant counts update
- [ ] Performance metrics display (open, click, conversion)
- [ ] Charts render correctly
- [ ] Can stop test
- [ ] Statistical analysis runs
- [ ] Winner declared (if significant)
- [ ] P-value and confidence intervals shown

### Content Generation
- [ ] "Generate with AI" button appears in campaign create
- [ ] Content generator wizard opens
- [ ] All 5 content types selectable
- [ ] Can select content type
- [ ] Detail form appears with context fields
- [ ] Tone selector works (6 options)
- [ ] "Generate with AI" button triggers generation
- [ ] Loading indicator shows during generation
- [ ] Generated content displays in results step
- [ ] Copy to clipboard button works
- [ ] "Use This Content" applies to campaign
- [ ] Can regenerate content
- [ ] Modal closes properly

---

## 📊 Expected Results

### Intelligence Hub
- **Accuracy:** Will be 0% initially (need training data)
- **Training Data:** Shows count of WON/LOST leads
- **Predictions:** Display for all leads with 70+ score
- **Engagement Trends:** Calculated from activity history
- **Churn Risk:** Based on days since last activity + engagement score

### A/B Testing
- **Minimum Sample:** 30 participants per variant
- **Significance:** P-value < 0.05 = statistically significant
- **Winner:** Declared only if p < 0.05 and sample size met
- **Charts:** Real-time performance comparison
- **Lift:** Percentage improvement over control

### Content Generation
- **Email Sequence:** 3-7 emails (default 5)
  - Each with subject line and body
  - Day offset (0, 3, 6, 9, 12)
  - Progressive CTAs

- **SMS:** 
  - Under 160 characters
  - Clear CTA
  - No emojis

- **Property Description:**
  - 150-250 words
  - Lifestyle-focused
  - Feature highlights
  - Strong CTA

- **Social Posts:**
  - Platform-specific
  - Instagram: 5-10 hashtags
  - Twitter: Under 280 chars
  - LinkedIn: Professional tone

- **Listing Presentation:**
  - 5 sections
  - Introduction, Market Analysis, Pricing, Marketing, Next Steps
  - Data-driven insights

---

## 🐛 Known Issues / Limitations

### Intelligence Hub
- ⚠️ ML optimization requires 20+ WON/LOST leads
- ⚠️ Predictions may be inaccurate with <100 leads
- ⚠️ First optimization takes 2-3 seconds
- ⚠️ Weekly auto-optimization only runs Sundays at 3 AM

### A/B Testing
- ⚠️ Tests can't be restarted once stopped
- ⚠️ Minimum 30 participants required for significance
- ⚠️ P-value may stay high with small samples
- ⚠️ No automatic test stopping (manual only)

### Content Generation
- ⚠️ Requires OpenAI API key in backend/.env
- ⚠️ Generation takes 2-5 seconds (OpenAI latency)
- ⚠️ Output quality depends on input details
- ⚠️ May need regeneration for desired tone/style
- ⚠️ Cost: ~$0.016 per content generation

---

## 🔧 Troubleshooting

### Services Not Running
```bash
# Check if processes are running
ps aux | grep "dist/server.js"
ps aux | grep "vite"

# Restart services
./start-dev.sh
```

### Backend Errors
```bash
# Check backend logs
tail -f /tmp/backend.log

# Check for OpenAI API key
cd backend && grep OPENAI_API_KEY .env
```

### Frontend Errors
```bash
# Check frontend logs
tail -f /tmp/frontend.log

# Check browser console for errors
```

### API Errors
```bash
# Test backend health
curl http://localhost:8000/health

# Test with authentication
# 1. Get token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@realestate.com","password":"Admin123!"}'

# 2. Use token in requests
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/intelligence/insights/dashboard
```

---

## 📚 Documentation

Comprehensive user guides created:

1. **AI Content Generator Guide** (50+ pages)
   - Location: `docs/AI_CONTENT_GENERATOR_USER_GUIDE.md`
   - All 5 content types documented
   - Examples and best practices

2. **Intelligence Hub Guide** (40+ pages)
   - Location: `docs/INTELLIGENCE_HUB_USER_GUIDE.md`
   - Dashboard usage, predictions, ML optimization
   - Workflow integration examples

3. **A/B Testing Guide** (45+ pages)
   - Location: `docs/AB_TESTING_USER_GUIDE.md`
   - Statistical significance explained
   - Test design best practices

---

## ✅ Success Criteria

Phase 2 is successful when:

- [x] All services start without errors
- [x] Backend builds successfully (TypeScript)
- [x] Frontend builds successfully (TypeScript)
- [x] All API endpoints respond (200 OK)
- [ ] Intelligence Hub displays predictions
- [ ] A/B Testing can create and manage tests
- [ ] Content Generation produces quality output
- [ ] No critical bugs in production use
- [ ] User documentation complete and accurate

---

## 🎉 Next Steps

After testing Phase 2:

1. **Fix any bugs discovered**
2. **Gather user feedback on AI features**
3. **Consider starting Phase 3 (Voice AI)**
4. **Or focus on polish and optimization**

---

**Happy Testing! 🚀**

All Phase 2 features are ready for comprehensive testing. Follow the guides above to test each feature systematically.

**Questions or issues?** Check the troubleshooting section or review the detailed user guides in the `/docs` folder.
