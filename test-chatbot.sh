   #!/bin/bash

# AI Chatbot Function Test Script
# Tests all 22 AI functions to verify they work correctly

echo "🤖 AI Chatbot Function Test Suite"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_URL="http://localhost:8000/api"
TOKEN="" # Will be set after login

# Test Results
PASSED=0
FAILED=0
TOTAL=0

# Conversation history to maintain context
CONVERSATION_HISTORY="[]"
CREATED_LEAD_ID=""

# Helper function to test API endpoint
test_function() {
    local test_name="$1"
    local message="$2"
    local expected_function="$3"
    
    TOTAL=$((TOTAL + 1))
    echo -e "${BLUE}Test $TOTAL: $test_name${NC}"
    echo "   Message: \"$message\""
    
    # Escape message for JSON
    local escaped_message=$(echo "$message" | sed 's/"/\\"/g')
    
    # Call the chat API with conversation history
    response=$(curl -s -X POST "$API_URL/ai/chat" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{
            \"message\": \"$escaped_message\",
            \"conversationHistory\": $CONVERSATION_HISTORY,
            \"tone\": \"PROFESSIONAL\"
        }")
    
    # Extract the response message and add to conversation history
    local response_message=$(echo "$response" | jq -r '.data.message' 2>/dev/null || echo "")
    if [ -n "$response_message" ] && [ "$response_message" != "null" ]; then
        # Add user message to history
        CONVERSATION_HISTORY=$(echo "$CONVERSATION_HISTORY" | jq --arg msg "$message" '. + [{"role": "user", "content": $msg}]' 2>/dev/null || echo "[]")
        # Add assistant response to history
        CONVERSATION_HISTORY=$(echo "$CONVERSATION_HISTORY" | jq --arg msg "$response_message" '. + [{"role": "assistant", "content": $msg}]' 2>/dev/null || echo "[]")
    fi
    
    # Extract lead ID if this is a create lead test
    if [ "$test_name" = "Create Lead" ]; then
        CREATED_LEAD_ID=$(echo "$response" | jq -r '.data.leadId // .data.id // empty' 2>/dev/null || echo "")
        if [ -z "$CREATED_LEAD_ID" ]; then
            # Try to extract from message
            CREATED_LEAD_ID=$(echo "$response_message" | grep -oP 'ID:\s*\K[a-zA-Z0-9]+' | head -1)
        fi
    fi
    
    # Check if response is successful
    if echo "$response" | grep -q '"success":true'; then
        # Check if expected function was used
        if [ -n "$expected_function" ]; then
            if echo "$response" | grep -q "\"functionUsed\":\"$expected_function\""; then
                echo -e "${GREEN}   ✅ PASSED - Function '$expected_function' was called${NC}"
                PASSED=$((PASSED + 1))
            else
                echo -e "${RED}   ❌ FAILED - Expected function '$expected_function' was not called${NC}"
                echo "   Response: $(echo $response | jq -r '.data.message' 2>/dev/null || echo $response | head -c 200)"
                FAILED=$((FAILED + 1))
            fi
        else
            echo -e "${GREEN}   ✅ PASSED - Got successful response${NC}"
            PASSED=$((PASSED + 1))
        fi
    else
        echo -e "${RED}   ❌ FAILED - API call failed${NC}"
        echo "   Response: $(echo $response | head -c 200)"
        FAILED=$((FAILED + 1))
    fi
    echo ""
}

# Step 1: Login to get auth token
echo -e "${YELLOW}📝 Step 1: Logging in to get auth token...${NC}"
login_response=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "admin@realestate.com",
        "password": "admin123"
    }')

TOKEN=$(echo $login_response | jq -r '.data.tokens.accessToken' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}❌ Failed to login. Make sure backend is running and credentials are correct.${NC}"
    echo "Response: $login_response"
    exit 1
fi

echo -e "${GREEN}✅ Successfully logged in${NC}"
echo ""

# Step 2: Run tests
echo -e "${YELLOW}🧪 Step 2: Running function tests...${NC}"
echo ""

# Test 1-9: NEW ACTION FUNCTIONS
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   NEW ACTION FUNCTIONS (Create/Update)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Create Lead" \
    "Create a lead for John Doe, email john@test.com, phone 555-1234" \
    "create_lead"

test_function "Update Lead" \
    "Update John Doe's phone number to 555-9999" \
    "update_lead"

test_function "Add Note to Lead" \
    "Add a note to John Doe: He is interested in downtown condos" \
    "add_note_to_lead"

test_function "Add Tag to Lead" \
    "Tag John Doe as 'Hot Lead'" \
    "add_tag_to_lead"

test_function "Create Activity" \
    "Log a call activity for John Doe: Discussed pricing options" \
    "create_activity"

test_function "Schedule Appointment" \
    "Schedule a meeting with John Doe tomorrow at 2pm" \
    "schedule_appointment"

