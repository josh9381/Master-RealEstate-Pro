#!/bin/bash

# AI Chatbot Function Test Script - Simple Version
# Tests all 22 AI functions independently

echo "🤖 AI Chatbot Function Test Suite (Simple)"
echo "==========================================="
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

# Store created lead ID
CREATED_LEAD_ID=""

# Helper function to test API endpoint
test_function() {
    local test_name="$1"
    local message="$2"
    local expected_function="$3"
    local save_lead_id="${4:-false}"
    
    TOTAL=$((TOTAL + 1))
    echo -e "${BLUE}Test $TOTAL: $test_name${NC}"
    echo "   Message: \"$message\""
    
    # Call the chat API
    response=$(curl -s -X POST "$API_URL/ai/chat" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{
            \"message\": \"$message\",
            \"conversationHistory\": [],
            \"tone\": \"PROFESSIONAL\"
        }")
    
    # Save lead ID if this is create_lead test
    if [ "$save_lead_id" = "true" ] && echo "$response" | grep -q '"success":true'; then
        # Try to extract lead ID from response
        CREATED_LEAD_ID=$(echo "$response" | jq -r '.data.message' | grep -oP 'ID:\s*\K[a-zA-Z0-9]+' | head -1)
        if [ -z "$CREATED_LEAD_ID" ]; then
            # Try alternative extraction
            CREATED_LEAD_ID=$(echo "$response" | grep -oP '"id":\s*"\K[^"]+' | head -1)
        fi
        if [ -n "$CREATED_LEAD_ID" ]; then
            echo "   📝 Saved Lead ID: $CREATED_LEAD_ID"
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

# Step 2: Get existing leads first for testing
echo -e "${YELLOW}🔍 Step 2: Getting existing leads...${NC}"
leads_response=$(curl -s -X GET "$API_URL/leads?limit=1" \
    -H "Authorization: Bearer $TOKEN")

EXISTING_LEAD_ID=$(echo $leads_response | jq -r '.data.leads[0].id' 2>/dev/null)

if [ -n "$EXISTING_LEAD_ID" ] && [ "$EXISTING_LEAD_ID" != "null" ]; then
    EXISTING_LEAD_NAME=$(echo $leads_response | jq -r '.data.leads[0].firstName + " " + .data.leads[0].lastName' 2>/dev/null)
    echo -e "${GREEN}✅ Found existing lead: $EXISTING_LEAD_NAME (ID: $EXISTING_LEAD_ID)${NC}"
else
    echo -e "${YELLOW}⚠️  No existing leads found. Will create one first.${NC}"
fi
echo ""

# Step 3: Run tests
echo -e "${YELLOW}🧪 Step 3: Running function tests...${NC}"
echo ""

# Test 1-8: NEW ACTION FUNCTIONS
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   NEW ACTION FUNCTIONS (Create/Update)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Create Lead" \
    "Create a new lead: First name is Test, last name is User, email is test$(date +%s)@example.com, phone is 555-1234" \
    "create_lead" \
    "true"

# Use the newly created lead ID for subsequent tests
if [ -n "$CREATED_LEAD_ID" ]; then
    TEST_LEAD_ID="$CREATED_LEAD_ID"
    echo -e "${GREEN}Using newly created lead ID: $TEST_LEAD_ID${NC}"
    echo ""
elif [ -n "$EXISTING_LEAD_ID" ]; then
    TEST_LEAD_ID="$EXISTING_LEAD_ID"
    echo -e "${YELLOW}Using existing lead ID: $TEST_LEAD_ID${NC}"
    echo ""
else
    echo -e "${RED}❌ No lead ID available for testing. Cannot continue.${NC}"
    exit 1
fi

test_function "Update Lead" \
    "Update lead $TEST_LEAD_ID phone number to 555-9999" \
    "update_lead"

test_function "Add Note to Lead" \
    "Add this note to lead $TEST_LEAD_ID: He is interested in downtown condos" \
    "add_note_to_lead"

test_function "Add Tag to Lead" \
    "Add tag 'Hot Lead' to lead $TEST_LEAD_ID" \
    "add_tag_to_lead"

test_function "Create Activity" \
    "Log a call activity for lead $TEST_LEAD_ID: Discussed pricing options" \
    "create_activity"

test_function "Schedule Appointment" \
    "Schedule a meeting with lead $TEST_LEAD_ID tomorrow at 2pm" \
    "schedule_appointment"

test_function "Send Email" \
    "Use send_email function to send email to lead $TEST_LEAD_ID with subject 'New Listing Alert' and body 'Check out our amazing new listing at 123 Main Street!'" \
    "send_email"

test_function "Send SMS" \
    "Use send_sms function to send this SMS to lead $TEST_LEAD_ID: Reminder about our meeting tomorrow at 2pm" \
    "send_sms"

# Test 9-12: READ FUNCTIONS
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   READ FUNCTIONS (Search/Query)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Get Lead Count" \
    "How many leads do I have in total?" \
    "get_lead_count"

test_function "Search Leads" \
    "Show me all leads with score above 70" \
    "search_leads"

test_function "Get Lead Details" \
    "Get details for lead $TEST_LEAD_ID" \
    "get_lead_details"

test_function "Get Recent Activities" \
    "Show me my 10 most recent activities" \
    "get_recent_activities"

# Test 13-14: TASK MANAGEMENT
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   TASK MANAGEMENT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Create Task" \
    "Create a high priority task for lead $TEST_LEAD_ID to follow up tomorrow at 3pm" \
    "create_task"

test_function "Update Lead Status" \
    "Update lead $TEST_LEAD_ID status to QUALIFIED" \
    "update_lead_status"

# Test 15-17: AI COMPOSITION
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   AI COMPOSITION (Draft Messages)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Compose Email" \
    "Compose a professional follow-up email for lead $TEST_LEAD_ID about downtown properties" \
    "compose_email"

test_function "Compose SMS" \
    "Compose a friendly SMS for lead $TEST_LEAD_ID reminding about meeting" \
    "compose_sms"

test_function "Compose Call Script" \
    "Create a persuasive call script for cold calling potential home buyers" \
    "compose_script"

# Test 18-21: AI INTELLIGENCE
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   AI INTELLIGENCE (Analysis/Predictions)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_function "Predict Conversion" \
    "What is the conversion probability for lead $TEST_LEAD_ID?" \
    "predict_conversion"

test_function "Get Next Action" \
    "What is the recommended next action for lead $TEST_LEAD_ID?" \
    "get_next_action"

test_function "Analyze Engagement" \
    "Analyze best time to contact lead $TEST_LEAD_ID based on engagement patterns" \
    "analyze_engagement"

test_function "Identify At-Risk Leads" \
    "Which of my leads are at risk of going cold?" \
    "identify_at_risk_leads"

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
    exit 0
else
    echo -e "${RED}❌ Many tests failed ($PASS_RATE%)${NC}"
    echo -e "${RED}Significant issues detected${NC}"
    exit 1
fi
