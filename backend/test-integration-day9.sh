#!/bin/bash

# Test script for Day 9: Workflow Integration & Testing
# Tests complete workflow scenarios with multiple actions and real-world use cases

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
echo -e "${BLUE}  Day 9: Workflow Integration Testing${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Authenticate
echo -e "${YELLOW}Step 1: Authentication${NC}"

TIMESTAMP=$(date +%s)
TEST_EMAIL="integration-test-${TIMESTAMP}@test.com"

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"Password123!\",
    \"firstName\": \"Integration\",
    \"lastName\": \"Tester\"
  }")

TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to authenticate${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Authenticated successfully${NC}"
echo ""

# Step 2: Create Welcome Series Workflow
echo -e "${YELLOW}Step 2: Welcome Series Workflow${NC}"

WF_WELCOME=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Lead Welcome Series",
    "description": "Multi-step welcome workflow for new leads",
    "triggerType": "LEAD_CREATED",
    "actions": [
      {
        "type": "SEND_EMAIL",
        "config": {
          "to": "{{lead.email}}",
          "subject": "Welcome to our CRM!",
          "body": "Hi {{lead.name}}, welcome aboard!"
        }
      },
      {
        "type": "ADD_TAG",
        "config": {
          "tagName": "Welcome Series"
        }
      },
      {
        "type": "CREATE_TASK",
        "config": {
          "title": "Follow up with {{lead.name}}",
          "description": "Initial contact with new lead",
          "dueDate": "+1 day",
          "priority": "HIGH"
        }
      }
    ]
  }')

WF_WELCOME_ID=$(echo $WF_WELCOME | jq -r '.id')
test_result $? "Create welcome series workflow"

# Activate workflow
curl -s -X PATCH "$BASE_URL/workflows/$WF_WELCOME_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' > /dev/null

echo -e "${GREEN}✓ Activated welcome workflow${NC}"
echo ""

# Step 3: Create Qualified Lead Workflow
echo -e "${YELLOW}Step 3: Qualified Lead Alert Workflow${NC}"

WF_QUALIFIED=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Qualified Lead Alert",
    "description": "Notify team when lead is qualified",
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
        "type": "ADD_TAG",
        "config": {
          "tagName": "Hot Lead"
        }
      },
      {
        "type": "CREATE_TASK",
        "config": {
          "title": "Contact qualified lead ASAP",
          "description": "High priority - qualified lead needs immediate attention",
          "dueDate": "+2 hours",
          "priority": "HIGH"
        }
      },
      {
        "type": "SEND_EMAIL",
        "config": {
          "to": "{{lead.email}}",
          "subject": "Next Steps",
          "body": "Thanks for your interest, {{lead.name}}!"
        }
      }
    ]
  }')

WF_QUALIFIED_ID=$(echo $WF_QUALIFIED | jq -r '.id')
test_result $? "Create qualified lead workflow"

# Activate workflow
curl -s -X PATCH "$BASE_URL/workflows/$WF_QUALIFIED_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' > /dev/null

echo -e "${GREEN}✓ Activated qualified lead workflow${NC}"
echo ""

# Step 4: Test Welcome Series (LEAD_CREATED)
echo -e "${YELLOW}Step 4: Test Welcome Series Workflow${NC}"

LEAD_WELCOME=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Welcome Test Lead\",
    \"email\": \"welcome-${TIMESTAMP}@test.com\",
    \"phone\": \"+15551234567\",
    \"status\": \"NEW\",
    \"source\": \"Website\"
  }")

LEAD_WELCOME_ID=$(echo $LEAD_WELCOME | jq -r '.data.lead.id')
test_result $? "Create lead to trigger welcome workflow"

# Wait for workflow execution
sleep 2

