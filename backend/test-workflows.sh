#!/bin/bash

# Test Workflow Triggers Script
# Tests that workflows execute correctly when leads are created or updated

BASE_URL="http://localhost:8000/api"
TOKEN=""

echo "🧪 Workflow Trigger Test Suite"
echo "================================"
echo ""

# Step 1: Login to get auth token
echo "📝 Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@realestate.com",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Could not extract token. Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo ""

# Step 2: Check if workflows exist
echo "📝 Step 2: Checking workflows..."
WORKFLOWS_RESPONSE=$(curl -s -X GET "$BASE_URL/workflows" \
  -H "Authorization: Bearer $TOKEN")

WORKFLOW_COUNT=$(echo $WORKFLOWS_RESPONSE | grep -o '"id"' | wc -l)
echo "✅ Found $WORKFLOW_COUNT workflows"

# Get the Welcome Series workflow ID
WELCOME_WORKFLOW_ID=$(echo $WORKFLOWS_RESPONSE | grep -o '"id":"[^"]*","name":"New Lead Welcome Series' | head -1 | grep -o '"id":"[^"]*' | sed 's/"id":"//')
HOT_WORKFLOW_ID=$(echo $WORKFLOWS_RESPONSE | grep -o '"id":"[^"]*","name":"Hot Lead Alert' | head -1 | grep -o '"id":"[^"]*' | sed 's/"id":"//')

if [ -n "$WELCOME_WORKFLOW_ID" ]; then
  echo "   Welcome Series ID: $WELCOME_WORKFLOW_ID"
fi
if [ -n "$HOT_WORKFLOW_ID" ]; then
  echo "   Hot Lead Alert ID: $HOT_WORKFLOW_ID"
fi
echo ""

# Step 3: Create a new lead (should trigger "Welcome Series" workflow)
echo "📝 Step 3: Creating new lead (should trigger Welcome Series)..."
TIMESTAMP=$(date +%s)
NEW_LEAD=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Lead - Workflow Trigger\",
    \"email\": \"workflow-test-$TIMESTAMP@example.com\",
    \"phone\": \"555-555-0123\",
    \"status\": \"NEW\",
    \"source\": \"Website\",
    \"propertyInterest\": \"Condo in Downtown\",
    \"budget\": 350000
  }")

LEAD_ID=$(echo $NEW_LEAD | grep -o '"id":"[^"]*' | sed 's/"id":"//')

if [ -z "$LEAD_ID" ]; then
  echo "❌ Failed to create lead. Response: $NEW_LEAD"
  exit 1
fi

echo "✅ Lead created with ID: $LEAD_ID"
echo ""

# Wait for workflow to process
echo "⏳ Waiting 2 seconds for workflow to trigger..."
sleep 2

# Step 4: Check workflow executions
echo "📝 Step 4: Checking workflow executions for Welcome Series..."
if [ -n "$WELCOME_WORKFLOW_ID" ]; then
  EXECUTIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/workflows/$WELCOME_WORKFLOW_ID/executions" \
    -H "Authorization: Bearer $TOKEN")
  
  EXECUTION_COUNT=$(echo $EXECUTIONS_RESPONSE | grep -o '"status":"SUCCESS"' | wc -l)
  echo "✅ Found $EXECUTION_COUNT successful executions"
else
  echo "⚠️  Welcome Series workflow not found"
  EXECUTION_COUNT=0
fi
echo ""

# Step 5: Update lead to HOT status (should trigger "Hot Lead Alert")
echo "📝 Step 5: Updating lead to HOT status (should trigger Hot Lead Alert)..."
UPDATE_LEAD=$(curl -s -X PATCH "$BASE_URL/leads/$LEAD_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "HOT"
  }')

echo "✅ Lead updated to HOT status"
echo ""

# Wait for workflow to process
echo "⏳ Waiting 2 seconds for workflow to trigger..."
sleep 2

# Step 6: Check workflow executions again
echo "📝 Step 6: Checking workflow executions after status change..."
EXECUTION_COUNT_2=0

if [ -n "$WELCOME_WORKFLOW_ID" ]; then
  WELCOME_EXECUTIONS=$(curl -s -X GET "$BASE_URL/workflows/$WELCOME_WORKFLOW_ID/executions" \
    -H "Authorization: Bearer $TOKEN")
  WELCOME_COUNT=$(echo $WELCOME_EXECUTIONS | grep -o '"status":"SUCCESS"' | wc -l)
  EXECUTION_COUNT_2=$((EXECUTION_COUNT_2 + WELCOME_COUNT))
  echo "   Welcome Series: $WELCOME_COUNT executions"
fi

if [ -n "$HOT_WORKFLOW_ID" ]; then
  HOT_EXECUTIONS=$(curl -s -X GET "$BASE_URL/workflows/$HOT_WORKFLOW_ID/executions" \
    -H "Authorization: Bearer $TOKEN")
  HOT_COUNT=$(echo $HOT_EXECUTIONS | grep -o '"status":"SUCCESS"' | wc -l)
  EXECUTION_COUNT_2=$((EXECUTION_COUNT_2 + HOT_COUNT))
  echo "   Hot Lead Alert: $HOT_COUNT executions"
fi

echo "✅ Total successful executions: $EXECUTION_COUNT_2 (was $EXECUTION_COUNT)"
echo ""

# Step 7: Show recent execution details
echo "📝 Step 7: Recent workflow execution details..."
if [ -n "$WELCOME_WORKFLOW_ID" ]; then
  echo "Welcome Series executions:"
  echo "$WELCOME_EXECUTIONS" | python3 -m json.tool 2>/dev/null | head -50 || echo "$WELCOME_EXECUTIONS" | head -500
fi
echo ""

# Summary
echo "================================"
echo "✅ Test Summary:"
echo "   - Workflows found: $WORKFLOW_COUNT"
echo "   - Initial executions: $EXECUTION_COUNT"
echo "   - Final executions: $EXECUTION_COUNT_2"
echo "   - New executions: $((EXECUTION_COUNT_2 - EXECUTION_COUNT))"
echo ""

if [ $EXECUTION_COUNT_2 -gt $EXECUTION_COUNT ]; then
  echo "✅ SUCCESS: Workflows are triggering correctly!"
else
  echo "⚠️  WARNING: No new workflow executions detected"
  echo "   This could mean workflows are not triggering or there's a delay"
fi
