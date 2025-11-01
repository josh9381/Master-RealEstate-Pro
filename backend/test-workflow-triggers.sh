#!/bin/bash

# Test script to verify workflow triggers are working correctly
# Tests the 3 seeded workflows: Welcome Series, Hot Lead Alert, Re-engagement

BASE_URL="http://localhost:8000/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "🧪 WORKFLOW TRIGGER TESTING"
echo "======================================"
echo ""

# Function to test API response
test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ $2${NC}"
  else
    echo -e "${RED}❌ $2 - FAILED${NC}"
  fi
  echo ""
}

# Step 1: Register/Login to get token
echo "Step 1: Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@realestate.com",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Authentication failed. Make sure backend is running.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Authenticated successfully${NC}"
echo ""

# Step 2: Check existing workflows
echo "Step 2: Checking seeded workflows..."
WORKFLOWS=$(curl -s -X GET "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN")

WORKFLOW_COUNT=$(echo $WORKFLOWS | grep -o '"id"' | wc -l)
echo "Found $WORKFLOW_COUNT workflows"

# Get workflow IDs
WELCOME_WORKFLOW_ID=$(echo $WORKFLOWS | grep -o '"name":"New Lead Welcome Series"[^}]*"id":"[^"]*' | grep -o '"id":"[^"]*' | cut -d'"' -f4)
HOT_LEAD_WORKFLOW_ID=$(echo $WORKFLOWS | grep -o '"name":"Hot Lead Notification"[^}]*"id":"[^"]*' | grep -o '"id":"[^"]*' | cut -d'"' -f4)
REENGAGEMENT_WORKFLOW_ID=$(echo $WORKFLOWS | grep -o '"name":"Cold Lead Re-engagement"[^}]*"id":"[^"]*' | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo "Welcome Workflow: $WELCOME_WORKFLOW_ID"
echo "Hot Lead Workflow: $HOT_LEAD_WORKFLOW_ID"
echo "Re-engagement Workflow: $REENGAGEMENT_WORKFLOW_ID"
echo ""

# Step 3: Test LEAD_CREATED trigger (Welcome Workflow)
echo "======================================"
echo "Test 1: LEAD_CREATED Trigger"
echo "======================================"
echo "Creating a new lead to trigger Welcome workflow..."

NEW_LEAD=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Lead for Workflow",
    "email": "workflow-test-'$(date +%s)'@example.com",
    "phone": "+1-555-9999",
    "status": "NEW",
    "source": "website"
  }')

