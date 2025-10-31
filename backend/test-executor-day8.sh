#!/bin/bash

# Test script for Day 8: Action Executor Engine
# Tests workflow actions: SEND_EMAIL, SEND_SMS, CREATE_TASK, UPDATE_STATUS, ADD_TAG

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
echo -e "${BLUE}  Day 8: Action Executor Testing${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Authenticate
echo -e "${YELLOW}Step 1: Authentication${NC}"

TIMESTAMP=$(date +%s)
TEST_EMAIL="executor-test-${TIMESTAMP}@test.com"

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"Password123!\",
    \"firstName\": \"Executor\",
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

# Step 2: Create workflow with SEND_EMAIL action
echo -e "${YELLOW}Step 2: Test SEND_EMAIL Action${NC}"

WF1=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Email Test Workflow",
    "description": "Tests SEND_EMAIL action",
    "triggerType": "LEAD_CREATED",
    "actions": [
      {
        "type": "SEND_EMAIL",
        "config": {
          "to": "{{lead.email}}",
          "subject": "Welcome {{lead.name}}!",
          "body": "Hello {{lead.name}}, welcome to our CRM!"
        }
      }
    ]
  }')

WF1_ID=$(echo $WF1 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_result $? "Create workflow with SEND_EMAIL action"

# Activate workflow
curl -s -X PATCH "$BASE_URL/workflows/$WF1_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' > /dev/null

# Create lead to trigger workflow
LEAD1=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Email Test Lead\",
    \"email\": \"emailtest-${TIMESTAMP}@test.com\",
    \"status\": \"NEW\"
  }")

LEAD1_ID=$(echo $LEAD1 | jq -r '.data.lead.id')
test_result $? "Create lead to trigger email workflow"

# Wait for execution
sleep 2

# Check if email activity was logged
ACTIVITIES=$(curl -s -X GET "$BASE_URL/leads/$LEAD1_ID/activities" \
  -H "Authorization: Bearer $TOKEN")

echo $ACTIVITIES | grep -q 'EMAIL_SENT'
test_result $? "Email activity logged"

echo ""

# Step 3: Test CREATE_TASK action
echo -e "${YELLOW}Step 3: Test CREATE_TASK Action${NC}"

WF2=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Task Creation Workflow",
    "description": "Tests CREATE_TASK action",
    "triggerType": "LEAD_CREATED",
    "actions": [
      {
        "type": "CREATE_TASK",
        "config": {
          "title": "Follow up with {{lead.name}}",
          "description": "Contact lead at {{lead.email}}",
          "dueDate": "+3 days",
          "priority": "HIGH"
        }
      }
    ]
  }')

WF2_ID=$(echo $WF2 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_result $? "Create workflow with CREATE_TASK action"

curl -s -X PATCH "$BASE_URL/workflows/$WF2_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' > /dev/null

# Create lead to trigger workflow
LEAD2=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Task Test Lead\",
    \"email\": \"tasktest-${TIMESTAMP}@test.com\",
    \"status\": \"NEW\"
  }")

LEAD2_ID=$(echo $LEAD2 | jq -r '.data.lead.id')
test_result $? "Create lead to trigger task workflow"

# Wait for execution
sleep 2

# Check if task was created
TASKS=$(curl -s -X GET "$BASE_URL/tasks?leadId=$LEAD2_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $TASKS | grep -q "Follow up with"
test_result $? "Task created with correct title"

echo $TASKS | grep -q "HIGH"
test_result $? "Task has correct priority"

echo ""

# Step 4: Test UPDATE_STATUS action
echo -e "${YELLOW}Step 4: Test UPDATE_STATUS Action${NC}"

WF3=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Status Update Workflow",
    "description": "Tests UPDATE_STATUS action",
    "triggerType": "LEAD_STATUS_CHANGED",
    "triggerData": {
      "conditions": [
        {
          "field": "newStatus",
          "operator": "equals",
          "value": "CONTACTED"
        }
      ]
    },
    "actions": [
      {
        "type": "UPDATE_STATUS",
        "config": {
          "status": "QUALIFIED"
        }
      }
    ]
  }')

WF3_ID=$(echo $WF3 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_result $? "Create workflow with UPDATE_STATUS action"

curl -s -X PATCH "$BASE_URL/workflows/$WF3_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' > /dev/null

# Create lead
LEAD3=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Status Test Lead\",
    \"email\": \"statustest-${TIMESTAMP}@test.com\",
    \"status\": \"NEW\"
  }")

LEAD3_ID=$(echo $LEAD3 | jq -r '.data.lead.id')

