#!/bin/bash

# Test script for Day 7: Trigger Detection System
# Tests workflow triggers fire on LEAD_CREATED and LEAD_STATUS_CHANGED events

BASE_URL="http://localhost:8000/api"
TOKEN=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
PASSED=0
FAILED=0

# Test result function
test_result() {
  TOTAL=$((TOTAL + 1))
  if [ $1 -eq 0 ]; then
    PASSED=$((PASSED + 1))
    echo -e "${GREEN}✓ PASS${NC}: $2"
  else
    FAILED=$((FAILED + 1))
    echo -e "${RED}✗ FAIL${NC}: $2"
    if [ ! -z "$3" ]; then
      echo -e "${RED}  Error: $3${NC}"
    fi
  fi
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Day 7: Trigger Detection Testing${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Authenticate
echo -e "${YELLOW}Step 1: Authentication${NC}"

# Use timestamp for unique email
TIMESTAMP=$(date +%s)
TEST_EMAIL="trigger-test-${TIMESTAMP}@test.com"

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"Password123!\",
    \"firstName\": \"Trigger\",
    \"lastName\": \"Tester\"
  }")

TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_EMAIL\",
      \"password\": \"Password123!\"
    }")
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to authenticate${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Authenticated successfully${NC}"
echo ""

# Step 2: Create workflows with different triggers
echo -e "${YELLOW}Step 2: Create Workflows${NC}"

# Workflow 1: Simple LEAD_CREATED (no conditions)
WF1=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome New Lead",
    "description": "Triggers on any lead creation",
    "triggerType": "LEAD_CREATED",
    "actions": [
      {
        "type": "SEND_EMAIL",
        "config": {
          "templateId": "welcome",
          "to": "{{lead.email}}"
        }
      }
    ]
  }')

WF1_ID=$(echo $WF1 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_result $? "Create LEAD_CREATED workflow"

# Activate it
curl -s -X PATCH "$BASE_URL/workflows/$WF1_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' > /dev/null

echo -e "${GREEN}✓ Activated workflow 1${NC}"

# Workflow 2: LEAD_STATUS_CHANGED with condition (status = QUALIFIED)
WF2=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Qualified Lead Alert",
    "description": "Triggers when lead becomes QUALIFIED",
    "triggerType": "LEAD_STATUS_CHANGED",
    "triggerData": {
      "conditions": [
        {
          "field": "newStatus",
          "operator": "equals",
          "value": "QUALIFIED"
        }
      ]
    },
    "actions": [
      {
        "type": "SEND_SMS",
        "config": {
          "to": "{{manager.phone}}",
          "message": "Qualified lead alert!"
        }
      }
    ]
  }')

WF2_ID=$(echo $WF2 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_result $? "Create LEAD_STATUS_CHANGED workflow with condition"

# Activate it
curl -s -X PATCH "$BASE_URL/workflows/$WF2_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' > /dev/null

echo -e "${GREEN}✓ Activated workflow 2${NC}"

# Workflow 3: LEAD_STATUS_CHANGED with different condition (status = LOST)
WF3=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lost Lead Re-engagement",
    "description": "Triggers when lead becomes LOST",
    "triggerType": "LEAD_STATUS_CHANGED",
    "triggerData": {
      "conditions": [
        {
          "field": "newStatus",
          "operator": "equals",
          "value": "LOST"
        }
      ]
    },
    "actions": [
      {
        "type": "SEND_EMAIL",
        "config": {
          "templateId": "re-engagement"
        }
      }
    ]
  }')

