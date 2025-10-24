#!/bin/bash

echo "Testing all endpoints..."
echo ""

# Wait for server to be ready
sleep 2

echo "1. Health Check:"
curl -s http://localhost:8000/health
echo -e "\n"

echo "2. Register New User:"
REGISTER_RESP=$(curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john'$(date +%s)'@example.com","password":"password123"}')
echo "$REGISTER_RESP"
ACCESS_TOKEN=$(echo "$REGISTER_RESP" | jq -r '.data.tokens.accessToken')
echo -e "\n"

echo "3. Login with Seeded User:"
LOGIN_RESP=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@realestate.com","password":"admin123"}')
echo "$LOGIN_RESP"
ADMIN_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.data.tokens.accessToken')
echo -e "\n"

echo "4. Get Current User (Protected Route):"
curl -s -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo -e "\n"

echo "5. Try Protected Route Without Token (Should Fail):"
curl -s -X GET http://localhost:8000/api/auth/me
echo -e "\n"

echo -e "\n✅ All tests complete!"
