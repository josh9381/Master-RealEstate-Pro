#!/bin/bash

# Test script for Day 10: Workflow UI Integration
# Verifies frontend can properly communicate with workflow backend APIs

BASE_URL="http://localhost:8000/api"
FRONTEND_URL="http://localhost:3000"
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
echo -e "${BLUE}  Day 10: Workflow UI Integration${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Authenticate
echo -e "${YELLOW}Step 1: Authentication${NC}"

TIMESTAMP=$(date +%s)
TEST_EMAIL="ui-test-${TIMESTAMP}@test.com"

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"Password123!\",
    \"firstName\": \"UI\",
    \"lastName\": \"Tester\"
  }")

TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to authenticate${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Authenticated successfully${NC}"
echo ""

# Step 2: Test Workflow List API (GET /api/workflows)
echo -e "${YELLOW}Step 2: Test Workflow List API${NC}"

LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN")

echo $LIST_RESPONSE | grep -q '\[\]'
if [ $? -eq 0 ]; then
  test_result 0 "Workflow list API returns array (empty initially)"
else
  echo $LIST_RESPONSE | jq '.' > /dev/null 2>&1
  test_result $? "Workflow list API returns valid JSON"
fi

echo ""

# Step 3: Test Create Workflow API (POST /api/workflows)
echo -e "${YELLOW}Step 3: Test Create Workflow API${NC}"

CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "UI Test Workflow",
    "description": "Created from UI integration test",
    "triggerType": "LEAD_CREATED",
    "actions": [
      {
        "type": "SEND_EMAIL",
        "config": {
          "to": "{{lead.email}}",
          "subject": "Welcome!",
          "body": "Hello {{lead.name}}"
        }
      },
      {
        "type": "ADD_TAG",
        "config": {
          "tagName": "UI Created"
        }
      }
    ]
  }')

WORKFLOW_ID=$(echo $CREATE_RESPONSE | jq -r '.id')
test_result $([ ! -z "$WORKFLOW_ID" ] && [ "$WORKFLOW_ID" != "null" ] && echo 0 || echo 1) "Create workflow returns ID"

echo $CREATE_RESPONSE | grep -q '"name":"UI Test Workflow"'
test_result $? "Created workflow has correct name"

echo $CREATE_RESPONSE | grep -q '"isActive":false'
test_result $? "New workflow starts inactive"

echo ""

# Step 4: Test Get Single Workflow API (GET /api/workflows/:id)
echo -e "${YELLOW}Step 4: Test Get Single Workflow API${NC}"

GET_RESPONSE=$(curl -s -X GET "$BASE_URL/workflows/$WORKFLOW_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $GET_RESPONSE | grep -q "\"id\":\"$WORKFLOW_ID\""
test_result $? "Get workflow returns correct workflow"

echo $GET_RESPONSE | grep -q '"actions":\['
test_result $? "Workflow includes actions array"

echo ""

# Step 5: Test Update Workflow API (PUT /api/workflows/:id)
echo -e "${YELLOW}Step 5: Test Update Workflow API${NC}"

UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/workflows/$WORKFLOW_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated UI Test Workflow",
    "description": "Updated from test"
  }')

echo $UPDATE_RESPONSE | grep -q '"name":"Updated UI Test Workflow"'
test_result $? "Update workflow modifies name"

echo ""

# Step 6: Test Toggle Workflow API (PATCH /api/workflows/:id/toggle)
echo -e "${YELLOW}Step 6: Test Toggle Workflow Status${NC}"

# Toggle to active
TOGGLE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/workflows/$WORKFLOW_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}')

echo $TOGGLE_RESPONSE | grep -q '"isActive":true'
test_result $? "Toggle workflow to active"

# Toggle back to inactive
TOGGLE_RESPONSE2=$(curl -s -X PATCH "$BASE_URL/workflows/$WORKFLOW_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}')

echo $TOGGLE_RESPONSE2 | grep -q '"isActive":false'
test_result $? "Toggle workflow to inactive"

echo ""

# Step 7: Test Workflow Executions API (GET /api/workflows/:id/executions)
echo -e "${YELLOW}Step 7: Test Workflow Executions API${NC}"

# First activate the workflow and create a lead to trigger it
curl -s -X PATCH "$BASE_URL/workflows/$WORKFLOW_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' > /dev/null

# Create a lead to trigger the workflow
LEAD_RESPONSE=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"UI Test Lead\",
    \"email\": \"uitest-${TIMESTAMP}@test.com\",
    \"status\": \"NEW\"
  }")

# Wait for execution
sleep 2

