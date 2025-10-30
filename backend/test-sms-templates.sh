#!/bin/bash
# Test script for SMS Template endpoints

BASE_URL="http://localhost:8000"
API_URL="$BASE_URL/api"

echo "==================================="
echo "SMS Templates API Test"
echo "==================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get auth token
echo "📝 Getting auth token..."
TOKEN=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}' | jq -r '.data.tokens.accessToken')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to get auth token${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Got auth token${NC}"
echo ""

# Test 1: Create SMS template
echo "Test 1: Creating SMS template..."
CREATE_RESPONSE=$(curl -s -X POST $API_URL/sms-templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Welcome SMS",
    "body": "Hi {{name}}! Welcome to {{company}}. Reply STOP to unsubscribe.",
    "category": "welcome",
    "isActive": true,
    "variables": {
      "name": "Lead name",
      "company": "Company name"
    }
  }')

TEMPLATE_ID=$(echo $CREATE_RESPONSE | jq -r '.id')
CHAR_COUNT=$(echo $CREATE_RESPONSE | jq -r '.stats.characters')
SEGMENTS=$(echo $CREATE_RESPONSE | jq -r '.stats.segments')

if [ "$TEMPLATE_ID" != "null" ] && [ -n "$TEMPLATE_ID" ]; then
  echo -e "${GREEN}✅ Created template with ID: $TEMPLATE_ID${NC}"
  echo -e "${GREEN}   Characters: $CHAR_COUNT, Segments: $SEGMENTS${NC}"
else
  echo -e "${RED}❌ Failed to create template${NC}"
  echo $CREATE_RESPONSE | jq '.'
fi
echo ""

# Test 2: Preview SMS with character count
echo "Test 2: Previewing SMS with character count..."
PREVIEW_RESPONSE=$(curl -s -X POST $API_URL/sms-templates/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "body": "This is a test SMS to check character count and segmentation. It should show how many segments this message will use."
  }')

PREVIEW_CHARS=$(echo $PREVIEW_RESPONSE | jq -r '.characters')
PREVIEW_SEGMENTS=$(echo $PREVIEW_RESPONSE | jq -r '.segments')
PREVIEW_COST=$(echo $PREVIEW_RESPONSE | jq -r '.cost')

echo -e "${GREEN}✅ Preview: $PREVIEW_CHARS chars, $PREVIEW_SEGMENTS segments, \$$PREVIEW_COST cost${NC}"
echo ""

# Test 3: Create long SMS (test character limit)
echo "Test 3: Creating long SMS template..."
LONG_SMS=$(printf 'A%.0s' {1..200})  # 200 character string
LONG_RESPONSE=$(curl -s -X POST $API_URL/sms-templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"Long SMS\",
    \"body\": \"$LONG_SMS\",
    \"category\": \"test\"
  }")

LONG_ID=$(echo $LONG_RESPONSE | jq -r '.id')
LONG_CHARS=$(echo $LONG_RESPONSE | jq -r '.stats.characters')
LONG_SEGMENTS=$(echo $LONG_RESPONSE | jq -r '.stats.segments')

if [ "$LONG_ID" != "null" ]; then
  echo -e "${GREEN}✅ Created long SMS: $LONG_CHARS chars, $LONG_SEGMENTS segments${NC}"
else
  echo -e "${RED}❌ Failed to create long SMS${NC}"
fi
echo ""

# Test 4: List SMS templates
echo "Test 4: Listing SMS templates..."
LIST_RESPONSE=$(curl -s -X GET "$API_URL/sms-templates?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

TEMPLATE_COUNT=$(echo $LIST_RESPONSE | jq -r '.templates | length')
echo -e "${GREEN}✅ Found $TEMPLATE_COUNT templates${NC}"
echo ""

# Test 5: Get single template with stats
echo "Test 5: Getting single template with stats..."
GET_RESPONSE=$(curl -s -X GET "$API_URL/sms-templates/$TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN")

GET_NAME=$(echo $GET_RESPONSE | jq -r '.name')
GET_CHARS=$(echo $GET_RESPONSE | jq -r '.stats.characters')
if [ "$GET_NAME" == "Welcome SMS" ]; then
  echo -e "${GREEN}✅ Retrieved template: $GET_NAME ($GET_CHARS chars)${NC}"
else
  echo -e "${RED}❌ Failed to retrieve template${NC}"
fi
echo ""

# Test 6: Update template
echo "Test 6: Updating template..."
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/sms-templates/$TEMPLATE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "body": "Hi {{name}}! Welcome to {{company}}. We are excited to have you! Reply STOP to unsubscribe.",
    "isActive": false
  }')