NEW_LEAD_ID=$(echo $NEW_LEAD | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$NEW_LEAD_ID" ]; then
  echo -e "${GREEN}✅ Lead created: $NEW_LEAD_ID${NC}"
  echo "Waiting 3 seconds for workflow to trigger..."
  sleep 3
  
  # Check workflow executions
  EXECUTIONS=$(curl -s -X GET "$BASE_URL/workflows/$WELCOME_WORKFLOW_ID/executions" \
    -H "Authorization: Bearer $TOKEN")
  
  EXECUTION_COUNT=$(echo $EXECUTIONS | grep -o '"id"' | wc -l)
  echo "Workflow executions: $EXECUTION_COUNT"
  
  if [ $EXECUTION_COUNT -gt 0 ]; then
    echo -e "${GREEN}✅ Welcome workflow triggered successfully!${NC}"
  else
    echo -e "${YELLOW}⚠️  No executions found - check if workflow is active${NC}"
  fi
else
  echo -e "${RED}❌ Failed to create lead${NC}"
fi
echo ""

# Step 4: Test LEAD_STATUS_CHANGED trigger (Hot Lead Alert)
echo "======================================"
echo "Test 2: LEAD_STATUS_CHANGED Trigger (HOT)"
echo "======================================"
echo "Changing lead status to HOT..."

# First ensure the Hot Lead workflow is active
curl -s -X PATCH "$BASE_URL/workflows/$HOT_LEAD_WORKFLOW_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' > /dev/null

sleep 1

# Update lead status to HOT
STATUS_UPDATE=$(curl -s -X PATCH "$BASE_URL/leads/$NEW_LEAD_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "HOT"
  }')

echo "Status updated to HOT"
echo "Waiting 3 seconds for workflow to trigger..."
sleep 3

# Check hot lead workflow executions
HOT_EXECUTIONS=$(curl -s -X GET "$BASE_URL/workflows/$HOT_LEAD_WORKFLOW_ID/executions" \
  -H "Authorization: Bearer $TOKEN")

HOT_EXECUTION_COUNT=$(echo $HOT_EXECUTIONS | grep -o '"id"' | wc -l)
echo "Hot Lead workflow executions: $HOT_EXECUTION_COUNT"

if [ $HOT_EXECUTION_COUNT -gt 0 ]; then
  echo -e "${GREEN}✅ Hot Lead Alert workflow triggered successfully!${NC}"
  
  # Show last execution details
  echo ""
  echo "Last execution details:"
  echo $HOT_EXECUTIONS | grep -o '"status":"[^"]*' | head -1
else
  echo -e "${YELLOW}⚠️  No executions found - check if workflow is active${NC}"
fi
echo ""

# Step 5: Test LEAD_STATUS_CHANGED trigger (COLD to trigger re-engagement)
echo "======================================"
echo "Test 3: LEAD_STATUS_CHANGED Trigger (COLD)"
echo "======================================"
echo "Changing lead status to COLD..."

# First ensure the Re-engagement workflow is active
curl -s -X PATCH "$BASE_URL/workflows/$REENGAGEMENT_WORKFLOW_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' > /dev/null

sleep 1

# Update lead status to COLD
COLD_UPDATE=$(curl -s -X PATCH "$BASE_URL/leads/$NEW_LEAD_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COLD"
  }')

echo "Status updated to COLD"
echo "Waiting 3 seconds for workflow to trigger..."
sleep 3

# Check re-engagement workflow executions
COLD_EXECUTIONS=$(curl -s -X GET "$BASE_URL/workflows/$REENGAGEMENT_WORKFLOW_ID/executions" \
  -H "Authorization: Bearer $TOKEN")

COLD_EXECUTION_COUNT=$(echo $COLD_EXECUTIONS | grep -o '"id"' | wc -l)
echo "Re-engagement workflow executions: $COLD_EXECUTION_COUNT"

if [ $COLD_EXECUTION_COUNT -gt 0 ]; then
  echo -e "${GREEN}✅ Re-engagement workflow triggered successfully!${NC}"
else
  echo -e "${YELLOW}⚠️  No executions found - check if workflow is active${NC}"
fi
echo ""

# Step 6: Summary
echo "======================================"
echo "📊 TEST SUMMARY"
echo "======================================"
echo ""
echo "Total workflows in system: $WORKFLOW_COUNT"
echo "Test lead created: $NEW_LEAD_ID"
echo ""
echo "Workflow Trigger Results:"
echo "  1. LEAD_CREATED (Welcome): $([ $EXECUTION_COUNT -gt 0 ] && echo '✅ PASSED' || echo '⚠️  CHECK LOGS')"
echo "  2. STATUS→HOT (Alert): $([ $HOT_EXECUTION_COUNT -gt 0 ] && echo '✅ PASSED' || echo '⚠️  CHECK LOGS')"
echo "  3. STATUS→COLD (Re-engage): $([ $COLD_EXECUTION_COUNT -gt 0 ] && echo '✅ PASSED' || echo '⚠️  CHECK LOGS')"
echo ""
echo "======================================"
echo "🎯 Next Steps:"
echo "======================================"
echo "1. Check backend logs for execution details"
echo "2. Verify emails/SMS were logged (mock mode)"
echo "3. Check tasks were created in database"
echo "4. View workflow execution history in UI"
echo ""
