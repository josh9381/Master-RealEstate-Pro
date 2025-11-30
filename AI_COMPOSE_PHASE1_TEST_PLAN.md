# AI Compose Phase 1 - Test Plan
**Date**: 2025-11-12
**Status**: 🧪 READY FOR TESTING
**Services**: ✅ Backend Running | ✅ Frontend Running

## Test Environment

### Service Status
- **Backend API**: https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev ✅
- **Frontend**: https://probable-fiesta-v65j576gg6qgfpp79-3000.app.github.dev ✅
- **Prisma Studio**: https://probable-fiesta-v65j576gg6qgfpp79-5555.app.github.dev ✅

### Test Prerequisites
- [ ] All services running (confirmed above)
- [ ] User logged into frontend
- [ ] At least one lead with conversation in database
- [ ] OpenAI API key configured in backend

---

## Test Cases

### 1. Backend API Tests

#### Test 1.1: Message Context Service
**Endpoint**: Internal service test
**Purpose**: Verify context gathering works correctly

```bash
# Create test script to verify context gathering
curl -X POST https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api/ai/compose \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "leadId": "VALID_LEAD_ID",
    "conversationId": "VALID_CONVERSATION_ID",
    "messageType": "email",
    "settings": {
      "tone": "professional",
      "length": "standard",
      "includeCTA": true,
      "personalization": "standard"
    }
  }'
```

**Expected Results**:
- ✅ Returns 200 OK
- ✅ Response includes message with subject and body
- ✅ Response includes context (leadName, leadScore, openRate, etc.)
- ✅ Response includes suggestions array
- ✅ Response includes tokens and cost

#### Test 1.2: AI Compose Endpoint - Professional Tone
**Settings**:
- Tone: Professional
- Length: Standard
- CTA: Yes
- Personalization: Standard

**Expected**:
- ✅ Message is formal and business-appropriate
- ✅ Includes clear call-to-action
- ✅ Uses lead's name and context

#### Test 1.3: AI Compose Endpoint - Friendly Tone
**Settings**:
- Tone: Friendly
- Length: Brief
- CTA: No
- Personalization: Deep

**Expected**:
- ✅ Message is warm and conversational
- ✅ No pushy CTA
- ✅ Includes personal details from context

#### Test 1.4: AI Compose Endpoint - Error Handling
**Test Cases**:
- Missing leadId → 400 Bad Request
- Invalid messageType → 400 Bad Request
- Non-existent lead → 404 Not Found
- OpenAI API error → 500 with error message

---

### 2. Frontend Component Tests

#### Test 2.1: AIComposer Component Rendering
**Steps**:
1. Navigate to Communication Hub
2. Select a lead conversation
3. Click "AI Compose" button

**Expected Results**:
- ✅ AIComposer component appears as modal/inline widget
- ✅ Shows "AI Compose" header with GPT-4 badge
- ✅ Shows loading spinner with "Generating your message..." text
- ✅ Auto-generates message on mount

#### Test 2.2: Context Banner Display
**Prerequisites**: Lead with engagement data exists

**Expected Results**:
- ✅ Context banner shows lead name
- ✅ Shows "Last contact X days ago" or "Never contacted"
- ✅ Shows email open rate percentage
- ✅ Shows lead score out of 100

#### Test 2.3: Quick Settings - Tone Selection
**Steps**:
1. Open AI Composer
2. Wait for initial generation
3. Change tone dropdown (Professional → Friendly)
4. Observe regeneration

**Expected Results**:
- ✅ Tone dropdown shows all 5 options
- ✅ Changing tone triggers automatic regeneration
- ✅ Loading spinner appears during regeneration
- ✅ New message reflects selected tone

#### Test 2.4: Quick Settings - Length Selection
**Steps**:
1. Change length dropdown (Standard → Brief)
2. Observe regeneration

**Expected Results**:
- ✅ Length dropdown shows 3 options (Brief, Standard, Detailed)
- ✅ Changing length triggers regeneration
- ✅ Brief messages are noticeably shorter
- ✅ Detailed messages are longer with more context

#### Test 2.5: Quick Settings - CTA Toggle
**Steps**:
1. Toggle CTA checkbox off
2. Observe regeneration
3. Toggle CTA checkbox on

**Expected Results**:
- ✅ CTA checkbox is clickable
- ✅ Toggling triggers regeneration
- ✅ Messages with CTA include action items
- ✅ Messages without CTA are informational only