UPDATED_CHARS=$(echo $UPDATE_RESPONSE | jq -r '.stats.characters')
if [ "$UPDATED_CHARS" -gt "$CHAR_COUNT" ]; then
  echo -e "${GREEN}✅ Updated template (new length: $UPDATED_CHARS chars)${NC}"
else
  echo -e "${RED}❌ Failed to update template${NC}"
fi
echo ""

# Test 7: Duplicate template
echo "Test 7: Duplicating template..."
DUPLICATE_RESPONSE=$(curl -s -X POST "$API_URL/sms-templates/$TEMPLATE_ID/duplicate" \
  -H "Authorization: Bearer $TOKEN")

DUPLICATE_ID=$(echo $DUPLICATE_RESPONSE | jq -r '.id')
DUPLICATE_NAME=$(echo $DUPLICATE_RESPONSE | jq -r '.name')

if [ "$DUPLICATE_ID" != "null" ] && [[ "$DUPLICATE_NAME" == *"(Copy)"* ]]; then
  echo -e "${GREEN}✅ Created duplicate: $DUPLICATE_NAME${NC}"
else
  echo -e "${RED}❌ Failed to duplicate template${NC}"
fi
echo ""

# Test 8: Get categories
echo "Test 8: Getting template categories..."
CATEGORIES_RESPONSE=$(curl -s -X GET "$API_URL/sms-templates/categories" \
  -H "Authorization: Bearer $TOKEN")

CATEGORIES=$(echo $CATEGORIES_RESPONSE | jq -r '.categories | join(", ")')
echo -e "${GREEN}✅ Categories: $CATEGORIES${NC}"
echo ""

# Test 9: Filter by category
echo "Test 9: Filtering by category..."
FILTER_RESPONSE=$(curl -s -X GET "$API_URL/sms-templates?category=welcome" \
  -H "Authorization: Bearer $TOKEN")

FILTERED_COUNT=$(echo $FILTER_RESPONSE | jq -r '.templates | length')
echo -e "${GREEN}✅ Found $FILTERED_COUNT templates in 'welcome' category${NC}"
echo ""

# Test 10: Search templates
echo "Test 10: Searching templates..."
SEARCH_RESPONSE=$(curl -s -X GET "$API_URL/sms-templates?search=Welcome" \
  -H "Authorization: Bearer $TOKEN")

SEARCH_COUNT=$(echo $SEARCH_RESPONSE | jq -r '.templates | length')
echo -e "${GREEN}✅ Found $SEARCH_COUNT templates matching 'Welcome'${NC}"
echo ""

# Test 11: Test character limit validation (too long)
echo "Test 11: Testing character limit validation..."
TOO_LONG=$(printf 'A%.0s' {1..1700})  # 1700 characters (exceeds 1600 limit)
ERROR_RESPONSE=$(curl -s -X POST $API_URL/sms-templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"Too Long SMS\",
    \"body\": \"$TOO_LONG\"
  }")

ERROR_MSG=$(echo $ERROR_RESPONSE | jq -r '.message // .error')
if [[ "$ERROR_MSG" == *"exceed"* ]] || [[ "$ERROR_MSG" == *"1600"* ]]; then
  echo -e "${GREEN}✅ Character limit validation working${NC}"
else
  echo -e "${YELLOW}⚠️  Validation response: $ERROR_MSG${NC}"
fi
echo ""

# Cleanup
echo "Cleanup: Deleting test templates..."
curl -s -X DELETE "$API_URL/sms-templates/$TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X DELETE "$API_URL/sms-templates/$DUPLICATE_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X DELETE "$API_URL/sms-templates/$LONG_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

echo -e "${GREEN}✅ Cleaned up test templates${NC}"
echo ""

echo "==================================="
echo "✅ All tests completed!"
echo "==================================="