# Update status to CONTACTED (should trigger workflow to change to QUALIFIED)
curl -s -X PATCH "$BASE_URL/leads/$LEAD3_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "CONTACTED"}' > /dev/null

# Wait for execution
sleep 2

# Check if status was updated to QUALIFIED
LEAD3_UPDATED=$(curl -s -X GET "$BASE_URL/leads/$LEAD3_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $LEAD3_UPDATED | grep -q '"status":"QUALIFIED"'
test_result $? "Lead status updated by workflow"

echo ""

# Step 5: Test ADD_TAG action
echo -e "${YELLOW}Step 5: Test ADD_TAG Action${NC}"

WF4=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tag Addition Workflow",
    "description": "Tests ADD_TAG action",
    "triggerType": "LEAD_CREATED",
    "actions": [
      {
        "type": "ADD_TAG",
        "config": {
          "tagName": "Workflow Generated",
          "tagColor": "purple"
        }
      }
    ]
  }')

WF4_ID=$(echo $WF4 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_result $? "Create workflow with ADD_TAG action"

curl -s -X PATCH "$BASE_URL/workflows/$WF4_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' > /dev/null

# Create lead to trigger workflow
LEAD4=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Tag Test Lead\",
    \"email\": \"tagtest-${TIMESTAMP}@test.com\",
    \"status\": \"NEW\"
  }")

LEAD4_ID=$(echo $LEAD4 | jq -r '.data.lead.id')
test_result $? "Create lead to trigger tag workflow"

# Wait for execution
sleep 2

# Check if tag was added
LEAD4_WITH_TAGS=$(curl -s -X GET "$BASE_URL/leads/$LEAD4_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $LEAD4_WITH_TAGS | grep -q "Workflow Generated"
test_result $? "Tag added to lead"

echo ""

# Step 6: Test multi-action workflow
echo -e "${YELLOW}Step 6: Test Multi-Action Workflow${NC}"

WF5=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Complete Welcome Workflow",
    "description": "Tests multiple actions in sequence",
    "triggerType": "LEAD_CREATED",
    "actions": [
      {
        "type": "SEND_EMAIL",
        "config": {
          "to": "{{lead.email}}",
          "subject": "Welcome!",
          "body": "Welcome {{lead.name}}"
        }
      },
      {
        "type": "CREATE_TASK",
        "config": {
          "title": "Call {{lead.name}}",
          "dueDate": "+1 days",
          "priority": "MEDIUM"
        }
      },
      {
        "type": "ADD_TAG",
        "config": {
          "tagName": "New Lead",
          "tagColor": "green"
        }
      }
    ]
  }')

WF5_ID=$(echo $WF5 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_result $? "Create multi-action workflow"

curl -s -X PATCH "$BASE_URL/workflows/$WF5_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' > /dev/null

# Create lead
LEAD5=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Multi Action Lead\",
    \"email\": \"multitest-${TIMESTAMP}@test.com\",
    \"status\": \"NEW\"
  }")

LEAD5_ID=$(echo $LEAD5 | jq -r '.data.lead.id')

# Wait for execution
sleep 2

# Check all actions executed
LEAD5_DATA=$(curl -s -X GET "$BASE_URL/leads/$LEAD5_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $LEAD5_DATA | grep -q "New Lead"
test_result $? "All actions executed (tag present)"

LEAD5_TASKS=$(curl -s -X GET "$BASE_URL/tasks?leadId=$LEAD5_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $LEAD5_TASKS | grep -q "Call Multi Action Lead"
test_result $? "All actions executed (task present)"

LEAD5_ACTIVITIES=$(curl -s -X GET "$BASE_URL/leads/$LEAD5_ID/activities" \
  -H "Authorization: Bearer $TOKEN")

echo $LEAD5_ACTIVITIES | grep -q "EMAIL_SENT"
test_result $? "All actions executed (email logged)"

echo ""

# Step 7: Verify execution records
echo -e "${YELLOW}Step 7: Verify Execution Records${NC}"

# Get execution logs for one of the workflows
EXECUTIONS=$(curl -s -X GET "$BASE_URL/workflows/$WF1_ID/executions" \
  -H "Authorization: Bearer $TOKEN")

echo $EXECUTIONS | grep -q '"status":"SUCCESS"'
test_result $? "Workflow execution marked as SUCCESS"

echo $EXECUTIONS | grep -q '"completedAt"'
test_result $? "Execution has completion timestamp"

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
  echo -e "${GREEN}✓ Day 8: Action Executor - COMPLETE${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
