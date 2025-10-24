#!/bin/bash

BASE_URL="http://localhost:8000/api"
TOKEN=""

echo "🧪 Testing Lead Management Endpoints"
echo "======================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Login to get token
echo -e "\n${BLUE}1. Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.tokens.accessToken')

if [ "$TOKEN" != "null" ] && [ ! -z "$TOKEN" ]; then
  echo -e "${GREEN}✓ Login successful${NC}"
else
  echo -e "${RED}✗ Login failed${NC}"
  echo $LOGIN_RESPONSE | jq
  exit 1
fi

# Step 2: Create a lead
echo -e "\n${BLUE}2. Creating a new lead...${NC}"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "company": "Acme Corp",
    "position": "CEO",
    "source": "website",
    "value": 50000,
    "status": "NEW"
  }')

LEAD_ID=$(echo $CREATE_RESPONSE | jq -r '.data.lead.id')

if [ "$LEAD_ID" != "null" ] && [ ! -z "$LEAD_ID" ]; then
  echo -e "${GREEN}✓ Lead created: $LEAD_ID${NC}"
  echo $CREATE_RESPONSE | jq '.data.lead | {id, name, email, status, value}'
else
  echo -e "${RED}✗ Lead creation failed${NC}"
  echo $CREATE_RESPONSE | jq
  exit 1
fi

# Step 3: Get all leads
echo -e "\n${BLUE}3. Getting all leads...${NC}"
LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/leads?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

LEAD_COUNT=$(echo $LIST_RESPONSE | jq '.data.pagination.total')
echo -e "${GREEN}✓ Found $LEAD_COUNT lead(s)${NC}"
echo $LIST_RESPONSE | jq '.data.pagination'

# Step 4: Get single lead by ID
echo -e "\n${BLUE}4. Getting lead by ID...${NC}"
GET_RESPONSE=$(curl -s -X GET "$BASE_URL/leads/$LEAD_ID" \
  -H "Authorization: Bearer $TOKEN")

RETRIEVED_NAME=$(echo $GET_RESPONSE | jq -r '.data.lead.name')
if [ "$RETRIEVED_NAME" == "John Doe" ]; then
  echo -e "${GREEN}✓ Lead retrieved successfully${NC}"
  echo $GET_RESPONSE | jq '.data.lead | {id, name, email, status, company}'
else
  echo -e "${RED}✗ Lead retrieval failed${NC}"
fi

# Step 5: Update lead
echo -e "\n${BLUE}5. Updating lead status to CONTACTED...${NC}"
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/leads/$LEAD_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "CONTACTED",
    "score": 75
  }')

UPDATED_STATUS=$(echo $UPDATE_RESPONSE | jq -r '.data.lead.status')
if [ "$UPDATED_STATUS" == "CONTACTED" ]; then
  echo -e "${GREEN}✓ Lead updated successfully${NC}"
  echo $UPDATE_RESPONSE | jq '.data.lead | {id, name, status, score}'
else
  echo -e "${RED}✗ Lead update failed${NC}"
fi

# Step 6: Create another lead
echo -e "\n${BLUE}6. Creating another lead...${NC}"
CREATE_RESPONSE_2=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "phone": "+1987654321",
    "company": "Tech Inc",
    "status": "QUALIFIED",
    "value": 75000
  }')

LEAD_ID_2=$(echo $CREATE_RESPONSE_2 | jq -r '.data.lead.id')
echo -e "${GREEN}✓ Second lead created: $LEAD_ID_2${NC}"

# Step 7: Filter leads by status
echo -e "\n${BLUE}7. Filtering leads by status=CONTACTED...${NC}"
FILTER_RESPONSE=$(curl -s -X GET "$BASE_URL/leads?status=CONTACTED" \
  -H "Authorization: Bearer $TOKEN")

FILTERED_COUNT=$(echo $FILTER_RESPONSE | jq '.data.pagination.total')
echo -e "${GREEN}✓ Found $FILTERED_COUNT CONTACTED lead(s)${NC}"

# Step 8: Search leads
echo -e "\n${BLUE}8. Searching for 'Jane'...${NC}"
SEARCH_RESPONSE=$(curl -s -X GET "$BASE_URL/leads?search=Jane" \
  -H "Authorization: Bearer $TOKEN")

SEARCH_COUNT=$(echo $SEARCH_RESPONSE | jq '.data.pagination.total')
echo -e "${GREEN}✓ Found $SEARCH_COUNT lead(s) matching 'Jane'${NC}"

# Step 9: Get lead stats
echo -e "\n${BLUE}9. Getting lead statistics...${NC}"
STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/leads/stats" \
  -H "Authorization: Bearer $TOKEN")

echo -e "${GREEN}✓ Lead statistics:${NC}"
echo $STATS_RESPONSE | jq '.data.stats'

# Step 10: Bulk update leads
echo -e "\n${BLUE}10. Bulk updating leads to QUALIFIED...${NC}"
BULK_UPDATE_RESPONSE=$(curl -s -X POST "$BASE_URL/leads/bulk-update" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"leadIds\": [\"$LEAD_ID\", \"$LEAD_ID_2\"],
    \"updates\": {
      \"status\": \"QUALIFIED\"
    }
  }")

UPDATED_COUNT=$(echo $BULK_UPDATE_RESPONSE | jq '.data.updatedCount')
echo -e "${GREEN}✓ Bulk updated $UPDATED_COUNT lead(s)${NC}"

# Step 11: Delete first lead
echo -e "\n${BLUE}11. Deleting first lead...${NC}"
DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/leads/$LEAD_ID" \
  -H "Authorization: Bearer $TOKEN")

DELETE_SUCCESS=$(echo $DELETE_RESPONSE | jq -r '.success')
if [ "$DELETE_SUCCESS" == "true" ]; then
  echo -e "${GREEN}✓ Lead deleted successfully${NC}"
else
  echo -e "${RED}✗ Lead deletion failed${NC}"
fi

# Step 12: Bulk delete remaining leads
echo -e "\n${BLUE}12. Bulk deleting remaining leads...${NC}"
BULK_DELETE_RESPONSE=$(curl -s -X POST "$BASE_URL/leads/bulk-delete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"leadIds\": [\"$LEAD_ID_2\"]
  }")

DELETED_COUNT=$(echo $BULK_DELETE_RESPONSE | jq '.data.deletedCount')
echo -e "${GREEN}✓ Bulk deleted $DELETED_COUNT lead(s)${NC}"

# Final summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✅ All Lead Management tests passed!${NC}"
echo -e "${BLUE}========================================${NC}"