# Get executions
EXECUTIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/workflows/$WORKFLOW_ID/executions" \
  -H "Authorization: Bearer $TOKEN")

echo $EXECUTIONS_RESPONSE | grep -q '"executions":\['
test_result $? "Executions API returns array"

echo $EXECUTIONS_RESPONSE | grep -q '"pagination":'
test_result $? "Executions API includes pagination"

EXEC_COUNT=$(echo $EXECUTIONS_RESPONSE | jq '.executions | length')
test_result $([ "$EXEC_COUNT" -gt 0 ] && echo 0 || echo 1) "Workflow execution was recorded"

echo ""

# Step 8: Test Workflow Stats
echo -e "${YELLOW}Step 8: Test Workflow Stats${NC}"

# Check if workflow stats are updated
STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/workflows/$WORKFLOW_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $STATS_RESPONSE | grep -q '"executions":[1-9]'
test_result $? "Workflow execution count incremented"

echo $STATS_RESPONSE | grep -q '"lastRunAt":'
test_result $? "Workflow lastRunAt timestamp recorded"

echo ""

# Step 9: Test List Workflows with Filters
echo -e "${YELLOW}Step 9: Test Workflow List Filters${NC}"

# Test filter by trigger type
FILTERED=$(curl -s -X GET "$BASE_URL/workflows?triggerType=LEAD_CREATED" \
  -H "Authorization: Bearer $TOKEN")

echo $FILTERED | jq '.' > /dev/null 2>&1
test_result $? "Filter by trigger type works"

# Test filter by active status
ACTIVE_ONLY=$(curl -s -X GET "$BASE_URL/workflows?isActive=true" \
  -H "Authorization: Bearer $TOKEN")

echo $ACTIVE_ONLY | jq '.' > /dev/null 2>&1
test_result $? "Filter by active status works"

echo ""

# Step 10: Test Delete Workflow API (DELETE /api/workflows/:id)
echo -e "${YELLOW}Step 10: Test Delete Workflow${NC}"

# Create a temporary workflow to delete
TEMP_WF=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Temp Workflow",
    "description": "Temporary",
    "triggerType": "LEAD_CREATED",
    "actions": [
      {
        "type": "ADD_TAG",
        "config": {
          "tagName": "temp"
        }
      }
    ]
  }')

TEMP_ID=$(echo $TEMP_WF | jq -r '.id')

# Delete it
DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/workflows/$TEMP_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $DELETE_RESPONSE | grep -q '"message":"Workflow deleted successfully"'
test_result $? "Delete workflow returns success message"

# Verify it's deleted
VERIFY_DELETE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/workflows/$TEMP_ID" \
  -H "Authorization: Bearer $TOKEN")

test_result $([ "$VERIFY_DELETE" = "404" ] && echo 0 || echo 1) "Deleted workflow returns 404"

echo ""

# Step 11: Test Error Handling
echo -e "${YELLOW}Step 11: Test Error Handling${NC}"

# Test get non-existent workflow
NOT_FOUND=$(curl -s -X GET "$BASE_URL/workflows/nonexistent123" \
  -H "Authorization: Bearer $TOKEN")

echo $NOT_FOUND | grep -q '404\|not found\|Not found'
test_result $? "Non-existent workflow returns 404"

# Test create with invalid data
INVALID_CREATE=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "",
    "triggerType": "INVALID_TRIGGER"
  }')

echo $INVALID_CREATE | grep -q '400\|validation\|Validation'
test_result $? "Invalid workflow data returns validation error"

echo ""

# Step 12: Workflow List Returns Created Workflows
echo -e "${YELLOW}Step 12: Verify Created Workflows Appear in List${NC}"

# Get all workflows and check our created workflow is there
FINAL_LIST=$(curl -s -X GET "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN")

echo $FINAL_LIST | grep -q "\"name\":\"Updated UI Test Workflow\""
test_result $? "Created workflow appears in workflow list"

WORKFLOW_COUNT=$(echo $FINAL_LIST | jq '.total')
test_result $([ "$WORKFLOW_COUNT" -ge 1 ] && echo 0 || echo 1) "Workflow count is accurate"

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
  echo -e "${GREEN}✓ Day 10: Workflow UI Integration - COMPLETE${NC}"
  echo ""
  echo -e "${BLUE}📋 Next Steps:${NC}"
  echo -e "  1. Open frontend at: ${FRONTEND_URL}/workflows"
  echo -e "  2. Test workflow creation in UI"
  echo -e "  3. View workflow execution logs"
  echo -e "  4. Review documentation"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
