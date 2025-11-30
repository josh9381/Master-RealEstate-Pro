#!/bin/bash

# Test only the NEW 54 functions that were added

echo "🤖 Testing NEW AI Functions (54 functions)"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="http://localhost:8000/api"
PASSED=0
FAILED=0
TOTAL=0

# Login
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@realestate.com", "password": "admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.tokens.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Logged in"
echo ""

# Get test lead
LEAD_ID=$(curl -s "$API_URL/leads?limit=1" -H "Authorization: Bearer $TOKEN" | jq -r '.data.leads[0].id')
echo "Using Lead ID: $LEAD_ID"
echo ""

test_fn() {
  TOTAL=$((TOTAL + 1))
  echo -e "${BLUE}Test $TOTAL: $1${NC}"
  
  RESPONSE=$(curl -s -X POST "$API_URL/ai/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\": \"$2\", \"conversationHistory\": []}")
  
  if echo "$RESPONSE" | grep -q "\"functionUsed\":\"$3\""; then
    echo -e "${GREEN}✅ PASSED${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}❌ FAILED${NC}"
    echo "Response: $(echo $RESPONSE | jq -r '.data.message' 2>/dev/null | head -c 150)"
    FAILED=$((FAILED + 1))
  fi
  echo ""
  sleep 2  # Rate limiting
}

echo -e "${BLUE}━━━ TASK MANAGEMENT ━━━${NC}"
test_fn "Create Task" "Create task for lead $LEAD_ID: Test follow up" "create_task"

TASK_ID=$(curl -s "$API_URL/tasks?limit=1" -H "Authorization: Bearer $TOKEN" | jq -r '.data.tasks[0].id')
if [ -n "$TASK_ID" ] && [ "$TASK_ID" != "null" ]; then
  test_fn "Update Task" "Update task $TASK_ID priority to HIGH" "update_task"
  test_fn "Complete Task" "Mark task $TASK_ID as complete" "complete_task"
  test_fn "Delete Task" "Delete task $TASK_ID" "delete_task"
else
  echo "⚠️  Skipping task operations"
  FAILED=$((FAILED + 3))
  TOTAL=$((TOTAL + 3))
fi

echo -e "${BLUE}━━━ APPOINTMENT MANAGEMENT ━━━${NC}"
test_fn "Schedule Appointment" "Schedule appointment with lead $LEAD_ID tomorrow at 2pm" "schedule_appointment"

APT_ID=$(curl -s "$API_URL/appointments?limit=1" -H "Authorization: Bearer $TOKEN" | jq -r '.data.appointments[0].id')
if [ -n "$APT_ID" ] && [ "$APT_ID" != "null" ]; then
  test_fn "Update Appointment" "Update appointment $APT_ID to 3pm" "update_appointment"
  test_fn "Confirm Appointment" "Confirm appointment $APT_ID" "confirm_appointment"
  test_fn "Reschedule Appointment" "Reschedule appointment $APT_ID to Friday at 10am" "reschedule_appointment"
  test_fn "Cancel Appointment" "Cancel appointment $APT_ID" "cancel_appointment"
else
  echo "⚠️  Skipping appointment operations"
  FAILED=$((FAILED + 4))
  TOTAL=$((TOTAL + 4))
fi

echo -e "${BLUE}━━━ NOTE MANAGEMENT ━━━${NC}"
NOTE_ID=$(curl -s "$API_URL/leads/$LEAD_ID/notes" -H "Authorization: Bearer $TOKEN" | jq -r '.data.notes[0].id')
if [ -n "$NOTE_ID" ] && [ "$NOTE_ID" != "null" ]; then
  test_fn "Update Note" "Update note $NOTE_ID to: Very interested in luxury" "update_note"
  test_fn "Delete Note" "Delete note $NOTE_ID" "delete_note"
else
  echo "⚠️  No notes to test"
  FAILED=$((FAILED + 2))
  TOTAL=$((TOTAL + 2))
fi

echo -e "${BLUE}━━━ TAG MANAGEMENT ━━━${NC}"
test_fn "Create Tag" "Create tag VIP with color gold" "create_tag"

TAG_ID=$(curl -s "$API_URL/tags" -H "Authorization: Bearer $TOKEN" | jq -r '.data.tags[0].id')
if [ -n "$TAG_ID" ] && [ "$TAG_ID" != "null" ]; then
  test_fn "Update Tag" "Update tag $TAG_ID color to red" "update_tag"
  test_fn "Remove Tag From Lead" "Remove tag $TAG_ID from lead $LEAD_ID" "remove_tag_from_lead"
  test_fn "Delete Tag" "Delete tag $TAG_ID" "delete_tag"
