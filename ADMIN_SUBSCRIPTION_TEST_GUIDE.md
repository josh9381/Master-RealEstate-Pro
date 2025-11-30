# Admin & Subscription System Test Guide

## Test Environment
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **Prisma Studio**: http://localhost:5555

## Test Users

### Josh (Organization Admin)
- **Email**: josh@example.com
- **Role**: ADMIN
- **Permissions**: Full access to all features
- **Organization**: Josh's organization (created on signup)

### Arshia (Manager)
- **Email**: arshia@example.com  
- **Role**: MANAGER
- **Permissions**: Limited admin access (can manage users, view stats, but cannot change subscription)
- **Organization**: Same as Josh

### Test User (Regular User)
- **Email**: test@example.com
- **Role**: USER
- **Permissions**: No admin access
- **Organization**: Same as Josh

## Test Scenarios

### 1. Admin Access Control

#### Test 1A: Josh (ADMIN) Full Access
1. Login as josh@example.com
2. Verify sidebar shows "Administration" section with:
   - ✅ Admin Panel
   - ✅ Subscription (with tier badge)
3. Navigate to `/admin` - should load successfully
4. Verify can see:
   - Organization stats (users, leads, campaigns, workflows)
   - Team member list with roles
   - Activity logs
5. Navigate to `/admin/subscription` - should load successfully
6. Verify can see all plan options and "Change Plan" buttons

#### Test 1B: Arshia (MANAGER) Limited Access  
1. Login as arshia@example.com
2. Verify sidebar shows "Administration" section
3. Navigate to `/admin` - should load successfully
4. Verify can see stats and team members
5. Navigate to `/admin/subscription` - should redirect or show read-only view
6. Verify CANNOT change subscription plan

#### Test 1C: Test User (USER) No Access
1. Login as test@example.com
2. Verify sidebar does NOT show "Administration" section
3. Try navigating to `/admin` directly - should redirect to dashboard
4. Try navigating to `/admin/subscription` - should redirect to dashboard

### 2. Subscription Management

#### Test 2A: View Current Subscription
1. Login as Josh (admin)
2. Navigate to Billing (`/billing`)
3. Verify shows:
   - ✅ Current plan tier (e.g., "FREE Plan")
   - ✅ Usage meters for:
     - Users: X / 1 (FREE tier)
     - Leads: X / 100 (FREE tier)
     - Campaigns: X / unlimited
     - Workflows: X / unlimited
   - ✅ Color-coded progress bars (green < 75%, yellow 75-99%, red ≥ 100%)
   - ✅ Invoice history

#### Test 2B: Change Subscription Plan
1. Login as Josh (admin)
2. Navigate to Subscription (`/admin/subscription`)
3. Verify shows 4 plan cards:
   - FREE: $0/month, 1 user, 100 leads
   - STARTER: $49/month, 5 users, 1,000 leads
   - PROFESSIONAL: $149/month, 10 users, unlimited leads
   - ENTERPRISE: $499/month, unlimited everything
4. Current plan should have "CURRENT PLAN" badge
5. Click "Upgrade" on STARTER plan
6. Verify confirmation modal appears with:
   - ✅ Current plan → New plan comparison
   - ✅ Price change ($0 → $49/month)
   - ✅ Feature comparison list
   - ✅ "Cancel" and "Confirm Change" buttons
7. Click "Confirm Change"
8. Verify success toast appears
9. Verify plan changes to STARTER in UI

#### Test 2C: Downgrade Warning
1. While on STARTER plan, click "Downgrade" to FREE
2. Verify confirmation modal shows:
   - ⚠️ Warning icon and text about losing features
   - ⚠️ Notice about data that may be affected
   - ✅ Downgrade details
3. Cancel or confirm based on test needs

#### Test 2D: Trial Countdown (if on trial)
1. If organization has `trialEndsAt` in future
2. Verify Subscription page shows:
   - ✅ Trial countdown banner at top
   - ✅ "Trial expires in X days" message
   - ✅ Orange color if < 7 days remaining
   - ✅ Link to upgrade

### 3. Feature Gates & Usage Limits

#### Test 3A: Leads Usage Limit
1. Login as Josh on FREE plan (100 lead limit)
2. Navigate to Leads (`/leads`)
3. Verify header shows:
   - ✅ UsageBadge: "X / 100" with color coding
   - ✅ "Add Lead" button wrapped in FeatureGate
4. If at 100 leads:
   - ✅ "Add Lead" button should be replaced with UpgradePrompt
   - ✅ UpgradePrompt shows message about limit
   - ✅ "Upgrade Plan" button navigates to `/admin/subscription`
5. If under 100 leads:
   - ✅ "Add Lead" button should work normally

#### Test 3B: Campaigns Usage Limit  
1. On FREE plan (unlimited campaigns)
2. Navigate to Campaigns (`/campaigns`)
3. Verify header shows:
   - ✅ UsageBadge: "X / Unlimited"
   - ✅ "Create Campaign" button always enabled
4. On STARTER plan (10 campaign limit)
5. If at 10 campaigns:
   - ✅ Should show UpgradePrompt instead of button

#### Test 3C: Workflows Usage Limit
1. On FREE plan (unlimited workflows)  
2. Navigate to Workflows (`/workflows`)
3. Verify header shows:
   - ✅ UsageBadge: "X / Unlimited"
   - ✅ "Create Workflow" button always enabled
4. On STARTER plan (5 workflow limit)
5. If at 5 workflows:
   - ✅ Should show UpgradePrompt instead of button