test_function "Send Email" \
    "Send an email to John Doe about our new listing" \
    "send_email"

test_function "Send SMS" \
    "Send SMS to John Doe: Reminder about our meeting tomorrow" \
    "send_sms"

# Test 10-13: READ FUNCTIONS
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   READ FUNCTIONS (Search/Query)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Get Lead Count" \
    "How many leads do I have?" \
    "get_lead_count"

test_function "Search Leads" \
    "Show me my hot leads with score above 80" \
    "search_leads"

test_function "Get Lead Details" \
    "Show me details for John Doe" \
    "get_lead_details"

test_function "Get Recent Activities" \
    "Show me my recent activities" \
    "get_recent_activities"

# Test 14-16: TASK MANAGEMENT
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   TASK MANAGEMENT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Create Task" \
    "Create a task to follow up with John Doe tomorrow" \
    "create_task"

test_function "Update Lead Status" \
    "Update John Doe's status to QUALIFIED" \
    "update_lead_status"

# Test 17-19: AI COMPOSITION
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   AI COMPOSITION (Draft Messages)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Compose Email" \
    "Draft a follow-up email to John Doe" \
    "compose_email"

test_function "Compose SMS" \
    "Draft a quick SMS reminder for John Doe" \
    "compose_sms"

test_function "Compose Call Script" \
    "Create a call script for cold calling" \
    "compose_script"

# Test 20-22: AI INTELLIGENCE
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   AI INTELLIGENCE (Analysis/Predictions)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Predict Conversion" \
    "What's the conversion probability for John Doe?" \
    "predict_conversion"

test_function "Get Next Action" \
    "What should I do next with John Doe?" \
    "get_next_action"

test_function "Analyze Engagement" \
    "When is the best time to contact this lead?" \
    "analyze_engagement"

test_function "Identify At-Risk Leads" \
    "Which leads are at risk of going cold?" \
    "identify_at_risk_leads"

# Test 23-54: NEW FUNCTIONS
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   TASK MANAGEMENT (New)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# First create a task to test with
test_function "Create Task for Testing" \
    "Create a task for lead $LEAD_ID: Follow up on pricing" \
    "create_task"

# Get the task ID from recent tasks
TASK_RESPONSE=$(curl -s -X GET "http://localhost:8000/api/tasks?limit=1" \
    -H "Authorization: Bearer $TOKEN")
TASK_ID=$(echo $TASK_RESPONSE | jq -r '.data[0].id' 2>/dev/null)

if [ -n "$TASK_ID" ] && [ "$TASK_ID" != "null" ]; then
    echo -e "${GREEN}Using task ID: $TASK_ID${NC}"
    echo ""
    
    test_function "Update Task" \
        "Update task $TASK_ID priority to HIGH" \
        "update_task"

    test_function "Complete Task" \
        "Mark task $TASK_ID as complete" \
        "complete_task"

    test_function "Delete Task" \
        "Delete task $TASK_ID" \
        "delete_task"
else
    echo -e "${YELLOW}⚠️  Skipping task tests - no task ID available${NC}"
    FAILED=$((FAILED + 3))
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   NOTE MANAGEMENT (New)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Update Note" \
    "Update the note to say: Very interested in luxury condos" \
    "update_note"

test_function "Delete Note" \
    "Delete the note about condos" \
    "delete_note"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   TAG MANAGEMENT (New)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Create Tag" \
    "Create a new tag called VIP Client with color #FFD700" \
    "create_tag"

test_function "Update Tag" \
    "Update the Hot Lead tag color to red" \
    "update_tag"

test_function "Remove Tag From Lead" \
    "Remove the Hot Lead tag from John Doe" \
    "remove_tag_from_lead"

test_function "Delete Tag" \
    "Delete the VIP Client tag" \
    "delete_tag"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   APPOINTMENT MANAGEMENT (New)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get an existing appointment or create one
APT_RESPONSE=$(curl -s -X GET "http://localhost:8000/api/appointments?limit=1" \
    -H "Authorization: Bearer $TOKEN")
APPOINTMENT_ID=$(echo $APT_RESPONSE | jq -r '.data[0].id' 2>/dev/null)

if [ -z "$APPOINTMENT_ID" ] || [ "$APPOINTMENT_ID" = "null" ]; then
    # Create an appointment first
    test_function "Create Appointment for Testing" \
        "Schedule an appointment with lead $LEAD_ID for tomorrow at 2pm" \
        "schedule_appointment"
    
    # Get the newly created appointment
    APT_RESPONSE=$(curl -s -X GET "http://localhost:8000/api/appointments?limit=1" \
        -H "Authorization: Bearer $TOKEN")
    APPOINTMENT_ID=$(echo $APT_RESPONSE | jq -r '.data[0].id' 2>/dev/null)
