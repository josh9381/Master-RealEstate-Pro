# Lead & Campaign Creation Fixes - October 31, 2025

## Issues Fixed

### 1. Lead Creation Not Working (400 Errors)

**Root Cause:**
The frontend was sending data in the wrong format that didn't match backend validation requirements.

**Backend Requirements (from `backend/src/validators/lead.validator.ts`):**
- `status` must be UPPERCASE: `'NEW'`, `'CONTACTED'`, `'QUALIFIED'`, `'PROPOSAL'`, etc.
- `assignedToId` (not `assignedTo`) - must be a valid CUID string
- `position` for job title
- `value` for deal value (number)
- `customFields` for additional data like address

**Fixes Applied:**

#### Updated `/src/lib/api.ts` - `CreateLeadData` interface:
```typescript
export interface CreateLeadData {
  name: string
  email: string
  phone?: string
  company?: string
  position?: string         // Added
  status?: string
  source?: string
  value?: number           // Added
  stage?: string           // Added
  assignedToId?: string    // Changed from assignedTo
  customFields?: Record<string, any>  // Added
  tags?: string[]
}
```

#### Updated `/src/pages/leads/LeadCreate.tsx`:
- Import `CreateLeadData` type
- Convert status to UPPERCASE before sending
- Map `assignedTo` to `assignedToId`
- Parse `dealValue` as number
- Store address fields in `customFields`
- Added validation for required fields

### 2. Campaign Creation Not Working (400 Errors)

**Root Cause:**
The frontend was sending lowercase campaign types and using wrong field names.

**Backend Requirements (from `backend/src/validators/campaign.validator.ts`):**
- `type` must be UPPERCASE: `'EMAIL'`, `'SMS'`, `'PHONE'`, `'SOCIAL'`
- `status` must be UPPERCASE: `'DRAFT'`, `'SCHEDULED'`, etc.
- Field name is `body` (not `content`)
- `startDate`/`endDate` for scheduling (not `scheduledAt`)
- `audience` as a number (count of recipients)
- `budget` as a number
- `isABTest` boolean flag

**Fixes Applied:**

#### Updated `/src/lib/api.ts` - `CreateCampaignData` interface:
```typescript
export interface CreateCampaignData {
  name: string
  type: 'EMAIL' | 'SMS' | 'PHONE' | 'SOCIAL'  // Changed to UPPERCASE
  status?: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  subject?: string
  body?: string              // Changed from 'content'
  previewText?: string       // Added
  startDate?: string         // Changed from 'scheduledAt'
  endDate?: string           // Added
  budget?: number            // Added
  audience?: number          // Changed from targetAudience array
  isABTest?: boolean         // Added
  abTestData?: Record<string, unknown>  // Added
  tagIds?: string[]          // Added
}
```

#### Updated `/src/pages/campaigns/CampaignCreate.tsx`:
- Import `CreateCampaignData` type
- Convert `type` to UPPERCASE
- Convert `status` to UPPERCASE  
- Rename `content` to `body`
- Calculate `audience` as number (count) instead of array
- Parse `budget` as number
- Use `startDate` instead of `scheduledAt`

## Testing

To test these fixes:

1. **Create a Lead:**
   - Navigate to `/leads/create`
   - Fill in First Name, Last Name, Email (required)
   - Select Status and Source
   - Click "Create Lead"
   - Should create successfully without 400 error

2. **Create a Campaign:**
   - Navigate to `/campaigns/create`
   - Select campaign type (Email, SMS, Phone, Social)
   - Enter campaign name
   - Add content
   - Click "Create Campaign"
   - Should create successfully without 400 error

## Authentication Note

You must be logged in to create leads or campaigns. Use these test credentials:

- **Test User:** `test@realestate.com` / `test123`
- **Admin User:** `admin@realestate.com` / `admin123`

## Files Modified

1. `/src/lib/api.ts` - Updated interface definitions
2. `/src/pages/leads/LeadCreate.tsx` - Fixed data transformation
3. `/src/pages/campaigns/CampaignCreate.tsx` - Fixed data transformation and types

## Summary

Both lead and campaign creation were failing because:
- Frontend used lowercase enums, backend expected UPPERCASE
- Frontend used different field names than backend expected
- Frontend sent wrong data types (strings vs numbers, arrays vs counts)

All issues have been fixed by aligning the frontend data structures and transformations with the backend validation schemas.