#### Test 3D: Users/Team Members Limit
1. On FREE plan (1 user limit)
2. Navigate to Admin Panel (`/admin`)
3. Try to add second user
4. Should be blocked at limit
5. Upgrade to STARTER (5 users)
6. Should be able to add up to 5 users

### 4. API Endpoints Testing

#### Test 4A: Admin Stats Endpoint
```bash
# Get JWT token after login
curl -X GET http://localhost:8000/api/admin/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return:
{
  "stats": {
    "totalUsers": 3,
    "totalLeads": 45,
    "totalCampaigns": 8,
    "totalWorkflows": 5
  }
}
```

#### Test 4B: Team Members Endpoint
```bash
curl -X GET http://localhost:8000/api/admin/team-members \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return array of users with roles
```

#### Test 4C: Activity Logs Endpoint
```bash
curl -X GET http://localhost:8000/api/admin/activity-logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return recent activities
```

#### Test 4D: Current Subscription Endpoint
```bash
curl -X GET http://localhost:8000/api/subscriptions/current \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return:
{
  "subscription": {
    "tier": "FREE",
    "status": "ACTIVE",
    "trialEndsAt": null,
    "currentPeriodEnd": "2025-12-08T00:00:00.000Z"
  },
  "usage": {
    "users": { "current": 3, "limit": 1 },
    "leads": { "current": 45, "limit": 100 },
    "campaigns": { "current": 8, "limit": null },
    "workflows": { "current": 5, "limit": null }
  }
}
```

#### Test 4E: Change Plan Endpoint
```bash
curl -X POST http://localhost:8000/api/subscriptions/change-plan \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tier": "STARTER"}'

# Should return updated subscription
```

### 5. Permission Flags Testing

#### Test 5A: Check Auth Endpoint Returns Permissions
```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return user with all 10 permission flags:
{
  "user": {
    "id": 1,
    "email": "josh@example.com",
    "role": "ADMIN",
    "canManageUsers": true,
    "canManageOrg": true,
    "canManageSubscription": true,
    "canViewReports": true,
    "canManageLeads": true,
    "canManageCampaigns": true,
    "canManageWorkflows": true,
    "canManageIntegrations": true,
    "canExportData": true,
    "canManageSettings": true
  }
}
```

### 6. UI/UX Testing

#### Test 6A: Subscription Page Polish
1. Navigate to `/admin/subscription`
2. Verify:
   - ✅ Smooth animations on plan cards
   - ✅ Hover effects on buttons
   - ✅ Clear visual hierarchy
   - ✅ Responsive layout on mobile
   - ✅ Modal animations smooth
   - ✅ Proper color coding (green for upgrades, orange for warnings)

#### Test 6B: Feature Gate UX
1. Test FeatureGate inline variant
2. Test FeatureGate banner variant
3. Test FeatureGate modal variant
4. Verify all show:
   - ✅ Clear limit message
   - ✅ Current usage display
   - ✅ Upgrade CTA button
   - ✅ Proper icon usage

#### Test 6C: Usage Badges
1. Check badges on Leads, Campaigns, Workflows pages
2. Verify:
   - ✅ Shows "X / Y" or "X / Unlimited"
   - ✅ Red color at ≥ 100% usage
   - ✅ Orange color at ≥ 75% usage
   - ✅ Gray color at < 75% usage
   - ✅ Emoji indicators (🔴 for full, ⚠️ for high)

### 7. Edge Cases

#### Test 7A: Middleware Rejects Unauthorized Requests
```bash
# Try admin endpoint without token
curl -X GET http://localhost:8000/api/admin/stats

# Should return 401 Unauthorized
```

#### Test 7B: Role Checking Works
```bash
# Login as USER and try admin endpoint
curl -X GET http://localhost:8000/api/admin/stats \
  -H "Authorization: Bearer USER_JWT_TOKEN"

# Should return 403 Forbidden
```

#### Test 7C: Feature Access Middleware Blocks Over-Limit
```bash
# On FREE plan with 100 leads, try to create 101st lead
curl -X POST http://localhost:8000/api/leads \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Lead", "email": "test@test.com"}'

# Should return 403 with message about limit reached
```

## Test Checklist

### Backend (5/5) ✅
- [x] Admin controller with stats, team members, activity logs
- [x] Admin routes with requireAdmin middleware
- [x] Auth endpoint returns all permissions
- [x] Subscription controller with CRUD operations
- [x] Feature access middleware enforces limits

### Frontend Components (7/7) ✅
- [x] RoleBasedLayout wrapper
- [x] OrganizationHeader
- [x] TeamManagement
- [x] AdminStats
- [x] ActivityLog
- [x] SubscriptionStatus
- [x] FeatureGate & UpgradePrompt

### Frontend Pages (3/3) ✅
- [x] AdminPanel refactored with real data
- [x] Subscription page with plan cards, modals, trial countdown
- [x] BillingPage updated with usage meters

### Navigation & Access (2/2) ✅
- [x] Sidebar shows admin section based on role
- [x] Routes protected with proper redirects

### Feature Gates (3/3) ✅
- [x] Leads page has gate and usage badge
- [x] Campaigns page has gate and usage badge
- [x] Workflows page has gate and usage badge

## Known Issues

### Non-Critical (Unused Variables)
- Multiple TS6133 warnings for unused variables (does not affect functionality)
- Can be cleaned up in polish phase

### Critical Issues
- None identified during testing

## Next Steps

1. ✅ All core functionality tested and working
2. ✅ Feature gates properly enforce limits
3. ✅ Role-based access control functioning
4. ✅ Subscription management complete
5. 📝 Documentation phase next
