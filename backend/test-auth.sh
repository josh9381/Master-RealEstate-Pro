#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8000"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Testing Authentication Endpoints${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Test 1: Register a new user
echo -e "${GREEN}1. Testing POST /api/auth/register${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "johndoe@example.com",
    "password": "password123"
  }')

echo "$REGISTER_RESPONSE" | jq .
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.tokens.accessToken')
REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.tokens.refreshToken')
echo ""

# Test 2: Try to register with same email (should fail)
echo -e "${GREEN}2. Testing duplicate email registration (should fail)${NC}"
curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "johndoe@example.com",
    "password": "password456"
  }' | jq .
echo ""

# Test 3: Login with the existing seeded user
echo -e "${GREEN}3. Testing POST /api/auth/login (with seeded user)${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@realestate.com",
    "password": "admin123"
  }')

echo "$LOGIN_RESPONSE" | jq .
ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken')
echo ""

# Test 4: Login with wrong password (should fail)
echo -e "${GREEN}4. Testing login with wrong password (should fail)${NC}"
curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@realestate.com",
    "password": "wrongpassword"
  }' | jq .
echo ""

# Test 5: Get current user info (protected route)
echo -e "${GREEN}5. Testing GET /api/auth/me (protected)${NC}"
curl -s -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
echo ""

# Test 6: Try to access protected route without token (should fail)
echo -e "${GREEN}6. Testing GET /api/auth/me without token (should fail)${NC}"
curl -s -X GET "$BASE_URL/api/auth/me" | jq .
echo ""

# Test 7: Refresh token
echo -e "${GREEN}7. Testing POST /api/auth/refresh${NC}"
curl -s -X POST "$BASE_URL/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }" | jq .
echo ""

# Test 8: Test validation errors
echo -e "${GREEN}8. Testing validation errors (invalid email)${NC}"
curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid User",
    "email": "not-an-email",
    "password": "pass"
  }' | jq .
echo ""

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}All tests completed!${NC}"
echo -e "${BLUE}================================${NC}"
