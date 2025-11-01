# Debug Issues - October 31, 2025

## Common Issues & Solutions

### Issue 1: "Objects are not valid as a React child"
**Status:** ✅ FIXED
- Fixed tag rendering to handle both string and object formats
- Fixed assignedTo rendering to handle string, object, and null values
- Files updated: `src/pages/leads/LeadsList.tsx`

### Issue 2: Lead Creation 400 Errors  
**Status:** ✅ FIXED
- Fixed status values (now UPPERCASE)
- Fixed assignedTo → assignedToId mapping
- Fixed data structure to match backend
- Files updated: `src/lib/api.ts`, `src/pages/leads/LeadCreate.tsx`

### Issue 3: Campaign Creation 400 Errors
**Status:** ✅ FIXED  
- Fixed type values (now UPPERCASE: EMAIL, SMS, PHONE, SOCIAL)
- Fixed field name: content → body
- Fixed field name: scheduledAt → startDate
- Fixed audience: array → number
- Files updated: `src/lib/api.ts`, `src/pages/campaigns/CampaignCreate.tsx`

## To Check for Remaining Issues:

### 1. Check Browser Console
Open Developer Tools (F12) → Console tab
Look for:
- Red errors (especially React errors)
- Yellow warnings
- Network errors (401, 400, 500)

### 2. Check Network Tab
Open Developer Tools → Network tab
Filter by:
- Failed requests (red)
- 400/401/500 status codes
Look at the response body for error details

### 3. Check Backend Logs
```bash
tail -f /tmp/backend.log | grep -E "(error|Error|400|401|500)"
```

### 4. Test Each Feature:

#### Leads:
- [ ] View leads list at `/leads`
- [ ] Create new lead at `/leads/create`
- [ ] Click on a lead to view details
- [ ] Edit a lead
- [ ] Delete a lead

#### Campaigns:
- [ ] View campaigns list at `/campaigns`
- [ ] Create new campaign at `/campaigns/create`
- [ ] Click on a campaign to view details

#### AI Hub:
- [ ] Navigate to `/ai` 
- [ ] Check if data loads
- [ ] Check for console errors

## Quick Fixes:

### If you see "Cannot read property 'X' of undefined":
This usually means data is null/undefined. Check if:
1. You're logged in
2. Backend is running
3. Database has seed data

### If you see 401 errors:
You need to log in:
- Email: `test@realestate.com`
- Password: `test123`

### If you see 400 errors:
Check the response body in Network tab for validation details.
The error will tell you which field is invalid.

### If AI Hub shows no data:
1. Check if `MOCK_DATA_CONFIG.USE_MOCK_DATA` is `false` in `src/config/mockData.config.ts`
2. If true, it should show mock data
3. If false, check backend AI endpoints are working

## Need Help?

Please provide:
1. **Exact error message** from console
2. **What you were trying to do** when error occurred
3. **Screenshot** if possible
4. **Network request details** (status code, response body)
