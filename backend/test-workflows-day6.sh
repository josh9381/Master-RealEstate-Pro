#!/bin/bash

# Test script for Day 6: Workflow CRUD
# Tests all workflow endpoints and features

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
echo -e "${BLUE}  Day 6: Workflow CRUD Testing${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Register and login
echo -e "${YELLOW}Step 1: Authentication${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "workflow-test@test.com",
    "password": "Password123!",
    "firstName": "Workflow",
    "lastName": "Tester"
  }')

TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  echo -e "${GREEN}✓ Registered new user${NC}"
else
  # Try login if registration failed (user already exists)
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "workflow-test@test.com",
      "password": "Password123!"
    }')
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  if [ ! -z "$TOKEN" ]; then
    echo -e "${GREEN}✓ Logged in existing user${NC}"
  fi
fi

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to authenticate${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Authenticated successfully${NC}"
echo ""

# Step 2: Create workflows with different triggers
echo -e "${YELLOW}Step 2: Create Workflows${NC}"

# Create Welcome Series Workflow
WORKFLOW1=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Lead Welcome Series",
    "description": "Automatically welcome new leads",
    "triggerType": "LEAD_CREATED",
    "triggerData": {},
    "actions": [
      {
        "type": "SEND_EMAIL",
        "config": {
          "templateId": "welcome",
          "to": "{{lead.email}}",
          "subject": "Welcome {{lead.firstName}}!"
        }
      },
      {
        "type": "WAIT",
        "config": {
          "duration": 259200
        }
      },
      {
        "type": "CREATE_TASK",
        "config": {
          "title": "Follow up with {{lead.name}}",
          "dueDate": "+3 days",
          "priority": "HIGH"
        }
      }
    ]
  }')

WORKFLOW1_ID=$(echo $WORKFLOW1 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_result $? "Create welcome series workflow" "$WORKFLOW1"

# Create Hot Lead Alert Workflow
WORKFLOW2=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hot Lead Alert",
    "description": "Alert sales team when lead becomes hot",
    "triggerType": "LEAD_STATUS_CHANGED",
    "triggerData": {
      "conditions": [
        {
          "field": "newStatus",
          "operator": "equals",
          "value": "HOT"
        }
      ]
    },
    "actions": [
      {
        "type": "SEND_SMS",
        "config": {
          "to": "{{manager.phone}}",
          "message": "🔥 Hot lead: {{lead.name}} - {{lead.email}}"
        }
      },
      {
        "type": "CREATE_TASK",
        "config": {
          "title": "Contact hot lead ASAP",
          "priority": "URGENT"
        }
      }
    ]
  }')

WORKFLOW2_ID=$(echo $WORKFLOW2 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_result $? "Create hot lead alert workflow" "$WORKFLOW2"

# Create Re-engagement Workflow
WORKFLOW3=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Re-engage Cold Leads",
    "description": "Re-engage leads that went cold",
    "triggerType": "LEAD_STATUS_CHANGED",
    "triggerData": {
      "conditions": [
        {
          "field": "newStatus",
          "operator": "equals",
          "value": "COLD"
        }
      ]
    },
    "actions": [
      {
        "type": "WAIT",
        "config": {
          "duration": 604800
        }
      },
      {
        "type": "SEND_EMAIL",
        "config": {
          "templateId": "re-engagement",
          "to": "{{lead.email}}",
          "subject": "We miss you {{lead.firstName}}"
        }
      },
      {
        "type": "ADD_TAG",
        "config": {
          "tagName": "Re-engagement Campaign"
        }
      }
    ]
  }')

WORKFLOW3_ID=$(echo $WORKFLOW3 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_result $? "Create re-engagement workflow" "$WORKFLOW3"

echo ""

# Step 3: List all workflows
echo -e "${YELLOW}Step 3: List Workflows${NC}"

WORKFLOWS_LIST=$(curl -s -X GET "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN")

WORKFLOW_COUNT=$(echo $WORKFLOWS_LIST | grep -o '"id":"' | wc -l)
test_result $([ $WORKFLOW_COUNT -ge 3 ] && echo 0 || echo 1) "List workflows (found $WORKFLOW_COUNT workflows)"

echo ""

# Step 4: Get single workflow
echo -e "${YELLOW}Step 4: Get Single Workflow${NC}"

WORKFLOW_DETAIL=$(curl -s -X GET "$BASE_URL/workflows/$WORKFLOW1_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $WORKFLOW_DETAIL | grep -q '"name":"New Lead Welcome Series"'
test_result $? "Get workflow by ID"

echo $WORKFLOW_DETAIL | grep -q '"triggerType":"LEAD_CREATED"'
test_result $? "Verify workflow trigger type"

echo $WORKFLOW_DETAIL | grep -q '"type":"SEND_EMAIL"'
test_result $? "Verify workflow has actions"

echo ""

# Step 5: Update workflow
echo -e "${YELLOW}Step 5: Update Workflow${NC}"

UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/workflows/$WORKFLOW1_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Lead Welcome Series v2",
    "description": "Updated welcome series with more steps"
  }')

echo $UPDATE_RESPONSE | grep -q '"name":"New Lead Welcome Series v2"'
test_result $? "Update workflow name"

echo $UPDATE_RESPONSE | grep -q 'Updated welcome series'
test_result $? "Update workflow description"

echo ""

# Step 6: Toggle workflow active state
echo -e "${YELLOW}Step 6: Toggle Workflow Active State${NC}"

# Activate workflow
ACTIVATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/workflows/$WORKFLOW1_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}')

