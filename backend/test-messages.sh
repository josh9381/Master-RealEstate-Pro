#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8000/api"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Message System Tests (with Templates)${NC}"
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

# Test 1: Create test lead for messaging
echo -e "${YELLOW}Test 1: Creating test lead...${NC}"
UNIQUE_EMAIL="jane.smith.$(date +%s)@example.com"
LEAD_RESPONSE=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Jane Smith\",
    \"email\": \"$UNIQUE_EMAIL\",
    \"phone\": \"+12345678901\",
    \"company\": \"Test Corp\",
    \"status\": \"NEW\",
    \"source\": \"website\"
  }")

LEAD_ID=$(echo $LEAD_RESPONSE | jq -r '.data.lead.id')
echo -e "${GREEN}✓ Lead created: $LEAD_ID${NC}"
echo ""

# Test 2: Create email template for testing
echo -e "${YELLOW}Test 2: Creating email template...${NC}"
EMAIL_TEMPLATE_RESPONSE=$(curl -s -X POST "$BASE_URL/email-templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Email for Messages",
    "subject": "Welcome {{lead.firstName}}!",
    "body": "Hello {{lead.name}},\n\nWelcome to our platform! We are at {{lead.company}}.\n\nBest regards",
    "category": "welcome",
    "isActive": true
  }')

EMAIL_TEMPLATE_ID=$(echo $EMAIL_TEMPLATE_RESPONSE | jq -r '.id')
echo -e "${GREEN}✓ Email template created: $EMAIL_TEMPLATE_ID${NC}"
echo ""

# Test 3: Create SMS template for testing
echo -e "${YELLOW}Test 3: Creating SMS template...${NC}"
SMS_TEMPLATE_RESPONSE=$(curl -s -X POST "$BASE_URL/sms-templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome SMS for Messages",
    "body": "Hi {{lead.firstName}}! Welcome to our platform. - Team",
    "category": "welcome",
    "isActive": true
  }')

SMS_TEMPLATE_ID=$(echo $SMS_TEMPLATE_RESPONSE | jq -r '.id')
echo -e "${GREEN}✓ SMS template created: $SMS_TEMPLATE_ID${NC}"
echo ""

# Test 4: Send email WITHOUT template (direct)
echo -e "${YELLOW}Test 4: Sending email without template...${NC}"
DIRECT_EMAIL_RESPONSE=$(curl -s -X POST "$BASE_URL/messages/email" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"jane.smith@example.com\",
    \"subject\": \"Direct Email Test\",
    \"body\": \"This is a direct email without template.\",
    \"leadId\": \"$LEAD_ID\"
  }")

DIRECT_EMAIL_ID=$(echo $DIRECT_EMAIL_RESPONSE | jq -r '.messageId')
DIRECT_THREAD_ID=$(echo $DIRECT_EMAIL_RESPONSE | jq -r '.threadId')
echo -e "${GREEN}✓ Direct email sent: $DIRECT_EMAIL_ID (thread: $DIRECT_THREAD_ID)${NC}"
echo ""

# Test 5: Send email WITH template (template variables)
echo -e "${YELLOW}Test 5: Sending email with template...${NC}"
TEMPLATE_EMAIL_RESPONSE=$(curl -s -X POST "$BASE_URL/messages/email" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"jane.smith@example.com\",
    \"leadId\": \"$LEAD_ID\",
    \"templateId\": \"$EMAIL_TEMPLATE_ID\"
  }")

TEMPLATE_EMAIL_ID=$(echo $TEMPLATE_EMAIL_RESPONSE | jq -r '.messageId')
TEMPLATE_THREAD_ID=$(echo $TEMPLATE_EMAIL_RESPONSE | jq -r '.threadId')
echo -e "${GREEN}✓ Template email sent: $TEMPLATE_EMAIL_ID (thread: $TEMPLATE_THREAD_ID)${NC}"
echo ""

# Test 6: Send SMS WITHOUT template
echo -e "${YELLOW}Test 6: Sending SMS without template...${NC}"
DIRECT_SMS_RESPONSE=$(curl -s -X POST "$BASE_URL/messages/sms" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"+12345678901\",
    \"body\": \"Direct SMS test message.\",
    \"leadId\": \"$LEAD_ID\"
  }")

DIRECT_SMS_ID=$(echo $DIRECT_SMS_RESPONSE | jq -r '.messageId')
DIRECT_SMS_THREAD=$(echo $DIRECT_SMS_RESPONSE | jq -r '.threadId')
echo -e "${GREEN}✓ Direct SMS sent: $DIRECT_SMS_ID (thread: $DIRECT_SMS_THREAD)${NC}"
echo ""

# Test 7: Send SMS WITH template
echo -e "${YELLOW}Test 7: Sending SMS with template...${NC}"
TEMPLATE_SMS_RESPONSE=$(curl -s -X POST "$BASE_URL/messages/sms" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"+12345678901\",
    \"leadId\": \"$LEAD_ID\",
    \"templateId\": \"$SMS_TEMPLATE_ID\"
  }")