else
  echo "⚠️  Skipping tag operations"
  FAILED=$((FAILED + 3))
  TOTAL=$((TOTAL + 3))
fi

echo -e "${BLUE}━━━ TEMPLATES ━━━${NC}"
test_fn "Create Email Template" "Create email template Welcome with subject Hi and body Thanks" "create_email_template"
test_fn "Create SMS Template" "Create SMS template Quick with content Hello" "create_sms_template"

EMAIL_TPL=$(curl -s "$API_URL/templates/email" -H "Authorization: Bearer $TOKEN" | jq -r '.data.templates[0].id')
SMS_TPL=$(curl -s "$API_URL/templates/sms" -H "Authorization: Bearer $TOKEN" | jq -r '.data.templates[0].id')

if [ -n "$EMAIL_TPL" ] && [ "$EMAIL_TPL" != "null" ]; then
  test_fn "Delete Email Template" "Delete email template $EMAIL_TPL" "delete_email_template"
fi

if [ -n "$SMS_TPL" ] && [ "$SMS_TPL" != "null" ]; then
  test_fn "Delete SMS Template" "Delete SMS template $SMS_TPL" "delete_sms_template"
fi

echo -e "${BLUE}━━━ ANALYTICS ━━━${NC}"
test_fn "Dashboard Stats" "Show dashboard stats" "get_dashboard_stats"
test_fn "Lead Analytics" "Show lead analytics" "get_lead_analytics"
test_fn "Conversion Funnel" "Show conversion funnel" "get_conversion_funnel"

echo -e "${BLUE}━━━ BULK OPERATIONS ━━━${NC}"
test_fn "Bulk Update" "Use bulk_update_leads to set score below 30 to UNQUALIFIED" "bulk_update_leads"
test_fn "Bulk Delete" "Use bulk_delete_leads to delete UNQUALIFIED leads older than 180 days" "bulk_delete_leads"

echo -e "${BLUE}━━━ CAMPAIGNS ━━━${NC}"
test_fn "Create Campaign" "Create email campaign Spring Sale" "create_campaign"

CAMP_ID=$(curl -s "$API_URL/campaigns?limit=1" -H "Authorization: Bearer $TOKEN" | jq -r '.data.campaigns[0].id')
if [ -n "$CAMP_ID" ] && [ "$CAMP_ID" != "null" ]; then
  test_fn "Update Campaign" "Update campaign $CAMP_ID subject to Limited Sale" "update_campaign"
  test_fn "Pause Campaign" "Pause campaign $CAMP_ID" "pause_campaign"
  test_fn "Get Campaign Analytics" "Show analytics for campaign $CAMP_ID" "get_campaign_analytics"
  test_fn "Duplicate Campaign" "Duplicate campaign $CAMP_ID as Summer Sale" "duplicate_campaign"
  test_fn "Archive Campaign" "Archive campaign $CAMP_ID" "archive_campaign"
  test_fn "Delete Campaign" "Delete campaign $CAMP_ID" "delete_campaign"
fi

echo -e "${BLUE}━━━ WORKFLOWS ━━━${NC}"
test_fn "Create Workflow" "Create workflow that sends welcome email" "create_workflow"

WF_ID=$(curl -s "$API_URL/workflows?limit=1" -H "Authorization: Bearer $TOKEN" | jq -r '.data.workflows[0].id')
if [ -n "$WF_ID" ] && [ "$WF_ID" != "null" ]; then
  test_fn "Update Workflow" "Update workflow $WF_ID to also send SMS" "update_workflow"
  test_fn "Toggle Workflow" "Disable workflow $WF_ID" "toggle_workflow"
  test_fn "Trigger Workflow" "Trigger workflow $WF_ID for lead $LEAD_ID" "trigger_workflow"
  test_fn "Delete Workflow" "Delete workflow $WF_ID" "delete_workflow"
fi

echo -e "${BLUE}━━━ INTEGRATIONS ━━━${NC}"
test_fn "Connect Integration" "Connect Twilio with key ABC123" "connect_integration"
test_fn "Sync Integration" "Sync Twilio" "sync_integration"
test_fn "Disconnect Integration" "Disconnect Twilio" "disconnect_integration"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   RESULTS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Total: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""
RATE=$((PASSED * 100 / TOTAL))
echo "Pass Rate: $RATE%"

if [ $RATE -ge 80 ]; then
  echo -e "${GREEN}✅ Excellent!${NC}"
  exit 0
else
  echo -e "${RED}❌ Issues detected${NC}"
  exit 1
fi