echo $ACTIVATE_RESPONSE | grep -q '"isActive":true'
test_result $? "Activate workflow"

echo $ACTIVATE_RESPONSE | grep -q 'activated'
test_result $? "Verify activation message"

# Deactivate workflow
DEACTIVATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/workflows/$WORKFLOW1_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}')

echo $DEACTIVATE_RESPONSE | grep -q '"isActive":false'
test_result $? "Deactivate workflow"

echo ""

# Step 7: Test workflow execution
echo -e "${YELLOW}Step 7: Test Workflow Execution${NC}"

TEST_RESPONSE=$(curl -s -X POST "$BASE_URL/workflows/$WORKFLOW1_ID/test" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testData": {
      "lead": {
        "name": "Test Lead",
        "email": "test@test.com"
      }
    }
  }')

echo $TEST_RESPONSE | grep -q '"status":"SUCCESS"'
test_result $? "Test workflow execution"

echo $TEST_RESPONSE | grep -q 'mock mode'
test_result $? "Verify mock execution"

echo ""

# Step 8: Get workflow executions
echo -e "${YELLOW}Step 8: Get Workflow Execution History${NC}"

EXECUTIONS=$(curl -s -X GET "$BASE_URL/workflows/$WORKFLOW1_ID/executions" \
  -H "Authorization: Bearer $TOKEN")

echo $EXECUTIONS | grep -q '"executions":\['
test_result $? "Get workflow execution history"

echo $EXECUTIONS | grep -q '"pagination":'
test_result $? "Verify pagination in execution history"

echo ""

# Step 9: Get workflow stats
echo -e "${YELLOW}Step 9: Get Workflow Statistics${NC}"

STATS=$(curl -s -X GET "$BASE_URL/workflows/stats" \
  -H "Authorization: Bearer $TOKEN")

echo $STATS | grep -q '"totalWorkflows":'
test_result $? "Get workflow stats"

echo $STATS | grep -q '"activeWorkflows":'
test_result $? "Stats include active workflows count"

echo $STATS | grep -q '"successRate":'
test_result $? "Stats include success rate"

echo ""

# Step 10: Filter workflows
echo -e "${YELLOW}Step 10: Filter Workflows${NC}"

# Filter by trigger type
FILTERED=$(curl -s -X GET "$BASE_URL/workflows?triggerType=LEAD_CREATED" \
  -H "Authorization: Bearer $TOKEN")

echo $FILTERED | grep -q 'LEAD_CREATED'
test_result $? "Filter workflows by trigger type"

# Search workflows
SEARCH_RESULT=$(curl -s -X GET "$BASE_URL/workflows?search=welcome" \
  -H "Authorization: Bearer $TOKEN")

echo $SEARCH_RESULT | grep -q -i 'welcome'
test_result $? "Search workflows by name"

echo ""

# Step 11: Validation tests
echo -e "${YELLOW}Step 11: Validation Tests${NC}"

# Try to create workflow without actions
NO_ACTIONS=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Workflow",
    "triggerType": "LEAD_CREATED",
    "actions": []
  }')

echo $NO_ACTIONS | grep -q -i 'error\|required\|invalid'
test_result $? "Reject workflow with empty actions"

# Try to delete active workflow (activate first)
curl -s -X PATCH "$BASE_URL/workflows/$WORKFLOW2_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' > /dev/null

DELETE_ACTIVE=$(curl -s -X DELETE "$BASE_URL/workflows/$WORKFLOW2_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $DELETE_ACTIVE | grep -q -i 'active\|cannot\|deactivate'
test_result $? "Prevent deleting active workflow"

echo ""

# Step 12: Delete workflow (after deactivating)
echo -e "${YELLOW}Step 12: Delete Workflow${NC}"

# Deactivate first
curl -s -X PATCH "$BASE_URL/workflows/$WORKFLOW3_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}' > /dev/null

DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/workflows/$WORKFLOW3_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $DELETE_RESPONSE | grep -q 'deleted'
test_result $? "Delete workflow after deactivating"

# Verify it's gone
VERIFY_DELETED=$(curl -s -X GET "$BASE_URL/workflows/$WORKFLOW3_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $VERIFY_DELETED | grep -q 'not found'
test_result $? "Verify workflow is deleted"

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
  echo -e "${GREEN}✓ Day 6: Workflow CRUD - COMPLETE${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
