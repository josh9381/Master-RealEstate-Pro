# 🧪 Multi-Tenancy Testing Guide

## Quick Test Commands

### 1. Seed the Database
```bash
cd /workspaces/Master-RealEstate-Pro/backend
npx prisma db seed
```

**Expected Output:**
```
✅ Created Josh's organization: Josh Real Estate Agency
✅ Created Josh user: josh@realestate.com
✅ Created Arshia's organization: Arshia Property Group
✅ Created Arshia user: arshia@properties.com
✅ Created Josh's tags: 3
✅ Created Josh's leads: 3
✅ Created Arshia's tags: 3
✅ Created Arshia's leads: 3
🔒 DATA ISOLATION: Josh and Arshia have completely separate data!
```

---

## 2. Manual API Testing

### Login as Josh
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "josh@realestate.com",
    "password": "josh123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "email": "josh@realestate.com",
      "organizationId": "...",
      "organization": {
        "name": "Josh Real Estate Agency"
      }
    }
  }
}
```

### Login as Arshia
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "arshia@properties.com",
    "password": "arshia123"
  }'
```

---

## 3. Test Data Isolation

### Get Josh's Leads (should return 3)
```bash
curl http://localhost:3000/api/leads \
  -H "Authorization: Bearer <JOSH_TOKEN>"
```

**Expected:**
- Total: 3
- Names: John Smith, Sarah Johnson, Mike Wilson

### Get Arshia's Leads (should return 3)
```bash
curl http://localhost:3000/api/leads \
  -H "Authorization: Bearer <ARSHIA_TOKEN>"
```

**Expected:**
- Total: 3  
- Names: Emily Davis, Robert Chen, Lisa Anderson

### Try Cross-Tenant Access (should fail)
```bash
# Get one of Arshia's lead IDs first
ARSHIA_LEAD_ID="<from previous call>"

# Try to access it as Josh
curl http://localhost:3000/api/leads/$ARSHIA_LEAD_ID \
  -H "Authorization: Bearer <JOSH_TOKEN>"
```

**Expected:**
```json
{
  "success": false,
  "error": {
    "message": "Lead not found"
  }
}
```

---

## 4. Test Email Uniqueness

### Create Same Email in Different Orgs (should work)
```bash
# Josh creates a lead with email that exists in Arshia's org
curl -X POST http://localhost:3000/api/leads \
  -H "Authorization: Bearer <JOSH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Emily",
    "lastName": "Davis",
    "email": "emily.davis@example.com",
    "phone": "+1-555-9999",
    "status": "NEW"
  }'
```

**Expected:** ✅ Success (different organization)

### Create Duplicate Email in Same Org (should fail)
```bash
# Arshia tries to create another lead with existing email
curl -X POST http://localhost:3000/api/leads \
  -H "Authorization: Bearer <ARSHIA_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Another",
    "lastName": "Emily",
    "email": "emily.davis@example.com",
    "phone": "+1-555-8888",
    "status": "NEW"
  }'
```

**Expected:** ❌ Conflict (same organization)

---

## 5. Test Tag Isolation

### Get Josh's Tags
```bash
curl http://localhost:3000/api/tags \
  -H "Authorization: Bearer <JOSH_TOKEN>"
```

**Expected:**
- Total: 3
- Names: Hot Lead, Follow Up, VIP

### Get Arshia's Tags
```bash
curl http://localhost:3000/api/tags \
  -H "Authorization: Bearer <ARSHIA_TOKEN>"
```

**Expected:**
- Total: 3
- Names: Hot Lead, Premium Client, Investor

**Note:** Both have "Hot Lead" but they're different tags!

---

## 6. Run Automated Tests

```bash
cd /workspaces/Master-RealEstate-Pro/backend
npm test -- multi-tenancy.test.ts
```

