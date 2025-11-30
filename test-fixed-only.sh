#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="http://localhost:8000/api"

echo "Testing ONLY the 2 fixed bulk operation functions"
echo "=================================================="
echo ""

# Login
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@realestate.com", "password": "admin123"}' | jq -r '.data.tokens.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Logged in"
echo ""

test_function() {
  echo -e "${BLUE}Testing: $1${NC}"
  echo "Message: $2"
  
  RESPONSE=$(timeout 20 curl -s -X POST "$API_URL/ai/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\": \"$2\", \"conversationHistory\": []}")
  
  FUNCTION_USED=$(echo $RESPONSE | jq -r '.data.functionUsed // "NONE"')
  SUCCESS=$(echo $RESPONSE | jq -r '.success')
  ERROR=$(echo $RESPONSE | jq -r '.error // ""')
  
  echo "Function called: $FUNCTION_USED"
  echo "Success: $SUCCESS"
  
  if [ "$SUCCESS" = "false" ] && [ -n "$ERROR" ]; then
    echo -e "${RED}❌ API ERROR: $ERROR${NC}"
    return 1
  fi
  
  if [ "$FUNCTION_USED" = "$3" ]; then
    echo -e "${GREEN}✅ PASSED - Function called correctly${NC}"
    return 0
  else
    echo -e "${RED}❌ FAILED - Expected '$3', got '$FUNCTION_USED'${NC}"
    echo "Response preview:"
    echo $RESPONSE | jq -r '.data.message // ""' | head -c 200
    return 1
  fi
}

PASSED=0
FAILED=0

echo -e "${BLUE}━━━ TEST 1: Bulk Update Leads ━━━${NC}"
if test_function "Bulk Update Leads" \
  "Use bulk_update_leads to update all leads with score below 30 to status UNQUALIFIED" \
  "bulk_update_leads"; then
  PASSED=$((PASSED + 1))
else
  FAILED=$((FAILED + 1))
fi
echo ""

echo -e "${BLUE}━━━ TEST 2: Bulk Delete Leads ━━━${NC}"
if test_function "Bulk Delete Leads" \
  "Use bulk_delete_leads to delete all leads with status UNQUALIFIED and lastContactedAt older than 180 days" \
  "bulk_delete_leads"; then
  PASSED=$((PASSED + 1))
else
  FAILED=$((FAILED + 1))
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total: 2"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $PASSED -eq 2 ]; then
  echo -e "${GREEN}✅ All fixed functions working!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some functions still have issues${NC}"
  exit 1
fi
