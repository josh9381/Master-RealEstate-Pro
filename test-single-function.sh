#!/bin/bash

API_URL="http://localhost:8000/api"

# Login
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@realestate.com",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken // .token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to login"
  exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Test update_task function
echo "Testing update_task function..."
RESPONSE=$(curl -s -X POST "$API_URL/ai/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "Update task priority to HIGH",
    "conversationHistory": []
  }')

echo "Response:"
echo $RESPONSE | jq '.'
echo ""
echo "Function called:"
echo $RESPONSE | jq -r '.data.functionCall.name // "NONE"'