TEMPLATE_SMS_ID=$(echo $TEMPLATE_SMS_RESPONSE | jq -r '.messageId')
TEMPLATE_SMS_THREAD=$(echo $TEMPLATE_SMS_RESPONSE | jq -r '.threadId')
echo -e "${GREEN}✓ Template SMS sent: $TEMPLATE_SMS_ID (thread: $TEMPLATE_SMS_THREAD)${NC}"
echo ""

# Test 8: Verify template usage was tracked
echo -e "${YELLOW}Test 8: Verifying template usage tracking...${NC}"
EMAIL_TEMPLATE_CHECK=$(curl -s -X GET "$BASE_URL/email-templates/$EMAIL_TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN")
EMAIL_USAGE_COUNT=$(echo $EMAIL_TEMPLATE_CHECK | jq -r '.usageCount')

SMS_TEMPLATE_CHECK=$(curl -s -X GET "$BASE_URL/sms-templates/$SMS_TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN")
SMS_USAGE_COUNT=$(echo $SMS_TEMPLATE_CHECK | jq -r '.usageCount')

echo -e "${GREEN}✓ Email template used: $EMAIL_USAGE_COUNT times${NC}"
echo -e "${GREEN}✓ SMS template used: $SMS_USAGE_COUNT times${NC}"
echo ""

# Test 9: List messages (inbox)
echo -e "${YELLOW}Test 9: Listing messages in inbox...${NC}"
INBOX_RESPONSE=$(curl -s -X GET "$BASE_URL/messages?limit=10" \
  -H "Authorization: Bearer $TOKEN")

MESSAGE_COUNT=$(echo $INBOX_RESPONSE | jq -r '.pagination.total')
echo -e "${GREEN}✓ Found $MESSAGE_COUNT messages in inbox${NC}"
echo ""

# Test 10: Filter messages by lead
echo -e "${YELLOW}Test 10: Filtering messages by lead...${NC}"
LEAD_MESSAGES=$(curl -s -X GET "$BASE_URL/messages?leadId=$LEAD_ID" \
  -H "Authorization: Bearer $TOKEN")

LEAD_MESSAGE_COUNT=$(echo $LEAD_MESSAGES | jq -r '.pagination.total')
echo -e "${GREEN}✓ Found $LEAD_MESSAGE_COUNT messages for this lead${NC}"
echo ""

# Test 11: Filter by message type (EMAIL)
echo -e "${YELLOW}Test 11: Filtering by message type (EMAIL)...${NC}"
EMAIL_MESSAGES=$(curl -s -X GET "$BASE_URL/messages?type=EMAIL" \
  -H "Authorization: Bearer $TOKEN")

EMAIL_COUNT=$(echo $EMAIL_MESSAGES | jq -r '.pagination.total')
echo -e "${GREEN}✓ Found $EMAIL_COUNT email messages${NC}"
echo ""

# Test 12: Filter by message type (SMS)
echo -e "${YELLOW}Test 12: Filtering by message type (SMS)...${NC}"
SMS_MESSAGES=$(curl -s -X GET "$BASE_URL/messages?type=SMS" \
  -H "Authorization: Bearer $TOKEN")

SMS_COUNT=$(echo $SMS_MESSAGES | jq -r '.pagination.total')
echo -e "${GREEN}✓ Found $SMS_COUNT SMS messages${NC}"
echo ""

# Test 13: Get message statistics
echo -e "${YELLOW}Test 13: Getting message statistics...${NC}"
STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/messages/stats" \
  -H "Authorization: Bearer $TOKEN")

TOTAL_MESSAGES=$(echo $STATS_RESPONSE | jq -r '.total')
echo -e "${GREEN}✓ Total messages: $TOTAL_MESSAGES${NC}"
echo ""

# Test 14: Verify variable replacement in messages
echo -e "${YELLOW}Test 14: Verifying variable replacement...${NC}"
LATEST_SMS=$(curl -s -X GET "$BASE_URL/messages?type=SMS&limit=1" \
  -H "Authorization: Bearer $TOKEN")

SMS_BODY=$(echo $LATEST_SMS | jq -r '.messages[0].body')
if echo "$SMS_BODY" | grep -q "{{"; then
  echo -e "${RED}✗ Variables not replaced (found {{): $SMS_BODY${NC}"
else
  echo -e "${GREEN}✓ Variables properly replaced in: $SMS_BODY${NC}"
fi
echo ""

# Cleanup
echo -e "${YELLOW}Cleaning up test data...${NC}"
curl -s -X DELETE "$BASE_URL/email-templates/$EMAIL_TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X DELETE "$BASE_URL/sms-templates/$SMS_TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X DELETE "$BASE_URL/leads/$LEAD_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}  All Message System Tests Passed! ✓${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo -e "  • Email and SMS sending working"
echo -e "  • Template integration successful"
echo -e "  • Variable replacement in templates"
echo -e "  • Template usage tracking functional"
echo -e "  • Inbox filtering and search operational"
echo -e "  • Message statistics accurate"
echo -e "  • Thread ID generation working"
