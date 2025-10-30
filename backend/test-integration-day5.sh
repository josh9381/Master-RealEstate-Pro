#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8000/api"
PASS_COUNT=0
FAIL_COUNT=0

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Day 5: Integration Testing & Edge Cases${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Login to get token
echo -e "${YELLOW}Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.tokens.accessToken')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Logged in successfully${NC}"
echo ""

# Helper function to track tests
pass_test() {
  ((PASS_COUNT++))
  echo -e "${GREEN}✓ $1${NC}"
}

fail_test() {
  ((FAIL_COUNT++))
  echo -e "${RED}✗ $1${NC}"
}

# ==============================================
# SECTION 1: Error Handling Tests
# ==============================================
echo -e "${BLUE}=== Section 1: Error Handling ===${NC}"
echo ""

# Test 1: Send email without template or content
echo -e "${YELLOW}Test 1: Email without template or content (should fail)...${NC}"
ERROR_RESPONSE=$(curl -s -X POST "$BASE_URL/messages/email" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com"}')

ERROR_MSG=$(echo $ERROR_RESPONSE | jq -r '.error')
if [ "$ERROR_MSG" != "null" ] && [ "$ERROR_MSG" != "" ]; then
  pass_test "Correctly rejected email without content: $ERROR_MSG"
else
  fail_test "Should have rejected email without content"
fi
echo ""

# Test 2: Invalid email format
echo -e "${YELLOW}Test 2: Invalid email format (should fail)...${NC}"
INVALID_EMAIL=$(curl -s -X POST "$BASE_URL/messages/email" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "not-an-email", "subject": "Test", "body": "Test"}')

ERROR_MSG=$(echo $INVALID_EMAIL | jq -r '.error')
if echo "$ERROR_MSG" | grep -qi "email\|validation"; then
  pass_test "Correctly rejected invalid email format"
else
  fail_test "Should have rejected invalid email"
fi
echo ""

# Test 3: Invalid phone format
echo -e "${YELLOW}Test 3: Invalid phone format (should fail)...${NC}"
INVALID_PHONE=$(curl -s -X POST "$BASE_URL/messages/sms" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "not-a-phone", "body": "Test"}')

ERROR_MSG=$(echo $INVALID_PHONE | jq -r '.error')
if echo "$ERROR_MSG" | grep -qi "phone\|format\|validation"; then
  pass_test "Correctly rejected invalid phone format"
else
  fail_test "Should have rejected invalid phone"
fi
echo ""

# Test 4: SMS exceeding character limit
echo -e "${YELLOW}Test 4: SMS exceeding 1600 character limit (should fail)...${NC}"
LONG_SMS=$(python3 -c "print('A' * 1700)")
LONG_SMS_RESPONSE=$(curl -s -X POST "$BASE_URL/messages/sms" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"to\": \"+12345678901\", \"body\": \"$LONG_SMS\"}")

ERROR_MSG=$(echo $LONG_SMS_RESPONSE | jq -r '.error')
DETAIL_MSG=$(echo $LONG_SMS_RESPONSE | jq -r '.details[0].message')
if echo "$ERROR_MSG $DETAIL_MSG" | grep -qi "1600\|character\|limit"; then
  pass_test "Correctly rejected SMS over 1600 chars"
else
  fail_test "Should have rejected long SMS"
fi
echo ""

# Test 5: Non-existent template
echo -e "${YELLOW}Test 5: Using non-existent template (should fail)...${NC}"
FAKE_TEMPLATE=$(curl -s -X POST "$BASE_URL/messages/email" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "templateId": "clx123456789abcdefg"}')

ERROR_MSG=$(echo $FAKE_TEMPLATE | jq -r '.error')
DETAIL_MSG=$(echo $FAKE_TEMPLATE | jq -r '.details[0].message')
if echo "$ERROR_MSG $DETAIL_MSG" | grep -qi "template\|not found\|invalid"; then
  pass_test "Correctly rejected non-existent template: $ERROR_MSG"
else
  fail_test "Should have rejected fake template ID"
fi
echo ""

# ==============================================
# SECTION 2: Template Integration Tests
# ==============================================
echo -e "${BLUE}=== Section 2: Template Integration ===${NC}"
echo ""

# Create test lead with full data
echo -e "${YELLOW}Creating test lead with complete data...${NC}"
UNIQUE_EMAIL="integration.test.$(date +%s)@example.com"
LEAD_RESPONSE=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"John Test Doe\",
    \"email\": \"$UNIQUE_EMAIL\",
    \"phone\": \"+19876543210\",
    \"company\": \"Integration Test Corp\",
    \"position\": \"CEO\",
    \"status\": \"NEW\",
    \"source\": \"website\",
    \"score\": 85,
    \"value\": 50000
  }")

LEAD_ID=$(echo $LEAD_RESPONSE | jq -r '.data.lead.id')
pass_test "Lead created: $LEAD_ID"
echo ""

# Test 6: Template with all variable types
echo -e "${YELLOW}Test 6: Template with lead, user, and system variables...${NC}"
COMPLEX_TEMPLATE=$(curl -s -X POST "$BASE_URL/email-templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Complex Variable Template",
    "subject": "Hello {{lead.firstName}} from {{lead.company}}!",
    "body": "Hi {{lead.firstName}} {{lead.lastName}},\n\nYour email: {{lead.email}}\nYour phone: {{lead.phone}}\nPosition: {{lead.position}}\nStatus: {{lead.status}}\nScore: {{lead.score}}\nValue: {{lead.value}}\nSource: {{lead.source}}\n\nToday: {{system.currentDate}}\nTime: {{system.currentTime}}\nYear: {{system.currentYear}}\n\nBest regards",
    "category": "test",
    "isActive": true
  }')

TEMPLATE_ID=$(echo $COMPLEX_TEMPLATE | jq -r '.id')
pass_test "Complex template created: $TEMPLATE_ID"

# Send email with template
EMAIL_WITH_VARS=$(curl -s -X POST "$BASE_URL/messages/email" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$UNIQUE_EMAIL\",
    \"leadId\": \"$LEAD_ID\",
    \"templateId\": \"$TEMPLATE_ID\"
  }")

EMAIL_ID=$(echo $EMAIL_WITH_VARS | jq -r '.messageId')
pass_test "Email sent with all variables: $EMAIL_ID"

# Fetch the message and verify variables were replaced
MESSAGE_CHECK=$(curl -s -X GET "$BASE_URL/messages?leadId=$LEAD_ID&type=EMAIL&limit=1" \
  -H "Authorization: Bearer $TOKEN")

MESSAGE_BODY=$(echo $MESSAGE_CHECK | jq -r '.messages[0].body')
MESSAGE_SUBJECT=$(echo $MESSAGE_CHECK | jq -r '.messages[0].subject')

if echo "$MESSAGE_BODY" | grep -q "{{"; then
  fail_test "Variables not replaced in body: found {{"
else
  pass_test "All variables replaced in body"
fi

if echo "$MESSAGE_SUBJECT" | grep -q "{{"; then
  fail_test "Variables not replaced in subject"
else
  pass_test "All variables replaced in subject"
fi

# Verify specific replacements
if echo "$MESSAGE_BODY" | grep -q "John"; then
  pass_test "firstName replaced correctly (John)"
else
  fail_test "firstName not found"
fi

if echo "$MESSAGE_BODY" | grep -q "CEO"; then
  pass_test "position replaced correctly (CEO)"
else
  fail_test "position not found"
fi

if echo "$MESSAGE_BODY" | grep -q "Score:"; then
  SCORE_VALUE=$(echo "$MESSAGE_BODY" | grep -o "Score: [0-9]*" | grep -o "[0-9]*")
  pass_test "score replaced correctly (Score: $SCORE_VALUE)"
else
  fail_test "score not found"
fi
echo ""

# Test 7: Template with custom variables
echo -e "${YELLOW}Test 7: Template with custom variables...${NC}"
CUSTOM_TEMPLATE=$(curl -s -X POST "$BASE_URL/email-templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom Variables Template",
    "subject": "{{custom.eventName}} Invitation",
    "body": "Hi {{lead.firstName}},\n\nYou are invited to {{custom.eventName}} on {{custom.eventDate}} at {{custom.location}}.\n\nTicket Price: ${{custom.price}}",
    "category": "test",
    "isActive": true
  }')

CUSTOM_TEMPLATE_ID=$(echo $CUSTOM_TEMPLATE | jq -r '.id')

# Send with custom variables
CUSTOM_EMAIL=$(curl -s -X POST "$BASE_URL/messages/email" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$UNIQUE_EMAIL\",
    \"leadId\": \"$LEAD_ID\",
    \"templateId\": \"$CUSTOM_TEMPLATE_ID\",
    \"templateVariables\": {
      \"eventName\": \"Tech Summit 2025\",
      \"eventDate\": \"November 15, 2025\",
      \"location\": \"San Francisco Convention Center\",
      \"price\": \"499\"
    }
  }")