#### Test 2.6: Advanced Settings - Personalization
**Steps**:
1. Click Settings icon (gear)
2. Advanced settings panel expands
3. Change Personalization dropdown (Standard → Deep)

**Expected Results**:
- ✅ Settings icon is visible
- ✅ Advanced panel slides open
- ✅ Personalization dropdown shows 3 options
- ✅ Deep personalization includes more lead-specific details

#### Test 2.7: Smart Suggestions Display
**Prerequisites**: Lead with engagement data

**Expected Results**:
- ✅ Yellow suggestions banner appears
- ✅ Shows "💡 AI Suggests:" prefix
- ✅ Displays relevant suggestion text
- ✅ Suggestions are contextually appropriate

#### Test 2.8: Action Buttons - Regenerate
**Steps**:
1. Wait for initial message generation
2. Click "Regenerate" button

**Expected Results**:
- ✅ Button shows refresh icon
- ✅ Triggers new generation with same settings
- ✅ Loading spinner appears
- ✅ New message content is generated

#### Test 2.9: Action Buttons - Copy
**Steps**:
1. Wait for message generation
2. Click "Copy" button
3. Paste in text editor

**Expected Results**:
- ✅ Button shows copy icon
- ✅ Success toast appears: "Copied to clipboard"
- ✅ Clipboard contains message body text
- ✅ Subject is not included in clipboard (body only)

#### Test 2.10: Action Buttons - Use This
**Steps**:
1. Wait for message generation
2. Click "Use This" button
3. Verify reply box

**Expected Results**:
- ✅ Button shows send icon
- ✅ AI Composer closes
- ✅ Reply text box is populated with message
- ✅ Success toast appears: "AI-generated message has been added to your reply box"
- ✅ Subject is stored (if email) for future use

#### Test 2.11: Close Button
**Steps**:
1. Open AI Composer
2. Click X button in top-right

**Expected Results**:
- ✅ AI Composer closes immediately
- ✅ Reply box remains unchanged
- ✅ No toast notification

#### Test 2.12: Token & Cost Display
**Expected Results**:
- ✅ Footer shows "~XXX tokens • $X.XXXX"
- ✅ Token count is reasonable (500-1500)
- ✅ Cost is accurate for GPT-4 Turbo pricing

---

### 3. Integration Tests

#### Test 3.1: Communication Inbox Integration
**Steps**:
1. Navigate to Communication Hub
2. Verify "AI Compose" button exists
3. Select different leads
4. Observe button state

**Expected Results**:
- ✅ AI Compose button visible in compose area
- ✅ Button disabled when no lead selected
- ✅ Button enabled when lead is selected
- ✅ Button has AI/sparkle icon

#### Test 3.2: Message Type Detection
**Test Cases**:
- Email conversation → Generate email with subject
- SMS conversation → Generate SMS (no subject)
- Call script → Generate call script

**Expected Results**:
- ✅ Correct messageType passed to API
- ✅ Email includes subject line
- ✅ SMS is concise (no subject)
- ✅ Call script is conversational

#### Test 3.3: Multi-Lead Testing
**Steps**:
1. Generate message for Lead A
2. Use message in reply box
3. Switch to Lead B
4. Open AI Composer again

**Expected Results**:
- ✅ Context switches to Lead B
- ✅ Message generated for Lead B's context
- ✅ No data leakage between leads

---

### 4. Error Handling Tests

#### Test 4.1: No Lead Selected
**Steps**:
1. Navigate to Communication Hub
2. Deselect all leads
3. Observe AI Compose button

**Expected**:
- ✅ Button is disabled
- ✅ No error when clicked (disabled prevents click)

#### Test 4.2: API Error Handling
**Simulate**: Backend returns 500 error

**Expected**:
- ✅ Error toast appears: "Error generating message"
- ✅ Loading spinner stops
- ✅ AI Composer remains open
- ✅ User can retry with "Regenerate"

#### Test 4.3: Network Timeout
**Simulate**: Slow/no network response

**Expected**:
- ✅ Loading spinner continues
- ✅ Eventually shows timeout error
- ✅ User can retry

#### Test 4.4: Invalid Lead Data
**Simulate**: Lead with missing/corrupt data

**Expected**:
- ✅ Service handles gracefully with defaults
- ✅ Message still generates
- ✅ Context shows "Unknown" for missing fields

---

### 5. Performance Tests

#### Test 5.1: Generation Speed
**Measure**: Time from click to message displayed

**Expected**:
- ✅ Initial generation: < 5 seconds
- ✅ Regeneration: < 5 seconds
- ✅ No UI freezing during generation

