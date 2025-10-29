#!/bin/bash

# Test script for new Communication & Workflow endpoints

BASE_URL="http://localhost:8000"
TOKEN=""

echo "🧪 Testing Communication & Workflow Endpoints"
echo "=============================================="
echo ""

# First, login to get a token
echo "📝 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@realestate.com","password":"test123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Creating test user..."
  
  REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"firstName":"Test","lastName":"User","email":"test@realestate.com","password":"test123"}')
  
  TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken // empty')
  
  if [ -z "$TOKEN" ]; then
    echo "❌ Failed to create user. Exiting."
    exit 1
  fi
fi

echo "✅ Logged in successfully"
echo ""

# Test Email Templates
echo "📧 Testing Email Templates..."
echo "-----------------------------"

# Create email template
echo "Creating email template..."
EMAIL_TEMPLATE=$(curl -s -X POST "${BASE_URL}/api/templates/email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Welcome Email",
    "subject": "Welcome to our platform!",
    "body": "Hello {{name}}, welcome to our real estate platform!",
    "category": "onboarding"
  }')

TEMPLATE_ID=$(echo $EMAIL_TEMPLATE | jq -r '.id // empty')

if [ -n "$TEMPLATE_ID" ]; then
  echo "✅ Email template created: $TEMPLATE_ID"
else
  echo "❌ Failed to create email template"
  echo "$EMAIL_TEMPLATE"
fi

# Get all email templates
echo "Getting all email templates..."
EMAIL_TEMPLATES=$(curl -s -X GET "${BASE_URL}/api/templates/email" \
  -H "Authorization: Bearer ${TOKEN}")

TEMPLATE_COUNT=$(echo $EMAIL_TEMPLATES | jq -r '.total // 0')
echo "✅ Found $TEMPLATE_COUNT email template(s)"
echo ""

# Test SMS Templates
echo "📱 Testing SMS Templates..."
echo "-----------------------------"

# Create SMS template
echo "Creating SMS template..."
SMS_TEMPLATE=$(curl -s -X POST "${BASE_URL}/api/templates/sms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Appointment Reminder",
    "body": "Hi {{name}}, reminder: Your appointment is tomorrow at {{time}}",
    "category": "reminder"
  }')

SMS_TEMPLATE_ID=$(echo $SMS_TEMPLATE | jq -r '.id // empty')

if [ -n "$SMS_TEMPLATE_ID" ]; then
  echo "✅ SMS template created: $SMS_TEMPLATE_ID"
else
  echo "❌ Failed to create SMS template"
fi

# Get all SMS templates
echo "Getting all SMS templates..."
SMS_TEMPLATES=$(curl -s -X GET "${BASE_URL}/api/templates/sms" \
  -H "Authorization: Bearer ${TOKEN}")

SMS_COUNT=$(echo $SMS_TEMPLATES | jq -r '.total // 0')
echo "✅ Found $SMS_COUNT SMS template(s)"
echo ""

# Test Messages
echo "💬 Testing Messages..."
echo "-----------------------------"

# Send email
echo "Sending email..."
EMAIL_MESSAGE=$(curl -s -X POST "${BASE_URL}/api/messages/email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "to": "customer@example.com",
    "subject": "Test Email",
    "body": "This is a test email from the API"
  }')

EMAIL_MSG_ID=$(echo $EMAIL_MESSAGE | jq -r '.message.id // empty')

if [ -n "$EMAIL_MSG_ID" ]; then
  echo "✅ Email sent: $EMAIL_MSG_ID"
else
  echo "❌ Failed to send email"
fi

# Send SMS
echo "Sending SMS..."
SMS_MESSAGE=$(curl -s -X POST "${BASE_URL}/api/messages/sms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "to": "+1234567890",
    "body": "Test SMS message"
  }')

SMS_MSG_ID=$(echo $SMS_MESSAGE | jq -r '.message.id // empty')

if [ -n "$SMS_MSG_ID" ]; then
  echo "✅ SMS sent: $SMS_MSG_ID"
else
  echo "❌ Failed to send SMS"
fi

# Get all messages
echo "Getting all messages..."
MESSAGES=$(curl -s -X GET "${BASE_URL}/api/messages" \
  -H "Authorization: Bearer ${TOKEN}")

MSG_COUNT=$(echo $MESSAGES | jq -r '.pagination.total // 0')
echo "✅ Found $MSG_COUNT message(s)"
echo ""

# Test Workflows
echo "⚙️  Testing Workflows..."
echo "-----------------------------"

# Create workflow
echo "Creating workflow..."
WORKFLOW=$(curl -s -X POST "${BASE_URL}/api/workflows" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "New Lead Auto-Email",
    "description": "Send welcome email to new leads",
    "triggerType": "LEAD_CREATED",
    "actions": [
      {
        "type": "send_email",
        "templateId": "welcome_email",
        "delay": 0
      }
    ]
  }')

WORKFLOW_ID=$(echo $WORKFLOW | jq -r '.id // empty')

if [ -n "$WORKFLOW_ID" ]; then
  echo "✅ Workflow created: $WORKFLOW_ID"
else
  echo "❌ Failed to create workflow"
  echo "$WORKFLOW"
fi

# Get all workflows
echo "Getting all workflows..."
WORKFLOWS=$(curl -s -X GET "${BASE_URL}/api/workflows" \
  -H "Authorization: Bearer ${TOKEN}")

WORKFLOW_COUNT=$(echo $WORKFLOWS | jq -r '.total // 0')
echo "✅ Found $WORKFLOW_COUNT workflow(s)"

# Toggle workflow
if [ -n "$WORKFLOW_ID" ]; then
  echo "Toggling workflow to active..."
  TOGGLE_RESULT=$(curl -s -X PATCH "${BASE_URL}/api/workflows/${WORKFLOW_ID}/toggle" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{"isActive": true}')
  
  IS_ACTIVE=$(echo $TOGGLE_RESULT | jq -r '.workflow.isActive // empty')
  
  if [ "$IS_ACTIVE" = "true" ]; then
    echo "✅ Workflow activated"
  else
    echo "❌ Failed to activate workflow"
  fi
fi

echo ""
echo "=============================================="
echo "✅ All tests completed!"
echo ""
echo "📊 Summary:"
echo "  - Email Templates: $TEMPLATE_COUNT"
echo "  - SMS Templates: $SMS_COUNT"
echo "  - Messages: $MSG_COUNT"
echo "  - Workflows: $WORKFLOW_COUNT"