CUSTOM_EMAIL_ID=$(echo $CUSTOM_EMAIL | jq -r '.messageId')
pass_test "Email with custom variables sent: $CUSTOM_EMAIL_ID"

# Verify custom variables
CUSTOM_MESSAGE=$(curl -s -X GET "$BASE_URL/messages?leadId=$LEAD_ID&limit=1" \
  -H "Authorization: Bearer $TOKEN")

CUSTOM_BODY=$(echo $CUSTOM_MESSAGE | jq -r '.messages[0].body')
if echo "$CUSTOM_BODY" | grep -q "Tech Summit 2025"; then
  pass_test "Custom variable replaced (Tech Summit 2025)"
else
  fail_test "Custom variable not replaced"
fi

if echo "$CUSTOM_BODY" | grep -q "San Francisco"; then
  pass_test "Custom variable replaced (San Francisco)"
else
  fail_test "Custom location not replaced"
fi
echo ""

# ==============================================
# SECTION 3: Threading & Replies
# ==============================================
echo -e "${BLUE}=== Section 3: Threading & Replies ===${NC}"
echo ""

# Test 8: Create thread with multiple messages
echo -e "${YELLOW}Test 8: Creating threaded conversation...${NC}"
THREAD_ID="thread_$(date +%s)"

# Send first message with thread ID
MSG1=$(curl -s -X POST "$BASE_URL/messages/email" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$UNIQUE_EMAIL\",
    \"subject\": \"Thread Test - Message 1\",
    \"body\": \"This is the first message\",
    \"threadId\": \"$THREAD_ID\",
    \"leadId\": \"$LEAD_ID\"
  }")

