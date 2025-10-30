#!/bin/bash
# Test script for Email Template endpoints

BASE_URL="http://localhost:8000"
API_URL="$BASE_URL/api"

echo "==================================="
echo "Email Templates API Test"
echo "==================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get auth token (assuming test user exists)
echo "📝 Getting auth token..."
TOKEN=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}' | jq -r '.data.tokens.accessToken')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to get auth token${NC}"
  echo "Please ensure the backend server is running and test user exists"
  exit 1
fi

echo -e "${GREEN}✅ Got auth token${NC}"
echo ""

# Test 1: Create email template
echo "Test 1: Creating email template..."
CREATE_RESPONSE=$(curl -s -X POST $API_URL/email-templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Welcome Email",
    "subject": "Welcome to {{company}}!",
    "body": "Hi {{name}},\n\nWelcome to our platform! We are excited to have you.\n\nBest regards,\nThe Team",
    "category": "welcome",
    "isActive": true,
    "variables": {
      "name": "Lead name",
      "company": "Company name"
    }
  }')

TEMPLATE_ID=$(echo $CREATE_RESPONSE | jq -r '.id')

if [ "$TEMPLATE_ID" != "null" ] && [ -n "$TEMPLATE_ID" ]; then
  echo -e "${GREEN}✅ Created template with ID: $TEMPLATE_ID${NC}"
else
  echo -e "${RED}❌ Failed to create template${NC}"
  echo $CREATE_RESPONSE | jq '.'
fi
echo ""

# Test 2: List email templates
echo "Test 2: Listing email templates..."
LIST_RESPONSE=$(curl -s -X GET "$API_URL/email-templates?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

TEMPLATE_COUNT=$(echo $LIST_RESPONSE | jq -r '.templates | length')
echo -e "${GREEN}✅ Found $TEMPLATE_COUNT templates${NC}"
echo ""

# Test 3: Get single template
echo "Test 3: Getting single template..."
GET_RESPONSE=$(curl -s -X GET "$API_URL/email-templates/$TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN")

GET_NAME=$(echo $GET_RESPONSE | jq -r '.name')
if [ "$GET_NAME" == "Welcome Email" ]; then
  echo -e "${GREEN}✅ Retrieved template: $GET_NAME${NC}"
else
  echo -e "${RED}❌ Failed to retrieve template${NC}"
fi
echo ""

# Test 4: Update template
echo "Test 4: Updating template..."
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/email-templates/$TEMPLATE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "subject": "Welcome to {{company}} - Updated!",
    "isActive": false
  }')

UPDATED_SUBJECT=$(echo $UPDATE_RESPONSE | jq -r '.subject')
if [[ "$UPDATED_SUBJECT" == *"Updated"* ]]; then
  echo -e "${GREEN}✅ Updated template subject${NC}"
else
  echo -e "${RED}❌ Failed to update template${NC}"
fi
echo ""

# Test 5: Duplicate template
echo "Test 5: Duplicating template..."
DUPLICATE_RESPONSE=$(curl -s -X POST "$API_URL/email-templates/$TEMPLATE_ID/duplicate" \
  -H "Authorization: Bearer $TOKEN")

DUPLICATE_ID=$(echo $DUPLICATE_RESPONSE | jq -r '.id')
DUPLICATE_NAME=$(echo $DUPLICATE_RESPONSE | jq -r '.name')

if [ "$DUPLICATE_ID" != "null" ] && [[ "$DUPLICATE_NAME" == *"(Copy)"* ]]; then
  echo -e "${GREEN}✅ Created duplicate with ID: $DUPLICATE_ID${NC}"
  echo -e "${GREEN}   Name: $DUPLICATE_NAME${NC}"
else
  echo -e "${RED}❌ Failed to duplicate template${NC}"
fi
echo ""

# Test 6: Get categories
echo "Test 6: Getting template categories..."
CATEGORIES_RESPONSE=$(curl -s -X GET "$API_URL/email-templates/categories" \
  -H "Authorization: Bearer $TOKEN")

CATEGORIES=$(echo $CATEGORIES_RESPONSE | jq -r '.categories | join(", ")')
echo -e "${GREEN}✅ Categories: $CATEGORIES${NC}"
echo ""

# Test 7: Filter by category
echo "Test 7: Filtering by category..."
FILTER_RESPONSE=$(curl -s -X GET "$API_URL/email-templates?category=welcome" \
  -H "Authorization: Bearer $TOKEN")

FILTERED_COUNT=$(echo $FILTER_RESPONSE | jq -r '.templates | length')
echo -e "${GREEN}✅ Found $FILTERED_COUNT templates in 'welcome' category${NC}"
echo ""

# Test 8: Search templates
echo "Test 8: Searching templates..."
SEARCH_RESPONSE=$(curl -s -X GET "$API_URL/email-templates?search=Welcome" \
  -H "Authorization: Bearer $TOKEN")

SEARCH_COUNT=$(echo $SEARCH_RESPONSE | jq -r '.templates | length')
echo -e "${GREEN}✅ Found $SEARCH_COUNT templates matching 'Welcome'${NC}"
echo ""

# Test 9: Delete template
echo "Test 9: Deleting template..."
DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/email-templates/$TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN")

DELETE_MESSAGE=$(echo $DELETE_RESPONSE | jq -r '.message')
if [[ "$DELETE_MESSAGE" == *"success"* ]]; then
  echo -e "${GREEN}✅ Deleted template${NC}"
else
  echo -e "${RED}❌ Failed to delete template${NC}"
fi
echo ""

# Test 10: Delete duplicate
echo "Test 10: Deleting duplicate template..."
DELETE_DUP_RESPONSE=$(curl -s -X DELETE "$API_URL/email-templates/$DUPLICATE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo -e "${GREEN}✅ Cleaned up duplicate template${NC}"
echo ""

echo "==================================="
echo "✅ All tests completed!"
echo "==================================="
