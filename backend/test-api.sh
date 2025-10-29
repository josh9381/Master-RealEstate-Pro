#!/bin/bash

echo "=== Testing Backend API ==="
echo ""

# Test 1: Health Check
echo "1. Health Check:"
curl -s http://localhost:8000/health | python3 -m json.tool
echo ""

# Test 2: Login
echo "2. Login Test:"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@realestate.com","password":"test123"}')
echo "$LOGIN_RESPONSE" | python3 -m json.tool | head -20
TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['tokens']['accessToken'])")
echo ""

# Test 3: Get Leads
echo "3. Get Leads (first 3):"
curl -s "http://localhost:8000/api/leads?page=1&limit=3" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
echo ""

# Test 4: Dashboard Stats
echo "4. Dashboard Stats:"
curl -s "http://localhost:8000/api/analytics/dashboard" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -30
echo ""

echo "=== API Tests Complete ==="
