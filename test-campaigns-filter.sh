#!/bin/bash

API_URL="https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev"

echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken // .data.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Logged in"
echo ""

echo "📊 Fetching campaigns..."
CAMPAIGNS=$(curl -s "$API_URL/api/campaigns" \
  -H "Authorization: Bearer $TOKEN")

echo "All campaigns count: $(echo "$CAMPAIGNS" | jq '.data.campaigns | length')"
echo ""

echo "Campaigns by status:"
echo "  ACTIVE: $(echo "$CAMPAIGNS" | jq '[.data.campaigns[] | select(.status=="ACTIVE")] | length')"
echo "  SCHEDULED: $(echo "$CAMPAIGNS" | jq '[.data.campaigns[] | select(.status=="SCHEDULED")] | length')"
echo "  PAUSED: $(echo "$CAMPAIGNS" | jq '[.data.campaigns[] | select(.status=="PAUSED")] | length')"
echo "  COMPLETED: $(echo "$CAMPAIGNS" | jq '[.data.campaigns[] | select(.status=="COMPLETED")] | length')"
echo "  DRAFT: $(echo "$CAMPAIGNS" | jq '[.data.campaigns[] | select(.status=="DRAFT")] | length')"
echo ""

echo "Sample campaigns:"
echo "$CAMPAIGNS" | jq -c '.data.campaigns[0:3] | .[] | {name, status, type}'