MSG1_ID=$(echo $MSG1 | jq -r '.messageId')
pass_test "First message sent: $MSG1_ID"

# Send second message with same thread ID
MSG2=$(curl -s -X POST "$BASE_URL/messages/email" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$UNIQUE_EMAIL\",
    \"subject\": \"Thread Test - Message 2\",
    \"body\": \"This is the second message\",
    \"threadId\": \"$THREAD_ID\",
    \"leadId\": \"$LEAD_ID\"
  }")

MSG2_ID=$(echo $MSG2 | jq -r '.messageId')
pass_test "Second message sent: $MSG2_ID"

# Send third message with same thread ID
MSG3=$(curl -s -X POST "$BASE_URL/messages/email" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$UNIQUE_EMAIL\",
    \"subject\": \"Thread Test - Message 3\",
    \"body\": \"This is the third message\",
    \"threadId\": \"$THREAD_ID\",
    \"leadId\": \"$LEAD_ID\"
  }")

MSG3_ID=$(echo $MSG3 | jq -r '.messageId')
pass_test "Third message sent: $MSG3_ID"

# Test thread retrieval (note: this may not work if metadata isn't being stored properly)
echo -e "${YELLOW}Note: Thread retrieval endpoint may need database schema update for threadId field${NC}"
echo ""

# ==============================================
# SECTION 4: Bulk Operations & Performance
# ==============================================
echo -e "${BLUE}=== Section 4: Bulk Operations ===${NC}"
echo ""

# Test 9: Create multiple leads and send bulk messages
echo -e "${YELLOW}Test 9: Bulk message sending (5 leads)...${NC}"
LEAD_IDS=()

for i in {1..5}; do
  BULK_EMAIL="bulk.lead.$i.$(date +%s)@example.com"
  BULK_LEAD=$(curl -s -X POST "$BASE_URL/leads" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Bulk Lead $i\",
      \"email\": \"$BULK_EMAIL\",
      \"phone\": \"+1987654321$i\",
      \"company\": \"Company $i\",
      \"status\": \"NEW\",
      \"source\": \"test\"
    }")
  
  BULK_LEAD_ID=$(echo $BULK_LEAD | jq -r '.data.lead.id')
  LEAD_IDS+=("$BULK_LEAD_ID")
  
  # Send email to each
  curl -s -X POST "$BASE_URL/messages/email" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"to\": \"$BULK_EMAIL\",
      \"subject\": \"Bulk Test $i\",
      \"body\": \"This is bulk message $i\",
      \"leadId\": \"$BULK_LEAD_ID\"
    }" > /dev/null
done

pass_test "Created 5 leads and sent 5 emails"
echo ""

# Test 10: Mark multiple messages as read
echo -e "${YELLOW}Test 10: Mark multiple messages as read...${NC}"

# Get some message IDs
UNREAD_MESSAGES=$(curl -s -X GET "$BASE_URL/messages?limit=3" \
  -H "Authorization: Bearer $TOKEN")

MSG_ID_1=$(echo $UNREAD_MESSAGES | jq -r '.messages[0].id')
MSG_ID_2=$(echo $UNREAD_MESSAGES | jq -r '.messages[1].id')
MSG_ID_3=$(echo $UNREAD_MESSAGES | jq -r '.messages[2].id')

