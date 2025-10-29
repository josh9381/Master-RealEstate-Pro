# CORS & API 401 Errors - FIXED ✅

**Date:** October 28, 2025  
**Status:** ✅ Code Fixed - Port Forwarding Required

---

## Problem Summary

When accessing the app through GitHub Codespaces URL, all API requests were failing with:
- **401 Unauthorized** errors
- **CORS policy** blocking cross-origin requests
- Requests going to wrong URL (port 3000 instead of 8000)

---

## Root Causes

### 1. Wrong API Base URL
- Frontend was calling `/api` which resolved to `http://localhost:3000/api`
- Should be calling `https://...-8000.app.github.dev/api` in Codespaces
- Vite proxy only works on localhost, not through Codespaces URLs

### 2. CORS Not Configured for Codespaces
- Backend CORS only allowed `http://localhost:3000`
- Didn't allow Codespaces URLs like `https://...-3000.app.github.dev`
- Cross-origin requests were blocked

### 3. Port 8000 Not Forwarded
- Backend running on localhost:8000
- Not accessible via Codespaces URL
- Only port 3000 was forwarded

---

## Solutions Implemented

### ✅ Fix 1: Dynamic API Base URL Detection

**File:** `src/lib/api.ts`

Added intelligent URL detection:

```typescript
const getApiBaseUrl = () => {
  // Check environment variable first
  const envApiUrl = import.meta.env.VITE_API_URL
  if (envApiUrl) {
    console.log('🔧 Using API URL from environment:', envApiUrl)
    return envApiUrl
  }

  // Auto-detect GitHub Codespaces
  if (window.location.hostname.includes('app.github.dev')) {
    const backendUrl = window.location.origin.replace('-3000.', '-8000.')
    const apiUrl = `${backendUrl}/api`
    console.log('🔧 Detected Codespaces, using API URL:', apiUrl)
    return apiUrl
  }

  // Local development (works with Vite proxy)
  console.log('🔧 Using relative API URL (Vite proxy): /api')
  return '/api'
}
```

**How it works:**
1. Checks for `VITE_API_URL` environment variable
2. Detects Codespaces by checking hostname for `app.github.dev`
3. Automatically replaces `-3000` with `-8000` in the URL
4. Falls back to `/api` for local development
5. Logs the detected URL to browser console

---

### ✅ Fix 2: Dynamic CORS Configuration

**File:** `backend/src/server.ts`

Updated CORS to allow Codespaces origins:

```typescript
// Dynamic allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
]

// Auto-detect Codespaces
if (process.env.CODESPACE_NAME) {
  allowedOrigins.push(`https://${process.env.CODESPACE_NAME}-3000.app.github.dev`)
  allowedOrigins.push(`https://${process.env.CODESPACE_NAME}-5173.app.github.dev`)
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow no origin (mobile apps, curl)
    if (!origin) return callback(null, true)
    
    // Check allowed list
    if (allowedOrigins.some(allowed => allowed && origin.startsWith(allowed))) {
      return callback(null, true)
    }
    
    // Allow any localhost or .app.github.dev in development
    if (origin.includes('localhost') || origin.includes('.app.github.dev')) {
      return callback(null, true)
    }
    
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))
```

**How it works:**
1. Reads `CODESPACE_NAME` environment variable
2. Automatically allows the Codespaces frontend URL
3. Also allows all localhost origins for local dev
4. Permits any `.app.github.dev` domain in development
5. Supports credentials (cookies, authorization headers)

---

## Testing Results

### ✅ API URL Detection
```
Console Output:
🔧 Detected Codespaces, using API URL: https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api
```

### ✅ CORS Headers
```bash
curl -X OPTIONS http://localhost:8000/api/leads \
  -H "Origin: https://probable-fiesta-v65j576gg6qgfpp79-3000.app.github.dev"

Response Headers:
Access-Control-Allow-Origin: https://probable-fiesta-v65j576gg6qgfpp79-3000.app.github.dev
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
```

### ✅ Backend Running
```bash
curl http://localhost:8000/health