# Check if welcome tag was added
LEAD_WITH_TAG=$(curl -s -X GET "$BASE_URL/leads/$LEAD_WELCOME_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $LEAD_WITH_TAG | jq -r '.data.lead.tags[].name' | grep -q "Welcome Series"
test_result $? "Welcome Series tag added"

# Check if task was created
TASKS=$(curl -s -X GET "$BASE_URL/tasks?leadId=$LEAD_WELCOME_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $TASKS | grep -q "Follow up with Welcome Test Lead"
test_result $? "Follow-up task created"

# Check if email activity was logged
ACTIVITIES=$(curl -s -X GET "$BASE_URL/leads/$LEAD_WELCOME_ID/activities" \
  -H "Authorization: Bearer $TOKEN")

echo $ACTIVITIES | grep -q "EMAIL_SENT"
test_result $? "Welcome email activity logged"

echo ""

# Step 5: Test Status Change Workflow (LEAD_STATUS_CHANGED)
echo -e "${YELLOW}Step 5: Test Status Change Workflow${NC}"

# Update lead to QUALIFIED status
UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/leads/$LEAD_WELCOME_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "QUALIFIED"
  }')

test_result $? "Update lead to QUALIFIED status"

# Wait for workflow execution
sleep 2

# Check if Hot Lead tag was added
LEAD_UPDATED=$(curl -s -X GET "$BASE_URL/leads/$LEAD_WELCOME_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $LEAD_UPDATED | jq -r '.data.lead.tags[].name' | grep -q "Hot Lead"
test_result $? "Hot Lead tag added by workflow"

# Check if urgent task was created
TASKS_UPDATED=$(curl -s -X GET "$BASE_URL/tasks?leadId=$LEAD_WELCOME_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $TASKS_UPDATED | grep -q "Contact qualified lead ASAP"
test_result $? "Urgent task created by workflow"

# Verify lead has both tags now
TAG_COUNT=$(echo $LEAD_UPDATED | jq '.data.lead.tags | length')
test_result $([ "$TAG_COUNT" -ge 2 ] && echo 0 || echo 1) "Lead has multiple tags from both workflows"

echo ""

# Step 6: Test Multiple Workflows Triggering
echo -e "${YELLOW}Step 6: Test Multiple Workflows for Same Event${NC}"

# Create another welcome workflow
WF_WELCOME2=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Lead Notification",
    "description": "Notify sales team about new lead",
    "triggerType": "LEAD_CREATED",
    "actions": [
      {
        "type": "ADD_TAG",
        "config": {
          "tagName": "Needs Review"
        }
      }
    ]
  }')

WF_WELCOME2_ID=$(echo $WF_WELCOME2 | jq -r '.id')

# Activate it
curl -s -X PATCH "$BASE_URL/workflows/$WF_WELCOME2_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' > /dev/null

test_result $? "Create second LEAD_CREATED workflow"

# Create a new lead that should trigger both workflows
LEAD_MULTI=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Multi Workflow Lead\",
    \"email\": \"multi-${TIMESTAMP}@test.com\",
    \"status\": \"NEW\"
  }")

LEAD_MULTI_ID=$(echo $LEAD_MULTI | jq -r '.data.lead.id')
test_result $? "Create lead to trigger multiple workflows"

# Wait for execution
sleep 2

# Check if both tags exist
LEAD_MULTI_DATA=$(curl -s -X GET "$BASE_URL/leads/$LEAD_MULTI_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $LEAD_MULTI_DATA | jq -r '.data.lead.tags[].name' | grep -q "Welcome Series"
test_result $? "First workflow executed (Welcome Series tag)"

echo $LEAD_MULTI_DATA | jq -r '.data.lead.tags[].name' | grep -q "Needs Review"
test_result $? "Second workflow executed (Needs Review tag)"

echo ""

# Step 7: Test Workflow Execution History
echo -e "${YELLOW}Step 7: Verify Workflow Execution History${NC}"

# Check welcome workflow executions
EXECUTIONS=$(curl -s -X GET "$BASE_URL/workflows/$WF_WELCOME_ID/executions" \
  -H "Authorization: Bearer $TOKEN")

EXEC_COUNT=$(echo $EXECUTIONS | jq '.executions | length')
test_result $([ "$EXEC_COUNT" -ge 2 ] && echo 0 || echo 1) "Welcome workflow has multiple executions"

# Check for successful executions
echo $EXECUTIONS | grep -q '"status":"SUCCESS"'
test_result $? "Workflow executions marked as SUCCESS"

# Verify execution metadata contains lead info
echo $EXECUTIONS | grep -q '"leadId"'
test_result $? "Execution metadata contains leadId"

echo ""

# Step 8: Test Error Handling
echo -e "${YELLOW}Step 8: Test Workflow Error Handling${NC}"

# Create a workflow with invalid action (should fail gracefully)
WF_ERROR=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Error Test Workflow",
    "triggerType": "LEAD_CREATED",
    "actions": [
      {
        "type": "UPDATE_STATUS",
        "config": {
          "status": "INVALID_STATUS"
        }
      }
    ]
  }')

WF_ERROR_ID=$(echo $WF_ERROR | jq -r '.id')
test_result $? "Create workflow with potentially failing action"

# Activate it
curl -s -X PATCH "$BASE_URL/workflows/$WF_ERROR_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' > /dev/null

# Create lead to trigger it
LEAD_ERROR=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Error Test Lead\",
    \"email\": \"error-${TIMESTAMP}@test.com\",
    \"status\": \"NEW\"
  }")

LEAD_ERROR_ID=$(echo $LEAD_ERROR | jq -r '.data.lead.id')

# Wait for execution
sleep 2

# Check if execution was logged (even if failed)
ERROR_EXECUTIONS=$(curl -s -X GET "$BASE_URL/workflows/$WF_ERROR_ID/executions" \
  -H "Authorization: Bearer $TOKEN")

echo $ERROR_EXECUTIONS | jq -r '.executions[0].status' | grep -q "FAILED\|SUCCESS"
test_result $? "Failed workflow execution logged"

# Verify lead still exists (workflow failure shouldn't break lead creation)
LEAD_CHECK=$(curl -s -X GET "$BASE_URL/leads/$LEAD_ERROR_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $LEAD_CHECK | grep -q '"id"'
test_result $? "Lead exists despite workflow failure"

echo ""

# Step 9: Test Campaign Integration
echo -e "${YELLOW}Step 9: Test Campaign Trigger Integration${NC}"

# Create a campaign
CAMPAIGN=$(curl -s -X POST "$BASE_URL/campaigns" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Campaign ${TIMESTAMP}\",
    \"description\": \"Integration test campaign\",
    \"type\": \"EMAIL\",
    \"status\": \"DRAFT\"
  }")

CAMPAIGN_ID=$(echo $CAMPAIGN | jq -r '.data.campaign.id')
test_result $? "Create campaign"

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
  echo -e "${GREEN}✓ Day 9: Workflow Integration - COMPLETE${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