**Expected Tests:**
- ✅ Josh should only see his own leads (3 leads)
- ✅ Arshia should only see her own leads (3 leads)
- ✅ Josh should NOT be able to access Arshia's lead by ID
- ✅ Arshia should NOT be able to access Josh's lead by ID
- ✅ Josh should NOT be able to update Arshia's lead
- ✅ Arshia should NOT be able to delete Josh's lead
- ✅ Josh should only see his own tags (3 tags)
- ✅ Arshia should only see her own tags (3 tags)
- ✅ Josh can create a tag with the same name as Arshia's tag
- ✅ Josh should NOT be able to access Arshia's tag by ID
- ✅ Josh can create a lead with same email as Arshia's lead (different org)
- ✅ Arshia CANNOT create duplicate email in her own organization
- ✅ Josh's token contains correct organization info
- ✅ Arshia's token contains correct organization info
- ✅ Josh should NOT be able to add Arshia's tag to his lead

---

## 7. Database Verification

### Check Organizations
```bash
cd /workspaces/Master-RealEstate-Pro/backend
npx prisma studio
```

Navigate to `Organization` table:
- Should see "Josh Real Estate Agency"
- Should see "Arshia Property Group"

### Check Users
Navigate to `User` table:
- Josh user with organizationId pointing to Josh's org
- Arshia user with organizationId pointing to Arshia's org

### Check Leads
Navigate to `Lead` table:
- 3 leads with Josh's organizationId
- 3 leads with Arshia's organizationId
- Total: 6 leads (all isolated)

---

## 8. Common Test Scenarios

### Scenario 1: New User Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@test.com",
    "password": "password123",
    "firstName": "New",
    "lastName": "User"
  }'
```

**What Happens:**
1. New organization created automatically
2. User becomes ADMIN of their organization
3. organizationId included in JWT token
4. User can only see their own data

### Scenario 2: Creating a Campaign
```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "Authorization: Bearer <JOSH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Campaign",
    "type": "EMAIL",
    "status": "DRAFT"
  }'
```

**What Happens:**
1. Campaign created with Josh's organizationId
2. Only Josh (and his org members) can see it
3. Arshia will never see this campaign

### Scenario 3: Listing Workflows
```bash
curl http://localhost:3000/api/workflows \
  -H "Authorization: Bearer <ARSHIA_TOKEN>"
```

**What Happens:**
1. Query automatically filtered by Arshia's organizationId
2. Only returns workflows belonging to Arshia's org
3. Josh's workflows completely hidden

---

## 🎯 Success Criteria

Your multi-tenancy is working correctly if:

✅ Each user only sees their own organization's data  
✅ Cross-tenant access returns 404 Not Found  
✅ Same emails can exist in different organizations  
✅ Same tag names can exist in different organizations  
✅ JWT tokens include organizationId  
✅ All database queries filter by organizationId  
✅ Seed creates 2 separate organizations  
✅ Tests pass without errors  

---

## 🐛 Troubleshooting

### Problem: "Lead not found" for my own lead
**Solution:** Check JWT token includes organizationId
```bash
# Decode token at https://jwt.io
# Should see: "organizationId": "..."
```

### Problem: Seeing other organization's data
**Solution:** Check controller filtering
```typescript
// Should have this in every findMany/findFirst:
where: {
  organizationId: req.user!.organizationId,
  ...
}
```

### Problem: Cannot create lead with existing email
**Solution:** Check if email exists in YOUR organization
```bash
# Email uniqueness is per-organization
# Same email OK in different organizations
```

### Problem: Tests failing
**Solution:** Ensure seed data is fresh
```bash
npx prisma db seed
npm test -- multi-tenancy.test.ts
```

---

## 📞 Test Credentials

| Organization | Email | Password | Tier | Leads | Tags |
|-------------|-------|----------|------|-------|------|
| Josh Real Estate Agency | josh@realestate.com | josh123 | ENTERPRISE | 3 | 3 |
| Arshia Property Group | arshia@properties.com | arshia123 | PROFESSIONAL | 3 | 3 |

---

**Happy Testing! 🎉**