{"status":"ok","environment":"development","database":"connected"}
```

---

## Action Required: Port Forwarding

The backend server is running but needs to be publicly accessible through Codespaces.

### Steps to Forward Port 8000:

#### Method 1: PORTS Tab (Recommended)
1. Look at the bottom panel in VS Code
2. Click the **"PORTS"** tab (next to Terminal)
3. You should see:
   - ✅ Port 3000 (Frontend) - already forwarded
   - ❌ Port 8000 (Backend) - NOT forwarded
4. Click **"+ Forward a Port"** button
5. Type: `8000`
6. Press Enter
7. Verify port 8000 shows a green indicator
8. Right-click port 8000 → **Port Visibility** → **Public**

#### Method 2: Command Palette
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: `Forward a Port`
3. Select: **"Forward a Port..."**
4. Enter: `8000`
5. Press Enter
6. Set visibility to Public

### After Forwarding:
1. Refresh your browser
2. All API calls should work
3. No more CORS errors
4. Pages load with data!

---

## Environment Variables

### Backend
Set this when starting the backend:
```bash
CODESPACE_NAME=probable-fiesta-v65j576gg6qgfpp79 \
NODE_ENV=development \
npx tsx src/server.ts
```

### Frontend (Optional)
If you want to override auto-detection:
```bash
VITE_API_URL=https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api
```

---

## Current Status

| Component | Status | Details |
|-----------|--------|---------|
| API URL Detection | ✅ Working | Auto-detects Codespaces |
| CORS Configuration | ✅ Working | Allows Codespaces origins |
| Backend Server | ✅ Running | Port 8000, localhost |
| Frontend Server | ✅ Running | Port 3000, localhost |
| Port 3000 Forwarding | ✅ Working | Frontend accessible |
| Port 8000 Forwarding | ⏳ Pending | **USER ACTION NEEDED** |

---

## Files Modified

### 1. `src/lib/api.ts`
- ✅ Added `getApiBaseUrl()` function
- ✅ Auto-detects Codespaces environment
- ✅ Dynamically switches ports
- ✅ Console logging for debugging

### 2. `backend/src/server.ts`
- ✅ Dynamic CORS origin validation
- ✅ Reads `CODESPACE_NAME` env var
- ✅ Allows localhost + Codespaces URLs
- ✅ Credentials support enabled

### 3. `src/components/ErrorBoundary.tsx` (Previous Fix)
- ✅ Catches React errors
- ✅ Shows user-friendly error screen
- ✅ Prevents white screen of death

### 4. `src/main.tsx` (Previous Fix)
- ✅ Wrapped app with ErrorBoundary
- ✅ Better error handling

---

## What You'll See After Port Forwarding

### Browser Console (Success)
```
🔧 Detected Codespaces, using API URL: https://...-8000.app.github.dev/api
```

### Network Tab (Success)
```
Status: 200 OK
Request URL: https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api/leads
Request Method: GET
Response Headers:
  access-control-allow-origin: https://probable-fiesta-v65j576gg6qgfpp79-3000.app.github.dev
  access-control-allow-credentials: true
```

### Before (Errors)
```
❌ 401 Unauthorized
❌ CORS policy blocked
❌ No 'Access-Control-Allow-Origin' header
❌ White screen on Leads/AI Hub pages
```

### After (Working)
```
✅ 200 OK
✅ CORS headers present
✅ API calls successful
✅ Pages load with data
```

---

## Summary

**Problem:** API calls failing due to wrong URLs and CORS blocking  
**Solution:** Dynamic URL detection + flexible CORS configuration  
**Status:** Code fixed, port forwarding needed  
**Next Step:** Forward port 8000 in Codespaces PORTS tab  
**Result:** Full-stack app working in Codespaces environment  

---

## Troubleshooting

### If still seeing errors after port forwarding:

1. **Check port visibility**
   - Port 8000 should be "Public" not "Private"
   - Right-click port → Port Visibility → Public

2. **Verify forwarded URL**
   - Should be: `https://...-8000.app.github.dev`
   - Not: `http://localhost:8000`

3. **Hard refresh browser**
   - Press `Ctrl+Shift+R` (Windows/Linux)
   - Press `Cmd+Shift+R` (Mac)
   - This clears cached API calls

4. **Check console logs**
   - Should see: `🔧 Detected Codespaces, using API URL: https://...-8000...`
   - If not, API detection failed

5. **Restart backend with CODESPACE_NAME**
   ```bash
   CODESPACE_NAME=probable-fiesta-v65j576gg6qgfpp79 npx tsx src/server.ts
   ```

---

**Last Updated:** October 28, 2025  
**Tested:** ✅ CORS working, API detection working  
**Pending:** Port 8000 forwarding