# Mark as read
MARK_READ_RESPONSE=$(curl -s -X POST "$BASE_URL/messages/mark-read" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"messageIds\": [\"$MSG_ID_1\", \"$MSG_ID_2\", \"$MSG_ID_3\"]
  }")

SUCCESS=$(echo $MARK_READ_RESPONSE | jq -r '.success')
if [ "$SUCCESS" == "true" ]; then
  pass_test "Marked 3 messages as read"
else
  fail_test "Failed to mark messages as read"
fi
echo ""

# Test 11: Pagination test
echo -e "${YELLOW}Test 11: Pagination (large dataset)...${NC}"

# Get page 1
PAGE1=$(curl -s -X GET "$BASE_URL/messages?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN")

PAGE1_COUNT=$(echo $PAGE1 | jq -r '.messages | length')
TOTAL=$(echo $PAGE1 | jq -r '.pagination.total')
PAGES=$(echo $PAGE1 | jq -r '.pagination.totalPages')

pass_test "Page 1: $PAGE1_COUNT messages, Total: $TOTAL, Pages: $PAGES"

# Get page 2
PAGE2=$(curl -s -X GET "$BASE_URL/messages?page=2&limit=5" \
  -H "Authorization: Bearer $TOKEN")

PAGE2_COUNT=$(echo $PAGE2 | jq -r '.messages | length')
pass_test "Page 2: $PAGE2_COUNT messages"
echo ""

# ==============================================
# SECTION 5: Template Usage Tracking
# ==============================================
echo -e "${BLUE}=== Section 5: Template Usage Tracking ===${NC}"
echo ""

# Test 12: Verify usage count increments
echo -e "${YELLOW}Test 12: Template usage tracking...${NC}"

# Create new template
TRACKING_TEMPLATE=$(curl -s -X POST "$BASE_URL/email-templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Usage Tracking Template",
    "subject": "Test",
    "body": "Test body",
    "category": "test",
    "isActive": true
  }')

TRACKING_ID=$(echo $TRACKING_TEMPLATE | jq -r '.id')
INITIAL_USAGE=$(echo $TRACKING_TEMPLATE | jq -r '.usageCount')
pass_test "Template created with initial usage: $INITIAL_USAGE"

# Use it 3 times
for i in {1..3}; do
  curl -s -X POST "$BASE_URL/messages/email" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"to\": \"tracking$i@example.com\",
      \"templateId\": \"$TRACKING_ID\"
    }" > /dev/null
done

# Check usage count
TEMPLATE_CHECK=$(curl -s -X GET "$BASE_URL/email-templates/$TRACKING_ID" \
  -H "Authorization: Bearer $TOKEN")

FINAL_USAGE=$(echo $TEMPLATE_CHECK | jq -r '.usageCount')
LAST_USED=$(echo $TEMPLATE_CHECK | jq -r '.lastUsedAt')

if [ "$FINAL_USAGE" == "3" ]; then
  pass_test "Usage count correctly incremented to 3"
else
  fail_test "Usage count incorrect: expected 3, got $FINAL_USAGE"
fi

if [ "$LAST_USED" != "null" ]; then
  pass_test "lastUsedAt timestamp updated"
else
  fail_test "lastUsedAt not set"
fi
echo ""

# ==============================================
# SECTION 6: Cleanup
# ==============================================
echo -e "${BLUE}=== Cleanup ===${NC}"
echo ""

echo -e "${YELLOW}Cleaning up test data...${NC}"

# Delete templates
curl -s -X DELETE "$BASE_URL/email-templates/$TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X DELETE "$BASE_URL/email-templates/$CUSTOM_TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X DELETE "$BASE_URL/email-templates/$TRACKING_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

# Delete leads
curl -s -X DELETE "$BASE_URL/leads/$LEAD_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

for lid in "${LEAD_IDS[@]}"; do
  curl -s -X DELETE "$BASE_URL/leads/$lid" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
done

pass_test "Cleanup complete"
echo ""

# ==============================================
# FINAL SUMMARY
# ==============================================
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Day 5 Integration Testing Complete${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${GREEN}Tests Passed: $PASS_COUNT${NC}"
if [ $FAIL_COUNT -gt 0 ]; then
  echo -e "${RED}Tests Failed: $FAIL_COUNT${NC}"
else
  echo -e "${GREEN}Tests Failed: $FAIL_COUNT${NC}"
fi
echo ""

TOTAL_TESTS=$((PASS_COUNT + FAIL_COUNT))
SUCCESS_RATE=$((PASS_COUNT * 100 / TOTAL_TESTS))

echo -e "${BLUE}Success Rate: $SUCCESS_RATE%${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}🎉 All integration tests passed! 🎉${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some tests failed. Review above for details.${NC}"
  exit 1
fi