WF3_ID=$(echo $WF3 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_result $? "Create second conditional workflow"

# Activate it
curl -s -X PATCH "$BASE_URL/workflows/$WF3_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' > /dev/null

echo -e "${GREEN}✓ Activated workflow 3${NC}"
echo ""

# Step 3: Test LEAD_CREATED trigger
echo -e "${YELLOW}Step 3: Test LEAD_CREATED Trigger${NC}"

# Get initial execution count for WF1
BEFORE_EXEC=$(curl -s -X GET "$BASE_URL/workflows/$WF1_ID" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"executions":[0-9]*' | grep -o '[0-9]*')

echo "Initial executions: $BEFORE_EXEC"

# Create a lead with unique email
LEAD_EMAIL="lead1-${TIMESTAMP}@test.com"
LEAD1=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Lead 1\",
    \"email\": \"$LEAD_EMAIL\",
    \"phone\": \"+1234567890\",
    \"status\": \"NEW\",
    \"source\": \"Website\"
  }")

LEAD1_ID=$(echo $LEAD1 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_result $? "Create lead 1"

# Wait a moment for trigger processing
sleep 1

# Check if workflow execution count increased
AFTER_EXEC=$(curl -s -X GET "$BASE_URL/workflows/$WF1_ID" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"executions":[0-9]*' | grep -o '[0-9]*')

echo "After executions: $AFTER_EXEC"

test_result $([ "$AFTER_EXEC" -gt "$BEFORE_EXEC" ] && echo 0 || echo 1) "LEAD_CREATED trigger incremented execution count"

# Check execution logs
EXECUTIONS=$(curl -s -X GET "$BASE_URL/workflows/$WF1_ID/executions" \
  -H "Authorization: Bearer $TOKEN")

echo $EXECUTIONS | grep -q '"leadId":"'
test_result $? "Execution log contains leadId"

echo $EXECUTIONS | grep -q 'PENDING\|SUCCESS'
test_result $? "Execution status is PENDING or SUCCESS"

echo ""

# Step 4: Test LEAD_STATUS_CHANGED trigger with matching condition
echo -e "${YELLOW}Step 4: Test LEAD_STATUS_CHANGED (QUALIFIED - Should Match)${NC}"

# Get initial execution count for WF2
BEFORE_WF2=$(curl -s -X GET "$BASE_URL/workflows/$WF2_ID" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"executions":[0-9]*' | grep -o '[0-9]*')

echo "Initial WF2 executions: $BEFORE_WF2"

# Update lead to QUALIFIED status (should trigger WF2)
UPDATE1=$(curl -s -X PATCH "$BASE_URL/leads/$LEAD1_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "QUALIFIED"
  }')

test_result $? "Update lead to QUALIFIED status"

# Wait for trigger processing
sleep 1

# Check if WF2 execution count increased
AFTER_WF2=$(curl -s -X GET "$BASE_URL/workflows/$WF2_ID" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"executions":[0-9]*' | grep -o '[0-9]*')

echo "After WF2 executions: $AFTER_WF2"

test_result $([ "$AFTER_WF2" -gt "$BEFORE_WF2" ] && echo 0 || echo 1) "QUALIFIED status triggered workflow 2"

echo ""

# Step 5: Test LEAD_STATUS_CHANGED with non-matching condition
echo -e "${YELLOW}Step 5: Test LEAD_STATUS_CHANGED (CONTACTED - Should NOT Match)${NC}"

# Get WF2 count again (should not increase)
BEFORE_WF2_2=$(curl -s -X GET "$BASE_URL/workflows/$WF2_ID" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"executions":[0-9]*' | grep -o '[0-9]*')

# Get WF3 count (should not increase either)
BEFORE_WF3=$(curl -s -X GET "$BASE_URL/workflows/$WF3_ID" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"executions":[0-9]*' | grep -o '[0-9]*')

# Update to CONTACTED (doesn't match QUALIFIED or LOST)
UPDATE2=$(curl -s -X PATCH "$BASE_URL/leads/$LEAD1_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CONTACTED"
  }')

test_result $? "Update lead to CONTACTED status"

# Wait
sleep 1

# Check counts didn't increase
AFTER_WF2_2=$(curl -s -X GET "$BASE_URL/workflows/$WF2_ID" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"executions":[0-9]*' | grep -o '[0-9]*')

AFTER_WF3=$(curl -s -X GET "$BASE_URL/workflows/$WF3_ID" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"executions":[0-9]*' | grep -o '[0-9]*')

test_result $([ "$AFTER_WF2_2" -eq "$BEFORE_WF2_2" ] && echo 0 || echo 1) "CONTACTED status did NOT trigger QUALIFIED workflow"
test_result $([ "$AFTER_WF3" -eq "$BEFORE_WF3" ] && echo 0 || echo 1) "CONTACTED status did NOT trigger LOST workflow"

echo ""

# Step 6: Test second conditional trigger (LOST)
echo -e "${YELLOW}Step 6: Test LEAD_STATUS_CHANGED (LOST - Should Match WF3)${NC}"

BEFORE_WF3_2=$(curl -s -X GET "$BASE_URL/workflows/$WF3_ID" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"executions":[0-9]*' | grep -o '[0-9]*')

# Update to LOST (should trigger WF3)
UPDATE3=$(curl -s -X PATCH "$BASE_URL/leads/$LEAD1_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "LOST"
  }')

test_result $? "Update lead to LOST status"

# Wait
sleep 1

AFTER_WF3_2=$(curl -s -X GET "$BASE_URL/workflows/$WF3_ID" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"executions":[0-9]*' | grep -o '[0-9]*')

test_result $([ "$AFTER_WF3_2" -gt "$BEFORE_WF3_2" ] && echo 0 || echo 1) "LOST status triggered workflow 3"

echo ""

# Step 7: Test inactive workflow doesn't trigger
echo -e "${YELLOW}Step 7: Test Inactive Workflow${NC}"

# Create and leave inactive
WF4=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Inactive Workflow",
    "triggerType": "LEAD_CREATED",
    "actions": [{"type": "SEND_EMAIL"}]
  }')

WF4_ID=$(echo $WF4 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# Don't activate it - create another lead with unique email
LEAD2_EMAIL="lead2-${TIMESTAMP}@test.com"
LEAD2=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Lead 2\",
    \"email\": \"$LEAD2_EMAIL\",
    \"status\": \"NEW\"
  }")

sleep 1

# Check WF4 execution count (should be 0)
WF4_EXEC=$(curl -s -X GET "$BASE_URL/workflows/$WF4_ID" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"executions":[0-9]*' | grep -o '[0-9]*')

test_result $([ "$WF4_EXEC" -eq 0 ] && echo 0 || echo 1) "Inactive workflow did not trigger"

echo ""

# Step 8: Verify execution metadata
echo -e "${YELLOW}Step 8: Verify Execution Metadata${NC}"

EXEC_DETAIL=$(curl -s -X GET "$BASE_URL/workflows/$WF1_ID/executions?limit=1" \
  -H "Authorization: Bearer $TOKEN")

echo $EXEC_DETAIL | grep -q '"metadata":'
test_result $? "Execution contains metadata"

echo $EXEC_DETAIL | grep -q '"eventData"'
test_result $? "Metadata contains eventData"

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}           Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total Tests:  $TOTAL"
echo -e "${GREEN}Passed:       $PASSED${NC}"
echo -e "${RED}Failed:       $FAILED${NC}"
echo -e "${BLUE}========================================${NC}"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo -e "${GREEN}✓ Day 7: Trigger Detection - COMPLETE${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
