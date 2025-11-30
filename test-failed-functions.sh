#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="http://localhost:8000/api"

# Login
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@realestate.com", "password": "admin123"}' | jq -r '.data.tokens.accessToken')

echo "Testing likely failed functions..."
echo ""

test_function() {
  echo -e "${BLUE}Testing: $1${NC}"
  echo "Message: $2"
  
  RESPONSE=$(curl -s -X POST "$API_URL/ai/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\": \"$2\", \"conversationHistory\": []}")
  
  echo "Function called: $(echo $RESPONSE | jq -r '.data.functionUsed // "NONE"')"
  
  if echo "$RESPONSE" | grep -q "\"functionUsed\":\"$3\""; then
    echo -e "${GREEN}✅ PASSED${NC}"
  else
    echo -e "${RED}❌ FAILED${NC}"
    echo "Full response:"
    echo $RESPONSE | jq '.'
  fi
  echo ""
  sleep 2
}

echo -e "${BLUE}━━━ BULK OPERATIONS ━━━${NC}"
test_function "Bulk Update Leads" \
  "Use the bulk_update_leads function to update all leads with score below 30 to status UNQUALIFIED" \
  "bulk_update_leads"

test_function "Bulk Delete Leads" \
  "Use the bulk_delete_leads function to delete all leads with status UNQUALIFIED older than 180 days" \
  "bulk_delete_leads"

echo -e "${BLUE}━━━ DELETE OPERATIONS ━━━${NC}"

# Get IDs first
TASK_ID=$(curl -s "$API_URL/tasks?limit=1" -H "Authorization: Bearer $TOKEN" | jq -r '.data.tasks[0].id')
if [ -n "$TASK_ID" ] && [ "$TASK_ID" != "null" ]; then
  test_function "Delete Task" \
    "Delete task $TASK_ID" \
    "delete_task"
fi

APT_ID=$(curl -s "$API_URL/appointments?limit=1" -H "Authorization: Bearer $TOKEN" | jq -r '.data.appointments[0].id')
if [ -n "$APT_ID" ] && [ "$APT_ID" != "null" ]; then
  test_function "Cancel Appointment" \
    "Cancel appointment $APT_ID because client is unavailable" \
    "cancel_appointment"
fi

echo "Done!"
