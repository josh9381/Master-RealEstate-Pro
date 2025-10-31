# Frontend Integration Testing Plan

## 🧪 Testing the New Communication & Workflow Endpoints

### Servers Running
- ✅ Backend: http://localhost:8000
- ✅ Frontend: http://localhost:3000

---

## 📋 Test Plan

### 1. Authentication (Pre-requisite)
- [ ] Navigate to http://localhost:3000
- [ ] Login with: `test@realestate.com` / `test123` (or register if needed)
- [ ] Verify you're redirected to dashboard

### 2. Email Templates (6 tests)
Navigate to: **Communication → Email Templates**

- [ ] **List View**: Page loads without errors
- [ ] **Empty State**: Shows "No templates" message
- [ ] **Create Template**: Click "New Template" button
  - Name: "Welcome Email"
  - Subject: "Welcome {{name}}!"
  - Body: "Hello {{name}}, welcome to our platform!"
  - Category: "onboarding"
  - [ ] Submit and verify it appears in list
- [ ] **Edit Template**: Click edit on created template
  - [ ] Update subject to "Welcome {{name}} to RealEstate Pro!"
  - [ ] Verify changes saved
- [ ] **Usage Stats**: Check if template stats are displayed
- [ ] **Delete Template**: Delete the test template
  - [ ] Verify it's removed from list

### 3. SMS Templates (6 tests)
Navigate to: **Communication → SMS Center** or use SMS templates section

- [ ] **List View**: SMS templates page loads
- [ ] **Create SMS Template**: 
  - Name: "Appointment Reminder"
  - Body: "Hi {{name}}, your appointment is tomorrow"
  - Category: "reminder"
  - [ ] Verify 160 character limit is enforced
  - [ ] Submit and verify it appears
- [ ] **Edit SMS Template**: Update the template
- [ ] **Usage Stats**: Check SMS template statistics
- [ ] **Test Character Count**: Try to enter >160 chars (should show error)
- [ ] **Delete Template**: Remove test template

### 4. Messages/Inbox (8 tests)
Navigate to: **Communication → Inbox**

- [ ] **Inbox View**: Messages inbox loads
- [ ] **Send Email**:
  - To: customer@example.com
  - Subject: "Test Email"
  - Body: "This is a test"
  - [ ] Verify success message
  - [ ] Check if message appears in inbox
- [ ] **Send SMS**:
  - To: +1234567890
  - Body: "Test SMS"
  - [ ] Verify success message
  - [ ] Check if message appears in inbox
- [ ] **Filter by Type**: Filter messages by EMAIL/SMS
- [ ] **Filter by Direction**: Filter INBOUND/OUTBOUND
- [ ] **Mark as Read**: Click on a message
  - [ ] Verify read status changes
- [ ] **Message Stats**: Check statistics display
- [ ] **Delete Message**: Delete a test message

### 5. Workflows (9 tests)
Navigate to: **Workflows → Workflows List**

- [ ] **List View**: Workflows page loads
- [ ] **Empty State**: Shows "No workflows" if empty
- [ ] **Create Workflow**:
  - Name: "Welcome New Leads"
  - Description: "Auto-send email to new leads"
  - Trigger: "Lead Created"
  - Actions: Add send email action
  - [ ] Verify workflow created (starts inactive)
- [ ] **View Workflow Details**: Click on created workflow
  - [ ] Verify all details display correctly
- [ ] **Edit Workflow**: Update workflow name/description
- [ ] **Toggle Active**: 
  - [ ] Activate the workflow
  - [ ] Verify status changes to "Active"
  - [ ] Deactivate it again
- [ ] **Test Workflow**: Click "Test" button
  - [ ] Verify test execution completes
  - [ ] Check execution appears in history
- [ ] **View Executions**: Check execution history tab
- [ ] **Workflow Stats**: Verify statistics display
- [ ] **Delete Workflow**: 
  - [ ] Try to delete active workflow (should fail)
  - [ ] Deactivate first, then delete
  - [ ] Verify removal

### 6. Settings Integration (Optional - if time permits)

#### Email Configuration
Navigate to: **Settings → Email Configuration**
- [ ] Page loads without errors
- [ ] Form displays correctly

#### Twilio Setup  
Navigate to: **Settings → Twilio Setup**
- [ ] Page loads without errors
- [ ] SMS configuration form displays

#### Team Management
Navigate to: **Settings → Team Management**
- [ ] Page loads without errors
- [ ] Team members list displays

---

## ✅ Success Criteria

### Must Pass (Critical)
- ✅ All pages load without console errors
- ✅ API calls return data or proper error messages
- ✅ CRUD operations work for templates, messages, workflows
- ✅ Authentication is required (redirects to login if not authenticated)
- ✅ Loading states show appropriately
- ✅ Success/error toasts display

### Should Pass (Important)
- ✅ Filters work correctly
- ✅ Search functionality works
- ✅ Pagination works (if applicable)
- ✅ Validation errors show properly
- ✅ Delete confirmations appear

### Nice to Have
- ✅ Smooth animations
- ✅ Refresh buttons work
- ✅ Stats/analytics display correctly
- ✅ Empty states look good

---

## 🐛 Common Issues to Check

### Backend Connection Issues
```
Error: Network Error
Fix: Verify backend is running on port 8000
```

### CORS Issues
```
Error: CORS policy blocked
Fix: Check backend CORS settings in server.ts
```

### Authentication Issues
```
Error: 401 Unauthorized
Fix: Login again, check token in localStorage
```

### Validation Errors
```
Error: 400 Bad Request
Fix: Check console for validation details
```

---

## 📊 Test Results Template

### Communication - Email Templates
- List View: ⬜ Pass / ⬜ Fail
- Create: ⬜ Pass / ⬜ Fail
- Edit: ⬜ Pass / ⬜ Fail
- Delete: ⬜ Pass / ⬜ Fail
- Stats: ⬜ Pass / ⬜ Fail

### Communication - SMS Templates
- List View: ⬜ Pass / ⬜ Fail
- Create: ⬜ Pass / ⬜ Fail
- Edit: ⬜ Pass / ⬜ Fail
- Delete: ⬜ Pass / ⬜ Fail
- Validation: ⬜ Pass / ⬜ Fail

### Communication - Messages
- Inbox: ⬜ Pass / ⬜ Fail
- Send Email: ⬜ Pass / ⬜ Fail
- Send SMS: ⬜ Pass / ⬜ Fail
- Filters: ⬜ Pass / ⬜ Fail
- Read Status: ⬜ Pass / ⬜ Fail

### Workflows
- List View: ⬜ Pass / ⬜ Fail
- Create: ⬜ Pass / ⬜ Fail
- Edit: ⬜ Pass / ⬜ Fail
- Toggle: ⬜ Pass / ⬜ Fail
- Test: ⬜ Pass / ⬜ Fail
- Executions: ⬜ Pass / ⬜ Fail
- Delete: ⬜ Pass / ⬜ Fail

---

## 🚀 Quick Test Commands

### Check Backend Health
```bash
curl http://localhost:8000/health
```

### Check API Endpoints
```bash
curl http://localhost:8000/api
```

### Login and Get Token
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@realestate.com","password":"test123"}'
```

### Test Email Templates Endpoint
```bash
TOKEN="your_token_here"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/templates/email
```

---

## 📝 Notes

- Frontend is configured to proxy `/api/*` to `http://localhost:8000`
- All API calls automatically include auth token from localStorage
- Check browser console (F12) for detailed error messages
- Check Network tab to see actual API requests/responses

---

**Ready to test!** Open http://localhost:3000 in your browser and follow the test plan.