#### Test 5.2: Settings Change Debouncing
**Steps**:
1. Rapidly change tone 5 times
2. Observe API calls

**Expected**:
- ✅ Only final setting triggers API call
- ✅ No multiple overlapping requests
- ✅ Smooth UI updates

#### Test 5.3: Concurrent Usage
**Simulate**: Multiple users using AI Compose

**Expected**:
- ✅ No race conditions
- ✅ Each user gets their own context
- ✅ No cross-contamination

---

### 6. User Experience Tests

#### Test 6.1: First-Time User Experience
**Steps**:
1. User opens AI Compose for first time
2. Observe auto-generation

**Expected**:
- ✅ Clear loading indicator
- ✅ Helpful "Using GPT-4 with lead context" message
- ✅ Context banner explains what AI knows
- ✅ Intuitive controls

#### Test 6.2: Message Quality Assessment
**Criteria**:
- Relevance to lead context
- Appropriate tone
- Correct length
- Clear call-to-action (if enabled)
- No hallucinations or errors

**Expected**:
- ✅ Messages are contextually appropriate
- ✅ No generic "Dear Sir/Madam"
- ✅ Uses real lead data accurately
- ✅ Professional formatting

#### Test 6.3: Settings Persistence
**Steps**:
1. Change settings (tone, length, CTA)
2. Close AI Composer
3. Open again for same lead

**Expected**:
- ⚠️ Settings reset to defaults (acceptable for Phase 1)
- 📝 Future: Persist user preferences

---

## Automated Test Script

### Backend API Test
```bash
#!/bin/bash
# Test AI Compose API endpoint

BASE_URL="https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev"
TOKEN="YOUR_AUTH_TOKEN"
LEAD_ID="VALID_LEAD_ID"
CONV_ID="VALID_CONVERSATION_ID"

echo "Testing AI Compose API..."

# Test 1: Professional tone
response=$(curl -s -X POST "$BASE_URL/api/ai/compose" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"leadId\": \"$LEAD_ID\",
    \"conversationId\": \"$CONV_ID\",
    \"messageType\": \"email\",
    \"settings\": {
      \"tone\": \"professional\",
      \"length\": \"standard\",
      \"includeCTA\": true,
      \"personalization\": \"standard\"
    }
  }")

echo "Response: $response"

# Check for success
if echo "$response" | grep -q "\"success\":true"; then
  echo "✅ Test passed: Professional tone"
else
  echo "❌ Test failed: Professional tone"
fi
```

---

## Test Results Template

### Test Session: [Date/Time]
**Tester**: [Name]
**Environment**: Development
**Browser**: [Chrome/Firefox/Safari]

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 1.1 | Context Service | ⏳ | |
| 1.2 | Professional Tone | ⏳ | |
| 1.3 | Friendly Tone | ⏳ | |
| 2.1 | Component Rendering | ⏳ | |
| 2.2 | Context Banner | ⏳ | |
| 2.3 | Tone Selection | ⏳ | |
| 2.4 | Length Selection | ⏳ | |
| 2.5 | CTA Toggle | ⏳ | |
| 2.6 | Personalization | ⏳ | |
| 2.7 | Smart Suggestions | ⏳ | |
| 2.8 | Regenerate Button | ⏳ | |
| 2.9 | Copy Button | ⏳ | |
| 2.10 | Use This Button | ⏳ | |
| 2.11 | Close Button | ⏳ | |
| 2.12 | Token Display | ⏳ | |
| 3.1 | Inbox Integration | ⏳ | |
| 3.2 | Message Type Detection | ⏳ | |
| 4.1 | No Lead Error | ⏳ | |
| 4.2 | API Error Handling | ⏳ | |
| 5.1 | Generation Speed | ⏳ | |
| 6.1 | First-Time UX | ⏳ | |
| 6.2 | Message Quality | ⏳ | |

**Overall Status**: ⏳ Not Started

**Critical Issues Found**: [List]

**Non-Critical Issues**: [List]

**Recommendations**: [List]

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Mark Phase 1 as production-ready
2. Deploy to staging environment
3. Begin Phase 2 planning (Variations & Templates)
4. Gather user feedback for improvements

### If Issues Found ⚠️
1. Document all issues with severity
2. Fix critical bugs before moving forward
3. Re-run failed tests
4. Update documentation with known limitations

---

**Test Plan Created**: 2025-11-12
**Ready for Execution**: ✅ YES - All services running
**Estimated Test Time**: 2-3 hours for complete manual testing
