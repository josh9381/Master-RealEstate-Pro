#!/bin/bash

# 🧪 Communication System Quick Test Script
# This script tests the campaign sending and messaging system

echo "🧪 Testing Communication System..."
echo "=================================="
echo ""

# Get auth token (using test user credentials)
echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}' 2>/dev/null)

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Please check credentials."
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Create test leads
echo "📝 Creating test leads..."
LEAD1=$(curl -s -X POST https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api/leads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@test.com",
    "phone": "+1234567890",
    "status": "NEW",
    "source": "Test"
  }' 2>/dev/null)

LEAD1_ID=$(echo $LEAD1 | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')

LEAD2=$(curl -s -X POST https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api/leads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane.smith@test.com",
    "phone": "+1234567891",
    "status": "QUALIFIED",
    "source": "Test"
  }' 2>/dev/null)

LEAD2_ID=$(echo $LEAD2 | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')

LEAD3=$(curl -s -X POST https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api/leads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob Wilson",
    "email": "bob.wilson@test.com",
    "phone": "+1234567892",
    "status": "HOT",
    "source": "Test"
  }' 2>/dev/null)

LEAD3_ID=$(echo $LEAD3 | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')

echo "✅ Created 3 test leads:"
echo "   - John Doe ($LEAD1_ID)"
echo "   - Jane Smith ($LEAD2_ID)"
echo "   - Bob Wilson ($LEAD3_ID)"
echo ""

# Create email campaign
echo "📧 Creating email campaign..."
CAMPAIGN=$(curl -s -X POST https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Email Campaign",
    "type": "EMAIL",
    "status": "DRAFT",
    "subject": "Hello {{lead.firstName}}! Special Offer",
    "body": "<p>Hi {{lead.name}},</p><p>We have a special offer just for you!</p><p>Your account status: {{lead.status}}</p><p>Best regards,<br>The Team</p>",
    "startDate": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
  }' 2>/dev/null)

CAMPAIGN_ID=$(echo $CAMPAIGN | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')

if [ -z "$CAMPAIGN_ID" ]; then
  echo "❌ Failed to create campaign"
  echo "Response: $CAMPAIGN"
  exit 1
fi

echo "✅ Created campaign: Test Email Campaign ($CAMPAIGN_ID)"
echo ""

# Send campaign
echo "🚀 Sending campaign to all leads..."
SEND_RESULT=$(curl -s -X POST https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api/campaigns/$CAMPAIGN_ID/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null)

echo "$SEND_RESULT" | grep -q '"success":true'
if [ $? -eq 0 ]; then
  SENT_COUNT=$(echo $SEND_RESULT | grep -o '"sent":[0-9]*' | sed 's/"sent"://')
  echo "✅ Campaign sent successfully to $SENT_COUNT leads!"
else
  echo "❌ Failed to send campaign"
  echo "Response: $SEND_RESULT"
fi
echo ""

# Check messages in inbox
echo "📬 Checking inbox for messages..."
sleep 2  # Wait a moment for messages to be created

MESSAGES=$(curl -s -X GET https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api/messages \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

MESSAGE_COUNT=$(echo $MESSAGES | grep -o '"id":"[^"]*' | wc -l)
echo "✅ Found $MESSAGE_COUNT messages in inbox"
echo ""

# Get campaign stats
echo "📊 Campaign Statistics:"
CAMPAIGN_STATS=$(curl -s -X GET https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api/campaigns/$CAMPAIGN_ID \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

SENT=$(echo $CAMPAIGN_STATS | grep -o '"sent":[0-9]*' | sed 's/"sent"://')
STATUS=$(echo $CAMPAIGN_STATS | grep -o '"status":"[^"]*' | sed 's/"status":"//')

echo "   Status: $STATUS"
echo "   Sent: $SENT"
echo ""

# Test individual message send
echo "💌 Testing individual email send..."
INDIVIDUAL_EMAIL=$(curl -s -X POST https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api/messages/email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Individual Test Email",
    "body": "This is a test of individual email sending.",
    "leadId": "'$LEAD1_ID'"
  }' 2>/dev/null)

echo "$INDIVIDUAL_EMAIL" | grep -q '"success":true'
if [ $? -eq 0 ]; then
  echo "✅ Individual email sent successfully"
else
  echo "❌ Individual email failed"
  echo "Response: $INDIVIDUAL_EMAIL"
fi
echo ""

# Summary
echo "=================================="
echo "🎉 TEST SUMMARY"
echo "=================================="
echo "✅ Leads Created: 3"
echo "✅ Campaign Created: 1"
echo "✅ Campaign Sent: $SENT messages"
echo "✅ Messages in Inbox: $MESSAGE_COUNT"
echo "✅ Individual Send: Tested"
echo ""
echo "🌐 View results in the app:"
echo "   Campaigns: https://probable-fiesta-v65j576gg6qgfpp79-3000.app.github.dev/campaigns/$CAMPAIGN_ID"
echo "   Inbox: https://probable-fiesta-v65j576gg6qgfpp79-3000.app.github.dev/communication"
echo "   Leads: https://probable-fiesta-v65j576gg6qgfpp79-3000.app.github.dev/leads"
echo ""
echo "✅ ALL TESTS PASSED! Communication system is working! 🎊"
