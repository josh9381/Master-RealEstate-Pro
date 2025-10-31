#!/bin/bash

# Quick debug script to test lead creation and update

BASE_URL="http://localhost:8000/api"

# Login
echo "=== Logging in ==="
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trigger-test-1761870263@test.com",
    "password": "Password123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:20}..."

# Create a lead
echo ""
echo "=== Creating lead ==="
TIMESTAMP=$(date +%s)
LEAD_RESPONSE=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Debug Lead\",
    \"email\": \"debug-$TIMESTAMP@test.com\",
    \"status\": \"NEW\"
  }")

echo "Full response:"
echo $LEAD_RESPONSE | jq '.'

# Extract ID properly
LEAD_ID=$(echo $LEAD_RESPONSE | jq -r '.data.lead.id')
echo ""
echo "Extracted Lead ID: $LEAD_ID"

# Try to update the lead
echo ""
echo "=== Updating lead to HOT ==="
UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/leads/$LEAD_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "HOT"
  }')

echo "Update response:"
echo $UPDATE_RESPONSE | jq '.'