fi

if [ -n "$APPOINTMENT_ID" ] && [ "$APPOINTMENT_ID" != "null" ]; then
    echo -e "${GREEN}Using appointment ID: $APPOINTMENT_ID${NC}"
    echo ""
    
    test_function "Update Appointment" \
        "Update appointment $APPOINTMENT_ID to 3pm" \
        "update_appointment"

    test_function "Confirm Appointment" \
        "Confirm appointment $APPOINTMENT_ID" \
        "confirm_appointment"

    test_function "Reschedule Appointment" \
        "Reschedule appointment $APPOINTMENT_ID to next Friday at 10am" \
        "reschedule_appointment"

    test_function "Cancel Appointment" \
        "Cancel appointment $APPOINTMENT_ID because client is unavailable" \
        "cancel_appointment"
else
    echo -e "${YELLOW}⚠️  Skipping appointment tests - no appointment ID available${NC}"
    FAILED=$((FAILED + 4))
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   TEMPLATE MANAGEMENT (New)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Create Email Template" \
    "Create an email template called 'Welcome Email' with subject 'Welcome to Our Agency' and body 'Thank you for choosing us'" \
    "create_email_template"

test_function "Create SMS Template" \
    "Create an SMS template called 'Quick Reminder' with content 'Looking forward to our meeting!'" \
    "create_sms_template"

test_function "Delete Email Template" \
    "Delete the Welcome Email template" \
    "delete_email_template"

test_function "Delete SMS Template" \
    "Delete the Quick Reminder template" \
    "delete_sms_template"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   BULK OPERATIONS (New)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Bulk Update Leads" \
    "Update all leads with score below 30 to status UNQUALIFIED" \
    "bulk_update_leads"

test_function "Bulk Delete Leads" \
    "Delete all unqualified leads that haven't been contacted in 90 days" \
    "bulk_delete_leads"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   ANALYTICS (New)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Get Dashboard Stats" \
    "Show me my dashboard statistics" \
    "get_dashboard_stats"

test_function "Get Lead Analytics" \
    "Show me lead analytics for this month" \
    "get_lead_analytics"

test_function "Get Conversion Funnel" \
    "Show me the conversion funnel data" \
    "get_conversion_funnel"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   CAMPAIGN MANAGEMENT (New)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Create Campaign" \
    "Create an email campaign called 'Spring Sale' about our new listings" \
    "create_campaign"

test_function "Update Campaign" \
    "Update the Spring Sale campaign subject to 'Limited Time Spring Sale'" \
    "update_campaign"

test_function "Pause Campaign" \
    "Pause the Spring Sale campaign" \
    "pause_campaign"

test_function "Get Campaign Analytics" \
    "Show me analytics for the Spring Sale campaign" \
    "get_campaign_analytics"

test_function "Duplicate Campaign" \
    "Duplicate the Spring Sale campaign as 'Summer Sale'" \
    "duplicate_campaign"

test_function "Archive Campaign" \
    "Archive the Spring Sale campaign" \
    "archive_campaign"

test_function "Send Campaign" \
    "Send the Summer Sale campaign now" \
    "send_campaign"

test_function "Delete Campaign" \
    "Delete the Summer Sale campaign" \
    "delete_campaign"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   WORKFLOW AUTOMATION (New)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Create Workflow" \
    "Create a workflow that sends welcome email when a new lead is created" \
    "create_workflow"

test_function "Update Workflow" \
    "Update the welcome workflow to also send SMS" \
    "update_workflow"

test_function "Toggle Workflow" \
    "Disable the welcome workflow" \
    "toggle_workflow"

test_function "Trigger Workflow" \
    "Manually trigger the welcome workflow for John Doe" \
    "trigger_workflow"

test_function "Delete Workflow" \
    "Delete the welcome workflow" \
    "delete_workflow"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   INTEGRATION MANAGEMENT (New)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Connect Integration" \
    "Connect Twilio integration with API key ABC123" \
    "connect_integration"

test_function "Sync Integration" \
    "Sync data with Twilio" \
    "sync_integration"

test_function "Disconnect Integration" \
    "Disconnect Twilio integration" \
    "disconnect_integration"

# Final Results
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   TEST RESULTS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

PASS_RATE=$((PASSED * 100 / TOTAL))

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! (100%)${NC}"
    echo -e "${GREEN}✨ The AI chatbot is fully functional!${NC}"
    exit 0
elif [ $PASS_RATE -ge 80 ]; then
    echo -e "${YELLOW}⚠️  Most tests passed ($PASS_RATE%)${NC}"
    echo -e "${YELLOW}Some functions need attention${NC}"
    exit 1
else
    echo -e "${RED}❌ Many tests failed ($PASS_RATE%)${NC}"
    echo -e "${RED}Significant issues detected${NC}"
    exit 1
fi
